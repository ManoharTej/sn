from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.content import ProcessingStatus


class ContentUploadResponse(BaseModel):
    id: int
    title: str
    filename: str
    status: ProcessingStatus
    message: str

class UrlIngestRequest(BaseModel):
    url: str
    title: Optional[str] = None


class SearchLearnRequest(BaseModel):
    topic: str
    max_results: Optional[int] = 3



class TopicOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    question_count: int

    class Config:
        from_attributes = True


class ContentSourceOut(BaseModel):
    id: int
    title: str
    filename: str
    file_size_bytes: Optional[int]
    status: ProcessingStatus
    error_message: Optional[str]
    total_chunks: int
    total_questions: int
    created_at: datetime
    processed_at: Optional[datetime]
    topics: List[TopicOut] = []

    class Config:
        from_attributes = True


class ContentSourceList(BaseModel):
    id: int
    title: str
    filename: str
    status: ProcessingStatus
    total_chunks: int
    total_questions: int
    created_at: datetime

    class Config:
        from_attributes = True
