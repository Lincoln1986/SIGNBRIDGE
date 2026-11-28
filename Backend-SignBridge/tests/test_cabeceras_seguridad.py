"""Cabeceras de seguridad y documentación apagable (OWASP A05)."""
import importlib

import pytest
from fastapi.testclient import TestClient


def test_las_respuestas_traen_las_cabeceras_de_seguridad(client):
    res = client.get("/health")

    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
    assert res.headers["Content-Security-Policy"] == "default-src 'none'; frame-ancestors 'none'"
    assert res.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_los_errores_tambien_traen_las_cabeceras(client):
    res = client.get("/no-existe")

    assert res.status_code == 404
    assert res.headers["X-Frame-Options"] == "DENY"


def test_la_respuesta_no_dice_que_servidor_es(client):
    """uvicorn se arranca con --no-server-header en el Dockerfile; TestClient no
    agrega la cabecera, así que aquí se comprueba que la app tampoco la pone."""
    assert "server" not in client.get("/health").headers


def test_swagger_no_lleva_la_csp_que_lo_dejaria_en_blanco(client):
    res = client.get("/docs")

    assert res.status_code == 200
    assert "Content-Security-Policy" not in res.headers
    assert res.headers["X-Content-Type-Options"] == "nosniff"


@pytest.fixture()
def app_sin_docs(monkeypatch):
    """Recarga app.main con DOCS_HABILITADOS=false y después la deja como estaba."""
    import app.main as main
    from app.core.config import get_settings

    monkeypatch.setenv("DOCS_HABILITADOS", "false")
    get_settings.cache_clear()
    yield importlib.reload(main).app
    monkeypatch.delenv("DOCS_HABILITADOS")
    get_settings.cache_clear()
    importlib.reload(main)


@pytest.mark.parametrize("ruta", ["/docs", "/redoc", "/openapi.json"])
def test_con_docs_apagados_swagger_no_existe(app_sin_docs, ruta):
    assert TestClient(app_sin_docs).get(ruta).status_code == 404


def test_con_docs_apagados_la_api_sigue_funcionando(app_sin_docs):
    assert TestClient(app_sin_docs).get("/health").json() == {"status": "healthy"}
