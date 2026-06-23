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
from .routers import auth, batches, chat, consumption, contributors, products, public, users
from .services.auth import hash_password
from .services.blockchain import assign_hashes


def _migrate_step_hash_column() -> None:
    """Ajoute la colonne `steps.hash` si elle n'existe pas (idempotent)."""
    with engine.connect() as conn:
        cols = conn.execute(text("PRAGMA table_info(steps)")).fetchall()
        col_names = {row[1] for row in cols}
        if "hash" not in col_names:
            conn.execute(text("ALTER TABLE steps ADD COLUMN hash VARCHAR"))
            conn.commit()
            print("[migration] Colonne steps.hash ajoutée.")


def _migrate_gs1_and_batch_columns() -> None:
    """Ajoute les colonnes GS1, multi-entreprise et batch si absentes (idempotent).

    Migrations effectuées :
    - users.gln              : GLN GS1 de l'entreprise (13 chiffres)
    - products.gtin          : GTIN-14 GS1 du produit
    - steps.parallel_group   : groupe de parallélisme pour la timeline
    - steps.contributor_id   : FK vers l'entreprise ayant saisi l'étape
    - steps.upstream_product_id : FK vers un produit GreenPath amont
    - steps.upstream_batch_id   : FK vers un lot amont
    """
    with engine.connect() as conn:
        # --- users ---
        user_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()}
        if "gln" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN gln VARCHAR"))
            conn.commit()
            print("[migration] Colonne users.gln ajoutée.")

        # --- products ---
        product_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(products)")).fetchall()}
        if "gtin" not in product_cols:
            conn.execute(text("ALTER TABLE products ADD COLUMN gtin VARCHAR"))
            conn.commit()
            print("[migration] Colonne products.gtin ajoutée.")

        # --- steps ---
        step_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(steps)")).fetchall()}
        new_step_cols = {
            "parallel_group": "INTEGER",
            "contributor_id": "INTEGER REFERENCES users(id) ON DELETE SET NULL",
            "upstream_product_id": "INTEGER REFERENCES products(id) ON DELETE SET NULL",
            "upstream_batch_id": "INTEGER REFERENCES batches(id) ON DELETE SET NULL",
        }
        for col_name, col_type in new_step_cols.items():
            if col_name not in step_cols:
                conn.execute(text(f"ALTER TABLE steps ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"[migration] Colonne steps.{col_name} ajoutée.")


_migrate_step_hash_column()
# Les tables nouvelles (batches, batch_parents, product_contributors) sont
# créées par create_all. Les colonnes sur les tables existantes sont migrées
# manuellement après create_all pour éviter les conflits de contraintes SQLite.
models.Base.metadata.create_all(bind=engine)
_migrate_gs1_and_batch_columns()


def _bootstrap_gs1_identifiers() -> None:
    """Génère les identifiants GS1 manquants pour les entités existantes (idempotent).

    - users sans GLN → génération automatique
    - products sans GTIN → génération automatique
    """
    from .services.gs1 import generate_gln, generate_gtin
    db = SessionLocal()
    try:
        users_no_gln = db.query(models.User).filter(models.User.gln.is_(None)).all()
        for u in users_no_gln:
            u.gln = generate_gln(u.id)
        if users_no_gln:
            db.commit()
            print(f"[bootstrap] GLN générés pour {len(users_no_gln)} utilisateur(s).")

        products_no_gtin = db.query(models.Product).filter(models.Product.gtin.is_(None)).all()
        for p in products_no_gtin:
            p.gtin = generate_gtin(p.id)
        if products_no_gtin:
            db.commit()
            print(f"[bootstrap] GTIN générés pour {len(products_no_gtin)} produit(s).")
    finally:
        db.close()


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
_bootstrap_gs1_identifiers()

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
app.include_router(batches.router)
app.include_router(contributors.router)
app.include_router(consumption.router)
app.include_router(chat.router)
app.include_router(public.router)


@app.on_event("startup")
def _index_rag_on_startup() -> None:
    """Lance l'indexation RAG en arrière-plan au démarrage.

    Skip si `DISABLE_RAG=1` (mode test).
    """
    import os as _os
    if _os.getenv("DISABLE_RAG") == "1":
        return

    import threading

    def _run() -> None:
        try:
            from .services.rag import get_rag
            stats = get_rag().index_all()
            print(f"[RAG] Indexation terminée : {stats}")
        except Exception as e:
            print(f"[RAG] Échec de l'indexation initiale : {e}")

    threading.Thread(target=_run, daemon=True).start()


@app.get("/")
def read_root():
    return {"status": "GreenPath Backend en ligne"}
