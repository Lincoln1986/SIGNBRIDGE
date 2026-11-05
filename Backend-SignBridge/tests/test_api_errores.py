"""Contrato de errores de TODO el API: siempre JSON, sin stack traces ni SQL.

Autor: @javierperez14 · S4 (capa E2E: seguridad y errores, transversal)

Junto con test_api_seguridad.py (401 y 403 en todos los endpoints protegidos)
cubre el ángulo transversal de la semana 4.
"""
import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.main import app
from tests.test_access_control import _make_token

PISTAS_INTERNAS = ("Traceback", "SELECT", "sqlalchemy", "psycopg2", 'File "')


# ── Autorizado: el tercer caso junto al 401 y el 403 ─────────────────────────

@pytest.mark.parametrize(("rol", "path"), [
    ("Cliente", "/auth/me"),
    ("Cliente", "/support/my"),
    ("Administrador", "/admin/users"),
    ("Soporte", "/feedback/all"),
])
def test_should_answer_200_to_the_right_role(client, seed_data, rol, path):
    res = client.get(path, headers={"Authorization": f"Bearer {_make_token(rol)}"})

    assert res.status_code == 200
    assert res.headers["content-type"] == "application/json"


# ── Peticiones mal formadas ──────────────────────────────────────────────────

def test_should_answer_422_in_json_when_the_body_is_malformed_json(client, seed_data):
    res = client.post("/auth/login", content="{esto no es json",
                      headers={"Content-Type": "application/json"})

    assert res.status_code == 422
    assert res.headers["content-type"] == "application/json"
    assert res.json()["detail"][0]["type"] == "json_invalid"


@pytest.mark.parametrize("body", [
    {"email": 123, "password": "Password1!"},          # tipo incorrecto
    {"email": "no-es-correo", "password": "Password1!"},
    {"password": "Password1!"},                        # falta un campo
])
def test_should_answer_422_naming_the_field_when_the_data_is_wrong(client, seed_data, body):
    res = client.post("/auth/login", json=body)

    assert res.status_code == 422
    assert res.json()["detail"][0]["loc"] == ["body", "email"]


# ── Error inesperado ─────────────────────────────────────────────────────────

@pytest.fixture
def base_caida():
    """Simula que PostgreSQL se cayó: get_db explota con un mensaje que trae SQL."""
    def _rota():
        raise RuntimeError('could not connect to server: SELECT * FROM "User"')
        yield  # noqa: unreachable — get_db es un generador

    app.dependency_overrides[get_db] = _rota
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


def test_should_answer_500_in_json_without_internal_details(base_caida):
    # 🔎 Hallazgo: respondía 500 con "Internal Server Error" en texto plano.
    res = base_caida.post("/auth/login", json={"email": "ana@example.com", "password": "Password1!"})

    assert res.status_code == 500
    assert res.headers["content-type"] == "application/json"
    assert res.json() == {"detail": "Error interno del servidor"}
    assert not any(pista in res.text for pista in PISTAS_INTERNAS)
