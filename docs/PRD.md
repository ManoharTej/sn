# PRODUCT REQUIREMENTS DOCUMENT
## CSA AI-Powered Training Application

**Document Version:** 1.0  
**Last Updated:** May 14, 2026  
**Status:** In Development - MVP Phase

---

## EXECUTIVE SUMMARY

An AI-powered, adaptive learning platform specifically designed for ServiceNow Certified System Administrator (CSA) exam preparation. The application intelligently processes learning materials (PDFs, YouTube, web content) through RAG (Retrieval-Augmented Generation), automatically generates MCQ tests, flashcards, and provides adaptive training based on user performance patterns.

**Target User:** ServiceNow professionals preparing for CSA certification  
**MVP Scope:** PDF learning → MCQ generation → Mock tests → Adaptive testing  
**Timeline:** MVP in 8 weeks

---

## 1. PROBLEM STATEMENT

### Current Challenges:
- CSA exam preparation resources scattered across multiple sources (PDFs, docs, videos, blogs)
- No automated MCQ generation from learning materials
- No adaptive learning - all students get same questions regardless of weakness
- Manual flashcard creation is time-consuming
- No intelligent weakness detection and targeted practice
- Existing CSA training tools are expensive or generic

### Solution:
Build an integrated platform that:
1. Centralizes all CSA learning materials
2. Automatically extracts and organizes knowledge
3. AI-generates relevant MCQs and flashcards
4. Adapts training based on performance
5. Tracks weak areas for targeted remediation

---

## 2. PRODUCT GOALS

### Primary Goals:
1. **Reduce CSA prep time** - From 3-6 months to 6-8 weeks of targeted practice
2. **Increase first-attempt pass rate** - From 60% to 85%+ through adaptive learning
3. **Make costly training obsolete** - Replace expensive bootcamps with affordable AI tutor
4. **Enable offline learning** - Download and study anywhere

### Secondary Goals:
5. Build network effect - Community-shared study materials
6. Create data-driven insights - Predictive score estimation

---

## 3. SUCCESS METRICS (KPIs)

| Metric | MVP Target | Long-term Target |
|--------|-----------|-----------------|
| **User Signup** | 100 beta users | 10k+ annual |
| **Content Coverage** | 5+ PDFs | 50+ sources |
| **Questions Generated** | 500+ MCQs | 5000+ MCQs |
| **User Retention** | 60% week-over-week | 75%+ |
| **Avg. Practice Hours/user** | 30 hours | 50 hours |
| **Mock Test Pass Rate** | 75%+ | 85%+ |
| **AI Tutor Satisfaction** | 4.2/5 stars | 4.6/5 stars |
| **Load Time** | <2 sec | <1 sec |

---

## 4. USER PERSONAS

### Persona 1: **Rajesh - The Self-Learner**
- **Age:** 28, Systems Admin at mid-size company
- **Goal:** Clear CSA certification with minimal expense
- **Pain Points:** 
  - Can't afford $2000 bootcamp
  - Limited study time (2 hours/day)
  - Gets confused between similar concepts
- **Needs:** Affordable, self-paced, adaptive learning
- **Usage:** 2-3 sessions/week, 2 hours each

### Persona 2: **Priya - The Fast Learner**
- **Age:** 24, Recent grad, high performer
- **Goal:** Certify quickly, maximize score
- **Pain Points:**
  - Doesn't want to waste time on easy concepts
  - Wants challenging questions
  - Needs edge over other candidates
- **Needs:** Difficulty adaptation, speed challenges, scenario-based questions
- **Usage:** 4-5 sessions/week, 1.5 hours each

### Persona 3: **Manager Dev - The Knowledge Seeker**
- **Age:** 35, ServiceNow Architect, team lead
- **Goal:** Refresh knowledge, help team prepare
- **Pain Points:**
  - Time-poor
  - Needs comprehensive reference material
  - Wants to create custom tests for team
- **Needs:** Quick reference, bulk material import, test creation tools
- **Usage:** 1-2 sessions/week, variable duration

---

