"""vocabulario inicial con videos locales

Revision ID: c4f1a8e2d930
Revises: 7b2e5c1d9a40
Create Date: 2026-11-28 12:00:00

Carga las 26 palabras del vocabulario con su video local (media/videos/), para
que una instalación nueva no arranque con el diccionario vacío. Así nadie
tiene que correr SQL a mano ni subir los videos uno por uno.

- Si la palabra no existe (sin importar mayúsculas), se crea.
- Si ya existe y no tiene video, se le pone el local.
- Si ya existe con video (por ejemplo un enlace de YouTube que puso el
  admin), no se toca.

Los id son fijos (uuid5 del nombre del archivo), así el downgrade sabe
exactamente cuáles creó. Portable: corre igual en PostgreSQL y en SQLite.
"""
import uuid
from datetime import datetime, timezone
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4f1a8e2d930'
down_revision: Union[str, None] = '7b2e5c1d9a40'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# (texto de la palabra, nombre del video en media/videos/ sin .mp4)
VOCABULARIO = [
    ('Adiós', 'adios'),
    ('agua', 'agua'),
    ('amigo', 'amigo'),
    ('Amor', 'amor'),
    ('aprender', 'aprender'),
    ('ayudar', 'ayudar'),
    ('Beber', 'beber'),
    ('buenas noches', 'buenas-noches'),
    ('Buenos Dias', 'buenos-dias'),
    ('Casa', 'casa'),
    ('comer', 'comer'),
    ('entender', 'entender'),
    ('Escuela', 'escuela'),
    ('estudiar', 'estudiar'),
    ('familia', 'familia'),
    ('gracias', 'gracias'),
    ('hola', 'hola'),
    ('Mamá', 'mama'),
    ('Necesitar', 'necesitar'),
    ('Papá', 'papa'),
    ('Perdón', 'perdon'),
    ('Por favor', 'por-favor'),
    ('Querer', 'querer'),
    ('Saber', 'saber'),
    ('trabajar', 'trabajar'),
    ('como estas', None),
]


def _id(texto: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"signbridge:vocabulario:{texto.lower()}"))


def _url(video):
    return f"/media/videos/{video}.mp4" if video else None


def _fue_creada_aqui(bind, texto: str) -> bool:
    return bind.execute(
        sa.text('SELECT 1 FROM "LexicalUnit" WHERE id_lexicalunit = :id'),
        {"id": _id(texto)},
    ).first() is not None


def upgrade() -> None:
    bind = op.get_bind()
    for texto, video in VOCABULARIO:
        existente = bind.execute(
            sa.text(
                'SELECT id_lexicalunit, video_url FROM "LexicalUnit" '
                "WHERE lower(text) = lower(:texto) AND deleted_at IS NULL"
            ),
            {"texto": texto},
        ).first()

        if existente is None and _fue_creada_aqui(bind, texto):
            # La creó esta migración y un downgrade la borró: se recupera.
            bind.execute(
                sa.text('UPDATE "LexicalUnit" SET deleted_at = NULL WHERE id_lexicalunit = :id'),
                {"id": _id(texto)},
            )
        elif existente is None:
            bind.execute(
                sa.text(
                    'INSERT INTO "LexicalUnit" (id_lexicalunit, text, language, video_url) '
                    "VALUES (:id, :texto, 'es_CO', :url)"
                ),
                {"id": _id(texto), "texto": texto, "url": _url(video)},
            )
        elif existente.video_url is None and video:
            bind.execute(
                sa.text('UPDATE "LexicalUnit" SET video_url = :url WHERE id_lexicalunit = :id'),
                {"url": _url(video), "id": existente.id_lexicalunit},
            )


def downgrade() -> None:
    # Borrado suave de las palabras que creó esta migración (las que ya
    # existían antes no se tocan). No se borran las filas porque pueden
    # tener traducciones o valoraciones apuntándoles.
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    ids = [_id(texto) for texto, _ in VOCABULARIO]
    op.get_bind().execute(
        sa.text('UPDATE "LexicalUnit" SET deleted_at = :ahora WHERE id_lexicalunit IN :ids')
        .bindparams(sa.bindparam("ids", expanding=True)),
        {"ahora": ahora, "ids": ids},
    )
