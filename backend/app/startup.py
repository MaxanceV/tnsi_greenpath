"""Fonctions de démarrage de l'application GreenPath.

Responsabilité unique : initialiser la base de données et garantir
la cohérence des données au lancement (migrations idempotentes,
bootstrap des comptes et identifiants manquants).

Séparation depuis main.py conformément au principe SRP (SOLID) :
main.py = assemblage de l'application, startup.py = logique d'initialisation.
"""

from sqlalchemy import text

from . import models
from .database import SessionLocal, engine
from .services.auth import hash_password
from .services.blockchain import assign_hashes


# ---------------------------------------------------------------------------
# Migrations SQL idempotentes
# ---------------------------------------------------------------------------

def migrate_step_hash_column() -> None:
    """Ajoute la colonne `steps.hash` si elle n'existe pas."""
    with engine.connect() as conn:
        cols = conn.execute(text("PRAGMA table_info(steps)")).fetchall()
        if "hash" not in {row[1] for row in cols}:
            conn.execute(text("ALTER TABLE steps ADD COLUMN hash VARCHAR"))
            conn.commit()
            print("[migration] Colonne steps.hash ajoutée.")


def migrate_gs1_and_batch_columns() -> None:
    """Ajoute les colonnes GS1, multi-entreprise et batch si absentes.

    Migrations effectuées :
    - users.gln              : GLN GS1 de l'entreprise (13 chiffres)
    - products.gtin          : GTIN-14 GS1 du produit
    - steps.parent_positions : JSON liste des positions parentes (DAG)
    - steps.contributor_id   : FK vers l'entreprise ayant saisi l'étape
    - steps.upstream_product_id : FK vers un produit GreenPath amont
    - steps.upstream_batch_id   : FK vers un lot amont
    """
    with engine.connect() as conn:
        user_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()}
        if "gln" not in user_cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN gln VARCHAR"))
            conn.commit()
            print("[migration] Colonne users.gln ajoutée.")

        product_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(products)")).fetchall()}
        if "gtin" not in product_cols:
            conn.execute(text("ALTER TABLE products ADD COLUMN gtin VARCHAR"))
            conn.commit()
            print("[migration] Colonne products.gtin ajoutée.")

        step_cols = {row[1] for row in conn.execute(text("PRAGMA table_info(steps)")).fetchall()}
        new_step_cols = {
            "parent_positions": "TEXT",
            "contributor_id": "INTEGER REFERENCES users(id) ON DELETE SET NULL",
            "upstream_product_id": "INTEGER REFERENCES products(id) ON DELETE SET NULL",
            "upstream_batch_id": "INTEGER REFERENCES batches(id) ON DELETE SET NULL",
        }
        for col_name, col_type in new_step_cols.items():
            if col_name not in step_cols:
                conn.execute(text(f"ALTER TABLE steps ADD COLUMN {col_name} {col_type}"))
                conn.commit()
                print(f"[migration] Colonne steps.{col_name} ajoutée.")


# ---------------------------------------------------------------------------
# Bootstrap des données
# ---------------------------------------------------------------------------

def bootstrap_admin() -> None:
    """Crée un compte admin par défaut si aucun n'existe."""
    db = SessionLocal()
    try:
        if not db.query(models.User).filter(models.User.role == "admin").first():
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


def bootstrap_step_hashes() -> None:
    """Calcule le hash des étapes non hashées (rétro-compatibilité)."""
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


def bootstrap_gs1_identifiers() -> None:
    """Génère les identifiants GS1 manquants (GLN pour users, GTIN pour products)."""
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


def run_all() -> None:
    """Exécute toutes les migrations et bootstraps dans le bon ordre."""
    migrate_step_hash_column()
    models.Base.metadata.create_all(bind=engine)
    migrate_gs1_and_batch_columns()
    bootstrap_admin()
    bootstrap_step_hashes()
    bootstrap_gs1_identifiers()
