# Guía de commits, ramas y PR — SignBridge

Ficha 3228973 B · Las reglas que el equipo usó durante el trimestre, escritas para
que cualquiera que llegue al proyecto las siga igual.

---

## 1. Ramas

| Rama | Para qué | Quién escribe en ella |
|---|---|---|
| `main` | Lo entregado. Solo cambia con un **release** | Nadie directo: solo por PR aprobado, con los 7 checks en verde (ruleset `proteger-main`) |
| `develop` | Donde se integra todo | Nadie directo: solo por PR (ruleset `proteger-develop` evita que se borre) |
| `tipo/descripcion-corta` | Una tarea | Su autor |

**Nombre de la rama:** `tipo/qué-hace`, en minúsculas y con guiones. Ejemplos reales:

- `test/s7-favoritos`
- `fix/voto-unico-palabra`
- `infra/dockerfiles`
- `docs/plan-de-pruebas`
- `ci/s7-calidad-codigo`

Cuando el PR se fusiona, la rama se borra sola (*Automatically delete head branches*).

---

## 2. Mensajes de commit

Formato: **`tipo(alcance): qué cambia`**, en minúsculas y sin punto final.

| Tipo | Cuándo | Ejemplo del repo |
|---|---|---|
| `feat` | Función nueva | `feat(front): portada, colores y logo del diseño local` |
| `fix` | Corrige un defecto | `fix(feedback): un voto por usuario y palabra` |
| `test` | Agrega o cambia pruebas | `test(api): tickets de soporte` |
| `ci` | Cambia el pipeline | `ci: job de calidad (lint, build y ruff)` |
| `docs` | Solo documentación | `docs: matriz de casos de prueba manuales` |
| `infra` | Docker, compose, despliegue | `infra: el backend aplica migraciones de Alembic al arrancar` |
| `chore` | Limpieza sin cambio de comportamiento | `chore(lint): ruff en el backend y limpieza de imports` |
| `build` | Dependencias | `build(deps): python-jose a PyJWT y parches` |

**Alcance** (opcional, entre paréntesis): la parte que toca: `api`, `front`, `e2e`, `bd`, `feedback`, `deps`…

**Mensajes que no sirven:**

| ❌ Así no | ✅ Así sí | Por qué |
|---|---|---|
| `Add files via upload` (el que propone GitHub) | `test(api): tickets de soporte` | No dice qué cambió |
| `Update matriz.md` | `docs: resultados de la ejecucion manual` | El nombre del archivo no es el cambio |
| `cambios` / `arreglo` | `fix(front): la URL del backend sale de VITE_API_URL` | Hay que entender el commit sin abrirlo |

Desde la web de GitHub, el mensaje se escribe en **Commit changes → Commit message** antes de confirmar: cambia el que GitHub propone.

---

## 3. Pull requests

1. **Siempre a `develop`**, salvo el release, que va de `develop` a `main`. Revisa la base antes de crear el PR.
2. **Título** con el mismo formato de los commits.
3. **Descripción** con la plantilla (`.github/pull_request_template.md`), que incluye:
   - qué prueba o qué cambia,
   - **`**Revisor**: @usuario`** (otra persona, con otra capa esa semana),
   - el checklist y cómo ejecutarlo.
4. **Si corrige un defecto:** la primera línea es `closes #N` y en **Development** se conecta el issue. El issue se cierra cuando el cambio llega a `main` con el release.
5. **Revisor:** se pide en **Reviewers**, y **nadie aprueba su propio PR**.
6. **La aprobación lleva comentario:** qué se revisó y por qué está bien. "Aprobado" solo no sirve de evidencia.
7. **Merge** solo con los 7 checks en verde y 1 aprobación.

---

## 4. Defectos (issues)

| Campo | Qué va |
|---|---|
| Título | Lo que el usuario ve, no la causa: "El historial dice '2 traducciónes'" |
| Cuerpo | Encontrado (fecha y cómo) · Pasos para reproducir · Resultado esperado · Resultado obtenido · Impacto |
| Labels | `defecto` + una severidad: `crítica`, `alta`, `media` o `baja` |
| Assignee | Quien lo corrige |

Un issue se cierra **solo** cuando el arreglo está fusionado, con el PR (`closes #N`) o con un comentario que diga el commit y el PR del arreglo.

---

## 5. Lo que nunca se sube

- `.env` (claves). Solo `.env.example`.
- `node_modules/`, `.venv/`, `dist/`, reportes de cobertura.
- Datos reales de personas, ni siquiera en tests.
