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


SELECT id_role, role_name FROM "Role";

UPDATE "User" 
SET id_role = 'a9ca9e91-a269-47aa-8255-7e873eb886a1' 
WHERE email = 'admin@signbridge.com';

UPDATE "User" 
SET id_role = 'a9ca9e91-a269-47aa-8255-7e873eb886a1' 
WHERE email = 'admin@signbridge.com';

update "User"
set id_role = 'a9ca9e91-a269-47aa-8255-7e873eb886a1' 
where email = 'javiereperez578@gmail.com'

select * from "User";

ALTER TABLE "LexicalUnit" ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);

UPDATE "LexicalUnit" SET video_url = 'https://www.youtube.com/watch?v=Jxb5CHTHitg' WHERE text = 'hola';
UPDATE "LexicalUnit" SET video_url = 'https://www.youtube.com/watch?v=aL0R7TrVyKw' WHERE text = 'gracias';


-- ============================================================
--  SignBridge — Correcciones de BD
--  1. Limpiar regiones duplicadas
--  2. Agregar ciudades faltantes
--  3. Trigger asignación automática de región por ciudad
--  4. Corregir vistas con nombre completo
-- ============================================================


-- ============================================================
--  PASO 1: Limpiar regiones duplicadas
--  Conservamos los IDs que ya tienen usuarios asignados:
--    Bucaramanga → 0be2498c (tiene 3 usuarios)
--    Barranquilla → 64f8bc85
--    Bogotá      → 0fe28f37
--    Cali        → 6d087e78
--    Medellín    → 1e2a21e9
-- ============================================================

-- Reasignar usuarios que apuntan al ID duplicado de Barranquilla
UPDATE "User"
SET id_region = '64f8bc85-5278-4976-882b-9133659a2336'
WHERE id_region = '180397e3-3718-414d-8449-d65c1f60186e';

-- Reasignar usuarios que apuntan al ID duplicado de Bucaramanga
UPDATE "User"
SET id_region = '0be2498c-03e6-42ca-acfd-b1c2f1950188'
WHERE id_region = '71c63176-5132-4b66-a8c8-9780193ecea4';

-- Reasignar usuarios que apuntan al ID duplicado de Cali
UPDATE "User"
SET id_region = '6d087e78-d514-4082-88b4-06ac496fd545'
WHERE id_region = 'ec00c0e8-0638-49f1-af6d-937add9bc903';

-- Eliminar duplicados
DELETE FROM "Region" WHERE id_region IN (
  '180397e3-3718-414d-8449-d65c1f60186e',  -- Barranquilla duplicado
  '71c63176-5132-4b66-a8c8-9780193ecc4',   -- Bucaramanga duplicado
  'ec00c0e8-0638-49f1-af6d-937add9bc903'   -- Cali duplicado
);

-- Corregir el department de Cali (estaba en minúscula)
UPDATE "Region"
SET department = 'Valle del Cauca'
WHERE id_region = '6d087e78-d514-4082-88b4-06ac496fd545';

-- Corregir nombre Bogotá
UPDATE "Region"
SET region_name = 'Bogotá'
WHERE id_region = '0fe28f37-2fe6-4946-a2cc-822eec6c9ebf';


-- ============================================================
--  PASO 2: Agregar ciudades colombianas faltantes
--  Mapeadas a las regiones existentes o nuevas
-- ============================================================

INSERT INTO "Region" (id_region, region_name, department) VALUES
  (gen_random_uuid()::TEXT, 'Armenia',         'Quindío'),
  (gen_random_uuid()::TEXT, 'Arauca',          'Arauca'),
  (gen_random_uuid()::TEXT, 'Bello',           'Antioquia'),
  (gen_random_uuid()::TEXT, 'Buenaventura',    'Valle del Cauca'),
  (gen_random_uuid()::TEXT, 'Cartagena',       'Bolívar'),
  (gen_random_uuid()::TEXT, 'Cúcuta',          'Norte de Santander'),
  (gen_random_uuid()::TEXT, 'Dosquebradas',    'Risaralda'),
  (gen_random_uuid()::TEXT, 'Florencia',       'Caquetá'),
  (gen_random_uuid()::TEXT, 'Ibagué',          'Tolima'),
  (gen_random_uuid()::TEXT, 'Leticia',         'Amazonas'),
  (gen_random_uuid()::TEXT, 'Manizales',       'Caldas'),
  (gen_random_uuid()::TEXT, 'Mitú',            'Vaupés'),
  (gen_random_uuid()::TEXT, 'Mocoa',           'Putumayo'),
  (gen_random_uuid()::TEXT, 'Montería',        'Córdoba'),
  (gen_random_uuid()::TEXT, 'Neiva',           'Huila'),
  (gen_random_uuid()::TEXT, 'Palmira',         'Valle del Cauca'),
  (gen_random_uuid()::TEXT, 'Pasto',           'Nariño'),
  (gen_random_uuid()::TEXT, 'Pereira',         'Risaralda'),
  (gen_random_uuid()::TEXT, 'Popayán',         'Cauca'),
  (gen_random_uuid()::TEXT, 'Puerto Carreño',  'Vichada'),
  (gen_random_uuid()::TEXT, 'Puerto Inírida',  'Guainía'),
  (gen_random_uuid()::TEXT, 'Quibdó',          'Chocó'),
  (gen_random_uuid()::TEXT, 'Riohacha',        'La Guajira'),
  (gen_random_uuid()::TEXT, 'Santa Marta',     'Magdalena'),
  (gen_random_uuid()::TEXT, 'Sincelejo',       'Sucre'),
  (gen_random_uuid()::TEXT, 'Soacha',          'Cundinamarca'),
  (gen_random_uuid()::TEXT, 'Soledad',         'Atlántico'),
  (gen_random_uuid()::TEXT, 'Tunja',           'Boyacá'),
  (gen_random_uuid()::TEXT, 'Valledupar',      'Cesar'),
  (gen_random_uuid()::TEXT, 'Villavicencio',   'Meta'),
  (gen_random_uuid()::TEXT, 'Yumbo',           'Valle del Cauca')