## 5. MVP FEATURE SPECIFICATION

### Phase 1A: Core Infrastructure (Weeks 1-2)

#### 5.1.1 User Authentication & Onboarding
```
User Story: As a new user, I want to sign up and start learning

Acceptance Criteria:
- User can register with email/password
- Password validation (min 8 chars, complexity rules)
- Email verification (optional for MVP)
- Login/logout functionality
- Session management (JWT tokens)
- Remember me option
- Password reset flow

Technical Requirements:
- JWT token-based auth
- Bcrypt password hashing
- 24-hour token expiry
- Rate limiting on login attempts
- CORS for frontend
```

#### 5.1.2 Dashboard
```
User Story: As a user, I want to see my learning status at a glance

Acceptance Criteria:
- Welcome message with username
- Quick stats:
  * Total questions practiced
  * Current accuracy %
  * Weak topics count
  * Study streak
  * Last login
- Recent activity feed
- Quick start buttons:
  * Upload PDF
  * Take Mock Test
  * Review Flashcards
  * Ask AI Tutor
- Navigation menu

Technical Requirements:
- Real-time stats calculation
- Cached performance metrics
- Responsive design (mobile-first)
```

---

### Phase 1B: Content Management (Weeks 2-3)

#### 5.1.3 PDF Upload & Processing
```
User Story: As a user, I want to upload CSA study materials as PDFs

Acceptance Criteria:
- Drag-and-drop file upload interface
- File size validation (max 50MB)
- File type validation (PDF only)
- Upload progress indicator
- Upload history/management
- Delete uploaded PDFs
- View uploaded content list with:
  * File name
  * Upload date
  * Processing status
  * Question count
  * Topics extracted

Processing Pipeline:
Layer 1: File Validation
- Check file size < 50MB
- Verify PDF format
- Scan for malware (optional)

Layer 2: PDF Extraction
- Extract text using PyMuPDF
- Handle scanned PDFs (OCR if needed)
- Extract images (for reference)
- Preserve document structure

Layer 3: Content Processing
- Split into chunks (300-500 chars)
- Auto-detect topics/chapters
- Identify existing MCQs in PDF
- Generate embeddings per chunk

Layer 4: Question Generation
- For each chunk, generate 2-3 MCQs
- Ask AI to create scenario-based questions
- Parse and validate MCQ format
- Store with difficulty levels

Layer 5: Indexing
- Store in PostgreSQL
- Index in ChromaDB
- Create topic-question mapping
- Auto-generate flashcards

Technical Requirements:
- Async processing (Celery/FastAPI background tasks)
- Chunk size: 300-500 chars with 50-char overlap
- Max 10 questions per PDF page (avoid spam)
- Process max 5 PDFs in parallel
- Error recovery and retry logic
- Processing status webhooks
```

#### 5.1.4 Content Library
```
User Story: As a user, I want to browse and search my learning materials

Acceptance Criteria:
- View all uploaded PDFs
- Search by title/topic
- Filter by date uploaded
- View extraction metadata:
  * Total chunks created
  * Topics identified
  * Questions generated
  * Processing time
- View topics tree structure
- Drill down into each topic
- See related questions per topic

Technical Requirements:
- Full-text search on PostgreSQL
- Topic hierarchy visualization
- Lazy loading for large libraries
```

---

### Phase 1C: Question Management (Weeks 3-4)

#### 5.1.5 Question System
```
User Story: As a user, I want to practice MCQs from my learning materials

Acceptance Criteria:
- View all generated questions
- Filter by:
  * Topic
  * Difficulty (Easy/Medium/Hard)
  * Source PDF
  * Question type
- Search questions by text
- View question with:
  * Question text
  * 4 options (A, B, C, D)
  * Explanation (hidden until answered)
  * Source reference (which PDF)
- Difficulty indicator
- AI-generated flag indicator

Question Structure:
{
  id: int,
  question_text: str,
  option_a: str,
  option_b: str,
  option_c: str,
  option_d: str,
  correct_answer: char (a/b/c/d),
  explanation: str,
  difficulty_level: enum (easy/medium/hard),
  is_scenario_based: bool,
  topic_id: int,
  content_source_id: int,
  generated_by: enum (uploaded/ai_generated),
  created_at: datetime
}

Technical Requirements:
- Question validation before storage
- Difficulty auto-assignment by AI
- Explanation generation mandatory
- MCQ parsing from PDFs for existing tests
```

