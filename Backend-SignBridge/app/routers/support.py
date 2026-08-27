import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin, require_support_or_admin
from app.models.user import Support, User, Notification
from app.schemas.support import SupportCreate, SupportOut, SupportOutWithUser, SupportStatusUpdate

router = APIRouter(prefix="/support", tags=["Soporte"])

VALID_STATUSES = {"pending", "in_progress", "resolved", "closed"}


@router.post("", response_model=SupportOut, status_code=201,
             summary="Crear ticket de soporte")
def create_ticket(
    payload: SupportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Abre un nuevo ticket de soporte para el usuario autenticado."""
    ticket = Support(
        id_support = str(uuid.uuid4()),
        id_user    = current_user.id_user,
        subject    = payload.subject,
        message    = payload.message,
        status     = "pending",
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/my", response_model=List[SupportOut],
            summary="Tickets del usuario autenticado")
def my_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos los tickets del usuario autenticado, del más reciente al más antiguo."""
    return (
        db.query(Support)
        .filter(
            Support.id_user    == current_user.id_user,
            Support.deleted_at.is_(None),
        )
        .order_by(Support.date.desc())
        .all()
    )


@router.get("/admin/all", response_model=List[SupportOut],
            summary="Todos los tickets (solo admin)")
def all_tickets(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Lista todos los tickets del sistema. Requiere rol admin. (Se mantiene por compatibilidad.)"""
    return (
        db.query(Support)
        .filter(Support.deleted_at.is_(None))
        .order_by(Support.date.desc())
        .all()
    )


@router.get("/all", response_model=List[SupportOutWithUser],
            summary="Todos los tickets, con datos de quién lo creó (Soporte o Admin)")
def all_tickets_for_support(
    db: Session = Depends(get_db),
    _user: User = Depends(require_support_or_admin),
):
    """Lista todos los tickets del sistema junto con el nombre/correo del usuario que
    lo creó. Pensado para el Panel de Soporte (accesible a Soporte y Admin)."""
    rows = (
        db.query(Support, User)
        .join(User, User.id_user == Support.id_user)
        .filter(Support.deleted_at.is_(None))
        .order_by(Support.date.desc())
        .all()
    )
    return [
        SupportOutWithUser(
            id_support     = ticket.id_support,
            id_user        = ticket.id_user,
            subject        = ticket.subject,
            message        = ticket.message,
            status         = ticket.status,
            date           = ticket.date,
            user_full_name = f"{user.first_name} {user.last_name}",
            user_email     = user.email,
        )
        for ticket, user in rows
    ]


@router.patch("/{id_support}/status", response_model=SupportOut,
              summary="Cambiar estado de un ticket (Soporte o Admin)",
              tags=["Soporte"])
def update_ticket_status_support(
    id_support: str,
    payload: SupportStatusUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_support_or_admin),
):
    """Actualiza el estado de un ticket. Estados válidos: pending, in_progress, resolved, closed.
    Accesible para los roles Soporte y Admin."""
    ticket = db.query(Support).filter(
        Support.id_support  == id_support,
        Support.deleted_at.is_(None),
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    # Si el estado es "resolved", se requiere una respuesta/retroalimentación
    if payload.status == "resolved":
        if not payload.response or not payload.response.strip():
            raise HTTPException(
                status_code=422,
                detail="Se requiere una respuesta/retroalimentación para marcar un ticket como resuelto",
            )
        ticket.response = payload.response.strip()

    # Si se proporciona respuesta, guardarla (para in_progress también)
    if payload.response and payload.response.strip() and payload.status != "resolved":
        ticket.response = payload.response.strip()

    ticket.status     = payload.status
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)

    # Crear notificación al usuario dueño del ticket
    if ticket.id_user:
        STATUS_LABELS = {
            "pending": "Pendiente",
            "in_progress": "En proceso",
            "resolved": "Resuelto",
            "closed": "Cerrado",
        }
        status_label = STATUS_LABELS.get(payload.status, payload.status)
        notif_title = f"Tu ticket '{ticket.subject}' cambió a: {status_label}"
        notif_msg = (
            f"Tu ticket de soporte '{ticket.subject}' ha sido actualizado a estado '{status_label}'."
        )
        if payload.response:
            notif_msg += f"\n\nRespuesta del equipo: {payload.response}"

        notif = Notification(
            id_notification=str(uuid.uuid4()),
            id_user=ticket.id_user,
            title=notif_title,
            message=notif_msg,
            type="ticket_update",
            related_id=ticket.id_support,
            related_type="support",
        )
        db.add(notif)
        db.commit()

    return ticket