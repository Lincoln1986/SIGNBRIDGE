"""Dashboards sobre SQLite: verifica las vistas `vw_*` de Alembic.

La migración `0a9ba8b6906c` crea las vistas con SQL portable; aquí se
comprueba que, con el mismo DDL ejecutado en SQLite (el motor de la suite),
los endpoints de dashboard devuelven los datos esperados sin PostgreSQL.
"""
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import text

from app.core.security import create_access_token, hash_password
from app.models.user import (
    Feedback,
    Region,
    Role,
    Support,
    TranslationSession,
    User,
)
from tests.conftest import TestingSessionLocal


@pytest.fixture()
def dashboard_data(db):
    """Región, roles, un admin, un cliente con sesión/feedback/ticket."""
    region = Region(
        id_region=str(uuid.uuid4()), region_name="Bogotá", department="Cundinamarca"
    )
    role_admin = Role(id_role=str(uuid.uuid4()), role_name="Administrador")
    role_cliente = Role(id_role=str(uuid.uuid4()), role_name="Cliente")

    def _user(role_id, first, middle, last, second_last, email):
        return User(
            id_user=str(uuid.uuid4()),
            id_role=role_id,
            id_region=region.id_region,
            first_name=first,
            middle_name=middle,
            last_name=last,
            second_last_name=second_last,
            phone="3001234567",
            city="Bogotá",
            email=email,
            password_hash=hash_password("Password1!"),
            is_active=True,
        )

    admin = _user(role_admin.id_role, "María", None, "Admin", None, "admin@example.com")
    cliente = _user(
        role_cliente.id_role, "Ana", "Lucía", "Torres", "Pérez", "ana@example.com"
    )

    sesion = TranslationSession(
        id_session=str(uuid.uuid4()),
        id_user=cliente.id_user,
        status="done",
        translation_type="text_to_lsc",
    )
    feedback = Feedback(
        id_feedback=str(uuid.uuid4()),
        id_user=cliente.id_user,
        id_session=sesion.id_session,
        rating=4,
        comment="Buena traducción",
    )
    ticket = Support(
        id_support=str(uuid.uuid4()),
        id_user=cliente.id_user,
        subject="Video no carga",
        message="El reproductor se queda en negro",
        status="pending",
    )

    db.add_all([region, role_admin, role_cliente, admin, cliente, sesion, feedback, ticket])
    db.commit()

    return {
        "region": region,
        "admin": admin,
        "cliente": cliente,
        "admin_token": create_access_token({"sub": admin.id_user}),
        "cliente_token": create_access_token({"sub": cliente.id_user}),
    }


def test_las_vistas_vw_existen_en_sqlite(db):
    """Las 4 vistas creadas por Alembic están disponibles en SQLite."""
    rows = db.execute(
        text(
            "SELECT name FROM sqlite_master "
            "WHERE type = 'view' AND name LIKE 'vw_%' ORDER BY name"
        )
    ).scalars().all()
    assert rows == [
        "vw_admin_dashboard",
        "vw_system_statistics",
        "vw_user_dashboard",
        "vw_users",
    ]


def test_admin_dashboard_usa_vw_admin_dashboard(client, dashboard_data):
    res = client.get(
        "/dashboard/admin",
        headers={"Authorization": f"Bearer {dashboard_data['admin_token']}"},
    )
    assert res.status_code == 200
    filas = res.json()
    fila = next(f for f in filas if f["email"] == "ana@example.com")

    assert fila["full_name"] == "Ana Lucía Torres Pérez"
    assert fila["role_name"] == "Cliente"
    assert fila["region"] == "Bogotá — Cundinamarca"
    assert fila["total_translations"] == 1
    assert fila["support_tickets"] == 1
    assert fila["feedback_count"] == 1


def test_user_dashboard_usa_vw_user_dashboard(client, dashboard_data):
    res = client.get(
        "/dashboard/user",
        headers={"Authorization": f"Bearer {dashboard_data['cliente_token']}"},
    )
    assert res.status_code == 200
    fila = res.json()
    assert fila["full_name"] == "Ana Lucía Torres Pérez"
    assert fila["translations_made"] == 1
    assert fila["favorite_words"] == 0
    assert fila["average_rating"] == 4.0
    assert fila["support_requests"] == 1


def test_system_stats_usa_vw_system_statistics(client, dashboard_data):
    res = client.get(
        "/dashboard/stats",
        headers={"Authorization": f"Bearer {dashboard_data['admin_token']}"},
    )
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_users"] == 2
    assert stats["total_translations"] == 1
    assert stats["total_support_requests"] == 1
    assert stats["total_feedback"] == 1
    assert stats["average_rating"] == 4.0


@pytest.mark.parametrize(
    "path,token_key",
    [("/admin/dashboard", "admin_token"), ("/admin/stats", "admin_token")],
)
def test_aliases_de_dashboard_funcionan_en_sqlite(client, dashboard_data, path, token_key):
    res = client.get(
        path, headers={"Authorization": f"Bearer {dashboard_data[token_key]}"}
    )
    assert res.status_code == 200


def test_alias_user_dashboard_en_sqlite(client, dashboard_data):
    res = client.get(
        "/user/dashboard",
        headers={"Authorization": f"Bearer {dashboard_data['cliente_token']}"},
    )
    assert res.status_code == 200
    assert res.json()["translations_made"] == 1


def test_vw_users_refleja_roles_y_region(db, dashboard_data):
    filas = db.execute(
        text("SELECT email, role_name, region_name FROM vw_users ORDER BY email")
    ).mappings().all()
    por_email = {f["email"]: f for f in filas}

    assert por_email["ana@example.com"]["role_name"] == "Cliente"
    assert por_email["ana@example.com"]["region_name"] == "Bogotá"
    assert por_email["admin@example.com"]["role_name"] == "Administrador"


def test_vista_excluye_usuarios_soft_delete(db, dashboard_data, client):
    cliente = dashboard_data["cliente"]
    cliente.deleted_at = datetime.now(timezone.utc)
    db.commit()

    res = client.get(
        "/dashboard/admin",
        headers={"Authorization": f"Bearer {dashboard_data['admin_token']}"},
    )
    assert res.status_code == 200
    assert all(f["email"] != "ana@example.com" for f in res.json())
