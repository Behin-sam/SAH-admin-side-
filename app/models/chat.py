"""Chat model for therapist-counselor messaging.

Tracks conversations between veterans and their assigned counselors/therapists.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ChatConversation(Base):
    """A conversation thread between a veteran and a counselor."""
    __tablename__ = "chat_conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    veteran_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)
    counselor_id = Column(UUID(as_uuid=True), nullable=False)

    # Conversation metadata
    subject = Column(String(200), nullable=True)
    status = Column(String(20), default="active")  # active, archived, closed
    is_emergency = Column(Boolean, default=False)

    # Last message preview
    last_message = Column(Text, nullable=True)
    last_message_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")


class ChatMessage(Base):
    """Individual message in a conversation."""
    __tablename__ = "chat_messages"
    __table_args__ = (
        Index("ix_chat_conversation_time", "conversation_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("chat_conversations.id"), nullable=False)

    # Sender
    sender_id = Column(UUID(as_uuid=True), nullable=False)
    sender_type = Column(String(20), nullable=False)  # "veteran" or "counselor"

    # Message content
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")  # text, image, check_in, alert

    # Read tracking
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    conversation = relationship("ChatConversation", back_populates="messages")


class CounselorProfile(Base):
    """Counselor/therapist profile."""
    __tablename__ = "counselor_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Professional info
    name = Column(String(100), nullable=False)
    title = Column(String(100), nullable=True)  # "Licensed Clinical Social Worker", etc.
    specialization = Column(String(200), nullable=True)  # "PTSD, Trauma Recovery"
    credentials = Column(String(200), nullable=True)  # "LCSW, PhD"

    # Availability
    is_available = Column(Boolean, default=True)
    max_veterans = Column(Integer, default=20)
    current_veterans = Column(Integer, default=0)

    # Contact
    email = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)

    # Response time
    avg_response_minutes = Column(Integer, default=60)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