#### 5.1.6 Flashcard System
```
User Story: As a user, I want flashcards auto-generated from questions

Acceptance Criteria:
- Auto-generate flashcards from each MCQ:
  * Front: Question text
  * Back: Answer + Explanation
- View flashcards in grid
- Flip animation
- Mark correct/incorrect
- Track review progress:
  * Review count
  * Correct count
  * Accuracy %
- Filter by topic/difficulty
- Next review date indicator
- Spaced repetition intervals (basic MVP version)

Spaced Repetition (MVP Simple):
- Day 1: Review
- Day 3: Review if <80% correct
- Day 7: Review if <80% correct
- Day 30: Final review

Technical Requirements:
- Batch auto-generation from questions
- Flip animation with CSS transitions
- Progress persistence in DB
- Next review date calculation
```

---

### Phase 1D: Mock Tests (Weeks 4-5)

#### 5.1.7 Mock Test Creation
```
User Story: As a user, I want to take timed mock tests

Acceptance Criteria:
Test Types Available:
1. Topic-based Test
   - Select topic → Generate test with 10-20 questions
   - Mix of Easy/Medium/Hard

2. Full Exam Simulation
   - 100 questions
   - 2-hour duration
   - Real CSA exam pattern
   - Random question selection

3. Daily Practice
   - 10-15 questions
   - 15-20 minute test
   - Mix of weak + medium topics

4. Weak Topics Recovery
   - Only from low-accuracy topics
   - 15-20 questions
   - Build confidence

Test Creation Flow:
- User selects test type
- System retrieves questions from DB
- Questions randomized
- Timer started
- Navigate between questions
- Save progress (auto-save)

Technical Requirements:
- Timer with pause functionality
- Question randomization algorithm
- Progress auto-save every 30 seconds
- Prevent tab switching (optional for MVP)
- Unique test instance per attempt
```

#### 5.1.8 Test Taking Experience
```
User Story: As a user taking a test, I want smooth, distraction-free experience

Acceptance Criteria:
Test UI Elements:
- Progress bar (question X of Y)
- Timer countdown
- Current question displayed clearly
- Navigation: Previous/Next/Jump to question
- Mark for review option
- Show/hide answer key option
- Pause test option
- Clear answer button

During Test:
- Disable page refresh warning
- Auto-save every answer
- Show elapsed time
- Disable copy/paste (optional)
- Keyboard shortcuts:
  * A/B/C/D to select answer
  * Space to next question
  * Shift+Space to previous

Technical Requirements:
- WebSocket for real-time progress updates
- Optimistic UI updates
- Session recovery on disconnect
- Browser storage backup
```

#### 5.1.9 Test Results & Review
```
User Story: As a user completing a test, I want detailed performance feedback

Acceptance Criteria:
Results Screen Shows:
- Overall score (percentage)
- Total: X questions, Y correct, Z incorrect
- Time taken
- Average time per question
- Questions breakdown:
  * Correct (show answer)
  * Incorrect (show user answer + correct answer + explanation)
  * Skipped
- Topic-wise breakdown:
  * Topic A: X/Y correct (Z%)
  * Topic B: X/Y correct (Z%)
- Difficulty analysis:
  * Easy: X% correct
  * Medium: X% correct
  * Hard: X% correct
- Weak areas identified
- Suggestions for improvement
- Compare with previous attempts
- Detailed review of each question

Review Features:
- Click any question to see full explanation
- Related learning material links
- Mark questions for later study
- Export results as PDF
- Add personal notes to questions

Technical Requirements:
- Efficient query for result aggregation
- PDF generation for reports
- Performance analytics calculations
- Historical comparison logic
```

---

