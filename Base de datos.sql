-- ============================================================
-- PROYECTO: Sign_bridge
-- DESCRIPCIÓN: Base de datos para una aplicación de traducción
--              entre lenguaje de señas y texto/voz.
-- MOTOR: MySQL 8+
-- ============================================================


-- ============================================================
-- SECCIÓN 1: CREACIÓN DE LA BASE DE DATOS
-- ============================================================

CREATE DATABASE prueba;
USE prueba;


-- ============================================================
-- SECCIÓN 2: DDL — DEFINICIÓN DE TABLAS
-- Orden respeta dependencias de claves foráneas:
--   tablas padre → tablas hijo
-- ============================================================

-- ------------------------------------------------------------
-- 2.0 Rol
-- Catálogo de roles disponibles en el sistema (admin, usuario,
-- invitado, moderador, soporte).
-- ------------------------------------------------------------
CREATE TABLE Rol (
    id_rol      CHAR(36) PRIMARY KEY DEFAULT (UUID()),  -- PK generada automáticamente
    nombre_rol  VARCHAR(50) NOT NULL UNIQUE                 -- Nombre del rol (único semánticamente)
);
-- ------------------------------------------------------------
-- 2.1 Region
-- Catálogo de regiones geográficas de Colombia.
-- Relación: Usuario N — 1 Region
-- ------------------------------------------------------------
CREATE TABLE Region (
    id_region        CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    nombre_region    VARCHAR(100) NOT NULL,
    departamento     VARCHAR(100) NOT NULL,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at       DATETIME     NULL DEFAULT NULL
);

-- ------------------------------------------------------------
-- 2.2 Usuario
-- Usuarios registrados en la plataforma. Cada usuario pertenece
-- a exactamente un Rol.
-- Relación: Usuario N — 1 Rol
-- ------------------------------------------------------------
CREATE TABLE Usuario (
    id_usuario      CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    id_rol          CHAR(36)     NOT NULL,                       -- FK → Rol
    id_region       CHAR(36)     NULL DEFAULT NULL,
    primer_nombre   VARCHAR(50) NOT NULL,
    segundo_nombre  VARCHAR(50)  NULL DEFAULT NULL,
    primer_apellido VARCHAR(50) NOT NULL,
    segundo_apellido VARCHAR(50) NULL DEFAULT NULL,
    telefono        VARCHAR(20) NOT NULL,
	direccion       VARCHAR(255) NULL DEFAULT NULL,
    ciudad          VARCHAR(100) NULL DEFAULT NULL,
    correo          VARCHAR(150) UNIQUE NOT NULL,                -- Restricción de unicidad de correo
    password_hash   VARCHAR(255) NOT NULL,                       -- Contraseña almacenada como hash
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_rol) REFERENCES Rol(id_rol) ON DELETE CASCADE,
    FOREIGN KEY (id_region) REFERENCES Region(id_region)
);

