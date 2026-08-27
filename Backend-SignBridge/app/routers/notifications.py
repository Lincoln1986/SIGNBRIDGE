"""
Router de notificaciones - Sign Bridge
Endpoints para listar, marcar como leidas y eliminar notificaciones.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import Notification, User
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["Notificaciones"])


@router.get("", response_model=List[NotificationOut],
            summary="Listar notificaciones del usuario autenticado")
def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve las notificaciones del usuario, ordenadas de más reciente a más antigua."""
    query = (
        db.query(Notification)
        .filter(
            Notification.id_user == current_user.id_user,
            Notification.deleted_at.is_(None),
        )
    )
    if unread_only:
        query = query.filter(Notification.is_read == False)

    return (
        query.order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/unread-count", summary="Conteo de notificaciones no leidas")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve la cantidad de notificaciones no leidas del usuario."""
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


@router.patch("/{id_notification}/read", summary="Marcar notificacion como leida")
def mark_as_read(
    id_notification: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca una notificacion como leida."""
    notif = db.query(Notification).filter(
        Notification.id_notification == id_notification,
        Notification.id_user == current_user.id_user,
        Notification.deleted_at.is_(None),
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificacion no encontrada")

    notif.is_read = True
    notif.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.patch("/read-all", summary="Marcar todas las notificaciones como leidas")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca todas las notificaciones no leidas del usuario como leidas."""
    db.query(Notification).filter(
        Notification.id_user == current_user.id_user,
        Notification.is_read == False,
        Notification.deleted_at.is_(None),
    ).update({"is_read": True})
    db.commit()
    return {"status": "ok"}


@router.delete("/{id_notification}", status_code=204,
               summary="Eliminar una notificacion")
def delete_notification(
    id_notification: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina (soft-delete) una notificacion."""
    notif = db.query(Notification).filter(
        Notification.id_notification == id_notification,
        Notification.id_user == current_user.id_user,
        Notification.deleted_at.is_(None),
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificacion no encontrada")

    notif.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return None
