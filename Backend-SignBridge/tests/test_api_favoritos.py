"""Favoritos del usuario (S7, backend al 80 %).

Autor: @javierperez14 · S7 (API)

Pruebas de API con TestClient y la BD SQLite de la suite.
"""
import uuid

import jwt
import pytest

from app.models.user import FavoriteWords, LexicalUnit


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _id(token: str) -> str:
    return jwt.decode(token, options={"verify_signature": False})["sub"]


@pytest.fixture()
def palabras(db):
    unidades = [
        LexicalUnit(id_lexicalunit=str(uuid.uuid4()), text="Hola", video_url="https://youtu.be/hola"),
        LexicalUnit(id_lexicalunit=str(uuid.uuid4()), text="Gracias"),
    ]
    db.add_all(unidades)
    db.commit()
    return [u.id_lexicalunit for u in unidades]


# ─── /favorites ─────────────────────────────────────────────────────────────

def test_should_add_and_remove_a_favorite_with_the_same_button(client, make_token, palabras):
    # Arrange
    h = _auth(make_token("Cliente"))

    # Act
    agregada = client.post(f"/favorites/{palabras[0]}", headers=h)
    quitada = client.post(f"/favorites/{palabras[0]}", headers=h)

    # Assert
    assert agregada.json()["action"] == "added"
    assert agregada.json()["id_favorite"]
    assert quitada.json() == {"action": "removed", "id_lexicalunit": palabras[0], "id_favorite": None}
    assert client.get("/favorites/my", headers=h).json() == []


def test_should_return_404_for_a_word_that_does_not_exist(client, make_token):
    respuesta = client.post(f"/favorites/{uuid.uuid4()}", headers=_auth(make_token("Cliente")))

    assert respuesta.status_code == 404


def test_should_list_my_favorites_most_used_first(client, make_token, palabras):
    # Arrange: "Gracias" se usa 2 veces y "Hola" ninguna
    h = _auth(make_token("Cliente"))
    for id_palabra in palabras:
        client.post(f"/favorites/{id_palabra}", headers=h)

    # Act
    client.post(f"/favorites/{palabras[1]}/use", headers=h)
    uso = client.post(f"/favorites/{palabras[1]}/use", headers=h)
    lista = client.get("/favorites/my", headers=h).json()

    # Assert
    assert uso.json() == {"id_lexicalunit": palabras[1], "times_used": 2}
    assert [f["word_text"] for f in lista] == ["Gracias", "Hola"]
    assert lista[1]["video_url"] == "https://youtu.be/hola"


def test_should_not_count_usage_of_a_word_that_is_not_a_favorite(client, make_token, palabras):
    respuesta = client.post(f"/favorites/{palabras[0]}/use", headers=_auth(make_token("Cliente")))

    assert respuesta.status_code == 404
    assert respuesta.json()["detail"] == "Esta palabra no está en tus favoritos"


def test_should_reset_the_counter_and_reject_a_negative_one(client, make_token, palabras):
    h = _auth(make_token("Cliente"))
    id_favorito = client.post(f"/favorites/{palabras[0]}", headers=h).json()["id_favorite"]
    client.post(f"/favorites/{palabras[0]}/use", headers=h)

    reiniciado = client.put(f"/favorites/{id_favorito}", json={"times_used": 0}, headers=h)
    negativo = client.put(f"/favorites/{id_favorito}", json={"times_used": -1}, headers=h)

    assert reiniciado.json()["times_used"] == 0
    assert negativo.status_code == 422


def test_should_delete_a_favorite_by_its_id(client, make_token, palabras):
    h = _auth(make_token("Cliente"))
    id_favorito = client.post(f"/favorites/{palabras[0]}", headers=h).json()["id_favorite"]

    borrado = client.delete(f"/favorites/{id_favorito}", headers=h)

    assert borrado.status_code == 204
    assert client.delete(f"/favorites/{id_favorito}", headers=h).status_code == 404
    assert client.put(f"/favorites/{id_favorito}", json={}, headers=h).status_code == 404


def test_should_not_let_another_user_touch_my_favorite(client, make_token, palabras, db):
    # Arrange: el favorito es de otra persona
    id_favorito = client.post(
        f"/favorites/{palabras[0]}", headers=_auth(make_token("Cliente"))
    ).json()["id_favorite"]
    otro = _auth(make_token("Cliente"))

    # Act / Assert
    assert client.put(f"/favorites/{id_favorito}", json={"times_used": 9}, headers=otro).status_code == 404
    assert client.delete(f"/favorites/{id_favorito}", headers=otro).status_code == 404
    assert db.get(FavoriteWords, id_favorito).deleted_at is None
