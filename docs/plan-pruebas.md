# Plan de pruebas — SignBridge

Ficha 3228973 B · V Trimestre · Cierre: 20 al 27 de noviembre de 2026

Este plan dice **qué** se prueba antes de la entrega, **cuándo** se considera
listo y **quién** hace cada parte. El **cómo** (capas, herramientas, CI) está en
[`docs/estrategia-pruebas.md`](estrategia-pruebas.md).

---

## 1. Objetivo

Comprobar que las historias de usuario terminadas cumplen sus criterios de
aceptación, con pruebas automáticas en el CI y una ejecución manual de los
flujos principales, antes del release `v1.0-t6` del 25 de noviembre.

## 2. Alcance

### Dentro del alcance: las 15 historias terminadas

| Historia | Pruebas automáticas que la cubren |
|---|---|
| HU-01 Registro | `test_auth_flow.py`, `test_api_datos.py` (409), `e2e/registro.spec.ts` |
| HU-02 Inicio de sesión | `test_security.py`, `e2e/login.spec.ts`, `e2e/login-incorrecto.spec.ts`, `e2e/login-por-rol.spec.ts` |
| HU-05 Cambio y recuperación de contraseña | `test_schemas_auth.py`, `test_dobles_correo_y_avisos.py`, `PasswordPages.test.tsx` |
| HU-18 Cierre de sesión | `test_access_control.py` (token inválido → 401) |
| HU-08 Texto a señas | `test_validaciones_traduccion.py`, `test_dobles_traduccion.py`, `e2e/traduccion.spec.ts` |
| HU-15 Voz a señas | `VoiceToSign.test.tsx` |
| HU-26 Frases completas | `test_dobles_traduccion.py` |
| HU-04 Reproducción secuencial | `SignSequencePlayer.test.tsx`, `e2e/traduccion.spec.ts` |
| HU-12 Buscador de señas | `test_api_vocabulario.py`, `Vocabulary.test.tsx`, `e2e/buscar-en-vocabulario.spec.ts` |
| HU-06 Valoraciones | `test_api_valoraciones.py` |
| HU-07 Tickets de soporte | `test_api_tickets_soporte.py`, `test_validaciones_soporte.py` |
| HU-24 Dashboard de tickets | `SupportDashboard.test.tsx`, `test_api_tickets_soporte.py` |
| HU-22 Vocabulario con videos (Admin) | `test_api_vocabulario.py`, `AdminDashboard.test.tsx` |
| HU-23 Reportes y estadísticas | `test_dashboards.py`, `StatsCharts.test.tsx`, `tests/integracion/test_integracion_vistas.py` |
| HU-20 Accesibilidad | `UI.accesibilidad.test.tsx` (`aria-invalid`, orden de tabulación), `AccessibilityWidget.test.tsx` |

Además, transversal a todas: **control de acceso por rol** (`test_api_seguridad.py`,
`e2e/rol-cliente-sin-admin.spec.ts`) y **errores en JSON** (`test_api_errores.py`).

### Fuera del alcance

| Qué | Motivo |
|---|---|
| HU-03 y HU-25 (reconocimiento real de señas) | En curso: dependen de MediaPipe en el contenedor. Solo se prueba el modo simulado. |
| HU-09, HU-14, HU-21 (partes pendientes) | En curso. Se prueba lo terminado de cada una. |
| HU-11, HU-17, HU-19 | Sin empezar; pasan al VI trimestre. |
| Carga y rendimiento | No hay servidor de producción todavía (T7). |
| `GET /admin/users/export` en la suite unitaria | Usa `TO_CHAR`, solo de PostgreSQL; se cubre en integración. |

## 3. Tipos de prueba

| Tipo | Herramienta | Dónde corre |
|---|---|---|
| Unitarias y de API | pytest + TestClient | CI: *Backend Tests* |
| Integración con base real | pytest + PostgreSQL 17 + Alembic | CI: *Database Integration* |
| Componentes | Vitest + Testing Library | CI: *Frontend Tests* |
| Extremo a extremo | Playwright | CI: *End-to-End Tests* |
| Calidad de código | ESLint, `pnpm build`, ruff | CI: *Code Quality* |
| Dependencias | `pnpm audit`, `pip-audit` | CI: *Security Audit* |
| API manual | Postman + Newman | Local (23 nov) |
| Ejecución manual | Matriz de casos | Local (24 nov) |

