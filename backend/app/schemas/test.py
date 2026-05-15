from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.test import TestType, TestStatus
from app.schemas.question import QuestionOut


class CreateTopicTestRequest(BaseModel):
    topic_id: str
    question_count: int = 15


class CreateFullExamRequest(BaseModel):
    pass  # 100 questions, 120 min


class CreateDailyRequest(BaseModel):
    pass  # 10-15 questions, 20 min


class CreateWeakTopicsRequest(BaseModel):
    pass  # 15-20 questions from low-accuracy topics


class TestQuestionOut(BaseModel):
    id: int
    question_id: int
    order_index: int
    user_answer: Optional[str]
    is_correct: Optional[bool]
    is_marked: bool
    time_spent_seconds: int
    question: QuestionOut

    class Config:
        from_attributes = True


class TestOut(BaseModel):
    id: int
    test_type: TestType
    title: str
    total_questions: int
    duration_minutes: int
    status: TestStatus
    score_percent: Optional[float]
    correct_count: int
    wrong_count: int
    skipped_count: int
    time_taken_seconds: Optional[int]
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TestWithQuestionsOut(TestOut):
    questions: List[TestQuestionOut] = []


class SubmitAnswerRequest(BaseModel):
    question_id: int
    answer: Optional[str] = None          # None = skip
    time_spent_seconds: int = 0
    is_marked: bool = False


class SubmitAnswerResponse(BaseModel):
    is_correct: Optional[bool]
    correct_answer: str
    explanation: str


class CompleteTestResponse(BaseModel):
    test_id: int
    score_percent: float
    correct_count: int
    wrong_count: int
    skipped_count: int
    total_questions: int
    time_taken_seconds: int
    passed: bool   # >= 70%


class TestResultDetail(TestOut):
    questions: List[TestQuestionOut] = []
    topic_breakdown: dict = {}
    difficulty_breakdown: dict = {}
