"""
Servicio de correo — Sign Bridge
Usa aiosmtplib + Mailtrap (sandbox) o SMTP real según .env
"""
from __future__ import annotations

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Plantilla base
# ─────────────────────────────────────────────────────────────────────────────

def _base_template(title: str, body_html: str) -> str:
    """
    Envuelve el contenido en una plantilla HTML responsiva con identidad
    visual de Sign Bridge (azul #1E40AF, tipografía sans-serif).
    """
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#F3F4F6;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Contenedor principal -->
        <table width="600" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;
                      box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1E40AF;padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:800;color:#ffffff;
                           letter-spacing:-0.5px;">
                🤟 Sign Bridge
              </span>
              <p style="margin:6px 0 0;color:#BFDBFE;font-size:13px;font-weight:400;">
                Lengua de Señas Colombiana · Conectando comunidades
              </p>
            </td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding:36px 40px 28px;">
              {body_html}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9FAFB;padding:20px 40px;border-top:1px solid #E5E7EB;
                       text-align:center;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">
                Este mensaje fue generado automáticamente por
                <strong style="color:#6B7280;">Sign Bridge</strong>.
                Por favor no respondas a este correo.<br/>
                ¿Tienes dudas? Escríbenos a
                <a href="mailto:signbridge@sena.edu.co"
                   style="color:#1E40AF;text-decoration:none;">
                  signbridge@sena.edu.co
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _btn(label: str, url: str) -> str:
    """Genera un botón CTA en HTML."""
    return f"""
<table cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
  <tr>
    <td align="center"
        style="background:#1E40AF;border-radius:8px;padding:0;">
      <a href="{url}"
         style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;
                color:#ffffff;text-decoration:none;border-radius:8px;
                letter-spacing:0.2px;">
        {label}
      </a>
    </td>
  </tr>
</table>"""


# ─────────────────────────────────────────────────────────────────────────────
# Envío genérico
# ─────────────────────────────────────────────────────────────────────────────

async def _send(to_email: str, subject: str, html_body: str) -> None:
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"]    = f"Sign Bridge <{settings.MAIL_FROM}>"
    message["To"]      = to_email
    message.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        await aiosmtplib.send(
            message,
            hostname  = settings.MAIL_SERVER,
            port      = settings.MAIL_PORT,
            username  = settings.MAIL_USERNAME,
            password  = settings.MAIL_PASSWORD,
            start_tls = True,
        )
        logger.info("Correo enviado a %s — asunto: %s", to_email, subject)
    except Exception as exc:
        logger.error("Error al enviar correo a %s: %s", to_email, exc)
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Plantilla: Bienvenida / Confirmación de registro
# ─────────────────────────────────────────────────────────────────────────────

async def send_welcome_email(to_email: str, first_name: str) -> None:
    """Envía correo de bienvenida tras el registro exitoso."""
    dashboard_link = f"{settings.FRONTEND_URL}/dashboard"

    body = f"""
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">
  ¡Bienvenido/a a Sign Bridge, {first_name}! 🎉
</h2>
<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
  Tu cuenta ha sido creada exitosamente. Ya puedes acceder a la plataforma
  y comenzar a usar todas las herramientas de traducción en
  <strong>Lengua de Señas Colombiana (LSC)</strong>.
</p>

<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#EFF6FF;border-radius:8px;padding:16px 20px;
              margin-bottom:20px;">
  <tr>
    <td>
      <p style="margin:0;font-size:14px;color:#1E40AF;font-weight:600;">
        ¿Qué puedes hacer en Sign Bridge?
      </p>
      <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#374151;line-height:1.8;">
        <li>Traducir texto y voz a señas LSC</li>
        <li>Guardar tus palabras favoritas</li>
        <li>Revisar tu historial de traducciones</li>
        <li>Comunicarte con otros usuarios</li>
      </ul>
    </td>
  </tr>
</table>

{_btn("Ir a mi panel", dashboard_link)}

<p style="margin:0;font-size:13px;color:#6B7280;">
  Si no creaste esta cuenta, contáctanos de inmediato en
  <a href="mailto:signbridge@sena.edu.co" style="color:#1E40AF;">
    signbridge@sena.edu.co
  </a>.
</p>"""

    html = _base_template("Bienvenido/a a Sign Bridge", body)
    await _send(to_email, "🤟 Bienvenido/a a Sign Bridge", html)


