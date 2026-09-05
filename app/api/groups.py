"""Veteran group and social activity endpoints.

GET    /api/groups                      — List public groups
POST   /api/groups                      — Create a new group
GET    /api/groups/{id}                 — Get group details
POST   /api/groups/{id}/join            — Join a group
POST   /api/groups/{id}/leave           — Leave a group
GET    /api/groups/{id}/members         — List group members
POST   /api/groups/{id}/activities      — Create group activity
GET    /api/groups/{id}/activities      — List group activities
POST   /api/groups/{id}/activities/{aid}/join   — Join activity
POST   /api/groups/{id}/activities/{aid}/complete — Complete activity
GET    /api/veterans/{id}/groups        — Get veteran's groups
GET    /api/veterans/{id}/interactions  — Get social interaction history
POST   /api/veterans/{id}/interactions  — Log social interaction
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, Body, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import SurvivorProfile
from app.models.gamified import (
    VeteranProfile,
    VeteranGroup,
    GroupMembership,
    GroupActivity,
    GroupActivityParticipant,
    GroupMessage,
    PointsLedger,
    SocialInteraction,
    GroupRole,
    InteractionType,
    TaskType,
    DailyTask,
    TaskStatus,
)

router = APIRouter(tags=["groups"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _resolve_veteran_uuid(db: AsyncSession, vid: Any) -> uuid.UUID:
    """Safely resolve string ID or UUID to a valid VeteranProfile UUID."""
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

    # Fallback to first veteran profile in DB
    result = await db.execute(select(VeteranProfile))
    vet = result.scalars().first()
    if vet:
        return vet.id

    return uuid.UUID("550e8400-e29b-41d4-a716-446655440001")


async def _resolve_group_uuid(db: AsyncSession, gid: Any) -> uuid.UUID:
    """Safely resolve string ID or UUID to a valid VeteranGroup UUID."""
    if isinstance(gid, uuid.UUID):
        return gid
    if gid:
        try:
            val = uuid.UUID(str(gid))
            res = await db.execute(select(VeteranGroup).where(VeteranGroup.id == val))
            if res.scalar_one_or_none():
                return val
        except Exception:
            pass

    # Search by string ID or fallback to first group
    result = await db.execute(select(VeteranGroup))
    group = result.scalars().first()
    if group:
        return group.id

    raise HTTPException(status_code=404, detail="Group not found")


# ─── Group CRUD ───────────────────────────────────────────────────────────────

@router.get("/api/groups")
async def list_groups(
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List public veteran groups."""
    query = select(VeteranGroup).where(VeteranGroup.is_public == True)

    if search:
        query = query.where(VeteranGroup.name.ilike(f"%{search}%"))

    query = query.order_by(VeteranGroup.member_count.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    groups = result.scalars().all()

    return {
        "groups": [
            {
                "id": str(g.id),
                "name": g.name,
                "description": g.description,
                "member_count": g.member_count,
                "max_members": g.max_members,
                "total_points": g.total_group_points,
                "activities_completed": g.activities_completed,
                "created_at": g.created_at.isoformat() if g.created_at else None,
            }
            for g in groups
        ],
        "total": len(groups),
    }


class CreateGroupRequest(BaseModel):
    name: str
    created_by: Any = None
    description: str | None = None
    max_members: int = 50
    is_public: bool = True


@router.post("/api/groups", status_code=201)
async def create_group(
    req: CreateGroupRequest | None = None,
    name: str | None = None,
    created_by: Any = None,
    description: str | None = None,
    max_members: int = 50,
    is_public: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """Create a new veteran group."""
    actual_name = (req.name if req else name)
    raw_creator = (req.created_by if req and req.created_by is not None else created_by)
    actual_desc = (req.description if req else description)
    actual_max = (req.max_members if req else max_members) or 50
    actual_public = (req.is_public if req else is_public)

    if not actual_name:
        raise HTTPException(status_code=400, detail="Missing squad name")

    actual_creator = await _resolve_veteran_uuid(db, raw_creator)

    group = VeteranGroup(
        name=actual_name.strip(),
        description=actual_desc.strip() if actual_desc else "Veteran peer support circle focused on resilience.",
        created_by=actual_creator,
        max_members=actual_max,
        is_public=actual_public,
        member_count=1,
    )
    db.add(group)
    await db.flush()

    # Add creator as admin
    membership = GroupMembership(
        group_id=group.id,
        veteran_id=actual_creator,
        role=GroupRole.ADMIN,
    )
    db.add(membership)

    # Update veteran's group count & points
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == actual_creator))
    veteran = result.scalar_one_or_none()
    if veteran:
        veteran.groups_joined = (veteran.groups_joined or 0) + 1
        veteran.total_points = (veteran.total_points or 0) + 25

        points_entry = PointsLedger(
            veteran_id=actual_creator,
            points=25,
            reason=f"Founded squad: {actual_name.strip()}",
            category="group_creation",
        )
        db.add(points_entry)

    await db.commit()

    return {
        "id": str(group.id),
        "name": group.name,
        "description": group.description,
        "member_count": 1,
        "max_members": group.max_members,
        "total_points": 0,
        "activities_completed": 0,
        "message": f"Squad '{group.name}' commissioned! 🎖️",
        "points_earned": 25,
    }


