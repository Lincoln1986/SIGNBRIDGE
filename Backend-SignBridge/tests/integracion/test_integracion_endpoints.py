"""Endpoints completos contra PostgreSQL real (S5).

Autor: @juan-soto350 · S5 (capa BD)

La suite unitaria usa SQLite, que NO revisa llaves foráneas y compara texto
distinto. Estos tests prueban el flujo completo (HTTP → router → Postgres) y
las reglas que solo la base real hace cumplir.
"""
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models.user import LexicalUnit, Support, TranslationDetail, User

REGISTRO = {
    "first_name": "laura",
    "last_name": "rojas",
    "phone": "3101234567",
    "city": "Bogotá",
    "address": "Calle 145 #91-19",
    "email": "Laura.Rojas@Example.com",
    "password": "Segura123!",
}


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def palabra(db):
    unidad = LexicalUnit(
        id_lexicalunit=str(uuid.uuid4()),
        text="Gracias",
        video_url="https://www.youtube.com/watch?v=gracias",
    )
    db.add(unidad)
    db.commit()
    return unidad


# ─── Registro → login → perfil, todo en Postgres ────────────────────────────

def test_should_register_login_and_read_the_profile(client, db):
    # Act
    registro = client.post("/auth/register", json=REGISTRO)
    login = client.post(
        "/auth/login", json={"email": "laura.rojas@example.com", "password": "Segura123!"}
    )
    perfil = client.get("/auth/me", headers=_auth(login.json()["access_token"]))

    # Assert
    assert registro.status_code == 201
    assert login.status_code == 200
    assert login.json()["role"] == "Cliente"  # rol sembrado por la migración
    assert perfil.json()["full_name"] == "Laura Rojas"  # el schema capitaliza
    accesos = db.execute(
        text('SELECT access_type FROM "AccessLog" WHERE id_user = :u ORDER BY access_type'),
        {"u": registro.json()["user_id"]},
    ).scalars().all()
    assert accesos == ["login", "login"]


def test_should_return_409_for_the_same_email_with_other_capital_letters(client):
    client.post("/auth/register", json=REGISTRO)

    repetido = client.post(
        "/auth/register", json={**REGISTRO, "email": "LAURA.ROJAS@EXAMPLE.COM"}
    )

    assert repetido.status_code == 409


def test_should_log_a_failed_attempt_when_the_password_is_wrong(client, db):
    client.post("/auth/register", json=REGISTRO)

    respuesta = client.post(
        "/auth/login", json={"email": REGISTRO["email"], "password": "Incorrecta1!"}
    )

    assert respuesta.status_code == 401
    assert db.execute(
        text('SELECT COUNT(*) FROM "AccessLog" WHERE access_type = \'failed_attempt\'')
    ).scalar() == 1


# ─── Reglas que solo hace cumplir la base real ──────────────────────────────

def test_should_reject_a_ticket_for_a_user_that_does_not_exist(db):
    # Arrange: SQLite aceptaría esta fila; Postgres revisa la llave foránea
    db.add(Support(
        id_support=str(uuid.uuid4()), id_user=str(uuid.uuid4()),
        subject="Huérfano", message="Sin dueño", status="pending",
    ))

    # Act / Assert
    with pytest.raises(IntegrityError, match="foreign key"):
        db.commit()
    db.rollback()


def test_should_reject_a_duplicated_email_at_database_level(db, crear_usuario):
    usuario, _ = crear_usuario()
    db.add(User(
        id_user=str(uuid.uuid4()), id_role=usuario.id_role,
        first_name="Copia", last_name="Copia", phone="3000000000",
        email=usuario.email, password_hash="x",
    ))

    with pytest.raises(IntegrityError, match="unique"):
        db.commit()
    db.rollback()


# ─── Favoritos y valoraciones guardados en Postgres ─────────────────────────

def test_should_add_list_and_remove_a_favorite(client, crear_usuario, palabra):
    _, token = crear_usuario()
    url = f"/favorites/{palabra.id_lexicalunit}"

    agregada = client.post(url, headers=_auth(token))
    mis_favoritas = client.get("/favorites/my", headers=_auth(token))
    quitada = client.post(url, headers=_auth(token))

    assert agregada.json()["action"] == "added"
    assert [f["id_lexicalunit"] for f in mis_favoritas.json()] == [palabra.id_lexicalunit]
    assert quitada.json()["action"] == "removed"
    assert client.get("/favorites/my", headers=_auth(token)).json() == []


def test_should_return_404_when_marking_a_word_that_does_not_exist(client, crear_usuario):
    _, token = crear_usuario()

    assert client.post(f"/favorites/{uuid.uuid4()}", headers=_auth(token)).status_code == 404


def test_should_average_the_ratings_of_a_word(client, crear_usuario, palabra):
    # Arrange: dos personas califican la misma palabra
    for estrellas in (5, 2):
        _, token = crear_usuario()
        creada = client.post(
            "/feedback",
            json={"id_lexicalunit": palabra.id_lexicalunit, "rating": estrellas},
            headers=_auth(token),
        )
        assert creada.status_code == 201

    # Act
    resumen = client.get(
        f"/feedback/word/{palabra.id_lexicalunit}/summary", headers=_auth(token)
    ).json()

    # Assert
    assert resumen == {
        "id_lexicalunit": palabra.id_lexicalunit,
        "word": "Gracias",
        "average_rating": 3.5,
        "total_ratings": 2,
    }


def test_should_rate_a_translation_session_only_once(client, crear_usuario, palabra):
    _, token = crear_usuario()
    traduccion = client.post(
        "/api/traduccion/texto", json={"texto": "gracias"}, headers=_auth(token)
    ).json()
    cuerpo = {"id_session": traduccion["id_session"], "rating": 4}

    primera = client.post("/feedback", json=cuerpo, headers=_auth(token))
    segunda = client.post("/feedback", json=cuerpo, headers=_auth(token))

    assert primera.status_code == 201
    assert segunda.status_code == 409


def test_should_save_the_translation_detail_in_postgres(client, db, crear_usuario, palabra):
    _, token = crear_usuario()

    respuesta = client.post(
        "/api/traduccion/texto", json={"texto": "gracias gracias"}, headers=_auth(token)
    )

    detalles = db.query(TranslationDetail).filter_by(
        id_session=respuesta.json()["id_session"]
    ).order_by(TranslationDetail.order).all()
    assert [d.order for d in detalles] == [1, 2]
    assert {d.id_lexicalunit for d in detalles} == {palabra.id_lexicalunit}
