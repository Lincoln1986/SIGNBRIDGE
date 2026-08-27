from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.routers import auth, dashboard, traduccion
from app.routers import regions, messages, feedback, support, favorites
from app.routers import admin_users
from app.routers import notifications, word_ratings, stats

# Importar todos los modelos para registrar relaciones en SQLAlchemy
from app.models import user, session  # noqa: F401
from app.models import message as message_model  # noqa: F401

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
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:8080", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:5177"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(traduccion.router)
app.include_router(regions.router)
app.include_router(messages.router)
app.include_router(feedback.router)
app.include_router(support.router)
app.include_router(favorites.router)
app.include_router(admin_users.router)
app.include_router(notifications.router)
app.include_router(word_ratings.router)
app.include_router(stats.router)

# Aliases de dashboard con prefijos directos (GET /admin/dashboard, etc.)
from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.user import User
from app.schemas.auth import AdminDashboardRow, UserDashboardRow, SystemStats
from typing import List

@app.get("/admin/dashboard", response_model=List[AdminDashboardRow], tags=["Dashboards"])
def admin_dashboard_alias(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """GET /admin/dashboard — alias del dashboard de administrador."""
    rows = db.execute(text("SELECT * FROM vw_admin_dashboard")).mappings().all()
    return [AdminDashboardRow(
        full_name=r["full_name"], email=r["email"], role_name=r["role_name"],
        region=r["region"], total_translations=r["total_translations"] or 0,
        support_tickets=r["support_tickets"] or 0, feedback_count=r["feedback_count"] or 0,
    ) for r in rows]

@app.get("/user/dashboard", response_model=UserDashboardRow, tags=["Dashboards"])
def user_dashboard_alias(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """GET /user/dashboard — alias del dashboard de usuario."""
    from fastapi import HTTPException
    row = db.execute(
        text("SELECT * FROM vw_user_dashboard WHERE email = :email"),
        {"email": current_user.email},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Datos del usuario no encontrados")
    return UserDashboardRow(
        full_name=row["full_name"], email=row["email"],
        translations_made=row["translations_made"] or 0,
        favorite_words=row["favorite_words"] or 0,
        average_rating=float(row["average_rating"] or 0),
        support_requests=row["support_requests"] or 0,
    )

@app.get("/admin/stats", response_model=SystemStats, tags=["Dashboards"])
def admin_stats_alias(db: Session = Depends(get_db), _admin: User = Depends(require_admin)):
    """GET /admin/stats — estadísticas globales del sistema."""
    row = db.execute(text("SELECT * FROM vw_system_statistics")).mappings().first()
    return SystemStats(
        total_users=row["total_users"] or 0,
        total_translations=row["total_translations"] or 0,
        total_support_requests=row["total_support_requests"] or 0,
        total_feedback=row["total_feedback"] or 0,
        average_rating=float(row["average_rating"]) if row["average_rating"] else None,
    )


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
