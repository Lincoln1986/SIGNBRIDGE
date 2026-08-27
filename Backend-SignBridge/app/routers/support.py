import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin, require_support_or_admin
from app.models.user import Support, SupportResponse, User, Notification
from app.schemas.support import SupportCreate, SupportOut, SupportOutWithUser, SupportStatusUpdate
from app.schemas.support_response import (
    SupportResponseCreate,
    SupportResponseOut,
    SupportStatusWithResponse,
)

router = APIRouter(prefix="/support", tags=["Soporte"])

VALID_STATUSES = {"pending", "in_progress", "resolved", "closed"}


def _notify_user(
    db: Session,
    user_id: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    notif_type: str = "info",
):
    notif = Notification(
        id_notification=str(uuid.uuid4()),
        id_user=user_id,
        title=title,
        message=message,
        type=notif_type,
        link=link,
    )
    db.add(notif)


@router.post("", response_model=SupportOut, status_code=201,
             summary="Crear ticket de soporte")
def create_ticket(
    payload: SupportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = Support(
        id_support=str(uuid.uuid4()),
        id_user=current_user.id_user,
        subject=payload.subject,
        message=payload.message,
        status="pending",
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
    return (
        db.query(Support)
        .filter(
            Support.id_user == current_user.id_user,
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
    return (
        db.query(Support)
        .filter(Support.deleted_at.is_(None))
        .order_by(Support.date.desc())
        .all()
    )


@router.get("/all", response_model=List[SupportOutWithUser],
            summary="Todos los tickets, con datos del usuario (Soporte o Admin)")
def all_tickets_for_support(
    db: Session = Depends(get_db),
    _user: User = Depends(require_support_or_admin),
):
    rows = (
        db.query(Support, User)
        .join(User, User.id_user == Support.id_user)
        .filter(Support.deleted_at.is_(None))
        .order_by(Support.date.desc())
        .all()
    )
    return [
        SupportOutWithUser(
            id_support=ticket.id_support,
            id_user=ticket.id_user,
            subject=ticket.subject,
            message=ticket.message,
            status=ticket.status,
            date=ticket.date,
            has_response=ticket.has_response,
            user_full_name=f"{user.first_name} {user.last_name}",
            user_email=user.email,
        )
        for ticket, user in rows
    ]


@router.patch("/{id_support}/status", response_model=SupportOut,
              summary="Cambiar estado de un ticket (Solo Soporte)",
              tags=["Soporte"])
def update_ticket_status_support(
    id_support: str,
    payload: SupportStatusWithResponse,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.role_name.lower()
    if role_name not in ("soporte",):
        raise HTTPException(
            status_code=403,
            detail="Solo el equipo de soporte puede cambiar el estado de un ticket. "
                   "El administrador solo puede visualizar tickets.",
        )

    if payload.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Estado invalido: {payload.status}")

    ticket = db.query(Support).filter(
        Support.id_support == id_support,
        Support.deleted_at.is_(None),
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    if payload.status == "resolved" and not payload.response:
        raise HTTPException(
            status_code=400,
            detail="Para marcar un ticket como resuelto es obligatorio enviar una respuesta.",
        )

    ticket.status = payload.status
    ticket.updated_at = datetime.now(timezone.utc)

    if payload.response:
        resp = SupportResponse(
            id_response=str(uuid.uuid4()),
            id_support=id_support,
            id_responder=current_user.id_user,
            content=payload.response.strip(),
            is_auto=False,
        )
        db.add(resp)
        ticket.has_response = True

        _notify_user(
            db,
            ticket.id_user,
            title="Tu ticket de soporte ha sido respondido",
            message=f"Tu ticket '{ticket.subject}' recibio una respuesta del equipo de soporte.",
            link="/dashboard",
            notif_type="support",
        )

    db.commit()
    db.refresh(ticket)
    return ticket


@router.get("/{id_support}/responses", response_model=List[SupportResponseOut],
            summary="Ver respuestas de un ticket")
def get_ticket_responses(
    id_support: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Support).filter(
        Support.id_support == id_support,
        Support.deleted_at.is_(None),
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    role = current_user.role.role_name.lower()
    is_owner = ticket.id_user == current_user.id_user
    is_support = role in ("soporte", "admin", "administrador")
    if not is_owner and not is_support:
        raise HTTPException(status_code=403, detail="Acceso denegado")

    responses = (
        db.query(SupportResponse, User)
        .join(User, User.id_user == SupportResponse.id_responder)
        .filter(
            SupportResponse.id_support == id_support,
            SupportResponse.deleted_at.is_(None),
        )
        .order_by(SupportResponse.created_at)
        .all()
    )
    return [
        SupportResponseOut(
            id_response=r.id_response,
            id_support=r.id_support,
            id_responder=r.id_responder,
            content=r.content,
            is_auto=r.is_auto,
            created_at=r.created_at,
            responder_name=f"{u.first_name} {u.last_name}",
        )
        for r, u in responses
    ]


@router.post("/{id_support}/respond", response_model=SupportResponseOut,
             status_code=201, summary="Responder a un ticket (Soporte)")
def respond_to_ticket(
    id_support: str,
    payload: SupportResponseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.role_name.lower()
    if role_name not in ("soporte",):
        raise HTTPException(
            status_code=403,
            detail="Solo el equipo de soporte puede responder tickets.",
        )

    ticket = db.query(Support).filter(
        Support.id_support == id_support,
        Support.deleted_at.is_(None),
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    resp = SupportResponse(
        id_response=str(uuid.uuid4()),
        id_support=id_support,
        id_responder=current_user.id_user,
        content=payload.content,
        is_auto=payload.is_auto,
    )
    db.add(resp)
    ticket.has_response = True
    ticket.updated_at = datetime.now(timezone.utc)

    _notify_user(db, ticket.id_user, title="Nueva respuesta en tu ticket de soporte",
        message=f"Tu ticket '{ticket.subject}' recibio una nueva respuesta.",
        link="/dashboard", notif_type="support")
    db.commit()
    db.refresh(resp)
    return SupportResponseOut(id_response=resp.id_response, id_support=resp.id_support,
        id_responder=resp.id_responder, content=resp.content, is_auto=resp.is_auto,
        created_at=resp.created_at, responder_name=f"{current_user.first_name} {current_user.last_name}")


AUTO_RESPONSES = {
    "default": "Gracias por contactarnos. Hemos recibido tu solicitud y nuestro equipo la revisara pronto.",
    "error": "Entendemos que estas experimentando un problema tecnico. Nuestro equipo esta trabajando en resolverlo.",
    "bug": "Gracias por reportar este problema. Lo hemos registrado y sera revisado por nuestro equipo.",
}


@router.post("/{id_support}/auto-respond", response_model=SupportResponseOut,
             status_code=201, summary="Respuesta automatica (Soporte)")
def auto_respond_to_ticket(
    id_support: str,
    response_type: str = "default",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role_name = current_user.role.role_name.lower()
    if role_name not in ("soporte",):
        raise HTTPException(status_code=403, detail="Solo soporte puede enviar respuestas automaticas.")

    ticket = db.query(Support).filter(
        Support.id_support == id_support,
        Support.deleted_at.is_(None),
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    content = AUTO_RESPONSES.get(response_type, AUTO_RESPONSES["default"])

    resp = SupportResponse(
        id_response=str(uuid.uuid4()),
        id_support=id_support,
        id_responder=current_user.id_user,
        content=content,
        is_auto=True,
    )
    db.add(resp)
    ticket.has_response = True
    ticket.updated_at = datetime.now(timezone.utc)

    _notify_user(db, ticket.id_user, title="Respuesta automatica",
        message=f"Tu ticket '{ticket.subject}' recibio una respuesta automatica.",
        link="/dashboard", notif_type="support")

    db.commit()
    db.refresh(resp)
    return SupportResponseOut(
        id_response=resp.id_response, id_support=resp.id_support,
        id_responder=resp.id_responder, content=resp.content,
        is_auto=resp.is_auto, created_at=resp.created_at,
        responder_name="Soporte Automatico",
    )
