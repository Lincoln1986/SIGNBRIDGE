from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Base de datos
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Mailtrap SMTP
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: str
    MAIL_SERVER: str = "sandbox.smtp.mailtrap.io"
    MAIL_PORT: int = 587

    # App
    APP_NAME: str = "Sign_Bridge"
    # Puerto de Vite (pnpm dev) y del frontend en Docker. Antes era 3000: el
    # navegador bloqueaba por CORS el frontend local y los enlaces de los
    # correos (recuperar contraseña) apuntaban a un puerto donde no hay nada.
    FRONTEND_URL: str = "http://localhost:5173"

    # Swagger (/docs, /redoc y /openapi.json). En local sirve para probar la
    # API; en un servidor público le entrega el mapa de la API a un atacante
    # (OWASP A05). docker-compose lo deja apagado salvo que el .env diga true.
    DOCS_HABILITADOS: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
