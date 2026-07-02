"""Endpoints pour la gestion des contributeurs multi-entreprise.

Un contributeur est une entreprise tierce (user avec rôle "entreprise")
à qui l'owner d'un produit donne accès pour saisir ses propres étapes.

Workflow :
1. L'owner du pot de confiture invite le fournisseur de sucre via son email.
2. Le fournisseur se connecte, voit le produit dans son dashboard, et ajoute
   ses étapes (ex : récolte canne à sucre, transformation, transport).
3. Chaque étape ajoutée par le contributeur porte son contributor_id.
4. L'owner peut retirer l'accès à tout moment.

Seul l'owner (ou un admin) peut ajouter/supprimer des contributeurs.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user
from ..services.authorization import is_owner_or_admin

router = APIRouter(prefix="/products/{product_id}/contributors", tags=["contributors"])


def _get_product_or_404(product_id: int, db: Session) -> models.Product:
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return product


def _ensure_owner_or_admin(product: models.Product, user: models.User) -> None:
    """Seul l'owner ou un admin peut gérer les contributeurs."""
    if not is_owner_or_admin(product, user):
        raise HTTPException(status_code=403, detail="Seul l'owner du produit peut gérer les contributeurs")


def _contributor_to_read(contrib: models.ProductContributor) -> schemas.ContributorRead:
    return schemas.ContributorRead(
        user_id=contrib.user_id,
        company_name=contrib.user.company_name if contrib.user else "—",
        email=contrib.user.email if contrib.user else "—",
        scope=contrib.scope,
        granted_at=contrib.granted_at,
        granted_by_name=contrib.granter.company_name if contrib.granter else None,
    )


@router.get("", response_model=List[schemas.ContributorRead])
def list_contributors(
    product_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Liste les contributeurs d'un produit."""
    product = _get_product_or_404(product_id, db)
    _ensure_owner_or_admin(product, user)
    return [_contributor_to_read(c) for c in product.contributors]


@router.post("", response_model=schemas.ContributorRead, status_code=status.HTTP_201_CREATED)
def add_contributor(
    product_id: int,
    payload: schemas.ContributorAdd,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Invite un utilisateur comme contributeur sur un produit.

    L'utilisateur est identifié par son email. Il doit exister et avoir
    le rôle "entreprise" (pas de consommateur, pas d'admin).
    """
    product = _get_product_or_404(product_id, db)
    _ensure_owner_or_admin(product, user)

    # Trouver l'utilisateur à inviter
    invitee = db.query(models.User).filter(models.User.email == payload.user_email).first()
    if not invitee:
        raise HTTPException(status_code=404, detail=f"Utilisateur '{payload.user_email}' introuvable")
    if invitee.role not in ("entreprise", "admin"):
        raise HTTPException(status_code=400, detail="Seules les entreprises peuvent être contributeurs")
    if invitee.id == product.owner_id:
        raise HTTPException(status_code=400, detail="L'owner ne peut pas être son propre contributeur")

    # Vérifier si déjà contributeur
    existing = next(
        (c for c in product.contributors if c.user_id == invitee.id),
        None,
    )
    if existing:
        raise HTTPException(status_code=409, detail="Cet utilisateur est déjà contributeur")

    contrib = models.ProductContributor(
        product_id=product_id,
        user_id=invitee.id,
        granted_by=user.id,
        scope=payload.scope,
    )
    db.add(contrib)
    db.commit()
    db.refresh(contrib)
    return _contributor_to_read(contrib)


@router.delete("/{contributor_user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_contributor(
    product_id: int,
    contributor_user_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Retire l'accès d'un contributeur sur un produit."""
    product = _get_product_or_404(product_id, db)
    _ensure_owner_or_admin(product, user)

    contrib = (
        db.query(models.ProductContributor)
        .filter(
            models.ProductContributor.product_id == product_id,
            models.ProductContributor.user_id == contributor_user_id,
        )
        .first()
    )
    if not contrib:
        raise HTTPException(status_code=404, detail="Contributeur introuvable")

    db.delete(contrib)
    db.commit()
    return None
