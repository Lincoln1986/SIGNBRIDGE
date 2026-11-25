# Estrategia de pruebas — SignBridge

> Estándar: `bc-testing-adso` · Meta final: **≥ 80 % de cobertura** en frontend y
> backend antes del 23 de noviembre · Estado: **Sprint S7, cierre del trimestre (20 nov)**
>
> El plan de pruebas (alcance, criterios de entrada y salida, cronograma) está en
> [`docs/plan-pruebas.md`](plan-pruebas.md).

---

## 1. Principios

1. **Trinquete (ratchet):** cada umbral de cobertura está fijado en el
   repositorio y solo puede subir. Si el grupo supera el piso de la semana, el
   umbral nuevo queda en la cobertura real redondeada hacia abajo. Un PR que
   baje la cobertura falla en CI.
2. **Contratos, no implementación:** los tests de API verifican códigos de
   estado (200/201/204/400/401/403/404/409/422/500) y el cuerpo de la
   respuesta; los de UI verifican texto visible y comportamiento, no estilos.
3. **Sin red en las pruebas unitarias:** la BD es SQLite en memoria, el correo
   y MediaPipe se reemplazan por dobles de prueba, y en el frontend la API se
   reemplaza con `vi.spyOn` (componentes) o `page.route` (E2E).
4. **Base real donde importa:** las pruebas de integración corren contra
   PostgreSQL con las migraciones de Alembic, porque SQLite no revisa llaves
   foráneas ni usa funciones de Postgres. El esquema se crea **solo** con
   Alembic: no se usan scripts SQL manuales.
5. **Patrón AAA y nombres que describen el comportamiento** (`test_should_…`,
   `it('should …')`). Cada PR prueba al menos un mutante para demostrar que
   los tests detectan errores reales.
6. **Versiones exactas:** el lockfile (`uv.lock` / `pnpm-lock.yaml`) es la
   fuente de verdad y CI instala con `--frozen`.

---

## 2. Estado de cobertura al cierre

| Capa | Tests | Cobertura (líneas) | Umbral activo |
|---|---:|---:|---|
| Backend (pytest, SQLite) | 415 | **88,1 %** | `--cov-fail-under` en `pyproject.toml` |
| Backend + integración (PostgreSQL) | 415 + 18 | ver job *Database Integration* | — |
| Frontend (vitest) | 303 | **84,4 %** (81,2 % stmts · 78,7 % branches · 75,5 % funcs) | `coverage.thresholds` en `vite.config.ts` |
| E2E (Playwright) | 18 | 3 flujos críticos + login, vocabulario y acceso por rol | — |

### Evolución por semana

| Semana | Tema | Piso | Frontend | Backend |
|---|---|---:|---:|---:|
| S1 | Línea base + primer E2E | 30 % | 36,0 % | 58,3 % |
| S2–S4 | Unitarias, componentes, API | 40–60 % | 45,8 % | 62,8 % |
| S5 | Dobles de prueba + Postgres real | 70 % | 45,8 % | 79,5 % |
| S6 | Componentes de páginas + E2E críticos | 75 % | 83,1 % | 79,5 % |
| S7 | API por router + calidad de código | 80 % | 84,4 % | 88,1 % |

---

## 3. Qué se prueba en cada capa y por qué

### Backend — unitarias y de API (`Backend-SignBridge/tests/`)

| Archivo | Qué cubre | Por qué |
|---|---|---|
| `conftest.py` | SQLite en memoria, override de `get_db`, fábrica de tokens por rol, correo siempre simulado | Tests rápidos, independientes y sin servicios externos |
| `test_schemas_auth.py`, `test_validaciones_*.py` | Contraseña fuerte, teléfono colombiano, límites de texto, estados de ticket | Son reglas de negocio que también valida el frontend |
| `test_security.py`, `test_access_control.py`, `test_api_seguridad.py` | bcrypt, JWT, 401/403 en los 66 endpoints protegidos | Criterio "Alto" del estándar |
| `test_api_errores.py` | Manejador global: un 500 nunca muestra el detalle interno | Contrato único de error |
| `test_api_datos.py`, `test_api_contrato_front.py`, `test_api_vocabulario.py` | 409 en duplicados, rutas que consume el frontend, URL de video válida | Errores que se encontraron en el trimestre |
| `test_dobles_correo_y_avisos.py` | `AsyncMock` en lugar del SMTP: el correo sale solo cuando debe | Dobles de prueba (S5) |
| `test_dobles_traduccion.py` | MediaPipe reemplazado por un doble; reglas del abecedario con manos sintéticas | Probar nuestra lógica, no el modelo de visión |
| `test_api_favoritos.py`, `test_api_usuarios_admin.py`, `test_api_tickets_soporte.py`, `test_api_valoraciones.py` | Endpoints completos por rol, con casos no felices | Cierre al 80 % (S7) |

### Backend — integración (`Backend-SignBridge/tests/integracion/`)

Corren solo si existe `TEST_DATABASE_URL` (servicio `postgres-test`, puerto
5433). Cada test usa una transacción con `join_transaction_mode="create_savepoint"`
y rollback al final, así la base queda vacía después de cada corrida. Cubren
las vistas `vw_*`, el flujo registro → login → perfil y reglas que SQLite no
hace cumplir (llaves foráneas, `unique`).

### Frontend — componentes (`Frontend-SignBridge/src/**/*.test.tsx`)

Testing Library + `vi.spyOn` sobre los objetos del API. Las gráficas de
Recharts se reemplazan por stubs (jsdom no tiene layout). El micrófono y la
cámara se reemplazan por dobles de `useSpeechRecognition` y `useCamera`, y el
deletreo usa relojes falsos (`vi.useFakeTimers`).

