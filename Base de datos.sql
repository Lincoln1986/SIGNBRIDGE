-- ============================
-- 1. Tabla: Usuario
-- ============================
CREATE TABLE Usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    contraseña VARCHAR(200) NOT NULL,
    rol VARCHAR(50),
    preferencias_idioma VARCHAR(50),
    velocidad_salida INT,
    tipo_señas VARCHAR(50)
);

-- ============================
-- 2. Tabla: SesionTraduccion
-- ============================
CREATE TABLE SesionTraduccion (
    id_sesion SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_hora TIMESTAMP NOT NULL,
    tipo_traduccion VARCHAR(50),
    estado VARCHAR(50),
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

-- ============================
-- 3. Tabla: EntradaVoz
-- ============================
CREATE TABLE EntradaVoz (
    id_entrada_voz SERIAL PRIMARY KEY,
    id_sesion INT UNIQUE,  -- relación 1:1
    audio_original BYTEA,
    texto_generado TEXT,
    FOREIGN KEY (id_sesion) REFERENCES SesionTraduccion(id_sesion)
);

-- ============================
-- 4. Tabla: EntradaSenas
-- ============================
CREATE TABLE EntradaSenas (
    id_entrada_senas SERIAL PRIMARY KEY,
    id_sesion INT UNIQUE,  -- relación 1:1
    captura_video BYTEA,
    texto_generado TEXT,
    FOREIGN KEY (id_sesion) REFERENCES SesionTraduccion(id_sesion)
);

-- ============================
-- 5. Tabla: DiccionarioSenas
-- ============================
CREATE TABLE DiccionarioSenas (
    id_palabra SERIAL PRIMARY KEY,
    palabra VARCHAR(100) NOT NULL,
    categoria VARCHAR(50),
    archivo_animacion VARCHAR(255),
    idioma_senas VARCHAR(50),
    nivel_complejidad INT
);


-- ============================
-- 7. Tabla: ConfiguracionDispositivo
-- ============================
CREATE TABLE ConfiguracionDispositivo (
    id_config SERIAL PRIMARY KEY,
    id_usuario INT UNIQUE,  -- relación 1:1
    uso_offline BOOLEAN,
    version_android VARCHAR(20),
    tamano_pantalla VARCHAR(20),
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

-- ============================
-- 8. Tabla: HistorialErrores
-- ============================
CREATE TABLE HistorialErrores (
    id_error SERIAL PRIMARY KEY,
    id_sesion INT NOT NULL,
    tipo_error VARCHAR(100),
    mensaje_error TEXT,
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (id_sesion) REFERENCES SesionTraduccion(id_sesion)
);