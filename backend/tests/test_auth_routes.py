"""Tests des endpoints /auth/login, /auth/me, /auth/register."""

from tests.conftest import auth


class TestLogin:
    def test_login_with_correct_credentials(self, client, admin_user):
        r = client.post(
            "/auth/login",
            json={"email": "admin@test.com", "password": "admin123"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"

    def test_login_with_wrong_password(self, client, admin_user):
        r = client.post(
            "/auth/login",
            json={"email": "admin@test.com", "password": "wrong"},
        )
        assert r.status_code == 401

    def test_login_unknown_user(self, client):
        r = client.post(
            "/auth/login",
            json={"email": "nobody@test.com", "password": "anything"},
        )
        assert r.status_code == 401

    def test_login_invalid_email_format(self, client):
        r = client.post(
            "/auth/login",
            json={"email": "not-an-email", "password": "x"},
        )
        assert r.status_code == 422


class TestMe:
    def test_me_returns_current_user(self, client, admin_token, admin_user):
        r = client.get("/auth/me", headers=auth(admin_token))
        assert r.status_code == 200
        assert r.json()["email"] == "admin@test.com"

    def test_me_without_token_is_401(self, client):
        assert client.get("/auth/me").status_code == 401

    def test_me_with_invalid_token_is_401(self, client):
        r = client.get("/auth/me", headers={"Authorization": "Bearer fake"})
        assert r.status_code == 401


class TestRegister:
    def test_register_creates_consumer(self, client):
        r = client.post(
            "/auth/register",
            json={
                "email": "newuser@test.com",
                "password": "secret123",
                "company_name": "New User",
            },
        )
        assert r.status_code == 201
        data = r.json()
        assert data["user"]["role"] == "consommateur"
        assert "access_token" in data

    def test_register_duplicate_email_rejected(self, client, admin_user):
        r = client.post(
            "/auth/register",
            json={
                "email": "admin@test.com",  # déjà existant
                "password": "secret123",
                "company_name": "Other",
            },
        )
        assert r.status_code == 409

    def test_register_short_password_rejected(self, client):
        r = client.post(
            "/auth/register",
            json={"email": "u@test.com", "password": "abc", "company_name": "X"},
        )
        assert r.status_code == 422
