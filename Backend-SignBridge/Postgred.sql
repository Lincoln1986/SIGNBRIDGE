-- ============================================================
--  PROYECTO: Sign_Bridge
--  DESCRIPCIÓN: Base de datos para una aplicación de traducción
--               entre lenguaje de señas y texto/voz.
--  MOTOR: PostgreSQL 14+
-- ============================================================


-- ============================================================
--  SECCIÓN 1: CREACIÓN DE LA BASE DE DATOS
--  NOTA: En PostgreSQL no se puede ejecutar CREATE DATABASE
--  dentro de un bloque de transacción. Créala manualmente
--  desde DBeaver o con: CREATE DATABASE sign_bridge;
--  Luego conéctate a ella y ejecuta el resto del script.
-- ============================================================

-- CREATE DATABASE sign_bridge;
-- \c sign_bridge   -- (solo en psql)


-- ============================================================
--  SECCIÓN 2: EXTENSIÓN UUID
--  Necesaria para gen_random_uuid() en PostgreSQL 13+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
--  SECCIÓN 3: DDL — DEFINICIÓN DE TABLAS
--  Orden respeta dependencias de claves foráneas:
--    tablas padre → tablas hijo
-- ============================================================

-- ------------------------------------------------------------
-- 3.0 Role
-- Catálogo de roles disponibles en el sistema.
-- ------------------------------------------------------------
CREATE TABLE "Role" (
  id_role   CHAR(36)    NOT NULL DEFAULT gen_random_uuid()::TEXT,
  role_name VARCHAR(50) NOT NULL,
  PRIMARY KEY (id_role),
  UNIQUE (role_name)
);

-- ------------------------------------------------------------
-- 3.1 Region
-- Catálogo de regiones geográficas de Colombia.
-- ------------------------------------------------------------
CREATE TABLE "Region" (
  id_region   CHAR(36)     NOT NULL DEFAULT gen_random_uuid()::TEXT,
  region_name VARCHAR(100) NOT NULL,
  department  VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP        NULL,
  PRIMARY KEY (id_region)
);

-- ------------------------------------------------------------
-- 3.2 User
-- Usuarios registrados en la plataforma.
-- ------------------------------------------------------------
CREATE TABLE "User" (
  id_user          CHAR(36)     NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_role          CHAR(36)     NOT NULL,
  id_region        CHAR(36)         NULL,
  first_name       VARCHAR(50)  NOT NULL,
  middle_name      VARCHAR(50)      NULL,
  last_name        VARCHAR(50)  NOT NULL,
  second_last_name VARCHAR(50)      NULL,
  phone            VARCHAR(20)  NOT NULL,
  address          VARCHAR(255)     NULL,
  city             VARCHAR(100)     NULL,
  email            VARCHAR(150) NOT NULL,
  password_hash    VARCHAR(255) NOT NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at       TIMESTAMP        NULL,
  PRIMARY KEY (id_user),
  UNIQUE (email),
  CONSTRAINT fk_user_role   FOREIGN KEY (id_role)   REFERENCES "Role"   (id_role),
  CONSTRAINT fk_user_region FOREIGN KEY (id_region) REFERENCES "Region" (id_region)
);

-- ------------------------------------------------------------
-- 3.3 TranslationSession
-- Registra cada sesión de traducción iniciada por un usuario.
-- ------------------------------------------------------------
CREATE TABLE "TranslationSession" (
  id_session       CHAR(36)    NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_user          CHAR(36)    NOT NULL,
  date_time        TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  status           VARCHAR(20)     NULL, -- pending | processing | completed | error
  translation_type VARCHAR(20)     NULL, -- voice_to_sign | sign_to_text
  created_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at       TIMESTAMP       NULL,
  PRIMARY KEY (id_session),
  CONSTRAINT fk_session_user FOREIGN KEY (id_user) REFERENCES "User" (id_user)
);

-- ------------------------------------------------------------
-- 3.4 VoiceInput
-- Audio capturado y texto generado por STT.
-- ------------------------------------------------------------
CREATE TABLE "VoiceInput" (
  id_voice_input CHAR(36)     NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_session     CHAR(36)         NULL,
  audio_url      VARCHAR(255)     NULL,
  generated_text TEXT             NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at     TIMESTAMP        NULL,
  PRIMARY KEY (id_voice_input),
  CONSTRAINT fk_voice_session FOREIGN KEY (id_session) REFERENCES "TranslationSession" (id_session)
);

