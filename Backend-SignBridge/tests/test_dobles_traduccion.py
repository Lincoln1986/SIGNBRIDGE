"""Dobles de prueba para la traducción y el abecedario (S5).

Autor: @Lincoln1986 · S5 (capa API)

MediaPipe nunca se ejecuta de verdad: se reemplaza `_mp_hands` por un doble
que devuelve los 21 puntos de una mano armada a mano. Así se prueba NUESTRA
lógica (reglas del abecedario, sesiones, diccionario) y no el modelo de visión.

Mano sintética: muñeca en (0, 0), nudillo del medio en (0, 1). El pulgar
queda del lado de las x negativas y el meñique del de las positivas.
"""
import base64
import io
import uuid
from types import SimpleNamespace

import jwt
import pytest
from fastapi import HTTPException
from PIL import Image

from app.models.user import LexicalUnit, SystemErrorLog, TranslationDetail, TranslationSession
from app.services import traduccion
from app.services.abecedario import clasificar_letra, describir_pose, medir_pose

# x del nudillo de cada dedo largo
_X = {"indice": -0.3, "medio": 0.0, "anular": 0.2, "menique": 0.3}
_BASE = {"indice": 5, "medio": 9, "anular": 13, "menique": 17}


def mano(extendidos=(), pulgar=(-0.25, 0.75), puntas=None, medias=None):
    """Arma los 21 landmarks de una mano.

    extendidos -- dedos largos estirados ("indice", "medio", ...).
    pulgar     -- (x, y) de la punta del pulgar.
    puntas     -- {dedo: (x, y)} para mover una punta a mano.
    medias     -- {dedo: y} de la articulación media (por defecto 1.4).
    """
    puntas = puntas or {}
    medias = medias or {}
    p = [SimpleNamespace(x=0.0, y=0.0) for _ in range(21)]
    p[1] = SimpleNamespace(x=-0.15, y=0.3)
    p[2] = SimpleNamespace(x=-0.25, y=0.5)
    p[3] = SimpleNamespace(x=-0.3, y=0.65)
    p[4] = SimpleNamespace(x=pulgar[0], y=pulgar[1])
    for dedo, base in _BASE.items():
        x = _X[dedo]
        p[base] = SimpleNamespace(x=x, y=1.0)
        p[base + 1] = SimpleNamespace(x=x, y=medias.get(dedo, 1.4))
        p[base + 2] = SimpleNamespace(x=x, y=1.6)
        tx, ty = puntas.get(dedo, (x, 1.9 if dedo in extendidos else 1.1))
        p[base + 3] = SimpleNamespace(x=tx, y=ty)
    return p


PULGAR_AFUERA = (-1.0, 0.8)  # lejos del nudillo del índice → extendido


# ─── services/abecedario.py: reglas geométricas ─────────────────────────────

@pytest.mark.parametrize(("pose", "letra"), [
    (mano(("indice", "medio", "anular", "menique")), "B"),
    (mano(("indice", "medio"), puntas={"indice": (-0.4, 1.9), "medio": (0.3, 1.9)}), "V"),
    (mano(("indice", "medio"), puntas={"indice": (-0.1, 1.9), "medio": (0.1, 1.9)}), "U"),
    (mano(("indice",), pulgar=PULGAR_AFUERA), "L"),
    (mano(("indice", "medio"), pulgar=PULGAR_AFUERA), "K"),
    (mano(("menique",), pulgar=PULGAR_AFUERA), "Y"),
    (mano(("menique",)), "I"),
    (mano(("indice", "medio", "anular")), "W"),
    (mano(("indice",)), "D"),
], ids=["B", "V", "U", "L", "K", "Y", "I", "W", "D-por-patron"])
def test_should_classify_the_static_letters(pose, letra):
    # Act
    resultado, confianza = clasificar_letra(pose)

    # Assert
    assert resultado == letra
    assert 0 < confianza <= 1


