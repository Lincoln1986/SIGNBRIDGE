#!/usr/bin/env bash
# ==============================================================================
# SignBridge — levanta todo con un solo comando
#
#   bash start.sh            prepara el .env (si falta) y levanta el stack
#   bash start.sh --limpio   borra la base de datos y empieza de cero
#   bash start.sh --parar    detiene los contenedores (conserva los datos)
#
# Funciona en Linux, Mac y en Windows con Git Bash o WSL.
# ==============================================================================
set -euo pipefail

cd "$(dirname "$0")"

CLAVE_DE_EJEMPLO="cambia_esto_por_una_clave_aleatoria_larga"
ESPERA_MAXIMA=600   # segundos; la primera construcción puede tardar varios minutos

ok()    { printf '\033[32m✔\033[0m %s\n' "$1"; }
aviso() { printf '\033[33m!\033[0m %s\n' "$1"; }
error() { printf '\033[31m✘ %s\033[0m\n' "$1" >&2; exit 1; }

# ── 1. Docker instalado y encendido ──────────────────────────────────────────
command -v docker >/dev/null 2>&1 || error "No se encontró Docker. Instala Docker Desktop (o Docker Engine) y vuelve a intentar."
docker compose version >/dev/null 2>&1 || error "No se encontró 'docker compose'. Actualiza Docker."
docker info >/dev/null 2>&1 || error "Docker no está corriendo. Abre Docker Desktop y espera a que diga 'running'."
ok "Docker está listo"

# ── Opciones ─────────────────────────────────────────────────────────────────
case "${1:-}" in
  --parar)
    docker compose down
    ok "Contenedores detenidos (los datos se conservan)"
    exit 0
    ;;
  --limpio)
    aviso "Se borra la base de datos y se empieza de cero"
    docker compose down -v
    ;;
  "") ;;
  *) error "Opción desconocida: $1  (usa --limpio o --parar)" ;;
esac

# ── 2. Archivo .env con una SECRET_KEY propia ────────────────────────────────
generar_clave() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import secrets; print(secrets.token_hex(32))"
  else
    LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c 64
  fi
}

if [ ! -f .env ]; then
  cp .env.example .env
  ok "Se creó el archivo .env a partir de .env.example"
fi

if grep -q "^SECRET_KEY=${CLAVE_DE_EJEMPLO}" .env || grep -q "^SECRET_KEY=$" .env; then
  clave="$(generar_clave)"
  # awk en vez de "sed -i": funciona igual en Linux, Mac y Git Bash.
  awk -v clave="$clave" '/^SECRET_KEY=/ { print "SECRET_KEY=" clave; next } { print }' .env > .env.tmp
  mv .env.tmp .env
  ok "Se generó una SECRET_KEY propia en el .env (no se sube al repo)"
else
  ok "El .env ya tiene su propia SECRET_KEY"
fi

# Puertos del .env (o los de siempre si no están).
leer_env() { grep -E "^$1=" .env | tail -n 1 | cut -d= -f2- | tr -d '\r'; }
PUERTO_BACKEND="$(leer_env BACKEND_PORT)";  PUERTO_BACKEND="${PUERTO_BACKEND:-8000}"
PUERTO_FRONTEND="$(leer_env FRONTEND_PORT)"; PUERTO_FRONTEND="${PUERTO_FRONTEND:-5173}"

# ── 3. Construir y levantar ──────────────────────────────────────────────────
echo "Construyendo y levantando los contenedores (la primera vez tarda varios minutos)..."
docker compose up -d --build

# ── 4. Esperar a que todo esté sano ──────────────────────────────────────────
# docker compose ya espera a postgres antes del backend y al backend antes del
# frontend; aquí se espera a que el frontend termine de arrancar.
esta_sano() {
  local estado
  estado="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null || true)"
  [ "$estado" = "healthy" ]
}

printf 'Esperando a que los servicios estén sanos'
inicio=$(date +%s)
until esta_sano signbridge_postgres && esta_sano signbridge_backend && esta_sano signbridge_frontend; do
  if [ $(( $(date +%s) - inicio )) -ge "$ESPERA_MAXIMA" ]; then
    echo
    docker compose ps
    error "Pasaron $ESPERA_MAXIMA s y algún servicio no está sano. Revisa: docker compose logs backend"
  fi
  printf '.'
  sleep 3
done
echo
ok "postgres, backend y frontend están sanos ($(( $(date +%s) - inicio )) s)"

# ── 5. Listo ─────────────────────────────────────────────────────────────────
echo
echo "  Aplicación         http://localhost:${PUERTO_FRONTEND}"
echo "  Estado del backend http://localhost:${PUERTO_BACKEND}/health"
if grep -q "^DOCS_HABILITADOS=true" .env; then
  echo "  API (Swagger)      http://localhost:${PUERTO_BACKEND}/docs"
fi
echo
echo "  Ver logs:  docker compose logs -f backend"
echo "  Detener:   bash start.sh --parar"
