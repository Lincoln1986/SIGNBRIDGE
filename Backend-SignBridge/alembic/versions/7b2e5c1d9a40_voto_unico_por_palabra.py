"""voto único por usuario y palabra (issue #45)

Revision ID: 7b2e5c1d9a40
Revises: 3fcd44fad4e6
Create Date: 2026-11-24 12:00:00

Reemplaza el script manual `Base-de-datos/migracion_02_voto_unico.sql`.

1. Consolida los votos repetidos que ya existan: de cada usuario y palabra se
   conserva el más reciente; los anteriores se marcan como borrados
   (`deleted_at`), no se eliminan, para no perder el historial.
2. Crea el índice único parcial `uq_feedback_usuario_palabra`, para que la base
   rechace un segundo voto activo aunque falle la validación de la API.

Portable: corre igual en PostgreSQL y en SQLite.
"""
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b2e5c1d9a40'
down_revision: Union[str, None] = '3fcd44fad4e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_VOTO_PALABRA_ACTIVO = "id_lexicalunit IS NOT NULL AND deleted_at IS NULL"


def upgrade() -> None:
    bind = op.get_bind()

    # 1) Votos activos de palabra, del más reciente al más antiguo.
    filas = bind.execute(sa.text(
        'SELECT id_feedback, id_user, id_lexicalunit FROM "Feedback" '
        f'WHERE {_VOTO_PALABRA_ACTIVO} '
        'ORDER BY id_user, id_lexicalunit, date DESC, id_feedback'
    )).fetchall()

    vistos: set[tuple[str, str]] = set()
    repetidos: list[str] = []
    for id_feedback, id_user, id_lexicalunit in filas:
        clave = (id_user, id_lexicalunit)
        if clave in vistos:
            repetidos.append(id_feedback)
        else:
            vistos.add(clave)

    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    for id_feedback in repetidos:
        bind.execute(
            sa.text('UPDATE "Feedback" SET deleted_at = :ahora WHERE id_feedback = :id'),
            {"ahora": ahora, "id": id_feedback},
        )

    # 2) Candado en la base.
    op.create_index(
        'uq_feedback_usuario_palabra', 'Feedback', ['id_user', 'id_lexicalunit'],
        unique=True,
        postgresql_where=sa.text(_VOTO_PALABRA_ACTIVO),
        sqlite_where=sa.text(_VOTO_PALABRA_ACTIVO),
    )


def downgrade() -> None:
    op.drop_index('uq_feedback_usuario_palabra', table_name='Feedback')
