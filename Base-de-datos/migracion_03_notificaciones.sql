-- ============================================================================
-- SignBridge — notificaciones dentro de la aplicación
--
-- Cierra la segunda mitad del punto de corrección "solo poder darle resuelto
-- al ticket si se le da una retroalimentación (el usuario debe poder recibir
-- una notificación)". Hoy ese aviso sale solo por correo; con esta tabla
-- también aparece en la campana del menú.
--
-- Aplicar UNA vez. Se puede correr varias veces sin romper nada.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Notification" (
    id_notification VARCHAR(36)  PRIMARY KEY,
    id_user         VARCHAR(36)  NOT NULL REFERENCES "User"(id_user),

    -- 'ticket_resolved' | 'feedback_answered'. Lo usa el frontend para elegir
    -- el ícono y a dónde lleva el clic.
    type            VARCHAR(40)  NOT NULL,

    title           VARCHAR(150) NOT NULL,
    body            TEXT         NULL,

    -- Id del ticket o de la valoración que originó el aviso, para poder
    -- llevar al usuario al lugar correcto. Sin llave foránea a propósito:
    -- si el ticket se borra, la notificación puede sobrevivir como historial.
    reference_id    VARCHAR(36)  NULL,

    read_at         TIMESTAMP    NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMP    NULL
);

COMMENT ON TABLE  "Notification"        IS 'Avisos in-app para el usuario (campana del menú).';
COMMENT ON COLUMN "Notification".type   IS 'ticket_resolved | feedback_answered';
COMMENT ON COLUMN "Notification".read_at IS 'NULL mientras no se haya leído; marca la fecha al leerla.';

-- La consulta más frecuente es "mis notificaciones sin leer, más recientes
-- primero", así que el índice cubre exactamente ese caso.
CREATE INDEX IF NOT EXISTS idx_notification_usuario
    ON "Notification"(id_user, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_sin_leer
    ON "Notification"(id_user)
    WHERE read_at IS NULL AND deleted_at IS NULL;

-- Evita avisos repetidos si Soporte vuelve a guardar el mismo ticket.
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_referencia
    ON "Notification"(id_user, type, reference_id)
    WHERE reference_id IS NOT NULL AND deleted_at IS NULL;

-- ── Verificación: debe devolver 1 ───────────────────────────────────────────
SELECT count(*) AS tabla_notification_creada
FROM information_schema.tables
WHERE table_name = 'Notification';
