# app/services/traduccion.py
"""
Servicio de traducción para SignBridge.

Responsabilidades:
  - Decodificar y preprocesar frames (H03).
  - Procesar texto a secuencia de señas LSC (H08 y H16).
  - Consultar la tabla LexicalUnit en PostgreSQL.
  - Registrar logs de errores del sistema.

Nota sobre detección de señas (H03):
  La detección real con MediaPipe requiere el paquete 'mediapipe' instalado y
  un modelo entrenado (.task).  Esta implementación incluye la infraestructura
  completa con un fallback basado en landmarks de manos (MediaPipe Hands)
  para entornos donde el modelo entrenado no esté disponible.
"""
from __future__ import annotations

import base64
import io
import logging
import re
import unicodedata
import uuid
from datetime import datetime
from typing import List, Optional, Tuple

import numpy as np
from fastapi import HTTPException, status
from PIL import Image
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.services.abecedario import clasificar_letra, describir_pose, medir_pose
from app.models.user import (
    LexicalUnit,
    SystemErrorLog,
    TranslationDetail,
    TranslationSession,
)

logger = logging.getLogger(__name__)

# ── Intentar importar MediaPipe (opcional en entornos sin GPU) ────────────────
try:
    import mediapipe as mp  # type: ignore

    _mp_hands = mp.solutions.hands
    MEDIAPIPE_AVAILABLE = True
    logger.info("MediaPipe disponible — detección de señas habilitada.")
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    logger.warning(
        "MediaPipe no instalado. La detección de señas retornará "
        "una respuesta simulada. Instale con: pip install mediapipe"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Utilidades internas
# ─────────────────────────────────────────────────────────────────────────────

def _log_system_error(db: Session, error_type: str, module: str, message: str) -> None:
    """Persiste un registro en SystemErrorLog sin relanzar excepciones."""
    try:
        entry = SystemErrorLog(
            id_error=str(uuid.uuid4()),
            error_type=error_type,
            module=module,
            message=message,
            date=datetime.utcnow(),
        )
        db.add(entry)
        db.commit()
    except Exception as exc:  # pragma: no cover
        logger.error("No se pudo guardar SystemErrorLog: %s", exc)


def _normalize_word(word: str) -> str:
    """Convierte a minúsculas y elimina tildes para comparación flexible."""
    nfkd = unicodedata.normalize("NFKD", word.lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _tokenize(text: str) -> List[str]:
    """Divide el texto en tokens (palabras), eliminando puntuación."""
    tokens = re.findall(r"[a-záéíóúüñA-ZÁÉÍÓÚÜÑ']+", text)
    return [t for t in tokens if t]


# ─────────────────────────────────────────────────────────────────────────────
# Gestión de sesión de traducción
# ─────────────────────────────────────────────────────────────────────────────

def resolve_session(
    session_id: str | None,
    user_id: str,
    translation_type: str,
    db: Session,
) -> str:
    """
    Devuelve un id_session válido para la traducción actual.

    Lógica:
    - session_id llega y es una sesión activa del usuario  → reutiliza.
    - session_id no llega, no existe, o es de otro usuario → crea una nueva
      y persiste en TranslationSession sin interrumpir la traducción.

    Args:
        session_id:       ID recibido del frontend (puede ser None).
        user_id:          ID del usuario autenticado.
        translation_type: "texto" | "voz" — se guarda en translation_type.
        db:               Sesión SQLAlchemy.

    Returns:
        id_session listo para incluir en la respuesta.
    """
    if session_id:
        existing = (
            db.query(TranslationSession)
            .filter(
                TranslationSession.id_session == session_id,
                TranslationSession.id_user    == user_id,
                TranslationSession.deleted_at.is_(None),
            )
            .first()
        )
        if existing:
            logger.debug("Sesión reutilizada: %s", session_id)
            return existing.id_session
        logger.warning(
            "session_id '%s' no encontrado o no pertenece al usuario '%s' — se crea sesión nueva",
            session_id,
            user_id,
        )

    new_session = TranslationSession(
        id_session       = str(uuid.uuid4()),
        id_user          = user_id,
        date_time        = datetime.utcnow(),
        translation_type = translation_type,
        status           = "active",
    )
    db.add(new_session)
    db.commit()
    logger.debug("Sesión nueva creada: %s (tipo=%s)", new_session.id_session, translation_type)
    return new_session.id_session


# ─────────────────────────────────────────────────────────────────────────────
# H03 — Detección de señas desde frame
# ─────────────────────────────────────────────────────────────────────────────

def decode_base64_frame(frame_base64: str) -> np.ndarray:
    """
    Decodifica un frame en Base64 y lo convierte a array NumPy (RGB).

    Raises:
        HTTPException 400: Si los datos no son una imagen válida.
    """
    try:
        image_bytes = base64.b64decode(frame_base64, validate=True)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return np.array(image)
    except (base64.binascii.Error, Exception) as exc:
        logger.error("Error decodificando frame: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El frame recibido no es una imagen válida en Base64.",
        )


def detect_sign_from_frame(
    frame_array: np.ndarray,
    db: Session,
) -> Tuple[Optional[str], Optional[float]]:
    """
    Intenta detectar una seña en el frame usando MediaPipe Hands.

    Retorna:
        (detected_sign, confidence) — ambos None si no se detecta nada.

    Estrategia:
      1. Si MediaPipe está disponible, extrae landmarks de manos.
      2. Con los landmarks se consulta la BD buscando coincidencia
         con el clasificador ligero (placeholder extensible con modelo .task).
      3. Si MediaPipe no está disponible, retorna (None, None) con advertencia.
    """
    if not MEDIAPIPE_AVAILABLE:
        logger.warning("MediaPipe no disponible; no se puede procesar el frame.")
        return None, None

    try:
        with _mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=2,
            min_detection_confidence=0.5,
        ) as hands:
            results = hands.process(frame_array)

        if not results.multi_hand_landmarks:
            return None, None

        # ── Clasificación del abecedario dactilológico ───────────────────────
        # Se usan reglas geométricas sobre los 21 puntos de la mano en lugar de
        # un modelo entrenado. Las letras son poses estáticas que se distinguen
        # por qué dedos están extendidos, así que no hacen falta datos de
        # entrenamiento. Ver app/services/abecedario.py.
        #
        # El reconocimiento de señas completas (con movimiento) necesita un
        # dataset etiquetado y está documentado como HU-28.
        mano = results.multi_hand_landmarks[0].landmark

        letra, confianza = clasificar_letra(mano)

        if letra is None:
            # Se detectó una mano pero la pose no corresponde a ninguna letra
            # conocida. Es preferible no responder a devolver una letra
            # incorrecta: el usuario prefiere reintentar antes que leer algo
            # que no señó.
            logger.info(
                "Mano detectada pero sin letra reconocida (%s)",
                describir_pose(mano),
            )
            return None, None

        return letra, confianza

    except Exception as exc:
        logger.error("Error en detección MediaPipe: %s", exc)
        _log_system_error(
            db,
            error_type="MEDIAPIPE_ERROR",
            module="services.traduccion.detect_sign_from_frame",
            message=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al procesar el frame.",
        )


# ─────────────────────────────────────────────────────────────────────────────
# H08 / H16 — Traducción de texto a LSC
# ─────────────────────────────────────────────────────────────────────────────

def translate_text_to_lsc(
    text: str,
    db: Session,
) -> Tuple[List[dict], List[str]]:
    """
    Traduce un texto libre a secuencia de señas LSC consultando LexicalUnit.

    Retorna:
        signs          -- lista de dicts con campos SignUnit (word, found, video_url, id_lexicalunit)
        untranslated   -- lista de palabras sin entrada en la BD

    Estrategia de simplificación lingüística básica para LSC:
      - LSC omite cópulas, artículos y preposiciones simples.
      - El orden SVO se mantiene para oraciones simples.
      - Las palabras sin traducción directa se intentan como letras deletreadas.
    """
    # Palabras funcionales que LSC suele omitir
    LSC_OMIT = {
        "el", "la", "los", "las", "un", "una", "unos", "unas",
        "de", "del", "al", "a", "en", "con", "por", "para",
        "que", "es", "son", "está", "están", "se",
    }

    tokens = _tokenize(text)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se encontraron palabras válidas en el texto.",
        )

    signs: List[dict] = []
    untranslated: List[str] = []

    # El diccionario se consulta UNA vez, no dentro del bucle: antes se hacía
    # un SELECT completo por cada palabra del texto.
    lexical_units: List[LexicalUnit] = (
        db.query(LexicalUnit)
        .filter(LexicalUnit.deleted_at.is_(None))
        .all()
    )

    # Índice normalizado -> seña. Muchas entradas del diccionario son frases de
    # varias palabras ("buenas noches", "buenos días"), así que se guarda además
    # de cuántas palabras se compone cada clave.
    indice = {}
    max_palabras = 1
    for lu in lexical_units:
        if not lu.text:
            continue
        clave = _normalize_word(lu.text)
        if not clave:
            continue
        indice[clave] = lu
        max_palabras = max(max_palabras, len(clave.split()))

    i = 0
    total = len(tokens)
    while i < total:
        # Coincidencia por frase, de la más larga a la más corta.
        #
        # Antes se recorría palabra por palabra, así que una entrada como
        # "buenas noches" nunca se encontraba: se buscaba "buenas" y "noches"
        # por separado y ambas caían en "sin seña". Ahora se prueba primero el
        # grupo más largo posible y recién después se baja a una sola palabra.
        match = None
        longitud = 0
        for n in range(min(max_palabras, total - i), 0, -1):
            grupo = tokens[i:i + n]
            clave = " ".join(_normalize_word(t) for t in grupo).strip()
            if not clave:
                continue
            candidato = indice.get(clave)
            if candidato:
                match = candidato
                longitud = n
                break

        if match:
            signs.append(
                {
                    "word": " ".join(tokens[i:i + longitud]),
                    "found": True,
                    "video_url": match.video_url,
                    "id_lexicalunit": match.id_lexicalunit,
                }
            )
            i += longitud
            continue

        # Sin coincidencia: se procesa esta palabra sola
        token = tokens[i]
        normalized = _normalize_word(token)
        i += 1

        # Omitir palabras funcionales que LSC no representa. La omisión va
        # DESPUÉS de intentar la frase: si no, "buenas noches" perdería
        # palabras antes de poder buscarse completa.
        if normalized in LSC_OMIT:
            continue

        # Intentar deletrear letra a letra (fallback LSC)
        letter_signs = _try_fingerspell(token, lexical_units)
        if letter_signs:
            signs.extend(letter_signs)
        else:
            untranslated.append(token)
            signs.append(
                {
                    "word": token,
                    "found": False,
                    "video_url": None,
                    "id_lexicalunit": None,
                }
            )

    return signs, untranslated


