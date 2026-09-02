from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FavoriteWordOut(BaseModel):
    id_favorite:    str
    id_lexicalunit: str
    word_text:      str
    video_url:      Optional[str] = None
    times_used:     int
    created_at:     datetime

    model_config = {"from_attributes": True}


class FavoriteWordToggle(BaseModel):
    """Respuesta al marcar/desmarcar un favorito."""
    action:      str   # "added" | "removed"
    id_favorite: Optional[str] = None
    id_lexicalunit: str


class FavoriteWordUpdate(BaseModel):
    """Campos editables de un favorito.

    `times_used` se puede corregir a mano (por ejemplo, para reiniciar el
    contador de una palabra que ya se aprendió).
    """
    times_used: Optional[int] = None

    model_config = {"from_attributes": True}

