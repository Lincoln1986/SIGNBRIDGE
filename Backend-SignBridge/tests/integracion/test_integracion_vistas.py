"""Vistas vw_* contra PostgreSQL real (S5).

Autor: @javierperez14 · S5 (capa BD)

En la suite normal las vistas se crean en SQLite con el mismo DDL. Aquí se
prueba que la migración de Alembic las deja bien en Postgres y que calculan
lo mismo que espera el dashboard.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import inspect, text

from app.models.user import Feedback, Region, Support, TranslationSession

VISTAS = {"vw_admin_dashboard", "vw_user_dashboard", "vw_system_statistics", "vw_users"}


def test_should_leave_the_schema_at_head_with_all_the_views(db):
    # Act
    vistas = set(inspect(db.get_bind()).get_view_names())
    version = db.execute(text("SELECT version_num FROM alembic_version")).scalar()

    # Assert
    assert VISTAS <= vistas
    assert version is not None


def test_should_seed_the_base_roles(db):
    roles = {r for (r,) in db.execute(text('SELECT role_name FROM "Role"'))}

    assert {"Administrador", "Soporte"} <= roles


def test_should_count_each_users_activity_in_the_admin_view(db, crear_usuario):
    # Arrange: una usuaria con región, 2 traducciones, 1 ticket y 1 valoración
    region = Region(id_region=str(uuid.uuid4()), region_name="Suba", department="Bogotá D.C.")
    db.add(region)
    usuaria, _ = crear_usuario(
        first_name="Ana", middle_name="María", last_name="Torres",
        id_region=region.id_region,
    )
    db.add_all([
        TranslationSession(id_session=str(uuid.uuid4()), id_user=usuaria.id_user,
                           translation_type="texto", status="active"),
        TranslationSession(id_session=str(uuid.uuid4()), id_user=usuaria.id_user,
                           translation_type="voz", status="active"),
        Support(id_support=str(uuid.uuid4()), id_user=usuaria.id_user,
                subject="Video", message="No carga", status="pending"),
        Feedback(id_feedback=str(uuid.uuid4()), id_user=usuaria.id_user, rating=4),
    ])
    db.commit()

    # Act
    fila = db.execute(
        text("SELECT * FROM vw_admin_dashboard WHERE email = :e"), {"e": usuaria.email}
    ).mappings().one()

    # Assert
    assert fila["full_name"] == "Ana María Torres"
    assert fila["region"] == "Suba — Bogotá D.C."
    assert fila["total_translations"] == 2
    assert fila["support_tickets"] == 1
    assert fila["feedback_count"] == 1


def test_should_say_sin_region_and_hide_deleted_users(db, crear_usuario):
    sin_region, _ = crear_usuario()
    borrado, _ = crear_usuario()
    borrado.deleted_at = datetime.now(timezone.utc)
    db.commit()

    correos = {
        f["email"]: f["region"]
        for f in db.execute(text("SELECT email, region FROM vw_admin_dashboard")).mappings()
    }

    assert correos[sin_region.email] == "Sin región"
    assert borrado.email not in correos


def test_should_average_the_ratings_in_the_user_view(db, crear_usuario):
    usuario, _ = crear_usuario()
    db.add_all([
        Feedback(id_feedback=str(uuid.uuid4()), id_user=usuario.id_user, rating=5),
        Feedback(id_feedback=str(uuid.uuid4()), id_user=usuario.id_user, rating=2),
    ])
    db.commit()

    fila = db.execute(
        text("SELECT * FROM vw_user_dashboard WHERE email = :e"), {"e": usuario.email}
    ).mappings().one()

    assert float(fila["average_rating"]) == 3.5
    assert fila["translations_made"] == 0


def test_should_return_the_user_dashboard_from_postgres_through_the_api(client, crear_usuario):
    # Endpoint completo: token → get_current_user → vista en Postgres
    usuario, token = crear_usuario(first_name="Luis", last_name="Gómez")

    respuesta = client.get("/dashboard/user", headers={"Authorization": f"Bearer {token}"})

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == usuario.email


def test_should_not_leak_data_between_tests_part_1(db, crear_usuario):
    # Este test escribe; el siguiente comprueba que el rollback lo borró
    crear_usuario(email="fuga@example.com")

    assert db.execute(text('SELECT COUNT(*) FROM "User" WHERE email = \'fuga@example.com\'')).scalar() == 1


def test_should_not_leak_data_between_tests_part_2(db):
    assert db.execute(text('SELECT COUNT(*) FROM "User" WHERE email = \'fuga@example.com\'')).scalar() == 0
