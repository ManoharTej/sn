# 🎓 ServiceNow CSA AI-Powered Training App

<div align="center">
  <img src="docs/assets/logo.png" alt="ServiceNow CSA Training Logo" width="180" style="border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0, 198, 94, 0.15);"/>

  <p><strong>An Intelligent, RAG-Driven Adaptive Learning System for ServiceNow CSA Exam Preparation</strong></p>

  <div>
    <img src="https://img.shields.io/badge/ServiceNow-Certified%20System%20Administrator-00c65e?style=for-the-badge&logo=servicenow&logoColor=white" alt="ServiceNow Certified"/>
    <img src="https://img.shields.io/badge/FastAPI-Python-10b981?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI Backend"/>
    <img src="https://img.shields.io/badge/React-Vite%20%2B%20Tailwind%20v4-3b82f6?style=for-the-badge&logo=react&logoColor=white" alt="React Frontend"/>
    <img src="https://img.shields.io/badge/Groq%20%2F%20Gemini-LLM%20Orchestration-8b5cf6?style=for-the-badge&logo=google-gemini&logoColor=white" alt="LLM Engine"/>
  </div>
</div>

---

## 🎯 Recruiter & Technical Review Highlight

This repository demonstrates the construction of a complete, production-ready AI agent application, custom-tailored to solve a real-world problem: **accelerating ServiceNow CSA certification prep**. 

Key technical accomplishments showcased in this codebase:
- **Asynchronous FastAPI Architecture**: High-speed, rate-limited python server utilizing async database pools (`aiosqlite`) and streaming responses (SSE) for real-time LLM interactions.
- **Advanced RAG Ingestion Pipeline**: Auto-parsing complex PDF materials using `PyMuPDF`, chunking with sliding overlaps, embedding, and matching using vector operations to serve as context for the LLM.
- **Intelligent Question Generation**: Automatically extracts and synthesizes scenario-based Multiple Choice Questions (MCQs) and Spaced Repetition flashcards directly from study materials, complete with detailed concept explanations.
- **Adaptive Performance Engine**: A custom telemetry tracker assessing student accuracy, time spent per topic, and failing patterns, adapting subsequent mock exam compositions to target weak areas.

---

## 🚀 Key Features

* **📚 Automated Ingestion**: Ingest PDF textbooks, ServiceNow Release Notes, and study guides. Custom parsing automatically flags existing questions or generates new ones.
* **🧠 RAG AI Tutor**: Interactive chat assistant querying the local document vectors to answer complex conceptual questions (e.g., *“What is the difference between client scripts and business rules?”*) with exact citation sources.
* **📝 Dynamic Mock Tests**: Timed, real-format mock exams (100 questions, 120 minutes) with auto-save, question marking, navigation panels, and visual score reports.
* **📊 Heatmap Analytics**: Advanced tracking of accuracy per ServiceNow domain (e.g., User Interface, Database Administration, Automation, Scripting) with failure recovery recommendation.
* **⚡ Spaced Repetition Flashcards Grid**: CSS flip-animated flashcards dynamically scheduled based on study history (Day 1, 3, 7, 30 interval checks).

---

## 📸 Application Screenshots

<div align="center">
  <h3>📊 Performance Dashboard</h3>
  <img src="screenshots/dashboard.png" alt="Dashboard" width="800" style="border: 2px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px;"/>

  <h3>📚 Content Library & Ingestion</h3>
  <img src="screenshots/content.png" alt="Content Library" width="800" style="border: 2px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px;"/>

  <h3>📝 Active Mock Test Interface</h3>
  <img src="screenshots/features.png" alt="Mock Test" width="800" style="border: 2px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px;"/>

  <h3>🏆 Results & Weakness Breakdown</h3>
  <img src="screenshots/results.png" alt="Results" width="800" style="border: 2px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-bottom: 20px;"/>
</div>

---

## 🖥️ Live Walkthrough

*Below is an automated walkthrough of the application shell navigating the Dashboard, Mock Exam, Flashcard, and AI Tutor pages:*

<div align="center">
  <img src="docs/assets/demo.gif" alt="Application Walkthrough" width="850" style="border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.12);"/>
</div>

---

## 🛠️ System Architecture

Detailed block diagram illustrating data flows from the React frontend, through the FastAPI routes, to the SQLite database and LLM API integrations:

> Read the full [Architecture Specification](docs/architecture.md) for a deep dive.

