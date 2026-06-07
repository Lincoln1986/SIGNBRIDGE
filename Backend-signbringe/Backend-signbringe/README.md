# Sign Bridge — Backend API

API REST construida con **FastAPI + PostgreSQL** para la aplicación de traducción de lenguaje de señas.

---

## Requisitos

- Python 3.11+
- PostgreSQL 14+ con la base de datos `sign_bridge` ya creada y el script SQL ejecutado

---

## Instalación rápida

```bash
# 1. Clonar / descomprimir el proyecto
cd sign_bridge

# 2. Crear entorno virtual
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL y Mailtrap

# 5. Arrancar el servidor
uvicorn app.main:app --reload --port 8000
```

La API queda disponible en: http://localhost:8000  
Documentación interactiva: http://localhost:8000/docs

---

## Endpoints principales

### Autenticación (`/auth`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Registrar nuevo usuario | No |
| POST | `/auth/login` | Iniciar sesión → devuelve JWT | No |
| GET  | `/auth/me` | Perfil del usuario autenticado | Sí |
| POST | `/auth/forgot-password` | Solicitar reset de contraseña | No |
| POST | `/auth/reset-password` | Restablecer contraseña con token | No |

### Dashboard (`/dashboard`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/dashboard/admin` | Dashboard del administrador (vista SQL) | Admin |
| GET | `/dashboard/user` | Dashboard del usuario autenticado (vista SQL) | Usuario |
| GET | `/dashboard/stats` | Estadísticas globales del sistema | Admin |
| GET | `/dashboard/lexical-units` | Listado de vocabulario (sin ID) | Usuario |

---

## Criterios de la lista de chequeo cubiertos

| # | Criterio | Cómo se cumple |
|---|----------|----------------|
| 1 | Login & Registro | `POST /auth/register` y `POST /auth/login` con JWT |
| 2 | Recuperación de clave | `POST /auth/forgot-password` + email real vía Mailtrap |
| 3 | Dashboard administrador | `GET /dashboard/admin` usa `vw_admin_dashboard` |
| 4 | Dashboard usuario | `GET /dashboard/user` usa `vw_user_dashboard` |
| 5 | Nombre y perfil en dashboard | `GET /auth/me` devuelve `full_name` y datos del perfil |
| 6 | Listado vista SQL sin ID | `GET /dashboard/lexical-units` muestra tabla sin campo id |

---

## Variables de entorno (.env)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/sign_bridge
SECRET_KEY=clave_secreta_muy_larga
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

MAIL_USERNAME=tu_usuario_mailtrap
MAIL_PASSWORD=tu_password_mailtrap
MAIL_FROM=noreply@signbridge.com
MAIL_SERVER=sandbox.smtp.mailtrap.io
MAIL_PORT=587

FRONTEND_URL=http://localhost:3000
```

---

## Estructura del proyecto

```
sign_bridge/
├── app/
│   ├── main.py              # App FastAPI + routers + CORS
│   ├── core/
│   │   ├── config.py        # Settings (pydantic-settings)
│   │   ├── database.py      # Engine SQLAlchemy + get_db
│   │   └── security.py      # JWT, hashing, dependencias auth
│   ├── models/
│   │   ├── user.py          # User, Role, Region
│   │   └── session.py       # Todas las demás tablas
│   ├── schemas/
│   │   └── auth.py          # Schemas Pydantic (request/response)
│   ├── services/
│   │   └── mail.py          # Envío de correo con Mailtrap
│   └── routers/
│       ├── auth.py          # /auth/*
│       └── dashboard.py     # /dashboard/*
├── requirements.txt
├── .env.example
└── README.md
```
