"""
End-to-end test: Upload a PDF, watch the processing, check questions.
Tests the FULL pipeline locally.
"""
import asyncio
import sys
import os

# Ensure we can import from the app
sys.path.insert(0, os.path.dirname(__file__))

async def main():
    # Step 1: Check if Groq API key works
    print("=" * 60)
    print("STEP 1: Testing LLM Provider (Groq)")
    print("=" * 60)
    try:
        from app.config import settings
        print(f"  Provider: {settings.LLM_PROVIDER}")
        print(f"  Groq Model: {settings.GROQ_MODEL}")
        print(f"  Groq Key: {settings.GROQ_API_KEY[:20]}...")
        
        if settings.LLM_PROVIDER == "groq":
            from groq import Groq
            client = Groq(api_key=settings.GROQ_API_KEY)
            resp = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[{"role": "user", "content": "Say 'hello' in one word."}],
                max_tokens=10,
            )
            print(f"  Groq response: {resp.choices[0].message.content}")
            print("  Groq API: WORKING")
        elif settings.LLM_PROVIDER == "ollama":
            import httpx
            r = httpx.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={"model": settings.OLLAMA_MODEL, "messages": [{"role": "user", "content": "Say hello"}], "stream": False},
                timeout=30,
            )
            print(f"  Ollama response: {r.json()['message']['content'][:50]}")
            print("  Ollama: WORKING")
    except Exception as e:
        print(f"  LLM ERROR: {e}")

    # Step 2: Test PDF extraction
    print("\n" + "=" * 60)
    print("STEP 2: Testing PDF Text Extraction")
    print("=" * 60)
    
    upload_dir = settings.UPLOAD_DIR
    pdf_files = []
    
    # Also check if user has any PDFs anywhere we can use
    for root, dirs, files in os.walk(upload_dir):
        for f in files:
            if f.endswith(".pdf"):
                pdf_files.append(os.path.join(root, f))
    
    if not pdf_files:
        print("  No PDFs found in uploads/. Looking elsewhere...")
        # Check common locations
        for search_dir in [r"c:\Users\manoh\Downloads", r"c:\Users\manoh\Documents"]:
            if os.path.exists(search_dir):
                for f in os.listdir(search_dir):
                    if f.lower().endswith(".pdf") and "csa" in f.lower():
                        pdf_files.append(os.path.join(search_dir, f))
                        print(f"  Found: {os.path.join(search_dir, f)}")
    
    if pdf_files:
        import fitz
        for pf in pdf_files[:2]:
            doc = fitz.open(pf)
            text = ""
            for page in doc:
                text += page.get_text("text")
            doc.close()
            print(f"\n  File: {os.path.basename(pf)}")
            print(f"  Pages: {len(doc)}")
            print(f"  Total chars: {len(text)}")
            print(f"  First 300 chars:\n    {repr(text[:300])}")
            
            # Test local extraction
            from app.services.pdf_service import parse_local_questions
            local_qs = parse_local_questions(text)
            print(f"  Local extraction found: {len(local_qs)} questions")
            if local_qs:
                print(f"    Sample: {local_qs[0]['question'][:80]}...")
    else:
        print("  No CSA PDFs found anywhere. Upload one through the UI first.")

    # Step 3: Check database
    print("\n" + "=" * 60)
    print("STEP 3: Database State")
    print("=" * 60)
    import sqlite3
    conn = sqlite3.connect("csa_training.db")
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM questions")
    print(f"  Total questions: {c.fetchone()[0]}")
    c.execute("SELECT COUNT(*) FROM flashcards")
    print(f"  Total flashcards: {c.fetchone()[0]}")
    c.execute("SELECT COUNT(*) FROM content_sources")
    print(f"  Total content sources: {c.fetchone()[0]}")
    c.execute("SELECT COUNT(*) FROM chunks")
    print(f"  Total chunks: {c.fetchone()[0]}")
    conn.close()

    print("\n" + "=" * 60)
    print("DIAGNOSIS COMPLETE")
    print("=" * 60)

asyncio.run(main())
