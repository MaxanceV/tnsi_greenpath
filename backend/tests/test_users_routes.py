"""Tests des endpoints d'admin /users."""

from tests.conftest import auth


class TestListUsers:
    def test_admin_can_list(self, client, admin_token):
        r = client.get("/users", headers=auth(admin_token))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_entreprise_cannot_list(self, client, entreprise_token):
        assert client.get("/users", headers=auth(entreprise_token)).status_code == 403

    def test_consumer_cannot_list(self, client, consumer_token):
        assert client.get("/users", headers=auth(consumer_token)).status_code == 403

    def test_unauthenticated_rejected(self, client):
        assert client.get("/users").status_code == 401


class TestCreateUser:
    def test_admin_can_create_entreprise(self, client, admin_token):
        r = client.post(
            "/users",
            json={
                "email": "new@test.com",
                "password": "newpassword",
                "company_name": "New Corp",
                "role": "entreprise",
            },
            headers=auth(admin_token),
        )
        assert r.status_code == 201
        assert r.json()["role"] == "entreprise"

    def test_create_duplicate_email(self, client, admin_token, entreprise_user):
        r = client.post(
            "/users",
            json={
                "email": "entreprise@test.com",  # déjà créé par la fixture
                "password": "validpassword",
                "company_name": "X",
                "role": "entreprise",
            },
            headers=auth(admin_token),
        )
        assert r.status_code == 409


class TestUpdateUser:
    def test_admin_cannot_demote_self(self, client, admin_token, admin_user):
        r = client.put(
            f"/users/{admin_user.id}",
            json={"role": "entreprise"},
            headers=auth(admin_token),
        )
        assert r.status_code == 400


class TestDeleteUser:
    def test_admin_cannot_delete_self(self, client, admin_token, admin_user):
        r = client.delete(f"/users/{admin_user.id}", headers=auth(admin_token))
        assert r.status_code == 400

    def test_admin_can_delete_other(self, client, admin_token, entreprise_user):
        r = client.delete(f"/users/{entreprise_user.id}", headers=auth(admin_token))
        assert r.status_code == 204
