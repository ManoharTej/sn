import fitz, json
from app.services.pdf_service import parse_local_questions
import os

d = {}
files = [
    '1_CSA_PART_1.pdf', 
    '1_CSA_PART_2.pdf', 
    '1_FINAL_csa_PDF.pdf', 
    '1_serviceNow-CSA-Recent.pdf', 
    '1_DOC-20250322-WA0013._(1).pdf'
]

for f in files:
    path = os.path.join('uploads', f)
    text = ''.join(p.get_text() for p in fitz.open(path))
    qs = parse_local_questions(text)
    d[f] = {q['question'].lower() for q in qs}

print('Part 1 total:', len(d['1_CSA_PART_1.pdf']))
print('Part 1 in FINAL:', len(d['1_CSA_PART_1.pdf'].intersection(d['1_FINAL_csa_PDF.pdf'])))
print('Part 1 in Recent:', len(d['1_CSA_PART_1.pdf'].intersection(d['1_serviceNow-CSA-Recent.pdf'])))
print('Part 1 in DOC:', len(d['1_CSA_PART_1.pdf'].intersection(d['1_DOC-20250322-WA0013._(1).pdf'])))

print('Part 2 total:', len(d['1_CSA_PART_2.pdf']))
print('Part 2 in FINAL:', len(d['1_CSA_PART_2.pdf'].intersection(d['1_FINAL_csa_PDF.pdf'])))
print('Part 2 in Recent:', len(d['1_CSA_PART_2.pdf'].intersection(d['1_serviceNow-CSA-Recent.pdf'])))
print('Part 2 in DOC:', len(d['1_CSA_PART_2.pdf'].intersection(d['1_DOC-20250322-WA0013._(1).pdf'])))
