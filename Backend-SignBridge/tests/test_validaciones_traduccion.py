"""Validaciones de lo que llega a los endpoints de traducción y mensajería.

Autor: @javierperez14 · S2 (capa API: unitarias de los esquemas que reciben los endpoints)

Es lo que se guarda después en TranslationSession, SignInput, VoiceInput y
Message: si la validación deja pasar basura, la basura queda en la base.
"""
import pytest
from pydantic import ValidationError

from app.schemas.messages import MessageCreate
from app.schemas.traduccion import (
    FrameRequest,
    TextoTraduccionRequest,
    VozTraduccionRequest,
)


# ── Texto y voz a señas ──────────────────────────────────────────────────────

@pytest.mark.parametrize(
    ("entrada", "guardado"),
    [
        ("  hola amigo  ", "hola amigo"),           # quita espacios de los extremos
        ("¿Cómo estás? 😀", "¿Cómo estás?"),        # el emoji no aporta a la traducción
        ("buenas <script>noches", "buenas scriptnoches"),  # quita < y >
        ("niño, mañana", "niño, mañana"),           # tildes, ñ y comas se conservan
    ],
)
def test_should_keep_only_characters_useful_for_the_translation(entrada, guardado):
    assert TextoTraduccionRequest(texto=entrada).texto == guardado


@pytest.mark.parametrize("entrada", ["   ", "😀😀", "@@##"])
def test_should_reject_text_with_nothing_to_translate(entrada):
    with pytest.raises(ValidationError, match="no puede estar vacío"):
        TextoTraduccionRequest(texto=entrada)


@pytest.mark.parametrize(("largo", "valido"), [(1, True), (1000, True), (1001, False), (0, False)])
def test_should_limit_the_text_from_1_to_1000_characters(largo, valido):
    texto = "a" * largo
    if valido:
        assert len(TextoTraduccionRequest(texto=texto).texto) == largo
    else:
        with pytest.raises(ValidationError):
            TextoTraduccionRequest(texto=texto)


def test_should_clean_dictated_text_the_same_way_and_default_to_colombian_spanish():
    voz = VozTraduccionRequest(texto_dictado="  hola 😀 ")

    assert (voz.texto_dictado, voz.idioma) == ("hola", "es-CO")


def test_should_reject_empty_dictation():
    with pytest.raises(ValidationError, match="dictado no puede estar vacío"):
        VozTraduccionRequest(texto_dictado="  ")


# ── Frames de la cámara ──────────────────────────────────────────────────────

@pytest.mark.parametrize(
    ("entrada", "guardado"),
    [
        ("data:image/jpeg;base64,AAAABBBBCCCC", "AAAABBBBCCCC"),  # como lo manda canvas.toDataURL
        ("  AAAABBBBCCCC  ", "AAAABBBBCCCC"),
    ],
)
def test_should_store_only_the_base64_of_the_frame(entrada, guardado):
    assert FrameRequest(frame_base64=entrada).frame_base64 == guardado


@pytest.mark.parametrize(("largo", "valido"), [(9, False), (10, True)])
def test_should_require_at_least_10_characters_of_frame(largo, valido):
    frame = "A" * largo
    if valido:
        assert FrameRequest(frame_base64=frame).frame_base64 == frame
    else:
        with pytest.raises(ValidationError):
            FrameRequest(frame_base64=frame)


# ── Mensajes ─────────────────────────────────────────────────────────────────

@pytest.mark.parametrize(("largo", "valido"), [(2000, True), (2001, False)])
def test_should_limit_messages_to_2000_characters(largo, valido):
    if valido:
        assert len(MessageCreate(id_receiver="u2", content="m" * largo).content) == 2000
    else:
        with pytest.raises(ValidationError, match="2000 caracteres"):
            MessageCreate(id_receiver="u2", content="m" * largo)


def test_should_reject_a_message_with_only_spaces():
    with pytest.raises(ValidationError, match="no puede estar vacío"):
        MessageCreate(id_receiver="u2", content="   ")
