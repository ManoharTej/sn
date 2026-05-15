"""
AI Tutor Service — RAG (Retrieval Augmented Generation)
Flow: User question → Semantic search chunks → LLM answers with context
Uses the same free LLM provider configured in .env (Groq recommended)
"""
import re
from typing import List, Optional
from app.config import settings


TUTOR_SYSTEM_PROMPT = """You are an expert ServiceNow CSA certification tutor, acting with the full worldly knowledge of an advanced AI like ChatGPT.
Your job is to help students understand ServiceNow concepts and prepare for the CSA exam.

Rules:
- Answer deeply, clearly, and concisely, using all of your AI knowledge about ServiceNow.
- Use simple language; explain jargon.
- Reference the provided study material snippets when relevant, but NEVER limit your answer to just those snippets. If the snippets are incomplete, fill in the blanks with your own vast knowledge.
- Format answers with bullet points or numbered steps when helpful.
- End with a 1-line "Key takeaway:" summary.
"""

TUTOR_USER_TEMPLATE = """Student question: {question}

Relevant study material snippets from the user's library:
---
{context}
---

Please answer the student's question comprehensively. Use the snippets above as a helpful reference, but DO NOT restrict yourself to them. Use your full ChatGPT-level knowledge of ServiceNow to provide a deep, accurate, and helpful answer.
"""

NO_CONTEXT_TEMPLATE = """Student question: {question}

(No study material uploaded yet — answering from general ServiceNow knowledge)

Please answer based on your ServiceNow CSA exam knowledge."""


def _get_client_and_provider():
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
    raise ValueError(f"Unknown provider: {provider}")


def _call_llm(client, provider: str, system: str, user: str) -> str:
    if provider == "groq":
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            temperature=0.5,
            max_tokens=1200,
        )
        return resp.choices[0].message.content

    elif provider == "gemini":
        full = f"{system}\n\n{user}"
        resp = client.generate_content(full)
        return resp.text

    elif provider == "ollama":
        import httpx
        payload = {
            "model": settings.OLLAMA_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            "stream": False,
        }
        r = httpx.post(f"{settings.OLLAMA_BASE_URL}/api/chat", json=payload, timeout=120)
        r.raise_for_status()
        return r.json()["message"]["content"]

    return "LLM provider not configured."


async def simple_keyword_search(
    question: str,
    chunks: List,    # list of Chunk ORM objects
    top_k: int = 4,
) -> List[str]:
    """
    Lightweight keyword-based retrieval (no vector DB needed).
    Scores chunks by how many question words they contain.
    """
    question_words = set(re.sub(r'[^\w\s]', '', question.lower()).split())
    stop_words = {'what', 'how', 'why', 'is', 'are', 'the', 'a', 'an', 'in', 'of', 'to', 'and', 'or', 'can', 'do', 'does'}
    keywords = question_words - stop_words

    scored = []
    for chunk in chunks:
        text_lower = chunk.text.lower()
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scored.append((score, chunk.text))

    scored.sort(key=lambda x: -x[0])
    return [text for _, text in scored[:top_k]]


async def answer_question(
    question: str,
    context_chunks: Optional[List[str]] = None,
    conversation_history: Optional[List[dict]] = None,
) -> str:
    """
    Main tutor entry point.
    context_chunks: retrieved text snippets from user's PDFs
    conversation_history: list of {role, content} for multi-turn
    """
    try:
        client, provider = _get_client_and_provider()

        if context_chunks:
            context = "\n\n---\n\n".join(context_chunks[:4])
            user_prompt = TUTOR_USER_TEMPLATE.format(
                question=question,
                context=context[:3000],
            )
        else:
            user_prompt = NO_CONTEXT_TEMPLATE.format(question=question)

        # Build messages with history for multi-turn
        messages = [{"role": "system", "content": TUTOR_SYSTEM_PROMPT}]
        if conversation_history:
            for msg in conversation_history[-6:]:   # keep last 3 turns
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_prompt})

        if provider == "groq":
            from groq import Groq
            resp = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                temperature=0.5,
                max_tokens=1200,
            )
            return resp.choices[0].message.content

        elif provider == "gemini":
            # Gemini doesn't support multi-turn the same way — flatten
            full = TUTOR_SYSTEM_PROMPT + "\n\n" + user_prompt
            resp = client.generate_content(full)
            return resp.text

        elif provider == "ollama":
            import httpx
            payload = {
                "model": settings.OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
            }
            r = httpx.post(f"{settings.OLLAMA_BASE_URL}/api/chat", json=payload, timeout=120)
            r.raise_for_status()
            return r.json()["message"]["content"]
        else:
            return _call_llm(client, provider, TUTOR_SYSTEM_PROMPT, user_prompt)

    except Exception as e:
        return f"⚠️ AI Tutor error: {str(e)}\n\nPlease check your API key and try again."
