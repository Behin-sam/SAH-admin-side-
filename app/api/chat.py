"""Therapist/Counselor chat endpoints.

Supports bi-directional direct messaging between veterans and counselors.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import CounselorCaseAssignment
from app.models.gamified import VeteranProfile
from app.models.chat import (
    ChatConversation,
    ChatMessage,
    CounselorProfile,
)
from app.engine.ai_alert_engine import evaluate_and_trigger_alerts

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
    """List available counselors/therapists from database."""
    result = await db.execute(
        select(CounselorProfile).where(CounselorProfile.is_available == True).order_by(CounselorProfile.created_at.asc())
    )
    counselors = result.scalars().all()

    out = []
    for c in counselors:
        cleaned_name = c.name.replace("Dr.", "").replace("Maj.", "").replace("Gen.", "").replace("(Retd.)", "").strip()
        parts = cleaned_name.split()
        initials = ("".join([p[0] for p in parts[:2]])).upper() if parts else "CL"
        out.append({
            "id": str(c.id),
            "name": c.name,
            "title": c.title or "Clinical Lead & Trauma Specialist",
            "specialty": c.specialization or "Combat PTSD & Trauma Recovery",
            "specialization": c.specialization or "Combat PTSD & Trauma Recovery",
            "credentials": c.credentials or "MD, LCSW",
            "institution": getattr(c, "institution", None) or "Armed Forces Medical Command",
            "email": c.email or "",
            "phone": c.phone or "",
            "avatar": initials,
            "avatarUrl": getattr(c, "avatar_url", None) or "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200",
            "rating": 4.9,
            "active_clients": getattr(c, "current_veterans", 8),
            "current_veterans": getattr(c, "current_veterans", 8),
            "max_veterans": getattr(c, "max_veterans", 25),
            "avg_response_minutes": getattr(c, "avg_response_minutes", 15),
        })

    return {
        "counselors": out,
        "total": len(out),
    }


@router.get("/api/chat/messages")
@router.get("/api/veterans/{veteran_id}/chat/messages")
async def get_direct_messages(
    veteran_id: uuid.UUID,
    counselor_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Fetch chat history between a veteran and their clinical counselor."""
    c_uuid = None
    if counselor_id:
        try:
            c_uuid = uuid.UUID(counselor_id)
        except Exception:
            c_uuid = None

    # Find active conversation for this veteran (optionally filtered by counselor)
    if c_uuid:
        result = await db.execute(
            select(ChatConversation)
            .where(ChatConversation.veteran_id == veteran_id, ChatConversation.counselor_id == c_uuid)
            .order_by(ChatConversation.created_at.desc())
        )
    else:
        result = await db.execute(
            select(ChatConversation)
            .where(ChatConversation.veteran_id == veteran_id)
            .order_by(ChatConversation.created_at.desc())
        )
    conversation = result.scalars().first()

    # Find counselor profile
    counselor_profile = None
    if c_uuid:
        c_res = await db.execute(select(CounselorProfile).where(CounselorProfile.id == c_uuid))
        counselor_profile = c_res.scalar_one_or_none()
    elif conversation and conversation.counselor_id:
        c_res = await db.execute(select(CounselorProfile).where(CounselorProfile.id == conversation.counselor_id))
        counselor_profile = c_res.scalar_one_or_none()

    if not counselor_profile:
        # Fall back to first available counselor
        c_res = await db.execute(select(CounselorProfile).order_by(CounselorProfile.created_at.asc()))
        counselor_profile = c_res.scalars().first()

    c_id = counselor_profile.id if counselor_profile else uuid.UUID("c0000000-0000-0000-0000-000000000001")
    c_name = counselor_profile.name if counselor_profile else "Dr. Ananya Nair"
    c_title = counselor_profile.title if counselor_profile else "Lead Trauma Specialist"

    if not conversation:
        # Create initial conversation thread
        conversation = ChatConversation(
            veteran_id=veteran_id,
            counselor_id=c_id,
            subject="Clinical Care & Grounding",
            status="active",
        )
        db.add(conversation)
        await db.flush()

        # Seed initial greeting from counselor
        initial_msg = ChatMessage(
            conversation_id=conversation.id,
            sender_id=c_id,
            sender_type="counselor",
            content=f"Hello! I am {c_name} ({c_title}). Feel free to reach out here anytime you need guidance, grounding exercises, or care plan adjustments.",
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
        "counselor_id": str(c_id),
        "counselor_name": c_name,
        "counselor_title": c_title,
        "counselor_avatar": getattr(counselor_profile, "avatar_url", None) if counselor_profile else None,
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
    """Send an emergency SOS alert to counselor and trigger AI alert engine."""
    content = payload.get("content", "URGENT: Crisis assistance requested.")

    # Find veteran and their assigned counselor
    v_res = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = v_res.scalar_one_or_none()

    counselor_uuid = getattr(veteran, "assigned_counselor_id", None)
    counselor_name = getattr(veteran, "assigned_counselor_name", None)

    # If not on profile, check conversation
    if not counselor_uuid:
        result = await db.execute(
            select(ChatConversation)
            .where(ChatConversation.veteran_id == veteran_id)
            .order_by(ChatConversation.created_at.desc())
        )
        conversation = result.scalars().first()
        if conversation and conversation.counselor_id:
            counselor_uuid = conversation.counselor_id

    # Fallback to first active counselor
    if not counselor_uuid:
        c_res = await db.execute(select(CounselorProfile).order_by(CounselorProfile.created_at.asc()))
        first_c = c_res.scalars().first()
        counselor_uuid = first_c.id if first_c else uuid.UUID("c0000000-0000-0000-0000-000000000001")
        if first_c and not counselor_name:
            counselor_name = first_c.name

    if not counselor_name:
        c_res2 = await db.execute(select(CounselorProfile).where(CounselorProfile.id == counselor_uuid))
        c_found = c_res2.scalar_one_or_none()
        counselor_name = c_found.name if c_found else "Assigned Clinical Specialist"

    # Find or create conversation
    result = await db.execute(
        select(ChatConversation)
        .where(ChatConversation.veteran_id == veteran_id, ChatConversation.counselor_id == counselor_uuid)
        .order_by(ChatConversation.created_at.desc())
    )
    conversation = result.scalars().first()

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

    # Trigger AI Alert Engine
    created_alert = await evaluate_and_trigger_alerts(
        db, veteran_id, trigger_event="EMERGENCY_SOS", event_details={"content": content}
    )

    return {
        "id": str(msg.id),
        "alert_id": str(created_alert.id) if created_alert else None,
        "message": f"Emergency notification transmitted to clinical caregiver {counselor_name}.",
        "counselor_name": counselor_name,
        "counselor_id": str(counselor_uuid),
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




class AssignCounselorRequest(BaseModel):
    counselor_id: str
    counselor_name: Optional[str] = None
    veteran_id: Optional[uuid.UUID] = None


@router.post("/api/veterans/{veteran_id}/counselor")
@router.post("/api/chat/assign-specialist")
async def choose_counselor(
    req: AssignCounselorRequest,
    veteran_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    """Assign/change counselor for veteran and activate conversation."""
    target_vet_id = veteran_id or req.veteran_id
    if not target_vet_id:
        # Fallback to demo veteran if none specified
        target_vet_id = uuid.UUID("550e8400-e29b-41d4-a716-446655440001")

    c_uuid = None
    try:
        c_uuid = uuid.UUID(req.counselor_id)
    except Exception:
        c_uuid = uuid.UUID("c0000000-0000-0000-0000-000000000001")

    # Fetch counselor from DB
    c_res = await db.execute(select(CounselorProfile).where(CounselorProfile.id == c_uuid))
    counselor = c_res.scalar_one_or_none()

    c_name = counselor.name if counselor else (req.counselor_name or "Dr. Ananya Nair")
    c_title = counselor.title if counselor else "Lead Clinical Caregiver"
    c_avatar = getattr(counselor, "avatar_url", None) or "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200"

    # Check for existing conversation
    res = await db.execute(
        select(ChatConversation)
        .where(ChatConversation.veteran_id == target_vet_id, ChatConversation.counselor_id == c_uuid)
    )
    conv = res.scalars().first()

    now = datetime.now(timezone.utc)
    if not conv:
        conv = ChatConversation(
            veteran_id=target_vet_id,
            counselor_id=c_uuid,
            subject="Clinical Care & Grounding",
            status="active",
            created_at=now,
            last_message_at=now,
        )
        db.add(conv)
        await db.flush()

        initial_msg = ChatMessage(
            conversation_id=conv.id,
            sender_id=c_uuid,
            sender_type="counselor",
            content=f"Hello! I am {c_name} ({c_title}). I have accepted your match as your clinical specialist. Feel free to reach out anytime for recovery support.",
            created_at=now,
        )
        db.add(initial_msg)
        conv.last_message = initial_msg.content[:200]
    else:
        conv.status = "active"
        conv.last_message_at = now

    # Also bind counselor directly to VeteranProfile and CounselorCaseAssignment
    v_res = await db.execute(select(VeteranProfile).where(VeteranProfile.id == target_vet_id))
    vet = v_res.scalar_one_or_none()
    if vet:
        vet.assigned_counselor_id = c_uuid
        vet.assigned_counselor_name = c_name

        ca_res = await db.execute(
            select(CounselorCaseAssignment).where(
                CounselorCaseAssignment.survivor_id == vet.survivor_id,
                CounselorCaseAssignment.counselor_id == c_uuid,
            )
        )
        ca = ca_res.scalar_one_or_none()
        if not ca:
            ca = CounselorCaseAssignment(
                survivor_id=vet.survivor_id,
                counselor_id=c_uuid,
                is_active=True,
            )
            db.add(ca)
        else:
            ca.is_active = True

    await db.commit()

    return {
        "success": True,
        "veteran_id": str(target_vet_id),
        "counselor_id": str(c_uuid),
        "counselor_name": c_name,
        "counselor_title": c_title,
        "counselor_avatar": c_avatar,
        "specialization": getattr(counselor, "specialization", "Trauma Recovery"),
        "institution": getattr(counselor, "institution", "Armed Forces Medical Command"),
        "message": f"Successfully matched with {c_name}",
    }

