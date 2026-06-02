import json
import re
from typing import Optional
from app.services.mcq_service import call_llm

CLEAN_QUESTION_TEMPLATE = """
You are an expert ServiceNow instructor. I have a question from a database that might have been poorly extracted from a PDF.
The options might be merged, have prefixes like 'a)', or contain garbage text.

RAW DATA:
Question: {question}
A: {a}
B: {b}
C: {c}
D: {d}
Current Correct Letter: {correct}
Explanation: {explanation}

TASK:
1. Clean the question text.
2. Provide 4 distinct, clear options. Remove any 'a)', 'b)', etc. prefixes from the text.
3. Identify the CORRECT letter (a, b, c, or d) based on the explanation and the question context.
4. Ensure the explanation is professional and matches the correct answer.
5. If the original options were merged (e.g., A contains both A and B), split them correctly.
6. If an option was 'N/A', generate a plausible distractor instead.

RETURN ONLY VALID JSON:
{{
  "question": "...",
  "option_a": "...",
  "option_b": "...",
  "option_c": "...",
  "option_d": "...",
  "correct_answer": "a/b/c/d",
  "explanation": "..."
}}
"""

async def fix_question_data(q_data: dict) -> Optional[dict]:
    prompt = CLEAN_QUESTION_TEMPLATE.format(
        question=q_data['question_text'],
        a=q_data['option_a'],
        b=q_data['option_b'],
        c=q_data['option_c'],
        d=q_data['option_d'],
        correct=q_data['correct_answer'],
        explanation=q_data['explanation']
    )
    
    try:
        raw = await call_llm(prompt)
        # Extract JSON
        raw = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start == -1 or end == 0: return None
        
        return json.loads(raw[start:end])
    except Exception as e:
        print(f"Error fixing question {q_data.get('id')}: {e}")
        return None
