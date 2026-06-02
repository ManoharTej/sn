import asyncio
import os
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.question import Question, Flashcard
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion
from app.services.mcq_service import simplify_flashcard_answer

async def prepare_all_flashcards():
    """
    Iterate through all questions and create/update flashcards with simplified answers.
    """
    print("Starting Flashcard Preparation (Simplified Mode)...")
    async with AsyncSessionLocal() as db:
        # Get all questions
        res = await db.execute(select(Question))
        questions = res.scalars().all()
        
        # Sort so that "suspect" or "placeholder" cards are processed first
        def priority(q):
            if q.explanation and "Refer to ServiceNow documentation" in q.explanation:
                return 0
            return 1
            
        questions.sort(key=priority)

        print(f"Found {len(questions)} questions to process.")

        for i, q in enumerate(questions):
            # Check if flashcard exists
            f_result = await db.execute(select(Flashcard).where(Flashcard.question_id == q.id))
            flash = f_result.scalar_one_or_none()
            
            # FORCE UPDATE to the new natural format
            print(f"[{i+1}/{len(questions)}] Processing ID {q.id}...", flush=True)
            
            # Get correct answer text
            ans_map = {'a': q.option_a, 'b': q.option_b, 'c': q.option_c, 'd': q.option_d}
            correct_text = ans_map.get(q.correct_answer.lower(), q.option_a)
            
            # Simplify
            simplified_back = await simplify_flashcard_answer(
                q.question_text, 
                correct_text, 
                q.explanation
            )
            
            if not simplified_back:
                print(f"Skipping update for ID {q.id} due to AI error/rate limit.")
                continue
            
            if flash:
                flash.front = q.question_text
                flash.back = simplified_back
            else:
                flash = Flashcard(
                    user_id=q.user_id,
                    question_id=q.id,
                    front=q.question_text,
                    back=simplified_back
                )
                db.add(flash)
            
            # Commit after each one to keep DB responsive
            await db.commit()
            
            # Wait a bit for rate limits
            await asyncio.sleep(0.5)

    print("Flashcard preparation complete!")

if __name__ == "__main__":
    asyncio.run(prepare_all_flashcards())