### E2E (`Frontend-SignBridge/e2e/`)

Un objeto de página por flujo (`e2e/paginas/`). Los datos se preparan con
`page.route` y `localStorage`, no llenando pantallas. Los flujos con doble
clic o carga lenta usan respuestas con demora para comprobar que no se
duplican pedidos. La cámara es la falsa de Chromium
(`--use-fake-device-for-media-stream`).

| Flujo crítico | Spec |
|---|---|
| Registro + verificación de la cuenta | `registro.spec.ts` |
| Login + panel según el rol | `login-por-rol.spec.ts` |
| Traducción texto → seña y seña → texto | `traduccion.spec.ts` |

---

## 4. Pipeline de CI (`.github/workflows/tests.yml`)

Siete jobs en paralelo. El ruleset de `main` exige que pasen antes de fusionar,
con la aprobación de otro integrante.

| Job | Qué valida | Artefacto |
|---|---|---|
| `Frontend Tests` | vitest + umbral de cobertura | `cobertura-frontend` (HTML) |
| `Backend Tests` | pytest + umbral de cobertura | `cobertura-backend` (HTML + XML) |
| `Database Integration` | Alembic sobre `postgres:17` + suite completa + integración por segunda vez | — |
| `End-to-End Tests` | Playwright; Chromium en caché | `playwright-report` (siempre) |
| `Code Quality` | ESLint, `pnpm build` (TypeScript) y ruff | — |
| `Security Audit` | `pnpm audit` + `pip-audit` | — |
| `Evidencia individual` | Commits de test por autor en la semana (`git shortlog`) | Resumen del job |

### Cómo leer la lista de Actions

| Ícono | Significa | Qué hacer |
|---|---|---|
| ✅ | La corrida pasó | Nada |
| ⊘ / ⓘ gris | **Cancelada**, no fallida: llegó un commit nuevo al mismo PR y `concurrency: cancel-in-progress` detuvo la vieja | Mirar la corrida más reciente de ese PR |
| ❌ | Falló algún job | Abrir el job, corregir y volver a subir |

El 11 de noviembre, siete corridas del PR #24 quedaron canceladas porque los
cuatro integrantes fusionaron PRs a la misma rama en seis minutos; la última
(#43) pasó. Las dos fallidas del trimestre (#31 del PR #23 y #45 del PR #26)
se corrigieron en el mismo PR.

---

## 5. Hallazgos del trimestre y su corrección

Los defectos con impacto en el usuario están registrados como issues con
etiqueta `defecto` y su severidad (`#41`–`#48`). Cada issue cerrado enlaza el
commit que lo corrigió.

| # | Hallazgo | Corrección | PR |
|---|---|---|---|
| 1 | Texto de traducción con solo espacios pasaba la validación | `strip()` antes de validar | #14 |
| 2 | Un error 500 podía mostrar el detalle interno | Manejador global en `main.py` | #16 |
| 3 | El frontend llamaba a `/auth/cities`, que no existe | Cambio a `/regions` + prueba de contrato | #19 |
| 4 | El CI fallaba en Node 20 (vitest y jsdom piden Node 22) | CI en Node 22 | #20 |
| 5 | `python-jose` arrastraba vulnerabilidades (pyasn1, ecdsa) | Migración a PyJWT y parches de dependencias | #20 |
| 6 | Registros duplicados devolvían un error genérico | 409 Conflict | #22 |
| 7 | `video_url` aceptaba cualquier texto | Validación de URL | #23 |
| 8 | Los campos con error no lo anunciaban al lector de pantalla | `aria-invalid` + `aria-describedby` | #23 |
| 9 | `Backend-SignBridge/.env` con secretos estaba en el repo | Borrado de `develop`; rotar claves | #23 |
| 10 | Avisos nuevos en `dnspython` y `opentelemetry-api` | Actualización en `uv.lock` | #26 |
| 11 | El historial decía "2 traducciónes" | Plural corregido en `TranslationHistory.tsx` | #34 |
| 12 | El aviso "Letra registrada" salía dos veces en Señas a Texto | Bloque duplicado eliminado | #32 |
| 13 | Un usuario podía calificar la misma palabra muchas veces e inflar el promedio | Voto único por usuario y palabra, como migración de Alembic | Issue #45 (abierto) |
| 14 | La base se instalaba corriendo scripts SQL a mano con `psql` | Solo migraciones de Alembic; `alembic upgrade head` al arrancar | S7 (en curso) |

---

## 6. Auditoría de dependencias

- **Frontend:** `pnpm audit` sin avisos (overrides de undici, follow-redirects,
  zod y minimatch en `pnpm-workspace.yaml`).
- **Backend:** `pip-audit` sin avisos activos. Un solo ignore justificado:

| ID | Paquete | Motivo |
|---|---|---|
| `PYSEC-2026-1805` | protobuf | mediapipe 0.10.x exige `protobuf<5`; el fix requiere migrar mediapipe |

Cualquier `--ignore-vuln` nuevo debe documentarse aquí con su motivo.

---

## 7. Deuda conocida

1. `GET /admin/users/export` usa `TO_CHAR` (solo PostgreSQL): se cubre con
   integración, no en la suite unitaria.
2. `routers/messages.py` (WebSocket) y `routers/stats.py` tienen la cobertura
   más baja; la mensajería en tiempo real se dejó fuera de los E2E críticos
   por ser propensa a fallos intermitentes.
3. Las funciones del frontend están en 75,5 %: son sobre todo manejadores de
   eventos de la cámara y del micrófono, que dependen de APIs del navegador.
4. El ignore de protobuf caduca cuando se migre mediapipe: revisarlo cada sprint.
