# SignBridge

Plataforma web de traducción entre **texto, voz** y **Lengua de Señas Colombiana (LSC)**,
orientada a reducir las barreras de comunicación entre la comunidad sorda y oyente.

Proyecto formativo · SENA · TG. Análisis y Desarrollo de Software
Ficha 3228973 B — V Trimestre

---

## Tabla de contenidos

- [Qué hace](#qué-hace)
- [Instalación](#instalación)
- [Cuentas de prueba](#cuentas-de-prueba)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Base de datos](#base-de-datos)
- [Tecnologías](#tecnologías)
- [Roles y permisos](#roles-y-permisos)
- [Documentación del proyecto](#documentación-del-proyecto)
- [Problemas frecuentes](#problemas-frecuentes)

---

## Qué hace

| Función | Descripción |
|---|---|
| **Texto a señas** | Escribís una frase y se reproducen en secuencia los videos de cada seña. Reconoce entradas de varias palabras como "buenas noches". |
| **Voz a señas** | Dictás por micrófono, el sistema transcribe y traduce. |
| **Señas a texto** | La cámara reconoce el abecedario dactilológico mediante MediaPipe. |
| **Diccionario LSC** | Vocabulario con video por palabra, buscador y filtro por letra. Cada seña muestra su calificación promedio. |
| **Valoraciones** | Los usuarios califican la traducción de cada palabra; el promedio queda visible para todos. |
| **Soporte** | Tickets con seguimiento de estado. Al resolverlos, el usuario recibe una notificación en la aplicación y por correo. |
| **Estadísticas** | Panel de administración con las señas más traducidas, uso por canal y actividad diaria. |
| **Accesibilidad** | Tamaño de texto, contraste, fuente para dislexia y lector de pantalla. |

---

## Instalación

### Requisitos

Solo **Docker** y **Docker Compose**. No hace falta instalar Python ni Node:
todo corre dentro de contenedores.

### Pasos

```bash
git clone https://github.com/Lincoln1986/SIGNBRIDGE.git
cd SIGNBRIDGE

cp .env.example .env        # en Windows: copy .env.example .env
```

Abrí el `.env` y cambiá `SECRET_KEY` por una clave propia. Podés generarla con:

```bash
openssl rand -hex 32
```

Levantá el stack:

```bash
docker compose up -d --build
```

La primera vez tarda varios minutos: descarga las imágenes, instala las
dependencias de Python y de Node, y compila.

### Base de datos: se crea sola

No hay que correr ningún archivo `.sql`. Al arrancar, el backend ejecuta
`alembic upgrade head`: crea las tablas, las vistas y los roles base, y deja la
base en la última versión del esquema. Las siguientes veces solo aplica las
migraciones nuevas.

Para comprobarlo:

```bash
docker compose logs backend | grep alembic   # "Running upgrade ... -> ..."
docker compose ps                            # backend en estado "healthy"
```

### Verificar

| Servicio | URL |
|---|---|
| Aplicación | http://localhost:5173 |
| API (Swagger) | http://localhost:8000/docs |
| Estado del backend | http://localhost:8000/health |

Si `/health` devuelve `{"status":"healthy"}`, el backend está funcionando.

### Comandos útiles

```bash
docker compose logs -f backend     # ver los logs del backend
docker compose restart backend     # reiniciar tras cambiar código Python
docker compose up -d --build       # reconstruir tras cambiar el Dockerfile
docker compose down                # detener (conserva los datos)
docker compose down -v             # detener Y BORRAR la base de datos
```

> `docker compose down -v` elimina el volumen de PostgreSQL y con él todos los
> datos. Usalo solo si querés empezar de cero.

---

## Cuentas de prueba

Si cargaste un respaldo con datos, usá las credenciales del equipo. Con la base
recién creada por Alembic no hay usuarios: registrá uno desde la aplicación y
asignale el rol desde la base:

```sql
UPDATE "User"
SET id_role = (SELECT id_role FROM "Role" WHERE role_name = 'Administrador')
WHERE email = 'tu@correo.com';
```

Los roles disponibles son `Administrador`, `Soporte` y `Cliente`.

---

## Estructura del repositorio

```
SIGNBRIDGE/
├── Backend-SignBridge/          # API REST con FastAPI
│   ├── app/
│   │   ├── core/                # configuración, base de datos, seguridad (JWT, bcrypt)
│   │   ├── models/              # modelos SQLAlchemy
│   │   ├── routers/             # endpoints por dominio
│   │   ├── schemas/             # validación con Pydantic
│   │   └── services/            # traducción, MediaPipe, correo, notificaciones
│   ├── alembic/                 # migraciones del esquema (alembic upgrade head)
│   ├── tests/                   # suite pytest con cobertura
│   ├── .env.example             # plantilla para ejecución sin Docker
│   ├── Dockerfile
│   ├── pyproject.toml           # dependencias (gestor: uv)
│   └── uv.lock                  # árbol determinista de paquetes
│
├── Frontend-SignBridge/         # SPA en React + TypeScript + Vite
│   ├── src/
│   │   ├── api/                 # cliente Axios y tipos
│   │   ├── components/          # componentes reutilizables
│   │   ├── context/             # contexto de autenticación
│   │   ├── hooks/               # cámara, reconocimiento de voz
│   │   └── pages/               # pantallas por ruta
│   ├── e2e/                     # tests E2E con Playwright
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json             # versiones exactas (sin ^ ni ~)
│   └── pnpm-lock.yaml           # árbol determinista de paquetes
│
├── DOCS/                        # documentación del proyecto formativo
│   ├── HISTORIAS_DE_USUARIO.md
│   ├── ESTIMACION_SPRINTS.md
│   ├── DAILY_SCRUMS.md
│   └── ...
│
├── .env.example                 # plantilla de variables — copiar a .env
├── docker-compose.yml
└── README.md
```

---

## Base de datos

PostgreSQL 17. El esquema tiene 17 tablas y 4 vistas.

### Migraciones (solo Alembic)

El esquema se maneja **únicamente con migraciones de Alembic** en
`Backend-SignBridge/alembic/versions/`. No se usan scripts SQL manuales: cada
cambio queda versionado, en orden, y se aplica igual en desarrollo, en el CI y
en producción.

| Migración | Qué hace |
|---|---|
| `18c15e7dc120_baseline_esquema_inicial_signbridge` | Las 17 tablas del sistema |
| `0a9ba8b6906c_vistas_vw__para_dashboards_sql_portable_` | Las 4 vistas `vw_*` de los dashboards |
| `3fcd44fad4e6_seed_roles_base_del_sistema` | Roles Cliente, Administrador y Soporte |

### Cambiar el esquema

1. Modificá el modelo en `app/models/`.
2. Generá la migración y revisala antes de subirla:

```bash
cd Backend-SignBridge
uv run alembic revision --autogenerate -m "descripcion del cambio"
uv run alembic upgrade head
```

### Respaldos con datos reales

Los respaldos que incluyen datos de usuarios **no se versionan** en el
repositorio. Se comparten entre el equipo por canal privado.

```bash
# Crear un respaldo
docker exec -t signbridge_postgres pg_dump -U postgres -d signbridge > respaldo.sql

# Restaurarlo
docker exec -i signbridge_postgres psql -U postgres -d signbridge < respaldo.sql
```

---

## Tecnologías

**Backend** — FastAPI 0.143 · SQLAlchemy 2.0 · PostgreSQL 17 · MediaPipe 0.10 ·
python-jose (JWT) · passlib con bcrypt · aiosmtplib

**Frontend** — React 19 · TypeScript · Vite · React Router · Axios · Recharts ·
Web Speech API

**Infraestructura** — Docker · Docker Compose · uv (Python) · pnpm (Node) ·
Alembic · GitHub Actions

---

## Pruebas

| Capa | Comando | Umbral |
|---|---|---|
| Backend | `cd Backend-SignBridge && uv run pytest` | cobertura ≥ 55% (trinquete) |
| Frontend | `cd Frontend-SignBridge && pnpm test:coverage` | cobertura ≥ 30% (trinquete) |
| E2E | `cd Frontend-SignBridge && pnpm test:e2e` | flujo de login (Playwright) |
| Seguridad | `pnpm audit` / `uv run pip-audit` | 0 avisos activos |

Requisitos: `uv` y `pnpm` instalados (los contenedores no los necesitan).

```bash
cd Backend-SignBridge
uv sync                  # instala desde uv.lock
uv run pytest            # suite + cobertura

cd ../Frontend-SignBridge
pnpm install --frozen-lockfile
pnpm test:coverage
pnpm exec playwright install chromium   # primera vez
pnpm test:e2e
```

Los mismos cinco checks corren en CI (`.github/workflows/tests.yml`) y deben
estar en verde antes de fusionar en `main`. La estrategia completa está en
`docs/estrategia-pruebas.md`.

---

## Roles y permisos

| Acción | Cliente | Soporte | Administrador |
|---|:---:|:---:|:---:|
| Traducir y consultar el diccionario | ✅ | ✅ | ✅ |
| Crear tickets y valoraciones | ✅ | ✅ | ✅ |
| Ver todos los tickets | — | ✅ | ✅ (solo lectura) |
| Cambiar el estado de un ticket | — | ✅ | — |
| Responder valoraciones | — | ✅ | — |
| Gestionar vocabulario | — | — | ✅ |
| Gestionar usuarios y roles | — | — | ✅ |
| Ver estadísticas globales | — | — | ✅ |

La autenticación usa JWT con expiración configurable. Las contraseñas se
almacenan con bcrypt. Las rutas del frontend están protegidas por rol mediante
el componente `ProtectedRoute`.

---

## Documentación del proyecto

En la carpeta `DOCS/`:

- **HISTORIAS_DE_USUARIO.md** — 19 historias del V Trimestre con criterios de
  aceptación y estado, más el backlog de los Sprints 8 y 9
- **ESTIMACION_SPRINTS.md** — planificación con puntaje, capacidad y velocidad
- **DAILY_SCRUMS.md** — registro de las reuniones diarias
- **CLICKUP_TRELLO.md** — enlaces a los tableros ágiles

---

## Problemas frecuentes

**El backend se reinicia en bucle.** Suele ser que PostgreSQL todavía no acepta
conexiones. El compose ya espera por el healthcheck; si persiste, mirá
`docker compose logs postgres`.

**"MediaPipe no instalado" en los logs.** El Dockerfile instala `libgl1` y
`libglib2.0-0`, que MediaPipe necesita para importarse. Si aparece el aviso,
reconstruí con `docker compose up -d --build`; un `restart` no basta cuando
cambia el Dockerfile.

**Un puerto está ocupado.** Cambiá `POSTGRES_PORT`, `BACKEND_PORT` o
`FRONTEND_PORT` en el `.env` y volvé a levantar.

**Errores `does not exist` al restaurar un respaldo.** Los respaldos creados con
`pg_dump --clean` empiezan borrando objetos. Sobre una base vacía esos avisos
son esperados y no impiden la restauración.

**Un archivo nuevo del backend no se detecta.** El recargado automático de
uvicorn no siempre detecta archivos creados dentro de volúmenes montados desde
Windows. Reiniciá el contenedor con `docker compose restart backend`.

---

© 2026 SignBridge · Lengua de Señas Colombiana · SENA
