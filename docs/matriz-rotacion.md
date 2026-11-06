# Matriz de rotación de capas

**Grupo**: SignBridge · **Ficha**: 3228973 B · **Stack**: React + FastAPI + PostgreSQL

Capas: **Front** (React) · **API** (backend) · **BD** (integración) · **E2E** (Playwright)

Reglas:

- Cada semana cambias de capa. No repites capa hasta haber pasado por las cuatro.
- En la columna escribe la capa y, al cerrar la semana, el enlace a tu PR de tests.
- Quien revisa tu PR debe haber trabajado en otra capa esa semana.

| Integrante (usuario GitHub) | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| @javierperez14 | E2E | API | | | | | | | |
| @juan-soto350 | E2E | Front | | | | | | | |
| @Sebas-p-s | E2E | BD | | | | | | | |
| @Lincoln1986 | E2E | E2E (CI) | | | | | | | |

> S2: Front, API y BD son distintas a la capa de S1. En un grupo de 4 alguien repite E2E: esta semana esa capa **monta el CI** (`.github/workflows/tests.yml`) y además escribe sus 3 tests unitarios en cualquier capa. Por eso @Lincoln1986 la toma, y en S3 rota a una capa que no haya tenido.

## Cobertura semanal

Anota la cobertura real al cerrar cada semana (mismos valores que `docs/estrategia-pruebas.md`). El umbral de la semana siguiente es el mayor entre el piso del plan y este valor, redondeado hacia abajo.

| Semana | Frontend (%) | Backend (%) | Umbral configurado para la semana siguiente |
|---|---:|---:|---|
| S1 (línea base) | 36.0 | 58.3 | 30 (front) · 55 (back) |

## Regla de rama

| Repo | Regla |
|---|---|
| Lincoln1986/SIGNBRIDGE | Pendiente: se activa con el ruleset de `main` (exigir los 5 checks de `.github/workflows/tests.yml`) |

## Registro de vocero aleatorio

| Semana | Vocero | Capa preguntada | Respuesta escrita | Resultado (Alto / Medio / Bajo) |
|---|---|---|---|---|
| S1 | | | | |
