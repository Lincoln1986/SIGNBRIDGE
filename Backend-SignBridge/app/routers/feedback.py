import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import Feedback, TranslationSession, User
from app.schemas.feedback import FeedbackCreate, FeedbackOut

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