-- ------------------------------------------------------------
-- 3.5 SignInput
-- Video capturado y texto reconocido por el modelo de señas.
-- ------------------------------------------------------------
CREATE TABLE "SignInput" (
  id_sign_input  CHAR(36)     NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_session     CHAR(36)         NULL,
  video_url      VARCHAR(255)     NULL,
  generated_text TEXT             NULL,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at     TIMESTAMP        NULL,
  PRIMARY KEY (id_sign_input),
  CONSTRAINT fk_sign_session FOREIGN KEY (id_session) REFERENCES "TranslationSession" (id_session)
);

-- ------------------------------------------------------------
-- 3.6 LexicalUnit
-- Vocabulario del sistema en distintos idiomas.
-- ------------------------------------------------------------
CREATE TABLE "LexicalUnit" (
  id_lexicalunit CHAR(36)     NOT NULL DEFAULT gen_random_uuid()::TEXT,
  text           VARCHAR(100)     NULL,
  language       VARCHAR(50)  NOT NULL DEFAULT 'es_Co',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at     TIMESTAMP        NULL,
  PRIMARY KEY (id_lexicalunit)
);

-- ------------------------------------------------------------
-- 3.7 TranslationDetail
-- Descompone el resultado de una sesión en unidades léxicas.
-- ------------------------------------------------------------
CREATE TABLE "TranslationDetail" (
  id_detail      CHAR(36) NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_session     CHAR(36) NOT NULL,
  id_lexicalunit CHAR(36) NOT NULL,
  "order"        INT      NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at     TIMESTAMP     NULL,
  PRIMARY KEY (id_detail),
  CONSTRAINT fk_detail_session     FOREIGN KEY (id_session)     REFERENCES "TranslationSession" (id_session),
  CONSTRAINT fk_detail_lexicalunit FOREIGN KEY (id_lexicalunit) REFERENCES "LexicalUnit"        (id_lexicalunit)
);

-- ------------------------------------------------------------
-- 3.8 SignAvatarConfig
-- Preferencias visuales del avatar 3D de señas por usuario.
-- ------------------------------------------------------------
CREATE TABLE "SignAvatarConfig" (
  id_sign_avatar CHAR(36)    NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_user        CHAR(36)        NULL,
  avatar_style   VARCHAR(50)     NULL,
  skin_color     VARCHAR(50)     NULL,
  clothing_color VARCHAR(50)     NULL,
  avatar_size    VARCHAR(10)     NULL, -- small | medium | large
  lsc_speed      INT             NULL DEFAULT 1,
  created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at     TIMESTAMP       NULL,
  PRIMARY KEY (id_sign_avatar),
  UNIQUE (id_user),
  CONSTRAINT fk_avatar_user FOREIGN KEY (id_user) REFERENCES "User" (id_user)
);

-- ------------------------------------------------------------
-- 3.9 DeviceConfiguration
-- Configuración técnica del dispositivo Android del usuario.
-- ------------------------------------------------------------
CREATE TABLE "DeviceConfiguration" (
  id_config       CHAR(36)    NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_user         CHAR(36)        NULL,
  offline_usage   BOOLEAN         NULL,
  android_version VARCHAR(20)     NULL,
  screen_size     VARCHAR(20)     NULL,
  created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP       NULL,
  PRIMARY KEY (id_config),
  UNIQUE (id_user),
  CONSTRAINT fk_device_user FOREIGN KEY (id_user) REFERENCES "User" (id_user)
);

-- ------------------------------------------------------------
-- 3.10 Feedback
-- Valoraciones y comentarios de usuarios sobre sus sesiones.
-- ------------------------------------------------------------
CREATE TABLE "Feedback" (
  id_feedback CHAR(36)  NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_user     CHAR(36)      NULL,
  id_session  CHAR(36)      NULL,
  rating      INT           NULL,
  comment     TEXT          NULL,
  date        TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP     NULL,
  PRIMARY KEY (id_feedback),
  CONSTRAINT chk_feedback_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_feedback_user    FOREIGN KEY (id_user)    REFERENCES "User"               (id_user),
  CONSTRAINT fk_feedback_session FOREIGN KEY (id_session) REFERENCES "TranslationSession" (id_session)
);

-- ------------------------------------------------------------
-- 3.11 Support
-- Tickets de soporte técnico enviados por los usuarios.
-- ------------------------------------------------------------
CREATE TABLE "Support" (
  id_support VARCHAR(36)  NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_user    CHAR(36)         NULL,
  subject    VARCHAR(150)     NULL,
  message    TEXT             NULL,
  status     VARCHAR(20)      NULL DEFAULT 'pending', -- pending | in_process | resolved
  date       TIMESTAMP        NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP        NULL,
  PRIMARY KEY (id_support),
  CONSTRAINT fk_support_user FOREIGN KEY (id_user) REFERENCES "User" (id_user)
);

