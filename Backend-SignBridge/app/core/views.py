"""Vistas SQL `vw_*` compartidas entre las migraciones de Alembic y los tests.

El mismo DDL se usa en PostgreSQL (entorno/CI) y en SQLite (suite de pruebas),
así que el SQL debe ser portable entre ambos dialectos:

* sin esquema explícito (``public.`` no existe en SQLite),
* sin funciones propietarias (``TRIM(BOTH FROM …)`` → ``TRIM(…)``,
  sin ``::numeric`` ni ``gen_random_uuid()``),
* identificadores con comillas dobles (``"User"`` es sensible a mayúsculas en
  PostgreSQL y las tablas se crearon con mayúsculas),
* solo operadores y funciones presentes en los dos: ``||``, ``COALESCE``,
  ``COUNT(DISTINCT …)``, ``AVG``, ``ROUND(x, 2)``, subconsultas.

La semántica replica la del volcado canónico (`Base-de-datos/schema.sql`),
de modo que los dashboards devuelven lo mismo en PG y en SQLite.
"""

from sqlalchemy import text

# Nombre de la vista → sentencia CREATE VIEW (sin terminador).
VIEW_STATEMENTS: dict[str, str] = {
    "vw_admin_dashboard": """
        CREATE VIEW vw_admin_dashboard AS
        SELECT
            TRIM(
                u.first_name
                || CASE WHEN u.middle_name IS NOT NULL AND u.middle_name <> ''
                        THEN ' ' || u.middle_name ELSE '' END
                || ' ' || u.last_name
                || CASE WHEN u.second_last_name IS NOT NULL AND u.second_last_name <> ''
                        THEN ' ' || u.second_last_name ELSE '' END
            ) AS full_name,
            u.email,
            r.role_name,
            COALESCE(rg.region_name || ' — ' || rg.department, 'Sin región') AS region,
            COUNT(DISTINCT ts.id_session) AS total_translations,
            COUNT(DISTINCT sp.id_support)  AS support_tickets,
            COUNT(DISTINCT fb.id_feedback) AS feedback_count
        FROM "User" u
        JOIN "Role" r
            ON u.id_role = r.id_role
        LEFT JOIN "Region" rg
            ON u.id_region = rg.id_region
        LEFT JOIN "TranslationSession" ts
            ON u.id_user = ts.id_user
        LEFT JOIN "Support" sp
            ON u.id_user = sp.id_user
        LEFT JOIN "Feedback" fb
            ON u.id_user = fb.id_user
        WHERE u.deleted_at IS NULL
        GROUP BY u.first_name, u.middle_name, u.last_name, u.second_last_name,
                 u.email, r.role_name, rg.region_name, rg.department
    """,
    "vw_user_dashboard": """
        CREATE VIEW vw_user_dashboard AS
        SELECT
            TRIM(
                u.first_name
                || CASE WHEN u.middle_name IS NOT NULL AND u.middle_name <> ''
                        THEN ' ' || u.middle_name ELSE '' END
                || ' ' || u.last_name
                || CASE WHEN u.second_last_name IS NOT NULL AND u.second_last_name <> ''
                        THEN ' ' || u.second_last_name ELSE '' END
            ) AS full_name,
            u.email,
            COUNT(DISTINCT ts.id_session) AS translations_made,
            COUNT(DISTINCT fw.id_favorite) AS favorite_words,
            COALESCE(AVG(f.rating), 0)     AS average_rating,
            COUNT(DISTINCT sp.id_support)  AS support_requests
        FROM "User" u
        LEFT JOIN "TranslationSession" ts
            ON u.id_user = ts.id_user
        LEFT JOIN "FavoriteWords" fw
            ON u.id_user = fw.id_user
        LEFT JOIN "Feedback" f
            ON u.id_user = f.id_user
        LEFT JOIN "Support" sp
            ON u.id_user = sp.id_user
        WHERE u.deleted_at IS NULL
        GROUP BY u.id_user, u.first_name, u.middle_name, u.last_name,
                 u.second_last_name, u.email
    """,
    "vw_system_statistics": """
        CREATE VIEW vw_system_statistics AS
        SELECT
            (SELECT COUNT(*) FROM "User" WHERE deleted_at IS NULL)              AS total_users,
            (SELECT COUNT(*) FROM "TranslationSession"
              WHERE deleted_at IS NULL)                                         AS total_translations,
            (SELECT COUNT(*) FROM "Support"
              WHERE deleted_at IS NULL)                                         AS total_support_requests,
            (SELECT COUNT(*) FROM "Feedback"
              WHERE deleted_at IS NULL)                                         AS total_feedback,
            (SELECT ROUND(AVG(rating), 2) FROM "Feedback"
              WHERE deleted_at IS NULL)                                         AS average_rating
    """,
    "vw_users": """
        CREATE VIEW vw_users AS
        SELECT
            u.first_name,
            u.last_name,
            u.email,
            r.role_name,
            rg.region_name
        FROM "User" u
        JOIN "Role" r
            ON u.id_role = r.id_role
        LEFT JOIN "Region" rg
            ON u.id_region = rg.id_region
    """,
}

# Orden de creación/drop (los cuatro son independientes entre sí).
VIEW_NAMES: tuple[str, ...] = tuple(VIEW_STATEMENTS)


def create_views(bind) -> None:
    """Crea todas las vistas `vw_*` sobre un engine o una conexión."""
    _run(bind, [text(VIEW_STATEMENTS[name]) for name in VIEW_NAMES])


def drop_views(bind) -> None:
    """Elimina las vistas `vw_*` (idempotente)."""
    _run(bind, [text(f"DROP VIEW IF EXISTS {name}") for name in reversed(VIEW_NAMES)])


def _run(bind, statements: list) -> None:
    """Ejecuta sentencias sobre una conexión propia o sobre una existente."""
    if hasattr(bind, "execute"):  # Connection
        for statement in statements:
            bind.execute(statement)
        return

    with bind.begin() as conn:  # Engine
        for statement in statements:
            conn.execute(statement)