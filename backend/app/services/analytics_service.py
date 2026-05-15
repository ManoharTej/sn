"""
Analytics Service — computes and persists progress after each test.
Called automatically by the complete_test endpoint.
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.test import MockTest, TestQuestion, TestStatus
from app.models.question import Question
from app.models.content import Topic
from app.models.progress import UserProgress, TopicProgress, DailyActivity


WEAK_THRESHOLD = 60.0   # below this accuracy → topic is "weak"


async def update_progress_after_test(test_id: int, user_id: int, db: AsyncSession):
    """
    Compute and upsert:
    1. UserProgress (overall stats + streak)
    2. TopicProgress (per-topic accuracy, weak flag)
    3. DailyActivity (today's row)
    """
    # ── Fetch test + answered questions ──────────────────────────────────────
    test_result = await db.execute(
        select(MockTest).where(MockTest.id == test_id, MockTest.user_id == user_id)
    )
    test = test_result.scalar_one_or_none()
    if not test or test.status != TestStatus.completed:
        return

    tqs_result = await db.execute(
        select(TestQuestion).where(TestQuestion.test_id == test_id)
    )
    tqs = tqs_result.scalars().all()

    # ── 1. UserProgress ───────────────────────────────────────────────────────
    prog_result = await db.execute(
        select(UserProgress).where(UserProgress.user_id == user_id)
    )
    prog = prog_result.scalar_one_or_none()
    if not prog:
        prog = UserProgress(user_id=user_id)
        db.add(prog)

    prog.total_tests     += 1
    prog.total_questions += test.total_questions
    prog.total_correct   += (test.correct_count or 0)
    prog.overall_accuracy = (
        round(prog.total_correct / prog.total_questions * 100, 1)
        if prog.total_questions else 0.0
    )

    # Streak logic
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    if prog.last_active_date:
        last_str = prog.last_active_date.strftime("%Y-%m-%d")
        yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        if last_str == today_str:
            pass  # same day — no change
        elif last_str == yesterday:
            prog.streak_days += 1
        else:
            prog.streak_days = 1  # broke streak
    else:
        prog.streak_days = 1
    prog.last_active_date = now

    # ── 2. TopicProgress ──────────────────────────────────────────────────────
    topic_stats: dict = {}   # topic_id → [correct, total, topic_name]

    for tq in tqs:
        q = await db.get(Question, tq.question_id)
        if not q or not q.topic_id:
            continue
        if q.topic_id not in topic_stats:
            topic = await db.get(Topic, q.topic_id)
            topic_stats[q.topic_id] = [0, 0, topic.name if topic else "Unknown"]
        topic_stats[q.topic_id][1] += 1
        if tq.is_correct:
            topic_stats[q.topic_id][0] += 1

    for topic_id, (correct, total, tname) in topic_stats.items():
        tp_result = await db.execute(
            select(TopicProgress).where(
                TopicProgress.user_id == user_id,
                TopicProgress.topic_id == topic_id,
            )
        )
        tp = tp_result.scalar_one_or_none()
        if not tp:
            tp = TopicProgress(user_id=user_id, topic_id=topic_id, topic_name=tname)
            db.add(tp)

        tp.total_answered += total
        tp.total_correct  += correct
        tp.accuracy_pct    = round(tp.total_correct / tp.total_answered * 100, 1)
        tp.is_weak         = tp.accuracy_pct < WEAK_THRESHOLD
        tp.last_practiced  = now
        tp.topic_name      = tname  # keep in sync

    # ── 3. DailyActivity ──────────────────────────────────────────────────────
    da_result = await db.execute(
        select(DailyActivity).where(
            DailyActivity.user_id == user_id,
            DailyActivity.date == today_str,
        )
    )
    da = da_result.scalar_one_or_none()
    if not da:
        da = DailyActivity(user_id=user_id, date=today_str)
        db.add(da)

    da.tests_done      += 1
    da.questions_done  += test.total_questions
    da.minutes_studied += round((test.time_taken_seconds or 0) / 60)
    all_correct = (test.correct_count or 0)
    all_q       = test.total_questions or 1
    da.accuracy_pct = round(all_correct / all_q * 100, 1)

    await db.commit()
    print(f"✅ Progress updated for user {user_id} after test {test_id}")
