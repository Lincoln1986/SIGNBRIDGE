-- Migration: crear tabla Message para el sistema de mensajería
-- Ejecutar una sola vez contra la base de datos sign_bridge

CREATE TABLE IF NOT EXISTS "Message" (
    id_message  VARCHAR(36)   PRIMARY KEY,
    id_sender   VARCHAR(36)   NOT NULL REFERENCES "User"(id_user),
    id_receiver VARCHAR(36)   NOT NULL REFERENCES "User"(id_user),
    content     TEXT          NOT NULL,
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    read_at     TIMESTAMP     NULL,

    CONSTRAINT chk_message_no_self_send CHECK (id_sender <> id_receiver)
);

-- Índices para acelerar consultas de conversación e inbox
CREATE INDEX IF NOT EXISTS idx_message_sender   ON "Message"(id_sender);
CREATE INDEX IF NOT EXISTS idx_message_receiver ON "Message"(id_receiver);
CREATE INDEX IF NOT EXISTS idx_message_created  ON "Message"(created_at DESC);
-- Índice compuesto para GET /messages/conversation/:id
CREATE INDEX IF NOT EXISTS idx_message_pair
    ON "Message"(id_sender, id_receiver, created_at DESC);

SELECT * FROM "Message";