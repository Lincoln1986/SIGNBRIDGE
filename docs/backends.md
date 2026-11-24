# Evolución del backend — SignBridge

Ficha 3228973 B · Documento del ítem 3 de la retroalimentación del T6.

El instructor aclaró que este ítem es **la evolución del backend a lo largo del
proyecto**, y que lo que se revisa es que la base de datos se maneje **solo con
migraciones controladas por el ORM**, sin scripts SQL manuales con `psql`.
Este documento cuenta cómo llegó el backend a ese punto. Las fechas salen del
historial de git.

---

## Resumen: antes y ahora

| Aspecto | Al inicio (jun–sep) | Ahora (nov) |
|---|---|---|
| Framework | FastAPI | FastAPI (sin cambio) |
| Dependencias | `requirements.txt` con `pip` | `pyproject.toml` + `uv.lock` con versiones exactas (`uv sync --frozen`) |
| Base de datos | Scripts `.sql` corridos a mano con `psql` (`schema.sql`, `Postgred.sql`, `migrations/*.sql`) | **Solo Alembic**: 3 migraciones versionadas, se aplican con `alembic upgrade head` |
| Instalación de la base | 7 comandos `psql` en un orden fijo | Automática al arrancar el contenedor |
| Autenticación | `python-jose` (con vulnerabilidades) | `PyJWT` + bcrypt |
| Secretos | `.env` subido al repo | `.env` ignorado por git; solo `.env.example` |
| Pruebas | Ninguna | 415 tests, 88 % de cobertura, integración con PostgreSQL y colección de Postman |
| Calidad | Sin revisión automática | ruff en el CI |
| Contenedor | Python 3.11, usuario root | Python 3.12, usuario sin privilegios, *healthcheck* |

---

## Etapas

### 1. Inicio (junio a agosto)

- Junio: se crean las carpetas `Backend-SignBridge` y `Frontend-SignBridge`.
- 5 de agosto: se agrega `Base-de-datos/` con los scripts SQL de PostgreSQL.
  La base se creaba corriendo esos archivos con `psql`.
- Agosto: autenticación, favoritos, soporte, valoraciones y sesiones de traducción.
- 24 de agosto: `schema.sql` con la estructura completa y la primera
  "migración" manual (`cleanup_duplicate_roles.sql`).

**Problema:** cada cambio de tabla era un archivo `.sql` nuevo que cada
integrante tenía que correr a mano y en orden. Nada registraba qué scripts ya
se habían aplicado en cada equipo.

### 2. Funcionalidades (finales de agosto a septiembre)

- 26 de agosto: solo Soporte resuelve tickets; calificación por palabra.
- 31 de agosto: traducción de frases de varias palabras.
- 2 de septiembre: estadísticas de uso, notificaciones in-app, CRUD de tickets,
  favoritos y usuarios, y el abecedario con MediaPipe.
- Cada función nueva traía su propio script SQL en `migrations/` o
  `Base-de-datos/` (`add_is_active_to_user.sql`, `create_message_table.sql`,
  `add_solution_and_word_rating.sql`, `migracion_03_notificaciones.sql`).

**Problema:** al terminar esta etapa había 8 archivos SQL y la instalación del
README pedía correr 7 de ellos en un orden exacto.

### 3. Infraestructura (octubre)

- 9 de octubre: se pasa de `pip` a **uv**, se introduce **Alembic** con una
  migración inicial que reúne todo el esquema, se separan las redes de Docker
  (la base no tiene salida a internet) y se arma la suite de pruebas con CI.
- 14 de octubre: las vistas `vw_*` de los dashboards pasan a Alembic, y los
  roles base se siembran con una migración. El backend arranca desde cero solo
  con el `.env`.

Desde aquí Alembic ya tenía todo el esquema, pero los scripts SQL viejos
seguían en el repo y en el README.

### 4. Pruebas y calidad (noviembre)

- S2 a S4: pruebas de esquemas, seguridad, errores y contrato con el frontend.
  Aparecen defectos reales (texto con solo espacios, rutas que no existían).
- 11 de noviembre: `python-jose` se reemplaza por `PyJWT` por vulnerabilidades.
- S5: base PostgreSQL de pruebas, migrada con Alembic, y dobles para el correo
  y MediaPipe.
- S7: pruebas de API por router; la cobertura llega a 88 %. ruff entra al CI.
- **21 de noviembre (PR #57): se borran los 7 scripts SQL** que ya estaban en
  Alembic, el contenedor aplica `alembic upgrade head` al arrancar y el README
  deja de pedir `psql`.
- 23 de noviembre: Dockerfiles con Python 3.12 y usuario sin privilegios;
  colección de Postman corrida con Newman en el CI.

---

## Cómo se maneja hoy la base de datos

```
app/models/*.py  ──(alembic revision --autogenerate)──▶  alembic/versions/*.py
                                                              │
                                                  alembic upgrade head
                                                              ▼
                                                     PostgreSQL (versión
                                                     en alembic_version)
```

| Migración | Qué hace |
|---|---|
| `18c15e7dc120` | Las 17 tablas del sistema |
| `0a9ba8b6906c` | Las 4 vistas `vw_*` de los dashboards |
| `3fcd44fad4e6` | Roles Cliente, Administrador y Soporte |

Regla del equipo: **ningún cambio de tabla se hace con SQL a mano**. Se cambia
el modelo, se genera la migración, se revisa y se sube en un PR.

## Pendiente

- `Base-de-datos/migracion_02_voto_unico.sql` es el último script manual: su
  índice único (un voto por usuario y palabra) no está en Alembic. Se convierte
  en migración con el arreglo del issue #45 y el archivo se borra en ese PR.
