"""El contrato que consume el frontend: exactamente los campos que usa la interfaz.

Autor: @Sebas-p-s · S4 (capa Front: el contrato con React)

Cada conjunto de campos sale de una interfaz de Frontend-SignBridge/src/api/client.ts.
Si el backend renombra o quita un campo, la pantalla se rompe en silencio
(muestra "undefined"); estos tests lo detectan antes.
"""
import pytest

# Frontend-SignBridge/src/api/client.ts
TOKEN_RESPONSE = {"access_token", "token_type", "user_id", "role", "full_name"}
USER_PROFILE = {"id_user", "full_name", "email", "role", "region", "phone", "city"}
USER_DASHBOARD_ROW = {"full_name", "email", "translations_made", "favorite_words",
                      "average_rating", "support_requests"}


def _login(client, email="ana@example.com", password="Password1!"):
    return client.post("/auth/login", json={"email": email, "password": password})


def _sesion(client):
    return {"Authorization": f"Bearer {_login(client).json()['access_token']}"}


def test_login_should_return_exactly_what_AuthContext_saves(client, seed_data):
    res = _login(client)

    assert res.status_code == 200
    assert res.headers["content-type"] == "application/json"
    assert set(res.json()) == TOKEN_RESPONSE
    assert res.json()["token_type"] == "bearer"
    assert res.json()["role"] == "Cliente"


def test_me_should_return_the_fields_of_UserProfile(client, seed_data):
    res = client.get("/auth/me", headers=_sesion(client))

    assert set(res.json()) == USER_PROFILE
    assert res.json()["full_name"] == "Ana Torres"


@pytest.mark.parametrize(("email", "password"), [
    ("ana@example.com", "Equivocada1!"),    # contraseña mala
    ("nadie@example.com", "Password1!"),    # correo que no existe
])
def test_failed_login_should_show_the_same_message_in_the_modal(client, seed_data, email, password):
    # El modal muestra error.response.data.detail. El mismo mensaje en los dos casos
    # evita que alguien averigüe qué correos están registrados.
    res = _login(client, email, password)

    assert res.status_code == 401
    assert res.json() == {"detail": "Credenciales incorrectas"}


def test_home_should_receive_numbers_for_the_activity_summary(client, seed_data):
    res = client.get("/dashboard/user", headers=_sesion(client))

    cuerpo = res.json()
    assert set(cuerpo) == USER_DASHBOARD_ROW
    # Home hace average_rating.toFixed(1): si llega null o texto, la página se cae.
    assert isinstance(cuerpo["average_rating"], (int, float))
    assert isinstance(cuerpo["translations_made"], int)


def test_register_should_receive_the_cities_with_region_name(client, seed_data):
    # 🔎 Hallazgo: el frontend pedía GET /auth/cities, que no existe (404),
    # y el registro siempre usaba la lista de ciudades escrita a mano.
    # Corregido en client.ts: ahora pide GET /regions.
    assert client.get("/auth/cities").status_code == 404

    res = client.get("/regions")

    assert res.status_code == 200
    assert {"region_name"} <= set(res.json()[0])
    assert res.json()[0]["region_name"] == "Bogotá"


def test_a_422_should_bring_loc_and_msg_as_Register_expects(client, seed_data):
    # Register.tsx muestra `${detail[0].loc.at(-1)}: ${detail[0].msg}`
    res = client.post("/auth/register", json={"first_name": "Ana", "last_name": "Paz", "phone": "123",
                                               "city": "Cali", "address": "Cra 1",
                                               "email": "luis@example.com", "password": "Password1!"})

    assert res.status_code == 422
    primero = res.json()["detail"][0]
    assert primero["loc"][-1] == "phone"
    assert isinstance(primero["msg"], str)
