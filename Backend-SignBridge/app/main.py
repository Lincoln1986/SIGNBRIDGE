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
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:8080", "http://localhost:5173"],
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
