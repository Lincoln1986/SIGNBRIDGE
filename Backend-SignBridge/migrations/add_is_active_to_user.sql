-- Migration: agregar columna is_active a la tabla User
-- Ejecutar una sola vez contra la base de datos sign_bridge

ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Todos los usuarios existentes quedan activos por defecto.
-- Índice para filtrar rápido por estado en el panel admin:
CREATE INDEX IF NOT EXISTS idx_user_is_active ON "User"(is_active)
    WHERE deleted_at IS NULL;

COMMENT ON COLUMN "User".is_active IS
    'TRUE = usuario puede autenticarse; FALSE = cuenta desactivada por un administrador';

   SELECT id_user, email, is_active FROM "User" LIMIT 5;