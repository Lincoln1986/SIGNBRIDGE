"""
Router de notificaciones — SignBridge

Endpoints:
  GET  /notifications         — Lista notificaciones del usuario
  PATCH /notifications/{id}/read — Marcar como leída
  PATCH /notifications/read-all  — Marcar todas como leídas
  GET  /notifications/unread-count — Conteo de no leídas
"""
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_support_or_admin
from app.models.user import User, Notification

router = APIRouter(prefix="/notifications", tags=["Notificaciones"])


def _notify(db: Session, id_user: str, title: str, message: str,
            type_: str = "info", related_id: str = None, related_type: str = None):
    """Helper para crear una notificación."""
    notif = Notification(
        id_notification=str(uuid.uuid4()),
        id_user=id_user,
        title=title,
        message=message,
        type=type_,
        related_id=related_id,
        related_type=related_type,
    )
    db.add(notif)
    db.commit()
    return notif


# ── Lista notificaciones ────────────────────────────────────────────────────

@router.get("", response_model=List[dict], summary="Lista notificaciones del usuario")
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notifs = (
        db.query(Notification)
        .filter(
            Notification.id_user == current_user.id_user,
            Notification.deleted_at.is_(None),
        )
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id_notification": n.id_notification,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "related_id": n.related_id,
            "related_type": n.related_type,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifs
    ]


# ── Conteo de no leídas ────────────────────────────────────────────────────

@router.get("/unread-count", summary="Número de notificaciones no leídas")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(
            Notification.id_user == current_user.id_user,
            Notification.is_read == False,
            Notification.deleted_at.is_(None),
        )
        .count()
    )
    return {"count": count}


# ── Marcar una como leída ───────────────────────────────────────────────────

@router.patch("/{id_notification}/read", summary="Marcar notificación como leída")
def mark_read(
    id_notification: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = (
        db.query(Notification)
        .filter(
            Notification.id_notification == id_notification,
            Notification.id_user == current_user.id_user,
            Notification.deleted_at.is_(None),
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    notif.is_read = True
    notif.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}


# ── Marcar todas como leídas ────────────────────────────────────────────────

@router.patch("/read-all", summary="Marcar todas las notificaciones como leídas")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import update
    db.execute(
        update(Notification)
        .where(
            Notification.id_user == current_user.id_user,
            Notification.is_read == False,
            Notification.deleted_at.is_(None),
        )
        .values(is_read=True, updated_at=datetime.now(timezone.utc))
    )
    db.commit()
    return {"ok": True}
