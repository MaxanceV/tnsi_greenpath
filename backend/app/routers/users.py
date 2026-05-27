"""Endpoints d'administration des utilisateurs.

Toutes les routes sont protégées par `require_admin` : seul un utilisateur
de rôle `admin` peut lister, créer, modifier ou supprimer des comptes.

Garde-fous métier (impossible à contourner via l'API) :
- Un admin ne peut pas se retirer le rôle admin lui-même.
- Un admin ne peut pas se supprimer lui-même.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import require_admin
from ..services.auth import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _to_read(user: models.User) -> schemas.UserRead:
    return schemas.UserRead(
        id=user.id,
        email=user.email,
        company_name=user.company_name,
        role=user.role,
        created_at=user.created_at,
        product_count=len(user.products),
    )


@router.get("", response_model=List[schemas.UserRead])
def list_users(
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    return [_to_read(u) for u in users]


@router.post("", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_admin),
):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email déjà utilisé")

    user = models.User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        company_name=payload.company_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_read(user)


@router.put("/{user_id}", response_model=schemas.UserRead)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if payload.company_name is not None:
        user.company_name = payload.company_name
    if payload.role is not None:
        if user.id == admin.id and payload.role != "admin":
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous retirer le rôle admin")
        user.role = payload.role
    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return _to_read(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous supprimer vous-même")
    db.delete(user)
    db.commit()
    return None
