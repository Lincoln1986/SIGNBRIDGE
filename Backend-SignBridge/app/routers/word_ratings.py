"""
Router de calificaciones por palabra - Sign Bridge
Permite calificar palabras traducidas y consultar el promedio por palabra.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.user import WordRating, LexicalUnit, User
from app.schemas.word_rating import WordRatingCreate, WordRatingOut, WordRatingStatsOut

router = APIRouter(prefix="/word-ratings", tags=["Calificacion por Palabra"])


@router.post("", response_model=WordRatingOut, status_code=201,
             summary="Calificar una palabra traducida")
def create_word_rating(
    payload: WordRatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registra o actualiza la calificacion de una palabra traducida.
    Un usuario solo puede tener una calificacion por palabra.
    """
    # Verificar que la palabra existe
    unit = db.query(LexicalUnit).filter(
        LexicalUnit.id_lexicalunit == payload.id_lexicalunit,
        LexicalUnit.deleted_at.is_(None),
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Palabra no encontrada")

    # Verificar si ya existe una calificacion del usuario para esta palabra
    existing = db.query(WordRating).filter(
        WordRating.id_lexicalunit == payload.id_lexicalunit,
        WordRating.id_user == current_user.id_user,
        WordRating.deleted_at.is_(None),
    ).first()

    if existing:
        # Actualizar calificacion existente
        existing.rating = payload.rating
        existing.comment = payload.comment
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    # Crear nueva calificacion
    wr = WordRating(
        id_word_rating=str(uuid.uuid4()),
        id_lexicalunit=payload.id_lexicalunit,
        id_user=current_user.id_user,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(wr)
    db.commit()
    db.refresh(wr)
    return wr


@router.get("/my", response_model=List[WordRatingOut],
            summary="Mis calificaciones de palabras")
def my_word_ratings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Devuelve todas las calificaciones de palabras del usuario autenticado."""
    return (
        db.query(WordRating)
        .filter(
            WordRating.id_user == current_user.id_user,
            WordRating.deleted_at.is_(None),
        )
        .order_by(WordRating.created_at.desc())
        .all()
    )


@router.get("/stats", response_model=List[WordRatingStatsOut],
            summary="Calificacion promedio por palabra (publico)")
def word_rating_stats(
    db: Session = Depends(get_db),
):
    """
    Devuelve la calificacion promedio de cada palabra.
    Visible para todos los usuarios autenticados para saber si una palabra
    es confiable en su traduccion.
    """
    rows = db.execute(text("SELECT * FROM vw_word_ratings")).mappings().all()
    return [
        WordRatingStatsOut(
            id_lexicalunit=str(r["id_lexicalunit"]),
            word=r["word"],
            language=r["language"],
            total_ratings=r["total_ratings"] or 0,
            avg_rating=float(r["avg_rating"]) if r["avg_rating"] else None,
            rated_by_users=r["rated_by_users"] or 0,
        )
        for r in rows
    ]


@router.get("/stats/{id_lexicalunit}", response_model=WordRatingStatsOut,
            summary="Calificacion promedio de una palabra especifica")
def word_rating_stats_single(
    id_lexicalunit: str,
    db: Session = Depends(get_db),
):
    """Devuelve la calificacion promedio de una palabra especifica."""
    row = db.execute(
        text("SELECT * FROM vw_word_ratings WHERE id_lexicalunit = :id"),
        {"id": id_lexicalunit},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Palabra no encontrada")
    return WordRatingStatsOut(
        id_lexicalunit=str(row["id_lexicalunit"]),
        word=row["word"],
        language=row["language"],
        total_ratings=row["total_ratings"] or 0,
        avg_rating=float(row["avg_rating"]) if row["avg_rating"] else None,
        rated_by_users=row["rated_by_users"] or 0,
    )
