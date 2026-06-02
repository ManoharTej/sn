"""
PDF Processing Service
Layers: Validation -> Extraction -> Chunking -> Topic Detection -> Storage
"""
import os
import re
import uuid
from pathlib import Path
from typing import List, Tuple
from datetime import datetime, timezone

import fitz  # PyMuPDF
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.content import ContentSource, Topic, Chunk, ProcessingStatus


# -- Chunking ------------------------------------------------------------------

def split_into_chunks(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i: i + chunk_size]
        chunks.append(" ".join(chunk_words))
        i += chunk_size - overlap
    return [c for c in chunks if len(c.strip()) > 50]  # skip tiny chunks


# -- Topic Detection -----------------------------------------------------------

# Common CSA topics used as seed keywords for topic detection
CSA_TOPICS = [
    "Access Control List", "ACL", "Business Rule", "Client Script",
    "UI Policy", "UI Action", "Workflow", "Flow Designer",
    "Service Catalog", "CMDB", "Configuration Management",
    "Incident Management", "Problem Management", "Change Management",
    "Knowledge Management", "Service Level Agreement", "SLA",
    "Notification", "Scheduled Job", "Report", "Dashboard",
    "Update Set", "Application", "Module", "Table", "Field",
    "Form", "List", "View", "Role", "Group", "User Administration",
    "Import Set", "Transform Map", "Web Service", "REST", "SOAP",
    "MID Server", "Discovery", "ITSM", "ITOM", "HR Service Delivery",
    "Performance Analytics", "Scripting", "GlideRecord", "GlideSystem",
]


def detect_topics(text: str) -> List[str]:
    """Find which CSA topics appear in the text."""
    found = []
    text_lower = text.lower()
    for topic in CSA_TOPICS:
        if topic.lower() in text_lower and topic not in found:
            found.append(topic)
    # Return up to 5 most relevant topics
    return found[:5] if found else ["General CSA Concepts"]


# -- Option & Answer Helpers ---------------------------------------------------

def _extract_options(text: str) -> List[str]:
    """Extract options supporting a)/b)/c)/d), i)/ii)/iii)/iv), A./B./C./D. formats."""
    opts = []

    # Try a) b) c) d) e) f) format
    matches = re.findall(
        r'[a-f]\)\s*(.*?)(?=\s+[a-f]\)|\n\s*(?:Ans|Answer|Correct)|$)',
        text, re.IGNORECASE | re.DOTALL
    )
    if matches:
        opts = [re.sub(r'\s+', ' ', m).strip() for m in matches if m.strip()]
        if len(opts) >= 2:
            return opts[:6]

    # Try A. B. C. D. or A) B) C) D) format (uppercase)
    matches = re.findall(
        r'[A-G][\.\)]\s*(.*?)(?=\s+[A-G][\.\)]|\n\s*(?:Ans|Answer|Correct)|$)',
        text, re.DOTALL
    )
    if matches:
        opts = [re.sub(r'\s+', ' ', m).strip() for m in matches if m.strip()]
        if len(opts) >= 2:
            return opts[:7]

    # Try i) ii) iii) iv) v) vi) format
    roman_pat = r'(?:vi|iv|v|iii|ii|i)\)\s*(.*?)(?=\s+(?:vi|iv|v|iii|ii|i)\)|\n\s*(?:Ans|Answer)|$)'
    matches = re.findall(roman_pat, text, re.IGNORECASE | re.DOTALL)
    if matches:
        opts = [re.sub(r'\s+', ' ', m).strip() for m in matches if m.strip()]
        if len(opts) >= 2:
            return opts[:6]

    return opts


