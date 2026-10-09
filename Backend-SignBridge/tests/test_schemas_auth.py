"""Validación de los esquemas de autenticación: contraseña y teléfono.

Son las reglas de negocio duplicadas entre backend y frontend que el
plan de QA exige cubrir con tests.
"""
import pytest
from pydantic import ValidationError

from app.schemas.auth import (
    ResetPasswordRequest,
    UserLogin,
    UserRegister,
)


def _base_payload(**overrides):
    payload = {
        "first_name": "ana",
        "last_name": "torres",
        "phone": "3001234567",
        "city": "Bogotá",
        "address": "Calle 1 #2-3",
        "email": "ana@example.com",
        "password": "Password1!",
    }
    payload.update(overrides)
    return payload


# ── Contraseña fuerte ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("bad_password,esperado", [
    ("short1!", "al menos 8 caracteres"),
    ("alllower1!", "una letra mayúscula"),
    ("ALLUPPER1!", "una letra minúscula"),
    ("NoNumber!", "un número"),
    ("NoSpecial1", "un carácter especial"),
])
def test_password_debil_rechazada(bad_password, esperado):
    with pytest.raises(ValidationError) as exc:
        UserRegister(**_base_payload(password=bad_password))
    assert esperado in str(exc.value)


def test_password_fuerte_aceptada():
    user = UserRegister(**_base_payload(password="Password1!"))
    assert user.password == "Password1!"


def test_reset_password_exige_password_fuerte():
    with pytest.raises(ValidationError):
        ResetPasswordRequest(token="tok", new_password="debil")
    ok = ResetPasswordRequest(token="tok", new_password="Password1!")
    assert ok.new_password == "Password1!"


# ── Teléfono colombiano ───────────────────────────────────────────────────────

def test_telefono_con_formato_se_normaliza():
    user = UserRegister(**_base_payload(phone="300-123-4567"))
    assert user.phone == "3001234567"


def test_telefono_largo_rechazado():
    with pytest.raises(ValidationError) as exc:
        UserRegister(**_base_payload(phone="30012345678"))
    assert "10 dígitos" in str(exc.value)


def test_telefono_no_colombiano_rechazado():
    with pytest.raises(ValidationError) as exc:
        UserRegister(**_base_payload(phone="5512345678"))
    assert "empezar con 3" in str(exc.value)


# ── Nombres y dirección ───────────────────────────────────────────────────────

def test_nombre_se_capitaliza():
    user = UserRegister(**_base_payload(first_name="  ana María "))
    assert user.first_name == "Ana María"


def test_nombre_vacio_rechazado():
    with pytest.raises(ValidationError) as exc:
        UserRegister(**_base_payload(first_name="   "))
    assert "obligatorio" in str(exc.value)


def test_direccion_vacia_rechazada():
    with pytest.raises(ValidationError) as exc:
        UserRegister(**_base_payload(address="  "))
    assert "dirección" in str(exc.value).lower()


def test_email_invalido_rechazado():
    with pytest.raises(ValidationError):
        UserRegister(**_base_payload(email="no-es-correo"))


def test_login_requiere_email_valido():
    with pytest.raises(ValidationError):
        UserLogin(email="no-es-correo", password="x")
