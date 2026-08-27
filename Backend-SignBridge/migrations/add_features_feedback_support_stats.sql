-- ============================================================
-- Migration: Soporte con respuesta, Calificación por palabra,
--            Notificaciones y Estadísticas avanzadas
-- Ejecutar una sola vez contra la base de datos sign_bridge
-- ============================================================

-- ============================================================
-- 1. Tabla SupportResponse — respuestas del equipo de soporte
-- ============================================================
CREATE TABLE IF NOT EXISTS "SupportResponse" (
    id_response  VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    id_support   VARCHAR(36)  NOT NULL REFERENCES "Support"(id_support),
    id_responder VARCHAR(36)  NOT NULL REFERENCES "User"(id_user),
    content      TEXT         NOT NULL,
    is_auto      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMP    NULL
);

CREATE INDEX IF NOT EXISTS idx_support_response_support ON "SupportResponse"(id_support);
CREATE INDEX IF NOT EXISTS idx_support_response_responder ON "SupportResponse"(id_responder);

CREATE TRIGGER trg_support_response_updated_at
    BEFORE UPDATE ON "SupportResponse"
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- 2. Tabla WordRating — calificación promedio por palabra traducida
-- ============================================================
CREATE TABLE IF NOT EXISTS "WordRating" (
    id_word_rating VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    id_lexicalunit VARCHAR(36)  NOT NULL REFERENCES "LexicalUnit"(id_lexicalunit),
    id_user        VARCHAR(36)  NOT NULL REFERENCES "User"(id_user),
    rating         INT          NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment        TEXT         NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMP    NULL,
    UNIQUE(id_lexicalunit, id_user)
);

CREATE INDEX IF NOT EXISTS idx_word_rating_lexical ON "WordRating"(id_lexicalunit);

CREATE TRIGGER trg_word_rating_updated_at
    BEFORE UPDATE ON "WordRating"
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- 3. Tabla Notification — notificaciones del sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS "Notification" (
    id_notification VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    id_user         VARCHAR(36)  NOT NULL REFERENCES "User"(id_user),
    title           VARCHAR(200) NOT NULL,
    message         TEXT         NOT NULL,
    type            VARCHAR(50)  NOT NULL DEFAULT 'info',
    is_read         BOOLEAN      NOT NULL DEFAULT FALSE,
    link            VARCHAR(500) NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMP    NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_user ON "Notification"(id_user, is_read, created_at DESC);

CREATE TRIGGER trg_notification_updated_at
    BEFORE UPDATE ON "Notification"
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
-- 4. Vista: Frases más usadas (top palabras en traducciones)
-- ============================================================
CREATE OR REPLACE VIEW vw_most_used_phrases AS
SELECT
    lu.id_lexicalunit,
    lu.text AS phrase,
    lu.language,
    COUNT(td.id_detail) AS times_used,
    COUNT(DISTINCT ts.id_user) AS unique_users,
    lu.video_url
FROM "TranslationDetail" td
INNER JOIN "LexicalUnit" lu ON td.id_lexicalunit = lu.id_lexicalunit
INNER JOIN "TranslationSession" ts ON td.id_session = ts.id_session
WHERE td.deleted_at IS NULL
  AND lu.deleted_at IS NULL
  AND ts.deleted_at IS NULL
GROUP BY lu.id_lexicalunit, lu.text, lu.language, lu.video_url
ORDER BY times_used DESC;

SELECT * FROM vw_most_used_phrases;


-- ============================================================
-- 5. Vista: Estadísticas de interacción del usuario
-- ============================================================
CREATE OR REPLACE VIEW vw_user_interaction_stats AS
SELECT
    u.id_user,
    u.first_name || ' ' || u.last_name AS full_name,
    u.email,
    COUNT(DISTINCT ts.id_session) AS total_sessions,
    COUNT(DISTINCT CASE WHEN ts.translation_type = 'voice_to_sign' THEN ts.id_session END) AS voice_to_sign_sessions,
    COUNT(DISTINCT CASE WHEN ts.translation_type = 'sign_to_text' THEN ts.id_session END) AS sign_to_text_sessions,
    COUNT(DISTINCT fw.id_favorite) AS favorites_count,
    COUNT(DISTINCT td.id_detail) AS words_translated,
    COUNT(DISTINCT fb.id_feedback) AS feedbacks_given,
    MAX(ts.date_time) AS last_session_date
FROM "User" u
LEFT JOIN "TranslationSession" ts ON u.id_user = ts.id_user AND ts.deleted_at IS NULL
LEFT JOIN "TranslationDetail" td ON ts.id_session = td.id_session AND td.deleted_at IS NULL
LEFT JOIN "FavoriteWords" fw ON u.id_user = fw.id_user AND fw.deleted_at IS NULL
LEFT JOIN "Feedback" fb ON u.id_user = fb.id_user AND fb.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id_user, u.first_name, u.last_name, u.email;

SELECT * FROM vw_user_interaction_stats;


-- ============================================================
-- 6. Vista: Calificación promedio por palabra
-- ============================================================
CREATE OR REPLACE VIEW vw_word_ratings AS
SELECT
    lu.id_lexicalunit,
    lu.text AS word,
    lu.language,
    COUNT(wr.id_word_rating) AS total_ratings,
    ROUND(AVG(wr.rating), 2) AS avg_rating,
    COUNT(DISTINCT wr.id_user) AS rated_by_users
FROM "LexicalUnit" lu
LEFT JOIN "WordRating" wr ON lu.id_lexicalunit = wr.id_lexicalunit AND wr.deleted_at IS NULL
WHERE lu.deleted_at IS NULL
GROUP BY lu.id_lexicalunit, lu.text, lu.language
ORDER BY total_ratings DESC, avg_rating DESC;

SELECT * FROM vw_word_ratings;
