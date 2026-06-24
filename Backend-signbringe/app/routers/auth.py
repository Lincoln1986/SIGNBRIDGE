from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
import uuid

from app.core.database import get_db
from app.core.security import (
    hash_password, verify_password,
    create_access_token, create_reset_token,
    decode_token, get_current_user,
)
from app.models.user import User, Role
from app.schemas.auth import (
    UserRegister, UserLogin, TokenResponse,
    ForgotPasswordRequest, ResetPasswordRequest, UserProfile,
)
from app.services.mail import send_reset_email

router = APIRouter(prefix="/auth", tags=["Autenticación"])


# ── Registro ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")

    # Asignar rol 'usuario' / 'Cliente' por defecto
    default_role = (
        db.query(Role)
        .filter(Role.role_name.in_(["usuario", "Cliente", "cliente"]))
        .first()
    )
    if not default_role:
        raise HTTPException(status_code=500, detail="Rol por defecto no encontrado en BD")

    new_user = User(
        id_user       = str(uuid.uuid4()),
        id_role       = default_role.id_role,
        id_region     = payload.id_region,
        first_name    = payload.first_name,
        middle_name   = payload.middle_name,
        last_name     = payload.last_name,
        second_last_name = payload.second_last_name,
        phone         = payload.phone,
        address       = payload.address,
        city          = payload.city,
        email         = payload.email,
        password_hash = hash_password(payload.password),
    )
    db.add(new_user)

    # Log de acceso
    from app.models.session import AccessLog
    db.add(AccessLog(
        id_log      = str(uuid.uuid4()),
        id_user     = new_user.id_user,
        access_type = "login",
    ))

    db.commit()
    return {"message": "Usuario registrado exitosamente", "user_id": new_user.id_user}


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.email == payload.email,
        User.deleted_at.is_(None),
    ).first()

    from app.models.session import AccessLog

    if not user or not verify_password(payload.password, user.password_hash):
        # Log intento fallido
        if user:
            db.add(AccessLog(
                id_log      = str(uuid.uuid4()),
                id_user     = user.id_user,
                access_type = "failed_attempt",
            ))
            db.commit()
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    # Log de acceso exitoso
    db.add(AccessLog(
        id_log      = str(uuid.uuid4()),
        id_user     = user.id_user,
        access_type = "login",
    ))
    db.commit()

    token = create_access_token({"sub": user.id_user})
    full_name = f"{user.first_name} {user.last_name}"

    return TokenResponse(
        access_token = token,
        user_id      = user.id_user,
        role         = user.role.role_name,
        full_name    = full_name,
    )


# ── Perfil del usuario autenticado ────────────────────────────────────────────

@router.get("/me", response_model=UserProfile)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserProfile(
        id_user   = current_user.id_user,
        full_name = f"{current_user.first_name} {current_user.last_name}",
        email     = current_user.email,
        role      = current_user.role.role_name,
        region    = current_user.region.region_name if current_user.region else None,
        phone     = current_user.phone,
        city      = current_user.city,
    )


# ── Recuperación de contraseña ────────────────────────────────────────────────

@router.post("/forgot-password", status_code=200)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(
        User.email == payload.email,
        User.deleted_at.is_(None),
    ).first()

    if user:
        token = create_reset_token(user.email)
        await send_reset_email(user.email, token)

    return {"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"}

@router.post("/reset-password", status_code=200)
async def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    payload_data = decode_token(payload.token)

    if payload_data.get("type") != "reset":
        raise HTTPException(status_code=400, detail="Token inválido")

    email = payload_data.get("sub")
    user  = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {
        "message": "¡Contraseña actualizada exitosamente! Ya puedes iniciar sesión con tu nueva contraseña.",
        "redirect": "/login",
    }
