import json, uuid
from datetime import datetime
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.models import User, Message, Conversation
from app.schemas.schemas import MessageOut, ConversationOut

chat_router = APIRouter(prefix="/chat", tags=["chat"])


class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.active:
            try:
                self.active[user_id].remove(ws)
            except ValueError:
                pass

    async def send_to(self, user_id: str, data: dict):
        for ws in self.active.get(user_id, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


@chat_router.websocket("/ws/{token}")
async def websocket_endpoint(ws: WebSocket, token: str, db: Session = Depends(get_db)):
    from jose import jwt, JWTError
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await ws.close(code=4001)
            return
    except JWTError:
        await ws.close(code=4001)
        return

    await manager.connect(user_id, ws)
    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)
            if data.get("type") != "message":
                continue

            receiver_id     = data.get("receiver_id", "")
            text            = (data.get("text") or "").strip()
            conversation_id = data.get("conversation_id")
            if not text or not receiver_id:
                continue

            # Find or create conversation
            convo = None
            if conversation_id:
                convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if not convo:
                convo = db.query(Conversation).filter(
                    ((Conversation.participant_one == user_id) & (Conversation.participant_two == receiver_id)) |
                    ((Conversation.participant_one == receiver_id) & (Conversation.participant_two == user_id))
                ).first()
            if not convo:
                convo = Conversation(participant_one=user_id, participant_two=receiver_id)
                db.add(convo)

            msg = Message(conversation_id=convo.id if convo.id else None,
                          sender_id=user_id, receiver_id=receiver_id, text=text)
            db.add(msg)
            convo.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(msg)

            payload_out = {
                "type": "message", "id": msg.id,
                "conversation_id": convo.id, "sender_id": msg.sender_id,
                "receiver_id": msg.receiver_id, "text": msg.text,
                "created_at": msg.created_at.isoformat(), "read": False,
            }
            await manager.send_to(user_id, payload_out)
            await manager.send_to(receiver_id, payload_out)

    except WebSocketDisconnect:
        manager.disconnect(user_id, ws)


@chat_router.get("/conversations", response_model=List[ConversationOut])
def get_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (db.query(Conversation)
            .filter((Conversation.participant_one == current_user.id) | (Conversation.participant_two == current_user.id))
            .order_by(Conversation.updated_at.desc()).all())


@chat_router.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
def get_messages(conversation_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not convo:
        raise HTTPException(404, "Conversation not found")
    if current_user.id not in [convo.participant_one, convo.participant_two]:
        raise HTTPException(403, "Not your conversation")
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.receiver_id == current_user.id,
        Message.read == False,
    ).update({"read": True})
    db.commit()
    return db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()
