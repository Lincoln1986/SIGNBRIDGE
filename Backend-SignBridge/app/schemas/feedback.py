from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class FeedbackCreate(BaseModel):
    id_session: str
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


class FeedbackOut(BaseModel):
    id_feedback: str
    id_session:  str
    rating:      int
    comment:     Optional[str] = None
    date:        datetime
    is_reviewed: bool = False

    model_config = {"from_attributes": True}


class FeedbackOutWithUser(FeedbackOut):
    """Igual que FeedbackOut, pero incluye datos de quién dejó la valoración (panel de Soporte/Admin)."""
    user_full_name: str
    user_email:     str


class FeedbackReviewUpdate(BaseModel):
    is_reviewed: bool