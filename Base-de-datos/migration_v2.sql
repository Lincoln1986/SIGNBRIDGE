-- ============================================================================
-- Migración v2 — SignBridge
-- 1. Vista: frases más usadas (estadísticas de uso)
-- 2. Campo: Support.response (retroalimentación obligatoria para resolver)
-- 3. Tabla: FeedbackReply (respuestas a valoraciones)
-- 4. Vista: calificación promedio por palabra traducida
-- 5. Tabla: Notification (notificaciones al usuario)
-- ============================================================================

-- ── 1. Vista: Frases/palabras más traducidas ────────────────────────────────
CREATE OR REPLACE VIEW public.vw_most_used_phrases AS
SELECT
    lu.text              AS word,
    lu.language,
    lu.video_url,
    COUNT(td.id_detail)  AS times_translated,
    COUNT(DISTINCT ts.id_user) AS unique_users
FROM public."TranslationDetail" td
JOIN public."LexicalUnit" lu
    ON td.id_lexicalunit = lu.id_lexicalunit
JOIN public."TranslationSession" ts
    ON td.id_session = ts.id_session
WHERE td.deleted_at IS NULL
  AND lu.deleted_at IS NULL
  AND ts.deleted_at IS NULL
GROUP BY lu.text, lu.language, lu.video_url
ORDER BY times_translated DESC;

COMMENT ON VIEW public.vw_most_used_phrases IS
    'Estadísticas de uso: palabras más traducidas por los usuarios.';


-- ── 2. Campo: Support.response — retroalimentación para resolver ────────────
ALTER TABLE public."Support"
    ADD COLUMN IF NOT EXISTS response TEXT DEFAULT NULL;

COMMENT ON COLUMN public."Support".response IS
    'Respuesta/retroalimentación del equipo de soporte. Obligatoria para marcar como resuelto.';

-- Migrar datos existentes: tickets resolved sin response → in_progress
UPDATE public."Support"
SET status = 'in_progress'
WHERE status = 'resolved'
  AND (response IS NULL OR TRIM(response) = '');


-- ── 3. Tabla: FeedbackReply — respuestas a valoraciones ────────────────────
CREATE TABLE IF NOT EXISTS public."FeedbackReply" (
    id_reply       character(36) DEFAULT (gen_random_uuid())::text NOT NULL,
    id_feedback    character(36) NOT NULL,
    id_user        character(36) NOT NULL,
    reply_text     text NOT NULL,
    is_automatic   boolean DEFAULT false NOT NULL,
    created_at     timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at     timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at     timestamp without time zone,
    CONSTRAINT "FeedbackReply_pkey" PRIMARY KEY (id_reply)
);

ALTER TABLE public."FeedbackReply"
    ADD CONSTRAINT fk_reply_feedback
    FOREIGN KEY (id_feedback) REFERENCES public."Feedback"(id_feedback);

ALTER TABLE public."FeedbackReply"
    ADD CONSTRAINT fk_reply_user
    FOREIGN KEY (id_user) REFERENCES public."User"(id_user);

CREATE TRIGGER trg_feedback_reply_updated_at
    BEFORE UPDATE ON public."FeedbackReply"
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public."FeedbackReply" IS
    'Respuestas de soporte/admin a las valoraciones de usuarios.';

COMMENT ON COLUMN public."FeedbackReply".is_automatic IS
    'TRUE = respuesta automática generada por el sistema';


-- ── 4. Vista: Calificación promedio por palabra traducida ──────────────────
-- Calcula el rating promedio de cada palabra basándose en los feedbacks
-- de las sesiones que incluyeron esa palabra.
CREATE OR REPLACE VIEW public.vw_word_ratings AS
SELECT
    lu.id_lexicalunit,
    lu.text             AS word,
    lu.language,
    COUNT(fb.id_feedback) AS total_ratings,
    ROUND(AVG(fb.rating), 2) AS avg_rating,
    MIN(fb.rating) AS min_rating,
    MAX(fb.rating) AS max_rating
FROM public."LexicalUnit" lu
JOIN public."TranslationDetail" td
    ON td.id_lexicalunit = lu.id_lexicalunit
JOIN public."TranslationSession" ts
    ON td.id_session = ts.id_session
JOIN public."Feedback" fb
    ON fb.id_session = ts.id_session
WHERE td.deleted_at IS NULL
  AND lu.deleted_at IS NULL
  AND ts.deleted_at IS NULL
  AND fb.deleted_at IS NULL
GROUP BY lu.id_lexicalunit, lu.text, lu.language
ORDER BY avg_rating DESC, total_ratings DESC;

COMMENT ON VIEW public.vw_word_ratings IS
    'Calificación promedio por palabra traducida. Basada en los feedbacks de sesiones que usaron cada palabra.';


-- ── 5. Tabla: Notification — notificaciones al usuario ──────────────────────
CREATE TABLE IF NOT EXISTS public."Notification" (
    id_notification  character(36) DEFAULT (gen_random_uuid())::text NOT NULL,
    id_user          character(36) NOT NULL,
    title            character varying(200) NOT NULL,
    message          text NOT NULL,
    type             character varying(50) DEFAULT 'info' NOT NULL,
    is_read          boolean DEFAULT false NOT NULL,
    related_id       character varying(36),
    related_type     character varying(50),
    created_at       timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at       timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at       timestamp without time zone,
    CONSTRAINT "Notification_pkey" PRIMARY KEY (id_notification)
);

ALTER TABLE public."Notification"
    ADD CONSTRAINT fk_notification_user
    FOREIGN KEY (id_user) REFERENCES public."User"(id_user);

CREATE INDEX IF NOT EXISTS idx_notification_user_read
    ON public."Notification" (id_user, is_read)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_notification_updated_at
    BEFORE UPDATE ON public."Notification"
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

COMMENT ON TABLE public."Notification" IS
    'Notificaciones para los usuarios (resolución de tickets, respuestas a feedback, etc.)';
