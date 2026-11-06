"""Flujo completo de autenticación: registro, login y perfil."""
import uuid


def _payload(**overrides):
    payload = {
        "first_name": "ana",
        "last_name": "torres",
        "phone": "3001234567",
        "city": "Bogotá",
        "address": "Calle 1 #2-3",
        "email": "nuevo@example.com",
        "password": "Password1!",
    }
    payload.update(overrides)
    return payload


def test_registro_exitoso(client, seed_data):
    res = client.post("/auth/register", json=_payload())
    assert res.status_code == 201
    body = res.json()
    assert body["message"] == "Usuario registrado exitosamente"
    assert body["user_id"]


def test_registro_email_duplicado(client, seed_data):
    client.post("/auth/register", json=_payload())
    res = client.post("/auth/register", json=_payload())
    assert res.status_code == 400
    assert "registrado" in res.json()["detail"]


def test_registro_sin_rol_por_defecto(client, db, seed_data):
    """Sin rol Cliente/usuario en la BD el registro falla con 500 controlado."""
    from app.models.user import Role
    db.query(Role).filter(Role.role_name == "Cliente").delete()
    db.commit()
    res = client.post("/auth/register", json=_payload())
    assert res.status_code == 500
    assert "Rol por defecto" in res.json()["detail"]


def test_login_exitoso_devuelve_token(client, seed_data):
    client.post("/auth/register", json=_payload())
    res = client.post("/auth/login", json={
        "email": "nuevo@example.com", "password": "Password1!"
    })
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["role"] == "Cliente"
    assert body["full_name"] == "Ana Torres"


def test_login_password_incorrecta(client, seed_data):
    client.post("/auth/register", json=_payload())
    res = client.post("/auth/login", json={
        "email": "nuevo@example.com", "password": "Password2!"
    })
    assert res.status_code == 401
    assert res.json()["detail"] == "Credenciales incorrectas"


def test_login_usuario_inexistente(client, seed_data):
    res = client.post("/auth/login", json={
        "email": "nadie@example.com", "password": "Password1!"
    })
    assert res.status_code == 401


def test_login_cuenta_desactivada(client, seed_data):
    client.post("/auth/register", json=_payload())
    from app.models.user import User
    from tests.conftest import TestingSessionLocal
    db = TestingSessionLocal()
    user = db.query(User).filter(User.email == "nuevo@example.com").first()
    user.is_active = False
    db.commit()
    db.close()

    res = client.post("/auth/login", json={
        "email": "nuevo@example.com", "password": "Password1!"
    })
    assert res.status_code == 403
    assert "desactivada" in res.json()["detail"]


def test_auth_me_con_token(client, seed_data):
    client.post("/auth/register", json=_payload())
    login = client.post("/auth/login", json={
        "email": "nuevo@example.com", "password": "Password1!"
    })
    token = login.json()["access_token"]

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    body = res.json()
    assert body["email"] == "nuevo@example.com"
    assert body["role"] == "Cliente"


def test_auth_me_sin_token(client, seed_data):
    res = client.get("/auth/me")
    assert res.status_code in (401, 403)


def test_forgot_password_responde_sea_cual_sea_el_email(client, seed_data):
    res = client.post("/auth/forgot-password", json={"email": "ana@example.com"})
    assert res.status_code == 200
    assert "recibirás un enlace" in res.json()["message"]

    res2 = client.post("/auth/forgot-password", json={"email": "nadie@example.com"})
    assert res2.status_code == 200
    # misma respuesta: no revela si el correo existe
    assert res2.json() == res.json()


def test_reset_password_flujo_completo(client, seed_data):
    from app.core.security import create_reset_token

    token = create_reset_token("ana@example.com")
    res = client.post("/auth/reset-password", json={
        "token": token, "new_password": "NuevaClave1!"
    })
    assert res.status_code == 200
    assert res.json()["redirect"] == "/login"

    # la contraseña anterior deja de servir y la nueva funciona
    res_vieja = client.post("/auth/login", json={
        "email": "ana@example.com", "password": "Password1!"
    })
    assert res_vieja.status_code == 401
    res_nueva = client.post("/auth/login", json={
        "email": "ana@example.com", "password": "NuevaClave1!"
    })
    assert res_nueva.status_code == 200


def test_reset_password_token_de_tipo_login_rechazado(client, seed_data):
    from app.core.security import create_access_token

    token = create_access_token({"sub": "ana@example.com"})
    res = client.post("/auth/reset-password", json={
        "token": token, "new_password": "NuevaClave1!"
    })
    assert res.status_code == 400
    assert res.json()["detail"] == "Token inválido"
