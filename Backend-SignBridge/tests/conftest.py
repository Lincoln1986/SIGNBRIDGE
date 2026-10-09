"""Fixtures compartidas de la suite backend (Sprint S1).

Las variables que exige `Settings` se fijan ANTES de cualquier import de
`app`, porque `app.core.database` crea el engine en tiempo de importación.
La BD real (PostgreSQL) no se usa: `get_db` se sobreescribe con SQLite en
memoria para que los tests sean rápidos y repetibles.
"""
import os
import uuid

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@127.0.0.1:5432/test")
os.environ.setdefault("SECRET_KEY", "clave-secreta-de-pruebas")
os.environ.setdefault("MAIL_USERNAME", "test@test.com")
os.environ.setdefault("MAIL_PASSWORD", "no-se-usa")
os.environ.setdefault("MAIL_FROM", "test@test.com")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.user import Region, Role, User

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def _create_tables():
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def _clean_tables(_create_tables):
    """Vacía las tablas después de cada test para que sean independientes."""
    yield
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture(autouse=True)
def _mock_mail(monkeypatch):
    """Nunca enviar correo real desde los tests."""
    async def _fake(*args, **kwargs):
        return None

    monkeypatch.setattr("app.routers.auth.send_welcome_email", _fake)
    monkeypatch.setattr("app.routers.auth.send_reset_email", _fake)


@pytest.fixture(autouse=True)
def _override_get_db_dep():
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture()
def client(_override_get_db_dep):
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def db(_create_tables):
    session = TestingSessionLocal()
    yield session
    session.close()


@pytest.fixture()
def seed_data(db):
    """Rol por defecto, rol admin, región y un usuario activo de prueba."""
    region = Region(
        id_region=str(uuid.uuid4()), region_name="Bogotá", department="Cundinamarca"
    )
    role_cliente = Role(id_role=str(uuid.uuid4()), role_name="Cliente")
    role_admin = Role(id_role=str(uuid.uuid4()), role_name="Administrador")
    user = User(
        id_user=str(uuid.uuid4()),
        id_role=role_cliente.id_role,
        id_region=region.id_region,
        first_name="Ana",
        last_name="Torres",
        phone="3001234567",
        address="Calle 1 #2-3",
        city="Bogotá",
        email="ana@example.com",
        password_hash=hash_password("Password1!"),
        is_active=True,
    )
    db.add_all([region, role_cliente, role_admin, user])
    db.commit()
    return {"region": region, "role_cliente": role_cliente,
            "role_admin": role_admin, "user": user}
