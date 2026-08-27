"""
Router de estadisticas avanzadas - Sign Bridge
Endpoints para frases mas usadas, interaccion de usuario, etc.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.user import User
from app.schemas.stats import MostUsedPhrase, UserInteractionStats

router = APIRouter(prefix="/stats", tags=["Estadisticas"])


@router.get("/most-used-phrases", response_model=List[MostUsedPhrase],
            summary="Frases mas usadas en traducciones")
def most_used_phrases(
    limit: int = 20,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """
    Devuelve las palabras/frases mas traducidas en el sistema.
    Incluye cuantas veces se uso y cuantos usuarios la tradujeron.
    """
    rows = db.execute(
        text("SELECT * FROM vw_most_used_phrases LIMIT :limit"),
        {"limit": limit},
    ).mappings().all()
    return [
        MostUsedPhrase(
            id_lexicalunit=str(r["id_lexicalunit"]),
            phrase=r["phrase"],
            language=r["language"],
            times_used=r["times_used"] or 0,
            unique_users=r["unique_users"] or 0,
            video_url=r.get("video_url"),
        )
        for r in rows
    ]


@router.get("/user-interaction", response_model=List[UserInteractionStats],
            summary="Estadisticas de interaccion de usuarios (admin)")
def user_interaction_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """
    Estadisticas detalladas de como cada usuario interactua con el software:
    sesiones totales, tipo de traduccion, favoritos, palabras traducidas, etc.
    """
    rows = db.execute(text("SELECT * FROM vw_user_interaction_stats")).mappings().all()
    return [
        UserInteractionStats(
            id_user=str(r["id_user"]),
            full_name=r["full_name"],
            email=r["email"],
            total_sessions=r["total_sessions"] or 0,
            voice_to_sign_sessions=r["voice_to_sign_sessions"] or 0,
            sign_to_text_sessions=r["sign_to_text_sessions"] or 0,
            favorites_count=r["favorites_count"] or 0,
            words_translated=r["words_translated"] or 0,
            feedbacks_given=r["feedbacks_given"] or 0,
            last_session_date=r["last_session_date"],
        )
        for r in rows
    ]


@router.get("/my-interaction", response_model=UserInteractionStats,
            summary="Estadisticas de mi interaccion")
def my_interaction_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve las estadisticas de interaccion del usuario autenticado."""
    row = db.execute(
        text("SELECT * FROM vw_user_interaction_stats WHERE id_user = :id"),
        {"id": current_user.id_user},
    ).mappings().first()
    if not row:
        return UserInteractionStats(
            id_user=current_user.id_user,
            full_name=f"{current_user.first_name} {current_user.last_name}",
            email=current_user.email,
        )
    return UserInteractionStats(
        id_user=str(row["id_user"]),
        full_name=row["full_name"],
        email=row["email"],
        total_sessions=row["total_sessions"] or 0,
        voice_to_sign_sessions=row["voice_to_sign_sessions"] or 0,
        sign_to_text_sessions=row["sign_to_text_sessions"] or 0,
        favorites_count=row["favorites_count"] or 0,
        words_translated=row["words_translated"] or 0,
        feedbacks_given=row["feedbacks_given"] or 0,
        last_session_date=row["last_session_date"],
    )
