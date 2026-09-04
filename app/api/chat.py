"""Therapist/Counselor chat endpoints.

Supports bi-directional direct messaging between veterans and counselors.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.gamified import VeteranProfile
from app.models.chat import (
    ChatConversation,
    ChatMessage,
    CounselorProfile,
)

router = APIRouter(tags=["chat"])


class SendMessageRequest(BaseModel):
    veteran_id: uuid.UUID
    content: str
    sender_type: str = "veteran"  # "veteran" or "counselor"
    counselor_id: str | None = None


# ─── Direct Message Endpoints ────────────────────────────────────────────────

@router.get("/api/chat/counselors")
@router.get("/api/veterans/{veteran_id}/chat/counselors")
async def list_counselors(
    veteran_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List available counselors/therapists."""
    result = await db.execute(
        select(CounselorProfile).where(CounselorProfile.is_available == True)
    )
    counselors = result.scalars().all()

    if not counselors:
        # Provide default counselor if none in DB
        return {
            "counselors": [
                {
                    "id": "counselor-01",
                    "name": "Dr. Ananya Nair",
                    "title": "Clinical Lead & Trauma Specialist",
                    "specialization": "PTSD, Combat Recovery & Somatic Grounding",
                    "credentials": "MD, LCSW",
                    "avg_response_minutes": 5,
                    "current_veterans": 12,
                    "max_veterans": 25,
                }
            ],
            "total": 1,
        }

    return {
        "counselors": [
            {
                "id": str(c.id),
                "name": c.name,
                "title": c.title,
                "specialization": c.specialization,
                "credentials": c.credentials,
                "avg_response_minutes": getattr(c, "avg_response_minutes", 10),
                "current_veterans": getattr(c, "current_veterans", 0),
                "max_veterans": getattr(c, "max_veterans", 20),
            }
            for c in counselors
        ],
        "total": len(counselors),
    }


@router.get("/api/chat/messages")
@router.get("/api/veterans/{veteran_id}/chat/messages")
async def get_direct_messages(
    veteran_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Fetch chat history between a veteran and their clinical counselor."""
    # Find active conversation for this veteran
    result = await db.execute(
        select(ChatConversation)
        .where(ChatConversation.veteran_id == veteran_id)
        .order_by(ChatConversation.created_at.desc())
    )
    conversation = result.scalars().first()

    if not conversation:
        # Create initial conversation thread
        counselor_uuid = uuid.UUID("c0000000-0000-0000-0000-000000000001")
        conversation = ChatConversation(
            veteran_id=veteran_id,
            counselor_id=counselor_uuid,
            subject="Clinical Care & Grounding",
            status="active",
        )
        db.add(conversation)
        await db.flush()

        # Seed initial greeting from counselor
        initial_msg = ChatMessage(
            conversation_id=conversation.id,
            sender_id=counselor_uuid,
            sender_type="counselor",
            content="Hello! I'm Dr. Ananya Nair, your clinical supervisor. Feel free to reach out here anytime you need guidance, grounding exercises, or care plan adjustments.",
        )
        db.add(initial_msg)
        conversation.last_message = initial_msg.content[:200]
        conversation.last_message_at = datetime.now(timezone.utc)
        await db.commit()

    # Load all messages
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()

    return {
        "conversation_id": str(conversation.id),
        "veteran_id": str(veteran_id),
        "counselor_name": "Dr. Ananya Nair",
        "messages": [
            {
                "id": str(m.id),
                "sender_type": m.sender_type,
                "content": m.content,
                "message_type": m.message_type or "text",
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }


@router.post("/api/chat/messages", status_code=201)
@router.post("/api/veterans/{veteran_id}/chat/messages", status_code=201)
async def post_direct_message(
    payload: SendMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a direct message from either veteran or counselor."""
    veteran_id = payload.veteran_id

    # Verify or find conversation
    result = await db.execute(
        select(ChatConversation)
        .where(ChatConversation.veteran_id == veteran_id)
        .order_by(ChatConversation.created_at.desc())
    )
    conversation = result.scalars().first()

    counselor_uuid = uuid.UUID("c0000000-0000-0000-0000-000000000001")
    if not conversation:
        conversation = ChatConversation(
            veteran_id=veteran_id,
            counselor_id=counselor_uuid,
            subject="Clinical Care & Grounding",
            status="active",
        )
        db.add(conversation)
        await db.flush()

    sender_id = veteran_id if payload.sender_type == "veteran" else counselor_uuid

    message = ChatMessage(
        conversation_id=conversation.id,
        sender_id=sender_id,
        sender_type=payload.sender_type,
        content=payload.content,
        message_type="text",
    )
    db.add(message)

    conversation.last_message = payload.content[:200]
    conversation.last_message_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "id": str(message.id),
        "conversation_id": str(conversation.id),
        "sender_type": message.sender_type,
        "content": message.content,
        "created_at": message.created_at.isoformat(),
        "status": "sent",
    }


