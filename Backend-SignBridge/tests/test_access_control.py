"""Control de acceso: 401 sin credenciales y 403 con rol insuficiente.

Cubre la exigencia del plan de QA de verificar autorización en los
endpoints protegidos.
"""
import uuid

import pytest
from jose import jwt

from app.core.config import get_settings
from app.core.security import create_access_token, hash_password
from tests.conftest import TestingSessionLocal
from app.models.user import Role, User

ADMIN_ENDPOINTS = [
    ("GET", "/admin/dashboard"),
    ("GET", "/admin/stats"),
    ("GET", "/admin/users"),
    ("GET", "/dashboard/admin"),
    ("GET", "/dashboard/stats"),
]

SUPPORT_ENDPOINTS = [
    ("GET", "/feedback/all"),
]

USER_ENDPOINTS = [
    ("GET", "/favorites/my"),
    ("GET", "/notifications"),
    ("GET", "/messages/inbox"),
]


@pytest.mark.parametrize("method,path", ADMIN_ENDPOINTS + USER_ENDPOINTS)
def test_endpoint_protegido_sin_token(client, seed_data, method, path):
    res = client.request(method, path)
    assert res.status_code in (401, 403), f"{path} respondió {res.status_code}"


@pytest.mark.parametrize("method,path", ADMIN_ENDPOINTS + USER_ENDPOINTS)
def test_endpoint_protegido_token_basura(client, seed_data, method, path):
    res = client.request(
        method, path, headers={"Authorization": "Bearer token-invalido"}
    )
    assert res.status_code == 401


def _make_token(role_name: str) -> str:
    """Crea un usuario con el rol dado y devuelve su token."""
    db = TestingSessionLocal()
    role = db.query(Role).filter(Role.role_name == role_name).first()
    if role is None:
        role = Role(id_role=str(uuid.uuid4()), role_name=role_name)
        db.add(role)
        db.flush()
    user = User(
        id_user=str(uuid.uuid4()),
        id_role=role.id_role,
        first_name="Test",
        last_name="User",
        phone="3001234567",
        email=f"{role_name.lower()}-{uuid.uuid4().hex[:6]}@example.com",
        password_hash=hash_password("Password1!"),
        is_active=True,
    )
    user_id = user.id_user
    db.add(user)
    db.commit()
    db.close()
    return create_access_token({"sub": user_id})


@pytest.mark.parametrize("method,path", ADMIN_ENDPOINTS)
def test_endpoint_admin_con_rol_cliente(client, seed_data, method, path):
    token = _make_token("Cliente")
    res = client.request(
        method, path, headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 403


@pytest.mark.parametrize("method,path", SUPPORT_ENDPOINTS)
def test_endpoint_soporte_con_rol_cliente(client, seed_data, method, path):
    token = _make_token("Cliente")
    res = client.request(
        method, path, headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 403


def test_token_de_usuario_inexistente(client, seed_data):
    token = create_access_token({"sub": str(uuid.uuid4())})
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401


def test_cuenta_desactivada_no_puede_usar_api(client, seed_data):
    token = _make_token("Cliente")
    db = TestingSessionLocal()
    payload = jwt.decode(
        token, get_settings().SECRET_KEY, algorithms=[get_settings().ALGORITHM]
    )
    user = db.query(User).filter(User.id_user == payload["sub"]).first()
    user.is_active = False
    db.commit()
    db.close()

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
    assert "desactivada" in res.json()["detail"]
