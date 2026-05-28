"""Configuration globale des tests pytest.

- Force HF_TOKEN=test pour éviter d'utiliser de vraies credentials en CI.
- Crée une DB SQLite en mémoire isolée par test (rollback automatique).
- Fournit un client HTTP FastAPI (`client`) et des fixtures de users / produits.
"""

from __future__ import annotations

import os

# Doit être set AVANT d'importer l'app (qui lit ces variables au chargement)
os.environ.setdefault("HF_TOKEN", "test-token")
os.environ.setdefault("HF_MODEL", "test-model")
# Empêche pytest de charger le modèle d'embedding (PyTorch) qui sature
# la mémoire MPS sur Mac Apple Silicon.
os.environ["DISABLE_RAG"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.database import Base, get_db
from app.main import app
from app.services.auth import hash_password


# DB SQLite en mémoire, partagée entre threads (StaticPool) pour le TestClient
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function", autouse=True)
def _reset_db():
    """Recrée le schéma à chaque test pour garantir l'isolation."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    """Renvoie une session DB partagée avec celle utilisée par les endpoints."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


def _override_get_db():
    """Override de la dépendance FastAPI : utilise la DB de test."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """TestClient FastAPI avec DB de test injectée."""
    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------- Fixtures users

@pytest.fixture
def admin_user(db):
    user = models.User(
        email="admin@test.com",
        password_hash=hash_password("admin123"),
        role="admin",
        company_name="GreenPath",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def entreprise_user(db):
    user = models.User(
        email="entreprise@test.com",
        password_hash=hash_password("entreprise123"),
        role="entreprise",
        company_name="Petite Marie Test",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def consumer_user(db):
    user = models.User(
        email="consumer@test.com",
        password_hash=hash_password("conso123"),
        role="consommateur",
        company_name="Léa Test",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login_token(client, email: str, password: str) -> str:
    r = client.post("/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture
def admin_token(client, admin_user):
    return _login_token(client, "admin@test.com", "admin123")


@pytest.fixture
def entreprise_token(client, entreprise_user):
    return _login_token(client, "entreprise@test.com", "entreprise123")


@pytest.fixture
def consumer_token(client, consumer_user):
    return _login_token(client, "consumer@test.com", "conso123")


# ---------------------------------------------------------------- Helpers

def auth(token: str) -> dict:
    """Header Authorization bearer."""
    return {"Authorization": f"Bearer {token}"}


SAMPLE_PRODUCT_PAYLOAD = {
    "name": "T-shirt test",
    "description": "Pour les tests",
    "steps": [
        {
            "position": 1,
            "name": "Culture coton",
            "step_type": "matiere_premiere",
            "supplier": "FarmIN",
            "location": "Inde",
            "weight_kg": 0.3,
        },
        {
            "position": 2,
            "name": "Livraison",
            "step_type": "transport",
            "weight_kg": 0.3,
            "transport_mode": "bateau",
            "distance_km": 8000,
        },
    ],
}
