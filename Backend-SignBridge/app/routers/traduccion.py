# app/routers/traduccion.py
"""
Router de traducción — SignBridge

Endpoints implementados:
  H03  POST /api/traduccion/frame   — frame a seña detectada (tiempo real)
  H08  POST /api/traduccion/texto   — texto libre a secuencia de señas LSC
  H16  POST /api/traduccion/voz     — texto dictado por voz a señas LSC
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.traduccion import (
    FrameRequest,
    FrameResponse,
    TextoTraduccionRequest,
    TextoTraduccionResponse,
    VozTraduccionRequest,
    VozTraduccionResponse,
    SignUnit,
)
from app.services.traduccion import (
    decode_base64_frame,
    detect_sign_from_frame,
    translate_text_to_lsc,
    resolve_session,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/traduccion",
    tags=["Traducción LSC"],
)


# ─────────────────────────────────────────────────────────────────────────────
# H03 — Procesamiento de frames para detección de señas en tiempo real
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/frame",
    response_model=FrameResponse,
    summary="H03 — Detectar seña desde un frame de video",
    description="""
Recibe un frame de video del frontend en **Base64** y utiliza MediaPipe Hands
para detectar la posición de las manos. El resultado se devuelve como el texto
de la seña detectada junto con el nivel de confianza.

- Si el frame no contiene manos detectables se retorna `detected_sign: null`.
- Si la imagen no es válida se retorna HTTP 400.
- Acepta el prefijo `data:image/...;base64,` o el string Base64 puro.
    """,
    status_code=status.HTTP_200_OK,
)
def procesar_frame(
    payload: FrameRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FrameResponse:
    """
    Procesa un frame y retorna la seña detectada.

    **Body (JSON):**
    - `frame_base64` (str, requerido): imagen codificada en Base64.
    - `session_id` (str, opcional): ID de sesión activa.

    **Respuesta 200:**
    - `detected_sign`: texto de la seña o null.
    - `confidence`: nivel de confianza (0.0–1.0) o null.
    - `message`: descripción del resultado.
    """
    logger.info("H03 frame recibido — usuario: %s", current_user.id_user)

    frame_array = decode_base64_frame(payload.frame_base64)
    detected_sign, confidence = detect_sign_from_frame(frame_array, db)

    if detected_sign is None:
        return FrameResponse(
            detected_sign=None,
            confidence=None,
            message="No se detectó ninguna seña en el frame.",
        )

    return FrameResponse(
        detected_sign=detected_sign,
        confidence=confidence,
        message=f"Seña detectada: '{detected_sign}'.",
    )


@router.post(
    "/frame/upload",
    response_model=FrameResponse,
    summary="H03 — Detectar seña desde archivo de imagen (multipart)",
    description="""
Alternativa multipart/form-data para enviar el frame como archivo de imagen
directamente (JPEG, PNG, WebP). Útil para clientes que prefieren no codificar
en Base64.
    """,
    status_code=status.HTTP_200_OK,
)
async def procesar_frame_multipart(
    file: Annotated[UploadFile, File(description="Archivo de imagen del frame.")],
    session_id: Annotated[str | None, Form(description="ID de sesión (opcional).")] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FrameResponse:
    """
    Procesa un frame enviado como archivo multipart y retorna la seña detectada.

    **Form data:**
    - `file` (UploadFile, requerido): archivo de imagen.
    - `session_id` (str, opcional): ID de sesión activa.
    """
    logger.info("H03 frame multipart recibido — usuario: %s", current_user.id_user)

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo de archivo no soportado: {file.content_type}. Use JPEG, PNG o WebP.",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > 10 * 1024 * 1024:  # 10 MB máximo
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 10 MB.",
        )

    import base64 as b64
    frame_b64 = b64.b64encode(raw_bytes).decode()

    from app.schemas.traduccion import FrameRequest as FR
    payload = FR(frame_base64=frame_b64, session_id=session_id)

    frame_array = decode_base64_frame(payload.frame_base64)
    detected_sign, confidence = detect_sign_from_frame(frame_array, db)

    if detected_sign is None:
        return FrameResponse(
            detected_sign=None,
            confidence=None,
            message="No se detectó ninguna seña en el frame.",
        )

    return FrameResponse(
        detected_sign=detected_sign,
        confidence=confidence,
        message=f"Seña detectada: '{detected_sign}'.",
    )


# ─────────────────────────────────────────────────────────────────────────────
# H08 — Traducción de texto libre a señas en LSC
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/texto",
    response_model=TextoTraduccionResponse,
    summary="H08 — Traducir texto libre a secuencia de señas LSC",
    description="""
Recibe un texto en español y retorna la secuencia ordenada de unidades léxicas
en Lengua de Señas Colombiana (LSC) con las URLs de los videos correspondientes.

