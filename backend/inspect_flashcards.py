import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.question import Flashcard, Question
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Flashcard).limit(100))
        cards = res.scalars().all()
        for c in cards:
            print(f"--- ID: {c.id} ---")
            print(f"Front: {c.front}")
            print(f"Back: {c.back}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check())
