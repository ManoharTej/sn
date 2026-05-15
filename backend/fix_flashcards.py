import asyncio
from app.db.session import AsyncSessionLocal
from app.models.question import Question, Flashcard
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from sqlalchemy import select

async def fix_flashcards():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Flashcard))
        cards = result.scalars().all()
        for card in cards:
            if "Answer: " in card.back and ") " in card.back:
                # E.g. Answer: B) text \n\n Explanation
                parts = card.back.split(") ", 1)
                if len(parts) > 1:
                    actual_text = parts[1]
                    card.back = f"Correct Answer: {actual_text}"
        await db.commit()
        print(f"Fixed {len(cards)} flashcards.")

if __name__ == "__main__":
    asyncio.run(fix_flashcards())