ON CONFLICT DO NOTHING;


-- ============================================================
--  PASO 3: Función y Trigger para asignar región por ciudad
--  Se ejecuta automáticamente al INSERT o UPDATE en User
-- ============================================================

CREATE OR REPLACE FUNCTION fn_assign_region_by_city()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo asigna si viene con ciudad y sin región
  IF NEW.city IS NOT NULL AND (NEW.id_region IS NULL OR NEW.id_region = '') THEN
    SELECT id_region
      INTO NEW.id_region
      FROM "Region"
     WHERE LOWER(region_name) = LOWER(TRIM(NEW.city))
       AND deleted_at IS NULL
     LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si ya existe y recrear
DROP TRIGGER IF EXISTS trg_assign_region ON "User";

CREATE TRIGGER trg_assign_region
  BEFORE INSERT OR UPDATE OF city
  ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION fn_assign_region_by_city();


-- ============================================================
--  PASO 4: Asignar regiones a usuarios existentes sin región
-- ============================================================

UPDATE "User" u
SET id_region = r.id_region
FROM "Region" r
WHERE LOWER(TRIM(u.city)) = LOWER(r.region_name)
  AND u.id_region IS NULL
  AND u.deleted_at IS NULL;


-- ============================================================
--  PASO 5: Corregir vistas con nombre completo
--  Juan Pablo Pérez Díaz en lugar de Juan Pérez
-- ============================================================

CREATE OR REPLACE VIEW vw_admin_dashboard AS
SELECT
    TRIM(
      u.first_name
      || CASE WHEN u.middle_name      IS NOT NULL AND u.middle_name      <> '' THEN ' ' || u.middle_name      ELSE '' END
      || ' ' || u.last_name
      || CASE WHEN u.second_last_name IS NOT NULL AND u.second_last_name <> '' THEN ' ' || u.second_last_name ELSE '' END
    ) AS full_name,
    u.email,
    r.role_name,
    COALESCE(rg.region_name || ' — ' || rg.department, 'Sin región') AS region,
    COUNT(DISTINCT ts.id_session) AS total_translations,
    COUNT(DISTINCT sp.id_support) AS support_tickets,
    COUNT(DISTINCT fb.id_feedback) AS feedback_count
FROM "User" u
INNER JOIN "Role" r   ON u.id_role   = r.id_role
LEFT  JOIN "Region" rg ON u.id_region = rg.id_region
LEFT  JOIN "TranslationSession" ts ON u.id_user = ts.id_user
LEFT  JOIN "Support" sp            ON u.id_user = sp.id_user
LEFT  JOIN "Feedback" fb           ON u.id_user = fb.id_user
WHERE u.deleted_at IS NULL
GROUP BY
    u.first_name, u.middle_name, u.last_name, u.second_last_name,
    u.email, r.role_name, rg.region_name, rg.department;


CREATE OR REPLACE VIEW vw_user_dashboard AS
SELECT
    TRIM(
      u.first_name
      || CASE WHEN u.middle_name      IS NOT NULL AND u.middle_name      <> '' THEN ' ' || u.middle_name      ELSE '' END
      || ' ' || u.last_name
      || CASE WHEN u.second_last_name IS NOT NULL AND u.second_last_name <> '' THEN ' ' || u.second_last_name ELSE '' END
    ) AS full_name,
    u.email,
    COUNT(DISTINCT ts.id_session)  AS translations_made,
    COUNT(DISTINCT fw.id_favorite) AS favorite_words,
    COALESCE(AVG(f.rating), 0)    AS average_rating,
    COUNT(DISTINCT sp.id_support)  AS support_requests
FROM "User" u
LEFT JOIN "TranslationSession" ts ON u.id_user = ts.id_user
LEFT JOIN "FavoriteWords" fw      ON u.id_user = fw.id_user
LEFT JOIN "Feedback" f            ON u.id_user = f.id_user
LEFT JOIN "Support" sp            ON u.id_user = sp.id_user
WHERE u.deleted_at IS NULL
GROUP BY
    u.id_user, u.first_name, u.middle_name,
    u.last_name, u.second_last_name, u.email;


-- Verificar resultados
SELECT full_name, email, region FROM vw_admin_dashboard;
SELECT full_name, email, translations_made FROM vw_user_dashboard;
SELECT id_region, region_name, department FROM "Region" ORDER BY region_name;

INSERT INTO "Role" (id_role, role_name) VALUES (gen_random_uuid()::TEXT, 'Administrador'), (gen_random_uuid()::TEXT, 'Cliente'), (gen_random_uuid()::TEXT, 'Moderador'), (gen_random_uuid()::TEXT, 'Soporte') ON CONFLICT (role_name) DO NOTHING;
SELECT id_role, role_name FROM "Role";SELECT id_role, role_name FROM "Role";





