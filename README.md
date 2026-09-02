# SIGNBRIDGE

Plataforma web de traducción entre **texto**, **voz** y **Lengua de Señas Colombiana (LSC)**, orientada a reducir las barreras de comunicación entre la comunidad sorda y oyente.

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Backend](#backend)
- [Frontend](#frontend)
- [Base de datos](#base-de-datos)
- [Tecnologías](#tecnologías)
- [Variables de entorno](#variables-de-entorno)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Documentación adicional](#documentación-adicional)

---

## Descripción general

SignBridge ofrece tres canales de traducción en tiempo real:

| Canal | Descripción |
|---|---|
| **Texto → Señas** | Escribe una frase y obtén los videos LSC correspondientes |
| **Voz → Señas** | Habla en español colombiano y el sistema transcribe y muestra las señas |
| **Señas → Texto** | Usa la cámara para capturar señas; MediaPipe detecta los gestos y los convierte a texto |

Además incluye un **diccionario de vocabulario LSC** con favoritos, un **panel de usuario** con historial de traducciones, feedback y tickets de soporte, un **panel de administración** completo para gestión de usuarios, roles y vocabulario, un **panel de soporte** independiente para el rol Soporte, gráficos/estadísticas de uso, y un **widget de accesibilidad**.

---

## Estructura del repositorio

```
SIGNBRIDGE/
├── Backend-SignBridge/          # API REST — Python / FastAPI
│   ├── app/
│   │   ├── core/                # Config, base de datos, seguridad JWT
│   │   ├── models/               # Modelos ORM (SQLAlchemy)
│   │   ├── routers/              # Endpoints de la API
│   │   ├── schemas/              # Esquemas Pydantic (request / response)
│   │   ├── services/             # Lógica de negocio y servicios externos
│   │   └── main.py               # Punto de entrada FastAPI + CORS + aliases
│   ├── migrations/               # Scripts SQL de migraciones (numerados en orden)
│   ├── requirements.txt          # Dependencias Python
│   └── Dockerfile                # Imagen Docker del backend
│
├── Frontend-SignBridge/         # SPA — React / TypeScript / Vite
│   ├── src/
│   │   ├── api/                  # Cliente HTTP Axios + tipos TypeScript
│   │   ├── components/           # Componentes UI reutilizables y layout
│   │   ├── context/               # AuthContext — estado global de sesión
│   │   ├── hooks/                 # useCamera, useSpeechRecognition
│   │   ├── pages/                 # Páginas de la aplicación
│   │   ├── index.css              # Sistema de tokens de diseño (CSS vars)
│   │   └── main.tsx                # Punto de entrada React
│   ├── .env.example              # Variables de entorno del frontend (VITE_API_URL)
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile                # Imagen Docker del frontend
│
├── Base-de-datos/               # Estructura y respaldos de PostgreSQL
│   ├── schema.sql                # Estructura actual de la base (referencia rápida, sin datos)
│   └── full_backup.sql           # Respaldo completo (estructura + datos reales) — NO se sube al repo
│
├── DOCS/                         # Documentos del proyecto formativo
├── docker-compose.yml            # Levanta backend + frontend + postgres juntos
└── .gitignore
```

---

## Backend

### Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Python | 3.11 | Lenguaje del servidor |
| FastAPI | 0.111.0 | Framework web asíncrono |
| Uvicorn | 0.29.0 | Servidor ASGI |
| SQLAlchemy | 2.0.30 | ORM para PostgreSQL |
| Pydantic v2 | 2.7.1 | Validación y serialización |
| python-jose | 3.3.0 | Tokens JWT (HS256) |
| Passlib / bcrypt | 1.7.4 / 4.0.1 | Hash de contraseñas |
| aiosmtplib | 3.0.1 | Envío de correos SMTP asíncrono |
| MediaPipe | 0.10.14 | Detección de señas desde cámara |
| Pillow + NumPy | 10.3 / 1.26 | Procesamiento de frames base64 |
| Jinja2 | 3.1.4 | Plantillas HTML para correos |

### `app/core/`

| Archivo | Responsabilidad |
|---|---|
| `config.py` | Variables de entorno cargadas con `pydantic-settings` (cacheadas con `@lru_cache`) |
| `database.py` | Engine y sesión SQLAlchemy; función `get_db` como dependencia FastAPI |
| `security.py` | Hash/verificación de contraseñas, creación y decodificación de JWT, dependencias `get_current_user` y `require_admin` |

### `app/models/`

Todos los modelos usan UUIDs como PK y campos `created_at`, `updated_at`, `deleted_at` (soft delete).

| Modelo | Tabla | Descripción |
|---|---|---|
| `User` | `User` | Nombre, email, contraseña hasheada, rol, región, estado activo |
| `Role` | `Role` | Roles del sistema (`Administrador`, `Soporte`, `Cliente`) |
| `Region` | `Region` | Regiones/ciudades de Colombia |
| `TranslationSession` | `TranslationSession` | Sesiones de traducción vinculadas a un usuario |
| `TranslationDetail` | `TranslationDetail` | Señas traducidas dentro de cada sesión (orden preservado) |
| `LexicalUnit` | `LexicalUnit` | Diccionario LSC: texto, idioma (`es_CO`), URL de video |
| `VoiceInput` | `VoiceInput` | Audio/texto generado en traducciones de voz |
| `SignInput` | `SignInput` | Video/texto generado en traducciones de señas |
| `Feedback` | `Feedback` | Valoraciones (1–5 estrellas) vinculadas a sesiones |
| `Support` | `Support` | Tickets de soporte: asunto, mensaje, estado |
| `FavoriteWords` | `FavoriteWords` | Palabras favoritas del usuario con contador de uso |
| `SignAvatarConfig` | `SignAvatarConfig` | Configuración del avatar LSC por usuario |
| `DeviceConfiguration` | `DeviceConfiguration` | Config de dispositivo por usuario |
| `AccessLog` | `AccessLog` | Log de accesos de usuario |
| `SystemErrorLog` | `SystemErrorLog` | Log de errores del sistema |
| `Message` | `Message` | Mensajes internos entre usuarios |

### `app/routers/`

| Router | Prefijo | Descripción |
|---|---|---|
| `auth.py` | `/auth` | Registro, login, perfil (`/auth/me`), recuperación de contraseña, ciudades |
| `traduccion.py` | `/api/traduccion` | `POST /frame` señas→texto, `POST /texto` texto→señas, `POST /voz` voz→señas |
| `dashboard.py` | `/dashboard` | Dashboard admin/usuario, estadísticas, roles, unidades léxicas (CRUD) |
| `admin_users.py` | `/admin` | Listado/filtrado de usuarios, cambio de rol/estado, exportación CSV |
| `favorites.py` | `/favorites` | Toggle favorito (`POST /:id_lexicalunit`), listado de favoritos del usuario |
| `feedback.py` | `/feedback` | Registrar valoración de sesión, historial de feedback del usuario |
| `support.py` | `/support` | Crear ticket de soporte, listar tickets del usuario/panel de Soporte |
| `messages.py` | `/messages` | Mensajes internos entre usuarios |
| `regions.py` | `/regions` | Listado de regiones/ciudades de Colombia |

Adicionalmente, `main.py` registra aliases directos `/admin/dashboard`, `/user/dashboard` y `/admin/stats` que consumen vistas de base de datos (`vw_admin_dashboard`, `vw_user_dashboard`, `vw_system_statistics`).

### `app/schemas/`

| Archivo | Schemas principales |
|---|---|
| `auth.py` | `RegisterRequest`, `LoginRequest`, `TokenResponse`, `UserProfile`, `AdminDashboardRow`, `UserDashboardRow`, `SystemStats` |
| `traduccion.py` | `FrameRequest`, `FrameResponse`, `TextoRequest`, `TextoTraduccionResponse`, `VozRequest`, `VozTraduccionResponse`, `SignUnit` |
| `favorites.py` | `FavoriteWordOut`, `FavoriteWordToggle` |
| `feedback.py` | `FeedbackCreate`, `FeedbackOut` |
| `support.py` | `SupportCreate`, `SupportOut` |
| `messages.py` | `MessageCreate`, `MessageOut` |
| `regions.py` | `RegionOut` |

### `app/services/`

| Servicio | Responsabilidad |
|---|---|
| `traduccion.py` | Decodificación de frames base64 → NumPy, detección con MediaPipe Hands, traducción texto→LSC con búsqueda en `LexicalUnit`, deletreo dactilológico de fallback, gestión de `TranslationSession` |
| `mail.py` | Envío de correos HTML transaccionales: bienvenida al registrarse y restablecimiento de contraseña (plantilla responsiva con identidad visual de SignBridge) |

### Migraciones (`migrations/`)

Los scripts SQL se aplican en orden y documentan la evolución de la base:

| Archivo | Descripción |
|---|---|
| `create_message_table.sql` | Crea la tabla `Message` con relaciones a `User` |
| `add_is_active_to_user.sql` | Agrega columna `is_active` a `User` |
| `cleanup_duplicate_roles.sql` | Elimina el rol duplicado "moderador" y unifica el rol Soporte |

---

## Frontend

### Stack

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.2 | Biblioteca de UI |
| TypeScript | 6.0 | Tipado estático |
| Vite | 8.0 | Bundler y dev server |
| React Router | 7.17 | Enrutamiento SPA |
| Axios | 1.17 | Cliente HTTP con interceptores JWT |

### Páginas (`src/pages/`)

| Archivo | Ruta | Acceso | Descripción |
|---|---|---|---|
| `Landing.tsx` | `/` | Pública | Presentación del producto con hero, features y modal de autenticación integrado |
| `Login.tsx` | `/login` | Pública | Inicio de sesión (redirige si ya hay sesión) |
| `Register.tsx` | `/register` | Pública | Registro con validación de contraseña, teléfono y selector de ciudad |
| `PasswordPages.tsx` | `/forgot-password` `/reset-password` | Pública | Flujo completo de recuperación de contraseña vía email |
| `Home.tsx` | `/home` | Autenticado | Panel principal post-login con accesos rápidos |
| `VoiceToSign.tsx` | `/voice-to-sign` | Autenticado | Traducción texto→señas y voz→señas; reproductor de video LSC; historial de conversación; formulario de feedback por sesión |
| `SignToText.tsx` | `/sign-to-text` | Autenticado | Captura de cámara en tiempo real, envío de frames base64 al backend, detección de señas con MediaPipe |
| `Vocabulary.tsx` | `/vocabulary` | Autenticado | Diccionario LSC con búsqueda, filtros, reproducción de videos y toggle de favoritos |
| `UserDashboard.tsx` | `/dashboard` | Autenticado | Historial de traducciones, palabras favoritas, feedback enviado, tickets de soporte |
| `AdminDashboard.tsx` | `/admin` | Solo Admin | Tabla de usuarios con gestión de roles y estado, CRUD de unidades léxicas, estadísticas del sistema, exportación CSV |
| `SupportDashboard.tsx` | `/support` | Solo Soporte | Panel dedicado al rol Soporte, separado de Admin y de Usuario |
| `Stats.tsx` | `/stats` | Solo Admin | Estadísticas globales: usuarios, traducciones, soporte, rating promedio, gráficos (`StatsCharts`) |
| `PrivacyPolicy.tsx` | `/privacy` | Pública | Política de privacidad del servicio |
| `ComingSoon.tsx` | — | — | Placeholder para funcionalidades en desarrollo |

### Componentes (`src/components/`)

| Archivo | Descripción |
|---|---|
| `UI.tsx` | Sistema de diseño completo: `Logo`, `Btn` (variantes: primary/ghost/danger, tamaños sm/md), `Input`, `PasswordInput` (toggle visibilidad), `Card`, `Spinner`, `Alert` (tipos: success/error/warning/info), `Badge`, `StatCard` |
| `Navbar.tsx` | Barra de navegación con nombre de usuario, rol, avatar inicial y menú de logout |
| `Footer.tsx` | Pie de página con links y copyright |
| `CookieBanner.tsx` | Banner de consentimiento de cookies con persistencia en `localStorage` |
| `AuthModal.tsx` | Modal unificado de autenticación con tabs login / registro / recuperar contraseña |
| `VocabModals.tsx` | Modales para reproducir videos LSC, crear y eliminar palabras del diccionario |
| `AccessibilityWidget.tsx` | Widget de accesibilidad (contraste, tamaño de texto, subtítulos) |
| `StatsCharts.tsx` | Gráficos/estadísticas de uso para la sección de Reportes |
| `layout/AppShell.tsx` | Wrapper de layout: Navbar superior + slot de contenido con `maxWidth` configurable + Footer |
| `layout/ProtectedRoute.tsx` | `ProtectedRoute` — requiere sesión activa; `PublicRoute` — redirige a `/home` si ya hay sesión; soporte para `adminOnly` |

### Hooks (`src/hooks/`)

| Archivo | Descripción |
|---|---|
| `useCamera.ts` | Acceso a cámara del dispositivo vía `getUserMedia`, captura de frames en base64 JPEG, manejo de permisos y limpieza de recursos |
| `useSpeechRecognition.ts` | Web Speech API en español colombiano (`es-CO`), estados `idle → listening → processing`, resultados interim en tiempo real, manejo de errores de permisos |

### Contexto (`src/context/`)

| Archivo | Descripción |
|---|---|
| `AuthContext.tsx` | Estado global de autenticación: token JWT en `localStorage`, perfil de usuario (`UserProfile`), rol, booleanos `isAdmin`/`isSupport`; funciones `login` (persiste token y carga perfil) y `logout` (limpia storage) |

### API Client (`src/api/client.ts`)

Cliente Axios con interceptor que inyecta el `Bearer` token en cada petición y redirige a `/` en caso de `401`. Exporta módulos agrupados por dominio:

| Módulo | Endpoints cubiertos |
|---|---|
| `authApi` | `register`, `login`, `me`, `forgotPassword`, `resetPassword`, `getCities` |
| `translationApi` | `signToText` (frame base64), `textToSign`, `vozToSign` |
| `dashboardApi` | `admin`, `user`, `stats`, `roles`, `lexicalUnits`, CRUD de unidades léxicas |
| `adminUsersApi` | `list`, `updateRole`, `setActive`, `exportCsv` |
| `favoritesApi` | `list`, `toggle` (add/remove), aliases `add` y `remove` |
| `feedbackApi` | `list`, `create` |
| `supportApi` | `list`, `create` |

### Rutas y control de acceso

```
/                   → Landing (pública)
/login              → Solo si NO hay sesión
/register           → Solo si NO hay sesión
/forgot-password    → Pública
/reset-password     → Pública
/home               → Requiere sesión
/dashboard          → Requiere sesión
/vocabulary         → Requiere sesión
/voice-to-sign      → Requiere sesión
/sign-to-text       → Requiere sesión
/admin              → Requiere sesión + rol Admin
/support            → Requiere sesión + rol Soporte
/stats              → Requiere sesión + rol Admin
/privacy            → Pública
*                   → Redirige a /
```

### Tokens de diseño (`src/index.css`)

```css
--violet            /* Color principal */
--violet-light      /* Fondo suave violeta */
--amber             /* Color de acento (naranja) */
--danger            /* Rojo de error */
--white
--gray-50 … --gray-800   /* Escala de grises */
--font-display      /* Fuente de títulos */
--font-body         /* Fuente de cuerpo */
--radius            /* Borde redondeado estándar */
--radius-sm         /* Borde redondeado pequeño */
--shadow-sm / --shadow / --shadow-lg  /* Sombras */
```

---

## Base de datos

PostgreSQL 17+. La estructura actual de tablas está respaldada en `Base-de-datos/schema.sql` (solo estructura, sin datos) — útil como referencia rápida sin tener que levantar Docker. Los cambios incrementales al esquema viven versionados en `Backend-SignBridge/migrations/`, aplicados en el orden en que aparecen ahí.

Para regenerar `schema.sql` después de un cambio importante en la base:

```bash
docker exec -t signbridge_postgres pg_dump -U postgres -d signbridge --schema-only > Base-de-datos/schema.sql
```

### Respaldo completo (`full_backup.sql`)

Además del `schema.sql`, existe un `full_backup.sql`: un `pg_dump` completo (estructura **+ datos reales** — usuarios, mensajes, feedback). Es un dump generado con PostgreSQL 17.11 y usa las directivas `\restrict` / `\unrestrict`, por lo que **requiere Postgres 17 o superior** para restaurarse sin errores.

Este archivo hace `DROP TABLE`/`DROP VIEW`/`DROP TRIGGER` antes de recrear todo, así que reemplaza por completo el contenido de la base al restaurarse — no hace falta correr migraciones ni `seed.sql` por separado si se usa este archivo.

> ⚠️ **`full_backup.sql` contiene datos reales de usuarios (emails, hashes de contraseña) y NO debe subirse al repositorio público.** Se comparte solo entre el equipo por un canal privado (ej. Google Drive).

Para restaurarlo dentro del contenedor de Docker:

```bash
docker cp full_backup.sql signbridge_postgres:/tmp/full_backup.sql
docker exec -it signbridge_postgres psql -U postgres -d signbridge -f /tmp/full_backup.sql
```

Verificación rápida después de restaurar:

```bash
docker exec -it signbridge_postgres psql -U postgres -d signbridge -c "SELECT role_name FROM \"Role\";"
```

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, React Router 7, Axios |
| Backend | Python 3.11, FastAPI 0.111, SQLAlchemy 2, Pydantic v2 |
| Base de datos | PostgreSQL 17+ (vistas SQL para dashboards) |
| Autenticación | JWT Bearer (HS256), bcrypt |
| IA / Visión | MediaPipe 0.10 (detección de manos), Pillow, NumPy |
| Correo | aiosmtplib + Mailtrap SMTP (plantillas HTML responsivas) |
| Reconocimiento de voz | Web Speech API del navegador (`es-CO`) |
| Video LSC | HTML5 `<video>` + YouTube iframes embebidos |
| Contenedores | Docker + Docker Compose (`docker-compose.yml` en la raíz) |

---

## Variables de entorno

### Backend (`Backend-SignBridge/.env`)

Copia `.env.example` a `.env` dentro de `Backend-SignBridge/` y completa los valores:

```env
# Base de datos
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/signbridge

# JWT
SECRET_KEY=clave_secreta_aleatoria_larga
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# SMTP (Mailtrap sandbox o servidor real)
MAIL_USERNAME=tu_usuario
MAIL_PASSWORD=tu_password
MAIL_FROM=noreply@signbridge.com
MAIL_SERVER=sandbox.smtp.mailtrap.io
MAIL_PORT=587

# App
APP_NAME=Sign_Bridge
FRONTEND_URL=http://localhost:5173
```

> Nota: si levantás con `docker-compose up`, las variables de `environment:` en `docker-compose.yml` tienen prioridad sobre el `.env` local — mantenelas sincronizadas para evitar confusiones (por ejemplo `FRONTEND_URL` debe apuntar al puerto real del frontend, `5173`).

### Frontend (`Frontend-SignBridge/.env`)

Copia `.env.example` a `.env` dentro de `Frontend-SignBridge/` y ajusta si es necesario:

```env
# URL del backend API (FastAPI)
VITE_API_URL=http://localhost:8000
```

> Por defecto el frontend apunta a `http://localhost:8000`. Solo necesitás modificar `VITE_API_URL` si el backend corre en otro host o puerto.

---

## Instalación y ejecución

### Opción recomendada: Docker Compose (levanta todo junto)

El `docker-compose.yml` de la raíz levanta únicamente tres servicios: `postgres` (imagen `postgres:17`), `backend` y `frontend`. Requiere que las carpetas `Backend-SignBridge/` y `Frontend-SignBridge/` existan como hermanas de la carpeta donde vive el `docker-compose.yml` (los `context:` del compose apuntan con rutas relativas `../Backend-SignBridge` y `../Frontend-SignBridge`).

1. **Clonar el repo y verificar la estructura de carpetas**

   ```bash
   git clone https://github.com/Lincoln1986/SIGNBRIDGE.git
   cd SIGNBRIDGE
   ```

   Confirma que `Backend-SignBridge/` y `Frontend-SignBridge/` quedaron con esos nombres exactos (sensibles a mayúsculas/minúsculas en Linux/Mac); si tu copia local usa otros nombres, ajusta las rutas `context:` y `volumes:` del `docker-compose.yml` para que coincidan.

2. **Levantar los contenedores**

   ```bash
   docker-compose up -d --build
   ```

   Esto levanta backend (`:8000`), frontend (`:5173`) y PostgreSQL (`:5432`) juntos, con el código montado en vivo (los cambios se reflejan sin reconstruir la imagen, salvo cambios en dependencias).

3. **Verificar que los tres contenedores están arriba**

   ```bash
   docker ps
   ```

   Deberías ver `signbridge_postgres`, `signbridge_backend` y `signbridge_frontend` con estado `Up`. Si alguno falla, revisa `docker-compose logs <servicio>`.

4. **Cargar los datos en la base**

   Elige una de las dos opciones:

   - **Con datos reales** (recomendado si tienes acceso al respaldo del equipo): restaura `full_backup.sql` como se explica en la sección [Respaldo completo](#respaldo-completo-full_backupsql) más arriba.
   - **Con datos ficticios de demo**: aplica primero la estructura (`Base-de-datos/schema.sql` y las migraciones de `Backend-SignBridge/migrations/` en orden) y luego corre `seed.sql`:

     ```bash
     docker exec -i signbridge_postgres psql -U postgres -d signbridge < seed.sql
     ```

     Esto crea vocabulario de ejemplo y una cuenta demo por rol (`admin@demo.signbridge.com`, `soporte@demo.signbridge.com`, `cliente@demo.signbridge.com`), todas con contraseña `Demo1234!`.

5. **Probar la aplicación**

   Entra a `http://localhost:5173`. El backend queda disponible en `http://localhost:8000/docs` (Swagger) para probar endpoints directamente.

### Backend (manual, sin Docker)

```bash
cd Backend-SignBridge
python -m venv venv
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env   # Configura tus variables

uvicorn app.main:app --reload --port 8000
```

La API queda en `http://localhost:8000`.
Documentación interactiva Swagger: `http://localhost:8000/docs`
Documentación ReDoc: `http://localhost:8000/redoc`

### Frontend (manual, sin Docker)

```bash
cd Frontend-SignBridge
cp .env.example .env   # Configura VITE_API_URL si es necesario
npm install
npm run dev
```

La app queda en `http://localhost:5173`. El cliente Axios apunta por defecto a `http://localhost:8000` (configurable via `VITE_API_URL` en `.env`).

---

## Documentación adicional

- [Documentos del proyecto formativo (DOCS)](https://github.com/Lincoln1986/SIGNBRIDGE/tree/fix-backend-fronted/javier-per/DOCS)
