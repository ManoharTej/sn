import random
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.core.deps import get_current_user_id
from app.models.test import MockTest, TestQuestion, TestType, TestStatus
from app.models.question import Question, DifficultyLevel
from app.models.content import Topic
from app.schemas.test import (
    CreateTopicTestRequest, TestOut, TestWithQuestionsOut,
    SubmitAnswerRequest, SubmitAnswerResponse,
    CompleteTestResponse, TestResultDetail,
)
from app.services.analytics_service import update_progress_after_test

router = APIRouter()


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _pick_questions(
    db: AsyncSession,
    user_id: int,
    count: int,
    topic_ids: Optional[List[int]] = None,
    exclude_ids: Optional[List[int]] = None,
) -> List[Question]:
    q = select(Question).where(Question.user_id == user_id)
    if topic_ids:
        q = q.where(Question.topic_id.in_(topic_ids))
    if exclude_ids:
        q = q.where(~Question.id.in_(exclude_ids))
    result = await db.execute(q)
    all_q = result.scalars().all()
    if not all_q:
        return []
    random.shuffle(all_q)
    return all_q[:count]


async def _create_test(
    db: AsyncSession,
    user_id: int,
    test_type: TestType,
    title: str,
    questions: List[Question],
    duration_minutes: int,
    topic_id: Optional[int] = None,
) -> MockTest:
    if not questions:
        raise HTTPException(422, "Not enough questions available. Upload a PDF and generate MCQs first.")

    test = MockTest(
        user_id=user_id,
        test_type=test_type,
        title=title,
        topic_id=topic_id,
        total_questions=len(questions),
        duration_minutes=duration_minutes,
        status=TestStatus.active,
    )
    db.add(test)
    await db.flush()

    for idx, q in enumerate(questions):
        tq = TestQuestion(
            test_id=test.id,
            question_id=q.id,
            order_index=idx,
        )
        db.add(tq)

    await db.commit()
    await db.refresh(test)
    return test


# ── Create Tests ───────────────────────────────────────────────────────────────

