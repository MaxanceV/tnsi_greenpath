"""Endpoints CRUD pour les lots (Batches) GS1.

Un lot (Batch) représente un ensemble d'unités d'un produit fabriquées
dans un intervalle de temps défini. Il est identifié par un numéro de lot
(lot_number, AI 10 GS1) et un SSCC optionnel (AI 00 GS1).

Un lot peut avoir des parents (lots de matières premières utilisées)
et des enfants (lots de produits finis qui utilisent ce lot).

Accès :
- L'owner du produit peut créer et gérer tous les lots.
- Un contributeur avec scope "write" peut créer des lots pour les produits
  auxquels il a accès.
- Un admin voit et gère tous les lots.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user
from ..services.gs1 import generate_sscc

router = APIRouter(prefix="/batches", tags=["batches"])


def _can_write_batch(product: models.Product, user: models.User) -> bool:
    """Vérifie que l'utilisateur peut créer/modifier des lots sur ce produit."""
    if user.role == "admin":
        return True
    if product.owner_id == user.id:
        return True
    # Contributeur avec scope write
    contrib = next(
        (c for c in product.contributors if c.user_id == user.id and c.scope == "write"),
        None,
    )
    return contrib is not None


def _batch_to_read(batch: models.Batch) -> schemas.BatchRead:
    """Convertit un Batch ORM en BatchRead Pydantic."""
    parents = [
        schemas.BatchParentInfo(
            id=p.id,
            lot_number=p.lot_number,
            sscc=p.sscc,
            product_id=p.product_id,
            product_name=p.product.name if p.product else None,
        )
        for p in batch.parents
    ]
    children = [
        schemas.BatchParentInfo(
            id=c.id,
            lot_number=c.lot_number,
            sscc=c.sscc,
            product_id=c.product_id,
            product_name=c.product.name if c.product else None,
        )
        for c in batch.children
    ]
    return schemas.BatchRead(
        id=batch.id,
        lot_number=batch.lot_number,
        sscc=batch.sscc,
        product_id=batch.product_id,
        product_name=batch.product.name if batch.product else None,
        start_date=batch.start_date,
        end_date=batch.end_date,
        quantity=batch.quantity,
        unit=batch.unit,
        notes=batch.notes,
        created_at=batch.created_at,
        parents=parents,
        children=children,
    )


@router.post("", response_model=schemas.BatchRead, status_code=status.HTTP_201_CREATED)
def create_batch(
    payload: schemas.BatchCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Crée un lot pour un produit.

    Si le SSCC n'est pas fourni, il est généré automatiquement via GS1.
    Les lots parents éventuels sont liés via la table batch_parents.
    """
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    if not _can_write_batch(product, user):
        raise HTTPException(status_code=403, detail="Accès refusé à ce produit")

    # Vérifier unicité du lot_number par produit
    existing = (
        db.query(models.Batch)
        .filter(models.Batch.product_id == payload.product_id, models.Batch.lot_number == payload.lot_number)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Un lot avec ce numéro existe déjà pour ce produit")

    batch = models.Batch(
        lot_number=payload.lot_number,
        sscc=payload.sscc,
        product_id=payload.product_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        quantity=payload.quantity,
        unit=payload.unit,
        notes=payload.notes,
    )
    db.add(batch)
    db.flush()  # on a besoin de l'ID pour générer le SSCC et lier les parents

    # Auto-génération du SSCC si absent
    if not batch.sscc:
        batch.sscc = generate_sscc(batch.id)

    # Lier les lots parents
    if payload.parent_batch_ids:
        parents = db.query(models.Batch).filter(models.Batch.id.in_(payload.parent_batch_ids)).all()
        if len(parents) != len(payload.parent_batch_ids):
            raise HTTPException(status_code=404, detail="Un ou plusieurs lots parents introuvables")
        batch.parents.extend(parents)

    db.commit()
    db.refresh(batch)
    return _batch_to_read(batch)


@router.get("", response_model=List[schemas.BatchRead])
def list_batches(
    product_id: int | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Liste les lots, filtrés par produit si `product_id` est fourni.

    Un admin voit tous les lots. Une entreprise ne voit que les lots
    des produits qu'elle possède ou auxquels elle contribue.
    """
    q = db.query(models.Batch)
    if product_id is not None:
        q = q.filter(models.Batch.product_id == product_id)
    if user.role != "admin":
        # Filtrer sur les produits accessibles (owner ou contributeur)
        accessible_product_ids = (
            db.query(models.Product.id)
            .filter(models.Product.owner_id == user.id)
            .union(
                db.query(models.ProductContributor.product_id)
                .filter(models.ProductContributor.user_id == user.id)
            )
            .all()
        )
        ids = [r[0] for r in accessible_product_ids]
        q = q.filter(models.Batch.product_id.in_(ids))

    batches = q.order_by(models.Batch.created_at.desc()).all()
    return [_batch_to_read(b) for b in batches]


@router.get("/{batch_id}", response_model=schemas.BatchRead)
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    product = batch.product
    if not _can_write_batch(product, user) and user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    return _batch_to_read(batch)


@router.put("/{batch_id}", response_model=schemas.BatchRead)
def update_batch(
    batch_id: int,
    payload: schemas.BatchUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    if not _can_write_batch(batch.product, user):
        raise HTTPException(status_code=403, detail="Accès refusé")

    batch.lot_number = payload.lot_number
    batch.sscc = payload.sscc
    batch.start_date = payload.start_date
    batch.end_date = payload.end_date
    batch.quantity = payload.quantity
    batch.unit = payload.unit
    batch.notes = payload.notes

    if payload.parent_batch_ids is not None:
        parents = db.query(models.Batch).filter(models.Batch.id.in_(payload.parent_batch_ids)).all()
        if len(parents) != len(payload.parent_batch_ids):
            raise HTTPException(status_code=404, detail="Un ou plusieurs lots parents introuvables")
        batch.parents.clear()
        batch.parents.extend(parents)

    db.commit()
    db.refresh(batch)
    return _batch_to_read(batch)


@router.delete("/{batch_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    batch = db.query(models.Batch).filter(models.Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    if not _can_write_batch(batch.product, user):
        raise HTTPException(status_code=403, detail="Accès refusé")
    db.delete(batch)
    db.commit()
    return None
