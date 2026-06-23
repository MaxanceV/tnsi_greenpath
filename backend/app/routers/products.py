"""Endpoints CRUD des produits, scopés selon le rôle de l'utilisateur courant.

Règles d'accès :
- admin          : voit et modifie tous les produits.
- entreprise     : voit et modifie ses propres produits + les produits
                   pour lesquels il est contributeur avec scope "write".
- contributeur   : peut modifier uniquement les étapes qu'il a lui-même créées
                   (ses étapes portent son contributor_id).

Multi-entreprise :
  Quand un contributeur met à jour un produit via PUT, les étapes nouvelles
  héritent de son contributor_id. L'owner conserve la maîtrise de ses propres étapes.

La sérialisation produit → JSON est centralisée dans
`services.product_serializer` pour éviter la duplication avec les routes
publiques (cf. `routers/public.py`).
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user
from ..services.blockchain import assign_hashes
from ..services.co2 import total_co2_for_product
from ..services.gs1 import generate_gtin
from ..services.product_serializer import product_to_read


def _reindex_product_safe(product: models.Product) -> None:
    """Re-indexation RAG fire-and-forget : on n'échoue jamais le CRUD à cause du RAG."""
    import os as _os
    if _os.getenv("DISABLE_RAG") == "1":
        return
    try:
        from ..services.rag import get_rag
        get_rag().reindex_product(product)
    except Exception as e:
        print(f"[RAG] Réindexation échouée (non-bloquant) : {e}")


def _remove_from_index_safe(product_id: int) -> None:
    import os as _os
    if _os.getenv("DISABLE_RAG") == "1":
        return
    try:
        from ..services.rag import get_rag
        get_rag().remove_product(product_id)
    except Exception as e:
        print(f"[RAG] Désindexation échouée (non-bloquant) : {e}")


router = APIRouter(prefix="/products", tags=["products"])


def _scoped_query(db: Session, user: models.User):
    """Renvoie un Query SQLAlchemy filtré selon le rôle.

    - admin      : tous les produits
    - entreprise : produits owner + produits où l'utilisateur est contributeur
    """
    if user.role == "admin":
        return db.query(models.Product)

    contributed_ids = (
        db.query(models.ProductContributor.product_id)
        .filter(models.ProductContributor.user_id == user.id)
        .subquery()
    )
    return db.query(models.Product).filter(
        (models.Product.owner_id == user.id) |
        (models.Product.id.in_(contributed_ids))
    )


def _has_write_access(product: models.Product, user: models.User) -> bool:
    """Retourne True si l'utilisateur peut écrire sur ce produit."""
    if user.role == "admin":
        return True
    if product.owner_id == user.id:
        return True
    contrib = next(
        (c for c in product.contributors if c.user_id == user.id and c.scope == "write"),
        None,
    )
    return contrib is not None


def _ensure_write_access(product: models.Product, user: models.User) -> None:
    if not _has_write_access(product, user):
        raise HTTPException(status_code=403, detail="Accès refusé à ce produit")


def _build_step(step_data: schemas.StepCreate, contributor_id: int | None = None) -> models.Step:
    """Construit un Step ORM depuis le payload Create, avec contributor_id optionnel."""
    d = step_data.model_dump()
    return models.Step(**d, contributor_id=contributor_id)


@router.post("", response_model=schemas.ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Crée un produit avec ses étapes. Le créateur devient automatiquement
    propriétaire. Un GTIN GS1 est généré automatiquement si absent."""
    product = models.Product(
        name=payload.name,
        description=payload.description,
        owner_id=user.id,
        gtin=payload.gtin,
    )
    for step in payload.steps:
        product.steps.append(_build_step(step))
    db.add(product)
    db.flush()

    if not product.gtin:
        product.gtin = generate_gtin(product.id)

    assign_hashes(product.steps)
    db.commit()
    db.refresh(product)
    _reindex_product_safe(product)
    return product_to_read(product)


@router.get("", response_model=List[schemas.ProductRead])
def list_products(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Liste les produits visibles par l'utilisateur (cf. _scoped_query)."""
    products = _scoped_query(db, user).order_by(models.Product.created_at.desc()).all()
    return [product_to_read(p) for p in products]


@router.get("/stats/summary")
def stats_summary(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """KPIs agrégés pour le dashboard (filtrés selon le rôle)."""
    products = _scoped_query(db, user).all()
    totals = [total_co2_for_product(p) for p in products]
    step_count = sum(len(p.steps) for p in products)
    return {
        "product_count": len(products),
        "step_count": step_count,
        "total_co2_kg": round(sum(totals), 3),
        "avg_co2_kg": round(sum(totals) / len(totals), 3) if totals else 0.0,
    }


@router.get("/{product_id}", response_model=schemas.ProductRead)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    _ensure_write_access(product, user)
    return product_to_read(product)


@router.put("/{product_id}", response_model=schemas.ProductRead)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Met à jour un produit.

    Comportement des étapes selon le rôle :
    - Owner ou admin : remplacement complet de toutes les étapes.
    - Contributeur   : seules SES étapes sont remplacées ; les étapes
                       des autres contributeurs et de l'owner sont conservées.
    """
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    _ensure_write_access(product, user)

    product.name = payload.name
    product.description = payload.description
    if payload.gtin is not None:
        product.gtin = payload.gtin

    if payload.steps is not None:
        is_owner_or_admin = (user.role == "admin" or product.owner_id == user.id)

        if is_owner_or_admin:
            product.steps.clear()
            db.flush()
            for step in payload.steps:
                product.steps.append(_build_step(step))
        else:
            # Contributeur : conserver les étapes des autres
            other_steps = [s for s in product.steps if s.contributor_id != user.id]
            new_steps = [_build_step(step, contributor_id=user.id) for step in payload.steps]
            product.steps.clear()
            db.flush()
            for s in other_steps + new_steps:
                product.steps.append(s)

        db.flush()
        assign_hashes(product.steps)

    db.commit()
    db.refresh(product)
    _reindex_product_safe(product)
    return product_to_read(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Supprime un produit. Réservé à l'owner ou à l'admin."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    if user.role != "admin" and product.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Seul l'owner peut supprimer ce produit")
    pid = product.id
    db.delete(product)
    db.commit()
    _remove_from_index_safe(pid)
    return None
