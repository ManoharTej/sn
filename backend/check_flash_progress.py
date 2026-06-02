import asyncio
import sys
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.question import Flashcard, Question
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion

# Fix for windows console unicode
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Flashcard))
        cards = res.scalars().all()
        
        new_format = 0
        old_format = 0
        
        for i, c in enumerate(cards):
            if ", and its purpose is" in c.back:
                new_format += 1
            else:
                old_format += 1
        
        print(f"Total: {len(cards)}")
        print(f"New Format (NotebookLM): {new_format}")
        print(f"Old Format (Bullets/Bold): {old_format}")
        
        # Show one new format sample
        res2 = await db.execute(select(Flashcard).where(~Flashcard.back.like('%* %'), ~Flashcard.back.like('**%')).limit(1))
        sample = res2.scalar()
        if sample:
            print(f"\n--- Sample New Format (ID {sample.id}) ---")
            print(sample.back)

if __name__ == "__main__":
    asyncio.run(check())
