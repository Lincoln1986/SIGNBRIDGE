# Matriz de rotación de capas

**Grupo**: SignBridge · **Ficha**: 3228973 B · **Stack**: React + FastAPI + PostgreSQL

Capas: **Front** (React) · **API** (backend) · **BD** (integración) · **E2E** (Playwright)

Reglas:

- Cada semana cambias de capa. No repites capa hasta haber pasado por las cuatro.
- En la columna escribe la capa y, al cerrar la semana, el enlace a tu PR de tests.
- Quien revisa tu PR debe haber trabajado en otra capa esa semana.

| Integrante (usuario GitHub) | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 |
|---|---|---|---|---|---|---|---|---|---|
| @javierperez14 | E2E ([#17](https://github.com/Lincoln1986/SIGNBRIDGE/pull/17)) | API ([#14](https://github.com/Lincoln1986/SIGNBRIDGE/pull/14)) | Front: Register ([#15](https://github.com/Lincoln1986/SIGNBRIDGE/pull/15)) | E2E: seguridad y errores ([#16](https://github.com/Lincoln1986/SIGNBRIDGE/pull/16)) | BD: Postgres de pruebas y vistas ([#26](https://github.com/Lincoln1986/SIGNBRIDGE/pull/26)) | Front: Mi panel e historial ([#34](https://github.com/Lincoln1986/SIGNBRIDGE/pull/34)) | API: favoritos ([#55](https://github.com/Lincoln1986/SIGNBRIDGE/pull/55)) · CI: calidad de código ([#54](https://github.com/Lincoln1986/SIGNBRIDGE/pull/54)) | | |
| @juan-soto350 | E2E ([#24](https://github.com/Lincoln1986/SIGNBRIDGE/pull/24)) | Front ([#24](https://github.com/Lincoln1986/SIGNBRIDGE/pull/24)) | Front: Input y PasswordInput ([#23](https://github.com/Lincoln1986/SIGNBRIDGE/pull/23)) | API: vocabulario ([#23](https://github.com/Lincoln1986/SIGNBRIDGE/pull/23)) | BD: endpoints contra Postgres ([#29](https://github.com/Lincoln1986/SIGNBRIDGE/pull/29)) | Front + E2E: panel admin y login por rol ([#35](https://github.com/Lincoln1986/SIGNBRIDGE/pull/35)) | API: usuarios del admin ([#50](https://github.com/Lincoln1986/SIGNBRIDGE/pull/50)) | | |
| @Sebas-p-s | E2E | BD | Front: recuperar contraseña ([#18](https://github.com/Lincoln1986/SIGNBRIDGE/pull/18)) | Front: contrato del API ([#19](https://github.com/Lincoln1986/SIGNBRIDGE/pull/19)) | API: dobles de correo y avisos ([#27](https://github.com/Lincoln1986/SIGNBRIDGE/pull/27)) | Front + E2E: panel de soporte y registro ([#33](https://github.com/Lincoln1986/SIGNBRIDGE/pull/33)) | API: tickets de soporte ([#49](https://github.com/Lincoln1986/SIGNBRIDGE/pull/49)) | | |
| @Lincoln1986 | E2E | E2E (CI) ([#20](https://github.com/Lincoln1986/SIGNBRIDGE/pull/20)) | Front: Vocabulario ([#21](https://github.com/Lincoln1986/SIGNBRIDGE/pull/21)) | BD: duplicados y datos propios ([#22](https://github.com/Lincoln1986/SIGNBRIDGE/pull/22)) | API: dobles de MediaPipe y traducción ([#28](https://github.com/Lincoln1986/SIGNBRIDGE/pull/28)) | Front + E2E: Voz a Señas y Señas a Texto ([#32](https://github.com/Lincoln1986/SIGNBRIDGE/pull/32)) | API: valoraciones ([#53](https://github.com/Lincoln1986/SIGNBRIDGE/pull/53)) | | |

> S3 (componentes React): cada integrante probó un componente distinto.

> S4 (pruebas de API): todos prueban el API, cada uno desde el ángulo de su capa, distinta a la de S2.

> S2: Front, API y BD son distintas a la capa de S1. En un grupo de 4 alguien repite E2E: esta semana esa capa **monta el CI** (`.github/workflows/tests.yml`) y además escribe sus 3 tests unitarios en cualquier capa. Por eso @Lincoln1986 la toma, y en S3 rota a una capa que no haya tenido.

## Cobertura semanal

Anota la cobertura real al cerrar cada semana (mismos valores que `docs/estrategia-pruebas.md`). El umbral de la semana siguiente es el mayor entre el piso del plan y este valor, redondeado hacia abajo.

| Semana | Frontend (%) | Backend (%) | Umbral configurado para la semana siguiente |
|---|---:|---:|---|
| S1 (línea base) | 36.0 | 58.3 | 30 (front) · 55 (back) |
| S4 (cierre, 11 nov) | 45.8 | 62.8 | 45 líneas · 44 statements · 40 functions · 40 branches (front) · 62 (back) |
| S5 (cierre, 18 nov) | 45.8 | 79.5 | 45 líneas (front, sin cambios: la S5 fue de backend) · 79 (back) |
| S6 (cierre, 18 nov) | 83.1 | 79.5 | 83 líneas · 80 statements · 74 functions · 77 branches (front) · 79 (back, sin cambios: la S6 fue de frontend) |
| S7 (cierre, 20 nov) | 84.4 | 88.1 | 84 líneas · 81 statements · 75 functions · 78 branches (front) · 88 (back) |

> S5 (dobles de prueba + BD real): con esta semana cada integrante ya pasó por Front, API, BD y E2E.

> S7 (API de los routers con menos cobertura): cada integrante tomó un router distinto (favoritos, usuarios del admin, tickets, valoraciones) y el backend pasó de 79,5 % a 88,1 %. Además entró el job *Code Quality* (ESLint, `pnpm build` y ruff) como 7.º check del CI.

> S6 (componentes de páginas + E2E críticos): los 3 flujos que pide el plan quedaron cubiertos (registro, login por rol, traducción). El #35 se fusionó a `main` por error y se emparejó con `develop` en el #37; el #38 llevó todo a `main`.

## Fecha real de cada PR

La columna de la semana dice a qué semana **del plan** corresponde el trabajo. Esta tabla dice **cuándo se subió y se fusionó** de verdad, para que no haya confusión al revisar `git log` o el job *Evidencia individual*.

| Semana del plan | PR | Primer commit | Fusionado en `develop` |
|---|---|---|---|
| S1 | #17, #24 | 04 nov · 11 nov | 11 nov |
| S2 | #14, #20 | 04 nov · 11 nov | 11 nov |
| S3 | #15, #18, #21, #23 | 04–11 nov | 11 nov |
| S4 | #16, #19, #22, #23, #25 | 04–12 nov | 11–12 nov |
| S5 | #26, #27, #28, #29, #31 | 13–17 nov | 14–17 nov |
| S6 | #32, #33, #34, #35 | 17–18 nov | 17–18 nov |
| Release a `main` | #37, #38 | 18 nov | 18 nov |
| S7 | #49, #50, #53, #54, #55 | 19–20 nov | 20 nov |
| S2 (rama recuperada) | #52 | 21 oct | 20 nov |

Las semanas S1 a S3 se trabajaron con el plan, pero los PR se subieron entre el 4 y el 11 de noviembre, cuando el grupo empezó a usar ramas y PR de forma ordenada. Desde la S5 cada integrante sube su PR dentro de la semana que le corresponde. El #52 es una rama de Sebas del 21 de octubre que había quedado sin fusionar: se revisó contra `develop`, sus tests pasaron y se fusionó con su fecha original.

## Regla de rama

| Repo | Regla |
|---|---|
| Lincoln1986/SIGNBRIDGE | Regla manual del grupo mientras se activa el ruleset de `main`: nadie fusiona un PR sin la aprobación de otro integrante ni con algún check en rojo (7 checks de `.github/workflows/tests.yml`). |

## Registro de vocero aleatorio

| Semana | Vocero | Capa preguntada | Respuesta escrita | Resultado (Alto / Medio / Bajo) |
|---|---|---|---|---|
| S1 | | | | |
