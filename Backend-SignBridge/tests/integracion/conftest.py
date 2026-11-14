"""Fixtures de integración contra PostgreSQL real (S5).

Autor: @javierperez14 · S5 (capa BD)

Estos tests SOLO corren si existe la variable TEST_DATABASE_URL. Sin ella se
saltan, así el job de backend (SQLite) sigue igual de rápido.

    docker compose --profile test up -d postgres-test
    TEST_DATABASE_URL=postgresql://postgres:admin@127.0.0.1:5433/signbridge_test \
        uv run pytest tests/integracion --no-cov

Cómo se aíslan los tests (limpieza por transacción con rollback):

1. Cada test abre UNA conexión y empieza una transacción.
2. La sesión se crea con join_transaction_mode="create_savepoint": cuando el
   código de la app hace db.commit(), solo se libera un SAVEPOINT; la
   transacción de afuera sigue abierta.
3. Al terminar el test se hace rollback de esa transacción: nada de lo que el
   test escribió queda en la base, ni siquiera lo que la app "confirmó".

Las credenciales vienen de la variable de entorno, nunca del código.
"""
import os
import uuid

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.user import Role, User

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


def pytest_collection_modifyitems(config, items):
    """Marca como `integracion` todo lo de esta carpeta y lo salta sin la BD."""
    saltar = pytest.mark.skip(reason="Falta TEST_DATABASE_URL (Postgres de pruebas)")
    for item in items:
        if os.sep + "integracion" + os.sep in str(item.fspath):
            item.add_marker(pytest.mark.integracion)
            if not TEST_DATABASE_URL:
                item.add_marker(saltar)


@pytest.fixture(scope="session")
def pg_engine():
    """Engine contra postgres-test con el esquema en la última migración."""
    # Alembic lee DATABASE_URL del entorno (ver alembic/env.py)
    url_anterior = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
    try:
        cfg = Config(os.path.join(os.path.dirname(__file__), "..", "..", "alembic.ini"))
        cfg.set_main_option(
            "script_location",
            os.path.join(os.path.dirname(__file__), "..", "..", "alembic"),
        )
        command.upgrade(cfg, "head")
    finally:
        if url_anterior is not None:
            os.environ["DATABASE_URL"] = url_anterior

    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
    yield engine
    engine.dispose()


@pytest.fixture()
def db(pg_engine):
    """Sesión dentro de una transacción que se deshace al final del test.

    Reemplaza la fixture `db` de SQLite del conftest de la raíz.
    """
    conexion = pg_engine.connect()
    transaccion = conexion.begin()
    sesion = Session(bind=conexion, join_transaction_mode="create_savepoint")
    try:
        yield sesion
    finally:
        sesion.close()
        transaccion.rollback()
        conexion.close()


@pytest.fixture(autouse=True)
def _override_get_db_dep(db):
    """La API usa la MISMA sesión del test, así ve lo que el test insertó."""
    app.dependency_overrides[get_db] = lambda: db
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client(_override_get_db_dep):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def crear_usuario(db):
    """Crea un usuario en Postgres y devuelve (usuario, token).

    Usa los roles que siembra la migración 3fcd44fad4e6; si el rol no existe
    lo crea dentro de la misma transacción.
    """
    def _crear(role_name: str = "Cliente", **campos):
        rol = db.query(Role).filter(Role.role_name == role_name).first()
        if rol is None:
            rol = Role(id_role=str(uuid.uuid4()), role_name=role_name)
            db.add(rol)
            db.flush()
        usuario = User(
            id_user=str(uuid.uuid4()),
            id_role=rol.id_role,
            first_name=campos.pop("first_name", "Prueba"),
            last_name=campos.pop("last_name", "Integración"),
            phone=campos.pop("phone", "3001234567"),
            email=campos.pop("email", f"int-{uuid.uuid4().hex[:8]}@example.com"),
            password_hash=hash_password("Password1!"),
            is_active=True,
            **campos,
        )
        db.add(usuario)
        db.commit()
        return usuario, create_access_token({"sub": usuario.id_user})

    return _crear


@pytest.fixture()
def make_token(crear_usuario):
    """Misma firma que la del conftest de la raíz, pero en Postgres."""
    return lambda role_name: crear_usuario(role_name)[1]