-- ------------------------------------------------------------
-- 3.12 FavoriteWords
-- Palabras favoritas por usuario con contador de usos.
-- ------------------------------------------------------------
CREATE TABLE "FavoriteWords" (
  id_favorite    CHAR(36) NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_user        CHAR(36)     NULL,
  id_lexicalunit CHAR(36)     NULL,
  times_used     INT          NULL DEFAULT 0,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at     TIMESTAMP     NULL,
  PRIMARY KEY (id_favorite),
  CONSTRAINT fk_favorite_user        FOREIGN KEY (id_user)        REFERENCES "User"        (id_user),
  CONSTRAINT fk_favorite_lexicalunit FOREIGN KEY (id_lexicalunit) REFERENCES "LexicalUnit" (id_lexicalunit)
);

-- ------------------------------------------------------------
-- 3.13 AccessLog
-- Auditoría de accesos: login, logout e intentos fallidos.
-- ------------------------------------------------------------
CREATE TABLE "AccessLog" (
  id_log      CHAR(36)    NOT NULL DEFAULT gen_random_uuid()::TEXT,
  id_user     CHAR(36)        NULL,
  date_time   TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
  access_type VARCHAR(20)     NULL, -- login | logout | failed_attempt
  created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  TIMESTAMP       NULL,
  PRIMARY KEY (id_log),
  CONSTRAINT fk_accesslog_user FOREIGN KEY (id_user) REFERENCES "User" (id_user)
);

-- ------------------------------------------------------------
-- 3.14 SystemErrorLog
-- Registro centralizado de errores del sistema.
-- ------------------------------------------------------------
CREATE TABLE "SystemErrorLog" (
  id_error   CHAR(36)     NOT NULL DEFAULT gen_random_uuid()::TEXT,
  error_type VARCHAR(100)     NULL,
  module     VARCHAR(100)     NULL,
  message    TEXT             NULL,
  date       TIMESTAMP        NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP        NULL,
  PRIMARY KEY (id_error)
);


-- ============================================================
--  SECCIÓN 4: FUNCIÓN Y TRIGGERS PARA updated_at
--  En PostgreSQL ON UPDATE no existe; se usan triggers.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger por tabla
CREATE TRIGGER trg_region_updated_at             BEFORE UPDATE ON "Region"            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_user_updated_at               BEFORE UPDATE ON "User"              FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_translation_session_updated_at BEFORE UPDATE ON "TranslationSession" FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_voice_input_updated_at        BEFORE UPDATE ON "VoiceInput"        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_sign_input_updated_at         BEFORE UPDATE ON "SignInput"         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_lexical_unit_updated_at       BEFORE UPDATE ON "LexicalUnit"       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_translation_detail_updated_at BEFORE UPDATE ON "TranslationDetail" FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_sign_avatar_updated_at        BEFORE UPDATE ON "SignAvatarConfig"  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_device_config_updated_at      BEFORE UPDATE ON "DeviceConfiguration" FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_feedback_updated_at           BEFORE UPDATE ON "Feedback"          FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_support_updated_at            BEFORE UPDATE ON "Support"           FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_favorite_words_updated_at     BEFORE UPDATE ON "FavoriteWords"     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_access_log_updated_at         BEFORE UPDATE ON "AccessLog"         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_system_error_log_updated_at   BEFORE UPDATE ON "SystemErrorLog"    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ============================================================
--  SECCIÓN 5: DML — INSERCIÓN DE DATOS INICIALES
-- ============================================================

-- --- 5.1 Roles del sistema ---
INSERT INTO "Role" (id_role, role_name) VALUES
  (gen_random_uuid()::TEXT, 'admin'),
  (gen_random_uuid()::TEXT, 'usuario'),
  (gen_random_uuid()::TEXT, 'invitado'),
  (gen_random_uuid()::TEXT, 'moderador'),
  (gen_random_uuid()::TEXT, 'soporte');

-- --- 5.2 Regiones ---
INSERT INTO "Region" (id_region, region_name, department) VALUES
  (gen_random_uuid()::TEXT, 'Bogotá D.C.',  'Cundinamarca'),
  (gen_random_uuid()::TEXT, 'Medellín',     'Antioquia'),
  (gen_random_uuid()::TEXT, 'Cali',         'Valle del Cauca'),
  (gen_random_uuid()::TEXT, 'Barranquilla', 'Atlántico'),
  (gen_random_uuid()::TEXT, 'Bucaramanga',  'Santander');

