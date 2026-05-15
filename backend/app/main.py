# Trigger uvicorn reload groq2
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.session import create_tables, AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

app = FastAPI(
    title="CSA Training API",
    description="AI-Powered ServiceNow CSA Exam Prep — Personal Mode",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    # Import all models so SQLAlchemy registers them before create_all
    from app.models import user, content, question, test, progress, chat  # noqa: F401
    await create_tables()
    # Auto-create the default personal user if not exists
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == 1))
        existing = result.scalar_one_or_none()
        if not existing:
            default_user = User(
                id=1,
                email="manoharan@local",
                username="Manoharan",
                hashed_password="no-auth-personal-mode",
                is_active=True,
            )
            db.add(default_user)
            await db.commit()
            print("[OK] Default personal user created (id=1)")
        else:
            print("[OK] Default user exists -- ready")


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0", "mode": "personal"}


# ── Routers ───────────────────────────────────────────────────────────────────
# Routers
from app.api.routes import auth, content, questions, tests, progress, tutor  # noqa
app.include_router(auth.router,      prefix="/api/auth",      tags=["auth"])
app.include_router(content.router,   prefix="/api/content",   tags=["content"])
app.include_router(questions.router, prefix="/api/questions", tags=["questions"])
app.include_router(tests.router,     prefix="/api/tests",     tags=["tests"])
app.include_router(progress.router,  prefix="/api/progress",  tags=["progress"])
app.include_router(tutor.router,     prefix="/api/tutor",     tags=["tutor"])
