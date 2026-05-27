"""Configuration de la base de données.

Utilise SQLite local pour l'MVP. Pour passer en production (PostgreSQL p.ex.),
seule l'URL `SQLALCHEMY_DATABASE_URL` change.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./greenpath.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dépendance FastAPI : ouvre une session SQLAlchemy par requête HTTP
    et la ferme proprement à la fin (succès ou erreur)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
