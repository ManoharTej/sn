import asyncio
import re
import os
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.question import Question, Flashcard
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion
from app.services.mcq_service import enrich_question

async def fix_poor_questions():
    """
    Find questions with placeholder options or explanations and enrich them using AI.
    """
    print("Starting Question Data Cleanup...")
    async with AsyncSessionLocal() as db:
        # 1. Find questions with "Not applicable" or placeholder explanations
        result = await db.execute(
            select(Question).where(
                (Question.option_b == "Not applicable") | 
                (Question.explanation.like("%refer to%")) |
                (Question.option_a.like("%b)%")) # Issue 3: merged options
            )
        )
        questions = result.scalars().all()
        print(f"Found {len(questions)} questions needing fix.")

        for q in questions:
            print(f"Fixing Question ID {q.id}: {q.question_text[:50]}...")
            
            # Extract actual answer text if it was merged in option_a
            # e.g. "a) Answer A b) Answer B"
            correct_text = q.option_a
            if "b)" in q.option_a.lower():
                # Try to extract the first part
                m = re.search(r'[a-a]\)\s*(.*?)(?=\s+[b-f]\)|$)', q.option_a, re.IGNORECASE)
                if m:
                    correct_text = m.group(1).strip()
                else:
                    # Just take everything before "b)"
                    parts = re.split(r'\s+[b-f]\)', q.option_a, flags=re.IGNORECASE)
                    correct_text = parts[0].replace("a)", "").strip()

            # Enrich using AI
            enriched = await enrich_question(q.question_text, correct_text, q.is_scenario_based)
            
            if enriched:
                q.option_a = enriched["option_a"]
                q.option_b = enriched["option_b"]
                q.option_c = enriched["option_c"]
                q.option_d = enriched["option_d"]
                q.correct_answer = enriched["correct_answer"]
                q.explanation = enriched["explanation"]
                
                # Update linked flashcard too
                flash_result = await db.execute(select(Flashcard).where(Flashcard.question_id == q.id))
                flash = flash_result.scalar_one_or_none()
                if flash:
                    flash.back = enriched["explanation"]
                
                print(f"  Enriched successfully.")
                await db.commit() # Commit after each success to avoid long locks
            else:
                print(f"  Enrichment failed.")
            
            await asyncio.sleep(1) # Rate limit protection

        print("Cleanup complete!")

if __name__ == "__main__":
    asyncio.run(fix_poor_questions())
