from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.user import User
from app.schemas.auth import AdminDashboardRow, UserDashboardRow, SystemStats, UserProfile

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


# ── Dashboard Administrador (usa vista SQL vw_admin_dashboard) ────────────────

@router.get("/admin", response_model=List[AdminDashboardRow])
def admin_dashboard(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """
    Lista todos los usuarios con sus métricas.
    Requiere rol administrador.
    Usa la vista SQL: vw_admin_dashboard
    """
    rows = db.execute(text('SELECT * FROM vw_admin_dashboard')).mappings().all()
    return [
        AdminDashboardRow(
            full_name          = row["full_name"],
            email              = row["email"],
            role_name          = row["role_name"],
            region             = row["region"],
            total_translations = row["total_translations"] or 0,
            support_tickets    = row["support_tickets"] or 0,
            feedback_count     = row["feedback_count"] or 0,
        )
        for row in rows
    ]


# ── Dashboard Usuario (usa vista SQL vw_user_dashboard) ──────────────────────

@router.get("/user", response_model=UserDashboardRow)
def user_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve las métricas del usuario autenticado.
    Usa la vista SQL: vw_user_dashboard
    """
    row = db.execute(
        text("SELECT * FROM vw_user_dashboard WHERE email = :email"),
        {"email": current_user.email},
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Datos del usuario no encontrados")

    return UserDashboardRow(
        full_name         = row["full_name"],
        email             = row["email"],
        translations_made = row["translations_made"] or 0,
        favorite_words    = row["favorite_words"] or 0,
        average_rating    = float(row["average_rating"] or 0),
        support_requests  = row["support_requests"] or 0,
    )


# ── Estadísticas del sistema (usa vista SQL vw_system_statistics) ────────────

@router.get("/stats", response_model=SystemStats)
def system_stats(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """
    Estadísticas globales del sistema.
    Requiere rol administrador.
    Usa la vista SQL: vw_system_statistics
    """
    row = db.execute(text("SELECT * FROM vw_system_statistics")).mappings().first()
    return SystemStats(
        total_users            = row["total_users"] or 0,
        total_translations     = row["total_translations"] or 0,
        total_support_requests = row["total_support_requests"] or 0,
        total_feedback         = row["total_feedback"] or 0,
        average_rating         = float(row["average_rating"]) if row["average_rating"] else None,
    )


# ── Listado de tabla LexicalUnit (criterio 6 — todos los campos excepto ID) ──

@router.get("/lexical-units")
def list_lexical_units(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Lista el vocabulario del sistema sin exponer el id.
    Cumple el criterio 6: visualizar contenido de tabla sin el campo id.
    """
    rows = db.execute(
        text("""
            SELECT text, language, created_at, updated_at
            FROM "LexicalUnit"
            WHERE deleted_at IS NULL
            ORDER BY text
        """)
    ).mappings().all()
    return [dict(r) for r in rows]
