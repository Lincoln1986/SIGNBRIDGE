# Matriz de rotación de capas

**Grupo**: SignBridge · **Ficha**: 3228973 B · **Stack**: React + FastAPI + PostgreSQL

Capas: **Front** (React) · **API** (backend) · **BD** (integración) · **E2E** (Playwright)

Reglas:

- Cada semana cambias de capa. No repites capa hasta haber pasado por las cuatro.
- En la columna escribe la capa y, al cerrar la semana, el enlace a tu PR de tests.
- Quien revisa tu PR debe haber trabajado en otra capa esa semana.

| Integrante (usuario GitHub) | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| @javierperez14 | E2E ([#17](https://github.com/Lincoln1986/SIGNBRIDGE/pull/17)) | API ([#14](https://github.com/Lincoln1986/SIGNBRIDGE/pull/14)) | Front: Register ([#15](https://github.com/Lincoln1986/SIGNBRIDGE/pull/15)) | E2E: seguridad y errores ([#16](https://github.com/Lincoln1986/SIGNBRIDGE/pull/16)) | | | | | |
| @juan-soto350 | E2E ([#24](https://github.com/Lincoln1986/SIGNBRIDGE/pull/24)) | Front ([#24](https://github.com/Lincoln1986/SIGNBRIDGE/pull/24)) | Front: Input y PasswordInput ([#23](https://github.com/Lincoln1986/SIGNBRIDGE/pull/23)) | API: vocabulario ([#23](https://github.com/Lincoln1986/SIGNBRIDGE/pull/23)) | | | | | |
| @Sebas-p-s | E2E | BD | Front: recuperar contraseña ([#18](https://github.com/Lincoln1986/SIGNBRIDGE/pull/18)) | Front: contrato del API ([#19](https://github.com/Lincoln1986/SIGNBRIDGE/pull/19)) | | | | | |
| @Lincoln1986 | E2E | E2E (CI) ([#20](https://github.com/Lincoln1986/SIGNBRIDGE/pull/20)) | Front: Vocabulario ([#21](https://github.com/Lincoln1986/SIGNBRIDGE/pull/21)) | BD: duplicados y datos propios ([#22](https://github.com/Lincoln1986/SIGNBRIDGE/pull/22)) | | | | | |

> S3 (componentes React): cada integrante probó un componente distinto.

> S4 (pruebas de API): todos prueban el API, cada uno desde el ángulo de su capa, distinta a la de S2.

> S2: Front, API y BD son distintas a la capa de S1. En un grupo de 4 alguien repite E2E: esta semana esa capa **monta el CI** (`.github/workflows/tests.yml`) y además escribe sus 3 tests unitarios en cualquier capa. Por eso @Lincoln1986 la toma, y en S3 rota a una capa que no haya tenido.

## Cobertura semanal

Anota la cobertura real al cerrar cada semana (mismos valores que `docs/estrategia-pruebas.md`). El umbral de la semana siguiente es el mayor entre el piso del plan y este valor, redondeado hacia abajo.

| Semana | Frontend (%) | Backend (%) | Umbral configurado para la semana siguiente |
|---|---:|---:|---|
| S1 (línea base) | 36.0 | 58.3 | 30 (front) · 55 (back) |
| S4 (cierre, 11 nov) | 45.8 | 62.8 | 45 líneas · 44 statements · 40 functions · 40 branches (front) · 62 (back) |

## Regla de rama

| Repo | Regla |
|---|---|
| Lincoln1986/SIGNBRIDGE | Regla manual del grupo mientras se activa el ruleset de `main`: nadie fusiona un PR sin la aprobación de otro integrante ni con algún check en rojo (6 checks de `.github/workflows/tests.yml`). |

## Registro de vocero aleatorio

| Semana | Vocero | Capa preguntada | Respuesta escrita | Resultado (Alto / Medio / Bajo) |
|---|---|---|---|---|
| S1 | | | | |
