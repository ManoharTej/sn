import asyncio
import random
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.question import Question, Flashcard
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion

async def randomize_all_options():
    """
    Iterate through all questions and randomize the positions of option_a through option_d.
    Updates the correct_answer field to point to the new correct position.
    """
    print("Starting MCQ Option Randomization...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Question))
        questions = result.scalars().all()
        print(f"Found {len(questions)} questions to randomize.")

        for i, q in enumerate(questions):
            # Map of current options
            opts = {
                'a': q.option_a,
                'b': q.option_b,
                'c': q.option_c,
                'd': q.option_d
            }
            
            # Find the text of the correct answer
            correct_text = opts.get(q.correct_answer.lower())
            if not correct_text:
                continue
                
            # Create a list of option values
            opt_values = list(opts.values())
            # Shuffle them
            random.shuffle(opt_values)
            
            # Update question with shuffled values
            q.option_a = opt_values[0]
            q.option_b = opt_values[1]
            q.option_c = opt_values[2]
            q.option_d = opt_values[3]
            
            # Find new correct letter
            new_opts = {'a': q.option_a, 'b': q.option_b, 'c': q.option_c, 'd': q.option_d}
            for letter, val in new_opts.items():
                if val == correct_text:
                    q.correct_answer = letter
                    break
            
            if (i + 1) % 100 == 0:
                print(f"Processed {i + 1}/{len(questions)} questions...")
                await db.commit()

        await db.commit()
    print("MCQ Option Randomization complete!")

if __name__ == "__main__":
    asyncio.run(randomize_all_options())
