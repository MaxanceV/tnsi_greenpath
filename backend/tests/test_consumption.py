"""Tests CRUD du suivi de consommation."""

from tests.conftest import SAMPLE_PRODUCT_PAYLOAD, auth


class TestConsumptionAccess:
    def test_consumer_can_add_consumption(self, client, consumer_token, admin_token):
        # Admin crée un produit (consommateur ne peut pas, par design)
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(admin_token))
        pid = r.json()["id"]

        # Le consommateur l'ajoute à son suivi
        r2 = client.post(
            "/consumption",
            json={"product_id": pid, "quantity": 1.0},
            headers=auth(consumer_token),
        )
        assert r2.status_code == 201
        data = r2.json()
        assert data["product"]["id"] == pid
        assert data["co2_kg"] > 0

    def test_unauthenticated_rejected(self, client):
        assert client.get("/consumption").status_code == 401

    def test_entreprise_cannot_use_consumption(self, client, entreprise_token):
        r = client.get("/consumption", headers=auth(entreprise_token))
        assert r.status_code == 403

    def test_add_unknown_product_404(self, client, consumer_token):
        r = client.post(
            "/consumption",
            json={"product_id": 9999, "quantity": 1.0},
            headers=auth(consumer_token),
        )
        assert r.status_code == 404


class TestConsumptionIsolation:
    def test_consumer_sees_only_own_entries(self, client, consumer_user, admin_token, db):
        from app import models
        # Crée un autre consommateur via DB direct
        other = models.User(
            email="other@test.com",
            password_hash="x",
            role="consommateur",
            company_name="Other",
        )
        db.add(other)
        db.commit()

        # Crée un produit
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(admin_token))
        pid = r.json()["id"]

        # L'autre user ajoute à son suivi (insertion directe DB)
        db.add(models.Consumption(user_id=other.id, product_id=pid, quantity=1.0))
        db.commit()

        # Notre consommateur ne voit rien (il n'a rien ajouté)
        consumer_login = client.post(
            "/auth/login",
            json={"email": "consumer@test.com", "password": "conso123"},
        )
        token = consumer_login.json()["access_token"]
        r2 = client.get("/consumption", headers=auth(token))
        assert r2.json() == []


class TestConsumptionStats:
    def test_empty_stats(self, client, consumer_token):
        r = client.get("/consumption/stats", headers=auth(consumer_token))
        assert r.status_code == 200
        assert r.json() == {
            "item_count": 0,
            "unique_product_count": 0,
            "total_co2_kg": 0.0,
            "avg_co2_per_item": 0.0,
        }

    def test_stats_after_multiple_additions(self, client, consumer_token, admin_token):
        # Crée 2 produits
        r1 = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(admin_token))
        pid1 = r1.json()["id"]
        p2 = {**SAMPLE_PRODUCT_PAYLOAD, "name": "Other"}
        r2 = client.post("/products", json=p2, headers=auth(admin_token))
        pid2 = r2.json()["id"]

        # Consommateur ajoute : 2x pid1, 1x pid2 → 3 entries, 2 unique
        client.post("/consumption", json={"product_id": pid1}, headers=auth(consumer_token))
        client.post("/consumption", json={"product_id": pid1}, headers=auth(consumer_token))
        client.post("/consumption", json={"product_id": pid2}, headers=auth(consumer_token))

        r = client.get("/consumption/stats", headers=auth(consumer_token))
        data = r.json()
        assert data["item_count"] == 3
        assert data["unique_product_count"] == 2
        assert data["total_co2_kg"] > 0


class TestConsumptionDelete:
    def test_delete_own_entry(self, client, consumer_token, admin_token):
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(admin_token))
        pid = r.json()["id"]
        r2 = client.post("/consumption", json={"product_id": pid}, headers=auth(consumer_token))
        eid = r2.json()["id"]

        assert client.delete(f"/consumption/{eid}", headers=auth(consumer_token)).status_code == 204
        r3 = client.get("/consumption", headers=auth(consumer_token))
        assert r3.json() == []

    def test_cannot_delete_unknown(self, client, consumer_token):
        assert client.delete("/consumption/9999", headers=auth(consumer_token)).status_code == 404
