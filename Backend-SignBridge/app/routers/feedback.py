from datetime import datetime, timezone
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_support_or_admin
from app.models.user import Feedback, TranslationSession, User
from app.schemas.feedback import FeedbackCreate, FeedbackOut, FeedbackOutWithUser, FeedbackReviewUpdate

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackOut, status_code=201,
             summary="Crear feedback de una sesión de traducción")
def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registra un feedback (rating 1-5 + comentario opcional) para una sesión
    de traducción que pertenezca al usuario autenticado.
    """
    session = db.query(TranslationSession).filter(
        TranslationSession.id_session == payload.id_session,
        TranslationSession.id_user    == current_user.id_user,
        TranslationSession.deleted_at.is_(None),
    ).first()
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Sesión no encontrada o no pertenece al usuario autenticado",
        )

    existing = db.query(Feedback).filter(
        Feedback.id_session == payload.id_session,
        Feedback.id_user    == current_user.id_user,
        Feedback.deleted_at.is_(None),
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un feedback para esta sesión",
        )

    fb = Feedback(
        id_feedback = str(uuid.uuid4()),
        id_user     = current_user.id_user,
        id_session  = payload.id_session,
        rating      = payload.rating,
        comment     = payload.comment,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


@router.get("/my", response_model=List[FeedbackOut],
            summary="Historial de feedback del usuario autenticado")
def my_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve todos los feedbacks del usuario autenticado, del más reciente al más antiguo."""
    feedbacks = (
        db.query(Feedback)
        .filter(
            Feedback.id_user   == current_user.id_user,
            Feedback.deleted_at.is_(None),
        )
        .order_by(Feedback.date.desc())
        .all()
    )
    return feedbacks


@router.get("/all", response_model=List[FeedbackOutWithUser],
            summary="Todas las valoraciones, con datos de quién la dejó (Soporte o Admin)")
def all_feedback(
    db: Session = Depends(get_db),
    _user: User = Depends(require_support_or_admin),
):
    """Lista todas las valoraciones del sistema junto con el nombre/correo del usuario
    que las dejó. Pensado para el Panel de Soporte (accesible a Soporte y Admin)."""
    rows = (
        db.query(Feedback, User)
        .join(User, User.id_user == Feedback.id_user)
        .filter(Feedback.deleted_at.is_(None))
        .order_by(Feedback.date.desc())
        .all()
    )
    return [
        FeedbackOutWithUser(
            id_feedback    = fb.id_feedback,
            id_session     = fb.id_session,
            rating         = fb.rating,
            comment        = fb.comment,
            date           = fb.date,
            is_reviewed    = fb.is_reviewed,
            user_full_name = f"{user.first_name} {user.last_name}",
            user_email     = user.email,
        )
        for fb, user in rows
    ]


@router.patch("/{id_feedback}/review", response_model=FeedbackOut,
              summary="Marcar/desmarcar una valoración como revisada (Soporte o Admin)")
def set_feedback_reviewed(
    id_feedback: str,
    payload: FeedbackReviewUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_support_or_admin),
):
    """Marca (o desmarca) una valoración como revisada/atendida por Soporte o Admin."""
    fb = db.query(Feedback).filter(
        Feedback.id_feedback == id_feedback,
        Feedback.deleted_at.is_(None),
    ).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Valoración no encontrada")

    fb.is_reviewed = payload.is_reviewed
    fb.updated_at  = datetime.now(timezone.utc)
    db.commit()
    db.refresh(fb)
    return fb


@router.delete("/{id_feedback}", status_code=204,
                summary="Eliminar (ocultar) una valoración (Soporte o Admin)")
def delete_feedback(
    id_feedback: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_support_or_admin),
):
    """Elimina (soft-delete) una valoración: deja de aparecer en el Panel de Soporte
    y en el promedio general, pero no se borra físicamente de la base de datos."""
    fb = db.query(Feedback).filter(
        Feedback.id_feedback == id_feedback,
        Feedback.deleted_at.is_(None),
    ).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Valoración no encontrada")

    fb.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return None