# Guion de la demo — sustentación SignBridge

Ficha 3228973 B · Viernes 27 de noviembre · Ensayo: jueves 26

Demo en vivo de **10 minutos** con el stack levantado con `docker compose up -d --build`.
Cada integrante presenta la parte de su carril, así cualquiera puede responder
sobre lo que muestra.

## Antes de empezar (30 minutos antes)

- [ ] `git checkout main && git pull` → debe estar en el tag `v1.0-t6`.
- [ ] `docker compose up -d --build` y `docker compose ps`: todo *healthy*.
- [ ] Usuarios listos: Cliente, Soporte y Admin (los de `docs/matriz-casos.md`).
- [ ] Al menos 3 palabras en el vocabulario con video ("hola", "gracias", "agua").
- [ ] Pestañas abiertas: la app, `/docs` de la API, el repo en GitHub (Actions y Releases).
- [ ] Plan B: los pantallazos de `docs/instalacion-desde-cero.md`, por si falla la red.

## Orden

| Min | Quién | Qué muestra | Dónde |
|---|---|---|---|
| 0–1 | **Allan** | Qué es SignBridge y para quién. Portada nueva | http://localhost:5173 |
| 1–3 | **Allan** | Instalación: un `docker compose up`, base creada por Alembic, servicios sanos, usuario sin root | Terminal · `docs/arquitectura.md` |
| 3–5 | **Juan** | Flujo de Cliente: registro, login, texto → seña con video, valorar la palabra | La app |
| 5–6 | **Sebas** | Soporte: un ticket del Cliente se resuelve con solución obligatoria y llega la notificación | La app (2 pestañas) |
| 6–7 | **Sebas** | Plan de pruebas, matriz de 26 casos e informe de ejecución | `docs/` en GitHub |
| 7–9 | **Javier** | CI: un PR con los 7 checks, Newman, el E2E real y el ciclo de un defecto (issue → PR → `closes` → cerrado) | GitHub: Actions, Issues y Releases |
| 9–10 | **Juan** | Lo que queda (deuda técnica y visión de cierre) y el plan del T7 | `docs/deuda-tecnica.md`, `docs/vision-cierre.md` |

## Frases clave (por si los nervios)

- **Allan:** "La base de datos ya no se crea con SQL a mano: el backend aplica las migraciones de Alembic al arrancar."
- **Juan:** "Cada clic en las estrellas ya no suma un voto nuevo: queda uno por persona y por palabra."
- **Sebas:** "Ejecutamos 26 casos a mano; el criterio para publicar era 90 % aprobados y ningún defecto alto abierto."
- **Javier:** "El E2E real encontró un defecto que los 18 simulados no podían ver: el CORS del frontend local."

## Preguntas probables

| Pregunta | Quién responde | Respuesta corta |
|---|---|---|
| ¿Por qué el reconocimiento de señas no es completo? | Juan | Se acotó al abecedario; las señas completas necesitan un dataset que no tenemos (HU-28, T7) |
| ¿Cómo sé que los tests sirven? | Javier | Cada PR prueba un mutante: se rompe el código a propósito y el test tiene que fallar |
| ¿Qué pasa si un check falla? | Javier | La regla de `main` no deja fusionar; se corrige en la misma rama |
| ¿Por qué hay commits sin PR? | Sebas | Fue un error del 24; se corrigió con un PR revisado y desde ahí todo entra por PR |
| ¿Cómo instalo el proyecto? | Allan | `cp .env.example .env`, cambiar la `SECRET_KEY` y `docker compose up -d --build` |
