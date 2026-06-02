from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from app.db.session import get_db
from app.core.deps import get_current_user_id
from app.models.question import Question, Flashcard, DifficultyLevel
from app.models.content import Chunk, Topic, ContentSource
from app.schemas.question import (
    QuestionOut, QuestionWithTopic,
    FlashcardOut, FlashcardReviewRequest,
    GenerateQuestionsRequest,
)
from app.services.mcq_service import generate_mcqs_for_chunk, simplify_flashcard_answer

router = APIRouter()


# ── MCQ Generation ────────────────────────────────────────────────────────────

async def _generate_and_store(source_id: int, max_per_chunk: int, user_id: int):
    """Background task: generate MCQs for all chunks in a content source."""
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        # Get all chunks for this source
        chunks_result = await db.execute(
            select(Chunk).where(Chunk.content_source_id == source_id)
            .order_by(Chunk.chunk_index)
        )
        chunks = chunks_result.scalars().all()

        if not chunks:
            print(f"No chunks found for source {source_id}")
            return

        # Get topic map
        topics_result = await db.execute(
            select(Topic).where(Topic.content_source_id == source_id)
        )
        topics = {t.id: t.name for t in topics_result.scalars().all()}

        # Get all existing questions to prevent duplicates
        existing_q_result = await db.execute(select(Question.question_text).where(Question.user_id == user_id))
        existing_questions = {q.lower() for q in existing_q_result.scalars().all()}

        import asyncio
        total_generated = 0
        # Process every 2nd chunk to extract maximum questions without hitting limits too fast
        for chunk in chunks[::2]:
            await asyncio.sleep(1.5)  # Avoid LLM provider rate limits
            topic_name = topics.get(chunk.topic_id, "General CSA Concepts")
            mcqs = await generate_mcqs_for_chunk(
                chunk_text=chunk.text,
                topic_name=topic_name,
                count=max_per_chunk,
            )

            for mcq in mcqs:
                if mcq["question"].lower() in existing_questions:
                    continue
                existing_questions.add(mcq["question"].lower())

                q = Question(
                    user_id=user_id,
                    topic_id=chunk.topic_id,
                    content_source_id=source_id,
                    chunk_id=chunk.id,
                    question_text=mcq["question"],
                    option_a=mcq["option_a"],
                    option_b=mcq["option_b"],
                    option_c=mcq["option_c"],
                    option_d=mcq["option_d"],
                    correct_answer=mcq["correct_answer"],
                    explanation=mcq["explanation"],
                    difficulty_level=mcq.get("difficulty", "medium"),
                    is_scenario_based=mcq.get("is_scenario_based", False),
                )
                db.add(q)
                await db.flush()

                # Auto-generate flashcard — front: concept question, back: simplified explanation
                correct_key = f"option_{mcq['correct_answer']}"
                correct_text = mcq.get(correct_key, "")
                
                # Use simplified flashcard answer service
                simplified_back = await simplify_flashcard_answer(
                    mcq["question"],
                    correct_text,
                    mcq["explanation"]
                )

                flashcard = Flashcard(
                    user_id=user_id,
                    question_id=q.id,
                    front=mcq["question"],
                    back=simplified_back,
                    next_review_date=datetime.now(timezone.utc),
                )
                db.add(flashcard)
                total_generated += 1

            await db.commit()

        # Update content source question count
        src_result = await db.execute(select(ContentSource).where(ContentSource.id == source_id))
        src = src_result.scalar_one_or_none()
        if src:
            src.total_questions = total_generated
            await db.commit()

        print(f"✅ Generated {total_generated} questions for source {source_id}")


@router.post("/generate", status_code=202)
async def generate_questions(
    payload: GenerateQuestionsRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Trigger MCQ generation for a content source (runs in background)."""
    # Verify source exists
    src = await db.execute(
        select(ContentSource).where(
            ContentSource.id == payload.content_source_id,
            ContentSource.user_id == user_id,
        )
    )
    if not src.scalar_one_or_none():
        raise HTTPException(404, "Content source not found")

    count = max(1, min(3, payload.max_per_chunk))
    background_tasks.add_task(
        _generate_and_store, payload.content_source_id, count, user_id
    )
    return {"message": "MCQ generation started in background", "content_source_id": payload.content_source_id}


# ── Questions CRUD ────────────────────────────────────────────────────────────

@router.get("", response_model=List[QuestionWithTopic])
async def list_questions(
    topic_id: Optional[int] = Query(None),
    difficulty: Optional[str] = Query(None),
    source_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    q = select(Question).where(Question.user_id == user_id)
    if topic_id:
        q = q.where(Question.topic_id == topic_id)
    if difficulty:
        q = q.where(Question.difficulty_level == difficulty)
    if source_id:
        q = q.where(Question.content_source_id == source_id)
    q = q.order_by(Question.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(q)
    questions = result.scalars().all()

    # Attach topic names
    out = []
    for quest in questions:
        item = QuestionWithTopic.model_validate(quest)
        if quest.topic_id:
            t = await db.get(Topic, quest.topic_id)
            item.topic_name = t.name if t else None
        out.append(item)
    return out


@router.get("/count")
async def count_questions(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(func.count()).select_from(Question).where(Question.user_id == user_id)
    )
    return {"count": result.scalar()}


@router.get("/{question_id}", response_model=QuestionWithTopic)
async def get_question(
    question_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Question).where(Question.id == question_id, Question.user_id == user_id)
    )
    q = result.scalar_one_or_none()
    if not q:
        raise HTTPException(404, "Question not found")
    item = QuestionWithTopic.model_validate(q)
    if q.topic_id:
        t = await db.get(Topic, q.topic_id)
        item.topic_name = t.name if t else None
    return item


# ── Flashcards ────────────────────────────────────────────────────────────────

SPACED_INTERVALS = [1, 3, 7, 30]  # days


@router.get("/flashcards/all", response_model=List[FlashcardOut])
async def list_flashcards(
    topic_id: Optional[int] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    q = select(Flashcard).where(Flashcard.user_id == user_id)
    if topic_id:
        q = q.join(Question).where(Question.topic_id == topic_id)
    q = q.order_by(Flashcard.next_review_date.asc()).limit(limit)
    result = await db.execute(q)
    cards = result.scalars().all()
    out = []
    for c in cards:
        item = FlashcardOut.model_validate(c)
        item.accuracy = round(c.correct_count / c.review_count * 100, 1) if c.review_count else None
        out.append(item)
    return out


@router.get("/flashcards/daily", response_model=List[FlashcardOut])
async def daily_flashcards(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Flashcard)
        .where(Flashcard.user_id == user_id, Flashcard.next_review_date <= now)
        .order_by(Flashcard.next_review_date.asc())
        .limit(20)
    )
    return result.scalars().all()


@router.post("/flashcards/{card_id}/review")
async def review_flashcard(
    card_id: int,
    payload: FlashcardReviewRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == card_id, Flashcard.user_id == user_id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(404, "Flashcard not found")

    card.review_count += 1
    if payload.correct:
        card.correct_count += 1
        # Advance interval
        idx = min(SPACED_INTERVALS.index(card.interval_days) + 1
                  if card.interval_days in SPACED_INTERVALS else 1,
                  len(SPACED_INTERVALS) - 1)
        card.interval_days = SPACED_INTERVALS[idx]
    else:
        card.interval_days = 1  # Reset on wrong

    card.next_review_date = datetime.now(timezone.utc) + timedelta(days=card.interval_days)
    await db.commit()
    return {"next_review_date": card.next_review_date, "interval_days": card.interval_days}
