import logging
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin, require_support_or_admin, require_support
from app.models.user import Support, User
from app.schemas.support import SupportCreate, SupportOut, SupportOutWithUser, SupportStatusUpdate
from app.services.mail import send_ticket_resolved_email
from app.services.notificaciones import notificar_ticket_resuelto

logger = logging.getLogger(__name__)

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
              summary="Cambiar estado de un ticket (exclusivo de Soporte)",
              tags=["Soporte"])
async def update_ticket_status_support(
    id_support: str,
    payload: SupportStatusUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_support),
):
    """Actualiza el estado de un ticket. Estados válidos: pending, in_progress, resolved, closed.

    Solucionar un ticket (pasarlo a 'resolved') es una acción exclusiva del rol Soporte,
    y requiere que se envíe el texto de la solución. El Admin puede ver los tickets
    (GET /support/all) pero no puede cambiar su estado.
    """
    ticket = db.query(Support).filter(
        Support.id_support  == id_support,
        Support.deleted_at.is_(None),
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    paso_a_resuelto = payload.status == "resolved" and ticket.status != "resolved"

    ticket.status     = payload.status
    if payload.solution:
        ticket.solution = payload.solution
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)

    # Notificar al usuario que su ticket quedó resuelto, con la solución que
    # escribió Soporte. Solo la primera vez que pasa a 'resolved', para no
    # spamear si el estado se vuelve a guardar.
    if paso_a_resuelto:
        dueno = db.query(User).filter(User.id_user == ticket.id_user).first()
        if dueno:
            # Aviso dentro de la app (campana). Va primero porque no depende
            # de que el SMTP esté configurado: el correo puede fallar, esto no.
            notificar_ticket_resuelto(
                db,
                id_user    = dueno.id_user,
                id_support = ticket.id_support,
                asunto     = ticket.subject or "sin asunto",
                solucion   = ticket.solution or "",
            )
            try:
                await send_ticket_resolved_email(
                    to_email       = dueno.email,
                    first_name     = dueno.first_name,
                    subject_ticket = ticket.subject,
                    solution       = ticket.solution or "",
                )
            except Exception as exc:  # noqa: BLE001
                # El correo no puede tumbar la operación: el ticket ya quedó
                # resuelto en la base y el usuario lo ve igual en su panel.
                logger.warning(
                    "No se pudo notificar al usuario %s del ticket %s: %s",
                    dueno.email, ticket.id_support, exc,
                )

    return ticket


@router.put("/{id_support}", response_model=SupportOut,
            summary="Editar mi ticket")
def update_my_ticket(
    id_support: str,
    payload: SupportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permite al autor corregir el asunto o el mensaje de su ticket.

    Solo mientras siga pendiente: una vez que Soporte lo tomó, cambiar el
    enunciado dejaría la solución sin contexto.
    """
    ticket = (
        db.query(Support)
        .filter(
            Support.id_support == id_support,
            Support.id_user    == current_user.id_user,
            Support.deleted_at.is_(None),
        )
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    if ticket.status != "pending":
        raise HTTPException(
            status_code=409,
            detail="Solo se puede editar un ticket que siga pendiente",
        )

    ticket.subject    = payload.subject
    ticket.message    = payload.message
    ticket.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ticket)
    return ticket


@router.delete("/{id_support}", status_code=204,
               summary="Eliminar mi ticket")
def delete_my_ticket(
    id_support: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Borrado lógico del ticket propio.

    No se borra la fila: se marca `deleted_at`. Así el historial de soporte
    queda íntegro para las estadísticas, pero el ticket deja de aparecer.
    """
    ticket = (
        db.query(Support)
        .filter(
            Support.id_support == id_support,
            Support.id_user    == current_user.id_user,
            Support.deleted_at.is_(None),
        )
        .first()
    )
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    ticket.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return None
