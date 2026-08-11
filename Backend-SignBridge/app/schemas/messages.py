from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class MessageCreate(BaseModel):
    id_receiver: str
    content: str

    @field_validator("content")
    @classmethod
    def not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El mensaje no puede estar vacío")
        if len(v) > 2000:
            raise ValueError("El mensaje no puede superar 2000 caracteres")
        return v


class MessageOut(BaseModel):
    id_message:  str
    id_sender:   str
    id_receiver: str
    content:     str
    created_at:  datetime
    read_at:     Optional[datetime] = None

    model_config = {"from_attributes": True}


class ConversationPreview(BaseModel):
    """Resumen de la última conversación con otro usuario."""
    other_user_id:   str
    other_user_name: str
    last_message:    str
    last_message_at: datetime
    unread_count:    int
