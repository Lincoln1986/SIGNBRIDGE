"""Dobles de prueba para el correo y los avisos in-app (S5).

Autor: @Sebas-p-s · S5 (capa API)

Ningún test manda un correo real: `aiosmtplib.send` se reemplaza por un
doble (AsyncMock) y se revisa CÓMO lo llamaron y CUÁNDO no debían llamarlo.
"""
import asyncio
import uuid
from unittest.mock import AsyncMock

import jwt
import pytest

from app.models.user import Notification, Support
from app.services import mail
from app.services.notificaciones import (
    TIPO_TICKET_RESUELTO,
    crear_notificacion,
    notificar_respuesta_valoracion,
    notificar_ticket_resuelto,
)


def _id_del_token(token: str) -> str:
    """El `sub` del JWT es el id del usuario que creó make_token."""
    return jwt.decode(token, options={"verify_signature": False})["sub"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def smtp_falso(monkeypatch):
    """Reemplaza el envío SMTP por un doble que registra las llamadas."""
    doble = AsyncMock(return_value=None)
    monkeypatch.setattr(mail.aiosmtplib, "send", doble)
    return doble


# ─── services/mail.py ────────────────────────────────────────────────────────

def test_should_send_the_welcome_email_with_the_dashboard_link(smtp_falso):
    # Act
    asyncio.run(mail.send_welcome_email("ana@example.com", "Ana"))

    # Assert
    smtp_falso.assert_awaited_once()
    mensaje = smtp_falso.await_args.args[0]
    assert mensaje["To"] == "ana@example.com"
    assert "Bienvenido" in mensaje["Subject"]
    html = mensaje.get_payload()[0].get_payload(decode=True).decode()
    assert "Ana" in html
    assert "/dashboard" in html


def test_should_send_the_reset_email_with_the_token_in_the_link(smtp_falso):
    asyncio.run(mail.send_reset_email("ana@example.com", "token-123"))

    html = smtp_falso.await_args.args[0].get_payload()[0].get_payload(decode=True).decode()
    assert "reset-password?token=token-123" in html


def test_should_use_the_smtp_settings_and_start_tls(smtp_falso):
    asyncio.run(mail.send_welcome_email("ana@example.com", "Ana"))

    kwargs = smtp_falso.await_args.kwargs
    assert kwargs["hostname"] == mail.settings.MAIL_SERVER
    assert kwargs["port"] == mail.settings.MAIL_PORT
    assert kwargs["start_tls"] is True


def test_should_escape_html_in_the_resolved_ticket_email(smtp_falso):
    # Arrange: asunto y solución los escribe una persona
    asyncio.run(mail.send_ticket_resolved_email(
        "ana@example.com", "Ana", "<script>x</script>", "Línea 1\nLínea 2"
    ))

    html = smtp_falso.await_args.args[0].get_payload()[0].get_payload(decode=True).decode()
    assert "<script>x</script>" not in html
    assert "&lt;script&gt;" in html
    assert "Línea 1<br>Línea 2" in html


def test_should_raise_when_the_smtp_server_fails(monkeypatch):
    monkeypatch.setattr(
        mail.aiosmtplib, "send", AsyncMock(side_effect=OSError("sin conexión"))
    )

    with pytest.raises(OSError):
        asyncio.run(mail.send_reset_email("ana@example.com", "token"))


# ─── services/notificaciones.py ─────────────────────────────────────────────

def test_should_not_duplicate_a_notification_for_the_same_reference(db, make_token):
    # Arrange
    id_user = _id_del_token(make_token("Cliente"))

    # Act: Soporte guarda dos veces el mismo ticket
    primero = notificar_ticket_resuelto(db, id_user, "ticket-1", "Video", "Listo")
    segundo = notificar_ticket_resuelto(db, id_user, "ticket-1", "Video", "Listo")

    # Assert
    assert primero.id_notification == segundo.id_notification
    assert db.query(Notification).filter_by(id_user=id_user).count() == 1


def test_should_create_the_feedback_answer_notification(db, make_token):
    id_user = _id_del_token(make_token("Cliente"))

    aviso = notificar_respuesta_valoracion(db, id_user, "fb-1", "Gracias")

    assert aviso.type == "feedback_answered"
    assert aviso.body == "Gracias"


def test_should_return_none_and_rollback_when_the_insert_fails(db, make_token, monkeypatch):
    # Arrange: el commit falla (por ejemplo, la BD se cae)
    id_user = _id_del_token(make_token("Cliente"))
    rollback = []
    monkeypatch.setattr(db, "commit", lambda: (_ for _ in ()).throw(RuntimeError("caída")))
    monkeypatch.setattr(db, "rollback", lambda: rollback.append(True))

    # Act
    aviso = crear_notificacion(db, id_user, TIPO_TICKET_RESUELTO, "Título")

    # Assert: no rompe la operación que lo originó
    assert aviso is None
    assert rollback == [True]


# ─── PATCH /support/{id}/status: el correo se manda solo cuando toca ─────────

@pytest.fixture()
def ticket_pendiente(db, make_token):
    token_cliente = make_token("Cliente")
    ticket = Support(
        id_support=str(uuid.uuid4()),
        id_user=_id_del_token(token_cliente),
        subject="No carga el video",
        message="La seña de Hola no aparece",
        status="pending",
    )
    db.add(ticket)
    db.commit()
    return {"id": ticket.id_support, "token_cliente": token_cliente}


def test_should_email_the_owner_only_the_first_time_it_is_resolved(
    client, make_token, ticket_pendiente, monkeypatch
):
    # Arrange
    correo = AsyncMock(return_value=None)
    monkeypatch.setattr("app.routers.support.send_ticket_resolved_email", correo)
    soporte = _auth(make_token("Soporte"))
    url = f"/support/{ticket_pendiente['id']}/status"
    cuerpo = {"status": "resolved", "solution": "Se subió el video"}

    # Act: se guarda dos veces como resuelto
    primera = client.patch(url, json=cuerpo, headers=soporte)
    segunda = client.patch(url, json=cuerpo, headers=soporte)

    # Assert
    assert primera.status_code == 200
    assert segunda.status_code == 200
    correo.assert_awaited_once()
    assert correo.await_args.kwargs["solution"] == "Se subió el video"


def test_should_not_email_when_the_ticket_only_moves_to_in_progress(
    client, make_token, ticket_pendiente, monkeypatch
):
    correo = AsyncMock()
    monkeypatch.setattr("app.routers.support.send_ticket_resolved_email", correo)

    respuesta = client.patch(
        f"/support/{ticket_pendiente['id']}/status",
        json={"status": "in_progress"},
        headers=_auth(make_token("Soporte")),
    )

    assert respuesta.status_code == 200
    correo.assert_not_awaited()


def test_should_resolve_the_ticket_even_if_the_email_fails(
    client, make_token, ticket_pendiente, monkeypatch
):
    # Arrange: el SMTP está caído
    monkeypatch.setattr(
        "app.routers.support.send_ticket_resolved_email",
        AsyncMock(side_effect=OSError("SMTP caído")),
    )

    # Act
    respuesta = client.patch(
        f"/support/{ticket_pendiente['id']}/status",
        json={"status": "resolved", "solution": "Listo"},
        headers=_auth(make_token("Soporte")),
    )

    # Assert: el ticket queda resuelto y el aviso in-app sí se crea
    assert respuesta.status_code == 200
    assert respuesta.json()["status"] == "resolved"
    avisos = client.get("/notifications", headers=_auth(ticket_pendiente["token_cliente"]))
    assert [a["type"] for a in avisos.json()] == [TIPO_TICKET_RESUELTO]


def test_should_return_404_when_the_ticket_does_not_exist(client, make_token):
    respuesta = client.patch(
        "/support/no-existe/status",
        json={"status": "closed"},
        headers=_auth(make_token("Soporte")),
    )

    assert respuesta.status_code == 404


# ─── /notifications: cada usuario solo ve y toca las suyas ──────────────────

@pytest.fixture()
def dos_avisos(db, make_token):
    token = make_token("Cliente")
    id_user = _id_del_token(token)
    a = crear_notificacion(db, id_user, TIPO_TICKET_RESUELTO, "Uno", reference_id="r1")
    b = crear_notificacion(db, id_user, TIPO_TICKET_RESUELTO, "Dos", reference_id="r2")
    return {"token": token, "ids": [a.id_notification, b.id_notification]}


def test_should_count_mark_one_and_mark_all_as_read(client, dos_avisos):
    h = _auth(dos_avisos["token"])

    assert client.get("/notifications/unread-count", headers=h).json() == {"unread": 2}

    leida = client.patch(f"/notifications/{dos_avisos['ids'][0]}/read", headers=h)
    assert leida.status_code == 200
    assert leida.json()["read_at"] is not None
    assert len(client.get("/notifications?solo_sin_leer=true", headers=h).json()) == 1

    todas = client.patch("/notifications/read-all", headers=h)
    assert todas.json() == {"updated": 1, "unread": 0}


def test_should_soft_delete_a_notification(client, dos_avisos):
    h = _auth(dos_avisos["token"])

    borrada = client.delete(f"/notifications/{dos_avisos['ids'][0]}", headers=h)

    assert borrada.status_code == 204
    assert len(client.get("/notifications", headers=h).json()) == 1
    assert client.delete(f"/notifications/{dos_avisos['ids'][0]}", headers=h).status_code == 404


def test_should_not_let_another_user_read_or_delete_my_notification(
    client, make_token, dos_avisos
):
    otro = _auth(make_token("Cliente"))
    id_ajeno = dos_avisos["ids"][0]

    assert client.patch(f"/notifications/{id_ajeno}/read", headers=otro).status_code == 404
    assert client.delete(f"/notifications/{id_ajeno}", headers=otro).status_code == 404
    assert client.get("/notifications", headers=otro).json() == []
