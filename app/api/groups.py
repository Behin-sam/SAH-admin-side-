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
from datetime import datetime, timezone
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
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


# ─── Group CRUD ───────────────────────────────────────────────────────────────

@router.get("/api/groups")
async def list_groups(
    search: str | None = None,
    limit: int = 20,
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
                "created_at": g.created_at.isoformat(),
            }
            for g in groups
        ],
        "total": len(groups),
    }


from pydantic import BaseModel


class CreateGroupRequest(BaseModel):
    name: str
    created_by: uuid.UUID
    description: str | None = None
    max_members: int = 50
    is_public: bool = True


@router.post("/api/groups", status_code=201)
async def create_group(
    req: CreateGroupRequest | None = None,
    name: str | None = None,
    created_by: uuid.UUID | None = None,
    description: str | None = None,
    max_members: int = 50,
    is_public: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """Create a new veteran group."""
    actual_name = (req.name if req else name)
    actual_creator = (req.created_by if req else created_by)
    actual_desc = (req.description if req else description)
    actual_max = (req.max_members if req else max_members) or 50
    actual_public = (req.is_public if req else is_public)

    if not actual_name or not actual_creator:
        raise HTTPException(status_code=400, detail="Missing name or created_by")

    # Verify creator exists
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == actual_creator))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Veteran not found")

    group = VeteranGroup(
        name=actual_name,
        description=actual_desc,
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

    # Update veteran's group count
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == actual_creator))
    veteran = result.scalar_one()
    veteran.groups_joined += 1

    # Award points for creating a group
    points_entry = PointsLedger(
        veteran_id=actual_creator,
        points=25,
        reason=f"Founded group: {actual_name}",
        category="group_creation",
    )
    db.add(points_entry)
    veteran.total_points += 25

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
async def get_group(group_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get group details."""
    result = await db.execute(select(VeteranGroup).where(VeteranGroup.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Get upcoming activities
    result = await db.execute(
        select(GroupActivity).where(
            GroupActivity.group_id == group_id,
            GroupActivity.status == "scheduled",
        ).order_by(GroupActivity.scheduled_at).limit(5)
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
                "scheduled_at": a.scheduled_at.isoformat(),
                "participants_count": a.participants_count,
            }
            for a in activities
        ],
        "created_at": group.created_at.isoformat(),
    }


# ─── Group Membership ────────────────────────────────────────────────────────

@router.post("/api/groups/{group_id}/join")
async def join_group(
    group_id: uuid.UUID,
    veteran_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Join a veteran group."""
    result = await db.execute(select(VeteranGroup).where(VeteranGroup.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if group.max_members and group.member_count >= group.max_members:
        # Automatically expand squad size so comrades are never blocked from joining
        group.max_members = max(group.max_members + 25, group.member_count + 10)

    # Check if existing membership record exists
    result = await db.execute(
        select(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.veteran_id == veteran_id,
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
        # Reactivate existing membership — mark as rejoin (no points awarded)
        existing_membership.is_active = True
        existing_membership.joined_at = datetime.now(timezone.utc)
        is_rejoin = True
    else:
        membership = GroupMembership(
            group_id=group_id,
            veteran_id=veteran_id,
        )
        db.add(membership)

    group.member_count += 1

    # Update veteran stats and award points ONLY on first join, not rejoins
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    if not is_rejoin:
        veteran.groups_joined += 1
        # Award points only for first-time join
        points_entry = PointsLedger(
            veteran_id=veteran_id,
            points=15,
            reason=f"Joined group: {group.name}",
            category="group_join",
        )
        db.add(points_entry)
        veteran.total_points += 15

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
    group_id: uuid.UUID,
    veteran_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Leave a veteran group."""
    result = await db.execute(
        select(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.veteran_id == veteran_id,
            GroupMembership.is_active == True,
        )
    )
    membership = result.scalar_one_or_none()
    if not membership:
        raise HTTPException(status_code=404, detail="Not a member of this group")

    if membership.role == GroupRole.ADMIN:
        raise HTTPException(status_code=400, detail="Admin cannot leave. Transfer ownership first.")

    membership.is_active = False

    # Update group count
    result = await db.execute(select(VeteranGroup).where(VeteranGroup.id == group_id))
    group = result.scalar_one()
    group.member_count = max(0, group.member_count - 1)

    return {"message": "Left the group", "group_id": str(group_id)}


class AwardPointsRequest(BaseModel):
    leader_id: uuid.UUID
    points: int = 15
    task_id: uuid.UUID | None = None
    reason: str | None = None


@router.get("/api/groups/{group_id}/members")
async def list_members(group_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """List group members with real names, ranks, and task completion status."""
    result = await db.execute(
        select(GroupMembership, VeteranProfile, SurvivorProfile)
        .join(VeteranProfile, GroupMembership.veteran_id == VeteranProfile.id)
        .outerjoin(SurvivorProfile, VeteranProfile.survivor_id == SurvivorProfile.id)
        .where(
            GroupMembership.group_id == group_id,
            GroupMembership.is_active == True,
        )
    )
    rows = result.all()
    members = []
    for m, v, surv in rows:
        # Check completed daily tasks
        dt_res = await db.execute(
            select(func.count(DailyTask.id)).where(
                DailyTask.veteran_id == v.id,
                DailyTask.status == TaskStatus.COMPLETED,
            )
        )
        dt_count = dt_res.scalar() or 0

        # Check completed group activities
        ga_res = await db.execute(
            select(func.count(GroupActivityParticipant.id))
            .join(GroupActivity, GroupActivityParticipant.activity_id == GroupActivity.id)
            .where(
                GroupActivity.group_id == group_id,
                GroupActivityParticipant.veteran_id == v.id,
                GroupActivityParticipant.status == "completed",
            )
        )
        ga_count = ga_res.scalar() or 0
        total_completed = dt_count + ga_count

        members.append({
            "veteran_id": str(m.veteran_id),
            "name": (surv.full_name or surv.username or "Comrade") if surv else "Comrade",
            "rank": v.rank or "Soldier",
            "service_branch": v.service_branch or "Indian Army",
            "role": m.role.value if hasattr(m.role, 'value') else str(m.role),
            "joined_at": m.joined_at.isoformat(),
            "total_points": v.total_points,
            "current_streak": v.current_streak,
            "completed_tasks_count": total_completed,
            "has_finished_task": total_completed > 0,
        })

    return {
        "group_id": str(group_id),
        "members": members,
        "count": len(members),
    }


@router.post("/api/groups/{group_id}/members/{veteran_id}/award-points")
async def award_member_points(
    group_id: uuid.UUID,
    veteran_id: uuid.UUID,
    payload: AwardPointsRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Allow a group leader / admin to award points to a member ONLY IF the member has completed a task.
    """
    # 1. Verify group exists
    group_res = await db.execute(select(VeteranGroup).where(VeteranGroup.id == group_id))
    group = group_res.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # 2. Verify caller is a leader/admin of the group (or group creator)
    leader_res = await db.execute(
        select(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.veteran_id == payload.leader_id,
            GroupMembership.is_active == True,
        )
    )
    leader_membership = leader_res.scalar_one_or_none()
    is_admin = False
    if leader_membership:
        role_val = leader_membership.role.value if hasattr(leader_membership.role, 'value') else str(leader_membership.role)
        if role_val in ("admin", "moderator", "leader"):
            is_admin = True
    if not is_admin and group.created_by == payload.leader_id:
        is_admin = True

    if not is_admin:
        raise HTTPException(status_code=403, detail="Only squad leaders and administrators can award points to members.")

    # 3. Verify target veteran is active member
    member_res = await db.execute(
        select(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.veteran_id == veteran_id,
            GroupMembership.is_active == True,
        )
    )
    member_membership = member_res.scalar_one_or_none()
    if not member_membership:
        raise HTTPException(status_code=404, detail="Comrade is not an active member of this squad.")

    # 4. Check if member has completed a task
    completed_task_title = None
    if payload.task_id:
        dt_res = await db.execute(
            select(DailyTask).where(
                DailyTask.id == payload.task_id,
                DailyTask.veteran_id == veteran_id,
                DailyTask.status == TaskStatus.COMPLETED,
            )
        )
        dt = dt_res.scalar_one_or_none()
        if dt:
            completed_task_title = dt.title
        else:
            gap_res = await db.execute(
                select(GroupActivityParticipant, GroupActivity)
                .join(GroupActivity, GroupActivityParticipant.activity_id == GroupActivity.id)
                .where(
                    GroupActivityParticipant.id == payload.task_id,
                    GroupActivityParticipant.veteran_id == veteran_id,
                    GroupActivityParticipant.status == "completed",
                )
            )
            gap_row = gap_res.first()
            if gap_row:
                completed_task_title = gap_row[1].title
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Specified task is not completed by this member. Points can only be awarded when a task is finished."
                )
    else:
        # Check group activities in this squad first
        squad_act_res = await db.execute(
            select(GroupActivityParticipant, GroupActivity)
            .join(GroupActivity, GroupActivityParticipant.activity_id == GroupActivity.id)
            .where(
                GroupActivity.group_id == group_id,
                GroupActivityParticipant.veteran_id == veteran_id,
                GroupActivityParticipant.status == "completed",
            )
        )
        squad_act = squad_act_res.first()
        if squad_act:
            completed_task_title = squad_act[1].title
        else:
            # Check any daily task completed by veteran
            dt_res = await db.execute(
                select(DailyTask).where(
                    DailyTask.veteran_id == veteran_id,
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

    # 5. Award points
    points_to_award = max(1, min(payload.points, 100))
    award_reason = payload.reason or f"Squad Leader Commendation for completing: {completed_task_title}"

    vet_res = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    vet = vet_res.scalar_one()
    vet.total_points += points_to_award

    group.total_group_points += points_to_award

    ledger = PointsLedger(
        veteran_id=veteran_id,
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
    group_id: uuid.UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List recent squad cheer board messages."""
    result = await db.execute(
        select(GroupMessage)
        .where(GroupMessage.group_id == group_id)
        .order_by(GroupMessage.created_at.desc())
        .limit(limit)
    )
    messages = result.scalars().all()
    return {
        "group_id": str(group_id),
        "messages": [
            {
                "id": str(msg.id),
                "sender_id": str(msg.sender_id),
                "sender_name": msg.sender_name,
                "sender_rank": msg.sender_rank,
                "message": msg.message,
                "cheer_type": msg.cheer_type,
                "likes_count": msg.likes_count,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in reversed(messages)
        ],
    }


@router.post("/api/groups/{group_id}/messages", status_code=201)
async def post_group_message(
    group_id: uuid.UUID,
    sender_id: uuid.UUID,
    message: str,
    cheer_type: str = "cheer",
    sender_name: str | None = None,
    sender_rank: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Post an encouragement cheer to the squad board and earn +5 XP."""
    name = sender_name
    rank = sender_rank
    if not name:
        res = await db.execute(
            select(VeteranProfile, SurvivorProfile)
            .join(SurvivorProfile, VeteranProfile.survivor_id == SurvivorProfile.id)
            .where(VeteranProfile.id == sender_id)
        )
        row = res.first()
        if row:
            vet, surv = row
            name = surv.full_name or surv.username or "Comrade"
            rank = vet.rank or "Soldier"

    new_msg = GroupMessage(
        group_id=group_id,
        sender_id=sender_id,
        sender_name=name or "Comrade",
        sender_rank=rank or "Soldier",
        message=message,
        cheer_type=cheer_type,
    )
    db.add(new_msg)

    # Award points for peer support (+5 pts)
    res_vet = await db.execute(select(VeteranProfile).where(VeteranProfile.id == sender_id))
    vet_obj = res_vet.scalar_one_or_none()
    if vet_obj:
        vet_obj.total_points += 5
        db.add(PointsLedger(
            veteran_id=sender_id,
            points=5,
            reason="Posted squad cheer message",
            category="peer_support",
        ))

    return {
        "message": "Cheer posted to squad board! 💬",
        "points_earned": 5,
        "message_id": str(new_msg.id),
    }


@router.post("/api/groups/{group_id}/messages/{message_id}/like")
async def like_group_message(
    group_id: uuid.UUID,
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Applaud/like a squad message."""
    res = await db.execute(
        select(GroupMessage).where(GroupMessage.id == message_id, GroupMessage.group_id == group_id)
    )
    msg = res.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.likes_count += 1
    return {"message": "Liked cheer! 👏", "likes_count": msg.likes_count}


# ─── Group Activities ─────────────────────────────────────────────────────────

@router.post("/api/groups/{group_id}/activities", status_code=201)
async def create_group_activity(
    group_id: uuid.UUID,
    created_by: uuid.UUID,
    title: str,
    description: str | None = None,
    activity_type: str = "physical",
    scheduled_at: datetime | None = None,
    duration_minutes: int = 60,
    location: str | None = None,
    points_per_participant: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Create a group activity."""
    # Verify group exists
    result = await db.execute(select(VeteranGroup).where(VeteranGroup.id == group_id))
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify creator is a member
    result = await db.execute(
        select(GroupMembership).where(
            GroupMembership.group_id == group_id,
            GroupMembership.veteran_id == created_by,
            GroupMembership.is_active == True,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Must be a group member to create activities")

    activity = GroupActivity(
        group_id=group_id,
        created_by=created_by,
        title=title,
        description=description,
        activity_type=activity_type,
        scheduled_at=scheduled_at or datetime.now(timezone.utc) + __import__("datetime").timedelta(days=1),
        duration_minutes=duration_minutes,
        location=location,
        points_per_participant=points_per_participant,
    )
    db.add(activity)

    return {
        "id": str(activity.id),
        "title": activity.title,
        "scheduled_at": activity.scheduled_at.isoformat(),
        "message": "Activity created! 📅",
    }


@router.get("/api/groups/{group_id}/activities")
async def list_group_activities(
    group_id: uuid.UUID,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List group activities."""
    query = select(GroupActivity).where(GroupActivity.group_id == group_id)

    if status:
        query = query.where(GroupActivity.status == status)

    query = query.order_by(GroupActivity.scheduled_at.desc())
    result = await db.execute(query)
    activities = result.scalars().all()

    return {
        "group_id": str(group_id),
        "activities": [
            {
                "id": str(a.id),
                "title": a.title,
                "description": a.description,
                "activity_type": a.activity_type.value if hasattr(a.activity_type, 'value') else a.activity_type,
                "scheduled_at": a.scheduled_at.isoformat(),
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
    group_id: uuid.UUID,
    activity_id: uuid.UUID,
    veteran_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Join a group activity."""
    # Verify activity exists
    result = await db.execute(
        select(GroupActivity).where(
            GroupActivity.id == activity_id,
            GroupActivity.group_id == group_id,
        )
    )
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    # Check if already participating
    result = await db.execute(
        select(GroupActivityParticipant).where(
            GroupActivityParticipant.activity_id == activity_id,
            GroupActivityParticipant.veteran_id == veteran_id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already participating")

    participant = GroupActivityParticipant(
        activity_id=activity_id,
        veteran_id=veteran_id,
    )
    db.add(participant)

    activity.participants_count += 1

    return {
        "message": "Joined activity! 🏃",
        "activity_id": str(activity_id),
    }


@router.post("/api/groups/{group_id}/activities/{activity_id}/complete")
async def complete_activity(
    group_id: uuid.UUID,
    activity_id: uuid.UUID,
    veteran_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Mark activity as completed and award points."""
    result = await db.execute(
        select(GroupActivityParticipant).where(
            GroupActivityParticipant.activity_id == activity_id,
            GroupActivityParticipant.veteran_id == veteran_id,
        )
    )
    participant = result.scalar_one_or_none()
    if not participant:
        raise HTTPException(status_code=404, detail="Not participating in this activity")

    if participant.status == "completed":
        raise HTTPException(status_code=400, detail="Already completed")

    now = datetime.now(timezone.utc)
    participant.status = "completed"
    participant.completed_at = now

    # Get activity for points
    result = await db.execute(select(GroupActivity).where(GroupActivity.id == activity_id))
    activity = result.scalar_one()
    activity.completed_count += 1

    # Award points
    points_entry = PointsLedger(
        veteran_id=veteran_id,
        points=activity.points_per_participant,
        reason=f"Completed group activity: {activity.title}",
        category="group_activity",
        group_activity_id=activity_id,
    )
    db.add(points_entry)

    # Update veteran stats
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one()
    veteran.total_points += activity.points_per_participant

    # Update group stats
    result = await db.execute(select(VeteranGroup).where(VeteranGroup.id == group_id))
    group = result.scalar_one()
    group.total_group_points += activity.points_per_participant

    return {
        "message": "Activity completed! 🎉",
        "points_earned": activity.points_per_participant,
        "total_points": veteran.total_points,
    }


# ─── Veteran Groups & Interactions ────────────────────────────────────────────

@router.get("/api/veterans/{veteran_id}/groups")
async def get_veteran_groups(veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get all groups a veteran belongs to."""
    result = await db.execute(
        select(GroupMembership, VeteranGroup)
        .join(VeteranGroup, GroupMembership.group_id == VeteranGroup.id)
        .where(
            GroupMembership.veteran_id == veteran_id,
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
            "role": m.role.value,
            "joined_at": m.joined_at.isoformat(),
        }
        for m, g in result.all()
    ]

    return {
        "veteran_id": str(veteran_id),
        "groups": groups,
        "total": len(groups),
    }


@router.get("/api/veterans/{veteran_id}/interactions")
async def get_social_interactions(
    veteran_id: uuid.UUID,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """Get social interaction history."""
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(SocialInteraction).where(
            SocialInteraction.veteran_id == veteran_id,
            SocialInteraction.created_at >= cutoff,
        ).order_by(SocialInteraction.created_at.desc())
    )
    interactions = result.scalars().all()

    # Calculate stats
    mood_changes = [(i.mood_before, i.mood_after) for i in interactions if i.mood_before and i.mood_after]
    avg_mood_improvement = 0
    if mood_changes:
        avg_mood_improvement = sum(after - before for before, after in mood_changes) / len(mood_changes)

    return {
        "veteran_id": str(veteran_id),
        "interactions": [
            {
                "id": str(i.id),
                "type": i.interaction_type.value,
                "duration_minutes": i.duration_minutes,
                "mood_before": i.mood_before,
                "mood_after": i.mood_after,
                "notes": i.notes,
                "created_at": i.created_at.isoformat(),
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
    veteran_id: uuid.UUID,
    interaction_type: str,
    other_veteran_id: uuid.UUID | None = None,
    group_id: uuid.UUID | None = None,
    duration_minutes: int | None = None,
    mood_before: int | None = None,
    mood_after: int | None = None,
    notes: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Log a social interaction."""
    # Verify veteran exists
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Veteran not found")

    interaction = SocialInteraction(
        veteran_id=veteran_id,
        other_veteran_id=other_veteran_id,
        interaction_type=interaction_type,
        group_id=group_id,
        duration_minutes=duration_minutes,
        mood_before=mood_before,
        mood_after=mood_after,
        notes=notes,
    )
    db.add(interaction)

    # Award points for social interaction
    points = 5
    if duration_minutes and duration_minutes >= 30:
        points = 10
    if mood_after and mood_before and mood_after > mood_before:
        points += 5  # Bonus for mood improvement

    points_entry = PointsLedger(
        veteran_id=veteran_id,
        points=points,
        reason=f"Social interaction: {interaction_type}",
        category="social_interaction",
    )
    db.add(points_entry)

    # Update veteran points
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one()
    veteran.total_points += points

    return {
        "id": str(interaction.id),
        "points_earned": points,
        "message": "Interaction logged! 🤝",
    }
