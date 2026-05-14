from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List
import json, uuid
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User
from app.models.models import Message, Conversation
from app.schemas.schemas import MessageOut, ConversationOut

chat_router = APIRouter(prefix="/chat", tags=["chat"])

# ── Connection Manager ────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        # user_id → list of WebSocket connections
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.active:
            self.active[user_id].discard(ws) if hasattr(self.active[user_id], 'discard') else None
            try:
                self.active[user_id].remove(ws)
            except ValueError:
                pass

    async def send_to_user(self, user_id: str, data: dict):
        for ws in self.active.get(user_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass

manager = ConnectionManager()

# ── WebSocket endpoint ────────────────────────────────────────────────────────
@chat_router.websocket("/ws/{token}")
async def websocket_endpoint(ws: WebSocket, token: str, db: Session = Depends(get_db)):
    from jose import jwt, JWTError
    from app.core.config import settings

    # Auth via token in URL (browser WebSocket can't set headers)
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        user    = db.query(User).filter(User.id == user_id).first()
        if not user:
            await ws.close(code=4001)
            return
    except JWTError:
        await ws.close(code=4001)
        return

    await manager.connect(user_id, ws)
    try:
        while True:
            raw  = await ws.receive_text()
            data = json.loads(raw)

            if data.get("type") == "message":
                receiver_id     = data["receiver_id"]
                text            = data["text"].strip()
                conversation_id = data.get("conversation_id")

                if not text:
                    continue

                # Get or create conversation
                convo = None
                if conversation_id:
                    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
                if not convo:
                    convo = (
                        db.query(Conversation)
                        .filter(
                            ((Conversation.participant_one == user_id) & (Conversation.participant_two == receiver_id)) |
                            ((Conversation.participant_one == receiver_id) & (Conversation.participant_two == user_id))
                        )
                        .first()
                    )
                if not convo:
                    convo = Conversation(
                        id=str(uuid.uuid4()),
                        participant_one=user_id,
                        participant_two=receiver_id,
                    )
                    db.add(convo)

                msg = Message(
                    id=str(uuid.uuid4()),
                    conversation_id=convo.id,
                    sender_id=user_id,
                    receiver_id=receiver_id,
                    text=text,
                )
                db.add(msg)
                convo.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(msg)

                payload = {
                    "type":            "message",
                    "id":              msg.id,
                    "conversation_id": convo.id,
                    "sender_id":       msg.sender_id,
                    "receiver_id":     msg.receiver_id,
                    "text":            msg.text,
                    "created_at":      msg.created_at.isoformat(),
                    "read":            False,
                }
                # Echo to sender
                await manager.send_to_user(user_id, payload)
                # Deliver to receiver if online
                await manager.send_to_user(receiver_id, payload)

    except WebSocketDisconnect:
        manager.disconnect(user_id, ws)

# ── REST fallback endpoints ───────────────────────────────────────────────────
@chat_router.get("/conversations", response_model=List[ConversationOut])
def get_conversations(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    convos = (
        db.query(Conversation)
        .filter(
            (Conversation.participant_one == current_user.id) |
            (Conversation.participant_two == current_user.id)
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    result = []
    for c in convos:
        other_id   = c.participant_two if c.participant_one == current_user.id else c.participant_one
        other_user = db.query(User).filter(User.id == other_id).first()
        last_msg   = (
            db.query(Message)
            .filter(Message.conversation_id == c.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        unread = db.query(Message).filter(
            Message.conversation_id == c.id,
            Message.receiver_id     == current_user.id,
            Message.read             == False,
        ).count()

        result.append({
            "id":              c.id,
            "participant_one": c.participant_one,
            "participant_two": c.participant_two,
            "updated_at":      c.updated_at,
            "messages":        [],
            "other_name":      other_user.full_name if other_user else "Unknown",
            "last_message":    last_msg.text if last_msg else "",
            "unread_count":    unread,
        })

    return result


@chat_router.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
def get_messages(
    conversation_id: str,
    db:              Session = Depends(get_db),
    current_user:    User    = Depends(get_current_user),
):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise HTTPException(404, "Conversation not found")
    if current_user.id not in [convo.participant_one, convo.participant_two]:
        raise HTTPException(403, "Not your conversation")

    # Mark as read
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.receiver_id     == current_user.id,
        Message.read             == False,
    ).update({"read": True})
    db.commit()

    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )


# ── Create or get a conversation ──────────────────────────────────────────────
@chat_router.post("/conversations", response_model=ConversationOut)
def create_conversation(
    body:         dict,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    POST /api/chat/conversations  { "receiver_id": "uuid" }
    Creates a new conversation or returns the existing one.
    """
    receiver_id = body.get("receiver_id")
    if not receiver_id:
        raise HTTPException(400, "receiver_id is required")

    if receiver_id == current_user.id:
        raise HTTPException(400, "Cannot start a conversation with yourself")

    # Check if conversation already exists between these two users
    existing = db.query(Conversation).filter(
        ((Conversation.participant_one == current_user.id) & (Conversation.participant_two == receiver_id)) |
        ((Conversation.participant_one == receiver_id)     & (Conversation.participant_two == current_user.id))
    ).first()

    if existing:
        return existing

    # Create new conversation
    convo = Conversation(
        participant_one = current_user.id,
        participant_two = receiver_id,
    )
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


# ── Mark conversation as read ─────────────────────────────────────────────────
@chat_router.post("/conversations/{conversation_id}/read", status_code=204)
def mark_as_read(
    conversation_id: str,
    db:              Session = Depends(get_db),
    current_user:    User    = Depends(get_current_user),
):
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.receiver_id     == current_user.id,
        Message.read             == False,
    ).update({"read": True})
    db.commit()