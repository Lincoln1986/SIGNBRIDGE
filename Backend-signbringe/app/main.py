from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import auth, dashboard
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import auth, dashboard

# Importar todos los modelos para registrar relaciones en SQLAlchemy
from app.models import user, session  # noqa: F401
settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="API REST para la aplicación de traducción de lenguaje de señas Sign Bridge.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(dashboard.router)


# ── Healthcheck ───────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    return {"status": "ok", "app": settings.APP_NAME, "version": "1.0.0"}


@app.get("/health", tags=["Root"])
def health():
    return {"status": "healthy"}


@app.get("/info", tags=["Root"])
def info():
    """
    Información pública del proyecto para la landing page.
    No requiere autenticación.
    """
    return {
        "name": "Sign Bridge",
        "description": (
            "Plataforma de traducción entre lenguaje hablado/escrito y "
            "Lengua de Señas Colombiana (LSC). Conectamos a personas oyentes "
            "con la comunidad sorda mediante tecnología de traducción en tiempo real."
        ),
        "features": [
            "Traducción de texto a Lengua de Señas Colombiana",
            "Videoteca de señas grabadas por expertos",
            "Avatar animado para visualización de señas",
            "Panel de administración y estadísticas",
            "Historial de traducciones por usuario",
        ],
        "version": "1.0.0",
        "contact": "signbridge@sena.edu.co",
    }
