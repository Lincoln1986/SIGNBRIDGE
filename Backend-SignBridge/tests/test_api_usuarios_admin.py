"""Gestión de usuarios del administrador (S7, backend al 80 %).

Autor: @juan-soto350 · S7 (API)

Pruebas de API con TestClient y la BD SQLite de la suite. No incluye
GET /admin/users/export: usa TO_CHAR, que solo existe en PostgreSQL.
"""
import uuid

import jwt
import pytest

from app.models.user import Region, Role, User


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _id(token: str) -> str:
    return jwt.decode(token, options={"verify_signature": False})["sub"]


# ─── /admin/users ───────────────────────────────────────────────────────────

@pytest.fixture()
def admin(make_token):
    token = make_token("Administrador")
    return {"h": _auth(token), "id": _id(token)}


@pytest.fixture()
def persona(make_token):
    """Una persona con rol Cliente creada por make_token."""
    return _id(make_token("Cliente"))


def test_should_list_users_and_filter_by_status(client, admin, persona):
    # Arrange: la persona queda inactiva
    client.patch(f"/admin/users/{persona}/status", json={"is_active": False}, headers=admin["h"])

    # Act
    todos = client.get("/admin/users", headers=admin["h"]).json()
    activos = client.get("/admin/users?is_active=true", headers=admin["h"]).json()

    # Assert
    assert {u["id_user"] for u in todos} == {admin["id"], persona}
    assert [u["id_user"] for u in activos] == [admin["id"]]
    assert todos[0]["full_name"] == "Test User"


def test_should_change_the_role_of_another_user(client, admin, persona, db):
    soporte = Role(id_role=str(uuid.uuid4()), role_name="Soporte")
    db.add(soporte)
    db.commit()

    respuesta = client.patch(
        f"/admin/users/{persona}/role", json={"id_role": soporte.id_role}, headers=admin["h"]
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["role_name"] == "Soporte"


@pytest.mark.parametrize(("campo", "cuerpo"), [("role", {"id_role": "x"}), ("status", {"is_active": False})])
def test_should_not_let_the_admin_change_themselves(client, admin, campo, cuerpo):
    respuesta = client.patch(f"/admin/users/{admin['id']}/{campo}", json=cuerpo, headers=admin["h"])

    assert respuesta.status_code == 400


@pytest.mark.parametrize(("campo", "cuerpo"), [("role", {"id_role": "x"}), ("status", {"is_active": True})])
def test_should_return_404_for_a_user_that_does_not_exist(client, admin, campo, cuerpo):
    respuesta = client.patch(f"/admin/users/{uuid.uuid4()}/{campo}", json=cuerpo, headers=admin["h"])

    assert respuesta.status_code == 404


def test_should_return_404_for_a_role_that_does_not_exist(client, admin, persona):
    respuesta = client.patch(
        f"/admin/users/{persona}/role", json={"id_role": "no-existe"}, headers=admin["h"]
    )

    assert respuesta.status_code == 404
    assert "no-existe" in respuesta.json()["detail"]


NUEVO = {
    "first_name": "luis", "last_name": "gómez", "phone": "3209876543", "city": "Medellín",
    "address": "Calle 10 #20-30", "email": "luis@example.com", "password": "Segura123!",
}


def test_should_create_a_client_and_find_the_region_by_city(client, admin, db):
    # Arrange: el rol por defecto y la región existen
    db.add_all([
        Role(id_role=str(uuid.uuid4()), role_name="Cliente"),
        Region(id_region=str(uuid.uuid4()), region_name="Medellín", department="Antioquia"),
    ])
    db.commit()

    # Act
    respuesta = client.post("/admin/users", json=NUEVO, headers=admin["h"])

    # Assert
    assert respuesta.status_code == 201
    assert respuesta.json()["full_name"] == "Luis Gómez"
    assert respuesta.json()["role_name"] == "Cliente"
    assert respuesta.json()["region"] == "Medellín"


def test_should_create_a_user_with_the_given_role(client, admin, db):
    soporte = Role(id_role=str(uuid.uuid4()), role_name="Soporte")
    db.add(soporte)
    db.commit()

    respuesta = client.post("/admin/users", json={**NUEVO, "id_role": soporte.id_role}, headers=admin["h"])

    assert respuesta.json()["role_name"] == "Soporte"
    assert respuesta.json()["region"] is None


@pytest.mark.parametrize(("extra", "codigo"), [({"id_role": "no-existe"}, 404), ({}, 500)])
def test_should_fail_when_the_role_is_missing(client, admin, extra, codigo):
    # Sin rol "Cliente" sembrado y sin id_role válido no se puede crear
    respuesta = client.post("/admin/users", json={**NUEVO, **extra}, headers=admin["h"])

    assert respuesta.status_code == codigo


def test_should_return_409_when_the_email_already_exists(client, admin, db):
    correo_admin = db.get(User, admin["id"]).email

    respuesta = client.post("/admin/users", json={**NUEVO, "email": correo_admin}, headers=admin["h"])

    assert respuesta.status_code == 409


def test_should_soft_delete_a_user_but_not_the_admin_itself(client, admin, persona, db):
    borrado = client.delete(f"/admin/users/{persona}", headers=admin["h"])
    a_si_mismo = client.delete(f"/admin/users/{admin['id']}", headers=admin["h"])

    assert borrado.status_code == 204
    db.expire_all()
    assert db.get(User, persona).is_active is False
    assert client.delete(f"/admin/users/{persona}", headers=admin["h"]).status_code == 404
    assert a_si_mismo.status_code == 409
