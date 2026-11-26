"""Historial de traducciones completo: búsqueda, borrar, PDF y palabra deletreada.

Cubre lo que se agregó en esta rama:
- GET    /stats/mias/historial?q=      buscar por palabra
- DELETE /stats/mias/historial/{id}    ocultar una traducción propia
- GET    /stats/mias/historial/pdf     exportar a PDF
- POST   /api/traduccion/frame         ahora devuelve id_session
- POST   /api/traduccion/frame/palabra guarda "vida" como una sola traducción
"""
import uuid
from datetime import datetime, timezone

import pytest

from app.core.security import create_access_token, hash_password
from app.models.user import (
    LexicalUnit, SignInput, TranslationDetail, TranslationSession, User,
)
from app.services import traduccion


def _auth(user):
    return {"Authorization": f"Bearer {create_access_token({'sub': user.id_user})}"}


def _palabra(db, texto):
    unidad = LexicalUnit(id_lexicalunit=str(uuid.uuid4()), text=texto, language="es_CO")
    db.add(unidad)
    db.commit()
    return unidad


def _sesion(db, user, palabras=(), tipo="texto", texto_deletreado=None):
    sesion = TranslationSession(
        id_session=str(uuid.uuid4()), id_user=user.id_user, status="done",
        translation_type=tipo, date_time=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(sesion)
    db.flush()
    for orden, unidad in enumerate(palabras, start=1):
        db.add(TranslationDetail(
            id_detail=str(uuid.uuid4()), id_session=sesion.id_session,
            id_lexicalunit=unidad.id_lexicalunit, order=orden,
        ))
    if texto_deletreado:
        db.add(SignInput(
            id_sign_input=str(uuid.uuid4()), id_session=sesion.id_session,
            generated_text=texto_deletreado,
        ))
    db.commit()
    return sesion


@pytest.fixture()
def otro_usuario(db, seed_data):
    user = User(
        id_user=str(uuid.uuid4()), id_role=seed_data["role_cliente"].id_role,
        first_name="Luis", last_name="Gómez", phone="3001234567",
        email="luis@example.com", password_hash=hash_password("Password1!"),
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user


def _ids(respuesta):
    return [s["id_session"] for dia in respuesta.json() for s in dia["sessions"]]


# ── Búsqueda por palabra ─────────────────────────────────────────────────────

def test_buscar_filtra_por_palabra_traducida(client, db, seed_data):
    ana = seed_data["user"]
    hola, casa = _palabra(db, "hola"), _palabra(db, "casa")
    con_hola = _sesion(db, ana, [hola])
    _sesion(db, ana, [casa])

    res = client.get("/stats/mias/historial?q=hol", headers=_auth(ana))

    assert res.status_code == 200
    assert _ids(res) == [con_hola.id_session]


def test_buscar_encuentra_la_palabra_deletreada(client, db, seed_data):
    ana = seed_data["user"]
    deletreada = _sesion(db, ana, tipo="sena", texto_deletreado="vida")
    _sesion(db, ana, [_palabra(db, "casa")])

    res = client.get("/stats/mias/historial?q=VID", headers=_auth(ana))

    assert _ids(res) == [deletreada.id_session]
    assert res.json()[0]["sessions"][0]["generated_text"] == "vida"


def test_sin_busqueda_devuelve_todo(client, db, seed_data):
    ana = seed_data["user"]
    _sesion(db, ana, [_palabra(db, "hola")])
    _sesion(db, ana, [_palabra(db, "casa")])

    res = client.get("/stats/mias/historial", headers=_auth(ana))

    assert len(_ids(res)) == 2


def test_el_historial_no_muestra_traducciones_de_otro_usuario(client, db, seed_data, otro_usuario):
    ana = seed_data["user"]
    _sesion(db, otro_usuario, [_palabra(db, "hola")])

    res = client.get("/stats/mias/historial", headers=_auth(ana))

    assert res.json() == []


# ── Borrar una traducción ────────────────────────────────────────────────────

def test_borrar_una_traduccion_propia(client, db, seed_data):
    ana = seed_data["user"]
    sesion = _sesion(db, ana, [_palabra(db, "hola")])

    res = client.delete(f"/stats/mias/historial/{sesion.id_session}", headers=_auth(ana))

    assert res.status_code == 204
    assert _ids(client.get("/stats/mias/historial", headers=_auth(ana))) == []
    db.refresh(sesion)
    assert sesion.deleted_at is not None  # borrado suave: la fila sigue


def test_no_se_puede_borrar_la_traduccion_de_otro(client, db, seed_data, otro_usuario):
    """OWASP A01: cambiar el id en la URL no deja tocar datos ajenos."""
    ajena = _sesion(db, otro_usuario, [_palabra(db, "hola")])

    res = client.delete(f"/stats/mias/historial/{ajena.id_session}", headers=_auth(seed_data["user"]))

    assert res.status_code == 404
    db.refresh(ajena)
    assert ajena.deleted_at is None


def test_borrar_dos_veces_da_404(client, db, seed_data):
    ana = seed_data["user"]
    sesion = _sesion(db, ana)
    client.delete(f"/stats/mias/historial/{sesion.id_session}", headers=_auth(ana))

    res = client.delete(f"/stats/mias/historial/{sesion.id_session}", headers=_auth(ana))

    assert res.status_code == 404


def test_borrar_sin_sesion_iniciada_da_401(client, seed_data):
    assert client.delete("/stats/mias/historial/x").status_code == 401


# ── Exportar a PDF ───────────────────────────────────────────────────────────

def test_exportar_pdf(client, db, seed_data):
    ana = seed_data["user"]
    _sesion(db, ana, [_palabra(db, "hola"), _palabra(db, "amigo")])
    _sesion(db, ana, tipo="sena", texto_deletreado="vida")
    _sesion(db, ana)  # sin señas

    res = client.get("/stats/mias/historial/pdf?dias=7", headers=_auth(ana))

    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "historial-signbridge.pdf" in res.headers["content-disposition"]
    assert res.content.startswith(b"%PDF")


def test_exportar_pdf_vacio(client, seed_data):
    res = client.get("/stats/mias/historial/pdf", headers=_auth(seed_data["user"]))

    assert res.status_code == 200
    assert res.content.startswith(b"%PDF")


def test_pdf_no_se_rompe_con_etiquetas_en_la_busqueda(client, db, seed_data):
    """El texto del usuario se escapa: '<b>' en la búsqueda no puede dar 500."""
    res = client.get("/stats/mias/historial/pdf?q=<b>hola", headers=_auth(seed_data["user"]))

    assert res.status_code == 200
    assert res.content.startswith(b"%PDF")


# ── Seña a texto: sesión y palabra deletreada ────────────────────────────────

def test_frame_devuelve_id_de_sesion_aunque_no_haya_mano(client, seed_data, monkeypatch):
    monkeypatch.setattr(traduccion, "MEDIAPIPE_AVAILABLE", False)
    ana = seed_data["user"]
    import base64
    import io
    from PIL import Image
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), "white").save(buffer, format="PNG")
    frame = base64.b64encode(buffer.getvalue()).decode()

    primero = client.post("/api/traduccion/frame", json={"frame_base64": frame}, headers=_auth(ana)).json()
    segundo = client.post(
        "/api/traduccion/frame",
        json={"frame_base64": frame, "session_id": primero["id_session"]},
        headers=_auth(ana),
    ).json()

    assert primero["id_session"]
    assert segundo["id_session"] == primero["id_session"]


