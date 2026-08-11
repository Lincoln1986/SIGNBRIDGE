# app/schemas/traduccion.py
"""
Esquemas Pydantic para los endpoints de traducción:
  - H03: frame → seña detectada
  - H08: texto → secuencia de señas LSC
  - H16: texto dictado por voz → señas LSC
"""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
import re


# ── H03 ───────────────────────────────────────────────────────────────────────

class FrameRequest(BaseModel):
    """Payload para POST /api/traduccion/frame (base64)."""

    frame_base64: str = Field(
        ...,
        description="Imagen del frame codificada en Base64 (sin prefijo data:image/…;base64,).",
        min_length=10,
    )
    session_id: Optional[str] = Field(
        None,
        description="ID de sesión activa del usuario (opcional).",
    )

    @field_validator("frame_base64")
    @classmethod
    def strip_data_uri(cls, v: str) -> str:
        """Elimina el prefijo 'data:image/...;base64,' si viene incluido."""
        if "," in v:
            v = v.split(",", 1)[1]
        return v.strip()


class FrameResponse(BaseModel):
    """Respuesta de POST /api/traduccion/frame."""

    detected_sign: Optional[str] = Field(
        None,
        description="Texto de la seña detectada. None si no se reconoció ninguna.",
    )
    confidence: Optional[float] = Field(
        None,
        description="Nivel de confianza del modelo (0.0 – 1.0).",
        ge=0.0,
        le=1.0,
    )
    message: str = Field(
        ...,
        description="Mensaje descriptivo del resultado.",
    )


# ── H08 ───────────────────────────────────────────────────────────────────────

class TextoTraduccionRequest(BaseModel):
    """Payload para POST /api/traduccion/texto."""

    texto: str = Field(
        ...,
        description="Texto libre en español para traducir a LSC.",
        min_length=1,
        max_length=1000,
    )
    session_id: Optional[str] = Field(
        None,
        description="ID de sesión activa del usuario (opcional).",
    )

    @field_validator("texto")
    @classmethod
    def normalize_text(cls, v: str) -> str:
        v = v.strip()
        # Eliminar caracteres especiales que no aportan a la traducción
        v = re.sub(r"[^\w\s áéíóúüñÁÉÍÓÚÜÑ.,!?¿¡'-]", "", v)
        if not v:
            raise ValueError("El texto no puede estar vacío o contener sólo caracteres especiales.")
        return v


class SignUnit(BaseModel):
    """Unidad léxica dentro de la respuesta de traducción a LSC."""

    word: str = Field(..., description="Palabra o frase buscada en el diccionario LSC.")
    found: bool = Field(..., description="True si existe entrada en la base de datos LSC.")
    video_url: Optional[str] = Field(None, description="URL del video de la seña en LSC.")
    id_lexicalunit: Optional[str] = Field(None, description="ID de la unidad léxica en BD.")


class TextoTraduccionResponse(BaseModel):
    """Respuesta de POST /api/traduccion/texto."""

    original_text: str = Field(..., description="Texto original enviado por el usuario.")
    id_session: str = Field(
        ...,
        description="ID de la TranslationSession creada o reutilizada. "
                    "Guárdalo en el frontend para enviarlo en llamadas siguientes "
                    "y al registrar feedback.",
    )
    signs: List[SignUnit] = Field(
        default_factory=list,
        description="Lista ordenada de unidades léxicas en LSC.",
    )
    untranslated_words: List[str] = Field(
        default_factory=list,
        description="Palabras sin traducción disponible en LSC.",
    )
    message: str = Field(..., description="Mensaje descriptivo del resultado.")


# ── H16 ───────────────────────────────────────────────────────────────────────

class VozTraduccionRequest(BaseModel):
    """Payload para POST /api/traduccion/voz."""

    texto_dictado: str = Field(
        ...,
        description="Texto generado por la Web Speech API desde el frontend.",
        min_length=1,
        max_length=1000,
    )
    session_id: Optional[str] = Field(
        None,
        description="ID de sesión activa del usuario (opcional).",
    )
    idioma: str = Field(
        "es-CO",
        description="Código de idioma detectado por la Web Speech API (ej. 'es-CO').",
    )

    @field_validator("texto_dictado")
    @classmethod
    def normalize_dictated(cls, v: str) -> str:
        v = v.strip()
        v = re.sub(r"[^\w\s áéíóúüñÁÉÍÓÚÜÑ.,!?¿¡'-]", "", v)
        if not v:
            raise ValueError("El texto dictado no puede estar vacío.")
        return v


class VozTraduccionResponse(BaseModel):
    """Respuesta de POST /api/traduccion/voz."""

    texto_reconocido: str = Field(
        ...,
        description="Texto dictado recibido del frontend.",
    )
    id_session: str = Field(
        ...,
        description="ID de la TranslationSession creada o reutilizada. "
                    "Guárdalo en el frontend para enviarlo en llamadas siguientes "
                    "y al registrar feedback.",
    )
    signs: List[SignUnit] = Field(
        default_factory=list,
        description="Lista ordenada de unidades léxicas en LSC.",
    )
    untranslated_words: List[str] = Field(
        default_factory=list,
        description="Palabras sin traducción disponible en LSC.",
    )
    message: str = Field(..., description="Mensaje descriptivo del resultado.")
