"""Point d'entrée de l'API GreenPath.

Rôle :
- crée le schéma SQLite au démarrage (`Base.metadata.create_all`),
- crée un compte admin par défaut si la table users est vide (bootstrap),
- configure CORS pour autoriser l'accès LAN (cf. README),
- assemble les routers (auth, users, products, public).

Architecture (cf. README) :
    routers/   ← HTTP, validation Pydantic, contrôle d'accès
        ↓
    services/  ← logique métier (CO2, JWT, sérialisation)
        ↓
    models.py  ← schéma SQLAlchemy
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import SessionLocal, engine
from .routers import auth, products, public, users
from .services.auth import hash_password

models.Base.metadata.create_all(bind=engine)


def _bootstrap_admin():
    """Crée un admin par défaut si aucun utilisateur n'existe."""
    db = SessionLocal()
    try:
        if db.query(models.User).count() == 0:
            admin = models.User(
                email="admin@greenpath.com",
                password_hash=hash_password("admin123"),
                role="admin",
                company_name="GreenPath",
            )
            db.add(admin)
            db.commit()
            print("[bootstrap] Admin créé : admin@greenpath.com / admin123")
    finally:
        db.close()


_bootstrap_admin()

app = FastAPI(title="GreenPath API")

app.add_middleware(
    CORSMiddleware,
    # Autorise localhost, 127.0.0.1 et toute IP LAN (ex: 192.168.x.x, 10.x.x.x)
    # sur le port 4200 (front Angular). Pour la prod, restreindre à des origines précises.
    allow_origin_regex=r"http://[a-zA-Z0-9.\-]+:4200",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(public.router)


@app.get("/")
def read_root():
    return {"status": "GreenPath Backend en ligne"}
