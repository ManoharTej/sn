from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base


class DifficultyLevel(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class GeneratedBy(str, enum.Enum):
    ai_generated = "ai_generated"
    uploaded = "uploaded"


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, default=1)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    content_source_id = Column(Integer, ForeignKey("content_sources.id"), nullable=True)
    chunk_id = Column(Integer, ForeignKey("chunks.id"), nullable=True)

    question_text = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    correct_answer = Column(String(1), nullable=False)   # a/b/c/d
    explanation = Column(Text, nullable=False)
    difficulty_level = Column(Enum(DifficultyLevel), default=DifficultyLevel.medium)
    is_scenario_based = Column(Boolean, default=False)
    domain = Column(String(255), default="Database Management and Platform Security")
    generated_by = Column(Enum(GeneratedBy), default=GeneratedBy.ai_generated)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    topic = relationship("Topic", foreign_keys=[topic_id])


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, default=1)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    front = Column(Text, nullable=False)   # Question text
    back = Column(Text, nullable=False)    # Answer + explanation
    review_count = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    next_review_date = Column(DateTime(timezone=True), nullable=True)
    interval_days = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    question = relationship("Question", foreign_keys=[question_id])