-- --- 5.3 Usuarios de prueba ---
INSERT INTO "User" (id_user, id_role, first_name, last_name, phone, email, password_hash)
SELECT
  gen_random_uuid()::TEXT,
  id_role,
  first_name,
  last_name,
  phone,
  email,
  password_hash
FROM (VALUES
  ((SELECT id_role FROM "Role" ORDER BY id_role LIMIT 1 OFFSET 0), 'Juan',   'Perez',  '3001234567', 'juan@mail.com',   'hash1'),
  ((SELECT id_role FROM "Role" ORDER BY id_role LIMIT 1 OFFSET 1), 'Maria',  'Lopez',  '3007654321', 'maria@mail.com',  'hash2'),
  ((SELECT id_role FROM "Role" ORDER BY id_role LIMIT 1 OFFSET 2), 'Carlos', 'Ruiz',   '3101112233', 'carlos@mail.com', 'hash3'),
  ((SELECT id_role FROM "Role" ORDER BY id_role LIMIT 1 OFFSET 3), 'Ana',    'Torres', '3204445566', 'ana@mail.com',    'hash4'),
  ((SELECT id_role FROM "Role" ORDER BY id_role LIMIT 1 OFFSET 4), 'Luis',   'Gomez',  '3159998877', 'luis@mail.com',   'hash5')
) AS v(id_role, first_name, last_name, phone, email, password_hash);

-- --- 5.4 Sesiones de traducción ---
INSERT INTO "TranslationSession" (id_session, id_user, status, translation_type)
SELECT gen_random_uuid()::TEXT, id_user, status, translation_type
FROM (VALUES
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 0), 'completed',  'voice_to_sign'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 1), 'processing', 'sign_to_text'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 2), 'pending',    'voice_to_sign'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 3), 'error',      'sign_to_text'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 4), 'completed',  'voice_to_sign')
) AS v(id_user, status, translation_type);

-- --- 5.5 Entradas de voz ---
INSERT INTO "VoiceInput" (id_voice_input, id_session, audio_url, generated_text)
SELECT gen_random_uuid()::TEXT, id_session, audio_url, generated_text
FROM (VALUES
  ((SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 0), 'audio1.mp3', 'hola como estas'),
  ((SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 1), 'audio2.mp3', 'buenos dias'),
  ((SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 2), 'audio3.mp3', 'gracias'),
  ((SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 3), 'audio4.mp3', 'por favor'),
  ((SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 4), 'audio5.mp3', 'hasta luego')
) AS v(id_session, audio_url, generated_text);

-- --- 5.6 Entradas de señas ---
INSERT INTO "SignInput" (id_sign_input, id_session, video_url, generated_text)
SELECT gen_random_uuid()::TEXT, id_session, video_url, generated_text
FROM (VALUES
  ((SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 0), 'video1.mp4', 'hola'),
  ((SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 1), 'video2.mp4', 'adios'),
  ((SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 2), 'video3.mp4', 'gracias'),
  ((SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 3), 'video4.mp4', 'bien'),
  ((SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 4), 'video5.mp4', 'mal')
) AS v(id_session, video_url, generated_text);

-- --- 5.7 Vocabulario del sistema ---
INSERT INTO "LexicalUnit" (id_lexicalunit, text, language) VALUES
  (gen_random_uuid()::TEXT, 'hola',          'es_Co'),
  (gen_random_uuid()::TEXT, 'adios',         'es_Co'),
  (gen_random_uuid()::TEXT, 'gracias',       'es_Co'),
  (gen_random_uuid()::TEXT, 'buenas noches', 'es_Co'),
  (gen_random_uuid()::TEXT, 'buenos dias',   'es_Co');

