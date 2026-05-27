"""Endpoints d'authentification.

- `POST /auth/login` : échange email/password contre un JWT.
- `GET /auth/me` : renvoie l'utilisateur courant (utile pour le front
   après reload, pour rafraîchir l'état d'auth).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user
from ..services.auth import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_read(user: models.User) -> schemas.UserRead:
    """Convertit un User ORM en schéma exposé (sans password_hash)."""
    return schemas.UserRead(
        id=user.id,
        email=user.email,
        company_name=user.company_name,
        role=user.role,
        created_at=user.created_at,
        product_count=len(user.products),
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_access_token(user_id=user.id, role=user.role)
    return schemas.TokenResponse(access_token=token, user=_to_user_read(user))


@router.get("/me", response_model=schemas.UserRead)
def me(user: models.User = Depends(get_current_user)):
    return _to_user_read(user)
