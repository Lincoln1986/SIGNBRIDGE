from pydantic import BaseModel, field_validator, model_validator
from typing import Optional
from datetime import datetime


class FeedbackCreate(BaseModel):
    id_session: Optional[str] = None
    id_lexicalunit: Optional[str] = None
    rating: int
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("El rating debe estar entre 1 y 5")
        return v

    @field_validator("comment")
    @classmethod
    def trim_comment(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 1000:
                raise ValueError("El comentario no puede superar 1000 caracteres")
        return v

    @model_validator(mode="after")
    def require_session_or_word(self):
        """El feedback debe ser sobre una sesión de traducción o sobre una palabra puntual."""
        if not self.id_session and not self.id_lexicalunit:
            raise ValueError("Debes indicar id_session o id_lexicalunit para registrar el feedback")
        return self


class FeedbackOut(BaseModel):
    id_feedback:      str
    id_session:       Optional[str] = None
    id_lexicalunit:   Optional[str] = None
    rating:           int
    comment:          Optional[str] = None
    date:             datetime
    is_reviewed:      bool = False
    support_response: Optional[str] = None

    model_config = {"from_attributes": True}


class FeedbackOutWithUser(FeedbackOut):
    """Igual que FeedbackOut, pero incluye datos de quién dejó la valoración (panel de Soporte/Admin)."""
    user_full_name: str
    user_email:     str


class FeedbackReviewUpdate(BaseModel):
    """Marca (o desmarca) una valoración como revisada.

    Para marcar como revisada (is_reviewed=True) Soporte debe dar una respuesta:
    - `response`: respuesta manual, siempre permitida.
    - `quick_reply`: clave de una respuesta rápida (ver GET /feedback/quick-replies),
      solo permitida cuando la valoración tiene rating 4 o 5.
    """
    is_reviewed: bool
    response: Optional[str] = None
    quick_reply: Optional[str] = None

    @field_validator("response")
    @classmethod
    def trim_response(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
        return v or None


class WordRatingSummary(BaseModel):
    """Promedio de calificación de la traducción de una palabra (público para usuarios autenticados)."""
    id_lexicalunit: str
    word: str
    average_rating: float
    total_ratings: int
