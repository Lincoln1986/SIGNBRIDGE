"""El frontend local (Vite, puerto 5173) puede llamar a la API.

Defecto encontrado por el E2E real: FRONTEND_URL valía http://localhost:3000
por defecto, así que el navegador rechazaba por CORS todas las peticiones del
frontend en http://localhost:5173 (el preflight respondía 400), y los enlaces
de los correos apuntaban al puerto equivocado.
"""
from app.core.config import Settings


def _preflight(client, origen: str):
    return client.options(
        "/auth/register",
        headers={
            "Origin": origen,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )


def test_should_allow_the_vite_frontend_origin(client):
    respuesta = _preflight(client, "http://localhost:5173")

    assert respuesta.status_code == 200
    assert respuesta.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_should_reject_an_unknown_origin(client):
    respuesta = _preflight(client, "http://sitio-ajeno.example")

    assert respuesta.status_code == 400
    assert "access-control-allow-origin" not in respuesta.headers


def test_should_point_email_links_to_the_frontend_port_by_default(monkeypatch):
    monkeypatch.delenv("FRONTEND_URL", raising=False)

    assert Settings(_env_file=None).FRONTEND_URL == "http://localhost:5173"
