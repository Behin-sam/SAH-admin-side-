"""Friends and Direct Messaging API for veteran-to-veteran social features."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.gamified import VeteranProfile, PointsLedger
from app.models.chat import ChatMessage

router = APIRouter(tags=["friends"])


class FriendRequestBody(BaseModel):
    friend_veteran_id: uuid.UUID


class DMSendBody(BaseModel):
    content: str


@router.get("/api/veterans/{veteran_id}/friends")
async def get_friends(veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get veteran friends list."""
    result = await db.execute(
        select(PointsLedger).where(
            PointsLedger.veteran_id == veteran_id,
            PointsLedger.category == "friend_added",
        )
    )
    entries = result.scalars().all()
    friends = []
    for entry in entries:
        parts = entry.reason.split("Added friend: ")
        if len(parts) < 2:
            continue
        try:
            friend_id = uuid.UUID(parts[1].strip())
        except ValueError:
            continue
        fr = await db.execute(select(VeteranProfile).where(VeteranProfile.id == friend_id))
        fp = fr.scalar_one_or_none()
        if fp:
            friends.append({
                "id": str(fp.id),
                "rank": fp.rank or "Soldier",
                "service_branch": fp.service_branch or "Indian Army",
                "total_points": fp.total_points,
                "current_streak": fp.current_streak,
                "added_at": entry.created_at.isoformat(),
            })
    return {"veteran_id": str(veteran_id), "friends": friends, "count": len(friends)}


@router.post("/api/veterans/{veteran_id}/friends")
async def add_friend(veteran_id: uuid.UUID, body: FriendRequestBody, db: AsyncSession = Depends(get_db)):
    """Add friend — only awards +5 XP on first-ever add."""
    if veteran_id == body.friend_veteran_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")
    v1 = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    v2 = await db.execute(select(VeteranProfile).where(VeteranProfile.id == body.friend_veteran_id))
    if not v1.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Veteran not found")
    if not v2.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Friend not found")
    existing = await db.execute(
        select(PointsLedger).where(
            PointsLedger.veteran_id == veteran_id,
            PointsLedger.category == "friend_added",
            PointsLedger.reason == f"Added friend: {body.friend_veteran_id}",
        )
    )
    if existing.scalar_one_or_none():
        return {"message": "Already friends!", "points_earned": 0}
    entry = PointsLedger(
        veteran_id=veteran_id,
        points=5,
        reason=f"Added friend: {body.friend_veteran_id}",
        category="friend_added",
    )
    db.add(entry)
    vet_r = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    vet = vet_r.scalar_one_or_none()
    if vet:
        vet.total_points += 5
    await db.commit()
    return {"message": "Friend added! +5 Valor Points", "points_earned": 5}


@router.delete("/api/veterans/{veteran_id}/friends/{friend_id}")
async def remove_friend(veteran_id: uuid.UUID, friend_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Remove a friend."""
    result = await db.execute(
        select(PointsLedger).where(
            PointsLedger.veteran_id == veteran_id,
            PointsLedger.category == "friend_added",
            PointsLedger.reason == f"Added friend: {friend_id}",
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Friend not found")
    await db.delete(entry)
    await db.commit()
    return {"message": "Friend removed"}


@router.get("/api/veterans/{veteran_id}/dm/{other_veteran_id}")
async def get_dm_thread(veteran_id: uuid.UUID, other_veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get DM conversation between two veterans."""
    result = await db.execute(
        select(ChatMessage).where(
            ChatMessage.sender_type == "dm",
            or_(
                and_(
                    ChatMessage.veteran_id == veteran_id,
                    ChatMessage.counselor_id == str(other_veteran_id),
                ),
                and_(
                    ChatMessage.veteran_id == other_veteran_id,
                    ChatMessage.counselor_id == str(veteran_id),
                ),
            )
        ).order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    return {
        "messages": [
            {
                "id": str(m.id),
                "sender_id": str(m.veteran_id),
                "content": m.content,
                "created_at": m.created_at.isoformat(),
                "is_mine": m.veteran_id == veteran_id,
            }
            for m in messages
        ]
    }


@router.post("/api/veterans/{veteran_id}/dm/{other_veteran_id}", status_code=201)
async def send_dm(veteran_id: uuid.UUID, other_veteran_id: uuid.UUID, body: DMSendBody, db: AsyncSession = Depends(get_db)):
    """Send a DM to another veteran."""
    if not body.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    msg = ChatMessage(
        veteran_id=veteran_id,
        counselor_id=str(other_veteran_id),
        content=body.content.strip(),
        sender_type="dm",
    )
    db.add(msg)
    await db.commit()
    ts = msg.created_at.isoformat() if msg.created_at else datetime.now(timezone.utc).isoformat()
    return {"id": str(msg.id), "message": "Sent!", "created_at": ts}


@router.get("/api/veterans/{veteran_id}/discover")
async def discover_veterans(veteran_id: uuid.UUID, search: str = "", limit: int = 20, db: AsyncSession = Depends(get_db)):
    """Discover other veterans to add as friends."""
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id != veteran_id).limit(limit))
    veterans = result.scalars().all()
    return {
        "veterans": [
            {
                "id": str(v.id),
                "rank": v.rank or "Soldier",
                "service_branch": v.service_branch or "Indian Army",
                "total_points": v.total_points,
                "current_streak": v.current_streak,
            }
            for v in veterans
            if not search or search.lower() in (v.rank or "").lower() or search.lower() in (v.service_branch or "").lower()
        ]
    }