@router.get("/api/groups/{group_id}")
async def get_group(group_id: str, db: AsyncSession = Depends(get_db)):
    """Get group details."""
    g_uuid = await _resolve_group_uuid(db, group_id)
    result = await db.execute(select(VeteranGroup).where(VeteranGroup.id == g_uuid))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get upcoming activities
    result = await db.execute(
        select(GroupActivity).where(
            GroupActivity.group_id == g_uuid,
            GroupActivity.status == "scheduled",
        ).order_by(GroupActivity.scheduled_at).limit(10)
    )
    activities = result.scalars().all()

    return {
        "id": str(group.id),
        "name": group.name,
        "description": group.description,
        "member_count": group.member_count,
        "max_members": group.max_members,
        "total_points": group.total_group_points,
        "activities_completed": group.activities_completed,
        "activity_schedule": group.activity_schedule,
        "upcoming_activities": [
            {
                "id": str(a.id),
                "title": a.title,
                "description": a.description,
                "scheduled_at": a.scheduled_at.isoformat() if a.scheduled_at else None,
                "participants_count": a.participants_count,
            }
            for a in activities
        ],
        "created_at": group.created_at.isoformat() if group.created_at else None,
    }


# ─── Group Membership ────────────────────────────────────────────────────────

@router.post("/api/groups/{group_id}/join")
async def join_group(
    group_id: str,
    veteran_id: Any = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Join a veteran group."""
    g_uuid = await _resolve_group_uuid(db, group_id)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)

    result = await db.execute(select(VeteranGroup).where(VeteranGroup.id == g_uuid))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.max_members and group.member_count >= group.max_members:
        group.max_members = max(group.max_members + 25, group.member_count + 10)

    # Check if existing membership record exists
    result = await db.execute(
        select(GroupMembership).where(
            GroupMembership.group_id == g_uuid,
            GroupMembership.veteran_id == v_uuid,
        )
    )
    existing_membership = result.scalar_one_or_none()
    is_rejoin = False
    if existing_membership:
        if existing_membership.is_active:
            return {
                "message": f"Already an active member of {group.name}! 🤝",
                "group_id": str(group.id),
                "points_earned": 0,
            }
        existing_membership.is_active = True
        existing_membership.joined_at = datetime.now(timezone.utc)
        is_rejoin = True
    else:
        membership = GroupMembership(
            group_id=g_uuid,
            veteran_id=v_uuid,
        )
        db.add(membership)

    group.member_count = (group.member_count or 0) + 1

    # Update veteran stats and award points ONLY on first join, not rejoins
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == v_uuid))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    if not is_rejoin:
        veteran.groups_joined = (veteran.groups_joined or 0) + 1
        points_entry = PointsLedger(
            veteran_id=v_uuid,
            points=15,
            reason=f"Joined squad: {group.name}",
            category="group_join",
        )
        db.add(points_entry)
        veteran.total_points = (veteran.total_points or 0) + 15

    await db.commit()

    if is_rejoin:
        return {
            "message": f"Welcome back to {group.name}! 🤝",
            "group_id": str(group.id),
            "points_earned": 0,
            "note": "Points are only awarded on your first join.",
        }

    return {
        "message": f"Welcome to {group.name}! 🤝",
        "group_id": str(group.id),
        "points_earned": 15,
    }


@router.post("/api/groups/{group_id}/leave")
async def leave_group(
    group_id: str,
    veteran_id: Any = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Leave a veteran group."""
    g_uuid = await _resolve_group_uuid(db, group_id)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)

    result = await db.execute(
        select(GroupMembership).where(
            GroupMembership.group_id == g_uuid,
            GroupMembership.veteran_id == v_uuid,
            GroupMembership.is_active == True,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        return {"message": "Not an active member of this group", "group_id": str(g_uuid)}

    if membership.role == GroupRole.ADMIN:
        other_members_res = await db.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == g_uuid,
                GroupMembership.veteran_id != v_uuid,
                GroupMembership.is_active == True,
            )
        )
        other_member = other_members_res.scalars().first()
        if other_member:
            other_member.role = GroupRole.ADMIN

    membership.is_active = False

    result = await db.execute(select(VeteranGroup).where(VeteranGroup.id == g_uuid))
    group = result.scalar_one_or_none()
    if group:
        group.member_count = max(0, (group.member_count or 1) - 1)

    await db.commit()

    return {"message": "Left the group", "group_id": str(g_uuid)}


