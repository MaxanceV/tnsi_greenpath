from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..services.co2 import co2_for_step, total_co2_for_product

router = APIRouter(prefix="/products", tags=["products"])


def _to_read(product: models.Product) -> schemas.ProductRead:
    steps = [
        schemas.StepRead(
            id=s.id,
            product_id=s.product_id,
            position=s.position,
            name=s.name,
            step_type=s.step_type,
            supplier=s.supplier,
            location=s.location,
            weight_kg=s.weight_kg,
            transport_mode=s.transport_mode,
            distance_km=s.distance_km,
            co2_kg=co2_for_step(s),
        )
        for s in product.steps
    ]
    return schemas.ProductRead(
        id=product.id,
        name=product.name,
        description=product.description,
        created_at=product.created_at,
        steps=steps,
        total_co2_kg=total_co2_for_product(product),
    )


@router.post("", response_model=schemas.ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db)):
    product = models.Product(name=payload.name, description=payload.description)
    for step in payload.steps:
        product.steps.append(models.Step(**step.model_dump()))
    db.add(product)
    db.commit()
    db.refresh(product)
    return _to_read(product)


@router.get("", response_model=List[schemas.ProductRead])
def list_products(db: Session = Depends(get_db)):
    products = db.query(models.Product).order_by(models.Product.created_at.desc()).all()
    return [_to_read(p) for p in products]


@router.get("/stats/summary")
def stats_summary(db: Session = Depends(get_db)):
    products = db.query(models.Product).all()
    totals = [total_co2_for_product(p) for p in products]
    step_count = sum(len(p.steps) for p in products)
    return {
        "product_count": len(products),
        "step_count": step_count,
        "total_co2_kg": round(sum(totals), 3),
        "avg_co2_kg": round(sum(totals) / len(totals), 3) if totals else 0.0,
    }


@router.get("/{product_id}", response_model=schemas.ProductRead)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return _to_read(product)


@router.put("/{product_id}", response_model=schemas.ProductRead)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    product.name = payload.name
    product.description = payload.description

    if payload.steps is not None:
        product.steps.clear()
        db.flush()
        for step in payload.steps:
            product.steps.append(models.Step(**step.model_dump()))

    db.commit()
    db.refresh(product)
    return _to_read(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    db.delete(product)
    db.commit()
    return None