-- --- 5.8 Detalle de traducciones ---
INSERT INTO "TranslationDetail" (id_detail, id_session, id_lexicalunit, "order")
SELECT gen_random_uuid()::TEXT, id_session, id_lexicalunit, ord
FROM (VALUES
  ((SELECT id_session     FROM "TranslationSession" ORDER BY id_session     LIMIT 1 OFFSET 0),
   (SELECT id_lexicalunit FROM "LexicalUnit"        ORDER BY id_lexicalunit LIMIT 1 OFFSET 0), 1),
  ((SELECT id_session     FROM "TranslationSession" ORDER BY id_session     LIMIT 1 OFFSET 1),
   (SELECT id_lexicalunit FROM "LexicalUnit"        ORDER BY id_lexicalunit LIMIT 1 OFFSET 1), 2),
  ((SELECT id_session     FROM "TranslationSession" ORDER BY id_session     LIMIT 1 OFFSET 2),
   (SELECT id_lexicalunit FROM "LexicalUnit"        ORDER BY id_lexicalunit LIMIT 1 OFFSET 2), 3),
  ((SELECT id_session     FROM "TranslationSession" ORDER BY id_session     LIMIT 1 OFFSET 3),
   (SELECT id_lexicalunit FROM "LexicalUnit"        ORDER BY id_lexicalunit LIMIT 1 OFFSET 3), 4),
  ((SELECT id_session     FROM "TranslationSession" ORDER BY id_session     LIMIT 1 OFFSET 4),
   (SELECT id_lexicalunit FROM "LexicalUnit"        ORDER BY id_lexicalunit LIMIT 1 OFFSET 4), 5)
) AS v(id_session, id_lexicalunit, ord);

-- --- 5.9 Configuración de avatares ---
INSERT INTO "SignAvatarConfig" (id_sign_avatar, id_user, avatar_style, skin_color, clothing_color, avatar_size, lsc_speed)
SELECT gen_random_uuid()::TEXT, id_user, avatar_style, skin_color, clothing_color, avatar_size, lsc_speed
FROM (VALUES
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 0), 'realistic', 'light', 'red',   'medium', 1),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 1), 'cartoon',   'dark',  'blue',  'large',  2),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 2), 'simple',    'mid',   'green', 'small',  1),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 3), 'realistic', 'light', 'black', 'medium', 3),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 4), 'cartoon',   'dark',  'white', 'large',  2)
) AS v(id_user, avatar_style, skin_color, clothing_color, avatar_size, lsc_speed);

-- --- 5.10 Configuración de dispositivos ---
INSERT INTO "DeviceConfiguration" (id_config, id_user, offline_usage, android_version, screen_size)
SELECT gen_random_uuid()::TEXT, id_user, offline_usage, android_version, screen_size
FROM (VALUES
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 0), TRUE,  'Android 12', '6.5'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 1), FALSE, 'Android 11', '6.0'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 2), TRUE,  'Android 13', '6.7'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 3), FALSE, 'Android 10', '5.8'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 4), TRUE,  'Android 14', '7.0')
) AS v(id_user, offline_usage, android_version, screen_size);

-- --- 5.11 Feedback ---
INSERT INTO "Feedback" (id_feedback, id_user, id_session, rating, comment, date)
SELECT gen_random_uuid()::TEXT, id_user, id_session, rating, comment, NOW()
FROM (VALUES
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 0), (SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 0), 5, 'Excelente'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 1), (SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 1), 4, 'Muy bueno'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 2), (SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 2), 3, 'Normal'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 3), (SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 3), 2, 'Regular'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 4), (SELECT id_session FROM "TranslationSession" ORDER BY id_session LIMIT 1 OFFSET 4), 1, 'Malo')
) AS v(id_user, id_session, rating, comment);

-- --- 5.12 Tickets de soporte ---
INSERT INTO "Support" (id_support, id_user, subject, message, status, date)
SELECT gen_random_uuid()::TEXT, id_user, subject, message, status, NOW()
FROM (VALUES
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 0), 'Error app',   'No funciona', 'pending'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 1), 'Bug',         'Se cierra',   'in_process'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 2), 'Consulta',    'Como usar',   'resolved'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 3), 'Error audio', 'No graba',    'pending'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 4), 'Error video', 'No carga',    'in_process')
) AS v(id_user, subject, message, status);

-- --- 5.13 Palabras favoritas ---
INSERT INTO "FavoriteWords" (id_favorite, id_user, id_lexicalunit, times_used)
SELECT gen_random_uuid()::TEXT, id_user, id_lexicalunit, times_used
FROM (VALUES
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 0), (SELECT id_lexicalunit FROM "LexicalUnit" ORDER BY id_lexicalunit LIMIT 1 OFFSET 0), 5),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 1), (SELECT id_lexicalunit FROM "LexicalUnit" ORDER BY id_lexicalunit LIMIT 1 OFFSET 1), 3),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 2), (SELECT id_lexicalunit FROM "LexicalUnit" ORDER BY id_lexicalunit LIMIT 1 OFFSET 2), 7),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 3), (SELECT id_lexicalunit FROM "LexicalUnit" ORDER BY id_lexicalunit LIMIT 1 OFFSET 3), 2),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 4), (SELECT id_lexicalunit FROM "LexicalUnit" ORDER BY id_lexicalunit LIMIT 1 OFFSET 4), 4)
) AS v(id_user, id_lexicalunit, times_used);