-- ------------------------------------------------------------
-- 2.3 SesionTraduccion
-- Registra cada sesión de traducción iniciada por un usuario.
-- estado: ciclo de vida → pendiente → procesando → completado / error
-- tipo_traduccion: dirección de la traducción
-- Relación: SesionTraduccion N — 1 Usuario
-- ------------------------------------------------------------
CREATE TABLE SesionTraduccion (
    id_sesion           CHAR(36)   PRIMARY KEY DEFAULT (UUID()),
    id_usuario          CHAR(36)   NOT NULL,                            -- FK → Usuario
    fecha_hora          TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,           -- Fecha/hora de creación
    estado              ENUM('pendiente','procesando','completado','error'),
    tipo_traduccion     ENUM('voz_a_senas','senas_a_texto'),
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- 2.4 EntradaVoz
-- Almacena el audio capturado y el texto generado por STT
-- (Speech-to-Text) para sesiones de tipo voz_a_senas.
-- Relación: EntradaVoz N — 1 SesionTraduccion
-- ------------------------------------------------------------
CREATE TABLE EntradaVoz (
    id_entrada_voz  CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    id_sesion       CHAR(36),                       -- FK → SesionTraduccion (nullable)
    url_audio       VARCHAR(255),                   -- Ruta/URL del archivo de audio
    texto_generado  TEXT,                           -- Transcripción producida por el motor STT
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_sesion) REFERENCES SesionTraduccion(id_sesion) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- 2.5 EntradaSenas
-- Almacena el video capturado y el texto generado por el modelo
-- de reconocimiento de señas para sesiones de tipo senas_a_texto.
-- Relación: EntradaSenas N — 1 SesionTraduccion
-- ------------------------------------------------------------
CREATE TABLE EntradaSenas (
    id_entrada_senas    CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    id_sesion           CHAR(36),                       -- FK → SesionTraduccion (nullable)
    url_video           VARCHAR(255),                   -- Ruta/URL del archivo de video
    texto_generado      TEXT,                           -- Texto extraído del video
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_sesion) REFERENCES SesionTraduccion(id_sesion) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- 2.6 LexicalUni
-- Vocabulario del sistema: LexicalUnis en distintos idiomas que
-- pueden ser referenciadas en traducciones y favoritos.
-- ------------------------------------------------------------
CREATE TABLE LexicalUni (
    id_LexicalUni  CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    texto       VARCHAR(100),   -- LexicalUni o frase corta
    idioma      VARCHAR(50) NOT NULL DEFAULT 'es_Co',     -- idioma col
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL
);


-- ------------------------------------------------------------
-- 2.7 TraduccionDetalle
-- Tabla asociativa que descompone el resultado de una sesión
-- en LexicalUnis individuales con su orden de aparición.
-- Relación: TraduccionDetalle N — 1 SesionTraduccion
--           TraduccionDetalle N — 1 LexicalUni
-- ------------------------------------------------------------
CREATE TABLE TraduccionDetalle (
    id_detalle  CHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    id_sesion   CHAR(36)  NOT NULL,   -- FK → SesionTraduccion
    id_LexicalUni  CHAR(36)  NOT NULL,   -- FK → LexicalUni
    orden       INT       NOT NULL,   -- Posición de la LexicalUni en el resultado
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_sesion)  REFERENCES SesionTraduccion(id_sesion) ON DELETE CASCADE,
    FOREIGN KEY (id_LexicalUni) REFERENCES LexicalUni(id_LexicalUni)
);


