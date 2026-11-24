# Colección de Postman — SignBridge

21 peticiones con 28 validaciones sobre la API real: salud, registro e inicio
de sesión, seguridad (401/403), traducción, vocabulario, tickets, favoritos y
valoraciones. Cada petición revisa el código de estado y, cuando aplica, el
cuerpo de la respuesta.

| Archivo | Qué es |
|---|---|
| `SignBridge.postman_collection.json` | La colección |
| `local.postman_environment.json` | Variables: `baseUrl` (http://localhost:8000), y `email`, `token` y `ticket`, que la colección llena sola |

## Correrla

**En Postman:** *Import* → los dos archivos → elegir el entorno *SignBridge local* → *Run collection*.

**Con Newman (terminal), con la API corriendo en el puerto 8000:**

```bash
npx newman@6.2.1 run postman/SignBridge.postman_collection.json -e postman/local.postman_environment.json
```

Cada corrida registra un usuario nuevo (`newman_<hora>@example.com`), así que
se puede repetir sin limpiar la base.

## En el CI

El job **Database Integration** levanta la API contra PostgreSQL y corre esta
colección. El reporte queda como artefacto `newman-report`.
