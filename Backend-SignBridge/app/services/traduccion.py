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
from sqlalchemy.orm import Session

from app.models.user import LexicalUnit, SystemErrorLog, TranslationSession

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

        # ── Clasificación básica con landmarks ────────────────────────────────
        # Aquí se integraría el modelo entrenado (.task / TFLite / ONNX).
        # Por ahora se retorna un placeholder para validar la pipeline completa.
        detected_sign: Optional[str] = None
        confidence: Optional[float] = None

        # Número de landmarks detectados como señal de actividad
        num_hands = len(results.multi_hand_landmarks)
        if num_hands >= 1:
            # Placeholder: cuando se integre el modelo real, reemplazar esta
            # sección por la inferencia del clasificador.
            detected_sign = "seña_detectada"
            confidence = 0.75

        return detected_sign, confidence

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

def _build_omit_set(db: Session) -> set:
    """Conjunto de palabras funcionales que LSC omite.

    Se carga una sola vez por traducción para no repetir la query.
    """
    return {
        "el", "la", "los", "las", "un", "una", "unos", "unas",
        "de", "del", "al", "a", "en", "con", "por", "para",
        "que", "es", "son", "esta", "estan", "se",
    }


def _load_lexical_index(db: Session) -> Tuple[List[LexicalUnit], dict]:
    """Carga todas las unidades léxicas activas y crea un índice normalizado.

    Devuelve (lista_cruda, mapa_normalizado_a_lexicalunit).
    El mapa usa la forma normalizada como clave para búsqueda O(1).
    """
    units = db.query(LexicalUnit).filter(LexicalUnit.deleted_at.is_(None)).all()
    index = {_normalize_word(lu.text): lu for lu in units}
    return units, index


def _match_longest_phrase(
    tokens: List[str],
    start: int,
    lu_index: dict,
    omit: set,
) -> Tuple[Optional[dict], int]:
    """Intenta emparejar el grupo más largo de tokens contra el diccionario.

    Estrategia greedy: prueba 2, 3, 4 … tokens a la vez desde *start*.
    Devuelve (sign_dict, tokens_consumidos) o (None, 0) si no hay match.

    Ejemplo: tokens = ['buenas', 'noches', 'como', 'estas']
      1. Prueba 'buenas noches' → ¡match!
      2. Retorna la entrada y consume 2 tokens.
    """
    max_len = min(len(tokens) - start, 6)  # frases de hasta 6 palabras
    for length in range(max_len, 0, -1):
        phrase_tokens = tokens[start : start + length]
        # Omitir tokens de palabra suelta que LSC descarta
        filtered = [t for t in phrase_tokens if _normalize_word(t) not in omit]
        if not filtered:
            # Todos los tokens de esta frase son funcionales → saltarlos todos
            # y pasar al siguiente token real.
            return None, 0
        # Si la frase contiene tokens funcionales mezclados, ensamblar solo
        # los no-funcionales para comparar con el diccionario.
        if len(filtered) != length:
            phrase_text = " ".join(filtered)
        else:
            phrase_text = " ".join(phrase_tokens)
        normalized = _normalize_word(phrase_text)
        lu = lu_index.get(normalized)
        if lu is not None:
            display = " ".join(phrase_tokens)  # mantiene capitalización original
            return (
                {
                    "word": display,
                    "found": True,
                    "video_url": lu.video_url,
                    "id_lexicalunit": lu.id_lexicalunit,
                },
                length,
            )
    return None, 0


def translate_text_to_lsc(
    text: str,
    db: Session,
) -> Tuple[List[dict], List[str]]:
    """
    Traduce un texto libre a secuencia de señas LSC consultando LexicalUnit.

    Retorna:
        signs          -- lista de dicts con campos SignUnit (word, found, video_url, id_lexicalunit)
        untranslated   -- lista de palabras sin entrada en la BD

    Estrategia:
      1. Cargar el diccionario completo una sola vez (O(n) contra BD).
      2. Para cada posición, intentar emparejar el grupo más largo de tokens
         contra entradas de dos o más palabras del diccionario (greedy).
      3. Si no hay match multioralabra, intentar la palabra individual.
      4. Si no hay match individual, intentar deletrear (fingerspelling).
      5. Los artículos, preposiciones y cópulas se omiten (LSC los descarta).
    """
    omit = _build_omit_set(db)
    all_units, lu_index = _load_lexical_index(db)

    tokens = _tokenize(text)
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No se encontraron palabras válidas en el texto.",
        )

    signs: List[dict] = []
    untranslated: List[str] = []
    i = 0

    while i < len(tokens):
        normalized = _normalize_word(tokens[i])

        # Saltar palabras funcionales sin agregarlas a la secuencia
        if normalized in omit:
            i += 1
            continue

        # 1) Intentar frase multi-palabra (greedy, longitud decreciente)
        phrase_match, consumed = _match_longest_phrase(tokens, i, lu_index, omit)
        if phrase_match is not None and consumed > 0:
            signs.append(phrase_match)
            i += consumed
            continue

        # 2) Buscar palabra individual en el índice
        lu = lu_index.get(normalized)
        if lu is not None:
            signs.append(
                {
                    "word": tokens[i],
                    "found": True,
                    "video_url": lu.video_url,
                    "id_lexicalunit": lu.id_lexicalunit,
                }
            )
            i += 1
            continue

        # 3) Fallback: deletrear letra a letra
        letter_signs = _try_fingerspell(tokens[i], all_units)
        if letter_signs:
            signs.extend(letter_signs)
        else:
            untranslated.append(tokens[i])
            signs.append(
                {
                    "word": tokens[i],
                    "found": False,
                    "video_url": None,
                    "id_lexicalunit": None,
                }
            )
        i += 1

    return signs, untranslated


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
