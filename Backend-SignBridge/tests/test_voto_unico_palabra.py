"""Voto único por usuario y palabra (issue #45).

Antes, cada clic en las estrellas de una palabra creaba una valoración nueva y
el promedio subía o bajaba sin límite. Ahora el segundo voto actualiza el
primero, y la base tiene un índice único que lo garantiza.
"""
import uuid

import jwt
import pytest
from sqlalchemy.exc import IntegrityError

from app.models.user import Feedback, LexicalUnit


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _id(token: str) -> str:
    return jwt.decode(token, options={"verify_signature": False})["sub"]


@pytest.fixture()
def palabra(db):
    lu = LexicalUnit(id_lexicalunit=str(uuid.uuid4()), text="Agua")
    db.add(lu)
    db.commit()
    return lu.id_lexicalunit


def _votar(client, headers, palabra, rating):
    return client.post("/feedback", json={"id_lexicalunit": palabra, "rating": rating}, headers=headers)


def test_should_update_my_vote_instead_of_adding_another(client, make_token, palabra, db):
    # Arrange
    h = _auth(make_token("Cliente"))

    # Act: el mismo usuario vota 3 veces la misma palabra
    primero = _votar(client, h, palabra, 1)
    _votar(client, h, palabra, 1)
    ultimo = _votar(client, h, palabra, 5)

    # Assert: queda un solo voto, con la última calificación
    assert ultimo.json()["id_feedback"] == primero.json()["id_feedback"]
    activos = db.query(Feedback).filter(
        Feedback.id_lexicalunit == palabra, Feedback.deleted_at.is_(None)
    ).all()
    assert len(activos) == 1
    assert activos[0].rating == 5


def test_should_not_inflate_the_average_with_repeated_clicks(client, make_token, palabra):
    # Arrange: yo hago 5 clics en 1 estrella; otra persona pone 5
    mio = _auth(make_token("Cliente"))
    for _ in range(5):
        _votar(client, mio, palabra, 1)
    _votar(client, _auth(make_token("Cliente")), palabra, 5)

    # Act
    resumen = client.get(f"/feedback/word/{palabra}/summary", headers=mio).json()

    # Assert: cuentan 2 votos, no 6
    assert resumen["total_ratings"] == 2
    assert resumen["average_rating"] == 3.0


def test_should_reject_a_second_active_vote_in_the_database(make_token, palabra, db):
    # Arrange: un voto activo ya guardado
    usuario = _id(make_token("Cliente"))
    db.add(Feedback(id_feedback=str(uuid.uuid4()), id_user=usuario, id_lexicalunit=palabra, rating=4))
    db.commit()

    # Act + Assert: la base rechaza otro voto activo del mismo usuario
    db.add(Feedback(id_feedback=str(uuid.uuid4()), id_user=usuario, id_lexicalunit=palabra, rating=2))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_should_allow_a_new_vote_after_support_deletes_mine(client, make_token, palabra):
    # Arrange: mi voto existe y Soporte lo elimina (borrado lógico)
    h = _auth(make_token("Cliente"))
    viejo = _votar(client, h, palabra, 2).json()["id_feedback"]
    borrado = client.delete(f"/feedback/{viejo}", headers=_auth(make_token("Soporte")))

    # Act: vuelvo a votar
    nuevo = _votar(client, h, palabra, 4)

    # Assert: el voto borrado no bloquea uno nuevo (el índice es parcial)
    assert borrado.status_code == 204
    assert nuevo.status_code == 201
    assert nuevo.json()["id_feedback"] != viejo
