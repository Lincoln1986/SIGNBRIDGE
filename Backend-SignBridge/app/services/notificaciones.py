"""Creación de notificaciones in-app.

Se centraliza acá para que los routers no repitan la lógica y para que crear
un aviso nunca pueda tumbar la operación que lo originó: si falla el insert,
el ticket igual queda resuelto y el usuario lo ve en su panel.
"""

import logging
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.models.user import Notification

logger = logging.getLogger(__name__)

# Tipos admitidos. El frontend los usa para elegir ícono y destino del clic.
TIPO_TICKET_RESUELTO   = "ticket_resolved"
TIPO_VALORACION_RESPUESTA = "feedback_answered"


def crear_notificacion(
    db: Session,
    id_user: str,
    tipo: str,
    titulo: str,
    cuerpo: Optional[str] = None,
    reference_id: Optional[str] = None,
) -> Optional[Notification]:
    """Crea un aviso para un usuario. Devuelve None si no se pudo crear.

    Es idempotente por (usuario, tipo, referencia): si Soporte vuelve a
    guardar el mismo ticket no se genera un aviso duplicado. La base tiene
    además un índice único que respalda esto.
    """
    try:
        if reference_id:
            ya_existe = (
                db.query(Notification)
                .filter(
                    Notification.id_user      == id_user,
                    Notification.type         == tipo,
                    Notification.reference_id == reference_id,
                    Notification.deleted_at.is_(None),
                )
                .first()
            )
            if ya_existe:
                return ya_existe

        aviso = Notification(
            id_notification = str(uuid.uuid4()),
            id_user         = id_user,
            type            = tipo,
            title           = titulo,
            body            = cuerpo,
            reference_id    = reference_id,
        )
        db.add(aviso)
        db.commit()
        db.refresh(aviso)
        return aviso

    except Exception as exc:  # noqa: BLE001
        # Un aviso que falla no puede romper la acción que lo originó.
        db.rollback()
        logger.warning(
            "No se pudo crear la notificación (%s) para el usuario %s: %s",
            tipo, id_user, exc,
        )
        return None


def notificar_ticket_resuelto(
    db: Session,
    id_user: str,
    id_support: str,
    asunto: str,
    solucion: str,
) -> Optional[Notification]:
    """Avisa al usuario que Soporte resolvió su ticket, con la solución."""
    return crear_notificacion(
        db,
        id_user      = id_user,
        tipo         = TIPO_TICKET_RESUELTO,
        titulo       = f"Tu ticket «{asunto}» fue resuelto",
        cuerpo       = solucion or None,
        reference_id = id_support,
    )


def notificar_respuesta_valoracion(
    db: Session,
    id_user: str,
    id_feedback: str,
    respuesta: str,
) -> Optional[Notification]:
    """Avisa al usuario que Soporte respondió su valoración."""
    return crear_notificacion(
        db,
        id_user      = id_user,
        tipo         = TIPO_VALORACION_RESPUESTA,
        titulo       = "Soporte respondió tu valoración",
        cuerpo       = respuesta or None,
        reference_id = id_feedback,
    )
