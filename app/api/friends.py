"""Friends and Direct Messaging API — request/accept model.

Endpoints:
  GET    /api/veterans/{id}/friends          — accepted friends list
  GET    /api/veterans/{id}/friend-requests  — incoming pending requests
  POST   /api/veterans/{id}/friends          — send friend request
  PATCH  /api/veterans/{id}/friend-requests/{req_id} — accept or reject
  DELETE /api/veterans/{id}/friends/{friend_id}       — remove accepted friend
  GET    /api/veterans/{id}/discover         — discover other vets
  GET    /api/veterans/{id}/dm/{other_id}    — DM thread
  POST   /api/veterans/{id}/dm/{other_id}    — send DM
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, text, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.gamified import VeteranProfile
from app.models.chat import ChatMessage

router = APIRouter(tags=["friends"])


# ── Pydantic Bodies ────────────────────────────────────────────────────────────

class FriendRequestBody(BaseModel):
    friend_veteran_id: uuid.UUID


class RequestActionBody(BaseModel):
    action: str  # "accept" or "reject"


class DMSendBody(BaseModel):
    content: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _get_vet(db: AsyncSession, vid: uuid.UUID) -> VeteranProfile:
    r = await db.execute(select(VeteranProfile).where(VeteranProfile.id == vid))
    v = r.scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Veteran not found")
    return v


async def _vet_dict(db: AsyncSession, vid: str) -> dict:
    try:
        r = await db.execute(select(VeteranProfile).where(VeteranProfile.id == uuid.UUID(vid)))
        v = r.scalar_one_or_none()
        if v:
            return {
                "id": str(v.id),
                "rank": v.rank or "Soldier",
                "service_branch": v.service_branch or "Indian Armed Forces",
                "total_points": v.total_points,
                "current_streak": v.current_streak,
                "avatar_url": v.avatar_url,
            }
    except Exception:
        pass
    return {"id": vid, "rank": "Unknown", "service_branch": "Unknown", "total_points": 0, "current_streak": 0}


# ── Accepted friends ───────────────────────────────────────────────────────────

@router.get("/api/veterans/{veteran_id}/friends")
async def get_friends(veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Return accepted friends for this veteran."""
    vid = str(veteran_id)
    rows = await db.execute(text(
        "SELECT id, requester_id, receiver_id, created_at FROM friend_requests "
        "WHERE status='accepted' AND (requester_id=:v OR receiver_id=:v)"
    ), {"v": vid})
    entries = rows.fetchall()
    friends = []
    for row in entries:
        other_id = row[2] if row[1] == vid else row[1]
        friend_data = await _vet_dict(db, other_id)
        friend_data["added_at"] = row[3]
        friends.append(friend_data)
    return {"veteran_id": vid, "friends": friends, "count": len(friends)}


# ── Incoming pending requests ──────────────────────────────────────────────────