### Phase 1E: User Progress & Analytics (Weeks 5-6)

#### 5.1.10 Progress Tracking
```
User Story: As a student, I want to see my improvement over time

Acceptance Criteria:
Personal Analytics Dashboard:
- Overall accuracy trend (chart)
- Questions practiced over time
- Study streak (consecutive days)
- Accuracy by topic (heatmap or table)
- Improvement rate week-over-week
- Mock test scores history
- Weak topics list with priority
- Strong topics list
- Estimated exam readiness score

Charts & Visualizations:
- Line chart: Accuracy trend
- Bar chart: Questions per day
- Heatmap: Topic-wise performance
- Pie chart: Time distribution

Weak Topics Intelligence:
- Count: How many times failed?
- Timing: Time spent vs correct %?
- Pattern: Consistent failure or random?
- Recommendation: Study this topic through X method

Technical Requirements:
- Efficient aggregation queries (indexed)
- Chart library: Recharts or Chart.js
- Real-time calculation on test completion
- Caching of frequently accessed metrics
- 7/30/90 day views
```

#### 5.1.11 Adaptive Learning Engine
```
User Story: As a learner, I want tests adapted to my weaknesses

Acceptance Criteria:
Adaptive Algorithm:
Input:
- User's test history
- Accuracy per topic
- Time spent per question
- Failed question patterns
- Last review date

Processing:
1. Calculate weakness score per topic:
   weakness_score = (1 - accuracy) * fail_count * recency_factor

2. Identify weak topics:
   topics_sorted_by_weakness_score DESC
   weak_topics = top 5 topics

3. Next test composition:
   - 60% from weak topics
   - 30% from medium topics
   - 10% from strong topics
   - Mix of difficulties

4. Difficulty adaptation:
   - User scoring >85%? → Increase hard questions
   - User scoring <60%? → Decrease hard questions
   - Target: 70% correct rate per test

Output:
- Personalized test for user
- Focused on topics needing work
- Appropriate difficulty level
- Estimated pass probability

Technical Requirements:
- Adaptive scoring algorithm
- Historical data analysis
- Real-time re-evaluation
- A/B testing framework for algorithm improvements
```

---

### Phase 1F: AI Tutor (Basic) (Weeks 6-7)

#### 5.1.12 AI Question Answer
```
User Story: As a learner, I want to ask the AI tutor questions about CSA

Acceptance Criteria:
Tutor Chat Interface:
- Text input for questions
- Chat history visible
- Response stream (shows AI thinking)
- Copy response button
- Rate response (helpful/not helpful)
- Ask follow-up questions
- Clear chat history

Question Types Supported:
1. Concept Explanation
   Q: "What is an ACL?"
   A: Retrieves ACL definition from content + PDF context

2. Comparison Questions
   Q: "Difference between client script and business rule?"
   A: RAG retrieves both, compares them

3. Use Case Questions
   Q: "How would I create automated approvals?"
   A: Provides step-by-step using RAG context

4. Debugging Help
   Q: "Why isn't my business rule firing?"
   A: Suggests common issues from knowledge base

RAG Pipeline for Tutor:
1. User asks question
2. Embed question using sentence-transformers
3. Search ChromaDB for similar chunks (top 5)
4. Construct prompt with context
5. Call OpenAI/Gemini
6. Stream response to user
7. Store conversation in DB

Technical Requirements:
- RAG retrieval with semantic search
- Streaming responses (SSE or WebSocket)
- Response caching for repeat questions
- Rate limiting (10 questions/hour free tier)
- Citation of sources (which PDF/chunk was used)
```

#### 5.1.13 Tutor Conversation History
```
Acceptance Criteria:
- Search past conversations
- View conversation thread
- Access any past response
- Reference related study materials
- Export conversation as markdown

Technical Requirements:
- Full-text search on conversations
- Conversation grouping by topic
- Response relevance scoring
```

---

### Phase 1G: Admin & Settings (Week 7)

#### 5.1.14 User Settings
```
Acceptance Criteria:
- Update profile (name, email)
- Change password
- Email notification preferences
- Download all personal data (GDPR)
- Delete account and data
```

