"""
Router: Gestión de usuarios — Panel Admin
Prefijo: /admin/users
Todos los endpoints requieren rol administrador.
"""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.models.user import Role, User
from app.schemas.auth import UserAdminRow, UserRoleUpdateById, UserStatusUpdate

router = APIRouter(prefix="/admin/users", tags=["Admin — Usuarios"])


# ── Helper: construir UserAdminRow desde BD ───────────────────────────────────

def _fetch_user_row(db: Session, id_user: str) -> UserAdminRow:
    row = db.execute(
        text("""
            SELECT u.id_user,
                   u.first_name || ' ' || u.last_name AS full_name,
                   u.email,
                   r.role_name,
                   rg.region_name AS region,
                   u.is_active,
                   u.created_at
            FROM   "User" u
            INNER JOIN "Role"   r  ON u.id_role   = r.id_role
            LEFT  JOIN "Region" rg ON u.id_region = rg.id_region
            WHERE  u.id_user = :id_user
        """),
        {"id_user": id_user},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return UserAdminRow(**dict(row))


# ── GET /admin/users — lista completa (con is_active y created_at) ────────────

@router.get("", response_model=List[UserAdminRow],
            summary="Listar todos los usuarios (admin)")
def list_users(
    is_active: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """
    Devuelve todos los usuarios no eliminados con nombre completo, email,
    rol, región, estado `is_active` y fecha de registro.

    El frontend puede usar este JSON para armar un CSV si lo prefiere,
    o usar `GET /admin/users/export` para descarga directa.

    Parámetro opcional:
    - `is_active=true`  → solo activos
    - `is_active=false` → solo inactivos
    """
    base_sql = """
        SELECT u.id_user,
               u.first_name || ' ' || u.last_name AS full_name,
               u.email,
               r.role_name,
               rg.region_name AS region,
               u.is_active,
               u.created_at
        FROM   "User" u
        INNER JOIN "Role"   r  ON u.id_role   = r.id_role
        LEFT  JOIN "Region" rg ON u.id_region = rg.id_region
        WHERE  u.deleted_at IS NULL
    """
    params: dict = {}
    if is_active is not None:
        base_sql += " AND u.is_active = :is_active"
        params["is_active"] = is_active

    base_sql += " ORDER BY u.first_name, u.last_name"

    rows = db.execute(text(base_sql), params).mappings().all()
    return [UserAdminRow(**dict(r)) for r in rows]


# ── PATCH /admin/users/{id_user}/role — cambiar rol por id_role ───────────────

@router.patch("/{id_user}/role", response_model=UserAdminRow,
              summary="Cambiar rol de un usuario por id_role (admin)")
def update_user_role_by_id(
    id_user: str,
    payload: UserRoleUpdateById,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Cambia el `id_role` del usuario indicado.

    **Body:**
    ```json
    { "id_role": "uuid-del-rol" }
    ```

    **Reglas:**
    - Un admin no puede cambiar su propio rol.
    - El `id_role` debe existir en la tabla `Role`.

    **Response 200:** datos actualizados del usuario.
    """
    if id_user == admin.id_user:
        raise HTTPException(
            status_code=400,
            detail="No puedes cambiar tu propio rol",
        )

    user = db.query(User).filter(
        User.id_user    == id_user,
        User.deleted_at.is_(None),
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    role = db.query(Role).filter(Role.id_role == payload.id_role).first()
    if not role:
        raise HTTPException(
            status_code=404,
            detail=f"Rol con id '{payload.id_role}' no encontrado",
        )

    user.id_role    = payload.id_role
    user.updated_at = datetime.now(timezone.utc)
    db.commit()

    return _fetch_user_row(db, id_user)


# ── PATCH /admin/users/{id_user}/status — activar / desactivar ───────────────

@router.patch("/{id_user}/status", response_model=UserAdminRow,
              summary="Activar o desactivar un usuario (admin)")
def update_user_status(
    id_user: str,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """
    Activa (`is_active: true`) o desactiva (`is_active: false`) un usuario.
    Un usuario desactivado puede seguir existiendo en la BD pero no podrá
    autenticarse (el login verificará este campo).

    **Body:**
    ```json
    { "is_active": false }
    ```

    **Reglas:**
    - Un admin no puede desactivarse a sí mismo.

    **Response 200:** datos actualizados del usuario.
    """
    if id_user == admin.id_user:
        raise HTTPException(
            status_code=400,
            detail="No puedes cambiar tu propio estado",
        )

    user = db.query(User).filter(
        User.id_user    == id_user,
        User.deleted_at.is_(None),
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.is_active  = payload.is_active
    user.updated_at = datetime.now(timezone.utc)
    db.commit()

    return _fetch_user_row(db, id_user)


# ── GET /admin/users/export — descarga CSV ────────────────────────────────────

@router.get("/export",
            summary="Exportar todos los usuarios como CSV (admin)",
            response_class=StreamingResponse)
def export_users_csv(
    is_active: Optional[bool] = Query(None, description="Filtrar por estado activo/inactivo"),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """
    Descarga un archivo CSV con todos los usuarios.

    **Columnas:** nombre completo, email, rol, región, estado, fecha de registro.

    El header de respuesta incluye `Content-Disposition: attachment; filename=usuarios_signbridge.csv`
    para que el navegador lo descargue directamente.

    Parámetro opcional `is_active` para filtrar solo activos o inactivos.

    **Ejemplo de uso desde el frontend:**
    ```js
    window.location.href = '/admin/users/export?is_active=true'
    ```
    """
    base_sql = """
        SELECT u.first_name || ' ' || u.last_name       AS nombre_completo,
               u.email,
               r.role_name                              AS rol,
               COALESCE(rg.region_name, '')             AS region,
               CASE WHEN u.is_active THEN 'Activo' ELSE 'Inactivo' END AS estado,
               TO_CHAR(u.created_at, 'YYYY-MM-DD HH24:MI') AS fecha_registro
        FROM   "User" u
        INNER JOIN "Role"   r  ON u.id_role   = r.id_role
        LEFT  JOIN "Region" rg ON u.id_region = rg.id_region
        WHERE  u.deleted_at IS NULL
    """
    params: dict = {}
    if is_active is not None:
        base_sql += " AND u.is_active = :is_active"
        params["is_active"] = is_active

    base_sql += " ORDER BY u.first_name, u.last_name"

    rows = db.execute(text(base_sql), params).mappings().all()

    # Generar CSV en memoria
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["nombre_completo", "email", "rol", "region", "estado", "fecha_registro"],
        extrasaction="ignore",
    )
    writer.writeheader()
    for row in rows:
        writer.writerow(dict(row))

    output.seek(0)
    filename = f"usuarios_signbridge_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
