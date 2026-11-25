# Instalación desde cero — registro de la prueba

Ficha 3228973 B · Prueba de que el proyecto se instala y arranca en un equipo
limpio siguiendo **solo** el README, sin pasos extra ni SQL manual.

**Ejecutada por:** @Lincoln1986 (Allan) · **Fecha:** 25 de noviembre de 2026

## Antes de empezar

- **Docker Desktop** abierto y corriendo.
- **Git** instalado.
- **Node.js** instalado.
- Una terminal: PowerShell en Windows, o la terminal de VS Code.

## Equipo

| Dato | Valor |
|---|---|
| Sistema operativo | Ubuntu |
| Docker | Docker version 29.10.1, build c48360f |
| Docker Compose | Docker Compose version v5.8.0 |
| Commit probado | e38751f6 |

## Pasos y resultado

En *Resultado* escribe ✅ o ❌, y en *Tiempo* cuánto tardó el paso.

| # | Paso | Comando | Resultado esperado | Resultado | Tiempo |
|:-:|---|---|---|:-:|---|
| 1 | Clonar en una carpeta nueva | `git clone https://github.com/Lincoln1986/SIGNBRIDGE.git signbridge-limpio` | Carpeta `signbridge-limpio` creada | ✅ | 12 s |
| 2a | Entrar a la carpeta | `cd signbridge-limpio` | La terminal queda dentro de la carpeta | ✅ | 1 s |
| 2b | Cambiar a `develop` | `git checkout develop` | `Switched to branch 'develop'` | ✅ | 1 s |
| 3a | Crear el `.env` | `cp .env.example .env` | Archivo `.env` creado en la carpeta | ✅ | 1 s |
| 3b | Generar una clave propia | `python3 -c "import secrets; print(secrets.token_hex(32))"` | Sale una clave de 64 caracteres | ✅ | 1 s |
| 3c | Poner la clave en el `.env` | `notepad .env` → cambiar la línea `SECRET_KEY` → `Ctrl+S` | `SECRET_KEY=<la clave generada>` | ✅ | 15 s |
| 4 | Borrar restos de otras instalaciones | `docker compose down -v` | Sin contenedores ni volumen de datos | ✅ | 2 s |
| 5 | Levantar todo | `docker compose up -d --build` | Las 3 imágenes se construyen sin error (la primera vez tarda varios minutos) | ✅ | ~33 min (1977 s) |
| 6 | Revisar estados | `docker compose ps` | `postgres` y `backend` en *healthy*; `frontend` en *running* | ✅ | 1 s |
| 7 | Migraciones | `docker compose logs backend \| findstr alembic` | `Running upgrade ... -> 7b2e5c1d9a40` | ✅ | 1 s |
| 8 | Salud del backend | Abrir http://localhost:8000/health | `{"status":"healthy"}` | ✅ | 2 s |
| 9 | Documentación de la API | Abrir http://localhost:8000/docs | Swagger carga con los endpoints | ✅ | 3 s |
| 10 | Aplicación | Abrir http://localhost:5173 | Carga la página de inicio | ✅ | 4 s |
| 11 | Ruta de React | Abrir http://localhost:5173/login directo | Carga el login (no un 404 de nginx) | ✅ | 2 s |
| 12 | Registro | Registrar un usuario desde la app | Cuenta creada | ✅ | 20 s |
| 13 | Usuario sin root | `docker compose exec backend whoami` | `appuser` | ✅ | 1 s |
| 14 | Colección de Postman | `npx newman@6.2.1 run postman/SignBridge.postman_collection.json -e postman/local.postman_environment.json` | 28 validaciones, 0 fallidas | ✅ | 18 s |

### Detalle del paso 3: la `SECRET_KEY`

La `SECRET_KEY` firma los tokens de inicio de sesión. La que viene en `.env.example` (cambia_esto_por_una_clave_aleatoria_larga) es pública: con ella cualquiera podría fabricar un token válido y entrar como otro usuario. Por eso cada instalación pone la suya.

1. **3b:** el comando de Python imprime una clave aleatoria. Si no tienes Python, sirve cualquier texto largo y difícil de adivinar (más de 32 caracteres).
2. **3c:** `notepad .env` abre el archivo en el Bloc de notas. Busca la línea    `SECRET_KEY=cambia_esto_por_una_clave_aleatoria_larga`, reemplaza todo lo que va después del `=` por tu clave y guarda con `Ctrl+S`.
3. Si no ves el `.env` en el Explorador de archivos: **Vista → Mostrar → Elementos ocultos** (empieza con punto, por eso Windows lo esconde).
4. El `.env` **nunca** se sube al repo.

Si ya cambiaste las claves por el issue #42, puedes usar esa misma `SECRET_KEY`.

### Si usas Linux o Mac

- Paso 3b: `python3` en vez de `python` solo.
- Paso 3c: `nano .env` en vez de `notepad .env`.
- Paso 7: `grep alembic` en vez de `findstr alembic`.

## Evidencias

- [x] `docker compose ps` con los servicios sanos
- [x] http://localhost:8000/health
- [x] La app en http://localhost:5173
- [x] Resultado de Newman

### 1. Contenedores activos (`docker compose ps`)
![Servicios sanos en Docker](https://github.com/user-attachments/assets/234133d6-da34-4038-8e73-790a86dbf36a)

### 2. Endpoint de salud del backend (`/health`)
![Respuesta healthy del backend](https://github.com/user-attachments/assets/022887de-1348-434d-8b40-df4120201bbd)

### 3. Interfaz web en ejecución (`localhost:5173`)
![Frontend de SignBridge funcionando](https://github.com/user-attachments/assets/af1e51fc-ab06-4d8f-bd98-1e4f8040b52e)

### 4. Pruebas automatizadas de API (Newman)
![Ejecución exitosa de Newman](https://github.com/user-attachments/assets/8730e5f4-7baa-4007-af47-9323be74baa7)

## Conclusión

La instalación y despliegue local del proyecto mediante Docker se completó satisfactoriamente sin requerir pasos adicionales de SQL manual. El proceso completo tomó aproximadamente 35 minutos, concentrándose la mayor parte del tiempo (~33 minutos) en la descarga de dependencias y construcción inicial de las imágenes de Docker. Como incidencias menores durante la ejecución en Ubuntu, fue necesario utilizar `python3` en lugar de `python`, emplear `grep` en reemplazo de `findstr` y ajustar temporalmente el tiempo de espera (`UV_HTTP_TIMEOUT=300`) en el `Dockerfile` del backend para evitar cortes de red al descargar paquetes pesados como `jaxlib`.
