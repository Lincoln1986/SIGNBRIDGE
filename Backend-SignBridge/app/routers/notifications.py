"""Notificaciones in-app del usuario autenticado (la campana del menú).

Cada usuario solo ve y modifica las suyas: todas las consultas filtran por
el id que viene en el token, nunca por un id recibido del cliente.
"""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import Notification, User
from app.schemas.notification import MarkReadResult, NotificationOut, UnreadCount

router = APIRouter(prefix="/notifications", tags=["Notificaciones"])


def _sin_leer(db: Session, id_user: str) -> int:
    return (
        db.query(Notification)
        .filter(
            Notification.id_user == id_user,
            Notification.read_at.is_(None),
            Notification.deleted_at.is_(None),
        )
        .count()
    )


@router.get("", response_model=List[NotificationOut],
            summary="Mis notificaciones")
def listar(
    solo_sin_leer: bool = Query(False, description="Devolver únicamente las no leídas"),
    limite: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Notificaciones del usuario, de la más reciente a la más antigua."""
    q = db.query(Notification).filter(
        Notification.id_user == current_user.id_user,
        Notification.deleted_at.is_(None),
    )
    if solo_sin_leer:
        q = q.filter(Notification.read_at.is_(None))

    return q.order_by(Notification.created_at.desc()).limit(limite).all()


@router.get("/unread-count", response_model=UnreadCount,
            summary="Cuántas tengo sin leer")
def contar_sin_leer(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Solo el número, para el punto rojo de la campana.

    Se consulta seguido, así que devuelve un entero en lugar de la lista
    completa de notificaciones.
    """
    return UnreadCount(unread=_sin_leer(db, current_user.id_user))


@router.patch("/{id_notification}/read", response_model=NotificationOut,
              summary="Marcar una como leída")
def marcar_leida(
    id_notification: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca una notificación propia como leída."""
    aviso = (
        db.query(Notification)
        .filter(
            Notification.id_notification == id_notification,
            Notification.id_user         == current_user.id_user,
            Notification.deleted_at.is_(None),
        )
        .first()
    )
    if not aviso:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    if aviso.read_at is None:
        aviso.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(aviso)
    return aviso


@router.patch("/read-all", response_model=MarkReadResult,
              summary="Marcar todas como leídas")
def marcar_todas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca como leídas todas las notificaciones pendientes del usuario."""
    actualizadas = (
        db.query(Notification)
        .filter(
            Notification.id_user == current_user.id_user,
            Notification.read_at.is_(None),
            Notification.deleted_at.is_(None),
        )
        .update({Notification.read_at: datetime.now(timezone.utc)},
                synchronize_session=False)
    )
    db.commit()
    return MarkReadResult(updated=actualizadas, unread=_sin_leer(db, current_user.id_user))


@router.delete("/{id_notification}", status_code=204,
               summary="Eliminar una notificación")
def eliminar(
    id_notification: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Borrado lógico: deja de aparecer pero queda en la base."""
    aviso = (
        db.query(Notification)
        .filter(
            Notification.id_notification == id_notification,
            Notification.id_user         == current_user.id_user,
            Notification.deleted_at.is_(None),
        )
        .first()
    )
    if not aviso:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    aviso.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return None
