# Imagen del backend de SignBridge (FastAPI + uv).
# - Python 3.12: la misma versión que usa el CI.
# - Corre con un usuario sin privilegios (no root).
# - El entorno virtual vive en /opt/venv, fuera de /app, para que el volumen
#   de desarrollo de docker-compose (./Backend-SignBridge:/app) no lo tape.
FROM python:3.12-slim

# uv (Astral) como gestor de paquetes: instala desde uv.lock de forma determinista.
COPY --from=ghcr.io/astral-sh/uv:0.12.24 /uv /uvx /bin/

# Librerías del sistema que necesita MediaPipe para importarse.
#   libgl1        → OpenGL, que usa OpenCV (dependencia de MediaPipe)
#   libglib2.0-0  → GLib, requerida por el mismo OpenCV
# Sin ellas el import falla con "libGL.so.1" y la detección cae en silencio
# al modo simulado.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Primero solo las dependencias: si no cambia uv.lock, Docker reutiliza esta capa.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .

# Usuario sin privilegios. Si alguien entra al contenedor, no es root.
RUN useradd --create-home --uid 1000 appuser \
 && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3)"

# Aplica las migraciones de Alembic y arranca la API.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-server-header"]