@pytest.mark.parametrize(("pulgar", "letra"), [
    ((-0.75, 0.95), "A"),  # pulgar arriba y bien afuera
    ((-0.6, 0.6), "C"),    # mano curvada, pulgar separado del nudillo
    ((-0.25, 0.75), "E"),  # pulgar recogido contra el nudillo
])
def test_should_tell_a_c_and_e_apart_by_the_thumb(pulgar, letra):
    assert clasificar_letra(mano(pulgar=pulgar))[0] == letra


def test_should_detect_d_when_the_thumb_touches_the_index_tip():
    pose = mano(("indice", "medio"), pulgar=(-0.3, 1.8))

    assert clasificar_letra(pose) == ("D", 0.84)


def test_should_detect_x_when_the_index_is_hooked():
    # La punta apenas pasa la articulación media
    pose = mano(("indice",), puntas={"indice": (-0.3, 1.6)})

    assert clasificar_letra(pose)[0] == "X"


def test_should_detect_f_when_thumb_and_index_make_a_circle():
    pose = mano(
        ("indice", "medio", "anular"),
        pulgar=(-0.3, 1.3),
        puntas={"indice": (-0.3, 1.55)},
    )

    assert clasificar_letra(pose)[0] == "F"


@pytest.mark.parametrize("pose", [None, [], mano()[:20]])
def test_should_return_nothing_without_21_points(pose):
    assert clasificar_letra(pose) == (None, None)
    assert describir_pose(pose) == "sin datos de mano"
    assert medir_pose(pose) == {"error": "sin datos de mano"}


def test_should_return_nothing_for_an_unknown_pose():
    # Solo el dedo medio no corresponde a ninguna letra
    assert clasificar_letra(mano(("medio",))) == (None, None)


@pytest.mark.parametrize(("pose", "texto"), [
    (mano(), "puño cerrado"),
    (mano(("indice", "medio", "anular", "menique"), pulgar=PULGAR_AFUERA), "mano abierta"),
    (mano(("indice",), pulgar=PULGAR_AFUERA), "dedos extendidos: pulgar, índice"),
])
def test_should_describe_the_pose(pose, texto):
    assert describir_pose(pose) == texto


def test_should_return_the_measurements_used_to_calibrate():
    medidas = medir_pose(mano(("indice",), pulgar=PULGAR_AFUERA))

    assert medidas["dedos_extendidos"]["indice"] is True
    assert medidas["dedos_extendidos"]["medio"] is False
    assert medidas["pulgar_ancho"] < 0  # lado del pulgar
    assert set(medidas) >= {"pulgar_largo", "separacion_indice_medio"}


# ─── services/traduccion.py con MediaPipe reemplazado por un doble ──────────

def _mediapipe_falso(landmarks=None, error=None):
    """Doble de `mp.solutions.hands`: devuelve la mano que le pasemos."""
    class Hands:
        def __init__(self, **_):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

        def process(self, _frame):
            if error:
                raise error
            if landmarks is None:
                return SimpleNamespace(multi_hand_landmarks=None)
            return SimpleNamespace(
                multi_hand_landmarks=[SimpleNamespace(landmark=landmarks)]
            )

    return SimpleNamespace(Hands=Hands)


@pytest.fixture()
def con_mediapipe(monkeypatch):
    """Activa MediaPipe con el doble que se le indique."""
    def _usar(**kwargs):
        monkeypatch.setattr(traduccion, "MEDIAPIPE_AVAILABLE", True)
        monkeypatch.setattr(traduccion, "_mp_hands", _mediapipe_falso(**kwargs))
    return _usar


@pytest.fixture(scope="module")
def frame_png():
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), "white").save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def test_should_decode_a_valid_frame(frame_png):
    assert traduccion.decode_base64_frame(frame_png).shape == (4, 4, 3)


@pytest.mark.parametrize("basura", ["no-es-base64!!", base64.b64encode(b"texto").decode()])
def test_should_reject_a_frame_that_is_not_an_image(basura):
    with pytest.raises(HTTPException) as error:
        traduccion.decode_base64_frame(basura)

    assert error.value.status_code == 400


