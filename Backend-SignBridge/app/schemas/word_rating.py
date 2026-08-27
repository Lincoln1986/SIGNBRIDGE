from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class WordRatingCreate(BaseModel):
    id_lexicalunit: str
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
            if len(v) > 500:
                raise ValueError("El comentario no puede superar 500 caracteres")
        return v


class WordRatingOut(BaseModel):
    id_word_rating: str
    id_lexicalunit: str
    rating:         int
    comment:        Optional[str] = None
    created_at:     datetime

    model_config = {"from_attributes": True}


class WordRatingStatsOut(BaseModel):
    id_lexicalunit: str
    word:           str
    language:       str
    total_ratings:  int = 0
    avg_rating:     Optional[float] = None
    rated_by_users: int = 0
