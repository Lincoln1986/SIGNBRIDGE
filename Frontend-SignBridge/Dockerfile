# Imagen del frontend de SignBridge en dos etapas:
#   1. build → Node 22 + pnpm compila la app con `pnpm build` (TypeScript + Vite).
#   2. web   → nginx sin privilegios sirve solo los archivos compilados (dist/).
# La imagen final no trae Node, ni node_modules, ni el código fuente.

# ── 1. Compilación ───────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

# pnpm en la versión exacta de "packageManager" (package.json).
RUN corepack enable

# Primero solo las dependencias: si no cambia el lockfile, se reutiliza la capa.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ── 2. Servidor web ──────────────────────────────────────────────────────────
# nginx-unprivileged corre con el usuario "nginx" (no root) y escucha en 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS web
# Plantillas: al arrancar, nginx cambia ${BACKEND_URL} por la URL del backend
# y deja el resultado en /etc/nginx/conf.d/ (ver default.conf.template).
ENV BACKEND_URL=http://localhost:8000
COPY default.conf.template cabeceras-seguridad.inc.template /etc/nginx/templates/
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --retries=6 \
  CMD wget -q -O /dev/null http://localhost:8080/ || exit 1
