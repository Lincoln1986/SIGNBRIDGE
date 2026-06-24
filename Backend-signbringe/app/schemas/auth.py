# app/schemas/auth.py
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re


# ── Registro ──────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    first_name:       str
    middle_name:      Optional[str] = None
    last_name:        str
    second_last_name: Optional[str] = None
    phone:            str
    city:             str
    address:          str
    id_region:        Optional[str] = None
    email:            EmailStr
    password:         str

    @field_validator('first_name', 'last_name')
    @classmethod
    def capitalize_and_strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Este campo es obligatorio')
        return re.sub(r'(^|\s)\S', lambda m: m.group().upper(), v)

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        digits = re.sub(r'\D', '', v)
        if len(digits) != 10:
            raise ValueError('El teléfono debe tener exactamente 10 dígitos')
        if not digits.startswith('3'):
            raise ValueError('El teléfono colombiano debe empezar con 3')
        return digits

    @field_validator('address')
    @classmethod
    def validate_address(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('La dirección es obligatoria')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        return v


# ── Login ─────────────────────────────────────────────────────────────────────

class UserLogin(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    role:         str
    user_id:      str
    full_name:    str


# ── Perfil ────────────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    id_user:   str
    full_name: str
    email:     str
    role:      str
    region:    Optional[str] = None
    phone:     Optional[str] = None
    city:      Optional[str] = None


# ── Password recovery ─────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token:        str
    new_password: str


# ── Dashboard ─────────────────────────────────────────────────────────────────

class AdminDashboardRow(BaseModel):
    full_name:          str
    email:              str
    role_name:          str
    region:             Optional[str] = None
    total_translations: int = 0
    support_tickets:    int = 0
    feedback_count:     int = 0


class UserDashboardRow(BaseModel):
    full_name:         str
    email:             str
    translations_made: int   = 0
    favorite_words:    int   = 0
    average_rating:    float = 0.0
    support_requests:  int   = 0


class SystemStats(BaseModel):
    total_users:            int
    total_translations:     int
    total_support_requests: int
    total_feedback:         int
    average_rating:         Optional[float] = None


# ── Vocabulario ───────────────────────────────────────────────────────────────

class LexicalUnitOut(BaseModel):
    id_lexicalunit: str
    text:           str
    language:       str
    video_url:      Optional[str] = None
    created_at:     Optional[datetime] = None
    updated_at:     Optional[datetime] = None

    model_config = {"from_attributes": True}


class LexicalUnitCreate(BaseModel):
    text:      str
    language:  str = "es_Co"
    video_url: Optional[str] = None


class LexicalUnitVideoUpdate(BaseModel):
    video_url: str

# ── Gestión de usuarios (admin) ───────────────────────────────────────────────

class UserAdminRow(BaseModel):
    id_user:   str
    full_name: str
    email:     str
    role_name: str
    region:    Optional[str] = None

    model_config = {"from_attributes": True}


class UserRoleUpdate(BaseModel):
    role_name: str