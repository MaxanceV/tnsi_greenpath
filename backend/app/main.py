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
from sqlalchemy import text

from . import models
from .database import SessionLocal, engine
from .routers import auth, consumption, products, public, users
from .services.auth import hash_password
from .services.blockchain import assign_hashes


def _migrate_step_hash_column() -> None:
    """Ajoute la colonne `steps.hash` si elle n'existe pas (idempotent).

    Utile pour les utilisateurs qui ont déjà un `greenpath.db` créé avant
    l'introduction du hash de traçabilité : on évite de leur demander de
    supprimer leur DB. Ne fait rien si la colonne existe déjà.
    """
    with engine.connect() as conn:
        cols = conn.execute(text("PRAGMA table_info(steps)")).fetchall()
        col_names = {row[1] for row in cols}
        if "hash" not in col_names:
            conn.execute(text("ALTER TABLE steps ADD COLUMN hash VARCHAR"))
            conn.commit()
            print("[migration] Colonne steps.hash ajoutée.")


_migrate_step_hash_column()
models.Base.metadata.create_all(bind=engine)


def _bootstrap_admin() -> None:
    """Crée un admin par défaut si aucun compte admin n'existe.

    Vérifie spécifiquement l'absence de rôle `admin` (pas l'absence totale
    d'utilisateurs) — important si le seed a tourné avant uvicorn et a déjà
    créé des comptes entreprise/consommateur sans admin.
    """
    db = SessionLocal()
    try:
        admin_exists = db.query(models.User).filter(models.User.role == "admin").first()
        if not admin_exists:
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


def _bootstrap_step_hashes() -> None:
    """Calcule le hash de toutes les étapes n'en ayant pas (rétro-compat).

    Pour chaque produit qui contient au moins une étape sans hash, on
    recalcule la chaîne entière (les hashes étant chaînés). Idempotent :
    si tous les hashes sont déjà présents, ne fait rien.
    """
    db = SessionLocal()
    try:
        products_to_fix = (
            db.query(models.Product)
            .join(models.Step)
            .filter(models.Step.hash.is_(None))
            .distinct()
            .all()
        )
        for product in products_to_fix:
            assign_hashes(product.steps)
        if products_to_fix:
            db.commit()
            print(f"[bootstrap] Hashes calculés pour {len(products_to_fix)} produit(s).")
    finally:
        db.close()


_bootstrap_admin()
_bootstrap_step_hashes()

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
app.include_router(consumption.router)
app.include_router(public.router)


@app.get("/")
def read_root():
    return {"status": "GreenPath Backend en ligne"}
