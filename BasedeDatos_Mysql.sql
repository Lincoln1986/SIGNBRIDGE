-- ============================================================
-- PROYECTO: Sign_bridge
-- DESCRIPCIÓN: Base de datos para una aplicación de traducción
--              entre lenguaje de señas y texto/voz.
-- MOTOR: MySQL 8+
-- ============================================================


-- ============================================================
-- SECCIÓN 1: CREACIÓN DE LA BASE DE DATOS
-- ============================================================

CREATE DATABASE Sign_bridge;
USE Sign_bridge;


-- ============================================================
-- SECCIÓN 2: DDL — DEFINICIÓN DE TABLAS
-- Orden respeta dependencias de claves foráneas:
--   tablas padre → tablas hijo
-- ============================================================

-- ------------------------------------------------------------
-- 2.1 Rol
-- Catálogo de roles disponibles en el sistema (admin, usuario,
-- invitado, moderador, soporte).
-- ------------------------------------------------------------
CREATE TABLE Rol (
    id_rol      CHAR(36) PRIMARY KEY DEFAULT (UUID()),  -- PK generada automáticamente
    nombre_rol  VARCHAR(50) NOT NULL                    -- Nombre del rol (único semánticamente)
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
    nombre          VARCHAR(100) NOT NULL,
    correo          VARCHAR(150) UNIQUE NOT NULL,                -- Restricción de unicidad de correo
    password_hash   VARCHAR(255) NOT NULL,                       -- Contraseña almacenada como hash
    FOREIGN KEY (id_rol) REFERENCES Rol(id_rol) ON DELETE CASCADE
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
    FOREIGN KEY (id_sesion) REFERENCES SesionTraduccion(id_sesion) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- 2.6 Palabra
-- Vocabulario del sistema: palabras en distintos idiomas que
-- pueden ser referenciadas en traducciones y favoritos.
-- ------------------------------------------------------------
CREATE TABLE Palabra (
    id_palabra  CHAR(36)     PRIMARY KEY DEFAULT (UUID()),
    texto       VARCHAR(100),   -- Palabra o frase corta
    idioma      VARCHAR(50) NOT NULL DEFAULT 'es_Co'     -- idioma col
);


-- ------------------------------------------------------------
-- 2.7 TraduccionDetalle
-- Tabla asociativa que descompone el resultado de una sesión
-- en palabras individuales con su orden de aparición.
-- Relación: TraduccionDetalle N — 1 SesionTraduccion
--           TraduccionDetalle N — 1 Palabra
-- ------------------------------------------------------------
CREATE TABLE TraduccionDetalle (
    id_detalle  CHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    id_sesion   CHAR(36)  NOT NULL,   -- FK → SesionTraduccion
    id_palabra  CHAR(36)  NOT NULL,   -- FK → Palabra
    orden       INT       NOT NULL,   -- Posición de la palabra en el resultado
    FOREIGN KEY (id_sesion)  REFERENCES SesionTraduccion(id_sesion) ON DELETE CASCADE,
    FOREIGN KEY (id_palabra) REFERENCES Palabra(id_palabra)
);


-- ------------------------------------------------------------
-- 2.8 ConfiguracionAvatar
-- Preferencias visuales del avatar 3D de señas para cada usuario.
-- Relación: ConfiguracionAvatar 1 — 1 Usuario  (UNIQUE en id_usuario)
-- ------------------------------------------------------------
CREATE TABLE ConfiguracionAvatar (
    id_config_avatar    CHAR(36)    PRIMARY KEY DEFAULT (UUID()),
    id_usuario          CHAR(36)    UNIQUE,                     -- FK → Usuario (1:1)
    estilo_avatar       VARCHAR(50),                            -- realista | caricatura | simple
    color_piel          VARCHAR(50),
    color_ropa          VARCHAR(50),
    tamano_avatar       ENUM('pequeno','mediano','grande'),
    velocidad_animacion INT DEFAULT 1,                          -- Multiplicador de velocidad
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
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE SET NULL
);


-- ------------------------------------------------------------
-- 2.12 PalabrasFavoritas
-- Palabras marcadas como favoritas por cada usuario, con
-- contador de usos para análisis de vocabulario frecuente.
-- Relación: PalabrasFavoritas N — 1 Usuario
--           PalabrasFavoritas N — 1 Palabra
-- ------------------------------------------------------------
CREATE TABLE PalabrasFavoritas (
    id_favorito CHAR(36)  PRIMARY KEY DEFAULT (UUID()),
    id_usuario  CHAR(36),           -- FK → Usuario
    palabra_id  CHAR(36),           -- FK → Palabra
    veces_usado INT DEFAULT 0,      -- Frecuencia de uso de la palabra
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)  ON DELETE CASCADE,
    FOREIGN KEY (palabra_id) REFERENCES Palabra(id_palabra)
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
    fecha       TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
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
INSERT INTO Usuario VALUES
    (UUID(), (SELECT id_rol FROM Rol LIMIT 1),          'Juan Perez',  'juan@mail.com',   'hash1'),
    (UUID(), (SELECT id_rol FROM Rol LIMIT 1 OFFSET 1), 'Maria Lopez', 'maria@mail.com',  'hash2'),
    (UUID(), (SELECT id_rol FROM Rol LIMIT 1 OFFSET 2), 'Carlos Ruiz', 'carlos@mail.com', 'hash3'),
    (UUID(), (SELECT id_rol FROM Rol LIMIT 1 OFFSET 3), 'Ana Torres',  'ana@mail.com',    'hash4'),
    (UUID(), (SELECT id_rol FROM Rol LIMIT 1 OFFSET 4), 'Luis Gomez',  'luis@mail.com',   'hash5');

-- --- 3.3 Sesiones de traducción ---
INSERT INTO SesionTraduccion (id_sesion, id_usuario, estado, tipo_traduccion) VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1),          'completado', 'voz_a_senas'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), 'procesando', 'senas_a_texto'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), 'pendiente',  'voz_a_senas'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), 'error',      'senas_a_texto'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), 'completado', 'voz_a_senas');

