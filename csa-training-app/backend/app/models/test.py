from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum, ForeignKey, Float, func
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base


class TestType(str, enum.Enum):
    topic_based  = "topic_based"
    full_exam    = "full_exam"
    daily        = "daily"
    weak_topics  = "weak_topics"


class TestStatus(str, enum.Enum):
    active    = "active"
    completed = "completed"
    abandoned = "abandoned"


class MockTest(Base):
    __tablename__ = "mock_tests"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, default=1)
    test_type     = Column(Enum(TestType), nullable=False)
    title         = Column(String(200), nullable=False)
    topic_id      = Column(Integer, ForeignKey("topics.id"), nullable=True)
    total_questions = Column(Integer, nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    status        = Column(Enum(TestStatus), default=TestStatus.active)
    score_percent = Column(Float, nullable=True)
    correct_count = Column(Integer, default=0)
    wrong_count   = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    time_taken_seconds = Column(Integer, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    completed_at  = Column(DateTime(timezone=True), nullable=True)

    questions = relationship("TestQuestion", back_populates="test", cascade="all, delete-orphan")


class TestQuestion(Base):
    __tablename__ = "test_questions"

    id          = Column(Integer, primary_key=True, index=True)
    test_id     = Column(Integer, ForeignKey("mock_tests.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    order_index = Column(Integer, nullable=False)
    user_answer = Column(String(1), nullable=True)    # a/b/c/d or null if skipped
    is_correct  = Column(Boolean, nullable=True)
    is_marked   = Column(Boolean, default=False)      # "mark for review"
    time_spent_seconds = Column(Integer, default=0)
    answered_at = Column(DateTime(timezone=True), nullable=True)

    test     = relationship("MockTest", back_populates="questions")
    question = relationship("Question", foreign_keys=[question_id])