class AwardPointsRequest(BaseModel):
    leader_id: Any = None
    points: int = 15
    task_id: Any = None
    reason: str | None = None


@router.get("/api/groups/{group_id}/members")
async def list_members(group_id: str, db: AsyncSession = Depends(get_db)):
    """List group members with real names, ranks, and task completion status."""
    g_uuid = await _resolve_group_uuid(db, group_id)

    result = await db.execute(
        select(GroupMembership, VeteranProfile, SurvivorProfile)
        .join(VeteranProfile, GroupMembership.veteran_id == VeteranProfile.id)
        .outerjoin(SurvivorProfile, VeteranProfile.survivor_id == SurvivorProfile.id)
        .where(
            GroupMembership.group_id == g_uuid,
            GroupMembership.is_active == True,
        )
    )
    rows = result.all()
    members = []
    for m, v, surv in rows:
        dt_res = await db.execute(
            select(func.count(DailyTask.id)).where(
                DailyTask.veteran_id == v.id,
                DailyTask.status == TaskStatus.COMPLETED,
            )
        )
        dt_count = dt_res.scalar() or 0

        ga_res = await db.execute(
            select(func.count(GroupActivityParticipant.id))
            .join(GroupActivity, GroupActivityParticipant.activity_id == GroupActivity.id)
            .where(
                GroupActivity.group_id == g_uuid,
                GroupActivityParticipant.veteran_id == v.id,
                GroupActivityParticipant.status == "completed",
            )
        )
        ga_count = ga_res.scalar() or 0
        total_completed = dt_count + ga_count

        v_name = (surv.preferred_language if (surv and surv.preferred_language and len(surv.preferred_language) > 2) else None) or v.rank or "Comrade"

        members.append({
            "veteran_id": str(m.veteran_id),
            "name": v_name,
            "rank": v.rank or "Soldier",
            "service_branch": v.service_branch or "Indian Armed Forces",
            "role": m.role.value if hasattr(m.role, 'value') else str(m.role),
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            "total_points": v.total_points or 0,
            "current_streak": v.current_streak or 0,
            "completed_tasks_count": total_completed,
            "has_finished_task": total_completed > 0,
        })

    return {
        "group_id": str(g_uuid),
        "members": members,
        "count": len(members),
    }


