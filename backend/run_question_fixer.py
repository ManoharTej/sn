import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.question import Question, Flashcard
from app.models.content import Topic, ContentSource, Chunk
from app.models.user import User
from app.models.test import MockTest, TestQuestion
from app.services.question_fixer import fix_question_data

async def process_fixes():
    async with AsyncSessionLocal() as db:
        # Find suspect questions
        # 1. Options containing prefixes like a) b)
        # 2. Options being N/A or empty
        # 3. Correct answer being invalid
        res = await db.execute(select(Question))
        all_qs = res.scalars().all()
        
        suspects = []
        for q in all_qs:
            is_suspect = False
            opts = [q.option_a, q.option_b, q.option_c, q.option_d]
            
            # Check for N/A or empty
            if any(o in [None, '', 'N/A', 'n/a', 'None'] for o in opts):
                is_suspect = True
            
            # Check for prefixes in text
            if any(re.search(r'[a-d]\)', str(o)) for o in opts if o):
                is_suspect = True
                
            # Check correct answer
            if q.correct_answer not in ['a', 'b', 'c', 'd']:
                is_suspect = True
                
            if is_suspect:
                suspects.append(q)

        print(f"Found {len(suspects)} suspect questions out of {len(all_qs)}.", flush=True)
        
        for i, q in enumerate(suspects):
            print(f"[{i+1}/{len(suspects)}] Fixing ID {q.id}...", flush=True)
            
            q_data = {
                'id': q.id,
                'question_text': q.question_text,
                'option_a': q.option_a,
                'option_b': q.option_b,
                'option_c': q.option_c,
                'option_d': q.option_d,
                'correct_answer': q.correct_answer,
                'explanation': q.explanation
            }
            
            fixed = await fix_question_data(q_data)
            if fixed:
                q.question_text = fixed['question']
                q.option_a = fixed['option_a']
                q.option_b = fixed['option_b']
                q.option_c = fixed['option_c']
                q.option_d = fixed['option_d']
                q.correct_answer = fixed['correct_answer'].lower()
                q.explanation = fixed['explanation']
                
                await db.commit()
                print(f"  Fixed ID {q.id}")
            else:
                print(f"  Failed to fix ID {q.id}")
            
            # Sleep briefly to avoid aggressive rate limiting
            await asyncio.sleep(1)

import re
if __name__ == "__main__":
    asyncio.run(process_fixes())
