-- Migration: soporte da solución a los tickets + valoraciones por palabra
-- Ejecutar una sola vez contra la base de datos sign_bridge

-- 1) Tickets: la solución que da Soporte al marcar un ticket como resuelto
ALTER TABLE "Support"
    ADD COLUMN IF NOT EXISTS solution TEXT NULL;

COMMENT ON COLUMN "Support".solution IS
    'Texto de la solución que da Soporte al cambiar el ticket a estado resolved. Obligatorio para ese estado.';

-- 2) Feedback: permitir calificar una palabra puntual (no solo la sesión completa)
ALTER TABLE "Feedback"
    ADD COLUMN IF NOT EXISTS id_lexicalunit VARCHAR(36) NULL REFERENCES "LexicalUnit"(id_lexicalunit),
    ADD COLUMN IF NOT EXISTS support_response TEXT NULL;

COMMENT ON COLUMN "Feedback".id_lexicalunit IS
    'Si no es NULL, esta valoración es sobre la traducción de esa palabra puntual, no sobre la sesión completa.';
COMMENT ON COLUMN "Feedback".support_response IS
    'Respuesta (manual o de plantilla rápida) que da Soporte al marcar la valoración como revisada.';

CREATE INDEX IF NOT EXISTS idx_feedback_lexicalunit ON "Feedback"(id_lexicalunit)
    WHERE deleted_at IS NULL;