def _extract_answer(text: str) -> tuple:
    """Extract correct answer letter(s) and explanation from text."""
    answer = "a"
    explanation = "Refer to ServiceNow documentation for details."

    # Pattern 1: "Correct Answer: ADEF" or "Correct Answer: ACE"
    m = re.search(r'Correct\s*Answer:\s*([A-Ga-g]+)', text, re.IGNORECASE)
    if m:
        letters = m.group(1).lower()
        answer = letters[0] if letters else "a"
        after = text[m.end():].strip()
        exp = re.search(r'(?:Explanation|Reference)[:/]?\s*(.*?)(?=\n\s*(?:QUESTION|NO\.)|\Z)', after, re.IGNORECASE | re.DOTALL)
        if exp and len(exp.group(1).strip()) > 5:
            explanation = re.sub(r'\s+', ' ', exp.group(1)).strip()[:500]
        return answer, explanation

    # Pattern 2: "Answers: A, B" or "Answers: C, D"
    m = re.search(r'Answers?:\s*([A-Ga-g](?:\s*,\s*[A-Ga-g])*)', text, re.IGNORECASE)
    if m:
        letters = re.findall(r'[A-Ga-g]', m.group(1))
        answer = letters[0].lower() if letters else "a"
        after = text[m.end():].strip()
        # Look for one-line explanation
        one_line = re.search(r'One-line:\s*(.*?)(?:\n|$)', after, re.IGNORECASE)
        if one_line:
            explanation = one_line.group(1).strip()
        elif after and len(after) > 10:
            explanation = re.sub(r'\s+', ' ', after).strip()[:500]
        return answer, explanation

    # Pattern 3: "Answer: A D" or "Answer: B"
    m = re.search(r'Answer:\s*([A-Ga-g](?:\s+[A-Ga-g])*)', text, re.IGNORECASE)
    if m:
        letters = re.findall(r'[A-Ga-g]', m.group(1))
        answer = letters[0].lower() if letters else "a"
        after = text[m.end():].strip()
        one_line = re.search(r'One-line:\s*(.*?)(?:\n|$)', after, re.IGNORECASE)
        if one_line:
            explanation = one_line.group(1).strip()
        elif after and len(after) > 10:
            explanation = re.sub(r'\s+', ' ', after).strip()[:500]
        return answer, explanation

    # Pattern 4: "Ans. A" or "Ans: B"
    m = re.search(r'Ans[\.\:]\s*([A-Ga-g])\b', text, re.IGNORECASE)
    if m:
        answer = m.group(1).lower()
        after = text[m.end():].strip()
        if after and len(after) > 10:
            explanation = re.sub(r'\s+', ' ', after).strip()[:500]
        return answer, explanation

    return answer, explanation


def _add_question(questions: list, existing_qs: set, q_text: str, opts: list, answer: str, explanation: str):
    """Add a question if it's not a duplicate and has valid data."""
    q_text = re.sub(r'\s+', ' ', q_text).strip()
    if len(q_text) < 10:
        return
    if q_text.lower() in existing_qs:
        return
    if len(opts) < 2:
        return

    questions.append({
        "question": q_text,
        "option_a": opts[0] if len(opts) > 0 else "N/A",
        "option_b": opts[1] if len(opts) > 1 else "N/A",
        "option_c": opts[2] if len(opts) > 2 else "N/A",
        "option_d": opts[3] if len(opts) > 3 else "N/A",
        "correct_answer": answer,
        "explanation": explanation,
    })
    existing_qs.add(q_text.lower())


def _parse_block(block_text: str, questions: list, existing_qs: set):
    """Parse a single question block and extract question + options + answer."""
    opt_start = None
    for pat in [r'\s*a\)', r'\s*A[\.\)]', r'\s*i\)']:
        m = re.search(pat, block_text, re.IGNORECASE)
        if m:
            opt_start = m.start()
            break

    if opt_start is None:
        return

    q_text = block_text[:opt_start].strip()
    options_block = block_text[opt_start:]
    opts = _extract_options(options_block)
    answer, explanation = _extract_answer(options_block)
    _add_question(questions, existing_qs, q_text, opts, answer, explanation)


# -- Main Local Extractor ------------------------------------------------------