def test_should_detect_the_letter_with_the_mediapipe_double(con_mediapipe, db):
    con_mediapipe(landmarks=mano(("indice", "medio", "anular", "menique")))

    assert traduccion.detect_sign_from_frame(None, db) == ("B", 0.88)


@pytest.mark.parametrize("landmarks", [None, mano(("medio",))], ids=["sin-mano", "pose-rara"])
def test_should_return_nothing_when_there_is_no_letter(con_mediapipe, db, landmarks):
    con_mediapipe(landmarks=landmarks)

    assert traduccion.detect_sign_from_frame(None, db) == (None, None)


def test_should_return_nothing_when_mediapipe_is_not_installed(monkeypatch, db):
    monkeypatch.setattr(traduccion, "MEDIAPIPE_AVAILABLE", False)

    assert traduccion.detect_sign_from_frame(None, db) == (None, None)
    assert traduccion.medir_mano_en_frame(None) is None


def test_should_log_and_return_500_when_mediapipe_fails(con_mediapipe, db):
    # Arrange
    con_mediapipe(error=RuntimeError("modelo dañado"))

    # Act
    with pytest.raises(HTTPException) as error:
        traduccion.detect_sign_from_frame(None, db)

    # Assert: no se filtra el detalle y queda registro del error
    assert error.value.status_code == 500
    assert "modelo dañado" not in error.value.detail
    registro = db.query(SystemErrorLog).one()
    assert registro.error_type == "MEDIAPIPE_ERROR"


def test_should_measure_the_hand_for_calibration(con_mediapipe):
    con_mediapipe(landmarks=mano(("indice",), pulgar=PULGAR_AFUERA))

    medidas = traduccion.medir_mano_en_frame(None)

    assert medidas["letra_detectada"] == "L"
    assert medidas["descripcion"] == "dedos extendidos: pulgar, índice"


@pytest.mark.parametrize("kwargs", [{"landmarks": None}, {"error": RuntimeError("x")}])
def test_should_not_measure_without_a_hand_or_on_error(con_mediapipe, kwargs):
    con_mediapipe(**kwargs)

    assert traduccion.medir_mano_en_frame(None) is None


# ─── Texto → LSC con el diccionario en la BD de pruebas ─────────────────────

@pytest.fixture()
def diccionario(db):
    """Palabras, una frase de dos palabras y las letras de 'SOL'."""
    entradas = ["Hola", "buenas noches", "gracias", "S", "O", "L"]
    unidades = {
        texto: LexicalUnit(
            id_lexicalunit=str(uuid.uuid4()),
            text=texto,
            video_url=f"https://www.youtube.com/watch?v={texto.replace(' ', '')}",
        )
        for texto in entradas
    }
    db.add_all(unidades.values())
    db.commit()
    return {t: u.id_lexicalunit for t, u in unidades.items()}


def test_should_match_phrases_skip_function_words_and_fingerspell(db, diccionario):
    # Act: "buenas noches" es una sola entrada, "a" se omite, "sol" se deletrea
    signs, sin_traducir = traduccion.translate_text_to_lsc(
        "Buenas noches a SOL, gracias amigo", db
    )

    # Assert
    assert [s["word"] for s in signs] == [
        "Buenas noches", "S", "O", "L", "gracias", "amigo",
    ]
    assert sin_traducir == ["amigo"]
    assert signs[-1]["found"] is False


def test_should_ignore_accents_and_case(db, diccionario):
    signs, _ = traduccion.translate_text_to_lsc("HÓLA", db)

    assert signs[0]["id_lexicalunit"] == diccionario["Hola"]


def test_should_return_422_when_there_are_no_words(db):
    with pytest.raises(HTTPException) as error:
        traduccion.translate_text_to_lsc("123 !!", db)

    assert error.value.status_code == 422


