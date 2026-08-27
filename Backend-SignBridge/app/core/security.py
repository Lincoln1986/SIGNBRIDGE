from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.database import get_db

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

# ── Contraseñas ──────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ── JWT ──────────────────────────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def create_reset_token(email: str) -> str:
    """Token de un solo uso para recuperación de contraseña (1 hora)."""
    return create_access_token(
        data={"sub": email, "type": "reset"},
        expires_delta=timedelta(hours=1),
    )

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

# ── Dependencias de autenticación ────────────────────────────────────────────
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    from app.models.user import User
    payload = decode_token(credentials.credentials)
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = db.query(User).filter(User.id_user == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Cuenta desactivada")
    return user

def require_admin(current_user=Depends(get_current_user)):
    """Dependencia que exige rol Administrador."""
    if current_user.role.role_name.lower() not in ("admin", "administrador"):
        raise HTTPException(status_code=403, detail="Acceso denegado: se requiere rol admin")
    return current_user

def require_support_or_admin(current_user=Depends(get_current_user)):
    """Dependencia que exige rol Soporte o Administrador (para el panel de soporte)."""
    role_name = current_user.role.role_name.lower()
    if role_name not in ("admin", "administrador", "soporte"):
        raise HTTPException(status_code=403, detail="Acceso denegado: se requiere rol soporte o admin")
    return current_user


def require_support(current_user=Depends(get_current_user)):
    """Dependencia que exige rol Soporte (exclusivo).

    El Administrador puede ver tickets y valoraciones (usa require_support_or_admin),
    pero solucionar tickets y responder valoraciones es una acción exclusiva de Soporte.
    """
    role_name = current_user.role.role_name.lower()
    if role_name not in ("soporte",):
        raise HTTPException(status_code=403, detail="Acceso denegado: esta acción es exclusiva del rol soporte")
    return current_user