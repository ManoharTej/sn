# System Architecture Specification

This document details the architectural components, data flows, and technical stack of the ServiceNow Certified System Administrator (CSA) AI-Powered Training Application.

## Overview

The application is structured as a modern, decoupled Single Page Application (SPA) frontend communicating with an asynchronous, high-performance REST API backend. It runs in a **Personal Dev Environment** (Local Mode) using lightweight SQLite and local indexing, with connections to remote LLM APIs (Groq or Google Gemini).

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

## Component Details

### 1. Presentation Layer (Frontend)
- **Framework**: React 18, scaffolded with Vite for extremely fast compile and reload times.
- **Styling**: Vanilla CSS structure paired with Tailwind CSS v4, customized with a ServiceNow signature green brand style (#00c65e, dark slate sidebar).
- **Navigation**: Client-side routing managed by React Router Dom.
- **State Management**: Context-driven architecture for persistent layouts and session caching.

### 2. Services Layer (Backend)
- **API Core**: FastAPI (Python 3.13) leveraging async route handlers and standard Pydantic models.
- **PDF Extraction**: Ingests textbooks, ServiceNow developer docs, and custom mock exams using **PyMuPDF**, extracting clean unstructured text, detecting topics, and splitting documents into logical chunks.
- **RAG Pipeline**: Leverages local embeddings to vectorize PDF document chunks, indexing them in ChromaDB or an in-memory representation. During chat sessions or question generation, relevant contexts are queried and injected into the LLM prompt.
- **Adaptive Engine**: Uses scoring history, question latency, and topic failure frequencies to construct custom test sessions dynamically (e.g., 60% weak topics, 30% medium topics, 10% strong topics).

### 3. Storage Layer
- **Relational Metadata**: SQLite (accessed via SQLAlchemy and the async `aiosqlite` driver). Stores project entities including:
  - `User`: Personal developer profile.
  - `ContentSource`: Registry of imported PDFs.
  - `Question`: Ingested or AI-generated MCQs (storing options, correctness, and conceptual explanations).
  - `Flashcard`: Ingested or auto-generated flashcards for spaced repetition.
  - `MockTest` / `TestQuestion`: State machines of active mock test instances and answer selections.
  - `UserProgress`: Tracks correct answers and topics to support the weakness analysis heatmap.
- **Vector DB**: ChromaDB database or in-memory vector storage containing vector embeddings of raw content.
