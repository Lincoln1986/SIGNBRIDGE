-- ============================================================================
-- SignBridge — un voto por usuario y por palabra
--
-- Problema: al hacer clic repetido en las estrellas de una seña se insertaba
-- una fila nueva cada vez, inflando el promedio sin límite (la palabra "agua"
-- quedó con 29 votos de la misma persona).
--
-- Este script consolida los votos duplicados que ya existen y deja un índice
-- único para que no vuelva a pasar ni siquiera por error.
--
-- Se puede correr varias veces sin problema.
-- ============================================================================

BEGIN;

-- ── 1) Diagnóstico: qué se va a consolidar ──────────────────────────────────
SELECT f.id_user, l.text AS palabra, count(*) AS votos_duplicados
FROM "Feedback" f
JOIN "LexicalUnit" l ON l.id_lexicalunit = f.id_lexicalunit
WHERE f.id_lexicalunit IS NOT NULL
  AND f.deleted_at IS NULL
GROUP BY f.id_user, l.text
HAVING count(*) > 1
ORDER BY count(*) DESC;

-- ── 2) Conservar solo el voto más reciente de cada usuario por palabra ──────
-- Los anteriores se marcan como eliminados (soft-delete), no se borran:
-- dejan de contar en el promedio pero quedan en la base por trazabilidad.
UPDATE "Feedback" f
SET deleted_at = now()
WHERE f.id_lexicalunit IS NOT NULL
  AND f.deleted_at IS NULL
  AND f.id_feedback NOT IN (
      SELECT DISTINCT ON (id_user, id_lexicalunit) id_feedback
      FROM "Feedback"
      WHERE id_lexicalunit IS NOT NULL
        AND deleted_at IS NULL
      ORDER BY id_user, id_lexicalunit, date DESC, id_feedback
  );

-- ── 3) Candado a nivel de base ──────────────────────────────────────────────
-- Índice parcial: solo aplica a valoraciones de palabra activas, así no
-- interfiere con las valoraciones de sesión (que tienen id_lexicalunit NULL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_feedback_usuario_palabra
    ON "Feedback"(id_user, id_lexicalunit)
    WHERE id_lexicalunit IS NOT NULL AND deleted_at IS NULL;

COMMIT;

-- ── 4) Verificación: debe devolver 0 filas ──────────────────────────────────
SELECT f.id_user, l.text AS palabra, count(*) AS votos
FROM "Feedback" f
JOIN "LexicalUnit" l ON l.id_lexicalunit = f.id_lexicalunit
WHERE f.id_lexicalunit IS NOT NULL
  AND f.deleted_at IS NULL
GROUP BY f.id_user, l.text
HAVING count(*) > 1;
