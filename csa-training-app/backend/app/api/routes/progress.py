from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.core.deps import get_current_user_id
from app.models.progress import UserProgress, TopicProgress, DailyActivity
from app.models.test import MockTest, TestStatus
from sqlalchemy import func

router = APIRouter()


@router.get("/overview")
async def get_overview(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Overall stats: accuracy, streak, totals."""
    prog_result = await db.execute(
        select(UserProgress).where(UserProgress.user_id == user_id)
    )
    prog = prog_result.scalar_one_or_none()

    # Tests summary
    tests_result = await db.execute(
        select(MockTest).where(MockTest.user_id == user_id, MockTest.status == TestStatus.completed)
    )
    tests = tests_result.scalars().all()
    passed = [t for t in tests if (t.score_percent or 0) >= 70]
    avg_score = (
        round(sum(t.score_percent for t in tests) / len(tests), 1) if tests else 0
    )

    return {
        "total_tests":       len(tests),
        "total_questions":   prog.total_questions if prog else 0,
        "total_correct":     prog.total_correct if prog else 0,
        "overall_accuracy":  prog.overall_accuracy if prog else 0,
        "streak_days":       prog.streak_days if prog else 0,
        "tests_passed":      len(passed),
        "avg_score":         avg_score,
        "pass_rate":         round(len(passed) / len(tests) * 100, 1) if tests else 0,
    }


@router.get("/topics")
async def get_topic_progress(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Per-topic accuracy breakdown, sorted worst first."""
    result = await db.execute(
        select(TopicProgress)
        .where(TopicProgress.user_id == user_id, TopicProgress.total_answered > 0)
        .order_by(TopicProgress.accuracy_pct.asc())
    )
    topics = result.scalars().all()
    return [
        {
            "topic_id":      t.topic_id,
            "topic_name":    t.topic_name,
            "total":         t.total_answered,
            "correct":       t.total_correct,
            "accuracy_pct":  t.accuracy_pct,
            "is_weak":       t.is_weak,
            "last_practiced": t.last_practiced,
        }
        for t in topics
    ]


@router.get("/weak-topics")
async def get_weak_topics(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Topics with accuracy < 60% — used by adaptive engine."""
    result = await db.execute(
        select(TopicProgress)
        .where(TopicProgress.user_id == user_id, TopicProgress.is_weak == True)  # noqa: E712
        .order_by(TopicProgress.accuracy_pct.asc())
    )
    return [
        {"topic_id": t.topic_id, "topic_name": t.topic_name, "accuracy_pct": t.accuracy_pct}
        for t in result.scalars().all()
    ]


@router.get("/activity")
async def get_activity(
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Last 30 days of daily activity for the heatmap chart."""
    result = await db.execute(
        select(DailyActivity)
        .where(DailyActivity.user_id == user_id)
        .order_by(DailyActivity.date.desc())
        .limit(30)
    )
    days = result.scalars().all()
    return [
        {
            "date":            d.date,
            "questions_done":  d.questions_done,
            "tests_done":      d.tests_done,
            "accuracy_pct":    d.accuracy_pct,
            "minutes_studied": d.minutes_studied,
        }
        for d in reversed(days)
    ]


@router.get("/test-history")
async def get_test_history(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Last N completed tests with score — for the score trend chart."""
    result = await db.execute(
        select(MockTest)
        .where(MockTest.user_id == user_id, MockTest.status == TestStatus.completed)
        .order_by(MockTest.completed_at.asc())
        .limit(limit)
    )
    tests = result.scalars().all()
    return [
        {
            "test_id":      t.id,
            "title":        t.title,
            "test_type":    t.test_type,
            "score_percent": t.score_percent,
            "correct":      t.correct_count,
            "total":        t.total_questions,
            "completed_at": t.completed_at,
        }
        for t in tests
    ]