def test_should_save_only_the_found_signs_and_continue_the_order(db, make_token, diccionario):
    # Arrange
    id_user = jwt.decode(make_token("Cliente"), options={"verify_signature": False})["sub"]
    sesion = traduccion.resolve_session(None, id_user, "texto", db)
    signs, _ = traduccion.translate_text_to_lsc("hola amigo gracias", db)

    # Act: dos traducciones en la misma sesión
    primera = traduccion.record_translation_details(db, sesion, signs)
    segunda = traduccion.record_translation_details(db, sesion, signs)

    # Assert
    assert (primera, segunda) == (2, 2)
    ordenes = [d.order for d in db.query(TranslationDetail).order_by(TranslationDetail.order)]
    assert ordenes == [1, 2, 3, 4]


def test_should_not_break_the_translation_if_saving_the_detail_fails(db, monkeypatch):
    monkeypatch.setattr(db, "query", lambda *_: (_ for _ in ()).throw(RuntimeError("BD caída")))

    assert traduccion.record_translation_details(db, "sesion", [{"id_lexicalunit": "x"}]) == 0


def test_should_reuse_my_session_and_not_someone_elses(db, make_token):
    # Arrange
    def _id(token):
        return jwt.decode(token, options={"verify_signature": False})["sub"]
    yo, otro = _id(make_token("Cliente")), _id(make_token("Cliente"))
    mia = traduccion.resolve_session(None, yo, "voz", db)

    # Act / Assert
    assert traduccion.resolve_session(mia, yo, "voz", db) == mia
    assert traduccion.resolve_session(mia, otro, "voz", db) != mia
    assert db.query(TranslationSession).count() == 2


# ─── Endpoints /api/traduccion ──────────────────────────────────────────────

def _auth(make_token):
    return {"Authorization": f"Bearer {make_token('Cliente')}"}


def test_should_translate_text_through_the_api(client, make_token, diccionario):
    respuesta = client.post(
        "/api/traduccion/texto", json={"texto": "hola amigo"}, headers=_auth(make_token)
    )

    cuerpo = respuesta.json()
    assert respuesta.status_code == 200
    assert cuerpo["untranslated_words"] == ["amigo"]
    assert cuerpo["message"].startswith("Traducción parcial: 1/2")
    assert cuerpo["id_session"]


def test_should_translate_dictated_text_through_the_api(client, make_token, diccionario):
    respuesta = client.post(
        "/api/traduccion/voz",
        json={"texto_dictado": "gracias", "idioma": "es-CO"},
        headers=_auth(make_token),
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["message"] == "Traducción desde voz completa: 1 seña(s) encontrada(s)."


def test_should_detect_a_letter_from_a_frame_through_the_api(
    client, make_token, con_mediapipe, frame_png
):
    con_mediapipe(landmarks=mano(("menique",)))

    respuesta = client.post(
        "/api/traduccion/frame", json={"frame_base64": frame_png}, headers=_auth(make_token)
    )

    assert respuesta.json()["detected_sign"] == "I"


def test_should_accept_an_uploaded_image_and_reject_other_files(
    client, make_token, con_mediapipe, frame_png
):
    con_mediapipe(landmarks=None)
    h = _auth(make_token)
    png = base64.b64decode(frame_png)

    imagen = client.post("/api/traduccion/frame/upload", files={"file": ("f.png", png, "image/png")}, headers=h)
    pdf = client.post("/api/traduccion/frame/upload", files={"file": ("f.pdf", b"%PDF", "application/pdf")}, headers=h)

    assert imagen.status_code == 200
    assert imagen.json()["detected_sign"] is None
    assert pdf.status_code == 415


def test_should_report_when_calibration_finds_no_hand(client, make_token, con_mediapipe, frame_png):
    con_mediapipe(landmarks=None)

    respuesta = client.post(
        "/api/traduccion/calibrar", json={"frame_base64": frame_png}, headers=_auth(make_token)
    )

    assert respuesta.json()["detectada"] is False