-- ------------------------------------------------------------
-- 2.8 SignAvatarConfig
-- Preferencias visuales del avatar 3D de señas para cada usuario.
-- Relación: ConfiguracionAvatar 1 — 1 Usuario  (UNIQUE en id_usuario)
-- ------------------------------------------------------------
CREATE TABLE SignAvatarConfig (
    id_sing_avatar    CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
    id_usuario          CHAR(36)    UNIQUE,                     -- FK → Usuario (1:1)
    estilo_avatar       VARCHAR(50),                            -- realista | caricatura | simple
    color_piel          VARCHAR(50),
    color_ropa          VARCHAR(50),
    tamano_avatar       ENUM('pequeno','mediano','grande'),
    ritmo_lsc INT DEFAULT 1,                          -- Multiplicador de ritmo
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- 2.9 ConfiguracionDispositivo
-- Configuración técnica del dispositivo Android del usuario.
-- Relación: ConfiguracionDispositivo 1 — 1 Usuario  (UNIQUE en id_usuario)
-- ------------------------------------------------------------
CREATE TABLE ConfiguracionDispositivo (
    id_config           CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
    id_usuario          CHAR(36)    UNIQUE,                 -- FK → Usuario (1:1)
    uso_offline         BOOLEAN,                            -- Habilita modo sin conexión
    version_android     VARCHAR(20),
    tamano_pantalla     VARCHAR(20),                        -- Pulgadas (ej. '6.5')
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- 2.10 Feedback
-- Valoraciones y comentarios de usuarios sobre sus sesiones.
-- Relación: Feedback N — 1 Usuario   (SET NULL si el usuario es eliminado)
--           Feedback N — 1 SesionTraduccion (SET NULL si la sesión es eliminada)
-- ------------------------------------------------------------
CREATE TABLE Feedback (
    id_feedback CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
    id_usuario  CHAR(36),                               -- FK → Usuario (nullable)
    id_sesion   CHAR(36),                               -- FK → SesionTraduccion (nullable)
    calificacion INT        CHECK (calificacion BETWEEN 1 AND 5),
    comentario  TEXT,
    fecha       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)          ON DELETE SET NULL,
    FOREIGN KEY (id_sesion)  REFERENCES SesionTraduccion(id_sesion)  ON DELETE SET NULL
);



-- ------------------------------------------------------------
-- 2.11 Soporte
-- Tickets de soporte técnico enviados por los usuarios.
-- Relación: Soporte N — 1 Usuario (SET NULL si el usuario es eliminado)
-- ------------------------------------------------------------
CREATE TABLE Soporte (
    id_soporte  CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
    id_usuario  CHAR(36),                               -- FK → Usuario (nullable)
    asunto      VARCHAR(150),
    mensaje     TEXT,
    estado      ENUM('pendiente','en_proceso','resuelto') DEFAULT 'pendiente',
    fecha       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE SET NULL
);


-- ------------------------------------------------------------
-- 2.12 PalabrasFavoritas
-- Palabras marcadas como favoritas por cada usuario, con
-- contador de usos para análisis de vocabulario frecuente.
-- Relación: PabrasFavoritas N — 1 Usuario
--           PalabrasFavoritas N — 1 LexicalUni
-- ------------------------------------------------------------
CREATE TABLE PalabrasFavoritas (
    id_favorito CHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    id_usuario  CHAR(36),           -- FK → Usuario
    id_LexicalUni  CHAR(36),           -- FK → LexicalUni
    veces_usado INT DEFAULT 0,      -- Frecuencia de uso de la LexicalUni
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)  ON DELETE CASCADE,
    FOREIGN KEY (id_LexicalUni) REFERENCES LexicalUni(id_LexicalUni)
);


-- ------------------------------------------------------------
-- 2.13 LogAcceso
-- Auditoría de accesos: registra login, logout e intentos fallidos.
-- Relación: LogAcceso N — 1 Usuario (SET NULL si el usuario es eliminado)
-- ------------------------------------------------------------
CREATE TABLE LogAcceso (
    id_log      CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
    id_usuario  CHAR(36),                               -- FK → Usuario (nullable)
    fecha_hora  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    tipo_acceso ENUM('login','logout','intento_fallido'),
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE SET NULL
);


-- ------------------------------------------------------------
-- 2.14 LogErrorSistema
-- Registro centralizado de errores del sistema, independiente
-- de cualquier usuario (no lleva FK).
-- ------------------------------------------------------------
CREATE TABLE LogErrorSistema (
    id_error    CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
    tipo_error  VARCHAR(100),           -- Categoría del error (DB, API, UI, Auth…)
    modulo      VARCHAR(100),           -- Módulo donde ocurrió
    mensaje     TEXT,
    fecha       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
	created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL DEFAULT NULL
);


-- ============================================================
-- SECCIÓN 3: DML — INSERCIÓN DE DATOS INICIALES
-- ============================================================

-- --- 3.1 Roles del sistema ---
INSERT INTO Rol VALUES
    (UUID(), 'admin'),
    (UUID(), 'usuario'),
    (UUID(), 'invitado'),
    (UUID(), 'moderador'),
    (UUID(), 'soporte');

