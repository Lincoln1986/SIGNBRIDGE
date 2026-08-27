from pydantic import BaseModel, field_validator
from typing import Optional, Literal
from datetime import datetime


class SupportCreate(BaseModel):
    subject: str
    message: str

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El asunto es obligatorio")
        if len(v) > 150:
            raise ValueError("El asunto no puede superar 150 caracteres")
        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("El mensaje es obligatorio")
        if len(v) > 3000:
            raise ValueError("El mensaje no puede superar 3000 caracteres")
        return v


class SupportStatusUpdate(BaseModel):
    status: Literal["pending", "in_progress", "resolved", "closed"]
    response: Optional[str] = None

    @field_validator("response")
    @classmethod
    def validate_response(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 3000:
                raise ValueError("La respuesta no puede superar 3000 caracteres")
        return v


class SupportOut(BaseModel):
    id_support: str
    id_user:    str
    subject:    str
    message:    str
    status:     str
    response:   Optional[str] = None
    date:       datetime

    model_config = {"from_attributes": True}


class SupportOutWithUser(SupportOut):
    """Igual que SupportOut, pero incluye datos de quién abrió el ticket (panel de Soporte/Admin)."""
    user_full_name: str
    user_email:     str