# ─────────────────────────────────────────────────────────────────────────────
# Plantilla: Recuperación de contraseña
# ─────────────────────────────────────────────────────────────────────────────

async def send_reset_email(to_email: str, reset_token: str) -> None:
    """Envía correo de recuperación de contraseña."""
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    body = f"""
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">
  Restablecer contraseña
</h2>
<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
  Recibimos una solicitud para restablecer la contraseña de tu cuenta en
  <strong>Sign Bridge</strong>. Haz clic en el botón para continuar.
</p>

<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#FEF3C7;border-left:4px solid #F59E0B;
              border-radius:4px;padding:12px 16px;margin-bottom:20px;">
  <tr>
    <td>
      <p style="margin:0;font-size:13px;color:#92400E;">
        ⏱ <strong>Este enlace expira en 1 hora.</strong>
        Si no lo usas, tu contraseña no cambiará.
      </p>
    </td>
  </tr>
</table>

{_btn("Restablecer mi contraseña", reset_link)}

<p style="margin:16px 0 0;font-size:13px;color:#6B7280;word-break:break-all;">
  O copia y pega este enlace en tu navegador:<br/>
  <a href="{reset_link}" style="color:#1E40AF;">{reset_link}</a>
</p>

<p style="margin:16px 0 0;font-size:13px;color:#6B7280;">
  Si no solicitaste este cambio, ignora este mensaje.
  Tu contraseña actual sigue siendo válida.
</p>"""

    html = _base_template("Restablecer contraseña — Sign Bridge", body)
    await _send(to_email, "🔒 Restablecer contraseña — Sign Bridge", html)


# ─────────────────────────────────────────────────────────────────────────────
# Plantilla: Ticket de soporte resuelto
#
# Punto de corrección: "solo poder darle resuelto al ticket si se le da una
# retroalimentación (el usuario debe poder recibir una notificación)".
# La validación de que la solución sea obligatoria vive en SupportStatusUpdate;
# esto es la segunda mitad: avisarle al usuario.
# ─────────────────────────────────────────────────────────────────────────────

async def send_ticket_resolved_email(
    to_email: str,
    first_name: str,
    subject_ticket: str,
    solution: str,
) -> None:
    """Avisa al usuario que Soporte resolvió su ticket e incluye la solución."""
    panel_link = f"{settings.FRONTEND_URL}/dashboard"

    # Escapar el contenido: asunto y solución los escribe una persona y van
    # dentro de HTML, así que no pueden inyectarse etiquetas.
    from html import escape
    asunto_seguro   = escape(subject_ticket)
    solucion_segura = escape(solution).replace("\n", "<br>")

    body = f"""
<h2 style="margin:0 0 8px;font-size:22px;color:#111827;">
  Tu ticket fue resuelto ✅
</h2>
<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
  Hola {escape(first_name)}, el equipo de Soporte de <strong>Sign Bridge</strong>
  atendió tu solicitud y la marcó como resuelta.
</p>

<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#F3F4F6;border-radius:8px;padding:16px 20px;
              margin-bottom:16px;">
  <tr>
    <td>
      <p style="margin:0 0 4px;font-size:13px;color:#6B7280;font-weight:600;
                text-transform:uppercase;letter-spacing:0.5px;">
        Tu solicitud
      </p>
      <p style="margin:0;font-size:15px;color:#111827;">{asunto_seguro}</p>
    </td>
  </tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#ECFDF5;border-left:4px solid #059669;border-radius:8px;
              padding:16px 20px;margin-bottom:20px;">
  <tr>
    <td>
      <p style="margin:0 0 6px;font-size:13px;color:#047857;font-weight:600;
                text-transform:uppercase;letter-spacing:0.5px;">
        Respuesta de Soporte
      </p>
      <p style="margin:0;font-size:15px;color:#065F46;line-height:1.6;">
        {solucion_segura}
      </p>
    </td>
  </tr>
</table>

{_btn("Ver mis tickets", panel_link)}

<p style="margin:0;font-size:13px;color:#6B7280;">
  Si el problema continúa, puedes abrir un nuevo ticket desde tu panel.
</p>"""

    html = _base_template("Tu ticket fue resuelto", body)
    await _send(to_email, "✅ Tu ticket en Sign Bridge fue resuelto", html)
