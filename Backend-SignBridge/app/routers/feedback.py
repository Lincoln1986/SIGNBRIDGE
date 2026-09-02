from datetime import datetime, timezone
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_user, require_support_or_admin, require_support
from app.models.user import Feedback, TranslationSession, LexicalUnit, User
from app.schemas.feedback import (
    FeedbackCreate, FeedbackOut, FeedbackOutWithUser,
    FeedbackReviewUpdate, WordRatingSummary,
)

router = APIRouter(prefix="/feedback", tags=["Feedback"])

# Respuestas rápidas predefinidas. Solo se pueden usar en valoraciones con
# rating 4 o 5 (ver set_feedback_reviewed). Las claves son las que el
# frontend debe enviar en `quick_reply`.
QUICK_REPLIES: dict[str, str] = {
    "gracias":       "¡Gracias por tu calificación! Nos alegra que la seña te haya sido útil.",
    "sigue_asi":     "Gracias por tu comentario, seguimos trabajando para mejorar cada seña de SignBridge.",
    "compartido":    "¡Gracias! Compartimos tu buena calificación con el equipo de contenido.",
}


@router.get("/quick-replies", summary="Respuestas rápidas disponibles (Soporte o Admin)")
def list_quick_replies(_user: User = Depends(require_support_or_admin)):
    """Catálogo de respuestas rápidas. Solo aplican a valoraciones con rating 4 o 5."""
    return [{"key": k, "text": v} for k, v in QUICK_REPLIES.items()]


@router.post("", response_model=FeedbackOut, status_code=201,
             summary="Crear feedback de una sesión de traducción o de una palabra")
def create_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registra un feedback (rating 1-5 + comentario opcional).

    - Si viene `id_session`, es una valoración de la sesión de traducción completa
      (debe pertenecer al usuario autenticado).
    - Si viene `id_lexicalunit`, es una valoración puntual de la traducción de esa
      palabra, para poder mostrar su promedio de estrellas por separado.
    """
    session = None
    if payload.id_session:
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

    if payload.id_lexicalunit:
        word = db.query(LexicalUnit).filter(
            LexicalUnit.id_lexicalunit == payload.id_lexicalunit,
            LexicalUnit.deleted_at.is_(None),
        ).first()
        if not word:
            raise HTTPException(status_code=404, detail="Palabra no encontrada")

        # Voto único por palabra: si el usuario ya la había calificado, se
        # actualiza ese voto en vez de crear uno nuevo. Si no fuera así, cada
        # clic en las estrellas sumaba un feedback distinto e inflaba el
        # promedio sin límite (ver bug: 29 votos de la misma persona en "agua").
        existing_word_vote = db.query(Feedback).filter(
            Feedback.id_lexicalunit == payload.id_lexicalunit,
            Feedback.id_user        == current_user.id_user,
            Feedback.deleted_at.is_(None),
        ).first()
        if existing_word_vote:
            existing_word_vote.rating     = payload.rating
            existing_word_vote.comment    = payload.comment
            existing_word_vote.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing_word_vote)
            return existing_word_vote

    fb = Feedback(
        id_feedback    = str(uuid.uuid4()),
        id_user        = current_user.id_user,
        id_session     = payload.id_session,
        id_lexicalunit = payload.id_lexicalunit,
        rating         = payload.rating,
        comment        = payload.comment,
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


@router.get("/word/{id_lexicalunit}/summary", response_model=WordRatingSummary,
            summary="Promedio de calificación de la traducción de una palabra")
def word_rating_summary(
    id_lexicalunit: str,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Devuelve cuántas estrellas ha tenido en promedio la traducción de una palabra,
    para que cualquier usuario pueda verlo (por ejemplo en el diccionario)."""
    word = db.query(LexicalUnit).filter(
        LexicalUnit.id_lexicalunit == id_lexicalunit,
        LexicalUnit.deleted_at.is_(None),
    ).first()
    if not word:
        raise HTTPException(status_code=404, detail="Palabra no encontrada")

    row = (
        db.query(func.avg(Feedback.rating), func.count(Feedback.id_feedback))
        .filter(
            Feedback.id_lexicalunit == id_lexicalunit,
            Feedback.deleted_at.is_(None),
        )
        .first()
    )
    avg_rating, total = row
    return WordRatingSummary(
        id_lexicalunit = id_lexicalunit,
        word           = word.text,
        average_rating = round(float(avg_rating), 2) if avg_rating else 0.0,
        total_ratings  = total or 0,
    )


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
            id_feedback      = fb.id_feedback,
            id_session       = fb.id_session,
            id_lexicalunit   = fb.id_lexicalunit,
            rating           = fb.rating,
            comment          = fb.comment,
            date             = fb.date,
            is_reviewed      = fb.is_reviewed,
            support_response = fb.support_response,
            user_full_name   = f"{user.first_name} {user.last_name}",
            user_email       = user.email,
        )
        for fb, user in rows
    ]


@router.patch("/{id_feedback}/review", response_model=FeedbackOut,
              summary="Marcar/desmarcar una valoración como revisada (exclusivo de Soporte)")
def set_feedback_reviewed(
    id_feedback: str,
    payload: FeedbackReviewUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(require_support),
):
    """Marca (o desmarca) una valoración como revisada/atendida.

    Revisar una valoración es una acción exclusiva de Soporte. Para marcarla como
    revisada es obligatorio dar una respuesta:
    - Con cualquier rating se puede escribir una respuesta manual (`response`).
    - Solo si el rating es 4 o 5 se desbloquean las respuestas rápidas (`quick_reply`),
      tomadas del catálogo de GET /feedback/quick-replies.
    """
    fb = db.query(Feedback).filter(
        Feedback.id_feedback == id_feedback,
        Feedback.deleted_at.is_(None),
    ).first()
    if not fb:
        raise HTTPException(status_code=404, detail="Valoración no encontrada")

    if payload.is_reviewed:
        if payload.quick_reply:
            if fb.rating < 4:
                raise HTTPException(
                    status_code=403,
                    detail="Las respuestas rápidas solo están disponibles para calificaciones de 4 o 5 estrellas",
                )
            if payload.quick_reply not in QUICK_REPLIES:
                raise HTTPException(status_code=400, detail="Respuesta rápida inválida")
            fb.support_response = QUICK_REPLIES[payload.quick_reply]
        elif payload.response:
            fb.support_response = payload.response
        else:
            raise HTTPException(
                status_code=400,
                detail="Para marcar como revisada esta valoración debes dar una respuesta manual "
                       "(o, si tiene 4-5 estrellas, elegir una respuesta rápida).",
            )

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
