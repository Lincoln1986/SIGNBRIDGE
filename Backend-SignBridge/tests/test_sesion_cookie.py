"""Sesión en cookie HttpOnly (OWASP A02 / A07).

El login deja el token en una cookie que el JavaScript de la página no puede
leer. La API lo acepta desde la cookie (aplicación web) o desde la cabecera
Authorization (Postman, Newman, pruebas).
"""
from datetime import timedelta

from fastapi.testclient import TestClient

from app.core.security import COOKIE_SESION, create_access_token
from app.main import app

CORREO = "ana@example.com"
CLAVE = "Password1!"


def _login(client):
    return client.post("/auth/login", json={"email": CORREO, "password": CLAVE})


def test_login_deja_la_sesion_en_una_cookie_httponly(client, seed_data):
    res = _login(client)

    cookie = res.headers["set-cookie"]
    assert cookie.startswith(f"{COOKIE_SESION}=")
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie
    assert "Max-Age=3600" in cookie
    assert "Path=/" in cookie


def test_la_cookie_no_es_secure_en_local(client, seed_data):
    """En local no hay HTTPS: con Secure el navegador no la guardaría."""
    assert "Secure" not in _login(client).headers["set-cookie"]


def test_con_la_cookie_se_entra_sin_cabecera(client, seed_data):
    _login(client)  # TestClient guarda la cookie como un navegador

    res = client.get("/auth/me")

    assert res.status_code == 200
    assert res.json()["email"] == CORREO


def test_la_cabecera_authorization_sigue_funcionando(seed_data):
    """Postman y Newman mandan el token en la cabecera, sin cookie."""
    token = create_access_token({"sub": seed_data["user"].id_user})
    res = TestClient(app).get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 200


def test_la_cabecera_gana_si_vienen_las_dos(client, seed_data, make_token):
    _login(client)  # cookie de Ana
    otro = make_token("Administrador")

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {otro}"})

    assert res.json()["email"] != CORREO


def test_sin_cookie_ni_cabecera_da_401(seed_data):
    res = TestClient(app).get("/auth/me")

    assert res.status_code == 401
    assert res.json()["detail"] == "No autenticado"


def test_una_cookie_falsa_da_401(seed_data):
    cliente = TestClient(app, cookies={COOKIE_SESION: "esto-no-es-un-jwt"})

    assert cliente.get("/auth/me").status_code == 401


def test_una_cookie_vencida_da_401(seed_data):
    vencido = create_access_token({"sub": seed_data["user"].id_user}, timedelta(minutes=-1))
    cliente = TestClient(app, cookies={COOKIE_SESION: vencido})

    assert cliente.get("/auth/me").status_code == 401


def test_logout_borra_la_cookie(client, seed_data):
    _login(client)

    res = client.post("/auth/logout")

    assert res.status_code == 200
    assert f'{COOKIE_SESION}=""' in res.headers["set-cookie"]
    assert "Max-Age=0" in res.headers["set-cookie"]
    assert client.get("/auth/me").status_code == 401


def test_logout_sin_sesion_tambien_responde_200(seed_data):
    assert TestClient(app).post("/auth/logout").status_code == 200


def test_login_fallido_no_deja_cookie(client, seed_data):
    res = client.post("/auth/login", json={"email": CORREO, "password": "Equivocada1!"})

    assert res.status_code == 401
    assert "set-cookie" not in res.headers


def test_el_login_sigue_devolviendo_el_token_en_el_cuerpo(client, seed_data):
    """Lo usan Postman y Newman; la aplicación web ya no lo guarda."""
    assert _login(client).json()["access_token"]


def test_la_cookie_se_vuelve_secure_con_https(client, seed_data, monkeypatch):
    from app.core import security
    monkeypatch.setattr(security.settings, "COOKIE_SECURE", True)

    assert "Secure" in _login(client).headers["set-cookie"]