**Comportamiento para palabras sin traducción:**
- Se intenta deletrear la palabra letra a letra (alfabeto dactilológico LSC).
- Si tampoco existe entrada letra a letra, la palabra se incluye en
  `untranslated_words` y su entrada en `signs` tendrá `found: false`.

**Simplificación lingüística básica:**
- Se omiten artículos, preposiciones simples y cópulas, ya que LSC
  generalmente los omite en su gramática visual-gestual.
    """,
    status_code=status.HTTP_200_OK,
)
def traducir_texto(
    payload: TextoTraduccionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TextoTraduccionResponse:
    """
    Traduce texto libre a LSC consultando la tabla LexicalUnit.

    **Body (JSON):**
    - `texto` (str, requerido): texto en español (máx. 1000 caracteres).
    - `session_id` (str, opcional): ID de sesión activa.

    **Respuesta 200:**
    - `original_text`: texto original.
    - `signs`: lista de `SignUnit` con video_url por cada seña.
    - `untranslated_words`: palabras sin cobertura en LSC.
    - `message`: resumen del resultado.
    """
    logger.info(
        "H08 traducción de texto — usuario: %s — texto: '%.50s…'",
        current_user.id_user,
        payload.texto,
    )

    signs_raw, untranslated = translate_text_to_lsc(payload.texto, db)
    signs = [SignUnit(**s) for s in signs_raw]

    total = len(signs)
    found = sum(1 for s in signs if s.found)

    if total == 0:
        message = "No se encontraron señas para el texto proporcionado."
    elif untranslated:
        message = (
            f"Traducción parcial: {found}/{total} señas encontradas. "
            f"Palabras sin traducción: {', '.join(untranslated)}."
        )
    else:
        message = f"Traducción completa: {found} seña(s) encontrada(s)."

    session_id = resolve_session(
        payload.session_id, current_user.id_user, "texto", db
    )

    return TextoTraduccionResponse(
        original_text=payload.texto,
        id_session=session_id,
        signs=signs,
        untranslated_words=untranslated,
        message=message,
    )


# ─────────────────────────────────────────────────────────────────────────────
# H16 — Procesamiento de texto dictado por voz para traducir a señas
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/voz",
    response_model=VozTraduccionResponse,
    summary="H16 — Traducir texto dictado por voz a señas LSC",
    description="""
Recibe el texto generado por la **Web Speech API** del navegador y lo traduce
a señas en LSC. El frontend convierte el audio a texto antes de enviarlo;
este endpoint procesa ese texto de la misma forma que `/api/traduccion/texto`.

**Campos adicionales respecto a /texto:**
- `idioma`: código de idioma detectado por la Web Speech API (ej. `"es-CO"`).
- `texto_reconocido`: eco del texto dictado para confirmación visual.

Reutiliza completamente la lógica de traducción de H08.
    """,
    status_code=status.HTTP_200_OK,
)
def traducir_voz(
    payload: VozTraduccionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VozTraduccionResponse:
    """
    Traduce texto dictado por voz a LSC.

    **Body (JSON):**
    - `texto_dictado` (str, requerido): texto transcrito por Web Speech API.
    - `session_id` (str, opcional): ID de sesión activa.
    - `idioma` (str, opcional): código de idioma (default `"es-CO"`).

    **Respuesta 200:**
    - `texto_reconocido`: texto dictado original.
    - `signs`: lista de `SignUnit` con video_url por cada seña.
    - `untranslated_words`: palabras sin cobertura en LSC.
    - `message`: resumen del resultado.
    """
    logger.info(
        "H16 traducción de voz — usuario: %s — idioma: %s — texto: '%.50s…'",
        current_user.id_user,
        payload.idioma,
        payload.texto_dictado,
    )

    # Reutiliza la lógica central de H08
    signs_raw, untranslated = translate_text_to_lsc(payload.texto_dictado, db)
    signs = [SignUnit(**s) for s in signs_raw]

    total = len(signs)
    found = sum(1 for s in signs if s.found)

    if total == 0:
        message = "No se encontraron señas para el texto dictado."
    elif untranslated:
        message = (
            f"Traducción parcial desde voz: {found}/{total} señas encontradas. "
            f"Palabras sin traducción: {', '.join(untranslated)}."
        )
    else:
        message = f"Traducción desde voz completa: {found} seña(s) encontrada(s)."

    session_id = resolve_session(
        payload.session_id, current_user.id_user, "voz", db
    )

    return VozTraduccionResponse(
        texto_reconocido=payload.texto_dictado,
        id_session=session_id,
        signs=signs,
        untranslated_words=untranslated,
        message=message,
    )
