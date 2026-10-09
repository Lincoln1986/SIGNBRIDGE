# Estrategia de pruebas — SignBridge

> Estándar: `bc-testing-adso` · Meta final: **≥ 80% de cobertura** en frontend y
> backend · Estado actual: **Sprint S1 completado**

---

## 1. Principios

1. **Trinquete estricto (ratchet):** cada umbral de cobertura está fijado en el
   repositorio y solo puede subir. Un PR que baje la cobertura falla en CI.
2. **Contratos, no implementación:** los tests de API verifican códigos de
   estado (200/401/403/422) y payloads; los de UI verifican texto visible y
   comportamiento, no estilos ni estructura interna.
3. **Sin red en las pruebas:** la BD se sustituye por SQLite en memoria
   (backend) y la API se intercepta con mocks o `page.route` (frontend/E2E).
   Ningún test envía correo ni consulta Mediapipe real.
4. **Versiones exactas:** `pyproject.toml` y `package.json` no admiten `^` ni
   `~`. El lockfile (`uv.lock` / `pnpm-lock.yaml`) es la fuente de verdad y CI
   instala con `--frozen`.

---

## 2. Estado de cobertura (Sprint S1)

| Capa | Tests | Cobertura | Umbral activo (trinquete) |
|---|---:|---:|---|
| Backend (pytest) | 59 | **57.4%** líneas | `--cov-fail-under=55` en `pyproject.toml` |
| Frontend (vitest) | 143 | **36.0%** líneas (34.9% stmts · 30.8% branches · 32.2% funcs) | `coverage.thresholds` en `vite.config.ts` (30%) |
| E2E (Playwright) | 2 | flujo de login completo | — |

Los umbrales actuales son conservadores a propósito: al superar una meta de
sprint se fija el nuevo piso, y de ahí ya no baja.

---

## 3. Distribución de la suite backend

| Archivo | Qué cubre |
|---|---|
| `tests/conftest.py` | Env vars de `Settings`, engine SQLite en memoria con `StaticPool`, override de `get_db`, siembra de roles/usuarios, correo mockeado (nunca SMTP real) |
| `tests/test_schemas_auth.py` | Reglas de negocio duplicadas con el frontend: contraseña fuerte, teléfono colombiano (10 dígitos, inicia en 3), capitalización de nombres |
| `tests/test_security.py` | bcrypt (hash/verify), JWT (create/decode/expirado/basura), tokens de reset |
| `tests/test_auth_flow.py` | Registro (éxito, email duplicado, sin rol por defecto), login (éxito, 401, 403 desactivado), `/auth/me`, forgot/reset de contraseña |
| `tests/test_access_control.py` | 401 sin token o token inválido y 403 con rol insuficiente sobre endpoints admin/soporte; cuenta desactivada bloqueada |

Cobertura por módulo más relevante: `schemas/auth.py` 100%,
`core/security.py` y `routers/auth.py` altos; los servicios
(`mail`, `traduccion`, `abecedario`) son la deuda pendiente de S4 con mocks.

---

## 4. Distribución de la suite frontend

| Área | Archivos |
|---|---|
| UI primitivas | `UI.test.tsx` (fuerza de contraseña, requisitos, botones, inputs, alertas) |
| Autenticación | `AuthModal.test.tsx` (pestañas, login fallido/exitoso, registro saneado, forgot) |
| Guardas de ruta | `ProtectedRoute.test.tsx` (401/redirect/roles con `AuthContext` real) |
| Notificaciones | `NotificationBell.test.tsx`, `Notifications.test.tsx` (contador, filtros, marcar/eliminar) |
| Accesibilidad | `AccessibilityWidget.test.tsx` (persistencia en localStorage, exclusión mutua, lectura) |
| Visualización | `StatsCharts.test.tsx`, `StatDetailModal.test.tsx`, `SignSequencePlayer.test.tsx` |
| Infraestructura | `client.test.ts` (todas las rutas de la capa API), hooks `useCamera`/`useSpeechRecognition` |
| E2E | `e2e/login.spec.ts` (login válido → `/home` + token; 401 → sesión limpiada) |

Los gráficos de Recharts se testean con un stub que expone los `data` que el
componente calcula: se valida el mapeo de datos sin depender del render de SVG
(en jsdom no hay layout).

---