-- --- 3.2 Usuarios de prueba ---
-- Cada usuario referencia un Rol usando OFFSET para variedad
INSERT INTO Usuario (
    id_usuario, id_rol, primer_nombre, primer_apellido, telefono, correo, password_hash) VALUES
    (UUID(), (SELECT id_rol FROM Rol LIMIT 1 OFFSET 0), 'Juan',   'Perez',  '3001234567', 'juan@mail.com',   'hash1'),
    (UUID(), (SELECT id_rol FROM Rol LIMIT 1 OFFSET 1), 'Maria',  'Lopez',  '3007654321', 'maria@mail.com',  'hash2'),
    (UUID(), (SELECT id_rol FROM Rol LIMIT 1 OFFSET 2), 'Carlos', 'Ruiz',   '3101112233', 'carlos@mail.com', 'hash3'),
    (UUID(), (SELECT id_rol FROM Rol LIMIT 1 OFFSET 3), 'Ana',    'Torres', '3204445566', 'ana@mail.com',    'hash4'),
    (UUID(), (SELECT id_rol FROM Rol LIMIT 1 OFFSET 4), 'Luis',   'Gomez',  '3159998877', 'luis@mail.com',   'hash5');


INSERT INTO Region (id_region, nombre_region, departamento) VALUES
    (UUID(), 'Bogotá D.C.',  'Cundinamarca'),
    (UUID(), 'Medellín',     'Antioquia'),
    (UUID(), 'Cali',         'Valle del Cauca'),
    (UUID(), 'Barranquilla', 'Atlántico'),
    (UUID(), 'Bucaramanga',  'Santander');


-- --- 3.3 Sesiones de traducción ---
INSERT INTO SesionTraduccion (id_sesion, id_usuario, estado, tipo_traduccion) VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 0),          'completado', 'voz_a_senas'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), 'procesando', 'senas_a_texto'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), 'pendiente',  'voz_a_senas'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), 'error',      'senas_a_texto'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), 'completado', 'voz_a_senas');

-- --- 3.4 Entradas de voz (audio + transcripción) ---
INSERT INTO EntradaVoz (id_entrada_voz,id_sesion,url_audio,texto_generado) VALUES
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 0), 'audio1.mp3', 'hola como estas'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 1), 'audio2.mp3', 'buenos dias'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 2), 'audio3.mp3', 'gracias'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 3), 'audio4.mp3', 'por favor'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 4), 'audio5.mp3', 'hasta luego');

-- --- 3.5 Entradas de señas (video + texto reconocido) ---
INSERT INTO EntradaSenas (id_entrada_senas,id_sesion,url_video,texto_generado) VALUES
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 0),  'video1.mp4', 'hola'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 1), 'video2.mp4', 'adios'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 2), 'video3.mp4', 'gracias'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 3), 'video4.mp4', 'bien'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 4), 'video5.mp4', 'mal');



-- --- 3.6 Vocabulario del sistema ---
INSERT INTO LexicalUni (id_LexicalUni,texto,idioma)VALUES
    (UUID(), 'hola',   'es_Co'),
    (UUID(), 'adios',  'es_Co'),
    (UUID(), 'gracias','es_Co'),
    (UUID(), 'buenas noches', 'es_Co'),
    (UUID(), 'buenos dias',  'es_Co');

-- --- 3.7 Detalle de traducciones (relación sesión ↔ LexicalUnis) ---
INSERT INTO TraduccionDetalle (id_detalle, id_sesion, id_LexicalUni, orden) VALUES
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 0),          (SELECT id_LexicalUni FROM LexicalUni LIMIT 1),          1),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 1), (SELECT id_LexicalUni FROM LexicalUni LIMIT 1 OFFSET 1), 2),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 2), (SELECT id_LexicalUni FROM LexicalUni LIMIT 1 OFFSET 2), 3),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 3), (SELECT id_LexicalUni FROM LexicalUni LIMIT 1 OFFSET 3), 4),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 4), (SELECT id_LexicalUni FROM LexicalUni LIMIT 1 OFFSET 4), 5);

