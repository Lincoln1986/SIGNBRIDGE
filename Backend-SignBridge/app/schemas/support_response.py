from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class SupportResponseCreate(BaseModel):
    content: str
    is_auto: bool = False

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("La respuesta no puede estar vacía")
        if len(v) > 2000:
            raise ValueError("La respuesta no puede superar 2000 caracteres")
        return v


class SupportResponseOut(BaseModel):
    id_response:  str
    id_support:   str
    id_responder: str
    content:      str
    is_auto:      bool = False
    created_at:   datetime
    responder_name: Optional[str] = None

    model_config = {"from_attributes": True}


class SupportStatusWithResponse(BaseModel):
    """Permite cambiar estado + adjuntar respuesta (requerida al resolver)."""
    status: str
    response: Optional[str] = None

    @field_validator("response")
    @classmethod
    def validate_response(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if len(v) > 2000:
                raise ValueError("La respuesta no puede superar 2000 caracteres")
        return v
