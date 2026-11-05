"""Contrato de seguridad de la API: 401 sin sesión y 403 con el rol equivocado.

Autor: @javierperez14 · S1 (unitarias) + S2 (capa API)

El plan del instructor lo marca como crítico: "Endpoints protegidos (admin,
dashboard, mensajería) no tienen casos 401/403 probados". En vez de escribir
un test por endpoint, se recorren TODOS los endpoints de la app:

  - si alguien agrega un endpoint y olvida protegerlo, falla
    test_should_only_expose_the_expected_public_endpoints;
  - cada endpoint protegido responde 401 sin token y con un token falso;
  - cada endpoint con rol responde 403 al rol que no corresponde.

No necesita base de datos: la seguridad se resuelve antes de tocarla.
"""
from types import SimpleNamespace

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from app.core.security import get_current_user
from app.main import app
from app.routers import (
    admin_users, auth, dashboard, favorites, feedback, messages,
    notifications, regions, stats, support, traduccion,
)

cliente = TestClient(app)

# Endpoints que SÍ deben funcionar sin sesión. Agregar uno aquí es una
# decisión consciente que se revisa en el PR.
PUBLICOS = {
    ("GET", "/"), ("GET", "/health"), ("GET", "/info"),
    ("POST", "/auth/register"), ("POST", "/auth/login"),
    ("POST", "/auth/forgot-password"), ("POST", "/auth/reset-password"),
    ("GET", "/regions"),   # el registro necesita la lista de ciudades
}


def _llamadas(dependant):
    """Todas las funciones de las que depende un endpoint (recursivo)."""
    for dep in dependant.dependencies:
        yield getattr(dep.call, "__name__", "")
        yield from _llamadas(dep)


def _rutas():
    modulos = [admin_users, auth, dashboard, favorites, feedback, messages,
               notifications, regions, stats, support, traduccion]
    rutas = [r for m in modulos for r in m.router.routes if isinstance(r, APIRoute)]
    rutas += [r for r in app.routes if isinstance(r, APIRoute)]
    for ruta in rutas:
        for metodo in ruta.methods:
            yield metodo, ruta.path, set(_llamadas(ruta.dependant))


RUTAS = sorted(_rutas())
PROTEGIDAS = [(m, p) for m, p, deps in RUTAS if "get_current_user" in deps]


def _url(path):
    # /support/{id_support}/status → /support/x/status
    import re
    return re.sub(r"\{[^}]+\}", "x", path)


def test_should_only_expose_the_expected_public_endpoints():
    sin_sesion = {(m, p) for m, p, deps in RUTAS if "get_current_user" not in deps}

    assert sin_sesion == PUBLICOS


@pytest.mark.parametrize(("metodo", "path"), PROTEGIDAS, ids=[f"{m} {p}" for m, p in PROTEGIDAS])
def test_should_answer_401_without_a_token(metodo, path):
    respuesta = cliente.request(metodo, _url(path))

    assert respuesta.status_code == 401


@pytest.mark.parametrize(("metodo", "path"), PROTEGIDAS, ids=[f"{m} {p}" for m, p in PROTEGIDAS])
def test_should_answer_401_with_a_fake_token(metodo, path):
    respuesta = cliente.request(metodo, _url(path), headers={"Authorization": "Bearer esto.no.sirve"})

    assert respuesta.status_code == 401
    assert respuesta.json() == {"detail": "Token inválido o expirado"}  # sin stack trace ni SQL


# ── 403: rol equivocado ──────────────────────────────────────────────────────

# Para cada guardia, un rol que NO debe pasar
ROL_PROHIBIDO = {
    "require_admin": "Cliente",
    "require_support_or_admin": "Cliente",
    "require_support": "Administrador",   # el Admin ve tickets, pero no los resuelve
}
CON_ROL = [
    (m, p, guardia)
    for m, p, deps in RUTAS
    for guardia in ROL_PROHIBIDO
    if guardia in deps
]


@pytest.fixture
def sesion_como():
    """Simula una sesión iniciada con el rol dado (sin token ni BD)."""
    def _como(rol):
        app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(
            id_user="u1", is_active=True, role=SimpleNamespace(role_name=rol)
        )
    yield _como
    app.dependency_overrides.clear()


def test_should_have_role_protected_endpoints_for_every_guard():
    # Si un refactor quita los guardias, la tabla de abajo quedaría vacía
    # y los tests de 403 pasarían sin probar nada.
    assert {g for _, _, g in CON_ROL} == set(ROL_PROHIBIDO)


@pytest.mark.parametrize(
    ("metodo", "path", "guardia"), CON_ROL,
    ids=[f"{m} {p} [{g}]" for m, p, g in CON_ROL],
)
def test_should_answer_403_to_the_wrong_role(sesion_como, metodo, path, guardia):
    sesion_como(ROL_PROHIBIDO[guardia])

    respuesta = cliente.request(metodo, _url(path))

    assert respuesta.status_code == 403
    assert respuesta.json()["detail"].startswith("Acceso denegado")