def parse_local_questions(text: str) -> List[dict]:
    """
    Multi-strategy local question extractor. NO AI used.
    Handles ALL PDF formats found in CSA study materials:
      FORMAT 1: "1." / "2." / "84." numbered questions
      FORMAT 2: "NO.1" / "NO.2" exam dump format
      FORMAT 3: "QUESTION 152" uppercase format
      FORMAT 4: "Question N" mixed-case format
      FORMAT 5: Q&A short-answer ("84. question?  Ans. answer")
      FORMAT 6: Standalone Q&A at end of documents
    Options: a)/b)/c)/d), A./B./C./D., i)/ii)/iii)/iv)
    Answers: "Answer: B", "Ans. A", "Correct Answer: ADEF", "Answers: A, B"
    """
    questions = []
    existing_qs = set()

    # Normalize text
    text = re.sub(r'\r\n', '\n', text)

    # -- STRATEGY 1: Numbered questions "1." / "2." --
    blocks = re.split(r'\n(?=\d{1,3}\.\s)', text)
    for block in blocks:
        block = block.strip()
        m = re.match(r'^(\d{1,3})\.\s*(.*)', block, re.DOTALL)
        if not m:
            continue
        rest = m.group(2).strip()

        # Check if this block has MCQ options
        has_opts = re.search(r'\n\s*(?:[a-f]\)|[A-G][\.\)]|(?:i{1,3}v?|iv|v|vi)\))', rest, re.IGNORECASE)
        if has_opts:
            _parse_block(rest, questions, existing_qs)
        else:
            # Q&A format: "84. DB name?\nAns. U_tbl" -> save as flashcard-style
            ans_m = re.search(r'\n\s*(?:Ans[\.\:])\s*(.*)', rest, re.IGNORECASE | re.DOTALL)
            if ans_m:
                q_line = rest[:ans_m.start()].strip()
                ans_text = ans_m.group(1).strip().split('\n')[0].strip()
                q_line = re.sub(r'\s+', ' ', q_line).strip()
                if len(q_line) > 10 and len(ans_text) > 1 and q_line.lower() not in existing_qs:
                    questions.append({
                        "question": q_line,
                        "option_a": ans_text,
                        "option_b": "Not applicable",
                        "option_c": "None of the above",
                        "option_d": "All of the above",
                        "correct_answer": "a",
                        "explanation": f"The answer is: {ans_text}",
                    })
                    existing_qs.add(q_line.lower())

    # -- STRATEGY 2: "NO.1" / "NO.2" exam dump --
    blocks2 = re.split(r'\n(?=NO\.\d+\s)', text)
    for block in blocks2:
        block = block.strip()
        m = re.match(r'^NO\.(\d+)\s+(.*)', block, re.DOTALL)
        if not m:
            continue
        _parse_block(m.group(2).strip(), questions, existing_qs)

    # -- STRATEGY 3: "QUESTION 152" uppercase format --
    blocks3 = re.split(r'\n(?=QUESTION\s+\d+)', text)
    for block in blocks3:
        block = block.strip()
        m = re.match(r'^QUESTION\s+(\d+)\s*(.*)', block, re.DOTALL)
        if not m:
            continue
        _parse_block(m.group(2).strip(), questions, existing_qs)

    # -- STRATEGY 4: "Question N" mixed-case format --
    blocks4 = re.split(r'\n(?=Question\s+\d+)', text, flags=re.IGNORECASE)
    for block in blocks4:
        block = block.strip()
        m = re.match(r'^Question\s+(\d+)[\.:\-]?\s*(.*)', block, re.IGNORECASE | re.DOTALL)
        if not m:
            continue
        _parse_block(m.group(2).strip(), questions, existing_qs)

    # -- STRATEGY 5: Standalone Q&A at end of documents --
    # Matches lines ending with "?" followed by a short answer on the next line
    standalone = re.findall(
        r'\n([A-Z][^\n]{15,}?\?)\s*\n([A-Z][^\n]{2,80})\s*\n',
        text
    )
    for q_line, ans_line in standalone:
        q_line = q_line.strip()
        ans_line = ans_line.strip()
        if q_line.lower() not in existing_qs and not re.match(r'^[A-G][\.\)]', ans_line):
            questions.append({
                "question": q_line,
                "option_a": ans_line,
                "option_b": "Not applicable",
                "option_c": "None of the above",
                "option_d": "All of the above",
                "correct_answer": "a",
                "explanation": f"The answer is: {ans_line}",
            })
            existing_qs.add(q_line.lower())

    print(f"  [Extractor] Total unique questions parsed: {len(questions)}")
    return questions


# -- Main Processing Pipeline --------------------------------------------------