-- --- 5.14 Log de accesos ---
INSERT INTO "AccessLog" (id_log, id_user, date_time, access_type)
SELECT gen_random_uuid()::TEXT, id_user, NOW(), access_type
FROM (VALUES
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 0), 'login'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 1), 'logout'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 2), 'failed_attempt'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 3), 'login'),
  ((SELECT id_user FROM "User" ORDER BY id_user LIMIT 1 OFFSET 4), 'logout')
) AS v(id_user, access_type);

-- --- 5.15 Log de errores del sistema ---
INSERT INTO "SystemErrorLog" (id_error, error_type, module, message, date) VALUES
  (gen_random_uuid()::TEXT, 'Error DB',    'MySQL',         'Conexion fallida',       NOW()),
  (gen_random_uuid()::TEXT, 'Error API',   'Backend',       'Timeout',                NOW()),
  (gen_random_uuid()::TEXT, 'Error UI',    'Frontend',      'Render fallo',           NOW()),
  (gen_random_uuid()::TEXT, 'Error Auth',  'Login',         'Credenciales invalidas', NOW()),
  (gen_random_uuid()::TEXT, 'Error Audio', 'Procesamiento', 'No reconocido',          NOW());


-- ============================================================
--  SECCIÓN 6: DML — ACTUALIZACIÓN DE DATOS (UPDATE)
-- ============================================================

UPDATE "Role" SET role_name = 'Administrador' WHERE role_name = 'admin';
UPDATE "Role" SET role_name = 'Cliente'       WHERE role_name = 'usuario';

UPDATE "User" SET first_name    = 'Juan Actualizado' WHERE email = 'juan@mail.com';
UPDATE "User" SET password_hash = 'nuevo_hash'       WHERE email = 'maria@mail.com';

UPDATE "Region" SET department = 'cali' WHERE department = 'Valle del Cauca';

UPDATE "TranslationSession" SET status           = 'completed'    WHERE status           = 'pending';
UPDATE "TranslationSession" SET translation_type = 'sign_to_text' WHERE translation_type = 'voice_to_sign';

UPDATE "VoiceInput" SET generated_text = 'hola mundo'            WHERE audio_url = 'audio1.mp3';
UPDATE "VoiceInput" SET audio_url      = 'audio_actualizado.mp3' WHERE audio_url = 'audio2.mp3';

UPDATE "SignInput" SET generated_text = 'hola actualizado' WHERE video_url = 'video1.mp4';
UPDATE "SignInput" SET video_url      = 'video_new.mp4'    WHERE video_url = 'video2.mp4';

UPDATE "LexicalUnit" SET language = 'es_Co' WHERE language = 'es';

UPDATE "TranslationDetail" SET "order" = 10 WHERE "order" = 1;
UPDATE "TranslationDetail" SET "order" = 20 WHERE "order" = 2;

UPDATE "SignAvatarConfig" SET lsc_speed      = 3          WHERE lsc_speed      = 1;
UPDATE "SignAvatarConfig" SET clothing_color = 'amarillo' WHERE clothing_color = 'red';

UPDATE "DeviceConfiguration" SET offline_usage   = FALSE        WHERE offline_usage   = TRUE;
UPDATE "DeviceConfiguration" SET android_version = 'Android 15' WHERE android_version = 'Android 12';

UPDATE "Feedback" SET rating  = 5          WHERE rating  = 1;
UPDATE "Feedback" SET comment = 'Mejorado' WHERE comment = 'Regular';

UPDATE "Support" SET status  = 'resolved'   WHERE status  = 'pending';
UPDATE "Support" SET subject = 'Actualizado' WHERE subject = 'Bug';

UPDATE "FavoriteWords" SET times_used = times_used + 1 WHERE times_used = 5;
UPDATE "FavoriteWords" SET times_used = 10             WHERE times_used = 2;

UPDATE "AccessLog" SET access_type = 'login'  WHERE access_type = 'failed_attempt';
UPDATE "AccessLog" SET access_type = 'logout' WHERE access_type = 'login';


-- ============================================================
--  SECCIÓN 7: DML — ELIMINACIÓN DE DATOS (DELETE)
--  PostgreSQL no soporta ORDER BY en DELETE directamente;
--  se usa un subquery con ctid para tomar filas arbitrarias.
-- ============================================================
-- Deshabilitar triggers (FKs) temporalmente
SET session_replication_role = 'replica';

