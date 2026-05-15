from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.chat import MessageRole


class SendMessageRequest(BaseModel):
    content: str
    session_id: Optional[int] = None   # None = start new session


class MessageOut(BaseModel):
    id: int
    role: MessageRole
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionOut(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True


class ChatSessionDetail(ChatSessionOut):
    messages: List[MessageOut] = []


class SendMessageResponse(BaseModel):
    session_id: int
    user_message: MessageOut
    assistant_message: MessageOut
    sources_used: bool   # whether context from PDFs was used