async def process_pdf(content_source_id: int, file_path: str, db: AsyncSession):
    # Mark as processing
    result = await db.execute(select(ContentSource).where(ContentSource.id == content_source_id))
    source = result.scalar_one_or_none()
    if not source:
        return

    try:
        source.status = ProcessingStatus.processing
        await db.commit()

        # Layer 2: PDF Extraction
        doc = fitz.open(file_path)
        full_text = ""
        page_texts = []
        for page_num, page in enumerate(doc, start=1):
            page_text = page.get_text("text")
            if page_text.strip():
                page_texts.append((page_num, page_text))
                full_text += page_text + "\n"
        doc.close()

        if not full_text.strip():
            raise ValueError("No extractable text found in PDF")

        # Layer 3: Chunking
        all_chunks = []
        chunk_idx = 0
        for page_num, page_text in page_texts:
            page_chunks = split_into_chunks(page_text, chunk_size=400, overlap=50)
            for c in page_chunks:
                all_chunks.append((chunk_idx, c, page_num))
                chunk_idx += 1

        # Layer 4: Topic Detection
        detected_topic_names = detect_topics(full_text)
        topic_objects = {}
        for topic_name in detected_topic_names:
            topic = Topic(content_source_id=content_source_id, user_id=source.user_id, name=topic_name)
            db.add(topic)
            await db.flush()
            topic_objects[topic_name] = topic

        # Layer 5: Store chunks for Tutor RAG
        for chunk_idx, chunk_text, page_num in all_chunks:
            chunk_lower = chunk_text.lower()
            assigned_topic = next((tobj for tname, tobj in topic_objects.items() if tname.lower() in chunk_lower), None)
            
            chunk = Chunk(
                content_source_id=content_source_id,
                topic_id=assigned_topic.id if assigned_topic else None,
                text=chunk_text,
                chunk_index=chunk_idx,
                page_number=page_num,
                chroma_id=str(uuid.uuid4()),
            )
            db.add(chunk)

        # FAST LOCAL EXTRACTION (NO AI)
        local_questions = parse_local_questions(full_text)
        
        if local_questions:
            print(f"  Fast Local Extraction found {len(local_questions)} questions! Skipping AI.")
            from app.models.question import Question, Flashcard, DifficultyLevel, GeneratedBy
            
            # Prevent duplicates locally
            existing_q_result = await db.execute(select(Question.question_text).where(Question.user_id == source.user_id))
            existing_questions = {q.lower() for q in existing_q_result.scalars().all()}
            
            added_count = 0
            for q_data in local_questions:
                if q_data["question"].lower() in existing_questions:
                    continue
                
                # Auto-detect scenario
                text_lower = q_data["question"].lower()
                scenario_keywords = ['user', 'administrator', 'wants to', 'needs to', 'how would you', 'company', 'client', 'suppose', 'scenario', 'manager']
                is_scenario = any(kw in text_lower for kw in scenario_keywords) or len(q_data["question"]) > 180
                
                # Check if it needs AI enrichment (Issue 1 & 2)
                # If option_b is "Not applicable", it was a short Q&A
                if q_data.get("option_b") == "Not applicable":
                    from app.services.mcq_service import enrich_question, simplify_flashcard_answer
                    enriched = await enrich_question(q_data["question"], q_data["option_a"], is_scenario)
                    if enriched:
                        q_data.update(enriched)
                
                db_q = Question(
                    user_id=source.user_id,
                    content_source_id=source.id,
                    question_text=q_data["question"],
                    option_a=q_data["option_a"],
                    option_b=q_data["option_b"],
                    option_c=q_data["option_c"],
                    option_d=q_data["option_d"],
                    correct_answer=q_data["correct_answer"],
                    explanation=q_data["explanation"],
                    difficulty_level=DifficultyLevel.medium,
                    is_scenario_based=is_scenario,
                    generated_by=GeneratedBy.uploaded,
                )
                db.add(db_q)
                await db.flush()
                
                # Use simplified flashcard answer service
                ans_map = {'a': db_q.option_a, 'b': db_q.option_b, 'c': db_q.option_c, 'd': db_q.option_d}
                correct_text = ans_map.get(db_q.correct_answer.lower(), db_q.option_a)
                
                simplified_back = await simplify_flashcard_answer(
                    db_q.question_text,
                    correct_text,
                    db_q.explanation
                )

                flashcard = Flashcard(
                    user_id=source.user_id,
                    question_id=db_q.id,
                    front=db_q.question_text,
                    back=simplified_back,
                    next_review_date=datetime.now(timezone.utc),
                )
                db.add(flashcard)
                existing_questions.add(q_data["question"].lower())
                added_count += 1
            
            source.total_questions = added_count
            source.status = ProcessingStatus.completed
            source.total_chunks = len(all_chunks)
            source.processed_at = datetime.now(timezone.utc)
            await db.commit()
            print(f"  Saved {added_count} unique questions to database.")
        else:
            print("No structured questions found locally. Falling back to AI generation...")
            source.status = ProcessingStatus.completed
            source.total_chunks = len(all_chunks)
            source.processed_at = datetime.now(timezone.utc)
            await db.commit()
            
            from app.api.routes.questions import _generate_and_store
            await _generate_and_store(source.id, max_per_chunk=3, user_id=source.user_id)

    except Exception as e:
        source.status = ProcessingStatus.failed
        source.error_message = str(e)
        await db.commit()
        print(f"PDF processing failed: {e}")
