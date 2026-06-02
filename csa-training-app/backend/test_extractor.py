"""Detailed test showing format breakdown per PDF."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

import fitz
from app.services.pdf_service import parse_local_questions

upload_dir = "uploads"
for fname in sorted(os.listdir(upload_dir)):
    if not fname.endswith(".pdf"):
        continue
    path = os.path.join(upload_dir, fname)
    doc = fitz.open(path)
    page_count = len(doc)
    text = ""
    for page in doc:
        text += page.get_text("text")
    doc.close()

    questions = parse_local_questions(text)

    # Categorize
    mcq_with_answer = 0
    mcq_default_ans = 0
    qa_flashcard = 0
    scenario_count = 0

    for q in questions:
        if q["option_b"] == "Not applicable":
            qa_flashcard += 1
        elif q["correct_answer"] == "a" and q["explanation"] == "Refer to ServiceNow documentation for details.":
            mcq_default_ans += 1
        else:
            mcq_with_answer += 1
        
        # Check scenario
        text_lower = q["question"].lower()
        kws = ['user', 'administrator', 'wants to', 'needs to', 'how would you', 'company', 'client', 'suppose', 'scenario', 'manager']
        if any(kw in text_lower for kw in kws) or len(q["question"]) > 180:
            scenario_count += 1

    print(f"\n{'='*60}")
    print(f"PDF: {fname}")
    print(f"Pages: {page_count}")
    print(f"{'='*60}")
    print(f"  TOTAL Questions:         {len(questions)}")
    print(f"  MCQ with answer:         {mcq_with_answer}")
    print(f"  MCQ (default answer):    {mcq_default_ans}")
    print(f"  Q&A flashcards:          {qa_flashcard}")
    print(f"  Scenario-based:          {scenario_count}")
    print()

    # Show 5 samples of different types
    print("  --- MCQ Sample ---")
    for q in questions[:3]:
        if q["option_b"] != "Not applicable":
            print(f"    Q: {q['question'][:80]}")
            print(f"    A) {q['option_a'][:40]}  B) {q['option_b'][:40]}")
            print(f"    Answer: {q['correct_answer']}  |  Explanation: {q['explanation'][:60]}")
            print()

    print("  --- Q&A Flashcard Sample ---")
    for q in questions:
        if q["option_b"] == "Not applicable":
            print(f"    Q: {q['question'][:80]}")
            print(f"    A: {q['option_a'][:80]}")
            print()
            break