#### 5.1.15 Admin Dashboard (Internal)
```
Acceptance Criteria:
- User analytics:
  * Total users
  * Active users
  * Sign-ups over time
  * Churn rate
- Content analytics:
  * Questions generated
  * Avg questions per PDF
  * Processing times
- Performance metrics:
  * API response times
  * Server health
  * Error rates
```

---

## 6. DEFERRED FEATURES (Phase 2+)

### YouTube Integration
- Playlist import
- Auto-transcript extraction
- Chapter-based learning
- Key concept extraction from videos

### Web Scraping
- ServiceNow docs auto-import
- Community forum integration
- Blog article parsing

### Advanced Analytics
- Predictive score estimation
- Study plan generation
- Peer comparison
- Learning path recommendations

### Social Features
- Share study materials
- Study groups
- Leaderboards
- Peer review

### Advanced AI
- Multi-turn conversations
- Code snippet generation
- Script explaining
- Scenario generation

### Gamification
- Points & badges
- Achievement system
- Daily challenge streak
- Rank system

---

## 7. TECHNICAL ARCHITECTURE

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | React 18 + Vite | Fast builds, modern tooling |
| **UI Framework** | TailwindCSS + shadcn | Production-ready components |
| **Backend** | FastAPI (Python 3.10+) | Async, fast, excellent DX |
| **Database** | PostgreSQL 14+ | ACID compliance, reliability |
| **Vector DB** | ChromaDB (local) | Free, no API costs for MVP |
| **Embeddings** | sentence-transformers | Free, runs locally |
| **LLM API** | OpenAI GPT-4-turbo / Gemini Pro | Best quality for CSA domain |
| **File Storage** | Local filesystem + S3 (future) | Simple for MVP |
| **Task Queue** | FastAPI Background Tasks or Celery | Async PDF processing |
| **API Communication** | REST + WebSocket | Standard, battle-tested |
| **Authentication** | JWT + bcrypt | Secure, stateless |
| **Deployment** | Docker + Docker Compose | Reproducible environments |

### System Architecture Diagram

```
┌─────────────────────────────────────────┐
│  FRONTEND (React + Vite)                │
│  Dashboard | Learning | Tests | Tutor   │
└────────────────┬────────────────────────┘
                 │ REST API / WebSocket
┌─────────────────────────────────────────┐
│  BACKEND (FastAPI)                      │
│ ┌─────────────────────────────────────┐ │
│ │ Routes Layer                        │ │
│ │ GET /api/questions                  │ │
│ │ POST /api/tests                     │ │
│ │ WebSocket /api/tutor                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Service Layer (Business Logic)      │ │
│ │ - PDF Processing Service            │ │
│ │ - Question Generation Service       │ │
│ │ - Test Generation Service           │ │
│ │ - Analytics Service                 │ │
│ │ - Embedding Service                 │ │
│ │ - AI Service (OpenAI calls)         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ RAG Pipeline (Core AI Logic)        │ │
│ │ - Chunking                          │ │
│ │ - Embedding generation              │ │
│ │ - Vector search                     │ │
│ │ - Context retrieval                 │ │
│ │ - Prompt construction               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Background Tasks (Celery/bg tasks)  │ │
│ │ - PDF processing queue              │ │
│ │ - MCQ generation jobs               │ │
│ │ - Embedding generation              │ │
│ └─────────────────────────────────────┘ │
└────────────┬──────────────┬──────────────┘
             │              │
    ┌────────▼──────┐  ┌────▼─────────┐
    │ PostgreSQL    │  │ ChromaDB      │
    │ (Metadata)    │  │ (Vectors)     │
    └───────────────┘  └───────────────┘
                            │
                    ┌───────▼────────┐
                    │ OpenAI/Gemini  │
                    │ API            │
                    └────────────────┘

File Storage: /uploads/ (later S3)
```

### Project Folder Structure