-- --- 3.8 Configuración de avatares ---
INSERT INTO SignAvatarConfig (id_sing_avatar, id_usuario, estilo_avatar, color_piel, color_ropa, tamano_avatar, ritmo_lsc) VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 0),          'realista',  'claro', 'rojo',  'mediano', 1),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), 'caricatura','oscuro','azul',  'grande',  2),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), 'simple',   'medio', 'verde', 'pequeno', 1),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), 'realista',  'claro', 'negro', 'mediano', 3),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), 'caricatura','oscuro','blanco','grande',  2);

-- --- 3.9 Configuración de dispositivos ---
INSERT INTO ConfiguracionDispositivo (id_config, id_usuario, uso_offline, version_android, tamano_pantalla) VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 0),          TRUE,  'Android 12', '6.5'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), FALSE, 'Android 11', '6.0'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), TRUE,  'Android 13', '6.7'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), FALSE, 'Android 10', '5.8'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), TRUE,  'Android 14', '7.0');

-- --- 3.10 Feedback de usuarios ---
INSERT INTO Feedback  (id_feedback, id_usuario, id_sesion, calificacion, comentario, fecha) VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 0),          (SELECT id_sesion FROM SesionTraduccion LIMIT 1),          5, 'Excelente', NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 1), 4, 'Muy bueno', NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 2), 3, 'Normal',    NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 3), 2, 'Regular',   NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 4), 1, 'Malo',      NOW());

-- --- 3.11 Tickets de soporte ---
INSERT INTO Soporte (id_soporte, id_usuario, asunto, mensaje, estado, fecha) VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 0),          'Error app',  'No funciona', 'pendiente', NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), 'Bug',        'Se cierra',   'en_proceso',NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), 'Consulta',   'Como usar',   'resuelto',  NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), 'Error audio','No graba',    'pendiente', NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), 'Error video','No carga',    'en_proceso',NOW());

-- --- 3.12 Palabras favoritas ---
INSERT INTO PalabrasFavoritas (id_favorito, id_usuario, id_LexicalUni, veces_usado) VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 0),  (SELECT id_LexicalUni FROM LexicalUni LIMIT 1 OFFSET 0), 5),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), (SELECT id_LexicalUni FROM LexicalUni LIMIT 1 OFFSET 1), 3),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), (SELECT id_LexicalUni FROM LexicalUni LIMIT 1 OFFSET 2), 7),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), (SELECT id_LexicalUni FROM LexicalUni LIMIT 1 OFFSET 3), 2),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), (SELECT id_LexicalUni FROM LexicalUni LIMIT 1 OFFSET 4), 4);

-- --- 3.13 Log de accesos ---
INSERT INTO LogAcceso (id_log, id_usuario, fecha_hora, tipo_acceso) VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 0),          NOW(), 'login'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), NOW(), 'logout'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), NOW(), 'intento_fallido'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), NOW(), 'login'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), NOW(), 'logout');


-- --- 3.14 Log de errores del sistema ---
INSERT INTO LogErrorSistema (id_error,tipo_error,modulo,mensaje,fecha) VALUES
    (UUID(), 'Error DB',    'MySQL',          'Conexion fallida',       NOW()),
    (UUID(), 'Error API',   'Backend',        'Timeout',                NOW()),
    (UUID(), 'Error UI',    'Frontend',       'Render fallo',           NOW()),
    (UUID(), 'Error Auth',  'Login',          'Credenciales invalidas', NOW()),
    (UUID(), 'Error Audio', 'Procesamiento',  'No reconocido',          NOW());
    




-- ============================================================
-- SECCIÓN 4: DML — ACTUALIZACIÓN DE DATOS (UPDATE)
-- ============================================================

-- --- 4.1 Renombrar roles para mayor claridad ---
UPDATE Rol SET nombre_rol = 'Administrador' WHERE nombre_rol = 'admin';
UPDATE Rol SET nombre_rol = 'Cliente'       WHERE nombre_rol = 'usuario';

-- --- 4.2 Actualizar datos de usuarios ---
UPDATE Usuario SET primer_nombre        = 'Juan Actualizado' WHERE correo = 'juan@mail.com';
UPDATE Usuario SET password_hash = 'nuevo_hash'       WHERE correo = 'maria@mail.com';