## 5. Pipeline de CI (`.github/workflows/tests.yml`)

Cinco jobs en paralelo; **el ruleset de `main` debe exigir los cinco** antes de
fusionar (Settings → Rules → Add rule → Require status checks):

| Job | Herramienta | Qué valida |
|---|---|---|
| `Frontend Tests` | pnpm + vitest | Unitarios + umbral de cobertura 30% |
| `Backend Tests` | uv + pytest | Unitarios + umbral de cobertura 55% |
| `Database Integration` | uv + Alembic + `postgres:17` (service) | `alembic upgrade head` sobre BD limpia **antes** de la suite; `alembic current` verifica que quedó en head |
| `End-to-End Tests` | Playwright (Chromium) | Flujos de login; sube `playwright-report` como artefacto si falla |
| `Security Audit` | `pnpm audit` + `uv run pip-audit` | 0 vulnerabilidades activas en ambas capas |

---

## 6. Auditoría de dependencias

- **Frontend:** `pnpm audit` — 0 avisos (se fijaron axios 1.20.0,
  react-router-dom 7.18.4 y vite 8.3.4, que son las versiones parcheadas).
- **Backend:** `uv run pip-audit` — 44 avisos originales reducidos a **7
  ignorados con justificación**:

| ID | Paquete | Motivo del ignore |
|---|---|---|
| `PYSEC-2026-1325` | ecdsa | Sin fix publicado; llega vía python-jose |
| `GHSA-3qf3-8w2g-rqmx` | python-jose 3.4.0 | 3.4.0 es la última versión; sin parche upstream |
| `PYSEC-2026-2263/3455/3456/3457` | pyasn1 0.4.8 | python-jose declara `pyasn1<0.5.0`; subirlo exige migrar a PyJWT (pendiente) |
| `PYSEC-2026-1805` | protobuf 4.25.9 | mediapipe 0.10.x declara `protobuf<5`; el fix requiere migrar a mediapipe 1.x (pendiente S4) |

Cualquier `--ignore-vuln` nuevo debe documentarse aquí con su motivo.

---

## 7. Roadmap de cobertura (Sprints S2–S7)

| Sprint | Meta | Foco |
|---|---|---|
| S2 | ≥ 40% | Extraer validaciones duplicadas (teléfono/contraseña) a un hook compartido y testearlo; tests de `Register.tsx`/`Login.tsx` |
| S3 | ≥ 50% | `TestClient` sobre `messages`, `support`, `favorites`, `admin_users`; contrato global de errores 4xx/5xx en JSON |
| S4 | ≥ 60% | `pytest-mock` para `services/mail.py` y `services/traduccion.py` (Mediapipe); MSW en el frontend |
| S5 | ≥ 70% | Integración transaccional con `postgres-test` y rollback; vistas `vw_admin_dashboard` |
| S6 | ≥ 75% | E2E: registro+verificación, login+redirect por rol, traducción bidireccional (Page Objects, `page.route` anti-flakiness) |
| S7 | ≥ 80% | Auditoría final, subir trinquetes al umbral definitivo |

---

## 8. Deuda conocida

1. **`pnpm build` falla por 10 errores de TypeScript preexistentes** (reportado
   en HEAD, PR #13: `useSpeechRecognition.ts`, `PasswordPages.tsx`,
   `Vocabulary.tsx`, `VoiceToSign.tsx`, `SignSequencePlayer.tsx`). No son
   regressions de la migración a pnpm. El CI de tests no ejecuta `build` hasta
   que se corrijan.
2. `alembic upgrade head` contra Postgres solo se ejecuta en CI (service de
   GitHub Actions): el entorno local de este trabajo no tiene Docker.
3. Los `--ignore-vuln` de pip-audit (sección 6) caducan cuando salgan los
   fixes: revisar en cada sprint.
4. **Baseline de Alembic** (`alembic/versions/18c15e7dc120_…`): se autogeneró
   contra SQLite porque el entorno local no tiene Docker. Verificado localmente:
   `upgrade head` crea las 17 tablas + `alembic_version`, `current` queda en
   head y `downgrade base` limpia todo. Su primera ejecución contra PostgreSQL
   real ocurre en el job `Database Integration` de CI; si algo fallara allí, el
   ajuste sería de tipos/dialecto en esa misma revisión.
