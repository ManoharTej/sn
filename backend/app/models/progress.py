from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base


class UserProgress(Base):
    """Aggregated progress snapshot — updated after every test."""
    __tablename__ = "user_progress"

    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False, default=1)
    total_tests      = Column(Integer, default=0)
    total_questions  = Column(Integer, default=0)
    total_correct    = Column(Integer, default=0)
    overall_accuracy = Column(Float, default=0.0)
    streak_days      = Column(Integer, default=0)
    last_active_date = Column(DateTime(timezone=True), nullable=True)
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class TopicProgress(Base):
    """Per-topic accuracy tracking — drives adaptive question selection."""
    __tablename__ = "topic_progress"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False, default=1)
    topic_id       = Column(Integer, ForeignKey("topics.id"), nullable=False)
    topic_name     = Column(String(255), nullable=False)
    total_answered = Column(Integer, default=0)
    total_correct  = Column(Integer, default=0)
    accuracy_pct   = Column(Float, default=0.0)
    is_weak        = Column(Boolean, default=False)   # < 60% accuracy
    last_practiced = Column(DateTime(timezone=True), nullable=True)
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    topic = relationship("Topic", foreign_keys=[topic_id])


class DailyActivity(Base):
    """One row per day per user — for streak and calendar heatmap."""
    __tablename__ = "daily_activity"

    id              = Column(Integer, primary_key=True, index=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, default=1)
    date            = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    questions_done  = Column(Integer, default=0)
    tests_done      = Column(Integer, default=0)
    accuracy_pct    = Column(Float, default=0.0)
    minutes_studied = Column(Integer, default=0)
