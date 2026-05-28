"""Endpoints CRUD des produits, scopés selon le rôle de l'utilisateur courant.

- Un utilisateur de rôle `entreprise` ne voit / modifie que ses propres produits.
- Un utilisateur de rôle `admin` voit et modifie tous les produits.

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
from ..services.product_serializer import product_to_read

router = APIRouter(prefix="/products", tags=["products"])


def _scoped_query(db: Session, user: models.User):
    """Renvoie un Query SQLAlchemy filtré selon le rôle.

    - admin : tous les produits
    - entreprise : uniquement les produits dont owner_id == user.id
    """
    q = db.query(models.Product)
    if user.role != "admin":
        q = q.filter(models.Product.owner_id == user.id)
    return q


def _ensure_access(product: models.Product, user: models.User) -> None:
    """Lève 403 si l'utilisateur (non admin) tente d'accéder à un produit
    qui ne lui appartient pas."""
    if user.role == "admin":
        return
    if product.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Accès refusé à ce produit")


@router.post("", response_model=schemas.ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Crée un produit avec ses étapes. Le créateur devient automatiquement
    propriétaire."""
    product = models.Product(
        name=payload.name,
        description=payload.description,
        owner_id=user.id,
    )
    for step in payload.steps:
        product.steps.append(models.Step(**step.model_dump()))
    db.add(product)
    db.flush()  # affecte un ID aux étapes pour pouvoir calculer les hashes
    assign_hashes(product.steps)
    db.commit()
    db.refresh(product)
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
    _ensure_access(product, user)
    return product_to_read(product)


@router.put("/{product_id}", response_model=schemas.ProductRead)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Met à jour un produit. Si `steps` est fourni, les étapes existantes
    sont entièrement remplacées (delete-orphan via la relation)."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    _ensure_access(product, user)

    product.name = payload.name
    product.description = payload.description

    if payload.steps is not None:
        product.steps.clear()
        db.flush()
        for step in payload.steps:
            product.steps.append(models.Step(**step.model_dump()))
        db.flush()
        assign_hashes(product.steps)

    db.commit()
    db.refresh(product)
    return product_to_read(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Supprime un produit (cascade sur ses étapes)."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    _ensure_access(product, user)
    db.delete(product)
    db.commit()
    return None
