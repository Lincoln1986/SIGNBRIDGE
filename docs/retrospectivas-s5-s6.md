# Retrospectivas S5 y S6 — SignBridge

Ficha 3228973 B · Formato: qué funcionó, qué no, qué cambiamos.
Los datos salen de los PR, de las corridas de Actions y de `docs/matriz-rotacion.md`.

---

## S5 · Dobles de prueba y base real (13 al 17 de noviembre)

**Meta:** pruebas de integración contra PostgreSQL y dobles para lo externo
(correo, MediaPipe). **Resultado:** backend de 62,8 % a **79,5 %**.

| PR | Qué entró |
|---|---|
| #26 | Servicio `postgres-test` y pruebas de las vistas `vw_*` |
| #27 | Dobles del correo y de los avisos (`AsyncMock`) |
| #28 | Doble de MediaPipe y reglas del abecedario |
| #29 | Endpoints contra Postgres real |

### Qué funcionó

- Las 18 pruebas de integración pasaron igual en dos corridas seguidas: el
  rollback por transacción deja la base limpia.
- Con los dobles, la suite no depende de Mailtrap ni de la cámara; corre en
  menos de un minuto.
- Cada integrante tomó un tema distinto y no hubo conflictos entre PR.

### Qué no funcionó

| Problema | Efecto | Cómo se resolvió |
|---|---|---|
| *Security Audit* falló en el #26 por avisos nuevos en `dnspython` y `opentelemetry-api` | El PR quedó en rojo | Se actualizaron en `uv.lock` dentro del mismo PR |
| Un PR (#28) se fusionó sin aprobación | Cambio sin revisión registrada | Regla del grupo: aprobar siempre antes de fusionar |
| Las descripciones de los PR no decían quién revisaba | El instructor no podía ver el revisor | Línea `**Revisor**: @usuario` en cada descripción desde la S6 |
| Se abrió un PR repetido (#30) para un arreglo que ya estaba en otro (#31) | Ruido en la lista de PR | Se cerró sin fusionar |
| El umbral del backend no se subió al terminar la semana | La cobertura podía bajar sin que el CI avisara | Se subió de 62 a 79 en el PR de cierre (#36) |

### Qué cambiamos para la S6

1. Nadie fusiona sin la aprobación de otro integrante.
2. Cada PR dice su revisor en la descripción.
3. Cada semana cierra con un PR que sube el umbral.

---

## S6 · Páginas y flujos E2E críticos (17 y 18 de noviembre)

**Meta:** pruebas de las páginas principales y los 3 flujos E2E críticos.
**Resultado:** frontend de 45,8 % a **83,1 %**; los 3 flujos cubiertos
(registro, login por rol, traducción).

| PR | Qué entró |
|---|---|
| #32 | Voz a Señas, Señas a Texto y E2E de traducción |
| #33 | Panel de soporte y E2E de registro |
| #34 | Panel del usuario e historial |
| #35 | Panel admin y E2E de login por rol |

### Qué funcionó

- El frontend subió casi 40 puntos en dos días, porque cada integrante tomó
  una página distinta.
- Los tests encontraron 2 defectos reales: el plural "traducciónes" y el aviso
  "Letra registrada" duplicado. Se corrigieron en el mismo PR.
- Los objetos de página (`e2e/paginas/`) hicieron que los E2E fueran cortos y
  fáciles de revisar.

### Qué no funcionó

| Problema | Efecto | Cómo se resolvió |
|---|---|---|
| En el #32 los archivos se subieron a la raíz del repo y no a `Frontend-SignBridge/` | Los tests no corrían | Se pidieron cambios, se movieron y se aprobó |
| El #35 se fusionó a `main` en vez de `develop` | `main` y `develop` quedaron distintos | #37 (`main` → `develop`) y #38 (`develop` → `main`); no se hizo revert para no perder 75 commits |
| La retroalimentación del instructor analizó `main` antes del #38 | Se vio 0 % de pruebas en `main` | `main` quedó al día con el #38 |

### Qué cambiamos para la S7

1. Antes de crear un PR, revisar que la base sea **`develop`**.
2. `main` protegida con ruleset: solo entra por PR aprobado y con el CI en verde.
3. El paso de `develop` a `main` lo hace una sola persona en el release.
4. Revisar en **Files changed** que las rutas sean las correctas antes de aprobar.

---

## Lo que se repitió en las dos semanas

- Los problemas fueron de **proceso** (ramas, aprobaciones, rutas), no de los
  tests: todos los tests que se subieron pasaron.
- Cada problema se corrigió con un PR propio, sin reescribir el historial.
