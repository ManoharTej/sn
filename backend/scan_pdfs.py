"""Deep-scan all PDFs to find every question format variation."""
import fitz, os, re, sys

upload_dir = "uploads"

for fname in sorted(os.listdir(upload_dir)):
    if not fname.endswith(".pdf"):
        continue
    path = os.path.join(upload_dir, fname)
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    doc.close()

    print(f"\n{'#'*70}")
    print(f"# PDF: {fname} ({len(text)} chars)")
    print(f"{'#'*70}")
    
    # Show first 2000 chars
    print("\n--- FIRST 2000 CHARS ---")
    safe = text[:2000].encode('ascii', 'replace').decode()
    print(safe)
    
    # Show middle sample
    mid = len(text) // 2
    print("\n--- MIDDLE SAMPLE (1000 chars) ---")
    safe = text[mid:mid+1000].encode('ascii', 'replace').decode()
    print(safe)
    
    # Show last 1500 chars
    print("\n--- LAST 1500 CHARS ---")
    safe = text[-1500:].encode('ascii', 'replace').decode()
    print(safe)
    
    # Pattern detection
    print("\n--- PATTERN DETECTION ---")
    patterns = {
        "NO.N format": len(re.findall(r'\nNO\.\d+\s', text)),
        "N. format (1. 2.)": len(re.findall(r'\n\d{1,3}\.\s', text)),
        "Question N": len(re.findall(r'\nQuestion\s*\d+', text, re.I)),
        "Q.N / QN": len(re.findall(r'\nQ\.?\s*\d+', text, re.I)),
        "a) b) options": len(re.findall(r'\n\s*[a-f]\)', text, re.I)),
        "A. B. options": len(re.findall(r'\n\s*[A-G]\.', text)),
        "i) ii) options": len(re.findall(r'\n\s*(?:i{1,3}v?|iv|v|vi)\)', text, re.I)),
        "1) 2) 3) options": len(re.findall(r'\n\s*[1-6]\)', text)),
        "Answer: X": len(re.findall(r'\nAnswer:\s*[A-Da-d]', text, re.I)),
        "Ans. / Ans:": len(re.findall(r'\n\s*Ans[\.\:]', text, re.I)),
        "Correct Answer": len(re.findall(r'Correct\s*Answer', text, re.I)),
        "Q&A (question+answer no opts)": len(re.findall(r'\?\s*\nAns', text, re.I)),
    }
    for name, count in patterns.items():
        if count > 0:
            print(f"  {name}: {count} hits")
    
    print()