UPDATE Region SET nombre_region = 'Bogotá D.C.' WHERE nombre_region = 'Bogotá D.C.';
UPDATE Region SET departamento = 'cali' WHERE departamento = 'Valle del Cauca'; 


-- --- 4.3 Cambios de estado en sesiones ---
UPDATE SesionTraduccion SET estado           = 'completado'   WHERE estado           = 'pendiente';
UPDATE SesionTraduccion SET tipo_traduccion  = 'senas_a_texto' WHERE tipo_traduccion = 'voz_a_senas';

-- --- 4.4 Correcciones en entradas de voz ---
UPDATE EntradaVoz SET texto_generado = 'hola mundo'            WHERE url_audio = 'audio1.mp3';
UPDATE EntradaVoz SET url_audio      = 'audio_actualizado.mp3' WHERE url_audio = 'audio2.mp3';

-- --- 4.5 Correcciones en entradas de señas ---
UPDATE EntradaSenas SET texto_generado = 'hola actualizado' WHERE url_video = 'video1.mp4';
UPDATE EntradaSenas SET url_video      = 'video_new.mp4'    WHERE url_video = 'video2.mp4';

-- --- 4.6 Normalización del campo idioma en LexicalUni ---
UPDATE LexicalUni SET idioma = 'español'     WHERE idioma = 'es';
UPDATE LexicalUni SET idioma  = 'es_Co' WHERE idioma  = 'es';

-- --- 4.7 Reordenar posiciones en TraduccionDetalle ---
UPDATE TraduccionDetalle SET orden = 10 WHERE orden = 1;
UPDATE TraduccionDetalle SET orden = 20 WHERE orden = 2;

-- --- 4.8 Ajustes de avatar ---
UPDATE SignAvatarConfig SET ritmo_lsc = 3        WHERE ritmo_lsc = 1;
UPDATE SignAvatarConfig SET color_ropa          = 'amarillo' WHERE color_ropa        = 'rojo';

-- --- 4.9 Cambios en configuración de dispositivos ---
UPDATE ConfiguracionDispositivo SET uso_offline      = FALSE        WHERE uso_offline      = TRUE;
UPDATE ConfiguracionDispositivo SET version_android  = 'Android 15' WHERE version_android = 'Android 12';

-- --- 4.10 Corrección de feedback ---
UPDATE Feedback SET calificacion = 5         WHERE calificacion = 1;
UPDATE Feedback SET comentario   = 'Mejorado' WHERE comentario  = 'Regular';

-- --- 4.11 Actualización de estados de soporte ---
UPDATE Soporte SET estado = 'resuelto'   WHERE estado = 'pendiente';
UPDATE Soporte SET asunto = 'Actualizado' WHERE asunto = 'Bug';

-- --- 4.12 Incremento de contador de Palabras favoritas ---
UPDATE PalabrasFavoritas SET veces_usado = veces_usado + 1 WHERE veces_usado = 5;
UPDATE PalabrasFavoritas SET veces_usado = 10              WHERE veces_usado = 2;

-- --- 4.13 Corrección de tipos de acceso en LogAcceso ---
UPDATE LogAcceso SET tipo_acceso = 'login'  WHERE tipo_acceso = 'intento_fallido';
UPDATE LogAcceso SET tipo_acceso = 'logout' WHERE tipo_acceso = 'login';


-- ============================================================
-- SECCIÓN 5: DML — ELIMINACIÓN DE DATOS (DELETE)
-- Se eliminan 2 registros de cada tabla en orden que respeta FKs.
-- El orden es de tablas hijo a tablas padre.
-- ============================================================