@router.post("/topic-based", response_model=TestWithQuestionsOut, status_code=201)
async def create_topic_test(
    payload: CreateTopicTestRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    domain_name = payload.topic_id
    
    q = select(Question).where(Question.user_id == user_id, Question.domain == domain_name)
    result = await db.execute(q)
    all_q = result.scalars().all()
    
    if not all_q:
        raise HTTPException(422, f"No questions found for domain {domain_name}")
        
    import random
    random.shuffle(all_q)
    questions = all_q[:payload.question_count]
    
    test = await _create_test(db, user_id, TestType.topic_based, f"{domain_name} Practice",
                               questions, duration_minutes=30)
    return await _get_test_with_questions(db, test.id)


async def _pick_weighted_exam_questions(db: AsyncSession, user_id: int) -> List[Question]:
    """Picks exactly 100 questions according to official CSA weightage."""
    weights = {
        "Platform Overview and Navigation": 7,
        "Instance Configuration": 10,
        "Configuring Applications for Collaboration": 20,
        "Self Service & Automation": 20,
        "Database Management and Platform Security": 30,
        "Data Migration and Integration": 13
    }
    
    exam_qs = []
    
    for domain, count in weights.items():
        # Try to get 20% of this domain's quota as scenario-based questions if possible
        scenario_count = max(1, int(count * 0.2))
        standard_count = count - scenario_count
        
        # Pull scenarios
        q_scen = select(Question).where(
            Question.user_id == user_id, 
            Question.domain == domain,
            Question.is_scenario_based == True
        )
        res_scen = await db.execute(q_scen)
        scen_list = res_scen.scalars().all()
        random.shuffle(scen_list)
        picked_scen = scen_list[:scenario_count]
        exam_qs.extend(picked_scen)
        
        # Pull standard to fill the rest of the quota
        remaining_needed = count - len(picked_scen)
        q_std = select(Question).where(
            Question.user_id == user_id, 
            Question.domain == domain,
            ~Question.id.in_([q.id for q in picked_scen]) if picked_scen else True
        )
        res_std = await db.execute(q_std)
        std_list = res_std.scalars().all()
        random.shuffle(std_list)
        exam_qs.extend(std_list[:remaining_needed])
        
    # If we couldn't fulfill exactly 100 due to missing questions in a domain, backfill
    if len(exam_qs) < 100:
        shortfall = 100 - len(exam_qs)
        existing_ids = [q.id for q in exam_qs]
        q_backfill = select(Question).where(
            Question.user_id == user_id,
            ~Question.id.in_(existing_ids)
        )
        res_backfill = await db.execute(q_backfill)
        backfill_list = res_backfill.scalars().all()
        random.shuffle(backfill_list)
        exam_qs.extend(backfill_list[:shortfall])
        
    random.shuffle(exam_qs)
    return exam_qs


@router.post("/full-exam", response_model=TestWithQuestionsOut, status_code=201)
async def create_full_exam(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    questions = await _pick_weighted_exam_questions(db, user_id)
    test = await _create_test(db, user_id, TestType.full_exam, "Full CSA Exam Simulation",
                               questions, duration_minutes=120)
    return await _get_test_with_questions(db, test.id)


@router.post("/daily", response_model=TestWithQuestionsOut, status_code=201)
async def create_daily_test(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    questions = await _pick_questions(db, user_id, count=15)
    test = await _create_test(db, user_id, TestType.daily, "Daily Practice Test",
                               questions, duration_minutes=20)
    return await _get_test_with_questions(db, test.id)


@router.post("/weak-topics", response_model=TestWithQuestionsOut, status_code=201)
async def create_weak_topics_test(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Pull real weak topic IDs from analytics
    from app.models.progress import TopicProgress
    weak_result = await db.execute(
        select(TopicProgress).where(
            TopicProgress.user_id == user_id,
            TopicProgress.is_weak == True,  # noqa: E712
        ).order_by(TopicProgress.accuracy_pct.asc())
    )
    weak_topics = weak_result.scalars().all()
    weak_ids = [w.topic_id for w in weak_topics] if weak_topics else None

    questions = await _pick_questions(db, user_id, count=20, topic_ids=weak_ids)
    title = "Weak Topics Recovery" if weak_ids else "Mixed Practice (No weak topics yet)"
    test = await _create_test(db, user_id, TestType.weak_topics, title,
                               questions, duration_minutes=30)
    return await _get_test_with_questions(db, test.id)


# ── Test Operations ────────────────────────────────────────────────────────────

async def _get_test_with_questions(db: AsyncSession, test_id: int) -> MockTest:
    result = await db.execute(
        select(MockTest)
        .options(selectinload(MockTest.questions).selectinload(TestQuestion.question))
        .where(MockTest.id == test_id)
    )
    return result.scalar_one_or_none()


@router.get("/{test_id}", response_model=TestWithQuestionsOut)
async def get_test(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    test = await _get_test_with_questions(db, test_id)
    if not test or test.user_id != user_id:
        raise HTTPException(404, "Test not found")
    return test


@router.post("/{test_id}/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(
    test_id: int,
    payload: SubmitAnswerRequest,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Get test question record
    result = await db.execute(
        select(TestQuestion)
        .where(TestQuestion.test_id == test_id, TestQuestion.question_id == payload.question_id)
    )
    tq = result.scalar_one_or_none()
    if not tq:
        raise HTTPException(404, "Question not in this test")

    # Get actual question for correct answer
    q = await db.get(Question, payload.question_id)
    if not q:
        raise HTTPException(404, "Question not found")

    # Save answer
    tq.user_answer = payload.answer
    tq.time_spent_seconds = payload.time_spent_seconds
    tq.is_marked = payload.is_marked
    tq.answered_at = datetime.now(timezone.utc)

    if payload.answer:
        tq.is_correct = (payload.answer.lower() == q.correct_answer.lower())
    else:
        tq.is_correct = None  # skipped

    await db.commit()
    return SubmitAnswerResponse(
        is_correct=tq.is_correct,
        correct_answer=q.correct_answer,
        explanation=q.explanation,
    )


@router.post("/{test_id}/complete", response_model=CompleteTestResponse)
async def complete_test(
    test_id: int,
    time_taken_seconds: int = 0,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    test = await _get_test_with_questions(db, test_id)
    if not test or test.user_id != user_id:
        raise HTTPException(404, "Test not found")
    if test.status == TestStatus.completed:
        raise HTTPException(400, "Test already completed")

    correct = sum(1 for tq in test.questions if tq.is_correct is True)
    wrong   = sum(1 for tq in test.questions if tq.is_correct is False)
    skipped = sum(1 for tq in test.questions if tq.is_correct is None)

    score = round((correct / test.total_questions) * 100, 1) if test.total_questions else 0

    test.status = TestStatus.completed
    test.score_percent = score
    test.correct_count = correct
    test.wrong_count = wrong
    test.skipped_count = skipped
    test.time_taken_seconds = time_taken_seconds
    test.completed_at = datetime.now(timezone.utc)
    await db.commit()

    # Trigger progress analytics update in background
    await update_progress_after_test(test_id, user_id, db)

    return CompleteTestResponse(
        test_id=test.id,
        score_percent=score,
        correct_count=correct,
        wrong_count=wrong,
        skipped_count=skipped,
        total_questions=test.total_questions,
        time_taken_seconds=time_taken_seconds,
        passed=(score >= 70),
    )


@router.get("/{test_id}/results", response_model=TestResultDetail)
async def get_results(
    test_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    test = await _get_test_with_questions(db, test_id)
    if not test or test.user_id != user_id:
        raise HTTPException(404, "Test not found")

    # Build breakdowns
    topic_map: dict = {}
    diff_map: dict = {"easy": [0, 0], "medium": [0, 0], "hard": [0, 0]}

    for tq in test.questions:
        q = tq.question
        # Topic
        tname = "Unknown"
        if q.topic_id:
            topic = await db.get(Topic, q.topic_id)
            tname = topic.name if topic else "Unknown"
        if tname not in topic_map:
            topic_map[tname] = {"correct": 0, "total": 0}
        topic_map[tname]["total"] += 1
        if tq.is_correct:
            topic_map[tname]["correct"] += 1
        # Difficulty
        dl = q.difficulty_level.value if q.difficulty_level else "medium"
        diff_map[dl][1] += 1
        if tq.is_correct:
            diff_map[dl][0] += 1

    result = TestResultDetail.model_validate(test)
    result.topic_breakdown = {k: {"correct": v["correct"], "total": v["total"],
                                   "pct": round(v["correct"]/v["total"]*100,1) if v["total"] else 0}
                              for k, v in topic_map.items()}
    result.difficulty_breakdown = {k: {"correct": v[0], "total": v[1],
                                        "pct": round(v[0]/v[1]*100,1) if v[1] else 0}
                                   for k, v in diff_map.items()}
    return result


@router.get("", response_model=List[TestOut])
async def list_tests(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    result = await db.execute(
        select(MockTest).where(MockTest.user_id == user_id)
        .order_by(MockTest.created_at.desc()).limit(50)
    )
    return result.scalars().all()