@router.get("/api/veterans/{veteran_id}/friend-requests")
async def get_friend_requests(veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Return incoming pending friend requests."""
    vid = str(veteran_id)
    rows = await db.execute(text(
        "SELECT id, requester_id, created_at FROM friend_requests "
        "WHERE status='pending' AND receiver_id=:v"
    ), {"v": vid})
    entries = rows.fetchall()
    requests = []
    for row in entries:
        req_data = await _vet_dict(db, row[1])
        req_data["request_id"] = row[0]
        req_data["requested_at"] = row[2]
        requests.append(req_data)
    return {"veteran_id": vid, "requests": requests, "count": len(requests)}


# ── Send friend request ────────────────────────────────────────────────────────

@router.post("/api/veterans/{veteran_id}/friends", status_code=201)
async def send_friend_request(
    veteran_id: uuid.UUID,
    body: FriendRequestBody,
    db: AsyncSession = Depends(get_db),
):
    """Send a friend request — NO XP awarded."""
    if veteran_id == body.friend_veteran_id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    await _get_vet(db, veteran_id)
    await _get_vet(db, body.friend_veteran_id)

    vid = str(veteran_id)
    fid = str(body.friend_veteran_id)

    # Check for existing relationship in either direction
    row = await db.execute(text(
        "SELECT id, status FROM friend_requests WHERE "
        "(requester_id=:a AND receiver_id=:b) OR (requester_id=:b AND receiver_id=:a)"
    ), {"a": vid, "b": fid})
    existing = row.fetchone()

    if existing:
        status = existing[1]
        if status == "accepted":
            return {"message": "Already friends!", "status": "accepted"}
        if status == "pending":
            return {"message": "Request already sent — waiting for acceptance.", "status": "pending"}
        # If rejected, allow re-sending — update to pending
        await db.execute(text(
            "UPDATE friend_requests SET status='pending', requester_id=:a, receiver_id=:b, updated_at=:now "
            "WHERE id=:rid"
        ), {"a": vid, "b": fid, "now": _now(), "rid": existing[0]})
        await db.commit()
        return {"message": "Friend request re-sent!", "status": "pending"}

    req_id = str(uuid.uuid4())
    now = _now()
    await db.execute(text(
        "INSERT INTO friend_requests (id, requester_id, receiver_id, status, created_at, updated_at) "
        "VALUES (:id, :req, :rec, 'pending', :now, :now)"
    ), {"id": req_id, "req": vid, "rec": fid, "now": now})
    await db.commit()
    return {"message": "Friend request sent!", "status": "pending", "request_id": req_id}


# ── Accept / Reject request ────────────────────────────────────────────────────

@router.patch("/api/veterans/{veteran_id}/friend-requests/{request_id}")
async def respond_to_request(
    veteran_id: uuid.UUID,
    request_id: str,
    body: RequestActionBody,
    db: AsyncSession = Depends(get_db),
):
    """Accept or reject an incoming friend request."""
    if body.action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'reject'")
    vid = str(veteran_id)
    row = await db.execute(text(
        "SELECT id, status FROM friend_requests WHERE id=:rid AND receiver_id=:vid"
    ), {"rid": request_id, "vid": vid})
    req = row.fetchone()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    new_status = "accepted" if body.action == "accept" else "rejected"
    await db.execute(text(
        "UPDATE friend_requests SET status=:s, updated_at=:now WHERE id=:rid"
    ), {"s": new_status, "now": _now(), "rid": request_id})
    await db.commit()
    msg = "Friend request accepted! 🤝" if body.action == "accept" else "Request declined."
    return {"message": msg, "status": new_status}


# ── Remove friend ──────────────────────────────────────────────────────────────

@router.delete("/api/veterans/{veteran_id}/friends/{friend_id}")
async def remove_friend(veteran_id: uuid.UUID, friend_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Remove an accepted friend (in either direction)."""
    vid = str(veteran_id)
    fid = str(friend_id)
    row = await db.execute(text(
        "SELECT id FROM friend_requests WHERE status='accepted' AND "
        "((requester_id=:a AND receiver_id=:b) OR (requester_id=:b AND receiver_id=:a))"
    ), {"a": vid, "b": fid})
    req = row.fetchone()
    if not req:
        raise HTTPException(status_code=404, detail="Friend not found")
    await db.execute(text("DELETE FROM friend_requests WHERE id=:rid"), {"rid": req[0]})
    await db.commit()
    return {"message": "Friend removed"}


# ── Discover ───────────────────────────────────────────────────────────────────

@router.get("/api/veterans/{veteran_id}/discover")
async def discover_veterans(
    veteran_id: uuid.UUID,
    search: str = "",
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Discover other veterans not yet friended."""
    vid = str(veteran_id)

    # Get IDs already in a relationship
    rows = await db.execute(text(
        "SELECT requester_id, receiver_id FROM friend_requests "
        "WHERE requester_id=:v OR receiver_id=:v"
    ), {"v": vid})
    excluded = {vid}
    for row in rows.fetchall():
        excluded.add(row[0])
        excluded.add(row[1])

    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id != veteran_id).limit(50))
    veterans = result.scalars().all()

    out = []
    for v in veterans:
        sid = str(v.id)
        if sid in excluded:
            continue
        if search:
            s = search.lower()
            if s not in (v.rank or "").lower() and s not in (v.service_branch or "").lower():
                continue
        out.append({
            "id": sid,
            "rank": v.rank or "Soldier",
            "service_branch": v.service_branch or "Indian Armed Forces",
            "total_points": v.total_points,
            "current_streak": v.current_streak,
            "avatar_url": v.avatar_url,
        })
        if len(out) >= limit:
            break

    return {"veterans": out}


# ── DM Thread ──────────────────────────────────────────────────────────────────

@router.get("/api/veterans/{veteran_id}/dm/{other_veteran_id}")
async def get_dm_thread(
    veteran_id: uuid.UUID,
    other_veteran_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
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
async def send_dm(
    veteran_id: uuid.UUID,
    other_veteran_id: uuid.UUID,
    body: DMSendBody,
    db: AsyncSession = Depends(get_db),
):
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
    ts = msg.created_at.isoformat() if msg.created_at else _now()
    return {"id": str(msg.id), "message": "Sent!", "created_at": ts}
