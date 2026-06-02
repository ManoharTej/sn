import asyncio
from sqlalchemy import select, func
from app.db.session import AsyncSessionLocal
from app.models.question import Question, Flashcard
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Question.domain, func.count(Question.id)).where(Question.option_a == 'N/A').group_by(Question.domain))
        results = res.all()
        print("Domains with N/A options:")
        for r in results:
            print(f"{r[0]}: {r[1]}")

if __name__ == "__main__":
    asyncio.run(check())