def record_translation_details(
    db: Session,
    id_session: str,
    signs: List[dict],
) -> int:
    """Guarda en TranslationDetail qué palabras se tradujeron en esta sesión.

    La tabla ya existía en el modelo pero nunca se escribía, así que no había
    forma de saber qué palabras usa la gente. Sin estos registros no se pueden
    calcular las estadísticas de "frases más usadas".

    Solo se guardan las señas que SÍ se encontraron en el diccionario (las que
    traen id_lexicalunit). Las que no existen se siguen reportando aparte en
    `untranslated_words`.

    Devuelve cuántos detalles se guardaron. Nunca lanza excepción: si algo
    falla se registra el error pero la traducción se le entrega igual al
    usuario, porque una estadística no puede romper la funcionalidad.
    """
    guardados = 0
    try:
        # Continuar la numeración si la sesión ya tenía traducciones previas
        ultimo = (
            db.query(func.max(TranslationDetail.order))
            .filter(TranslationDetail.id_session == id_session)
            .scalar()
        ) or 0

        for sign in signs:
            id_lexicalunit = sign.get("id_lexicalunit")
            if not id_lexicalunit:
                continue
            ultimo += 1
            db.add(
                TranslationDetail(
                    id_detail      = str(uuid.uuid4()),
                    id_session     = id_session,
                    id_lexicalunit = id_lexicalunit,
                    order          = ultimo,
                )
            )
            guardados += 1

        if guardados:
            db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.warning("No se pudo registrar el detalle de la traducción: %s", exc)
        _log_system_error(db, "TranslationDetail", "services.traduccion", str(exc))

    return guardados


