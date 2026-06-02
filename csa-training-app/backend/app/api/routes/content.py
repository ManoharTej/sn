import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.deps import get_current_user_id
from app.models.content import ContentSource, ProcessingStatus
from app.schemas.content import ContentUploadResponse, ContentSourceOut, ContentSourceList, UrlIngestRequest, SearchLearnRequest
from app.services.pdf_service import process_pdf
from app.services.scraper_service import ingest_url_bg, search_and_learn_bg
from app.config import settings
from typing import List

router = APIRouter()

UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@router.post("/upload", response_model=ContentUploadResponse, status_code=202)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(None),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Validate type
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")

    # Read & validate size
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(400, f"File too large (max {settings.MAX_UPLOAD_SIZE_MB}MB)")

    # Save file
    safe_name = f"{user_id}_{file.filename.replace(' ', '_')}"
    file_path = UPLOAD_DIR / safe_name
    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    source = ContentSource(
        user_id=user_id,
        title=title or file.filename.replace(".pdf", ""),
        filename=file.filename,
        file_path=str(file_path),
        file_size_bytes=len(content),
        status=ProcessingStatus.pending,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    # Queue background processing
    background_tasks.add_task(process_pdf_bg, source.id, str(file_path))

    return ContentUploadResponse(
        id=source.id,
        title=source.title,
        filename=source.filename,
        status=source.status,
        message="Upload received — processing started in background",
    )


async def process_pdf_bg(source_id: int, file_path: str):
    """Background task wrapper — creates its own DB session."""
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await process_pdf(source_id, file_path, db)


@router.post("/ingest-url", response_model=ContentUploadResponse, status_code=202)
async def ingest_url(
    payload: UrlIngestRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    source = ContentSource(
        user_id=user_id,
        title=payload.title or "Web Source",
        filename=payload.url,
        file_path="url",
        file_size_bytes=0,
        status=ProcessingStatus.pending,
    )
    db.add(source)
    await db.commit()
    await db.refresh(source)

    background_tasks.add_task(ingest_url_bg, source.id, payload.url)

    return ContentUploadResponse(
        id=source.id,
        title=source.title,
        filename=source.filename,
        status=source.status,
        message="URL ingestion started in background",
    )


@router.get("/list", response_model=List[ContentSourceList])
async def list_content(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(ContentSource)
        .where(ContentSource.user_id == user_id)
        .order_by(ContentSource.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{source_id}", response_model=ContentSourceOut)
async def get_content(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(ContentSource)
        .options(selectinload(ContentSource.topics))
        .where(ContentSource.id == source_id, ContentSource.user_id == user_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(404, "Content not found")
    return source


@router.delete("/{source_id}", status_code=204)
async def delete_content(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(ContentSource).where(ContentSource.id == source_id, ContentSource.user_id == user_id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(404, "Content not found")

    # Delete file from disk
    try:
        Path(source.file_path).unlink(missing_ok=True)
    except Exception:
        pass

    # Delete related flashcards and questions explicitly since no cascade relationship is defined
    from app.models.question import Question, Flashcard
    from sqlalchemy import delete
    
    # First delete flashcards linked to these questions
    subquery = select(Question.id).where(Question.content_source_id == source_id)
    await db.execute(delete(Flashcard).where(Flashcard.question_id.in_(subquery)))
    
    # Then delete the questions themselves
    await db.execute(delete(Question).where(Question.content_source_id == source_id))

    await db.delete(source)
    await db.commit()


@router.get("/topics/all")
async def get_all_topics(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    from app.models.question import Question
    from sqlalchemy import select, func
    
    result = await db.execute(
        select(Question.domain, func.count(Question.id))
        .where(Question.user_id == user_id)
        .group_by(Question.domain)
    )
    domains = result.all()
    
    # Return in the same format the frontend expects: id, name, question_count
    # We use the domain string as the 'id' so the frontend passes it back in createTopic
    return [{"id": d[0], "name": d[0], "question_count": d[1]} for d in domains]


@router.post("/search-and-learn", status_code=202)
async def search_and_learn(
    payload: SearchLearnRequest,
    background_tasks: BackgroundTasks,
    user_id: int = Depends(get_current_user_id),
):
    """Triggers the 'Automatic Internet Learning' feature."""
    background_tasks.add_task(search_and_learn_bg, payload.topic, user_id, payload.max_results)
    return {"message": f"Search & Learn started for topic: {payload.topic}. New sources will appear shortly."}
