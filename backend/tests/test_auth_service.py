"""Tests des fonctions auth : hash bcrypt + JWT."""

import time

import jwt
import pytest

from app.services.auth import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


class TestPasswordHashing:
    def test_hash_is_different_from_plain(self):
        h = hash_password("secret123")
        assert h != "secret123"
        assert len(h) > 30

    def test_same_password_produces_different_hashes(self):
        # bcrypt utilise un salt aléatoire
        h1 = hash_password("same")
        h2 = hash_password("same")
        assert h1 != h2

    def test_verify_correct_password(self):
        h = hash_password("secret123")
        assert verify_password("secret123", h) is True

    def test_verify_wrong_password(self):
        h = hash_password("secret123")
        assert verify_password("wrong", h) is False

    def test_verify_empty_password(self):
        h = hash_password("secret123")
        assert verify_password("", h) is False


class TestJWT:
    def test_token_can_be_decoded(self):
        token = create_access_token(user_id=42, role="admin")
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "42"
        assert payload["role"] == "admin"

    def test_invalid_token_returns_none(self):
        assert decode_access_token("not.a.valid.jwt") is None

    def test_tampered_token_rejected(self):
        token = create_access_token(user_id=1, role="entreprise")
        # Falsifier la dernière partie (signature)
        tampered = token[:-5] + "AAAAA"
        assert decode_access_token(tampered) is None

    def test_expired_token_rejected(self):
        # Token expiré il y a 1 minute
        token = create_access_token(user_id=1, role="admin", expires_minutes=-1)
        assert decode_access_token(token) is None

    def test_token_signed_with_wrong_key_rejected(self):
        # Si quelqu'un a une autre clé secrète, le token sera rejeté
        fake = jwt.encode({"sub": "999", "role": "admin"}, "wrong-key", algorithm=ALGORITHM)
        assert decode_access_token(fake) is None