-- Borrar 2 registros de cada tabla hijo
DELETE FROM "VoiceInput"         WHERE ctid IN (SELECT ctid FROM "VoiceInput"         LIMIT 2);
DELETE FROM "SignInput"          WHERE ctid IN (SELECT ctid FROM "SignInput"          LIMIT 2);
DELETE FROM "TranslationDetail"  WHERE ctid IN (SELECT ctid FROM "TranslationDetail"  LIMIT 2);
DELETE FROM "Feedback"           WHERE ctid IN (SELECT ctid FROM "Feedback"           LIMIT 2);
DELETE FROM "Support"            WHERE ctid IN (SELECT ctid FROM "Support"            LIMIT 2);
DELETE FROM "FavoriteWords"      WHERE ctid IN (SELECT ctid FROM "FavoriteWords"      LIMIT 2);
DELETE FROM "AccessLog"          WHERE ctid IN (SELECT ctid FROM "AccessLog"          LIMIT 2);
DELETE FROM "SystemErrorLog"     WHERE ctid IN (SELECT ctid FROM "SystemErrorLog"     LIMIT 2);

-- Tablas intermedias
DELETE FROM "SignAvatarConfig"    WHERE ctid IN (SELECT ctid FROM "SignAvatarConfig"    LIMIT 2);
DELETE FROM "DeviceConfiguration" WHERE ctid IN (SELECT ctid FROM "DeviceConfiguration" LIMIT 2);
DELETE FROM "TranslationSession"  WHERE ctid IN (SELECT ctid FROM "TranslationSession"  LIMIT 2);

-- Tablas padre
DELETE FROM "User"        WHERE ctid IN (SELECT ctid FROM "User"        LIMIT 2);
DELETE FROM "Role"        WHERE ctid IN (SELECT ctid FROM "Role"        LIMIT 2);
DELETE FROM "Region"      WHERE ctid IN (SELECT ctid FROM "Region"      LIMIT 2);
DELETE FROM "LexicalUnit" WHERE ctid IN (SELECT ctid FROM "LexicalUnit" LIMIT 2);

-- Rehabilitar triggers (FKs)
SET session_replication_role = 'origin';
-- ============================================================
--  SECCIÓN 8: UPSERT (INSERT … ON CONFLICT DO UPDATE)
--  Equivalente PostgreSQL al ON DUPLICATE KEY UPDATE de MySQL.
-- ============================================================

-- --- 8.1 Upsert de User ---
INSERT INTO "User" (id_user, id_role, first_name, last_name, phone, email, password_hash)
SELECT id_user, id_role, first_name, last_name, phone, email, password_hash FROM "User"
ON CONFLICT (email) DO UPDATE SET
  first_name    = EXCLUDED.first_name,
  last_name     = EXCLUDED.last_name,
  phone         = EXCLUDED.phone,
  password_hash = EXCLUDED.password_hash,
  id_role       = EXCLUDED.id_role;
SELECT * FROM "User";

-- --- 8.2 Upsert de LexicalUnit ---
INSERT INTO "LexicalUnit" (id_lexicalunit, text, language)
SELECT id_lexicalunit, text, language FROM "LexicalUnit"
ON CONFLICT (id_lexicalunit) DO UPDATE SET
  text     = EXCLUDED.text,
  language = EXCLUDED.language;
SELECT * FROM "LexicalUnit";

-- --- 8.3 Upsert de TranslationSession ---
INSERT INTO "TranslationSession" (id_session, id_user, status, translation_type)
SELECT id_session, id_user, status, translation_type FROM "TranslationSession"
ON CONFLICT (id_session) DO UPDATE SET
  status           = EXCLUDED.status,
  translation_type = EXCLUDED.translation_type;
SELECT * FROM "TranslationSession";

-- --- 8.4 Upsert de Feedback ---
INSERT INTO "Feedback" (id_feedback, id_user, id_session, rating, comment)
SELECT id_feedback, id_user, id_session, rating, comment FROM "Feedback"
ON CONFLICT (id_feedback) DO UPDATE SET
  rating  = EXCLUDED.rating,
  comment = EXCLUDED.comment;
SELECT * FROM "Feedback";

-- --- 8.5 Upsert de SignAvatarConfig ---
INSERT INTO "SignAvatarConfig" (id_sign_avatar, id_user, avatar_style, skin_color, clothing_color, avatar_size, lsc_speed)
SELECT id_sign_avatar, id_user, avatar_style, skin_color, clothing_color, avatar_size, lsc_speed FROM "SignAvatarConfig"
ON CONFLICT (id_user) DO UPDATE SET
  avatar_style   = EXCLUDED.avatar_style,
  skin_color     = EXCLUDED.skin_color,
  clothing_color = EXCLUDED.clothing_color,
  avatar_size    = EXCLUDED.avatar_size,
  lsc_speed      = EXCLUDED.lsc_speed;
