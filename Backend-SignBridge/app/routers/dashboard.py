from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import uuid

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.user import User, LexicalUnit
from app.schemas.auth import (
    AdminDashboardRow, UserDashboardRow, SystemStats, UserProfile,
    LexicalUnitOut, LexicalUnitCreate, LexicalUnitVideoUpdate,
)

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


# ── Listado de tabla LexicalUnit (público para usuarios autenticados) ─────────

@router.get("/lexical-units")
def list_lexical_units(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Lista el vocabulario del sistema.
    Incluye id_lexicalunit para que los usuarios puedan marcar favoritos.
    Incluye average_rating y total_ratings: el promedio de estrellas que la
    gente le ha dado a la traducción de cada palabra (calificación por separado
    de la palabra, no de la sesión completa).
    """
    rows = db.execute(
        text("""
            SELECT
                lu.id_lexicalunit, lu.text, lu.language, lu.video_url,
                lu.created_at, lu.updated_at,
                ROUND(AVG(f.rating)::numeric, 2) AS average_rating,
                COUNT(f.id_feedback) AS total_ratings
            FROM "LexicalUnit" lu
            LEFT JOIN "Feedback" f
                ON f.id_lexicalunit = lu.id_lexicalunit
                AND f.deleted_at IS NULL
            WHERE lu.deleted_at IS NULL
            GROUP BY lu.id_lexicalunit, lu.text, lu.language, lu.video_url,
                     lu.created_at, lu.updated_at
            ORDER BY lu.text
        """)
    ).mappings().all()
    return [dict(r) for r in rows]


# ── Gestión de vocabulario (solo admin) ──────────────────────────────────────

@router.get("/lexical-units/admin", response_model=List[LexicalUnitOut])
def list_lexical_units_admin(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Lista todas las palabras con su ID para gestión desde el panel admin."""
    units = (
        db.query(LexicalUnit)
        .filter(LexicalUnit.deleted_at.is_(None))
        .order_by(LexicalUnit.text)
        .all()
    )
    return units


@router.post("/lexical-units", response_model=LexicalUnitOut, status_code=201)
def create_lexical_unit(
    payload: LexicalUnitCreate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Crea una nueva palabra en el vocabulario. Solo admin."""
    existing = db.query(LexicalUnit).filter(
        LexicalUnit.text == payload.text,
        LexicalUnit.deleted_at.is_(None),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una palabra con ese texto")

    unit = LexicalUnit(
        id_lexicalunit = str(uuid.uuid4()),
        text           = payload.text.strip(),
        language       = payload.language,
        video_url      = payload.video_url,
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.patch("/lexical-units/{id_lexicalunit}/video", response_model=LexicalUnitOut)
def update_lexical_unit_video(
    id_lexicalunit: str,
    payload: LexicalUnitVideoUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """
    Actualiza el video_url de una palabra del vocabulario.
    Acepta URLs de YouTube (watch o embed) o cualquier URL directa de video.
    Solo admin.
    """
    unit = db.query(LexicalUnit).filter(
        LexicalUnit.id_lexicalunit == id_lexicalunit,
        LexicalUnit.deleted_at.is_(None),
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Palabra no encontrada")

    unit.video_url = payload.video_url
    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/lexical-units/{id_lexicalunit}", status_code=204)
def delete_lexical_unit(
    id_lexicalunit: str,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Elimina (soft delete) una palabra del vocabulario. Solo admin."""
    from datetime import datetime, timezone

    unit = db.query(LexicalUnit).filter(
        LexicalUnit.id_lexicalunit == id_lexicalunit,
        LexicalUnit.deleted_at.is_(None),
    ).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Palabra no encontrada")

    unit.deleted_at = datetime.now(timezone.utc)
    db.commit()
# ── Gestión de usuarios (solo admin) ─────────────────────────────────────────

from app.models.user import Role
from app.schemas.auth import UserAdminRow, UserRoleUpdate


@router.get("/users/admin", response_model=List[UserAdminRow])
def list_users_admin(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Lista todos los usuarios con su rol, para gestión desde el panel admin."""
    rows = db.execute(text('''
        SELECT u.id_user, u.first_name || ' ' || u.last_name AS full_name,
               u.email, r.role_name, rg.region_name AS region
        FROM "User" u
        INNER JOIN "Role" r ON u.id_role = r.id_role
        LEFT JOIN "Region" rg ON u.id_region = rg.id_region
        WHERE u.deleted_at IS NULL
        ORDER BY u.first_name
    ''')).mappings().all()
    return [UserAdminRow(**dict(r)) for r in rows]


@router.get("/roles")
def list_roles(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Lista los roles disponibles en el sistema."""
    roles = db.query(Role).all()
    return [{"id_role": r.id_role, "role_name": r.role_name} for r in roles]


@router.patch("/users/{id_user}/role", response_model=UserAdminRow)
def update_user_role(
    id_user: str,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Cambia el rol de un usuario. Solo admin."""
    if id_user == admin.id_user:
        raise HTTPException(status_code=400, detail="No puedes cambiar tu propio rol")

    user = db.query(User).filter(
        User.id_user == id_user, User.deleted_at.is_(None)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    role = db.query(Role).filter(Role.role_name == payload.role_name).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    user.id_role = role.id_role
    db.commit()

    row = db.execute(text('''
        SELECT u.id_user, u.first_name || ' ' || u.last_name AS full_name,
               u.email, r.role_name, rg.region_name AS region
        FROM "User" u
        INNER JOIN "Role" r ON u.id_role = r.id_role
        LEFT JOIN "Region" rg ON u.id_region = rg.id_region
        WHERE u.id_user = :id_user
    '''), {"id_user": id_user}).mappings().first()
    return UserAdminRow(**dict(row))


@router.delete("/users/{id_user}", status_code=204)
def delete_user(
    id_user: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Elimina (soft delete) un usuario. Solo admin."""
    from datetime import datetime, timezone

    if id_user == admin.id_user:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")

    user = db.query(User).filter(
        User.id_user == id_user, User.deleted_at.is_(None)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.deleted_at = datetime.now(timezone.utc)
    db.commit()