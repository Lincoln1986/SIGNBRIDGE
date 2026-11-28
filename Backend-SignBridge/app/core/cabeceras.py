"""Cabeceras de seguridad para todas las respuestas de la API (OWASP A05).

La API solo devuelve JSON, PDF y videos; nunca páginas que deban mostrarse
dentro de otro sitio. Estas cabeceras le dicen al navegador que no adivine
tipos de archivo, que no meta la API en un <iframe> y que no mande la URL
completa a otros sitios.

Las cabeceras de la aplicación web (CSP, cámara, micrófono) las pone nginx en
Frontend-SignBridge/nginx.conf, porque es nginx quien sirve las páginas.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

CABECERAS = {
    # No adivinar el tipo: un .txt subido no se ejecuta como script.
    "X-Content-Type-Options": "nosniff",
    # Nadie puede cargar la API dentro de un iframe (clickjacking).
    "X-Frame-Options": "DENY",
    # La API no sirve HTML: no se permite cargar nada desde sus respuestas.
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    # Al salir hacia otro sitio, solo se envía el dominio, no la ruta.
    "Referrer-Policy": "strict-origin-when-cross-origin",
}

# Swagger sí es una página HTML con scripts: con "default-src 'none'" se vería
# en blanco. Solo se le quita la CSP (y solo existe si DOCS_HABILITADOS=true).
RUTAS_DOCUMENTACION = ("/docs", "/redoc")


class CabecerasSeguridadMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        respuesta = await call_next(request)
        for nombre, valor in CABECERAS.items():
            if nombre == "Content-Security-Policy" and request.url.path.startswith(RUTAS_DOCUMENTACION):
                continue
            respuesta.headers.setdefault(nombre, valor)
        return respuesta
