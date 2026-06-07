from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


# ── Registro ─────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    first_name: str
    middle_name: Optional[str] = None
    last_name: str
    second_last_name: Optional[str] = None
    phone: str
    address: Optional[str] = None
    city: Optional[str] = None
    email: EmailStr
    password: str
    id_region: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


# ── Login ─────────────────────────────────────────────────────────────────────

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    full_name: str


# ── Recuperación de contraseña ────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


# ── Perfil de usuario ─────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    id_user: str
    full_name: str
    email: str
    role: str
    region: Optional[str] = None
    phone: str
    city: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Dashboard Admin ───────────────────────────────────────────────────────────

class AdminDashboardRow(BaseModel):
    full_name: str
    email: str
    role_name: str
    region: str
    total_translations: int
    support_tickets: int
    feedback_count: int

    model_config = {"from_attributes": True}


# ── Dashboard Usuario ─────────────────────────────────────────────────────────

class UserDashboardRow(BaseModel):
    full_name: str
    email: str
    translations_made: int
    favorite_words: int
    average_rating: float
    support_requests: int

    model_config = {"from_attributes": True}


# ── Estadísticas del sistema ──────────────────────────────────────────────────

class SystemStats(BaseModel):
    total_users: int
    total_translations: int
    total_support_requests: int
    total_feedback: int
    average_rating: Optional[float]

    model_config = {"from_attributes": True}
