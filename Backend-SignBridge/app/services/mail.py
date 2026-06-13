import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import get_settings

settings = get_settings()


async def send_reset_email(to_email: str, reset_token: str) -> None:
    """Envía correo de recuperación de contraseña vía Mailtrap."""
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    html_body = f"""
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #2563eb;">Sign Bridge — Recuperación de contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el botón para continuar (el enlace expira en <strong>15 minutos</strong>):</p>
        <a href="{reset_link}"
           style="display:inline-block;padding:12px 24px;background:#2563eb;
                  color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">
          Restablecer contraseña
        </a>
        <p style="color:#666;font-size:12px;">
          Si no solicitaste esto, ignora este mensaje.<br>
          Enlace directo: {reset_link}
        </p>
      </body>
    </html>
    """

    message = MIMEMultipart("alternative")
    message["Subject"] = "Sign Bridge – Restablecer contraseña"
    message["From"]    = settings.MAIL_FROM
    message["To"]      = to_email
    message.attach(MIMEText(html_body, "html"))

    await aiosmtplib.send(
        message,
        hostname=settings.MAIL_SERVER,
        port=settings.MAIL_PORT,
        username=settings.MAIL_USERNAME,
        password=settings.MAIL_PASSWORD,
        start_tls=True,
    )
