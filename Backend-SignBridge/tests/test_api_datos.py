"""Endpoints cuya respuesta depende de lo que ya está guardado.

Autor: @Lincoln1986 · S4 (capa BD: duplicados, borrado lógico y datos de cada usuario)

La BD es SQLite en memoria y se vacía después de cada test (conftest.py).
"""
import pytest

from tests.test_access_control import _make_token


def _sesion(rol="Cliente"):
    return {"Authorization": f"Bearer {_make_token(rol)}"}


# ── Duplicados en el vocabulario ─────────────────────────────────────────────

@pytest.mark.parametrize("repetida", ["Hola", "hola", "  HOLA  "])
def test_should_answer_409_when_the_word_already_exists(client, seed_data, repetida):
    # 🔎 Hallazgo: "hola" y " Hola " se aceptaban como palabras nuevas (201).
    admin = _sesion("Administrador")
    client.post("/dashboard/lexical-units", json={"text": "Hola"}, headers=admin)

    res = client.post("/dashboard/lexical-units", json={"text": repetida}, headers=admin)

    assert res.status_code == 409
    assert res.json() == {"detail": "Ya existe una palabra con ese texto"}


def test_should_allow_creating_again_a_word_that_was_deleted(client, seed_data):
    # El borrado es lógico: la fila sigue en la base, pero ya no cuenta como duplicado.
    admin = _sesion("Administrador")
    id_palabra = client.post("/dashboard/lexical-units", json={"text": "Hola"}, headers=admin).json()["id_lexicalunit"]
    client.delete(f"/dashboard/lexical-units/{id_palabra}", headers=admin)

    res = client.post("/dashboard/lexical-units", json={"text": "Hola"}, headers=admin)

    assert res.status_code == 201


# ── Duplicados de correo ─────────────────────────────────────────────────────

def _registro(email):
    return {"first_name": "luis", "last_name": "paz", "phone": "3001112233", "city": "Bogotá",
            "address": "Cra 1", "email": email, "password": "Password1!"}


@pytest.mark.parametrize("email", ["ana@example.com", "ANA@example.com", "Ana@Example.com"])
def test_should_answer_409_when_the_email_is_already_registered(client, seed_data, email):
    # 🔎 Hallazgo: "ANA@example.com" creaba una segunda cuenta para la misma persona.
    res = client.post("/auth/register", json=_registro(email))

    assert res.status_code == 409
    assert res.json() == {"detail": "El correo ya está registrado"}


def test_should_log_in_whatever_the_case_of_the_email(client, seed_data):
    res = client.post("/auth/login", json={"email": "ANA@Example.com", "password": "Password1!"})

    assert res.status_code == 200
    assert res.json()["full_name"] == "Ana Torres"


# ── Cada usuario ve y toca solo lo suyo ──────────────────────────────────────

def test_should_list_only_my_own_tickets(client, seed_data):
    yo, otro = _sesion(), _sesion()
    client.post("/support", json={"subject": "Mío", "message": "No carga el video"}, headers=yo)
    client.post("/support", json={"subject": "Ajeno", "message": "Otra cosa"}, headers=otro)

    res = client.get("/support/my", headers=yo)

    assert [t["subject"] for t in res.json()] == ["Mío"]


@pytest.mark.parametrize("metodo", ["PUT", "DELETE"])
def test_should_answer_404_when_touching_someone_elses_ticket(client, seed_data, metodo):
    duena, intruso = _sesion(), _sesion()
    id_ticket = client.post("/support", json={"subject": "Mío", "message": "Hola"}, headers=duena).json()["id_support"]

    res = client.request(metodo, f"/support/{id_ticket}", json={"subject": "x", "message": "y"}, headers=intruso)

    assert res.status_code == 404  # no revela que el ticket existe
    assert len(client.get("/support/my", headers=duena).json()) == 1
