# Registro del vocero — SignBridge

Ficha 3228973 B

El **vocero** es la persona que, al azar, responde por el equipo sobre una capa
del proyecto. Cualquiera puede ser elegido, así que todos deben poder explicar
el trabajo de los demás, no solo el propio.

## Cómo se prepara

1. Cada PR trae una sección **"Para el vocero"** con 2 o 3 preguntas y su respuesta corta.
2. Antes de cada revisión, el equipo repasa las de esa semana.
3. Después, se anota aquí quién habló, sobre qué y cómo le fue.

## Registro

Durante las semanas S1 a S7 el equipo no llevó registro de vocero: no hubo una
ronda en la que se eligiera a alguien al azar para responder por el equipo. Desde
el ensayo del 26 de noviembre se registra cada vez.

| Semana | Fecha | Vocero | Capa o tema preguntado | Pregunta principal | Resultado (Alto / Medio / Bajo) | Qué reforzar |
|---|---|---|---|---|---|---|
| S1 | — | No se hizo | — | — | — | — |
| S2 | — | No se hizo | — | — | — | — |
| S3 | — | No se hizo | — | — | — | — |
| S4 | — | No se hizo | — | — | — | — |
| S5 | — | No se hizo | — | — | — | — |
| S6 | — | No se hizo | — | — | — | — |
| S7 | — | No se hizo | — | — | — | — |
| Ensayo (26 nov) | 26 nov | _(se elige al azar)_ | | | | |
| Sustentación (27 nov) | 27 nov | _(lo elige el instructor)_ | | | | |

## Preguntas de repaso para la sustentación

Sacadas de las secciones "Para el vocero" de los PR. Cualquiera debe poder responderlas.

| Tema | Pregunta | Respuesta corta |
|---|---|---|
| Pruebas | ¿Qué es el trinquete de cobertura? | El umbral está en el repo y solo sube: un PR que baja la cobertura falla en el CI |
| Pruebas | ¿Cómo sabemos que un test sirve? | Se rompe el código a propósito (mutante) y el test tiene que fallar |
| Pruebas | ¿Para qué un E2E sin simulación? | Prueba frontend, backend y base juntos; así se encontró el defecto del CORS |
| CI | ¿Qué hace el ruleset de `main`? | No deja fusionar sin 1 aprobación y sin los 7 checks en verde |
| CI | ¿Qué es una corrida cancelada en Actions? | Llegó un commit nuevo al mismo PR y se detuvo la vieja: no es una falla |
| BD | ¿Por qué solo Alembic y no SQL manual? | Alembic sabe qué migraciones se aplicaron; un script manual se puede correr dos veces o en otro orden |
| Defectos | ¿Cómo se cierra un defecto? | Issue con severidad → PR con prueba y `closes #N` → se cierra al llegar a `main` |
| Seguridad | ¿Por qué cambiar las claves si el `.env` se borró? | Borrarlo de la rama no lo borra del historial de git |
| Instalación | ¿Por qué los contenedores no corren como root? | Si alguien aprovecha una falla, no queda con permisos de administrador |
| Producto | ¿Por qué el reconocimiento de señas no es completo? | Se acotó al abecedario; las señas completas necesitan un dataset (HU-28, T7) |