def test_confirmar_palabra_la_guarda_en_el_historial(client, db, seed_data):
    ana = seed_data["user"]
    sesion = _sesion(db, ana, tipo="sena")

    res = client.post(
        "/api/traduccion/frame/palabra",
        json={"session_id": sesion.id_session, "texto": "  vida "},
        headers=_auth(ana),
    )

    assert res.json() == {"guardado": True, "texto": "  vida "}
    historial = client.get("/stats/mias/historial", headers=_auth(ana)).json()
    assert historial[0]["sessions"][0]["generated_text"] == "vida"


def test_confirmar_palabra_en_sesion_ajena_no_guarda(client, db, seed_data, otro_usuario):
    ajena = _sesion(db, otro_usuario, tipo="sena")

    res = client.post(
        "/api/traduccion/frame/palabra",
        json={"session_id": ajena.id_session, "texto": "hackeado"},
        headers=_auth(seed_data["user"]),
    )

    assert res.json()["guardado"] is False
    assert db.query(SignInput).count() == 0


def test_confirmar_palabra_vacia_da_422(client, db, seed_data):
    ana = seed_data["user"]
    sesion = _sesion(db, ana, tipo="sena")

    res = client.post(
        "/api/traduccion/frame/palabra",
        json={"session_id": sesion.id_session, "texto": ""},
        headers=_auth(ana),
    )

    assert res.status_code == 422


# ── Servicios ────────────────────────────────────────────────────────────────

def test_record_sign_input_ignora_texto_en_blanco_y_sesion_inexistente(db, seed_data):
    sesion = _sesion(db, seed_data["user"], tipo="sena")

    assert traduccion.record_sign_input(db, sesion.id_session, "   ") is False
    assert traduccion.record_sign_input(db, "no-existe", "vida") is False


def test_record_sign_input_no_lanza_si_la_bd_falla(db, monkeypatch):
    monkeypatch.setattr(db, "query", lambda *_: (_ for _ in ()).throw(RuntimeError("BD caída")))

    assert traduccion.record_sign_input(db, "x", "vida") is False


def test_record_frame_detail_no_repite_la_misma_letra(db, seed_data):
    sesion = _sesion(db, seed_data["user"], tipo="sena")
    _palabra(db, "V")
    _palabra(db, "I")

    for letra in ["V", "V", "V", "I", "V"]:
        traduccion.record_frame_detail(db, sesion.id_session, letra)

    ordenes = [d.order for d in db.query(TranslationDetail).order_by(TranslationDetail.order)]
    assert ordenes == [1, 2, 3]  # V, I, V: los V seguidos cuentan una vez


def test_record_frame_detail_ignora_letra_que_no_esta_en_el_diccionario(db, seed_data):
    sesion = _sesion(db, seed_data["user"], tipo="sena")

    traduccion.record_frame_detail(db, sesion.id_session, "Ñ")

    assert db.query(TranslationDetail).count() == 0


def test_record_frame_detail_no_lanza_si_la_bd_falla(db, monkeypatch):
    monkeypatch.setattr(db, "query", lambda *_: (_ for _ in ()).throw(RuntimeError("BD caída")))

    traduccion.record_frame_detail(db, "x", "A")  # no lanza