```
csa-training-app/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── api/routes/
│   │   ├── services/
│   │   ├── core/
│   │   ├── db/
│   │   └── tasks/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   └── utils/
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## 8. API SPECIFICATION (MVP Endpoints)

### Authentication Endpoints

```
POST /api/auth/signup
Request: { email, username, password }
Response: { user_id, token }

POST /api/auth/login
Request: { email, password }
Response: { token, user_id, username }

POST /api/auth/logout
Response: { success: true }

POST /api/auth/refresh-token
Request: { refresh_token }
Response: { token }
```

### Content Management Endpoints

```
POST /api/content/upload
Body: multipart/form-data (file + title)
Response: { content_source_id, status, estimated_processing_time }

GET /api/content/list
Response: List of content_sources with status

GET /api/content/{id}
Response: Content details + topics + question count

GET /api/topics
Response: All topics with question counts

DELETE /api/content/{id}
Response: { success: true }
```

### Question Endpoints

```
GET /api/questions
Query: ?topic_id=X&difficulty=easy&limit=20
Response: List of questions

GET /api/questions/{id}
Response: Question with options + explanation

POST /api/questions/{id}/report
Request: { reason, comment }
Response: { ticket_id }
```

### Test Endpoints

```
POST /api/tests/topic-based
Request: { topic_id, question_count }
Response: { test_id, duration_minutes, questions }

POST /api/tests/full-exam
Response: { test_id, duration_minutes, questions }

POST /api/tests/daily
Response: { test_id, duration_minutes, questions }

POST /api/tests/weak-topics
Response: { test_id, duration_minutes, questions }

GET /api/tests/{test_id}
Response: Current test state

POST /api/tests/{test_id}/submit-answer
Request: { question_id, answer, time_spent_seconds }
Response: { is_correct, explanation }

POST /api/tests/{test_id}/complete
Response: { score, total_questions, correct_answers, breakdown }

GET /api/tests/{test_id}/results
Response: Detailed results + analytics
```

### User Progress Endpoints

```
GET /api/progress/dashboard
Response: stats, weak_topics, accuracy_trend, study_streak

GET /api/progress/accuracy-by-topic
Response: Topic breakdown with accuracy %

GET /api/progress/weak-topics
Response: List of weak topics sorted by priority

GET /api/progress/test-history
Response: All past test attempts with scores

GET /api/progress/study-stats
Response: Total time, questions practiced, current streak
```

### AI Tutor Endpoints

```
WebSocket /api/tutor/chat
Message: { question }
Response: Stream of response chunks

GET /api/tutor/history
Response: List of past conversations

DELETE /api/tutor/history/{id}
Response: { success: true }
```

### Flashcard Endpoints

```
GET /api/flashcards
Query: ?topic_id=X&limit=20
Response: List of flashcards

POST /api/flashcards/{id}/review
Request: { correct: boolean }
Response: { next_review_date, interval_days }

