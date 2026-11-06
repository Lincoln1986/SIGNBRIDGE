"""Pruebas unitarias de seguridad: bcrypt y JWT."""
from datetime import timedelta

import pytest
from fastapi import HTTPException

from app.core.security import (
    create_access_token,
    create_reset_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_hash_y_verify_password():
    hashed = hash_password("Password1!")
    assert hashed != "Password1!"
    assert verify_password("Password1!", hashed) is True
    assert verify_password("OtraClave1!", hashed) is False


def test_token_se_puede_decodificar():
    token = create_access_token({"sub": "user-123"})
    payload = decode_token(token)
    assert payload["sub"] == "user-123"


def test_token_expirado_rechazado():
    token = create_access_token({"sub": "u"}, expires_delta=timedelta(seconds=-1))
    with pytest.raises(HTTPException) as exc:
        decode_token(token)
    assert exc.value.status_code == 401


def test_token_basura_rechazado():
    with pytest.raises(HTTPException) as exc:
        decode_token("no-un-jwt")
    assert exc.value.status_code == 401


def test_reset_token_lleva_tipo_reset():
    payload = decode_token(create_reset_token("ana@example.com"))
    assert payload["type"] == "reset"
    assert payload["sub"] == "ana@example.com"
