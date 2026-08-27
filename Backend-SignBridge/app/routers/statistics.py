"""
Router de estadísticas — SignBridge

Endpoints:
  GET /api/stats/most-used    — Frases/palabras más usadas
  GET /api/stats/word-ratings — Calificación promedio por palabra
  GET /api/stats/my-usage     — Estadísticas de uso del usuario actual
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/stats", tags=["Estadísticas"])


# ── Frases más usadas ───────────────────────────────────────────────────────

@router.get(
    "/most-used",
    summary="Frases/palabras más traducidas en la plataforma",
    description="Devuelve el ranking de palabras más traducidas por los usuarios, "
                "junto con la cantidad de traducciones y usuarios únicos que las usaron.",
)
def most_used_phrases(
    limit: int = 20,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """
    Consulta la vista SQL vw_most_used_phrases.
    - limit: número máximo de resultados (default 20, máx 100).
    """
    limit = min(max(limit, 1), 100)
    rows = db.execute(
        text("SELECT * FROM vw_most_used_phrases LIMIT :limit"),
        {"limit": limit},
    ).mappings().all()
    return [dict(r) for r in rows]


# ── Calificación promedio por palabra ────────────────────────────────────────

@router.get(
    "/word-ratings",
    summary="Calificación promedio por palabra traducida",
    description="Devuelve el rating promedio de cada palabra, basándose en los "
                "feedbacks de las sesiones que la incluyeron. Visible a todos los "
                "usuarios para saber si una palabra es confiable en su traducción.",
)
def word_ratings(
    limit: int = 50,
    min_ratings: int = 1,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """
    Consulta la vista SQL vw_word_ratings.
    - limit: máximo de resultados (default 50, máx 200).
    - min_ratings: filtrar solo palabras con al menos N ratings.
    """
    limit = min(max(limit, 1), 200)
    min_ratings = max(min_ratings, 1)
    rows = db.execute(
        text("""
            SELECT * FROM vw_word_ratings
            WHERE total_ratings >= :min_ratings
            LIMIT :limit
        """),
        {"min_ratings": min_ratings, "limit": limit},
    ).mappings().all()
    return [dict(r) for r in rows]


# ── Estadísticas de uso del usuario actual ──────────────────────────────────

@router.get(
    "/my-usage",
    summary="Estadísticas de uso del usuario autenticado",
    description="Devuelve cuántas traducciones ha hecho, palabras usadas, "
                "sesiones, etc.",
)
def my_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.execute(
        text("""
            SELECT
                COUNT(DISTINCT ts.id_session) AS total_sessions,
                COUNT(td.id_detail)           AS total_words_translated,
                COUNT(DISTINCT lu.id_lexicalunit) AS unique_words,
                MAX(ts.date_time)             AS last_translation
            FROM "TranslationSession" ts
            LEFT JOIN "TranslationDetail" td ON td.id_session = ts.id_session
            LEFT JOIN "LexicalUnit" lu ON lu.id_lexicalunit = td.id_lexicalunit
            WHERE ts.id_user = :user_id
              AND ts.deleted_at IS NULL
              AND (td.deleted_at IS NULL OR td.deleted_at IS NULL)
              AND (lu.deleted_at IS NULL OR lu.deleted_at IS NULL)
        """),
        {"user_id": current_user.id_user},
    ).mappings().first()

    return {
        "total_sessions": row["total_sessions"] or 0,
        "total_words_translated": row["total_words_translated"] or 0,
        "unique_words": row["unique_words"] or 0,
        "last_translation": row["last_translation"],
    } if row else {
        "total_sessions": 0,
        "total_words_translated": 0,
        "unique_words": 0,
        "last_translation": None,
    }
