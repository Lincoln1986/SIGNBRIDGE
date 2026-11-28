"""Videos locales: subir, reemplazar y servir (OWASP A03 / A04 en la subida)."""
import uuid

import pytest

from app.models.user import LexicalUnit
from app.services import videos

MP4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64
WEBM = b"\x1a\x45\xdf\xa3" + b"\x00" * 64
HTML = b"<html><script>alert(1)</script></html>"


@pytest.fixture(autouse=True)
def carpeta_subidos(tmp_path, monkeypatch):
    """Los videos subidos en las pruebas van a una carpeta temporal."""
    monkeypatch.setattr(videos, "VIDEOS_SUBIDOS", tmp_path)
    return tmp_path


@pytest.fixture()
def palabra(db):
    def _crear(video_url=None):
        unidad = LexicalUnit(id_lexicalunit=str(uuid.uuid4()), text="hola",
                             language="es_CO", video_url=video_url)
        db.add(unidad)
        db.commit()
        return unidad
    return _crear


def _admin(make_token):
    return {"Authorization": f"Bearer {make_token('Administrador')}"}


def _subir(client, headers, id_palabra, contenido=MP4, tipo="video/mp4", nombre="sena.mp4"):
    return client.post(
        f"/dashboard/lexical-units/{id_palabra}/video-file",
        files={"file": (nombre, contenido, tipo)},
        headers=headers,
    )


# ── Subir ────────────────────────────────────────────────────────────────────

def test_el_admin_sube_un_mp4(client, make_token, palabra, carpeta_subidos):
    res = _subir(client, _admin(make_token), palabra().id_lexicalunit)

    assert res.status_code == 200
    url = res.json()["video_url"]
    assert url.startswith("/media/subidos/") and url.endswith(".mp4")
    assert (carpeta_subidos / url.rsplit("/", 1)[1]).read_bytes() == MP4


def test_acepta_webm(client, make_token, palabra):
    res = _subir(client, _admin(make_token), palabra().id_lexicalunit, WEBM, "video/webm", "a.webm")

    assert res.json()["video_url"].endswith(".webm")


def test_la_extension_sale_del_tipo_y_no_del_nombre(client, make_token, palabra):
    """Un 'video.html' con contenido de MP4 se guarda como .mp4."""
    res = _subir(client, _admin(make_token), palabra().id_lexicalunit, nombre="video.html")

    assert res.json()["video_url"].endswith(".mp4")


def test_un_tipo_que_no_es_video_da_415(client, make_token, palabra):
    res = _subir(client, _admin(make_token), palabra().id_lexicalunit, HTML, "text/html", "x.html")

    assert res.status_code == 415


def test_un_html_disfrazado_de_mp4_da_415(client, make_token, palabra, carpeta_subidos):
    res = _subir(client, _admin(make_token), palabra().id_lexicalunit, HTML, "video/mp4", "x.mp4")

    assert res.status_code == 415
    assert res.json()["detail"] == "El archivo no es un video válido."
    assert list(carpeta_subidos.iterdir()) == []


def test_un_archivo_muy_grande_da_413(client, make_token, palabra, monkeypatch, carpeta_subidos):
    monkeypatch.setattr(videos, "TAMANO_MAXIMO", 10)
    monkeypatch.setattr(videos, "BLOQUE", 4)

    res = _subir(client, _admin(make_token), palabra().id_lexicalunit)

    assert res.status_code == 413
    assert list(carpeta_subidos.iterdir()) == []


def test_un_cliente_no_puede_subir_videos(client, make_token, palabra):
    res = _subir(client, {"Authorization": f"Bearer {make_token('Cliente')}"}, palabra().id_lexicalunit)

    assert res.status_code == 403


def test_palabra_inexistente_da_404(client, make_token, seed_data):
    assert _subir(client, _admin(make_token), "no-existe").status_code == 404


# ── Reemplazar ───────────────────────────────────────────────────────────────

def test_al_reemplazar_se_borra_el_video_subido_anterior(client, make_token, palabra, carpeta_subidos):
    unidad = palabra()
    primero = _subir(client, _admin(make_token), unidad.id_lexicalunit).json()["video_url"]

    _subir(client, _admin(make_token), unidad.id_lexicalunit, WEBM, "video/webm", "b.webm")

    archivos = [a.name for a in carpeta_subidos.iterdir()]
    assert primero.rsplit("/", 1)[1] not in archivos
    assert len(archivos) == 1


def test_los_videos_del_repositorio_nunca_se_borran(client, make_token, palabra):
    repo = videos.VIDEOS_REPO / "hola.mp4"
    unidad = palabra("/media/videos/hola.mp4")

    _subir(client, _admin(make_token), unidad.id_lexicalunit)

    assert repo.is_file()


def test_cambiar_a_youtube_borra_el_video_subido(client, make_token, palabra, carpeta_subidos):
    unidad = palabra()
    _subir(client, _admin(make_token), unidad.id_lexicalunit)

    res = client.patch(
        f"/dashboard/lexical-units/{unidad.id_lexicalunit}/video",
        json={"video_url": "https://www.youtube.com/watch?v=abc123"},
        headers=_admin(make_token),
    )

    assert res.status_code == 200
    assert list(carpeta_subidos.iterdir()) == []


def test_borrar_no_sale_de_la_carpeta_de_subidos(carpeta_subidos, tmp_path_factory):
    afuera = tmp_path_factory.mktemp("afuera") / "importante.mp4"
    afuera.write_bytes(MP4)

    videos.borrar_video_subido(f"/media/subidos/../../{afuera.parent.name}/importante.mp4")
    videos.borrar_video_subido("https://www.youtube.com/watch?v=abc")
    videos.borrar_video_subido(None)

    assert afuera.is_file()


# ── Servir ───────────────────────────────────────────────────────────────────

def test_los_videos_del_repositorio_se_sirven(client):
    res = client.get("/media/videos/hola.mp4")

    assert res.status_code == 200
    assert res.headers["content-type"] == "video/mp4"
    assert res.headers["X-Content-Type-Options"] == "nosniff"


@pytest.mark.parametrize("ruta", ["/media/../.env", "/media/%2e%2e/.env", "/media/videos/", "/media/no-existe.mp4"])
def test_no_se_sale_de_media_ni_se_listan_carpetas(client, ruta):
    assert client.get(ruta).status_code == 404


@pytest.mark.parametrize(("contenido", "tipo", "esperado"), [
    (MP4, "video/mp4", True),
    (b"\x00\x00\x00\x14moov" + b"\x00" * 8, "video/quicktime", True),
    (WEBM, "video/webm", True),
    (MP4, "video/webm", False),
    (HTML, "video/mp4", False),
    (b"abc", "video/mp4", False),
])
def test_es_video_revisa_los_primeros_bytes(contenido, tipo, esperado):
    assert videos.es_video(contenido, tipo) is esperado