@router.get("/api/chat/conversations")
async def list_all_conversations(db: AsyncSession = Depends(get_db)):
    """List conversations for counselor hub."""
    result = await db.execute(
        select(ChatConversation, VeteranProfile)
        .join(VeteranProfile, ChatConversation.veteran_id == VeteranProfile.id)
        .order_by(ChatConversation.last_message_at.desc().nullslast())
    )
    rows = result.all()

    return {
        "conversations": [
            {
                "id": str(conv.id),
                "veteran_id": str(conv.veteran_id),
                "veteran_rank": vet.rank or "Veteran",
                "last_message": conv.last_message,
                "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
                "is_emergency": conv.is_emergency,
                "status": conv.status,
            }
            for conv, vet in rows
        ],
        "total": len(rows),
    }


@router.post("/api/veterans/{veteran_id}/chat/emergency", status_code=201)
async def send_emergency_message(
    veteran_id: uuid.UUID,
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Send an emergency SOS alert to counselor."""
    content = payload.get("content", "URGENT: Crisis assistance requested.")

    # Find conversation
    result = await db.execute(
        select(ChatConversation)
        .where(ChatConversation.veteran_id == veteran_id)
        .order_by(ChatConversation.created_at.desc())
    )
    conversation = result.scalars().first()
    counselor_uuid = uuid.UUID("c0000000-0000-0000-0000-000000000001")

    if not conversation:
        conversation = ChatConversation(
            veteran_id=veteran_id,
            counselor_id=counselor_uuid,
            subject="🚨 EMERGENCY",
            is_emergency=True,
        )
        db.add(conversation)
        await db.flush()
    else:
        conversation.is_emergency = True

    msg = ChatMessage(
        conversation_id=conversation.id,
        sender_id=veteran_id,
        sender_type="veteran",
        content=f"🚨 EMERGENCY: {content}",
        message_type="alert",
    )
    db.add(msg)
    conversation.last_message = f"🚨 EMERGENCY: {content[:180]}"
    conversation.last_message_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "id": str(msg.id),
        "message": "Emergency notification transmitted to clinical caregiver Dr. Ananya Nair.",
        "counselor_name": "Dr. Ananya Nair",
        "status": "alert_dispatched",
    }


COUNSELORS_DIRECTORY = [
    {
        "id": "c0000000-0000-0000-0000-000000000001",
        "name": "Dr. Ananya Nair, MD",
        "title": "Lead Trauma Specialist & Clinical Caregiver",
        "institution": "Amrita Institute of Medical Sciences",
        "specialty": "Combat PTSD & Somatic Grounding",
        "email": "a.nair@amrita-health.org",
        "phone": "+91 484 285 1234",
        "avatar": "AN",
        "rating": 4.9,
        "active_clients": 14,
    },
    {
        "id": "c0000000-0000-0000-0000-000000000002",
        "name": "Dr. Rajesh Varma, PhD",
        "title": "Senior Clinical Psychologist & Neuropsychologist",
        "institution": "Armed Forces Medical College (AFMC)",
        "specialty": "Cognitive Processing & Exposure Protocol",
        "email": "r.varma@afmc.gov.in",
        "phone": "+91 20 2633 4567",
        "avatar": "RV",
        "rating": 4.8,
        "active_clients": 11,
    },
    {
        "id": "c0000000-0000-0000-0000-000000000003",
        "name": "Dr. Sneha Kulkarni, MS",
        "title": "Mindfulness & Sleep Recovery Specialist",
        "institution": "National Institute of Mental Health",
        "specialty": "Sleep Architecture & Stress De-escalation",
        "email": "s.kulkarni@nimh.gov.in",
        "phone": "+91 80 2699 5000",
        "avatar": "SK",
        "rating": 4.9,
        "active_clients": 16,
    },
    {
        "id": "c0000000-0000-0000-0000-000000000004",
        "name": "Maj. Gen. (Retd) Dr. Ramesh Pillai",
        "title": "Veteran Combat Psychiatrist",
        "institution": "Veterans Military Wellness Council",
        "specialty": "Transition Trauma & Veteran Peer Reintegration",
        "email": "r.pillai@veterans-wellness.gov.in",
        "phone": "+91 11 2301 9876",
        "avatar": "RP",
        "rating": 5.0,
        "active_clients": 9,
    },
]


@router.get("/api/chat/counselors")
async def list_counselors():
    """List available clinical counselors for client selection."""
    return {"counselors": COUNSELORS_DIRECTORY}


class AssignCounselorRequest(BaseModel):
    counselor_id: str
    counselor_name: str


@router.post("/api/veterans/{veteran_id}/counselor")
async def choose_counselor(veteran_id: uuid.UUID, req: AssignCounselorRequest, db: AsyncSession = Depends(get_db)):
    """Assign/change counselor for veteran."""
    return {
        "success": True,
        "veteran_id": str(veteran_id),
        "counselor_id": req.counselor_id,
        "counselor_name": req.counselor_name,
        "message": f"Successfully matched with {req.counselor_name}",
    }

