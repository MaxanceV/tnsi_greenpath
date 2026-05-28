"""Tests des endpoints publics (consommateur via QR code)."""

from tests.conftest import SAMPLE_PRODUCT_PAYLOAD, auth


class TestPublicProduct:
    def test_public_product_no_auth_required(self, client, admin_token):
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(admin_token))
        pid = r.json()["id"]

        r2 = client.get(f"/public/products/{pid}")
        assert r2.status_code == 200
        data = r2.json()
        assert data["name"] == "T-shirt test"
        assert data["total_co2_kg"] > 0

    def test_unknown_product_404(self, client):
        assert client.get("/public/products/9999").status_code == 404


class TestPublicQRCode:
    def test_qrcode_returns_png(self, client, admin_token):
        r = client.post("/products", json=SAMPLE_PRODUCT_PAYLOAD, headers=auth(admin_token))
        pid = r.json()["id"]

        r2 = client.get(f"/public/products/{pid}/qrcode")
        assert r2.status_code == 200
        assert r2.headers["content-type"] == "image/png"
        # En-tête X-Public-URL contient l'URL encodée dans le QR
        assert f"/p/{pid}" in r2.headers["x-public-url"]

    def test_qrcode_404_for_unknown_product(self, client):
        assert client.get("/public/products/9999/qrcode").status_code == 404
