-- Migration: voto único por palabra en Feedback
-- Ejecutar una sola vez contra la base de datos sign_bridge
--
-- Bug: al calificar la traducción de una palabra (estrellas), cada clic creaba
-- una fila nueva en "Feedback" sin validar si el usuario ya la había calificado.
-- Esto permitía inflar el promedio sin límite (ej: la misma persona dejó 29
-- votos en la palabra "agua"). Esta migración:
--   1) Consolida los votos duplicados que ya existen (se conserva el voto más
--      reciente de cada usuario por palabra, el resto se soft-deletea para que
--      deje de contar en el promedio, sin borrar el historial físicamente).
--   2) Agrega un índice único parcial para que no pueda volver a pasar.

-- 1) Consolidar duplicados existentes
WITH ranked AS (
    SELECT
        id_feedback,
        ROW_NUMBER() OVER (
            PARTITION BY id_user, id_lexicalunit
            ORDER BY date DESC, id_feedback DESC
        ) AS rn
    FROM "Feedback"
    WHERE id_lexicalunit IS NOT NULL
      AND deleted_at IS NULL
)
UPDATE "Feedback" f
SET deleted_at = now()
FROM ranked
WHERE f.id_feedback = ranked.id_feedback
  AND ranked.rn > 1;

-- 2) Blindaje a nivel de base de datos: un usuario solo puede tener UN voto
--    activo (no eliminado) por palabra.
CREATE UNIQUE INDEX IF NOT EXISTS uq_feedback_user_word_active
    ON "Feedback"(id_user, id_lexicalunit)
    WHERE id_lexicalunit IS NOT NULL AND deleted_at IS NULL;
