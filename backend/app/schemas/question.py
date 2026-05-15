from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.question import DifficultyLevel, GeneratedBy


class QuestionOut(BaseModel):
    id: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    explanation: str
    difficulty_level: DifficultyLevel
    is_scenario_based: bool
    generated_by: GeneratedBy
    topic_id: Optional[int]
    content_source_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class QuestionWithTopic(QuestionOut):
    topic_name: Optional[str] = None


class FlashcardOut(BaseModel):
    id: int
    question_id: int
    front: str
    back: str
    review_count: int
    correct_count: int
    next_review_date: Optional[datetime]
    interval_days: int
    accuracy: Optional[float] = None

    class Config:
        from_attributes = True


class FlashcardReviewRequest(BaseModel):
    correct: bool


class GenerateQuestionsRequest(BaseModel):
    content_source_id: int
    max_per_chunk: int = 2  # 1-3