-- Tablas hijo sin dependencias internas
DELETE FROM EntradaVoz       ORDER BY id_entrada_voz   LIMIT 1;
DELETE FROM EntradaVoz       ORDER BY id_entrada_voz   LIMIT 1;
DELETE FROM EntradaSenas     ORDER BY id_entrada_senas  LIMIT 1;
DELETE FROM EntradaSenas     ORDER BY id_entrada_senas  LIMIT 1;
DELETE FROM TraduccionDetalle ORDER BY id_detalle       LIMIT 1;
DELETE FROM TraduccionDetalle ORDER BY id_detalle       LIMIT 1;
DELETE FROM Feedback         ORDER BY id_feedback       LIMIT 1;
DELETE FROM Feedback         ORDER BY id_feedback       LIMIT 1;
DELETE FROM Soporte          ORDER BY id_soporte        LIMIT 1;
DELETE FROM Soporte          ORDER BY id_soporte        LIMIT 1;
DELETE FROM PalabrasFavoritas ORDER BY id_favorito      LIMIT 1;
DELETE FROM PalabrasFavoritas ORDER BY id_favorito      LIMIT 1;
DELETE FROM LogAcceso        ORDER BY id_log            LIMIT 1;
DELETE FROM LogAcceso        ORDER BY id_log            LIMIT 1;

-- Tablas con dependencias (se eliminan después de sus hijos)
DELETE FROM SesionTraduccion       ORDER BY id_sesion         LIMIT 1;
DELETE FROM SesionTraduccion       ORDER BY id_sesion         LIMIT 1;
DELETE FROM SignAvatarConfig    ORDER BY id_sing_avatar  LIMIT 1;
DELETE FROM SignAvatarConfig    ORDER BY id_sing_avatar  LIMIT 1;
DELETE FROM ConfiguracionDispositivo ORDER BY id_config       LIMIT 1;
DELETE FROM ConfiguracionDispositivo ORDER BY id_config       LIMIT 1;
DELETE FROM Usuario               ORDER BY id_usuario         LIMIT 1;
DELETE FROM Usuario               ORDER BY id_usuario         LIMIT 1;

-- Tablas raíz (sin FK entrantes)
DELETE FROM Rol              ORDER BY id_rol             LIMIT 1;
DELETE FROM Rol              ORDER BY id_rol             LIMIT 1;
DELETE FROM LexicalUni       ORDER BY id_LexicalUni         LIMIT 1;
DELETE FROM LexicalUni       ORDER BY id_LexicalUni         LIMIT 1;
DELETE FROM LogErrorSistema  ORDER BY id_error           LIMIT 1;
DELETE FROM LogErrorSistema  ORDER BY id_error           LIMIT 1;


-- ============================================================
-- SECCIÓN 6: MERGE (INSERT … ON DUPLICATE KEY UPDATE)
-- Patrón upsert: inserta si no existe, actualiza si ya existe.
-- Útil para sincronización de datos desde fuentes externas.
-- ============================================================

-- --- 6.1 Merge de Usuario ---
INSERT INTO Usuario (id_usuario, id_rol, primer_nombre, primer_apellido, telefono, correo, password_hash)
SELECT id_usuario, id_rol, primer_nombre, primer_apellido, telefono, correo, password_hash
FROM Usuario AS nuevo
ON DUPLICATE KEY UPDATE
    primer_nombre = nuevo.primer_nombre,
    primer_apellido = nuevo.primer_apellido,
    telefono = nuevo.telefono,
    password_hash = nuevo.password_hash,
    id_rol = nuevo.id_rol;
SELECT * FROM Usuario;

-- --- 6.2 Merge de LexicalUni ---
INSERT INTO LexicalUni (id_LexicalUni, texto, idioma)
SELECT id_LexicalUni, texto, idioma FROM LexicalUni AS nueva
ON DUPLICATE KEY UPDATE
    texto  = nueva.texto,
    idioma = nueva.idioma;
SELECT * FROM LexicalUni;

-- --- 6.3 Merge de SesionTraduccion ---
INSERT INTO SesionTraduccion (id_sesion, id_usuario, estado, tipo_traduccion)
SELECT id_sesion, id_usuario, estado, tipo_traduccion FROM SesionTraduccion AS nueva_sesion
ON DUPLICATE KEY UPDATE
    estado          = nueva_sesion.estado,
    tipo_traduccion = nueva_sesion.tipo_traduccion;
