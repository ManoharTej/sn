import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.question import Question, Flashcard
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Question).where(~Question.correct_answer.in_(['a', 'b', 'c', 'd'])))
        bad = res.scalars().all()
        print(f"Questions with non-letter correct_answer: {len(bad)}")
        for b in bad[:10]:
            print(f"ID {b.id}: Answer='{b.correct_answer}'")

if __name__ == "__main__":
    asyncio.run(check())