-- --- 3.4 Entradas de voz (audio + transcripción) ---
INSERT INTO EntradaVoz VALUES
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1),          'audio1.mp3', 'hola como estas'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 1), 'audio2.mp3', 'buenos dias'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 2), 'audio3.mp3', 'gracias'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 3), 'audio4.mp3', 'por favor'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 4), 'audio5.mp3', 'hasta luego');

-- --- 3.5 Entradas de señas (video + texto reconocido) ---
INSERT INTO EntradaSenas VALUES
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1),          'video1.mp4', 'hola'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 1), 'video2.mp4', 'adios'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 2), 'video3.mp4', 'gracias'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 3), 'video4.mp4', 'bien'),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 4), 'video5.mp4', 'mal');

-- --- 3.6 Vocabulario del sistema ---
INSERT INTO Palabra VALUES
    (UUID(), 'hola',   'es_Co'),
    (UUID(), 'adios',  'es_Co'),
    (UUID(), 'gracias','es_Co'),
    (UUID(), 'buenas noches', 'es_Co'),
    (UUID(), 'buenos dias',  'es_Co');

-- --- 3.7 Detalle de traducciones (relación sesión ↔ palabras) ---
INSERT INTO TraduccionDetalle VALUES
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1),          (SELECT id_palabra FROM Palabra LIMIT 1),          1),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 1), (SELECT id_palabra FROM Palabra LIMIT 1 OFFSET 1), 2),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 2), (SELECT id_palabra FROM Palabra LIMIT 1 OFFSET 2), 3),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 3), (SELECT id_palabra FROM Palabra LIMIT 1 OFFSET 3), 4),
    (UUID(), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 4), (SELECT id_palabra FROM Palabra LIMIT 1 OFFSET 4), 5);

-- --- 3.8 Configuración de avatares ---
INSERT INTO ConfiguracionAvatar VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1),          'realista',  'claro', 'rojo',  'mediano', 1),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), 'caricatura','oscuro','azul',  'grande',  2),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), 'simple',   'medio', 'verde', 'pequeno', 1),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), 'realista',  'claro', 'negro', 'mediano', 3),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), 'caricatura','oscuro','blanco','grande',  2);

