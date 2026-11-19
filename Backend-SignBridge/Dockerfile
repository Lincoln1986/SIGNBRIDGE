FROM python:3.11-slim

# uv (Astral) como gestor de paquetes: instala desde uv.lock de forma determinista.
COPY --from=ghcr.io/astral-sh/uv:0.12.24 /uv /uvx /bin/

WORKDIR /app

# Librerías del sistema que necesita MediaPipe para importarse.
#
# Sin ellas el paquete se instala bien con pip pero falla al importar con
# "libGL.so.1: cannot open shared object file". Como el import está dentro de
# un try/except, la aplicación arranca igual y la detección de señas cae en
# silencio al modo simulado, que es difícil de diagnosticar.
#
#   libgl1          → OpenGL, que usa OpenCV (dependencia de MediaPipe)
#   libglib2.0-0    → GLib, requerida por el mismo OpenCV
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libgl1 \
      libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . .
ENV UV_COMPILE_BYTECODE=1
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
