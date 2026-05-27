"""Dépendances FastAPI réutilisables par tous les routers protégés.

`get_current_user` : décode le JWT du header `Authorization: Bearer <token>`,
charge l'utilisateur depuis la DB et le renvoie. Lève 401 si manquant /
invalide / expiré.

`require_admin` : se compose au-dessus de `get_current_user` et lève 403 si
le rôle n'est pas `admin`. Utilisé sur les endpoints d'administration.
"""

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from . import models
from .database import get_db
from .services.auth import decode_access_token


def get_current_user(request: Request, db: Session = Depends(get_db)) -> models.User:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")

    token = auth_header.split(" ", 1)[1].strip()
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Token invalide")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user


def require_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Accès réservé à l'administrateur")
    return user