-- --- 3.9 Configuración de dispositivos ---
INSERT INTO ConfiguracionDispositivo VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1),          TRUE,  'Android 12', '6.5'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), FALSE, 'Android 11', '6.0'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), TRUE,  'Android 13', '6.7'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), FALSE, 'Android 10', '5.8'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), TRUE,  'Android 14', '7.0');

-- --- 3.10 Feedback de usuarios ---
INSERT INTO Feedback VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1),          (SELECT id_sesion FROM SesionTraduccion LIMIT 1),          5, 'Excelente', NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 1), 4, 'Muy bueno', NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 2), 3, 'Normal',    NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 3), 2, 'Regular',   NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), (SELECT id_sesion FROM SesionTraduccion LIMIT 1 OFFSET 4), 1, 'Malo',      NOW());

-- --- 3.11 Tickets de soporte ---
INSERT INTO Soporte VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1),          'Error app',  'No funciona', 'pendiente', NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), 'Bug',        'Se cierra',   'en_proceso',NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), 'Consulta',   'Como usar',   'resuelto',  NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), 'Error audio','No graba',    'pendiente', NOW()),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), 'Error video','No carga',    'en_proceso',NOW());

-- --- 3.12 Palabras favoritas ---
INSERT INTO PalabrasFavoritas VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1),          (SELECT id_palabra FROM Palabra LIMIT 1),          5),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), (SELECT id_palabra FROM Palabra LIMIT 1 OFFSET 1), 3),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), (SELECT id_palabra FROM Palabra LIMIT 1 OFFSET 2), 7),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), (SELECT id_palabra FROM Palabra LIMIT 1 OFFSET 3), 2),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), (SELECT id_palabra FROM Palabra LIMIT 1 OFFSET 4), 4);

-- --- 3.13 Log de accesos ---
INSERT INTO LogAcceso VALUES
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1),          NOW(), 'login'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 1), NOW(), 'logout'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 2), NOW(), 'intento_fallido'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 3), NOW(), 'login'),
    (UUID(), (SELECT id_usuario FROM Usuario LIMIT 1 OFFSET 4), NOW(), 'logout');


-- --- 3.14 Log de errores del sistema ---
INSERT INTO LogErrorSistema VALUES
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
UPDATE Usuario SET nombre        = 'Juan Actualizado' WHERE correo = 'juan@mail.com';
UPDATE Usuario SET password_hash = 'nuevo_hash'       WHERE correo = 'maria@mail.com';

-- --- 4.3 Cambios de estado en sesiones ---
UPDATE SesionTraduccion SET estado           = 'completado'   WHERE estado           = 'pendiente';
UPDATE SesionTraduccion SET tipo_traduccion  = 'senas_a_texto' WHERE tipo_traduccion = 'voz_a_senas';

-- --- 4.4 Correcciones en entradas de voz ---
UPDATE EntradaVoz SET texto_generado = 'hola mundo'            WHERE url_audio = 'audio1.mp3';
UPDATE EntradaVoz SET url_audio      = 'audio_actualizado.mp3' WHERE url_audio = 'audio2.mp3';

-- --- 4.5 Correcciones en entradas de señas ---
UPDATE EntradaSenas SET texto_generado = 'hola actualizado' WHERE url_video = 'video1.mp4';
UPDATE EntradaSenas SET url_video      = 'video_new.mp4'    WHERE url_video = 'video2.mp4';

-- --- 4.6 Normalización del campo idioma en Palabra ---
UPDATE Palabra SET idioma = 'español'     WHERE idioma = 'es';
UPDATE Palabra SET idioma  = 'es_Co' WHERE idioma  = 'es';

-- --- 4.7 Reordenar posiciones en TraduccionDetalle ---
UPDATE TraduccionDetalle SET orden = 10 WHERE orden = 1;
UPDATE TraduccionDetalle SET orden = 20 WHERE orden = 2;

-- --- 4.8 Ajustes de avatar ---
UPDATE ConfiguracionAvatar SET velocidad_animacion = 3        WHERE velocidad_animacion = 1;
UPDATE ConfiguracionAvatar SET color_ropa          = 'amarillo' WHERE color_ropa        = 'rojo';

