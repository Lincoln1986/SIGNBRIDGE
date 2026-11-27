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

### Opción rápida: un solo comando

```bash
git clone https://github.com/Lincoln1986/SIGNBRIDGE.git
cd SIGNBRIDGE
bash start.sh
```

`start.sh` revisa que Docker esté corriendo, crea el `.env` con una
`SECRET_KEY` propia, levanta los contenedores, espera a que estén sanos y
muestra las URLs. También: `bash start.sh --parar` y `bash start.sh --limpio`
(borra la base de datos). En Windows se corre desde Git Bash o WSL.

### Pasos (a mano)

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
| `7b2e5c1d9a40_voto_unico_por_palabra` | Un solo voto activo por usuario y palabra (índice único parcial) |

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

**Backend** — FastAPI 0.143 · SQLAlchemy 2.0 · Alembic · PostgreSQL 17 ·
MediaPipe 0.10 · PyJWT · passlib con bcrypt · aiosmtplib

**Frontend** — React 19 · TypeScript · Vite · React Router · Axios · Recharts ·
Web Speech API

**Infraestructura** — Docker · Docker Compose · nginx · uv (Python) · pnpm (Node) ·
GitHub Actions

**Pruebas y calidad** — pytest · Vitest · Testing Library · Playwright ·
Postman + Newman · ruff · ESLint

---

## Pruebas

Cifras al cierre de la S7 (24 de noviembre):

| Capa | Comando | Pruebas | Umbral (trinquete) |
|---|---|---:|---|
| Backend | `cd Backend-SignBridge && uv run pytest` | 422 | cobertura ≥ 88 % (real 88,2 %) |
| Integración (PostgreSQL) | `TEST_DATABASE_URL=... uv run pytest tests/integracion` | 18 | — |
| Frontend | `cd Frontend-SignBridge && pnpm test:coverage` | 305 | líneas ≥ 84 % · statements ≥ 81 % · branches ≥ 78 % · funciones ≥ 75 % |
| E2E | `cd Frontend-SignBridge && pnpm test:e2e` | 20 | registro, login por rol y traducción (Playwright), 2 contra el backend real |
| API real | `npx newman@6.2.1 run postman/SignBridge.postman_collection.json -e postman/local.postman_environment.json` | 28 validaciones | todas en verde |
| Calidad | `uv run ruff check app tests` · `pnpm lint` · `pnpm build` | — | 0 errores |
| Seguridad | `pnpm audit` / `uv run pip-audit` | — | 0 avisos activos |

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

Los **7 checks** del CI (`.github/workflows/tests.yml`) deben estar en verde
antes de fusionar: Frontend Tests, Backend Tests, Code Quality, Database
Integration (incluye Newman), End-to-End Tests, Security Audit y Evidencia
individual. La estrategia está en `docs/estrategia-pruebas.md` y el plan en
`docs/plan-pruebas.md`.

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

En la carpeta `DOCS/` (proyecto formativo):

- **HISTORIAS_DE_USUARIO.md** — historias del V Trimestre con criterios de
  aceptación y estado, más el backlog de los Sprints 8 y 9
- **ESTIMACION_SPRINTS.md** — planificación con puntaje, capacidad y velocidad
- **DAILY_SCRUMS.md** — registro de las reuniones diarias
- **CLICKUP_TRELLO.md** — enlaces a los tableros ágiles

En la carpeta `docs/` (técnica y pruebas):

| Documento | Qué tiene |
|---|---|
| `vision-cierre.md` | Avance de las historias y plan del VI trimestre |
| `backends.md` | Evolución del backend y manejo de la base con Alembic |
| `arquitectura.md` | Diagramas de contenedores, redes, arranque y CI |
| `instalacion-desde-cero.md` | Registro de la instalación en un equipo limpio |
| `estrategia-pruebas.md` | Cómo se prueba cada capa y el pipeline de CI |
| `plan-pruebas.md` | Alcance, criterios de entrada y salida, cronograma |
| `matriz-casos.md` | Casos de prueba manuales y su ejecución |
| `matriz-rotacion.md` | Capa de cada integrante por semana y cobertura semanal |
| `retrospectivas-s5-s6.md` | Qué funcionó y qué se cambió |
| `deuda-tecnica.md` | Deuda técnica priorizada |
| `openapi.json` | Contrato de la API (también en `/docs` con el backend corriendo) |

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

**Cambié código y el contenedor no lo muestra.** Las imágenes son de
producción: no montan el código. Reconstruí con `docker compose up -d --build`,
o para desarrollar con recarga automática corré cada parte en local
(`uv run uvicorn app.main:app --reload` y `pnpm dev`).

---

© 2026 SignBridge · Lengua de Señas Colombiana · SENA