```mermaid
graph TD
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef database fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff;
    classDef external fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;

    %% User Layer
    User["👤 Student (Web Browser)"] -->|HTTPS / WebSocket| FE

    %% Frontend App Shell
    subgraph FrontendApp ["Frontend (React 18 + Vite + Tailwind v4)"]
        FE["🖥️ UI Router / App Shell"]
        DB_Page["Dashboard View"] --- FE
        Lib_Page["Content Library"] --- FE
        Test_Page["Mock Test Interface"] --- FE
        Card_Page["Flashcards Grid"] --- FE
        Tutor_Page["AI Tutor Chat UI"] --- FE
        Prog_Page["Progress & Analytics Dashboard"] --- FE
    end
    class FrontendApp,FE,DB_Page,Lib_Page,Test_Page,Card_Page,Tutor_Page,Prog_Page frontend;

    %% Backend Services
    subgraph BackendAPI ["Backend Service (FastAPI)"]
        BE["⚙️ FastAPI Core / API Gateway"]
        
        subgraph Auth ["Authentication Module"]
            JWT["JWT Manager (Bcrypt)"]
        end
        
        subgraph Pipeline ["AI / RAG Pipeline"]
            Extract["PDF Extractor (PyMuPDF)"]
            Gen["MCQ / Flashcard Generator"]
            RAG["RAG Search & Retrieval Engine"]
        end
        
        subgraph Services ["Core Engine Services"]
            Adapt["Adaptive Testing Engine"]
            Spaced["Spaced Repetition Scheduler"]
            Stats["Progress & Metrics Calculator"]
        end
    end
    class BackendAPI,BE,JWT,Extract,Gen,RAG,Adapt,Spaced,Stats backend;

    %% Data Store
    subgraph DataStore ["Data Storage (Local Mode)"]
        SQL_DB[("🗄️ SQLite DB (csa_training.db)<br>- Users & Progress Logs<br>- MCQs & Flashcards<br>- Mock Test Sessions")]
        V_DB[("🔀 Vector Store (ChromaDB / Memory)<br>- Context Chunk Embeddings")]
    end
    class DataStore,SQL_DB,V_DB database;

    %% AI Models / External
    subgraph AIServices ["External Providers & Models"]
        Groq["⚡ Groq API<br>(llama-3.3-70b-versatile)"]
        Gemini["♊ Gemini Pro API<br>(gemini-1.5-flash)"]
        Embed["🧮 sentence-transformers<br>(Local Embeddings)"]
    end
    class AIServices,Groq,Gemini,Embed external;

    %% Data Flow / Connections
    FE -->|JSON Requests| BE
    FE -->|WebSocket| BE
    
    BE --> Auth
    BE --> Pipeline
    BE --> Services

    Pipeline --> SQL_DB
    Pipeline --> V_DB
    Services --> SQL_DB
    
    RAG --> Embed
    Gen --> Groq
    Gen --> Gemini
    RAG --> Groq
    RAG --> Gemini
```

---

## 💻 Installation & Quickstart

Follow these steps to run the application in a local Personal Mode environment.

### Prerequisites
- Python 3.10+
- Node.js v18+

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd csa-training-app/backend
   ```
2. Copy the sample environment file:
   ```bash
   cp .env.example .env
   ```
3. Open `.env` and fill in your preferred LLM provider API key (e.g., `GROQ_API_KEY` or `GEMINI_API_KEY`).
4. Activate your virtual environment and install packages:
   ```bash
   pip install -r requirements.txt
   ```
5. Start the FastAPI server:
   ```bash
   python run.py
   ```
   *The server runs at `http://127.0.0.1:8000`. API docs can be viewed at `/docs`.*

### 2. Frontend Setup
1. In a new terminal tab, navigate to the frontend directory:
   ```bash
   cd csa-training-app/frontend
   ```
2. Install Node modules:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:5173` to start practicing!*

---

## 🛠️ Code Structure

```text
csa-training-app/
├── backend/
│   ├── app/
│   │   ├── api/routes/    # REST endpoints (auth, questions, tests, tutor)
│   │   ├── core/          # App config, dependencies, exceptions
│   │   ├── db/            # SQLAlchemy session setup and DB migrators
│   │   ├── models/        # SQLAlchemy database schemas
│   │   ├── schemas/       # Pydantic validation schemas
│   │   ├── services/      # RAG pipeline, question generator, spaced repetition
│   │   └── main.py        # FastAPI initialization & startup routines
│   ├── run.py             # Uvicorn launcher
│   └── csa_training.db    # SQLite Database containing pre-loaded study data
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios REST services
│   │   ├── components/    # Reusable UI widgets (Sidebar, layout elements)
│   │   ├── context/       # Auth state context
│   │   ├── pages/         # Dashboard, Content, Questions, Tests, Tutor, Settings
│   │   ├── App.jsx        # Routing configuration
│   │   └── index.css      # Custom styles tailored for ServiceNow green theme
│   └── vite.config.js     # Dev server proxy configuration
```

---

## 📝 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
