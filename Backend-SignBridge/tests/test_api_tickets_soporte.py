"""Tickets de soporte: listados y edición del ticket propio (S7, backend al 80 %).

Autor: @Sebas-p-s · S7 (API)

Completa lo que quedó sin probar en `routers/support.py` después de la S5:
los listados de Soporte/Admin y editar o borrar el ticket propio.
"""
import uuid

import jwt
import pytest

from app.models.user import Support


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _id(token: str) -> str:
    return jwt.decode(token, options={"verify_signature": False})["sub"]


TICKET = {"subject": "No carga el video", "message": "La seña de Hola no aparece"}


@pytest.fixture()
def cliente(make_token):
    token = make_token("Cliente")
    return {"h": _auth(token), "id": _id(token)}


def test_should_create_a_ticket_and_list_it_in_my_tickets(client, cliente):
    # Act
    creado = client.post("/support", json=TICKET, headers=cliente["h"])
    mios = client.get("/support/my", headers=cliente["h"])

    # Assert
    assert creado.status_code == 201
    assert creado.json()["status"] == "pending"
    assert [t["subject"] for t in mios.json()] == ["No carga el video"]


def test_should_let_support_see_every_ticket_with_its_author(client, cliente, make_token):
    # Arrange
    client.post("/support", json=TICKET, headers=cliente["h"])

    # Act
    todos = client.get("/support/all", headers=_auth(make_token("Soporte")))

    # Assert
    fila = todos.json()[0]
    assert fila["user_full_name"] == "Test User"
    assert fila["user_email"].startswith("cliente-")


def test_should_list_every_ticket_for_the_admin_but_not_deleted_ones(client, cliente, make_token, db):
    # Arrange: dos tickets, uno borrado por su autor
    primero = client.post("/support", json=TICKET, headers=cliente["h"]).json()["id_support"]
    client.post("/support", json={**TICKET, "subject": "Otro"}, headers=cliente["h"])
    client.delete(f"/support/{primero}", headers=cliente["h"])

    # Act
    todos = client.get("/support/admin/all", headers=_auth(make_token("Administrador")))

    # Assert
    assert [t["subject"] for t in todos.json()] == ["Otro"]
    assert db.get(Support, primero).deleted_at is not None  # borrado lógico


def test_should_edit_my_pending_ticket_with_trimmed_text(client, cliente):
    id_ticket = client.post("/support", json=TICKET, headers=cliente["h"]).json()["id_support"]

    editado = client.put(
        f"/support/{id_ticket}",
        json={"subject": "  Video de Hola  ", "message": "Sigue sin cargar"},
        headers=cliente["h"],
    )

    assert editado.status_code == 200
    assert editado.json()["subject"] == "Video de Hola"
    assert editado.json()["message"] == "Sigue sin cargar"


def test_should_not_edit_a_ticket_that_support_already_took(client, cliente, make_token):
    # Arrange: Soporte lo pasa a "en proceso"
    id_ticket = client.post("/support", json=TICKET, headers=cliente["h"]).json()["id_support"]
    client.patch(
        f"/support/{id_ticket}/status", json={"status": "in_progress"},
        headers=_auth(make_token("Soporte")),
    )

    # Act
    editado = client.put(f"/support/{id_ticket}", json=TICKET, headers=cliente["h"])

    # Assert
    assert editado.status_code == 409
    assert editado.json()["detail"] == "Solo se puede editar un ticket que siga pendiente"


@pytest.mark.parametrize("metodo", ["put", "delete"])
def test_should_not_let_another_user_edit_or_delete_my_ticket(client, cliente, make_token, metodo):
    id_ticket = client.post("/support", json=TICKET, headers=cliente["h"]).json()["id_support"]
    otro = _auth(make_token("Cliente"))

    kwargs = {"json": TICKET} if metodo == "put" else {}
    respuesta = getattr(client, metodo)(f"/support/{id_ticket}", headers=otro, **kwargs)

    assert respuesta.status_code == 404


@pytest.mark.parametrize("metodo", ["put", "delete"])
def test_should_return_404_for_a_ticket_that_does_not_exist(client, cliente, metodo):
    kwargs = {"json": TICKET} if metodo == "put" else {}

    respuesta = getattr(client, metodo)(f"/support/{uuid.uuid4()}", headers=cliente["h"], **kwargs)

    assert respuesta.status_code == 404


def test_should_delete_my_ticket_only_once(client, cliente):
    id_ticket = client.post("/support", json=TICKET, headers=cliente["h"]).json()["id_support"]

    primera = client.delete(f"/support/{id_ticket}", headers=cliente["h"])
    segunda = client.delete(f"/support/{id_ticket}", headers=cliente["h"])

    assert primera.status_code == 204
    assert segunda.status_code == 404
    assert client.get("/support/my", headers=cliente["h"]).json() == []
