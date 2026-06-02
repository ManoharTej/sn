import asyncio
from app.db.session import AsyncSessionLocal
from sqlalchemy import select, func
from app.models.question import Question, Flashcard
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(func.count(Question.id)))
        total = res.scalar()
        print(f"Total questions in DB: {total}")
        
        res2 = await db.execute(select(func.count(Question.id)).where(Question.user_id == 1))
        user1 = res2.scalar()
        print(f"User 1 questions in DB: {user1}")

        res_f = await db.execute(select(func.count(Flashcard.id)))
        print(f"Total flashcards in DB: {res_f.scalar()}")

        res_dist = await db.execute(select(Question.correct_answer, func.count(Question.id)).group_by(Question.correct_answer))
        print("Correct Answer Distribution:")
        for r in res_dist.all():
            print(f"  {r[0]}: {r[1]}")
        
        # Check domains
        res3 = await db.execute(select(Question.domain, func.count(Question.id)).group_by(Question.domain))
        domains = res3.all()
        print("Domains and counts:")
        for d in domains:
            print(f"  {d[0]}: {d[1]}")

if __name__ == "__main__":
    asyncio.run(check())