def _try_fingerspell(
    word: str,
    lexical_units: List[LexicalUnit],
) -> List[dict]:
    """
    Intenta deletrear una palabra letra por letra usando el alfabeto dactilológico LSC.
    Retorna lista vacía si alguna letra no tiene entrada en la BD.
    """
    letter_signs: List[dict] = []
    for char in word.upper():
        if not char.isalpha():
            continue
        match = next(
            (lu for lu in lexical_units if lu.text.upper() == char),
            None,
        )
        if match is None:
            return []  # Si falta alguna letra, no se puede deletrear
        letter_signs.append(
            {
                "word": char,
                "found": True,
                "video_url": match.video_url,
                "id_lexicalunit": match.id_lexicalunit,
            }
        )
    return letter_signs


def medir_mano_en_frame(frame_array: np.ndarray) -> Optional[dict]:
    """Devuelve las mediciones geométricas de la mano en el frame.

    Sirve para calibrar los umbrales del clasificador con manos reales. Los
    valores de `app/services/abecedario.py` son un punto de partida razonable,
    pero la anatomía y la forma de señar varían entre personas: esta función
    permite ver los números concretos y ajustarlos con evidencia en lugar de
    adivinar.

    Devuelve None si MediaPipe no está disponible o no hay manos en el frame.
    """
    if not MEDIAPIPE_AVAILABLE:
        return None

    try:
        with _mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=1,
            min_detection_confidence=0.5,
        ) as hands:
            results = hands.process(frame_array)

        if not results.multi_hand_landmarks:
            return None

        mano = results.multi_hand_landmarks[0].landmark
        letra, confianza = clasificar_letra(mano)

        return {
            "letra_detectada": letra,
            "confianza": confianza,
            "descripcion": describir_pose(mano),
            "mediciones": medir_pose(mano),
        }
    except Exception as exc:  # noqa: BLE001
        logger.warning("No se pudo medir la mano: %s", exc)
        return None
