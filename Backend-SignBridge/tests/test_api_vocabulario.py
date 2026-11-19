"""API de vocabulario (/dashboard/lexical-units).

El listado es accesible para cualquier usuario autenticado, pero crear,
cambiar el video y borrar exigen rol Administrador (`require_admin` en el
router `app/routers/dashboard.py`).
"""
import uuid

import pytest

ID_INEXISTENTE = "00000000-0000-0000-0000-000000000000"

# Escrituras protegidas: (método, ruta, cuerpo)
ESCRITURAS_ADMIN = [
    ("POST", "/dashboard/lexical-units", {"text": "hola"}),
    (
        "PATCH",
        f"/dashboard/lexical-units/{ID_INEXISTENTE}/video",
        {"video_url": "https://youtu.be/abc"},
    ),
    ("DELETE", f"/dashboard/lexical-units/{ID_INEXISTENTE}", None),
]


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _crear_palabra(client, token: str, text: str = "hola") -> dict:
    res = client.post(
        "/dashboard/lexical-units", json={"text": text}, headers=_headers(token)
    )
    assert res.status_code == 201
    return res.json()


# ── Identificador generado ───────────────────────────────────────────────────

def test_crear_palabra_genera_un_uuid_valido(client, make_token):
    # Arrange
    token = make_token("Administrador")

    # Act
    cuerpo = _crear_palabra(client, token, "gracias")

    # Assert
    assert uuid.UUID(cuerpo["id_lexicalunit"]).version == 4
    assert cuerpo["text"] == "gracias"


# ── Límite de longitud del texto (columna VARCHAR(100)) ─────────────────────

@pytest.mark.parametrize("largo,esperado", [(1, 201), (100, 201), (101, 422)])
def test_longitud_del_texto_respeta_el_limite(client, make_token, largo, esperado):
    # Arrange
    token = make_token("Administrador")

    # Act
    res = client.post(
        "/dashboard/lexical-units",
        json={"text": "a" * largo},
        headers=_headers(token),
    )

    # Assert
    assert res.status_code == esperado


# ── video_url ────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("video_url", ["", "no-es-url", "javascript:alert(1)"])
def test_patch_rechaza_video_url_invalido(client, make_token, video_url):
    # Arrange
    token = make_token("Administrador")
    palabra = _crear_palabra(client, token)

    # Act
    res = client.patch(
        f"/dashboard/lexical-units/{palabra['id_lexicalunit']}/video",
        json={"video_url": video_url},
        headers=_headers(token),
    )

    # Assert
    assert res.status_code == 422


def test_patch_acepta_video_url_de_youtube(client, make_token):
    # Arrange
    token = make_token("Administrador")
    palabra = _crear_palabra(client, token)

    # Act
    res = client.patch(
        f"/dashboard/lexical-units/{palabra['id_lexicalunit']}/video",
        json={"video_url": "https://youtu.be/abc"},
        headers=_headers(token),
    )

    # Assert
    assert res.status_code == 200
    assert res.json()["video_url"] == "https://youtu.be/abc"


# ── Permisos sobre las escrituras ────────────────────────────────────────────

@pytest.mark.parametrize("method,path,body", ESCRITURAS_ADMIN)
def test_escritura_de_vocabulario_sin_token(client, method, path, body):
    # Act
    res = client.request(method, path, json=body)

    # Assert
    assert res.status_code == 401


@pytest.mark.parametrize("method,path,body", ESCRITURAS_ADMIN)
@pytest.mark.parametrize("rol", ["Cliente", "Soporte"])
def test_escritura_de_vocabulario_con_rol_insuficiente(
    client, make_token, method, path, body, rol
):
    # Arrange
    token = make_token(rol)

    # Act
    res = client.request(method, path, json=body, headers=_headers(token))

    # Assert
    assert res.status_code == 403