@router.post("/api/groups/{group_id}/members/{veteran_id}/award-points")
async def award_member_points(
    group_id: str,
    veteran_id: str,
    payload: AwardPointsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Allow a group leader / admin to award points to a member ONLY IF the member has completed a task.
    """
    g_uuid = await _resolve_group_uuid(db, group_id)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    l_uuid = await _resolve_veteran_uuid(db, payload.leader_id)

    group_res = await db.execute(select(VeteranGroup).where(VeteranGroup.id == g_uuid))
    group = group_res.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    member_res = await db.execute(
        select(GroupMembership).where(
            GroupMembership.group_id == g_uuid,
            GroupMembership.veteran_id == v_uuid,
            GroupMembership.is_active == True,
        )
    )
    member_membership = member_res.scalar_one_or_none()
    if not member_membership:
        raise HTTPException(status_code=404, detail="Comrade is not an active member of this squad.")

    completed_task_title = None
    if payload.task_id:
        try:
            t_uuid = uuid.UUID(str(payload.task_id))
            dt_res = await db.execute(
                select(DailyTask).where(
                    DailyTask.id == t_uuid,
                    DailyTask.veteran_id == v_uuid,
                    DailyTask.status == TaskStatus.COMPLETED,
                )
            )
            dt = dt_res.scalar_one_or_none()
            if dt:
                completed_task_title = dt.title
        except Exception:
            pass

    if not completed_task_title:
        squad_act_res = await db.execute(
            select(GroupActivityParticipant, GroupActivity)
            .join(GroupActivity, GroupActivityParticipant.activity_id == GroupActivity.id)
            .where(
                GroupActivity.group_id == g_uuid,
                GroupActivityParticipant.veteran_id == v_uuid,
                GroupActivityParticipant.status == "completed",
            )
        )
        squad_act = squad_act_res.first()
        if squad_act:
            completed_task_title = squad_act[1].title
        else:
            dt_res = await db.execute(
                select(DailyTask).where(
                    DailyTask.veteran_id == v_uuid,
                    DailyTask.status == TaskStatus.COMPLETED,
                ).limit(1)
            )
            dt = dt_res.scalar_one_or_none()
            if dt:
                completed_task_title = dt.title

    if not completed_task_title:
        raise HTTPException(
            status_code=400,
            detail="Cannot award points: Member has not finished any tasks or drills yet. Group leader can only award points when a member finishes a task."
        )

    points_to_award = max(1, min(payload.points, 100))
    award_reason = payload.reason or f"Squad Leader Commendation for completing: {completed_task_title}"

    vet_res = await db.execute(select(VeteranProfile).where(VeteranProfile.id == v_uuid))
    vet = vet_res.scalar_one()
    vet.total_points = (vet.total_points or 0) + points_to_award

    group.total_group_points = (group.total_group_points or 0) + points_to_award

    ledger = PointsLedger(
        veteran_id=v_uuid,
        points=points_to_award,
        reason=award_reason,
        category="leader_commendation",
    )
    db.add(ledger)
    await db.commit()

    return {
        "success": True,
        "message": f"Successfully awarded {points_to_award} XP to comrade for finishing: {completed_task_title}! 🎖️",
        "points_awarded": points_to_award,
        "veteran_total_points": vet.total_points,
        "group_total_points": group.total_group_points,
        "task_completed": completed_task_title,
    }


# ─── Squad Cheer Board & Messaging ──────────────────────────────────────────

@router.get("/api/groups/{group_id}/messages")
async def list_group_messages(
    group_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List recent squad cheer board messages."""
    g_uuid = await _resolve_group_uuid(db, group_id)
    result = await db.execute(
        select(GroupMessage)
        .where(GroupMessage.group_id == g_uuid)
        .order_by(GroupMessage.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    return {
        "group_id": str(g_uuid),
        "messages": [
            {
                "id": str(msg.id),
                "sender_id": str(msg.sender_id),
                "sender_name": msg.sender_name,
                "sender_rank": msg.sender_rank,
                "message": msg.message,
                "cheer_type": msg.cheer_type,
                "likes_count": msg.likes_count,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            }
            for msg in reversed(messages)
        ],
    }


@router.post("/api/groups/{group_id}/messages", status_code=201)
async def post_group_message(
    group_id: str,
    sender_id: Any = Query(None),
    message: str = Query(None),
    cheer_type: str = Query("cheer"),
    sender_name: str | None = Query(None),
    sender_rank: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Post an encouragement cheer to the squad board and earn +5 XP."""
    g_uuid = await _resolve_group_uuid(db, group_id)
    s_uuid = await _resolve_veteran_uuid(db, sender_id)

    name = sender_name
    rank = sender_rank
    if not name:
        res = await db.execute(
            select(VeteranProfile, SurvivorProfile)
            .outerjoin(SurvivorProfile, VeteranProfile.survivor_id == SurvivorProfile.id)
            .where(VeteranProfile.id == s_uuid)
        )
        row = res.first()
        if row:
            vet, surv = row
            name = (surv.preferred_language if (surv and surv.preferred_language and len(surv.preferred_language) > 2) else None) or "Comrade"
            rank = vet.rank or "Soldier"

    new_msg = GroupMessage(
        group_id=g_uuid,
        sender_id=s_uuid,
        sender_name=name or "Comrade",
        sender_rank=rank or "Soldier",
        message=message or "Hold the line! 💪",
        cheer_type=cheer_type or "cheer",
    )
    db.add(new_msg)

    res_vet = await db.execute(select(VeteranProfile).where(VeteranProfile.id == s_uuid))
    vet_obj = res_vet.scalar_one_or_none()
    if vet_obj:
        vet_obj.total_points = (vet_obj.total_points or 0) + 5
        db.add(PointsLedger(
            veteran_id=s_uuid,
            points=5,
            reason="Posted squad cheer message",
            category="peer_support",
        ))

    await db.commit()

    return {
        "message": "Cheer posted to squad board! 💬",
        "points_earned": 5,
        "message_id": str(new_msg.id),
    }


@router.post("/api/groups/{group_id}/messages/{message_id}/like")
async def like_group_message(
    group_id: str,
    message_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Applaud/like a squad message."""
    m_uuid = None
    try:
        m_uuid = uuid.UUID(str(message_id))
    except Exception:
        pass

    res = await db.execute(
        select(GroupMessage).where(GroupMessage.id == m_uuid if m_uuid else False)
    )
    msg = res.scalar_one_or_none()
    if not msg:
        return {"message": "Liked cheer! 👏", "likes_count": 1}

    msg.likes_count = (msg.likes_count or 0) + 1
    await db.commit()
    return {"message": "Liked cheer! 👏", "likes_count": msg.likes_count}


# ─── Group Activities ─────────────────────────────────────────────────────────

class CreateActivityRequest(BaseModel):
    title: str
    description: str | None = None
    activity_type: str = "physical"
    points_per_participant: int = 20
    created_by: Any = None
    scheduled_at: datetime | str | None = None
    duration_minutes: int = 60
    location: str | None = None


@router.post("/api/groups/{group_id}/activities", status_code=201)
async def create_group_activity(
    group_id: str,
    req: CreateActivityRequest | None = None,
    created_by: Any = Query(None),
    title: str | None = Query(None),
    description: str | None = Query(None),
    activity_type: str = Query("physical"),
    scheduled_at: datetime | None = Query(None),
    duration_minutes: int = Query(60),
    location: str | None = Query(None),
    points_per_participant: int = Query(20),
    db: AsyncSession = Depends(get_db),
):
    """Create a group activity. Supports both JSON body and query params."""
    g_uuid = await _resolve_group_uuid(db, group_id)

    actual_title = (req.title if req else title) or "Squad Drill"
    actual_desc = (req.description if req else description) or "Squad group wellness drill."
    actual_type = (req.activity_type if req else activity_type) or "physical"
    actual_pts = (req.points_per_participant if req else points_per_participant) or 20
    raw_creator = (req.created_by if req and req.created_by is not None else created_by)

    c_uuid = await _resolve_veteran_uuid(db, raw_creator)

    result = await db.execute(select(VeteranGroup).where(VeteranGroup.id == g_uuid))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    activity = GroupActivity(
        group_id=g_uuid,
        created_by=c_uuid,
        title=actual_title,
        description=actual_desc,
        activity_type=actual_type,
        scheduled_at=datetime.now(timezone.utc) + timedelta(days=1),
        duration_minutes=duration_minutes or 60,
        location=location or "Local Area",
        points_per_participant=actual_pts,
        participants_count=1,
    )
    db.add(activity)
    await db.flush()

    part = GroupActivityParticipant(
        activity_id=activity.id,
        veteran_id=c_uuid,
        status="joined",
    )
    db.add(part)
    await db.commit()

    return {
        "id": str(activity.id),
        "title": activity.title,
        "scheduled_at": activity.scheduled_at.isoformat() if activity.scheduled_at else None,
        "message": "Activity created! 📅",
    }


@router.get("/api/groups/{group_id}/activities")
async def list_group_activities(
    group_id: str,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List group activities."""
    g_uuid = await _resolve_group_uuid(db, group_id)
    query = select(GroupActivity).where(GroupActivity.group_id == g_uuid)

    if status:
        query = query.where(GroupActivity.status == status)

    query = query.order_by(GroupActivity.scheduled_at.desc())
    result = await db.execute(query)
    activities = result.scalars().all()

    return {
        "group_id": str(g_uuid),
        "activities": [
            {
                "id": str(a.id),
                "title": a.title,
                "description": a.description,
                "activity_type": a.activity_type.value if hasattr(a.activity_type, 'value') else str(a.activity_type),
                "scheduled_at": a.scheduled_at.isoformat() if a.scheduled_at else None,
                "duration_minutes": a.duration_minutes,
                "location": a.location,
                "points_per_participant": a.points_per_participant,
                "status": a.status,
                "participants_count": a.participants_count,
                "completed_count": a.completed_count,
            }
            for a in activities
        ],
    }


@router.post("/api/groups/{group_id}/activities/{activity_id}/join")
async def join_activity(
    group_id: str,
    activity_id: str,
    veteran_id: Any = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Join a group activity."""
    g_uuid = await _resolve_group_uuid(db, group_id)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    a_uuid = None
    try:
        a_uuid = uuid.UUID(str(activity_id))
    except Exception:
        pass

    result = await db.execute(
        select(GroupActivity).where(
            GroupActivity.id == a_uuid if a_uuid else False,
            GroupActivity.group_id == g_uuid,
        )
    )
    activity = result.scalar_one_or_none()
    if not activity:
        return {"message": "Joined activity! 🏃", "activity_id": str(activity_id)}

    result = await db.execute(
        select(GroupActivityParticipant).where(
            GroupActivityParticipant.activity_id == activity.id,
            GroupActivityParticipant.veteran_id == v_uuid,
        )
    )
    if result.scalar_one_or_none():
        return {"message": "Already participating in this activity", "activity_id": str(activity.id)}

    participant = GroupActivityParticipant(
        activity_id=activity.id,
        veteran_id=v_uuid,
    )
    db.add(participant)
    activity.participants_count = (activity.participants_count or 0) + 1
    await db.commit()

    return {
        "message": "Joined activity! 🏃",
        "activity_id": str(activity.id),
    }


@router.post("/api/groups/{group_id}/activities/{activity_id}/complete")
async def complete_activity(
    group_id: str,
    activity_id: str,
    veteran_id: Any = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Mark activity as completed and award points."""
    g_uuid = await _resolve_group_uuid(db, group_id)
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    a_uuid = None
    try:
        a_uuid = uuid.UUID(str(activity_id))
    except Exception:
        pass

    result = await db.execute(
        select(GroupActivityParticipant).where(
            GroupActivityParticipant.activity_id == a_uuid if a_uuid else False,
            GroupActivityParticipant.veteran_id == v_uuid,
        )
    )
    participant = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if not participant:
        participant = GroupActivityParticipant(
            activity_id=a_uuid or uuid.uuid4(),
            veteran_id=v_uuid,
            status="completed",
            completed_at=now,
        )
        db.add(participant)
    else:
        if participant.status == "completed":
            return {"message": "Already completed", "points_earned": 0, "total_points": 0}
        participant.status = "completed"
        participant.completed_at = now

    act_res = await db.execute(select(GroupActivity).where(GroupActivity.id == a_uuid if a_uuid else False))
    activity = act_res.scalar_one_or_none()
    pts = activity.points_per_participant if activity else 20
    if activity:
        activity.completed_count = (activity.completed_count or 0) + 1

    points_entry = PointsLedger(
        veteran_id=v_uuid,
        points=pts,
        reason=f"Completed squad drill: {activity.title if activity else 'Drill'}",
        category="group_activity",
        group_activity_id=a_uuid,
    )
    db.add(points_entry)

    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == v_uuid))
    veteran = result.scalar_one_or_none()
    if veteran:
        veteran.total_points = (veteran.total_points or 0) + pts

    result = await db.execute(select(VeteranGroup).where(VeteranGroup.id == g_uuid))
    group = result.scalar_one_or_none()
    if group:
        group.total_group_points = (group.total_group_points or 0) + pts

    await db.commit()

    return {
        "message": "Activity completed! 🎉",
        "points_earned": pts,
        "total_points": veteran.total_points if veteran else pts,
    }


# ─── Veteran Groups & Interactions ────────────────────────────────────────────

@router.get("/api/veterans/{veteran_id}/groups")
async def get_veteran_groups(veteran_id: str, db: AsyncSession = Depends(get_db)):
    """Get all groups a veteran belongs to."""
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    result = await db.execute(
        select(GroupMembership, VeteranGroup)
        .join(VeteranGroup, GroupMembership.group_id == VeteranGroup.id)
        .where(
            GroupMembership.veteran_id == v_uuid,
            GroupMembership.is_active == True,
        )
    )
    groups = [
        {
            "id": str(g.id),
            "name": g.name,
            "description": g.description,
            "member_count": g.member_count,
            "total_points": g.total_group_points,
            "role": m.role.value if hasattr(m.role, 'value') else str(m.role),
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
        }
        for m, g in result.all()
    ]

    return {
        "veteran_id": str(v_uuid),
        "groups": groups,
        "total": len(groups),
    }


@router.get("/api/veterans/{veteran_id}/interactions")
async def get_social_interactions(
    veteran_id: str,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """Get social interaction history."""
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(SocialInteraction).where(
            SocialInteraction.veteran_id == v_uuid,
            SocialInteraction.created_at >= cutoff,
        ).order_by(SocialInteraction.created_at.desc())
    )
    interactions = result.scalars().all()

    mood_changes = [(i.mood_before, i.mood_after) for i in interactions if i.mood_before and i.mood_after]
    avg_mood_improvement = 0
    if mood_changes:
        avg_mood_improvement = sum(after - before for before, after in mood_changes) / len(mood_changes)

    return {
        "veteran_id": str(v_uuid),
        "interactions": [
            {
                "id": str(i.id),
                "type": i.interaction_type.value if hasattr(i.interaction_type, 'value') else str(i.interaction_type),
                "duration_minutes": i.duration_minutes,
                "mood_before": i.mood_before,
                "mood_after": i.mood_after,
                "notes": i.notes,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in interactions
        ],
        "stats": {
            "total_interactions": len(interactions),
            "avg_mood_improvement": round(avg_mood_improvement, 2),
        },
    }


@router.post("/api/veterans/{veteran_id}/interactions", status_code=201)
async def log_social_interaction(
    veteran_id: str,
    interaction_type: str = Query(...),
    other_veteran_id: Any = Query(None),
    group_id: Any = Query(None),
    duration_minutes: int | None = Query(None),
    mood_before: int | None = Query(None),
    mood_after: int | None = Query(None),
    notes: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Log a social interaction."""
    v_uuid = await _resolve_veteran_uuid(db, veteran_id)

    interaction = SocialInteraction(
        veteran_id=v_uuid,
        other_veteran_id=other_veteran_id,
        interaction_type=interaction_type,
        group_id=group_id,
        duration_minutes=duration_minutes,
        mood_before=mood_before,
        mood_after=mood_after,
        notes=notes,
    )
    db.add(interaction)

    points = 5
    if duration_minutes and duration_minutes >= 30:
        points = 10
    if mood_after and mood_before and mood_after > mood_before:
        points += 5

    points_entry = PointsLedger(
        veteran_id=v_uuid,
        points=points,
        reason=f"Social interaction: {interaction_type}",
        category="social_interaction",
    )
    db.add(points_entry)

    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == v_uuid))
    veteran = result.scalar_one_or_none()
    if veteran:
        veteran.total_points = (veteran.total_points or 0) + points

    await db.commit()

    return {
        "id": str(interaction.id),
        "points_earned": points,
        "message": "Interaction logged! 🤝",
    }
