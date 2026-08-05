# SIGNBRIDGE

Plataforma web de traducción entre **texto**, **voz** y **Lengua de Señas Colombiana (LSC)**, orientada a reducir las barreras de comunicación entre la comunidad sorda y oyente.

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Backend](#backend)
- [Frontend](#frontend)
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

Además incluye un **diccionario de vocabulario LSC** con favoritos, un **panel de usuario** con historial de traducciones, feedback y tickets de soporte, y un **panel de administración** completo para gestión de usuarios, roles y vocabulario.

---

## Estructura del repositorio

```
SIGNBRIDGE/
├── Backend-signbringe/          # API REST — Python / FastAPI
│   ├── app/
│   │   ├── core/                # Config, base de datos, seguridad JWT
│   │   ├── models/              # Modelos ORM (SQLAlchemy)
│   │   ├── routers/             # Endpoints de la API (10 routers)
│   │   ├── schemas/             # Esquemas Pydantic (request / response)
│   │   ├── services/            # Lógica de negocio y servicios externos
│   │   └── main.py              # Punto de entrada FastAPI + CORS + aliases
│   ├── migrations/              # Scripts SQL de migraciones
│   ├── requirements.txt         # Dependencias Python
│   └── Dockerfile               # Imagen Docker del backend
│
└── signbridge-frontend/         # SPA — React / TypeScript / Vite
    ├── src/
    │   ├── api/                 # Cliente HTTP Axios + tipos TypeScript
    │   ├── components/          # Componentes UI reutilizables y layout
    │   ├── context/             # AuthContext — estado global de sesión
    │   ├── hooks/               # useCamera, useSpeechRecognition
    │   ├── pages/               # 14 páginas de la aplicación
    │   ├── index.css            # Sistema de tokens de diseño (CSS vars)
    │   └── main.tsx             # Punto de entrada React
    ├── package.json
    ├── vite.config.ts
    └── Dockerfile               # Imagen Docker del frontend
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
| `Role` | `Role` | Roles del sistema (`Administrador`, `Usuario`) |
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
| `support.py` | `/support` | Crear ticket de soporte, listar tickets del usuario |
| `messages.py` | `/messages` | Mensajes internos entre usuarios |
| `regions.py` | `/regions` | Listado de regiones/ciudades de Colombia |

Adicionalmente, `main.py` registra aliases directos `/admin/dashboard`, `/user/dashboard` y `/admin/stats` que consumen vistas de base de datos (`vw_admin_dashboard`, `vw_user_dashboard`, `vw_system_statistics`).

### `app/schemas/`

Esquemas Pydantic para todos los endpoints:

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
| `traduccion.py` | Decodificación de frames base64 → NumPy, detección con MediaPipe Hands, traducción texto→LSC con búsqueda en `LexicalUnit`, delefreo dactilológico de fallback, gestión de `TranslationSession` |
| `mail.py` | Envío de correos HTML transaccionales: bienvenida al registrarse y restablecimiento de contraseña (plantilla responsiva con identidad visual de SignBridge) |

### Migraciones (`migrations/`)

| Archivo | Descripción |
|---|---|
| `create_message_table.sql` | Crea la tabla `Message` con relaciones a `User` |
| `add_is_active_to_user.sql` | Agrega columna `is_active` a `User` |

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
| `Stats.tsx` | `/stats` | Solo Admin | Estadísticas globales: usuarios, traducciones, soporte, rating promedio |
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
| `AuthContext.tsx` | Estado global de autenticación: token JWT en `localStorage`, perfil de usuario (`UserProfile`), rol, booleano `isAdmin`; funciones `login` (persiste token y carga perfil) y `logout` (limpia storage) |

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

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8, React Router 7, Axios |
| Backend | Python 3.11, FastAPI 0.111, SQLAlchemy 2, Pydantic v2 |
| Base de datos | PostgreSQL (vistas SQL para dashboards) |
| Autenticación | JWT Bearer (HS256), bcrypt |
| IA / Visión | MediaPipe 0.10 (detección de manos), Pillow, NumPy |
| Correo | aiosmtplib + Mailtrap SMTP (plantillas HTML responsivas) |
| Reconocimiento de voz | Web Speech API del navegador (`es-CO`) |
| Video LSC | HTML5 `<video>` + YouTube iframes embebidos |
| Contenedores | Docker (Dockerfile en backend y frontend) |

---

## Variables de entorno

### Backend (`.env`)

Copia `.env.example` a `.env` y completa los valores:

```env
# Base de datos
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/sign_bridge

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

---

## Instalación y ejecución

### Backend

```bash
cd Backend-signbringe
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

### Frontend

```bash
cd signbridge-frontend
npm install
npm run dev
```

La app queda en `http://localhost:5173`. El cliente Axios apunta por defecto a `http://localhost:8000`.

### Docker (opcional)

Cada carpeta tiene su propio `Dockerfile`. Puedes levantarlos individualmente:

```bash
# Backend
docker build -t signbridge-backend ./Backend-signbringe
docker run -p 8000:8000 --env-file Backend-signbringe/.env signbridge-backend

# Frontend
docker build -t signbridge-frontend ./signbridge-frontend
docker run -p 5173:5173 signbridge-frontend
```

---

## Documentación adicional

- [Documentos del proyecto formativo (DOCS)](https://github.com/Lincoln1986/SIGNBRIDGE/tree/fix-backend-fronted/javier-per/DOCS)
- [Mockups del proyecto](https://github.com/Lincoln1986/SIGNBRIDGE/tree/fix-backend-fronted/javier-per/Mockups-proyecto)
