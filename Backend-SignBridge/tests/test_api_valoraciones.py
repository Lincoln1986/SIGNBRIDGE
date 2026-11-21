"""Valoraciones: crear, promedios y revisión de Soporte (S7, backend al 80 %).

Autor: @Lincoln1986 · S7 (API)

Pruebas de API de `routers/feedback.py` y de las reglas de `schemas/feedback.py`
con TestClient y la BD SQLite de la suite.
"""
import uuid

import jwt
import pytest

from app.models.user import Feedback, LexicalUnit, TranslationSession


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _id(token: str) -> str:
    return jwt.decode(token, options={"verify_signature": False})["sub"]


@pytest.fixture()
def cliente(make_token, db):
    """Cliente con una sesión de traducción propia y una palabra del diccionario."""
    token = make_token("Cliente")
    sesion = TranslationSession(
        id_session=str(uuid.uuid4()), id_user=_id(token), translation_type="texto", status="active",
    )
    palabra = LexicalUnit(id_lexicalunit=str(uuid.uuid4()), text="Gracias")
    db.add_all([sesion, palabra])
    db.commit()
    return {"h": _auth(token), "sesion": sesion.id_session, "palabra": palabra.id_lexicalunit}


@pytest.fixture()
def soporte(make_token):
    return _auth(make_token("Soporte"))


def _valorar(client, cliente, **cuerpo):
    return client.post("/feedback", json={"id_lexicalunit": cliente["palabra"], **cuerpo}, headers=cliente["h"])


# ─── Crear ──────────────────────────────────────────────────────────────────

def test_should_rate_my_session_once_and_trim_the_comment(client, cliente):
    # Act
    primera = client.post(
        "/feedback", json={"id_session": cliente["sesion"], "rating": 4, "comment": "  Muy clara  "},
        headers=cliente["h"],
    )
    segunda = client.post("/feedback", json={"id_session": cliente["sesion"], "rating": 2}, headers=cliente["h"])

    # Assert
    assert primera.status_code == 201
    assert primera.json()["comment"] == "Muy clara"
    assert segunda.status_code == 409


def test_should_not_rate_a_session_of_another_user(client, cliente, make_token):
    otro = _auth(make_token("Cliente"))

    respuesta = client.post("/feedback", json={"id_session": cliente["sesion"], "rating": 5}, headers=otro)

    assert respuesta.status_code == 404


def test_should_return_404_for_a_word_that_does_not_exist(client, cliente):
    respuesta = client.post("/feedback", json={"id_lexicalunit": "no-existe", "rating": 5}, headers=cliente["h"])

    assert respuesta.status_code == 404


@pytest.mark.parametrize(("cuerpo", "mensaje"), [
    ({"rating": 0}, "entre 1 y 5"),
    ({"rating": 6}, "entre 1 y 5"),
    ({"rating": 3, "comment": "a" * 1001}, "1000 caracteres"),
])
def test_should_validate_the_rating_and_the_comment(client, cliente, cuerpo, mensaje):
    respuesta = _valorar(client, cliente, **cuerpo)

    assert respuesta.status_code == 422
    assert mensaje in str(respuesta.json()["detail"])


def test_should_require_a_session_or_a_word(client, cliente):
    respuesta = client.post("/feedback", json={"rating": 3}, headers=cliente["h"])

    assert respuesta.status_code == 422
    assert "id_session o id_lexicalunit" in str(respuesta.json()["detail"])


# ─── Consultas ──────────────────────────────────────────────────────────────

def test_should_list_my_ratings_and_average_a_word(client, cliente, make_token):
    # Arrange: yo pongo 5 y otra persona 2 a la misma palabra
    _valorar(client, cliente, rating=5)
    otro = {**cliente, "h": _auth(make_token("Cliente"))}
    _valorar(client, otro, rating=2)

    # Act
    mias = client.get("/feedback/my", headers=cliente["h"]).json()
    resumen = client.get(f"/feedback/word/{cliente['palabra']}/summary", headers=cliente["h"]).json()

    # Assert
    assert [f["rating"] for f in mias] == [5]
    assert resumen == {"id_lexicalunit": cliente["palabra"], "word": "Gracias",
                       "average_rating": 3.5, "total_ratings": 2}