-- --- 4.9 Cambios en configuración de dispositivos ---
UPDATE ConfiguracionDispositivo SET uso_offline      = FALSE        WHERE uso_offline      = TRUE;
UPDATE ConfiguracionDispositivo SET version_android  = 'Android 15' WHERE version_android = 'Android 12';

-- --- 4.10 Corrección de feedback ---
UPDATE Feedback SET calificacion = 5         WHERE calificacion = 1;
UPDATE Feedback SET comentario   = 'Mejorado' WHERE comentario  = 'Regular';

-- --- 4.11 Actualización de estados de soporte ---
UPDATE Soporte SET estado = 'resuelto'   WHERE estado = 'pendiente';
UPDATE Soporte SET asunto = 'Actualizado' WHERE asunto = 'Bug';

-- --- 4.12 Incremento de contador de palabras favoritas ---
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
DELETE FROM ConfiguracionAvatar    ORDER BY id_config_avatar  LIMIT 1;
DELETE FROM ConfiguracionAvatar    ORDER BY id_config_avatar  LIMIT 1;
DELETE FROM ConfiguracionDispositivo ORDER BY id_config       LIMIT 1;
DELETE FROM ConfiguracionDispositivo ORDER BY id_config       LIMIT 1;
DELETE FROM Usuario               ORDER BY id_usuario         LIMIT 1;
DELETE FROM Usuario               ORDER BY id_usuario         LIMIT 1;

-- Tablas raíz (sin FK entrantes)
DELETE FROM Rol              ORDER BY id_rol             LIMIT 1;
DELETE FROM Rol              ORDER BY id_rol             LIMIT 1;
DELETE FROM Palabra          ORDER BY id_palabra         LIMIT 1;
DELETE FROM Palabra          ORDER BY id_palabra         LIMIT 1;
DELETE FROM LogErrorSistema  ORDER BY id_error           LIMIT 1;
DELETE FROM LogErrorSistema  ORDER BY id_error           LIMIT 1;


-- ============================================================
-- SECCIÓN 6: MERGE (INSERT … ON DUPLICATE KEY UPDATE)
-- Patrón upsert: inserta si no existe, actualiza si ya existe.
-- Útil para sincronización de datos desde fuentes externas.
-- ============================================================

-- --- 6.1 Merge de Usuario ---
INSERT INTO Usuario (id_usuario, nombre, correo, password_hash, id_rol)
SELECT id_usuario, nombre, correo, password_hash, id_rol FROM Usuario AS nuevo
ON DUPLICATE KEY UPDATE
    nombre        = nuevo.nombre,
    password_hash = nuevo.password_hash,
    id_rol        = nuevo.id_rol;
SELECT * FROM Usuario;

-- --- 6.2 Merge de Palabra ---
INSERT INTO Palabra (id_palabra, texto, idioma)
SELECT id_palabra, texto, idioma FROM Palabra AS nueva
ON DUPLICATE KEY UPDATE
    texto  = nueva.texto,
    idioma = nueva.idioma;
SELECT * FROM Palabra;

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

-- --- 6.5 Merge de ConfiguracionAvatar ---
INSERT INTO ConfiguracionAvatar (
    id_config_avatar, id_usuario, estilo_avatar,
    color_piel, color_ropa, tamano_avatar, velocidad_animacion
)
SELECT
    id_config_avatar, id_usuario, estilo_avatar,
    color_piel, color_ropa, tamano_avatar, velocidad_animacion
FROM ConfiguracionAvatar AS nuevo_av
ON DUPLICATE KEY UPDATE
    estilo_avatar       = nuevo_av.estilo_avatar,
    color_piel          = nuevo_av.color_piel,
    color_ropa          = nuevo_av.color_ropa,
    tamano_avatar       = nuevo_av.tamano_avatar,
    velocidad_animacion = nuevo_av.velocidad_animacion;
SELECT * FROM ConfiguracionAvatar;


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
FROM Palabra
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

-- 7.10 Palabras favoritas más frecuentes (ORDER BY DESC)
--      Uso: identificar vocabulario clave para optimizar predicción/IA
SELECT *
FROM PalabrasFavoritas
WHERE veces_usado > 2
ORDER BY veces_usado DESC;