SELECT * FROM SesionTraduccion;

-- --- 6.4 Merge de Feedback ---
INSERT INTO Feedback (id_feedback, id_usuario, id_sesion, calificacion, comentario)
SELECT id_feedback, id_usuario, id_sesion, calificacion, comentario FROM Feedback AS nuevo_fb
ON DUPLICATE KEY UPDATE
    calificacion = nuevo_fb.calificacion,
    comentario   = nuevo_fb.comentario;
SELECT * FROM Feedback;

-- --- 6.5 Merge de SignAvatarConfig  ---
INSERT INTO SignAvatarConfig (
    id_sing_avatar, id_usuario, estilo_avatar,
    color_piel, color_ropa, tamano_avatar, ritmo_lsc
)
SELECT
    id_sing_avatar, id_usuario, estilo_avatar,
    color_piel, color_ropa, tamano_avatar, ritmo_lsc
FROM SignAvatarConfig AS nuevo_av
ON DUPLICATE KEY UPDATE
    estilo_avatar = nuevo_av.estilo_avatar,
    color_piel = nuevo_av.color_piel,
    color_ropa = nuevo_av.color_ropa,
    tamano_avatar = nuevo_av.tamano_avatar,
    ritmo_lsc = nuevo_av.ritmo_lsc;
SELECT * FROM SignAvatarConfig;


-- ============================================================
-- SECCIÓN 7: CONSULTAS SELECT AVANZADAS
-- ============================================================

-- 7.1 Usuarios con correo en dominio @mail.com (LIKE)
--     Uso: segmentar usuarios por proveedor de correo
SELECT *
FROM Usuario
WHERE correo LIKE '%@mail.com';

-- 7.2 Palabras en español (LIKE con prefijo)
--     Uso: filtrar vocabulario por idioma para el motor de traducción
SELECT *
FROM LexicalUni
WHERE idioma LIKE 'es%';

-- 7.3 Feedback positivo — calificación alta (BETWEEN)
--     Uso: medir satisfacción del usuario
SELECT *
FROM Feedback
WHERE calificacion BETWEEN 4 AND 5;

-- 7.4 Feedback negativo — calificación baja (BETWEEN + ORDER BY)
--     Uso: detectar problemas y áreas de mejora
SELECT *
FROM Feedback
WHERE calificacion BETWEEN 1 AND 2
ORDER BY calificacion ASC;

-- 7.5 Sesiones en estados problemáticos (IN)
--     Uso: monitorear procesos incompletos o fallidos
SELECT *
FROM SesionTraduccion
WHERE estado IN ('pendiente', 'error');

-- 7.6 Auditoría de accesos por tipo (IN + ORDER BY DESC)
--     Uso: seguimiento de actividad y seguridad
SELECT *
FROM LogAcceso
WHERE tipo_acceso IN ('login', 'logout')
ORDER BY fecha_hora DESC;

-- 7.7 Feedback sin usuario asociado (IS NULL)
--     Uso: detectar inconsistencias o registros huérfanos
SELECT *
FROM Feedback
WHERE id_usuario IS NULL;

-- 7.8 Tickets de soporte activos (OR)
--     Uso: gestión de cola de atención al cliente
SELECT *
FROM Soporte
WHERE estado = 'pendiente'
   OR estado = 'en_proceso';

-- 7.9 Dispositivos offline activos con Android reciente (AND)
--     Uso: análisis de compatibilidad para funcionalidad offline
SELECT *
FROM ConfiguracionDispositivo
WHERE uso_offline     = TRUE
  AND version_android LIKE 'Android 1%';

-- 7.10 palabras favoritas más frecuentes (ORDER BY DESC)
--      Uso: identificar vocabulario clave para optimizar predicción/IA
SELECT *
FROM PalabrasFavoritas
WHERE veces_usado > 2
ORDER BY veces_usado DESC;


