"""Therapist/Counselor chat endpoints.

POST   /api/veterans/{id}/chat/conversations          — Start new conversation
GET    /api/veterans/{id}/chat/conversations          — List conversations
GET    /api/veterans/{id}/chat/conversations/{cid}    — Get conversation + messages
POST   /api/veterans/{id}/chat/conversations/{cid}/messages — Send message
GET    /api/veterans/{id}/chat/counselors             — List available counselors
POST   /api/veterans/{id}/chat/emergency              — Send emergency message
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.gamified import VeteranProfile
from app.models.chat import (
    ChatConversation,
    ChatMessage,
    CounselorProfile,
)

router = APIRouter(prefix="/api/veterans/{veteran_id}/chat", tags=["chat"])


@router.get("/counselors")
async def list_counselors(db: AsyncSession = Depends(get_db)):
    """List available counselors/therapists."""
    result = await db.execute(
        select(CounselorProfile).where(CounselorProfile.is_available == True)
    )
    counselors = result.scalars().all()

    return {
        "counselors": [
            {
                "id": str(c.id),
                "name": c.name,
                "title": c.title,
                "specialization": c.specialization,
                "credentials": c.credentials,
                "avg_response_minutes": c.avg_response_minutes,
                "current_veterans": c.current_veterans,
                "max_veterans": c.max_veterans,
            }
            for c in counselors
        ],
        "total": len(counselors),
    }


@router.get("/conversations")
async def list_conversations(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List veteran's conversations."""
    query = select(ChatConversation).where(ChatConversation.veteran_id == veteran_id)

    if status:
        query = query.where(ChatConversation.status == status)

    query = query.order_by(ChatConversation.last_message_at.desc().nullslast())
    result = await db.execute(query)
    conversations = result.scalars().all()

    return {
        "veteran_id": str(veteran_id),
        "conversations": [
            {
                "id": str(c.id),
                "counselor_id": str(c.counselor_id),
                "subject": c.subject,
                "status": c.status,
                "is_emergency": c.is_emergency,
                "last_message": c.last_message,
                "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
                "created_at": c.created_at.isoformat(),
            }
            for c in conversations
        ],
        "total": len(conversations),
    }


@router.post("/conversations", status_code=201)
async def start_conversation(
    counselor_id: uuid.UUID,
    subject: str | None = None,
    initial_message: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Start a new conversation with a counselor."""
    # Verify veteran exists
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Veteran not found")

    conversation = ChatConversation(
        veteran_id=veteran_id,
        counselor_id=counselor_id,
        subject=subject or "Check-in",
    )
    db.add(conversation)
    await db.flush()

    # Send initial message if provided
    if initial_message:
        msg = ChatMessage(
            conversation_id=conversation.id,
            sender_id=veteran_id,
            sender_type="veteran",
            content=initial_message,
        )
        db.add(msg)
        conversation.last_message = initial_message
        conversation.last_message_at = datetime.now(timezone.utc)

    return {
        "id": str(conversation.id),
        "subject": conversation.subject,
        "status": conversation.status,
        "created_at": conversation.created_at.isoformat(),
        "message": "Conversation started",
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get conversation with all messages."""
    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.veteran_id == veteran_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get messages
    result = await db.execute(
        select(ChatMessage).where(
            ChatMessage.conversation_id == conversation_id,
        ).order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    return {
        "id": str(conversation.id),
        "counselor_id": str(conversation.counselor_id),
        "subject": conversation.subject,
        "status": conversation.status,
        "is_emergency": conversation.is_emergency,
        "messages": [
            {
                "id": str(m.id),
                "sender_id": str(m.sender_id),
                "sender_type": m.sender_type,
                "content": m.content,
                "message_type": m.message_type,
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
        "created_at": conversation.created_at.isoformat(),
    }


@router.post("/conversations/{conversation_id}/messages", status_code=201)
async def send_message(
    conversation_id: uuid.UUID,
    content: str,
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a conversation."""
    # Verify conversation exists and belongs to veteran
    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.veteran_id == veteran_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.status == "closed":
        raise HTTPException(status_code=400, detail="Conversation is closed")

    message = ChatMessage(
        conversation_id=conversation_id,
        sender_id=veteran_id,
        sender_type="veteran",
        content=content,
    )
    db.add(message)

    # Update conversation preview
    conversation.last_message = content[:200]
    conversation.last_message_at = datetime.now(timezone.utc)

    return {
        "id": str(message.id),
        "content": message.content,
        "created_at": message.created_at.isoformat(),
        "message": "Message sent",
    }


@router.post("/emergency", status_code=201)
async def send_emergency_message(
    content: str,
    db: AsyncSession = Depends(get_db),
):
    """Send an emergency message to the on-duty counselor.

    This creates a priority conversation marked as emergency.
    """
    # Verify veteran exists
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Veteran not found")

    # Find on-duty counselor (simplified: pick first available)
    result = await db.execute(
        select(CounselorProfile).where(CounselorProfile.is_available == True).limit(1)
    )
    counselor = result.scalar_one_or_none()
    if not counselor:
        raise HTTPException(status_code=503, detail="No counselors available")

    # Create emergency conversation
    conversation = ChatConversation(
        veteran_id=veteran_id,
        counselor_id=counselor.id,
        subject="🚨 EMERGENCY",
        is_emergency=True,
    )
    db.add(conversation)
    await db.flush()

    # Send emergency message
    msg = ChatMessage(
        conversation_id=conversation.id,
        sender_id=veteran_id,
        sender_type="veteran",
        content=f"🚨 EMERGENCY: {content}",
        message_type="alert",
    )
    db.add(msg)
    conversation.last_message = f"🚨 EMERGENCY: {content[:200]}"
    conversation.last_message_at = datetime.now(timezone.utc)

    return {
        "id": str(conversation.id),
        "message": "Emergency message sent to counselor",
        "counselor_name": counselor.name,
        "counselor_title": counselor.title,
        "estimated_response": f"{counselor.avg_response_minutes} minutes",
    }
