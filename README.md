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

### Cargar la base de datos

El contenedor de PostgreSQL arranca con la base vacía. Hay que cargar la
estructura y las migraciones **en este orden**:

```bash
# 1. Estructura base
docker exec -i signbridge_postgres psql -U postgres -d signbridge < Base-de-datos/schema.sql

# 2. Migraciones, en orden
docker exec -i signbridge_postgres psql -U postgres -d signbridge < Backend-SignBridge/migrations/add_is_active_to_user.sql
docker exec -i signbridge_postgres psql -U postgres -d signbridge < Backend-SignBridge/migrations/create_message_table.sql
docker exec -i signbridge_postgres psql -U postgres -d signbridge < Backend-SignBridge/migrations/cleanup_duplicate_roles.sql
docker exec -i signbridge_postgres psql -U postgres -d signbridge < Backend-SignBridge/migrations/add_solution_and_word_rating.sql
docker exec -i signbridge_postgres psql -U postgres -d signbridge < Base-de-datos/migracion_02_voto_unico.sql
docker exec -i signbridge_postgres psql -U postgres -d signbridge < Base-de-datos/migracion_03_notificaciones.sql
```

En Windows con PowerShell, si el `<` da problemas, usá:

```powershell
Get-Content Base-de-datos\schema.sql | docker exec -i signbridge_postgres psql -U postgres -d signbridge
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

Si cargaste un respaldo con datos, usá las credenciales del equipo. Si partiste
de `schema.sql` la base queda sin usuarios: registrá uno desde la aplicación y
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
│   ├── migrations/              # migraciones SQL en orden cronológico
│   ├── .env.example             # plantilla para ejecución sin Docker
│   ├── Dockerfile
│   └── requirements.txt
│
├── Frontend-SignBridge/         # SPA en React + TypeScript + Vite
│   ├── src/
│   │   ├── api/                 # cliente Axios y tipos
│   │   ├── components/          # componentes reutilizables
│   │   ├── context/             # contexto de autenticación
│   │   ├── hooks/               # cámara, reconocimiento de voz
│   │   └── pages/               # pantallas por ruta
│   ├── .env.example
│   └── Dockerfile
│
├── Base-de-datos/               # estructura y migraciones de PostgreSQL
│   ├── schema.sql
│   ├── migracion_02_voto_unico.sql
│   └── migracion_03_notificaciones.sql
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

PostgreSQL 17. El esquema tiene 16 tablas, 4 vistas, funciones y triggers.

### Migraciones

| Archivo | Qué agrega |
|---|---|
| `add_is_active_to_user.sql` | Columna `is_active` para desactivar cuentas |
| `create_message_table.sql` | Tabla `Message` para mensajería interna |
| `cleanup_duplicate_roles.sql` | Unifica el rol Soporte y elimina duplicados |
| `add_solution_and_word_rating.sql` | `Support.solution`, `Feedback.id_lexicalunit` y `Feedback.support_response` |
| `migracion_02_voto_unico.sql` | Índice único: un voto por usuario y por palabra |
| `migracion_03_notificaciones.sql` | Tabla `Notification` para los avisos in-app |

### Regenerar el esquema

Después de un cambio estructural:

```bash
docker exec -t signbridge_postgres pg_dump -U postgres -d signbridge --schema-only > Base-de-datos/schema.sql
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

**Backend** — FastAPI 0.111 · SQLAlchemy 2.0 · PostgreSQL 17 · MediaPipe 0.10 ·
python-jose (JWT) · passlib con bcrypt · fastapi-mail

**Frontend** — React 19 · TypeScript · Vite · React Router · Axios · Recharts ·
Web Speech API

**Infraestructura** — Docker · Docker Compose

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
