"""vistas vw_* para dashboards (SQL portable PG/SQLite)

Revision ID: 0a9ba8b6906c
Revises: 18c15e7dc120
Create Date: 2026-10-14 11:17:56.489894

"""
from typing import Sequence, Union

from alembic import op

from app.core.views import VIEW_NAMES, VIEW_STATEMENTS


# revision identifiers, used by Alembic.
revision: str = '0a9ba8b6906c'
down_revision: Union[str, None] = '18c15e7dc120'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Crea las vistas de los dashboards (`vw_*`).

    El DDL vive en `app.core.views` porque debe ser portable entre
    PostgreSQL (entorno/CI) y SQLite (suite de pruebas), y así los tests
    crean exactamente las mismas vistas que usa esta migración.
    """
    for name in VIEW_NAMES:
        op.execute(VIEW_STATEMENTS[name])


def downgrade() -> None:
    """Elimina las vistas `vw_*`."""
    for name in reversed(VIEW_NAMES):
        op.execute(f"DROP VIEW IF EXISTS {name}")
