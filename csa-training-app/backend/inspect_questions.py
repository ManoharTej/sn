import asyncio
import sys
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.question import Question, Flashcard
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion

# Fix for windows console unicode
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Question).where(Question.id == 873))
        qs = res.scalars().all()
        for q in qs:
            print(f"--- ID: {q.id} ---")
            print(f"Q: {q.question_text}")
            print(f"A: {q.option_a}")
            print(f"B: {q.option_b}")
            print(f"C: {q.option_c}")
            print(f"D: {q.option_d}")
            print(f"Correct: {q.correct_answer}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check())
