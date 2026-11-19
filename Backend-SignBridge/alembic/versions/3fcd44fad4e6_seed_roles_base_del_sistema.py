"""seed: roles base del sistema

Revision ID: 3fcd44fad4e6
Revises: 0a9ba8b6906c
Create Date: 2026-10-14 12:17:11.609572

El registro de usuarios asigna el rol por defecto (`Cliente`) y los paneles
distinguen `Administrador` y `Soporte`;
sin esta siembra, una BD recién creada respondía 500 en
`POST /auth/register` con "Rol por defecto no encontrado en BD".
Idempotente: solo inserta los roles que falten, con SQL portable
(PostgreSQL y SQLite).
"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3fcd44fad4e6'
down_revision: Union[str, None] = '0a9ba8b6906c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Roles que el backend asume (búsqueda por nombre en app/routers/auth.py y
# dependencias de rol en app/core/security.py).
ROLES_BASE = ("Cliente", "Administrador", "Soporte")


def upgrade() -> None:
    """Crea los roles base si no existen."""
    conn = op.get_bind()
    for role_name in ROLES_BASE:
        existe = conn.execute(
            sa.text('SELECT COUNT(*) FROM "Role" WHERE role_name = :nombre'),
            {"nombre": role_name},
        ).scalar()
        if not existe:
            conn.execute(
                sa.text('INSERT INTO "Role" (id_role, role_name) VALUES (:id, :nombre)'),
                {"id": str(uuid.uuid4()), "nombre": role_name},
            )


def downgrade() -> None:
    """Elimina los roles base (deja los que haya creado un administrador)."""
    conn = op.get_bind()
    for role_name in ROLES_BASE:
        conn.execute(
            sa.text('DELETE FROM "Role" WHERE role_name = :nombre'),
            {"nombre": role_name},
        )
