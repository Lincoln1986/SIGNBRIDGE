"""Schemas de las notificaciones in-app (la campana del menú)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    """Una notificación tal como la ve el usuario."""
    model_config = ConfigDict(from_attributes=True)

    id_notification: str
    type:            str          # ticket_resolved | feedback_answered
    title:           str
    body:            Optional[str] = None
    reference_id:    Optional[str] = None
    read_at:         Optional[datetime] = None
    created_at:      Optional[datetime] = None


class UnreadCount(BaseModel):
    """Cantidad de notificaciones sin leer — es lo único que necesita el
    badge rojo de la campana, así que se consulta aparte para no traer
    la lista completa en cada revisión."""
    unread: int


class MarkReadResult(BaseModel):
    """Resultado de marcar como leídas."""
    updated: int
    unread:  int
