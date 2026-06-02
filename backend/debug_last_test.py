import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.question import Question, Flashcard
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion, TestStatus

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(MockTest)
            .order_by(MockTest.completed_at.desc())
            .limit(1)
        )
        test = res.scalar()
        if not test:
            print("No completed tests found.")
            return
            
        print(f"Test ID: {test.id}, Title: {test.title}, Score: {test.score_percent}%")
        
        res2 = await db.execute(
            select(TestQuestion)
            .where(TestQuestion.test_id == test.id)
        )
        tqs = res2.scalars().all()
        
        print(f"Total TestQuestions: {len(tqs)}")
        correct = 0
        wrong = 0
        skipped = 0
        
        for tq in tqs:
            q = await db.get(Question, tq.question_id)
            if tq.is_correct is True: correct += 1
            elif tq.is_correct is False: wrong += 1
            else: skipped += 1
            
            # Print some details for wrong/skipped
            if tq.is_correct is not True:
                print(f"QID {q.id}: Correct='{q.correct_answer}', User='{tq.user_answer}', Status={'Wrong' if tq.is_correct is False else 'Skipped'}")

        print(f"Summary: Correct={correct}, Wrong={wrong}, Skipped={skipped}")

if __name__ == "__main__":
    asyncio.run(check())
