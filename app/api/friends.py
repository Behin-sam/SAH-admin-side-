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
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, text, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.gamified import VeteranProfile
from app.models import SurvivorProfile

router = APIRouter(tags=["friends"])


# ── Pydantic Bodies ────────────────────────────────────────────────────────────

class FriendRequestBody(BaseModel):
    friend_veteran_id: Any


class RequestActionBody(BaseModel):
    action: str  # "accept" or "reject"


class DMSendBody(BaseModel):
    content: str


# ── Helpers ────────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _ensure_tables(db: AsyncSession):
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS friend_requests (
            id TEXT PRIMARY KEY,
            requester_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
    """))
    await db.execute(text("""
        CREATE TABLE IF NOT EXISTS direct_messages (
            id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            content TEXT NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            created_at TEXT NOT NULL
        );
    """))
    await db.execute(text("CREATE INDEX IF NOT EXISTS ix_dm_pair ON direct_messages(sender_id, receiver_id);"))
    await db.commit()


async def _resolve_veteran_uuid(db: AsyncSession, vid: Any) -> uuid.UUID:
    if isinstance(vid, uuid.UUID):
        return vid
    if vid:
        try:
            val = uuid.UUID(str(vid))
            res = await db.execute(select(VeteranProfile).where(VeteranProfile.id == val))
            if res.scalar_one_or_none():
                return val
        except Exception:
            pass

    result = await db.execute(select(VeteranProfile))
    vet = result.scalars().first()
    if vet:
        return vet.id

    return uuid.UUID("550e8400-e29b-41d4-a716-446655440001")


async def _vet_dict(db: AsyncSession, vid_str: str) -> dict:
    try:
        val = uuid.UUID(vid_str)
        r = await db.execute(
            select(VeteranProfile, SurvivorProfile)
            .outerjoin(SurvivorProfile, VeteranProfile.survivor_id == SurvivorProfile.id)
            .where(VeteranProfile.id == val)
        )
        row = r.first()
        if row:
            v, surv = row
            v_name = (surv.preferred_language if (surv and surv.preferred_language and len(surv.preferred_language) > 2) else None) or v.rank or "Comrade"
            return {
                "id": str(v.id),
                "name": v_name,
                "rank": v.rank or "Soldier",
                "service_branch": v.service_branch or "Indian Armed Forces",
                "total_points": v.total_points or 0,
                "current_streak": v.current_streak or 0,
                "avatar_url": v.avatar_url or "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
            }
    except Exception:
        pass
    return {
        "id": vid_str,
        "name": "Comrade",
        "rank": "Soldier",
        "service_branch": "Indian Armed Forces",
        "total_points": 0,
        "current_streak": 0,
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
    }


# ── Accepted friends ───────────────────────────────────────────────────────────

@router.get("/api/veterans/{veteran_id}/friends")
async def get_friends(veteran_id: str, db: AsyncSession = Depends(get_db)):
    """Return accepted friends for this veteran."""
    await _ensure_tables(db)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    vid = str(v_uuid)

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
async def get_friend_requests(veteran_id: str, db: AsyncSession = Depends(get_db)):
    """Return incoming pending friend requests."""
    await _ensure_tables(db)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    vid = str(v_uuid)

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
    veteran_id: str,
    body: FriendRequestBody,
    db: AsyncSession = Depends(get_db),
):
    """Send a friend request — NO XP awarded."""
    await _ensure_tables(db)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    f_uuid = await _resolve_veteran_uuid(db, body.friend_veteran_id)

    if v_uuid == f_uuid:
        raise HTTPException(status_code=400, detail="Cannot add yourself as comrade")

    vid = str(v_uuid)
    fid = str(f_uuid)

    # Check for existing relationship in either direction
    row = await db.execute(text(
        "SELECT id, status FROM friend_requests WHERE "
        "(requester_id=:a AND receiver_id=:b) OR (requester_id=:b AND receiver_id=:a)"
    ), {"a": vid, "b": fid})
    existing = row.fetchone()

    if existing:
        status = existing[1]
        if status == "accepted":
            return {"message": "Already comrades!", "status": "accepted"}
        if status == "pending":
            return {"message": "Friend request already sent — waiting for acceptance.", "status": "pending"}
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
    veteran_id: str,
    request_id: str,
    body: RequestActionBody,
    db: AsyncSession = Depends(get_db),
):
    """Accept or reject an incoming friend request."""
    if body.action not in ("accept", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'accept' or 'reject'")
    await _ensure_tables(db)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    vid = str(v_uuid)

    row = await db.execute(text(
        "SELECT id, status FROM friend_requests WHERE id=:rid AND receiver_id=:vid"
    ), {"rid": request_id, "vid": vid})
    req = row.fetchone()
    if not req:
        # Fallback without receiver filter if id matches
        row_fb = await db.execute(text("SELECT id, status FROM friend_requests WHERE id=:rid"), {"rid": request_id})
        req = row_fb.fetchone()
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
async def remove_friend(veteran_id: str, friend_id: str, db: AsyncSession = Depends(get_db)):
    """Remove an accepted friend (in either direction)."""
    await _ensure_tables(db)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    f_uuid = await _resolve_veteran_uuid(db, friend_id)
    vid = str(v_uuid)
    fid = str(f_uuid)

    row = await db.execute(text(
        "SELECT id FROM friend_requests WHERE status='accepted' AND "
        "((requester_id=:a AND receiver_id=:b) OR (requester_id=:b AND receiver_id=:a))"
    ), {"a": vid, "b": fid})
    req = row.fetchone()
    if not req:
        return {"message": "Friend already removed"}

    await db.execute(text("DELETE FROM friend_requests WHERE id=:rid"), {"rid": req[0]})
    await db.commit()
    return {"message": "Friend removed"}


# ── Discover ───────────────────────────────────────────────────────────────────

@router.get("/api/veterans/{veteran_id}/discover")
async def discover_veterans(
    veteran_id: str,
    search: str = "",
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Discover other veterans not yet friended."""
    await _ensure_tables(db)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    vid = str(v_uuid)

    # Get IDs already in a relationship
    rows = await db.execute(text(
        "SELECT requester_id, receiver_id FROM friend_requests "
        "WHERE requester_id=:v OR receiver_id=:v"
    ), {"v": vid})
    excluded = {vid}
    for row in rows.fetchall():
        excluded.add(row[0])
        excluded.add(row[1])

    result = await db.execute(
        select(VeteranProfile, SurvivorProfile)
        .outerjoin(SurvivorProfile, VeteranProfile.survivor_id == SurvivorProfile.id)
        .where(VeteranProfile.id != v_uuid)
        .limit(50)
    )
    rows_all = result.all()

    out = []
    for v, surv in rows_all:
        sid = str(v.id)
        if sid in excluded:
            continue
        v_name = (surv.preferred_language if (surv and surv.preferred_language and len(surv.preferred_language) > 2) else None) or v.rank or "Veteran"
        if search:
            s = search.lower()
            if s not in v_name.lower() and s not in (v.rank or "").lower() and s not in (v.service_branch or "").lower():
                continue
        out.append({
            "id": sid,
            "name": v_name,
            "rank": v.rank or "Soldier",
            "service_branch": v.service_branch or "Indian Armed Forces",
            "total_points": v.total_points or 0,
            "current_streak": v.current_streak or 0,
            "avatar_url": v.avatar_url or "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
        })
        if len(out) >= limit:
            break

    return {"veterans": out}


# ── DM Thread ──────────────────────────────────────────────────────────────────

@router.get("/api/veterans/{veteran_id}/dm/{other_veteran_id}")
async def get_dm_thread(
    veteran_id: str,
    other_veteran_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve direct message chat history between two veterans."""
    await _ensure_tables(db)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    o_uuid = await _resolve_veteran_uuid(db, other_veteran_id)
    vid = str(v_uuid)
    oid = str(o_uuid)

    rows = await db.execute(text(
        "SELECT id, sender_id, receiver_id, content, created_at FROM direct_messages "
        "WHERE (sender_id=:a AND receiver_id=:b) OR (sender_id=:b AND receiver_id=:a) "
        "ORDER BY created_at ASC LIMIT :lim"
    ), {"a": vid, "b": oid, "lim": limit})
    entries = rows.fetchall()

    messages = [
        {
            "id": r[0],
            "sender_id": r[1],
            "receiver_id": r[2],
            "content": r[3],
            "created_at": r[4],
            "is_mine": (r[1] == vid),
        }
        for r in entries
    ]

    return {"veteran_id": vid, "other_veteran_id": oid, "messages": messages}


@router.post("/api/veterans/{veteran_id}/dm/{other_veteran_id}", status_code=201)
async def send_dm(
    veteran_id: str,
    other_veteran_id: str,
    body: DMSendBody,
    db: AsyncSession = Depends(get_db),
):
    """Send a direct message to a fellow veteran comrade."""
    await _ensure_tables(db)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    o_uuid = await _resolve_veteran_uuid(db, other_veteran_id)
    vid = str(v_uuid)
    oid = str(o_uuid)

    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    msg_id = str(uuid.uuid4())
    now = _now()
    await db.execute(text(
        "INSERT INTO direct_messages (id, sender_id, receiver_id, content, is_read, created_at) "
        "VALUES (:id, :sender, :receiver, :content, 0, :now)"
    ), {"id": msg_id, "sender": vid, "receiver": oid, "content": body.content.strip(), "now": now})
    await db.commit()

    return {
        "id": msg_id,
        "sender_id": vid,
        "receiver_id": oid,
        "content": body.content.strip(),
        "created_at": now,
        "is_mine": True,
    }
