from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import relationship
import enum
from app.db.session import Base


class ProcessingStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class SourceType(str, enum.Enum):
    pdf = "pdf"
    url = "url"
    chat = "chat"
    search = "search"


class ContentSource(Base):
    __tablename__ = "content_sources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, default=1)
    source_type = Column(Enum(SourceType), default=SourceType.pdf)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    status = Column(Enum(ProcessingStatus), default=ProcessingStatus.pending)
    error_message = Column(Text, nullable=True)
    total_chunks = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)

    topics = relationship("Topic", back_populates="content_source", cascade="all, delete-orphan")
    chunks = relationship("Chunk", back_populates="content_source", cascade="all, delete-orphan")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    content_source_id = Column(Integer, ForeignKey("content_sources.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, default=1)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    question_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    content_source = relationship("ContentSource", back_populates="topics")


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True)
    content_source_id = Column(Integer, ForeignKey("content_sources.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=True)
    chroma_id = Column(String(100), nullable=True)  # ID in ChromaDB
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    content_source = relationship("ContentSource", back_populates="chunks")
