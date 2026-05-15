from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List

from app.db.session import get_db
from app.core.deps import get_current_user_id
from app.models.chat import ChatSession, ChatMessage, MessageRole
from app.models.content import Chunk
from app.schemas.chat import (
    SendMessageRequest, SendMessageResponse,
    MessageOut, ChatSessionOut, ChatSessionDetail,
)
from app.services.tutor_service import answer_question, simple_keyword_search

router = APIRouter()


@router.post("/message", response_model=SendMessageResponse)
async def send_message(
    payload: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Send a question to the AI tutor. Creates or continues a session."""

    # ── Get or create chat session ────────────────────────────────────────────
    if payload.session_id:
        sess_result = await db.execute(
            select(ChatSession).where(
                ChatSession.id == payload.session_id,
                ChatSession.user_id == user_id,
            )
        )
        session = sess_result.scalar_one_or_none()
        if not session:
            raise HTTPException(404, "Chat session not found")
    else:
        # New session — title = first 50 chars of question
        title = payload.content[:50] + ("..." if len(payload.content) > 50 else "")
        session = ChatSession(user_id=user_id, title=title)
        db.add(session)
        await db.flush()

    # ── Load conversation history ─────────────────────────────────────────────
    hist_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
        .limit(10)   # last 5 turns
    )
    history_msgs = hist_result.scalars().all()
    conversation_history = [
        {"role": msg.role.value, "content": msg.content}
        for msg in history_msgs
    ]

    # ── RAG: search chunks from user's PDFs ───────────────────────────────────
    chunks_result = await db.execute(
        select(Chunk)
        .where(
            Chunk.content_source_id.in_(
                select(Chunk.content_source_id).distinct()
            )
        )
        .limit(200)   # fetch 200 chunks to search locally
    )
    all_chunks = chunks_result.scalars().all()

    context_chunks = await simple_keyword_search(
        question=payload.content,
        chunks=all_chunks,
        top_k=4,
    )
    sources_used = len(context_chunks) > 0

    # ── Save user message ──────────────────────────────────────────────────────
    user_msg = ChatMessage(
        session_id=session.id,
        role=MessageRole.user,
        content=payload.content,
    )
    db.add(user_msg)
    await db.flush()

    # ── Call AI Tutor ──────────────────────────────────────────────────────────
    answer = await answer_question(
        question=payload.content,
        context_chunks=context_chunks if context_chunks else None,
        conversation_history=conversation_history,
    )

    # ── Save assistant message ────────────────────────────────────────────────
    context_preview = " | ".join(c[:80] for c in context_chunks[:2]) if context_chunks else None
    assistant_msg = ChatMessage(
        session_id=session.id,
        role=MessageRole.assistant,
        content=answer,
        context_used=context_preview,
    )
    db.add(assistant_msg)
    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)

    return SendMessageResponse(
        session_id=session.id,
        user_message=MessageOut.model_validate(user_msg),
        assistant_message=MessageOut.model_validate(assistant_msg),
        sources_used=sources_used,
    )


@router.get("/sessions", response_model=List[ChatSessionOut])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .limit(20)
    )
    sessions = result.scalars().all()
    out = []
    for s in sessions:
        count_result = await db.execute(
            select(func.count()).select_from(ChatMessage).where(ChatMessage.session_id == s.id)
        )
        item = ChatSessionOut.model_validate(s)
        item.message_count = count_result.scalar()
        out.append(item)
    return out


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id, ChatSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    item = ChatSessionDetail.model_validate(session)
    item.message_count = len(session.messages)
    return item


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    await db.delete(session)
    await db.commit()


@router.get("/quick-questions")
async def get_quick_questions():
    """Suggested starter questions for the AI tutor."""
    return [
        "What is an ACL in ServiceNow and how does it work?",
        "Explain the difference between a Business Rule and a Client Script",
        "What is the Flow Designer and when should I use it?",
        "How does the CMDB work in ServiceNow?",
        "What are the different types of variables in Service Catalog?",
        "Explain Incident, Problem, and Change management",
        "What is a Transform Map and when do I use it?",
        "How does ServiceNow handle role-based access control?",
        "What is the difference between a UI Policy and a Data Policy?",
        "Explain GlideRecord and give an example query",
    ]


@router.post("/sessions/{session_id}/ingest", status_code=202)
async def ingest_chat_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Turns a chat session into study material (ContentSource) for MCQ generation."""
    result = await db.execute(
        select(ChatSession)
        .options(selectinload(ChatSession.messages))
        .where(ChatSession.id == session_id, ChatSession.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(404, "Session not found")
    
    if not session.messages:
        raise HTTPException(400, "Cannot ingest empty chat session")

    # Combine chat into one long text
    text = f"Chat Session: {session.title}\n\n"
    for m in session.messages:
        role_label = "User Question" if m.role == "user" else "AI Tutor Answer"
        text += f"[{role_label}]: {m.content}\n\n"

    # Create ContentSource
    from app.models.content import ContentSource, SourceType, ProcessingStatus, Topic, Chunk
    source = ContentSource(
        user_id=user_id,
        title=f"Chat: {session.title}",
        filename=f"chat_{session.id}",
        file_path="chat_log",
        source_type=SourceType.chat,
        status=ProcessingStatus.completed,
    )
    db.add(source)
    await db.flush()

    # Create Topic
    topic = Topic(name="AI Tutor Conversations", content_source_id=source.id, user_id=user_id)
    db.add(topic)
    await db.flush()

    # Create Chunk
    chunk = Chunk(
        content_source_id=source.id,
        topic_id=topic.id,
        chunk_index=0,
        text=text
    )
    db.add(chunk)
    source.total_chunks = 1
    
    await db.commit()
    return {"message": "Chat conversation successfully added to your Study Library!", "source_id": source.id}