SELECT * FROM "SignAvatarConfig";


-- ============================================================
--  SECCIÓN 9: CONSULTAS SELECT AVANZADAS
-- ============================================================

-- 9.1 Usuarios con correo en dominio @mail.com
SELECT * FROM "User"
WHERE email LIKE '%@mail.com';

-- 9.2 Unidades léxicas en español
SELECT * FROM "LexicalUnit"
WHERE language LIKE 'es%';

-- 9.3 Feedback positivo (BETWEEN)
SELECT * FROM "Feedback"
WHERE rating BETWEEN 4 AND 5;

-- 9.4 Feedback negativo (BETWEEN + ORDER BY)
SELECT * FROM "Feedback"
WHERE rating BETWEEN 1 AND 2
ORDER BY rating ASC;

-- 9.5 Sesiones en estados problemáticos (IN)
SELECT * FROM "TranslationSession"
WHERE status IN ('pending', 'error');

-- 9.6 Auditoría de accesos (IN + ORDER BY DESC)
SELECT * FROM "AccessLog"
WHERE access_type IN ('login', 'logout')
ORDER BY date_time DESC;

-- 9.7 Feedback sin usuario asociado (IS NULL)
SELECT * FROM "Feedback"
WHERE id_user IS NULL;

-- 9.8 Tickets de soporte activos (OR)
SELECT * FROM "Support"
WHERE status = 'pending'
   OR status = 'in_process';

-- 9.9 Dispositivos offline con Android reciente (AND)
SELECT * FROM "DeviceConfiguration"
WHERE offline_usage   = TRUE
  AND android_version LIKE 'Android 1%';

-- 9.10 Palabras favoritas más frecuentes (ORDER BY DESC)
SELECT * FROM "FavoriteWords"
WHERE times_used > 2
ORDER BY times_used DESC;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;


--Dashboard para la pagina 
-- Administrador 

CREATE OR REPLACE VIEW vw_admin_dashboard AS
SELECT
    u.first_name || ' ' || u.last_name AS full_name,
    u.email,
    r.role_name,
    COALESCE(rg.region_name, 'Sin región') AS region,
    COUNT(DISTINCT ts.id_session) AS total_translations,
    COUNT(DISTINCT sp.id_support) AS support_tickets,
    COUNT(DISTINCT fb.id_feedback) AS feedback_count
FROM "User" u
INNER JOIN "Role" r
    ON u.id_role = r.id_role
LEFT JOIN "Region" rg
    ON u.id_region = rg.id_region
LEFT JOIN "TranslationSession" ts
    ON u.id_user = ts.id_user
LEFT JOIN "Support" sp
    ON u.id_user = sp.id_user
LEFT JOIN "Feedback" fb
    ON u.id_user = fb.id_user
GROUP BY
    u.first_name,
    u.last_name,
    u.email,
    r.role_name,
    rg.region_name;

SELECT * FROM vw_admin_dashboard;

-- Dashboard de usuarios 

CREATE OR REPLACE VIEW vw_user_dashboard AS
SELECT
    u.first_name || ' ' || u.last_name AS full_name,
    u.email,
    COUNT(DISTINCT ts.id_session) AS translations_made,
    COUNT(DISTINCT fw.id_favorite) AS favorite_words,
    COALESCE(AVG(f.rating),0) AS average_rating,
    COUNT(DISTINCT sp.id_support) AS support_requests
FROM "User" u
LEFT JOIN "TranslationSession" ts
    ON u.id_user = ts.id_user
LEFT JOIN "FavoriteWords" fw
    ON u.id_user = fw.id_user
LEFT JOIN "Feedback" f
    ON u.id_user = f.id_user
LEFT JOIN "Support" sp
    ON u.id_user = sp.id_user
GROUP BY
    u.id_user,
    u.first_name,
    u.last_name,
    u.email;

SELECT * FROM vw_user_dashboard;


-- Estadisticas 
CREATE OR REPLACE VIEW vw_system_statistics AS
SELECT
    (SELECT COUNT(*) FROM "User") AS total_users,
    (SELECT COUNT(*) FROM "TranslationSession") AS total_translations,
    (SELECT COUNT(*) FROM "Support") AS total_support_requests,
    (SELECT COUNT(*) FROM "Feedback") AS total_feedback,
    (SELECT ROUND(AVG(rating),2) FROM "Feedback") AS average_rating;

SELECT * FROM vw_system_statistics;
