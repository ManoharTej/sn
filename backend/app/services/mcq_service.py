"""
MCQ Generation Service — Uses free LLM (Groq / Gemini / Ollama)
Generates 2-3 MCQs per text chunk with explanation + difficulty
"""
import json
import re
from typing import List, Optional
from app.config import settings


# ── LLM Client Factory ────────────────────────────────────────────────────────

def get_llm_client():
    provider = settings.LLM_PROVIDER.lower()
    if provider == "groq":
        from groq import Groq
        return Groq(api_key=settings.GROQ_API_KEY), provider
    elif provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        return genai.GenerativeModel(settings.GEMINI_MODEL), provider
    elif provider == "ollama":
        return None, provider
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")


MCQ_SYSTEM_PROMPT = """You are an expert ServiceNow CSA certification trainer.
Generate multiple choice questions (MCQs) for CSA exam preparation.
Return ONLY valid JSON — no markdown, no extra text.
"""

MCQ_USER_TEMPLATE = """Based on this ServiceNow content, output {count} highly-complex, scenario-based MCQ questions.

CONTENT:
{content}

TOPIC: {topic}

IMPORTANT INSTRUCTION:
1. IF THE CONTENT CONTAINS PRE-WRITTEN EXAM QUESTIONS: You MUST extract ALL of them exactly as they are. Ignore the {count} limit and extract every single question found in the text.
2. IF THE CONTENT IS JUST STUDY MATERIAL (THEORY): Generate {count} NEW, highly-complex, real-world scenario questions based on the text. Do not generate simple definitions.
3. Ensure the questions focus strictly on the specific details in this chunk to avoid repeating questions generated from other parts of the document.

Return a JSON array like this (ONLY the array, no other text):
[
  {{
    "question": "Question text here?",
    "option_a": "First option",
    "option_b": "Second option", 
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct_answer": "a",
    "explanation": "Explanation of why the answer is correct.",
    "difficulty": "easy",
    "is_scenario_based": false
  }}
]

Rules:
- difficulty must be "medium" or "hard"
- correct_answer must be exactly "a", "b", "c", or "d"
- All options must be plausible (no obviously wrong answers)
- Explanation must cite the concept clearly and explain why other options are wrong.
- is_scenario_based: MUST be true if the question represents a real-world scenario (e.g. "A user reports...", "You need to..."), otherwise false.
- Ensure questions are accurate and deeply relevant to ServiceNow CSA.
"""


def _call_groq(client, prompt: str, system: str) -> str:
    response = client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
        temperature=0.7,
        max_tokens=2000,
    )
    return response.choices[0].message.content


def _call_gemini(client, prompt: str, system: str) -> str:
    full = f"{system}\n\n{prompt}"
    response = client.generate_content(full)
    return response.text


def _call_ollama(prompt: str, system: str) -> str:
    import httpx
    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": prompt},
        ],
        "stream": False,
    }
    resp = httpx.post(f"{settings.OLLAMA_BASE_URL}/api/chat", json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def _parse_mcq_response(raw: str) -> List[dict]:
    """Extract JSON array from LLM response, handle markdown code fences."""
    # Strip markdown code fences
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    raw = raw.strip("`").strip()

    # Find the JSON array
    start = raw.find("[")
    end = raw.rfind("]") + 1
    if start == -1 or end == 0:
        return []

    try:
        data = json.loads(raw[start:end])
        return data if isinstance(data, list) else []
    except json.JSONDecodeError:
        return []


def _validate_mcq(mcq: dict) -> bool:
    required = ["question", "option_a", "option_b", "option_c", "option_d",
                "correct_answer", "explanation", "difficulty"]
    if not all(k in mcq for k in required):
        return False
    if mcq["correct_answer"] not in ("a", "b", "c", "d"):
        return False
    if mcq["difficulty"] not in ("easy", "medium", "hard"):
        return False
    if not mcq["question"].strip() or not mcq["explanation"].strip():
        return False
    return True


async def generate_mcqs_for_chunk(
    chunk_text: str,
    topic_name: str = "General CSA",
    count: int = 2,
) -> List[dict]:
    """
    Generate MCQs for a text chunk using the configured free LLM.
    Returns list of validated MCQ dicts.
    """
    try:
        client, provider = get_llm_client()
        prompt = MCQ_USER_TEMPLATE.format(
            count=count,
            content=chunk_text[:2000],  # Limit chunk size for token economy
            topic=topic_name,
        )

        if provider == "groq":
            raw = _call_groq(client, prompt, MCQ_SYSTEM_PROMPT)
        elif provider == "gemini":
            raw = _call_gemini(client, prompt, MCQ_SYSTEM_PROMPT)
        elif provider == "ollama":
            raw = _call_ollama(prompt, MCQ_SYSTEM_PROMPT)
        else:
            return []

        mcqs = _parse_mcq_response(raw)
        valid = [m for m in mcqs if _validate_mcq(m)]
        return valid

    except Exception as e:
        print(f"MCQ generation failed: {e}")
        return []