def test_should_return_zero_for_a_word_without_ratings(client, cliente):
    resumen = client.get(f"/feedback/word/{cliente['palabra']}/summary", headers=cliente["h"])

    assert resumen.json()["average_rating"] == 0.0
    assert client.get("/feedback/word/no-existe/summary", headers=cliente["h"]).status_code == 404


def test_should_show_support_every_rating_with_its_author(client, cliente, soporte):
    _valorar(client, cliente, rating=4)

    todas = client.get("/feedback/all", headers=soporte).json()
    respuestas = client.get("/feedback/quick-replies", headers=soporte).json()

    assert todas[0]["user_full_name"] == "Test User"
    assert {r["key"] for r in respuestas} == {"gracias", "sigue_asi", "compartido"}


# ─── Revisión de Soporte ────────────────────────────────────────────────────

def test_should_answer_a_high_rating_with_a_quick_reply(client, cliente, soporte):
    id_fb = _valorar(client, cliente, rating=5).json()["id_feedback"]

    revisada = client.patch(
        f"/feedback/{id_fb}/review", json={"is_reviewed": True, "quick_reply": "gracias"}, headers=soporte,
    )

    assert revisada.json()["is_reviewed"] is True
    assert revisada.json()["support_response"].startswith("¡Gracias por tu calificación!")


@pytest.mark.parametrize(("rating", "rapida", "codigo"), [(3, "gracias", 403), (5, "no-existe", 400)])
def test_should_reject_quick_replies_on_low_ratings_or_unknown_keys(client, cliente, soporte, rating, rapida, codigo):
    id_fb = _valorar(client, cliente, rating=rating).json()["id_feedback"]

    respuesta = client.patch(
        f"/feedback/{id_fb}/review", json={"is_reviewed": True, "quick_reply": rapida}, headers=soporte,
    )

    assert respuesta.status_code == codigo


def test_should_require_an_answer_and_allow_unmarking(client, cliente, soporte):
    # Arrange
    id_fb = _valorar(client, cliente, rating=1).json()["id_feedback"]
    url = f"/feedback/{id_fb}/review"

    # Act
    sin_respuesta = client.patch(url, json={"is_reviewed": True, "response": "   "}, headers=soporte)
    manual = client.patch(url, json={"is_reviewed": True, "response": " Revisaremos la seña "}, headers=soporte)
    desmarcada = client.patch(url, json={"is_reviewed": False}, headers=soporte)

    # Assert
    assert sin_respuesta.status_code == 400
    assert manual.json()["support_response"] == "Revisaremos la seña"
    assert desmarcada.json()["is_reviewed"] is False


def test_should_not_let_an_admin_review_a_rating(client, cliente, make_token):
    id_fb = _valorar(client, cliente, rating=5).json()["id_feedback"]

    respuesta = client.patch(
        f"/feedback/{id_fb}/review", json={"is_reviewed": True, "response": "Ok"},
        headers=_auth(make_token("Administrador")),
    )

    assert respuesta.status_code == 403


def test_should_hide_a_deleted_rating_from_the_average(client, cliente, soporte, db):
    # Arrange
    id_fb = _valorar(client, cliente, rating=1).json()["id_feedback"]

    # Act
    borrada = client.delete(f"/feedback/{id_fb}", headers=soporte)

    # Assert: no cuenta en el promedio pero sigue en la BD
    assert borrada.status_code == 204
    resumen = client.get(f"/feedback/word/{cliente['palabra']}/summary", headers=cliente["h"]).json()
    assert resumen["total_ratings"] == 0
    assert db.get(Feedback, id_fb) is not None
    assert client.delete(f"/feedback/{id_fb}", headers=soporte).status_code == 404
    assert client.patch(f"/feedback/{id_fb}/review", json={"is_reviewed": False}, headers=soporte).status_code == 404
