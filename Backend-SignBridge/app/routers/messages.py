"""
Router de mensajería — Sign Bridge
Endpoints REST + base WebSocket para tiempo real.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, decode_token
from app.models.message import Message
from app.models.user import User
from app.schemas.messages import MessageCreate, MessageOut, ConversationPreview

router = APIRouter(prefix="/messages", tags=["Mensajería"])


# ─────────────────────────────────────────────────────────────────────────────
# REST endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=MessageOut, status_code=201,
             summary="Enviar un mensaje a otro usuario")
def send_message(
    payload: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Envía un mensaje al usuario indicado en `id_receiver`.
    El remitente es el usuario autenticado.
    """
    if payload.id_receiver == current_user.id_user:
        raise HTTPException(status_code=400, detail="No puedes enviarte mensajes a ti mismo")

    receiver = db.query(User).filter(
        User.id_user == payload.id_receiver,
        User.deleted_at.is_(None),
    ).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Usuario receptor no encontrado")

    msg = Message(
        id_message  = str(uuid.uuid4()),
        id_sender   = current_user.id_user,
        id_receiver = payload.id_receiver,
        content     = payload.content,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.get("/conversation/{other_user_id}", response_model=List[MessageOut],
            summary="Historial de conversación entre dos usuarios")
def get_conversation(
    other_user_id: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve los mensajes entre el usuario autenticado y `other_user_id`,
    ordenados de más antiguo a más reciente.
    """
    me = current_user.id_user
    messages = (
        db.query(Message)
        .filter(
            or_(
                and_(Message.id_sender == me,         Message.id_receiver == other_user_id),
                and_(Message.id_sender == other_user_id, Message.id_receiver == me),
            )
        )
        .order_by(Message.created_at)
        .offset(offset)
        .limit(limit)
        .all()
    )
    return messages


@router.get("/inbox", response_model=List[ConversationPreview],
            summary="Lista de conversaciones del usuario autenticado")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Devuelve un resumen de todas las conversaciones del usuario autenticado,
    con el último mensaje y la cantidad de mensajes no leídos.
    """
    me = current_user.id_user

    # Obtener todos los interlocutores únicos
    all_messages = (
        db.query(Message)
        .filter(or_(Message.id_sender == me, Message.id_receiver == me))
        .order_by(Message.created_at.desc())
        .all()
    )

    seen: set[str] = set()
    previews: List[ConversationPreview] = []

    for msg in all_messages:
        other_id = msg.id_receiver if msg.id_sender == me else msg.id_sender
        if other_id in seen:
            continue
        seen.add(other_id)

        other_user = db.query(User).filter(User.id_user == other_id).first()
        other_name = (
            f"{other_user.first_name} {other_user.last_name}" if other_user else other_id
        )

        # Mensajes no leídos dirigidos al usuario actual de este interlocutor
        unread = (
            db.query(Message)
            .filter(
                Message.id_sender == other_id,
                Message.id_receiver == me,
                Message.read_at.is_(None),
            )
            .count()
        )

        previews.append(
            ConversationPreview(
                other_user_id   = other_id,
                other_user_name = other_name,
                last_message    = msg.content[:80] + ("…" if len(msg.content) > 80 else ""),
                last_message_at = msg.created_at,
                unread_count    = unread,
            )
        )

    return previews


@router.patch("/conversation/{other_user_id}/read", status_code=200,
              summary="Marcar como leídos los mensajes de una conversación")
def mark_as_read(
    other_user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Marca como leídos todos los mensajes enviados por `other_user_id`
    al usuario autenticado que aún no tenían `read_at`.
    """
    now = datetime.now(timezone.utc)
    updated = (
        db.query(Message)
        .filter(
            Message.id_sender   == other_user_id,
            Message.id_receiver == current_user.id_user,
            Message.read_at.is_(None),
        )
        .all()
    )
    for msg in updated:
        msg.read_at = now
    db.commit()
    return {"marked_as_read": len(updated)}


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket — base para mensajería en tiempo real
# ─────────────────────────────────────────────────────────────────────────────

class _ConnectionManager:
    """Gestiona conexiones WebSocket activas por user_id."""

    def __init__(self):
        self.active: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def send_to(self, user_id: str, data: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(user_id)


manager = _ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str, db: Session = Depends(get_db)):
    """
    WebSocket para mensajería en tiempo real.

    Conexión:  ws://host/messages/ws?token=<JWT>

    Protocolo de mensajes (JSON):
      Cliente → Servidor:
        { "to": "<id_receiver>", "content": "<texto>" }

      Servidor → Cliente (mensaje entrante):
        { "event": "new_message", "from": "<id_sender>",
          "content": "<texto>", "id_message": "...", "created_at": "..." }

      Servidor → Cliente (confirmación de envío):
        { "event": "sent", "id_message": "...", "to": "<id_receiver>" }

      Servidor → Cliente (error):
        { "event": "error", "detail": "<descripción>" }
    """
    # Autenticar via token en query string
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        current_user = db.query(User).filter(
            User.id_user == user_id, User.deleted_at.is_(None)
        ).first()
        if not current_user:
            await ws.close(code=4001)
            return
    except Exception:
        await ws.close(code=4001)
        return

    await manager.connect(user_id, ws)
    try:
        while True:
            data = await ws.receive_json()
            to_id  = data.get("to", "").strip()
            content = data.get("content", "").strip()

            if not to_id or not content:
                await ws.send_json({"event": "error", "detail": "Faltan campos 'to' o 'content'"})
                continue

            if to_id == user_id:
                await ws.send_json({"event": "error", "detail": "No puedes enviarte mensajes a ti mismo"})
                continue

            receiver = db.query(User).filter(
                User.id_user == to_id, User.deleted_at.is_(None)
            ).first()
            if not receiver:
                await ws.send_json({"event": "error", "detail": "Receptor no encontrado"})
                continue

            msg = Message(
                id_message  = str(uuid.uuid4()),
                id_sender   = user_id,
                id_receiver = to_id,
                content     = content[:2000],
            )
            db.add(msg)
            db.commit()
            db.refresh(msg)

            # Confirmar al emisor
            await ws.send_json({
                "event":      "sent",
                "id_message": msg.id_message,
                "to":         to_id,
                "created_at": msg.created_at.isoformat(),
            })

            # Notificar al receptor si está conectado
            await manager.send_to(to_id, {
                "event":      "new_message",
                "from":       user_id,
                "content":    content,
                "id_message": msg.id_message,
                "created_at": msg.created_at.isoformat(),
            })

    except WebSocketDisconnect:
        manager.disconnect(user_id)