GET /api/flashcards/daily
Response: Flashcards due today (spaced repetition)
```

---

## 9. DATABASE SCHEMA (PostgreSQL)

See attached schema.sql file or architectural documentation.

Key Tables:
- `users` - User accounts
- `content_sources` - Uploaded PDFs
- `topics` - Extracted topics
- `chunks` - Text chunks for embeddings
- `questions` - Generated MCQs
- `mock_tests` - Test definitions
- `test_attempts` - User test results
- `user_answers` - Per-question answers
- `user_progress` - Performance tracking
- `weak_topics` - Low-performance areas
- `flashcards` - Study cards
- `tutor_conversations` - Chat history

---

## 10. DEVELOPMENT ROADMAP

### Week 1-2: Backend Setup
- [ ] FastAPI project scaffold
- [ ] PostgreSQL schema creation
- [ ] Database models (SQLAlchemy)
- [ ] Authentication system (JWT)
- [ ] Basic API structure
- [ ] Deployment preparation

### Week 2-3: PDF Processing
- [ ] PDF extraction pipeline (PyMuPDF)
- [ ] Text chunking algorithm
- [ ] Topic detection
- [ ] Existing MCQ extraction
- [ ] Storage in PostgreSQL
- [ ] Error handling & logging

### Week 3-4: Question Generation
- [ ] OpenAI/Gemini API integration
- [ ] RAG pipeline setup
- [ ] MCQ generation prompts
- [ ] ChromaDB setup & indexing
- [ ] Embedding generation
- [ ] Quality validation

### Week 4-5: Mock Tests
- [ ] Test creation endpoints
- [ ] Question randomization
- [ ] Timer implementation
- [ ] Answer submission tracking
- [ ] Results calculation
- [ ] Analytics aggregation

### Week 5-6: Frontend - Phase 1
- [ ] React setup with Vite
- [ ] Authentication pages (Login/Signup)
- [ ] Dashboard layout
- [ ] PDF upload component
- [ ] Navigation structure

### Week 6-7: Frontend - Phase 2
- [ ] Test taking interface
- [ ] Results display
- [ ] Progress dashboard
- [ ] Question browser
- [ ] Flashcard component

### Week 7-8: AI Tutor & Polish
- [ ] AI Tutor WebSocket
- [ ] Chat interface
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation

### Week 8: Deployment & Launch
- [ ] Docker setup
- [ ] CI/CD pipeline
- [ ] Load testing
- [ ] Security audit
- [ ] Beta launch

---

## 11. DATA FLOW EXAMPLES

### Example 1: PDF Upload to MCQ Generation

```
User uploads CSA_Fundamentals.pdf
    ↓
1. File saved to /uploads/
2. PDFService.extract_text() → 50,000 characters
3. ChunkingService.split_into_chunks() → 100 chunks of 500 chars each
4. EmbeddingService.generate_embeddings() → 100 vectors
5. Topics auto-detected: ['ACL', 'Business Rules', 'Tables']
6. For each topic:
   a. Retrieve top-3 chunks from ChromaDB
   b. AI Prompt: "Generate 2 CSA MCQs on topic X using this context: <chunks>"
   c. Parse response → Extract Q, Options, Answer
   d. Store in questions table
7. Total: ~10 MCQs generated
8. For each MCQ, auto-generate flashcard
9. Update content_sources.processed = true
10. Frontend notified → User sees "Processing complete"
```

### Example 2: Taking Mock Test

```
User clicks "Take Daily Test"
    ↓
1. AdaptiveService.get_weak_topics(user_id)
   → [('ACL', 0.35), ('ITSM', 0.42), ...]
2. QuestionSelector algorithm:
   - Select 6 questions from ACL (60% weak)
   - Select 3 questions from ITSM (30% medium)
   - Select 1 question from strong area (10%)
   - Total: 10 questions
3. Create mock_test record
4. Create test_questions mapping (10 rows)
5. Frontend gets test with timer (15 mins)
6. User answers questions:
   a. Q1: A → Correct → 10 sec
   b. Q2: C → Wrong (correct: D) → 20 sec
7. User completes test
8. TestService.calculate_score():
   - Score: 9/10 = 90%
   - Time analysis
   - Topic breakdown
9. AnalyticsService.update_weak_topics():
   - ACL: Still weak?
   - ITSM: Improved?
10. Frontend shows results
11. Next recommended action: Focus on ACL → Flashcards
```

### Example 3: AI Tutor Interaction

```
User: "What's the difference between Business Rule and Client Script?"

Backend Processing:
1. Embed question using sentence-transformers
2. ChromaDB search: Find chunks mentioning both features
   Results: [chunk_br_1, chunk_br_2, chunk_cs_1, chunk_cs_2]
3. Construct RAG prompt:
   System: "You are a ServiceNow CSA expert..."
   Context: <top 4 chunks>
   User: "What's the difference between Business Rule and Client Script?"
4. Call OpenAI (stream mode)
5. Response streamed to frontend:
   "A Business Rule is a server-side business logic..."
   "A Client Script is JavaScript that runs on the browser..."
   "Key differences:
    - Execution location
    - Performance
    - Use cases"
