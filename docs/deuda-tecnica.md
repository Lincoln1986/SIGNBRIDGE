# Deuda técnica priorizada — SignBridge

Ficha 3228973 B · Corte: 24 de noviembre de 2026

Lo que el proyecto sabe que tiene pendiente al cerrar el V trimestre, ordenado
por prioridad. Cada punto dice **por qué importa** y **qué se haría** en el VI
trimestre (T7). Nada de esto bloquea la entrega; está escrito para que no se
olvide.

**Prioridad:** 🔴 alta (riesgo de seguridad o función principal) · 🟠 media
(calidad o mantenimiento) · 🟢 baja (comodidad).

---

| # | Prioridad | Deuda | Por qué importa | Qué se haría |
|---|---|---|---|---|
| 1 | 🔴 | **Reconocimiento real de señas** (HU-03 y HU-25): si MediaPipe no carga, la seña a texto cae al modo simulado | Es una de las funciones principales del producto | Verificar MediaPipe dentro de la imagen de Docker y probar con video real; dataset para señas completas (HU-28) |
| 2 | 🔴 | **protobuf con aviso de seguridad ignorado** (`PYSEC-2026-1805`) | `mediapipe 0.10` exige `protobuf<5`; el arreglo está en versiones que no son compatibles | Migrar a `mediapipe 1.x` y quitar el `--ignore-vuln` del CI |
| 3 | 🔴 | **Token de sesión en `localStorage`** | Si alguna vez se cuela un script malicioso (XSS), puede leer el token | Cookie `HttpOnly` + `SameSite` emitida por el backend |
| 4 | 🟠 | **Mensajería en tiempo real** (`routers/messages.py`, WebSocket) con 28 % de cobertura | Es el archivo menos probado del backend | Pruebas con el cliente WebSocket de TestClient |
| 5 | 🟠 | **Estadísticas** (`routers/stats.py`) con 32 % de cobertura | Los reportes del admin (HU-23) dependen de consultas largas sin pruebas | Pruebas con datos sembrados y comparación de totales |
| 6 | 🟠 | **Funciones del frontend al 75 %** | Son sobre todo manejadores de cámara y micrófono, que dependen del navegador | Dobles de `getUserMedia` y `SpeechRecognition` más completos |
| 7 | 🟠 | **Rutas de dashboard repetidas**: `/admin/dashboard` y `/user/dashboard` en `main.py` duplican las de `routers/dashboard.py` | Dos lugares que mantener para la misma respuesta | Dejar solo las del router y redirigir |
| 8 | 🟠 | **Sin despliegue público** | Todo corre en local con Docker Compose | Servidor con HTTPS y despliegue desde el CI al cambiar `main` (T7) |
| 9 | 🟢 | **Exportar usuarios** (`GET /admin/users/export`) usa `TO_CHAR`, que solo existe en PostgreSQL | No se puede probar en la suite rápida (SQLite) | Formatear la fecha en Python, no en SQL |
| 10 | 🟢 | **Sin recarga automática en Docker** | Las imágenes son de producción; para desarrollar hay que correr cada parte en local | Un `docker-compose.dev.yml` con volúmenes y `--reload` |

---

## Deuda que ya se pagó en este trimestre

| Deuda | Cómo se resolvió | PR / issue |
|---|---|---|
| Scripts SQL manuales con `psql` | Solo migraciones de Alembic; la base se crea al arrancar | #57 |
| Voto repetido por palabra inflaba el promedio | Voto único en la API + índice único en Alembic | #45 |
| `python-jose` con vulnerabilidades | Migración a `PyJWT` | #20 |
| `.env` con claves en el repo | Borrado, `.gitignore` y cambio de claves | #23, #42 |
| Sin lint en el CI | Job *Code Quality* (ESLint, `pnpm build`, ruff) | #54 |
| Contenedores como root y Python 3.11 | Python 3.12, usuarios sin privilegios, build de Vite | #64 |
| URL del backend fija en el frontend | Se lee de `VITE_API_URL` | issue de hoy |

## Cómo se priorizó

1. **Alta:** afecta la seguridad o una función principal del producto.
2. **Media:** baja la calidad o hace más difícil mantener el código.
3. **Baja:** es comodidad del equipo o una limitación conocida con rodeo.