## 4. Criterios de entrada

Se empieza a probar una versión cuando:

1. El código está en `develop` por medio de un PR aprobado por otro integrante.
2. Los 7 checks del CI están en verde.
3. La base se crea con `alembic upgrade head`, sin scripts SQL manuales.
4. El stack arranca con `docker compose up` y `/health` responde `{"status":"healthy"}`.

## 5. Criterios de salida

La versión se puede publicar en `main` (release `v1.0-t6`) cuando:

| Criterio | Meta | Estado al 20 nov |
|---|---|---|
| Cobertura backend | ≥ 80 % | ✅ 88,1 % |
| Cobertura frontend (líneas) | ≥ 80 % | ✅ 84,4 % |
| Flujos E2E críticos (registro, login por rol, traducción) | 3 en verde | ✅ 3 de 3 |
| Checks del CI | 7 en verde | ✅ |
| Defectos `severidad: crítica` abiertos | 0 sin plan | ⚠️ #42 (`.env`): falta cambiar las claves |
| Defectos `severidad: alta` abiertos | 0 | ⚠️ #45 (voto repetido): se cierra el 24 |
| Casos de la matriz manual | ≥ 90 % aprobados | ⏳ 24 nov |

## 6. Ambiente de pruebas

| Elemento | Versión o valor |
|---|---|
| Backend | Python 3.12 (CI), FastAPI, SQLAlchemy 2.0 |
| Base de datos | SQLite en memoria (unitarias) · PostgreSQL 17 (integración y uso real) |
| Frontend | Node 22, React 19, Vite |
| Navegador E2E | Chromium de Playwright, cámara falsa |
| Datos | Creados por cada test; ningún dato real de usuarios |

## 7. Responsables y cronograma

| Fecha | Allan (instalación) | Sebas (plan y defectos) | Javier (CI y calidad) | Juan (documentación) |
|---|---|---|---|---|
| Jue 19 | Proteger `main` y revisar ramas | Etiquetas y 8 issues de defectos | Job *Code Quality* | Visión de cierre |
| Vie 20 | Compose con Alembic y `/health` | **Este plan** + estrategia | Umbrales al cierre de S7 | Retros S5 y S6 |
| Lun 23 | Dockerfiles | Matriz de ≥ 20 casos | Postman + Newman | `docs/backends.md` |
| Mar 24 | Instalación desde cero | Ejecución manual | 2 ciclos de defectos (`closes #N`) | Deuda técnica y README |
| Mié 25 | Demo | Informe de ejecución | E2E sin simulación + **release** | Guía de commits y plantilla de PR |
| Jue 26 | Ensayo de la sustentación (todos) | | | |
| Vie 27 | **Sustentación** | | | |

## 8. Riesgos

| Riesgo | Efecto | Qué se hace |
|---|---|---|
| MediaPipe no carga en el contenedor | La seña a texto queda en modo simulado | Se prueba y se informa el modo simulado; HU-03/HU-25 quedan fuera del alcance |
| Un PR fusionado sin aprobación | Cambio sin revisión | Ruleset en `main` con 1 aprobación obligatoria |
| Claves del `.env` en el historial de git | Acceso a Mailtrap y tokens válidos | Cambiar la contraseña de Mailtrap y la `SECRET_KEY` (issue #42) |
| Corridas canceladas en Actions | Parece que el CI falló | Se lee la corrida más reciente (sección 4 de la estrategia) |

## 9. Entregables

| Entregable | Archivo | Fecha |
|---|---|---|
| Plan de pruebas | `docs/plan-pruebas.md` | 20 nov |
| Estrategia de pruebas | `docs/estrategia-pruebas.md` | 20 nov |
| Matriz de casos | `docs/matriz-casos.md` | 23 nov |
| Colección de Postman | `postman/` | 23 nov |
| Informe de ejecución | `docs/informe-ejecucion.md` | 25 nov |
| Issues de defectos | Pestaña **Issues**, etiqueta `defecto` | Continuo |