6. Store in tutor_conversations table
```

---

## 12. PERFORMANCE & SCALABILITY

### MVP Scale
- **Concurrent Users:** 100
- **QPS (Peak):** 50
- **DB Size:** 5 GB
- **Daily PDFs:** 10
- **Questions Generated/Day:** 50-100

### Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| PDF Upload + Processing | 2-5 min | For 50-page PDF |
| MCQ Generation per question | <5 sec | Via OpenAI |
| Question search | <200ms | Cached, indexed |
| Test load | <500ms | Randomization |
| Test submit answer | <300ms | Auto-save |
| Tutor response | <3 sec | Streaming |
| Analytics calculation | <1 sec | Cached hourly |

### Optimization Strategies
1. **Database:** Proper indexes, query optimization
2. **Caching:** Redis for hot data (optional for MVP)
3. **Async Processing:** Long-running tasks in background
4. **CDN:** For static assets (future)
5. **API Rate Limiting:** Prevent abuse

---

## 13. RISK & MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **OpenAI API costs too high** | Medium | High | Implement rate limiting, caching, cost monitoring |
| **PDF processing errors** | Medium | Medium | Try-catch, fallback to manual extraction, user feedback |
| **ChromaDB scalability** | Low | Medium | Plan migration to Vector DB (Pinecone) at scale |
| **User data loss** | Low | High | Daily database backups, replication |
| **Low user adoption** | Medium | High | Community marketing, free CSA materials sharing |
| **Poor AI quality** | Low | Medium | Human review of generated questions, prompt tuning |
| **Performance degradation** | Medium | Medium | Load testing, horizontal scaling in Docker |

---

## 14. SUCCESS CRITERIA (MVP Launch)

- [ ] 100+ beta users sign up
- [ ] Average 5+ PDFs uploaded per user
- [ ] 500+ questions generated and reviewed
- [ ] 60%+ user retention after week 1
- [ ] Mock test accuracy <80% confidence (realistic)
- [ ] <2 second end-to-end response time
- [ ] Zero critical bugs in beta
- [ ] Positive user feedback (4+/5 stars)
- [ ] Complete API documentation
- [ ] Deployment runbook ready

---

## 15. GLOSSARY

| Term | Definition |
|------|------------|
| **RAG** | Retrieval-Augmented Generation - AI pattern combining semantic search + generation |
| **MCQ** | Multiple Choice Question |
| **ChromaDB** | Local vector database for embeddings |
| **Embedding** | Vector representation of text for semantic search |
| **Chunking** | Splitting large text into smaller semantic units |
| **Mock Test** | Simulated exam for practice |
| **Weak Topic** | Subject area with low user accuracy |
| **Adaptive Learning** | Personalizing content based on performance |
| **Spaced Repetition** | Reviewing content at increasing intervals for retention |

---

## 16. APPENDIX: COMPETITIVE ANALYSIS

### Existing CSA Tools

| Product | Cost | Features | Gaps |
|---------|------|----------|------|
| **Linux Academy** | $30/mo | Videos, questions | No AI generation, expensive |
| **Udemy CSA Courses** | $15-50 | Recorded videos | No adaptive learning |
| **Official ServiceNow Training** | $2000+ | Comprehensive | Very expensive, rigid schedule |
| **Community PDFs + Anki** | Free | Community resources | Scattered, tedious setup |

**Our Advantage:**
- ✅ Affordable ($0-9/mo)
- ✅ Adaptive to individual weaknesses
- ✅ AI-powered question generation
- ✅ Integrated learning + testing + analytics
- ✅ Fast preparation (6-8 weeks vs 3-6 months)

---

## 17. APPROVAL & SIGN-OFF

| Role | Name | Sign-off Date |
|------|------|---|
| Product Manager | [TO BE ASSIGNED] | -- |
| Tech Lead | [Manoharan] | May 14, 2026 |
| Design Lead | [TO BE ASSIGNED] | -- |
| Executive Sponsor | [TO BE ASSIGNED] | -- |

---

**Document Control:**
- Version: 1.0
- Status: DRAFT → APPROVED
- Last Updated: May 14, 2026
- Next Review: June 1, 2026
