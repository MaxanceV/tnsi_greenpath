"""Endpoints du suivi de consommation personnel des consommateurs.

Chaque entrée associe un consommateur à un produit avec une quantité et
une date. L'utilisateur peut consulter et gérer **uniquement ses propres**
entrées (filtrage automatique par `user_id`).

Accessible aux rôles `consommateur` et `admin` (l'admin peut tester le
parcours sans créer de compte consommateur dédié).
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user
from ..services.co2 import total_co2_for_product

router = APIRouter(prefix="/consumption", tags=["consumption"])


def _require_consumer(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role not in {"consommateur", "admin"}:
        raise HTTPException(
            status_code=403,
            detail="Accès réservé aux comptes consommateur",
        )
    return user


def _to_read(entry: models.Consumption) -> schemas.ConsumptionRead:
    product = entry.product
    co2_product = total_co2_for_product(product) if product else 0.0
    return schemas.ConsumptionRead(
        id=entry.id,
        quantity=entry.quantity,
        notes=entry.notes,
        consumed_at=entry.consumed_at,
        product=schemas.ConsumptionProductInfo(
            id=product.id,
            name=product.name,
            description=product.description,
            total_co2_kg=round(co2_product, 3),
            owner_name=product.owner.company_name if product.owner else None,
        ),
        co2_kg=round(co2_product * entry.quantity, 3),
    )


@router.post("", response_model=schemas.ConsumptionRead, status_code=status.HTTP_201_CREATED)
def add_consumption(
    payload: schemas.ConsumptionCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(_require_consumer),
):
    """Ajoute un produit au suivi de consommation de l'utilisateur courant."""
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    entry = models.Consumption(
        user_id=user.id,
        product_id=product.id,
        quantity=payload.quantity,
        notes=payload.notes,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _to_read(entry)


@router.get("", response_model=List[schemas.ConsumptionRead])
def list_consumptions(
    db: Session = Depends(get_db),
    user: models.User = Depends(_require_consumer),
):
    """Renvoie l'historique complet de consommation de l'utilisateur."""
    entries = (
        db.query(models.Consumption)
        .filter(models.Consumption.user_id == user.id)
        .order_by(models.Consumption.consumed_at.desc())
        .all()
    )
    return [_to_read(e) for e in entries]


@router.get("/stats", response_model=schemas.ConsumptionStats)
def consumption_stats(
    db: Session = Depends(get_db),
    user: models.User = Depends(_require_consumer),
):
    """KPIs : total CO2, nombre d'items, nombre de produits distincts."""
    entries = (
        db.query(models.Consumption)
        .filter(models.Consumption.user_id == user.id)
        .all()
    )
    if not entries:
        return schemas.ConsumptionStats(
            item_count=0,
            unique_product_count=0,
            total_co2_kg=0.0,
            avg_co2_per_item=0.0,
        )

    total = sum(total_co2_for_product(e.product) * e.quantity for e in entries)
    unique_products = {e.product_id for e in entries}
    return schemas.ConsumptionStats(
        item_count=len(entries),
        unique_product_count=len(unique_products),
        total_co2_kg=round(total, 3),
        avg_co2_per_item=round(total / len(entries), 3),
    )


@router.delete("/{consumption_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_consumption(
    consumption_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(_require_consumer),
):
    """Supprime une entrée de l'historique (l'utilisateur ne peut supprimer
    que ses propres entrées, même un admin ne peut supprimer celles d'un autre
    via cet endpoint)."""
    entry = (
        db.query(models.Consumption)
        .filter(models.Consumption.id == consumption_id, models.Consumption.user_id == user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entrée introuvable")
    db.delete(entry)
    db.commit()
    return None
