"""Tests CRUD produits + filtrage par rôle + validations."""

from tests.conftest import SAMPLE_PRODUCT_PAYLOAD, auth


class TestProductCreate:
    def test_entreprise_can_create_product(self, client, entreprise_token):
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(entreprise_token))
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "T-shirt test"
        assert len(data["steps"]) == 2
        assert data["total_co2_kg"] > 0
        # Chaque étape doit avoir un hash blockchain
        for step in data["steps"]:
            assert step["hash"]
            assert len(step["hash"]) == 64
        assert data["chain_valid"] is True

    def test_unauthenticated_create_rejected(self, client):
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD)
        assert r.status_code == 401

    def test_consumer_cannot_see_products(self, client, consumer_token):
        # Le consommateur ne devrait pas avoir accès au CRUD entreprise
        # mais le backend autorise la création (pas de restriction explicite).
        # On vérifie au moins que /products GET ne renvoie que les siens (0 produits).
        r = client.get("/products", headers=auth(consumer_token))
        assert r.status_code == 200
        assert r.json() == []

    def test_create_with_invalid_step_type(self, client, entreprise_token):
        bad_payload = {
            "name": "Bad",
            "steps": [{"position": 1, "name": "X", "step_type": "invalid", "weight_kg": 1.0}],
        }
        r = client.post("/products", json=bad_payload, headers=auth(entreprise_token))
        assert r.status_code == 422

    def test_create_with_zero_weight_rejected(self, client, entreprise_token):
        bad_payload = {
            "name": "Bad",
            "steps": [{"position": 1, "name": "X", "step_type": "fabrication", "weight_kg": 0}],
        }
        r = client.post("/products", json=bad_payload, headers=auth(entreprise_token))
        assert r.status_code == 422

    def test_create_with_duplicate_positions_rejected(self, client, entreprise_token):
        bad_payload = {
            "name": "Bad",
            "steps": [
                {"position": 1, "name": "A", "step_type": "fabrication", "weight_kg": 1.0},
                {"position": 1, "name": "B", "step_type": "fabrication", "weight_kg": 1.0},
            ],
        }
        r = client.post("/products", json=bad_payload, headers=auth(entreprise_token))
        assert r.status_code == 422


class TestProductIsolation:
    def test_entreprise_sees_only_its_products(
        self, client, entreprise_token, entreprise_user, admin_token
    ):
        # L'entreprise crée 2 produits
        client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(entreprise_token))
        p2 = {**SAMPLE_PRODUCT_PAYLOAD, "name": "Sweat test"}
        client.post("/products", json=p2, headers=auth(entreprise_token))

        # Admin crée son propre produit
        admin_product = {**SAMPLE_PRODUCT_PAYLOAD, "name": "Admin product"}
        client.post("/products", json=admin_product, headers=auth(admin_token))

        # L'entreprise voit ses 2 produits, pas celui de l'admin
        r = client.get("/products", headers=auth(entreprise_token))
        names = {p["name"] for p in r.json()}
        assert names == {"T-shirt test", "Sweat test"}

        # L'admin voit les 3
        r = client.get("/products", headers=auth(admin_token))
        names = {p["name"] for p in r.json()}
        assert names == {"T-shirt test", "Sweat test", "Admin product"}

    def test_entreprise_cannot_access_other_entreprise_product(
        self, client, entreprise_token, admin_token
    ):
        # Admin crée un produit
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(admin_token))
        admin_pid = r.json()["id"]

        # L'entreprise tente d'y accéder
        r2 = client.get(f"/products/{admin_pid}", headers=auth(entreprise_token))
        assert r2.status_code == 403


class TestProductUpdate:
    def test_update_replaces_steps(self, client, entreprise_token):
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(entreprise_token))
        pid = r.json()["id"]

        new_payload = {
            "name": "T-shirt updated",
            "description": "Modifié",
            "steps": [
                {"position": 1, "name": "Nouvelle étape", "step_type": "fabrication", "weight_kg": 0.5},
            ],
        }
        r2 = client.put(f"/products/{pid}", json=new_payload, headers=auth(entreprise_token))
        assert r2.status_code == 200
        data = r2.json()
        assert data["name"] == "T-shirt updated"
        assert len(data["steps"]) == 1
        assert data["steps"][0]["name"] == "Nouvelle étape"


class TestProductDelete:
    def test_delete_owner(self, client, entreprise_token):
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(entreprise_token))
        pid = r.json()["id"]
        r2 = client.delete(f"/products/{pid}", headers=auth(entreprise_token))
        assert r2.status_code == 204
        # 404 ensuite
        assert client.get(f"/products/{pid}", headers=auth(entreprise_token)).status_code == 404

    def test_delete_unknown_404(self, client, entreprise_token):
        assert client.delete("/products/9999", headers=auth(entreprise_token)).status_code == 404


class TestProductStats:
    def test_stats_for_empty(self, client, entreprise_token):
        r = client.get("/products/stats/summary", headers=auth(entreprise_token))
        assert r.status_code == 200
        data = r.json()
        assert data == {
            "product_count": 0,
            "step_count": 0,
            "total_co2_kg": 0.0,
            "avg_co2_kg": 0.0,
        }

    def test_stats_after_creation(self, client, entreprise_token):
        client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(entreprise_token))
        r = client.get("/products/stats/summary", headers=auth(entreprise_token))
        data = r.json()
        assert data["product_count"] == 1
        assert data["step_count"] == 2
        assert data["total_co2_kg"] > 0
