"""Veteran profile and gamification endpoints.

POST   /api/veterans/                  — Create veteran profile
GET    /api/veterans/{id}              — Get veteran profile with gamification stats
GET    /api/veterans/{id}/stats        — Get detailed gamification stats
POST   /api/veterans/{id}/assessment   — Submit 5-question wellness assessment
GET    /api/veterans/{id}/dashboard    — Get veteran's home dashboard
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import SurvivorProfile
from app.engine.ai_alert_engine import evaluate_and_trigger_alerts
from app.models.gamified import (
    VeteranProfile,
    DailyTask,
    PointsLedger,
    VeteranGroup,
    GroupMembership,
    SocialInteraction,
    GPSTrack,
    TaskStatus,
    TaskType,
    RewardTier,
    VeteranReward,
)

router = APIRouter(prefix="/api/veterans", tags=["veterans"])


@router.post("/", status_code=201)
async def create_veteran_profile(
    survivor_id: uuid.UUID,
    service_branch: str | None = None,
    rank: str | None = None,
    years_of_service: int | None = None,
    deployment_count: int = 0,
    gps_enabled: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """Create a veteran profile linked to an existing survivor profile."""
    # Check survivor exists
    result = await db.execute(select(SurvivorProfile).where(SurvivorProfile.id == survivor_id))
    survivor = result.scalar_one_or_none()
    if not survivor:
        raise HTTPException(status_code=404, detail="Survivor profile not found")

    # Check if veteran profile already exists
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.survivor_id == survivor_id))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Veteran profile already exists")

    veteran = VeteranProfile(
        survivor_id=survivor_id,
        service_branch=service_branch,
        rank=rank,
        years_of_service=years_of_service,
        deployment_count=deployment_count,
        gps_enabled=gps_enabled,
    )
    db.add(veteran)
    await db.flush()
    await db.refresh(veteran)

    return {
        "id": str(veteran.id),
        "survivor_id": str(veteran.survivor_id),
        "service_branch": veteran.service_branch,
        "rank": veteran.rank,
        "years_of_service": veteran.years_of_service,
        "total_points": veteran.total_points,
        "current_streak": veteran.current_streak,
        "created_at": veteran.created_at.isoformat(),
    }


@router.get("/{veteran_id}")
async def get_veteran_profile(veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get veteran profile with gamification stats."""
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    # Count active tasks today
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count(DailyTask.id)).where(
            DailyTask.veteran_id == veteran_id,
            DailyTask.assigned_date >= today,
            DailyTask.status == TaskStatus.COMPLETED,
        )
    )
    tasks_today = result.scalar() or 0

    # Count groups
    result = await db.execute(
        select(func.count(GroupMembership.id)).where(
            GroupMembership.veteran_id == veteran_id,
            GroupMembership.is_active == True,
        )
    )
    groups_count = result.scalar() or 0

    return {
        "id": str(veteran.id),
        "survivor_id": str(veteran.survivor_id),
        "service_branch": veteran.service_branch,
        "rank": veteran.rank,
        "years_of_service": veteran.years_of_service,
        "gps_enabled": veteran.gps_enabled,
        "notifications_enabled": veteran.notifications_enabled,
        "total_points": veteran.total_points,
        "current_streak": veteran.current_streak,
        "longest_streak": veteran.longest_streak,
        "tasks_completed": veteran.tasks_completed,
        "tasks_completed_today": tasks_today,
        "groups_joined": groups_count,
        "deployment_count": veteran.deployment_count,
        "credibility_score": veteran.credibility_score if veteran.credibility_score is not None else 85.0,
        "stability_score": veteran.stability_score if veteran.stability_score is not None else 85.0,
        "assigned_counselor_id": str(veteran.assigned_counselor_id) if veteran.assigned_counselor_id else None,
        "assigned_counselor_name": veteran.assigned_counselor_name,
        # Extended profile fields
        "avatar_url": veteran.avatar_url,
        "bio": veteran.bio,
        "phone_number": veteran.phone_number,
        "emergency_contact_name": veteran.emergency_contact_name,
        "emergency_contact_phone": veteran.emergency_contact_phone,
        "home_city": veteran.home_city,
        "created_at": veteran.created_at.isoformat(),
    }


class ProfileUpdateRequest(BaseModel := __import__('pydantic').BaseModel):
    rank: str | None = None
    service_branch: str | None = None
    years_of_service: int | None = None
    deployment_count: int | None = None
    bio: str | None = None
    avatar_url: str | None = None
    phone_number: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    home_city: str | None = None
    gps_enabled: bool | None = None
    notifications_enabled: bool | None = None


@router.patch("/{veteran_id}/profile")
async def update_veteran_profile(
    veteran_id: uuid.UUID,
    payload: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update extended veteran profile fields."""
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    fields = payload.model_dump(exclude_none=True)
    for key, value in fields.items():
        setattr(veteran, key, value)
    veteran.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(veteran)

    return {
        "id": str(veteran.id),
        "rank": veteran.rank,
        "service_branch": veteran.service_branch,
        "years_of_service": veteran.years_of_service,
        "deployment_count": veteran.deployment_count,
        "bio": veteran.bio,
        "avatar_url": veteran.avatar_url,
        "phone_number": veteran.phone_number,
        "emergency_contact_name": veteran.emergency_contact_name,
        "emergency_contact_phone": veteran.emergency_contact_phone,
        "home_city": veteran.home_city,
        "gps_enabled": veteran.gps_enabled,
        "notifications_enabled": veteran.notifications_enabled,
        "updated_at": veteran.updated_at.isoformat(),
    }


@router.get("/{veteran_id}/stats")
async def get_veteran_stats(veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get detailed gamification statistics."""
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    # Get task breakdown by type
    task_stats = {}
    for task_type in [TaskType.MENTAL, TaskType.PHYSICAL, TaskType.SOCIAL]:
        result = await db.execute(
            select(
                func.count(DailyTask.id),
                func.coalesce(func.sum(DailyTask.points), 0),
            ).where(
                DailyTask.veteran_id == veteran_id,
                DailyTask.task_type == task_type,
                DailyTask.status == TaskStatus.COMPLETED,
            )
        )
        row = result.one()
        task_stats[task_type.value] = {
            "completed": row[0],
            "points_earned": int(row[1]),
        }

    # Get recent points (last 7 days)
    week_ago = datetime.now(timezone.utc) - __import__("datetime").timedelta(days=7)
    result = await db.execute(
        select(func.coalesce(func.sum(PointsLedger.points), 0)).where(
            PointsLedger.veteran_id == veteran_id,
            PointsLedger.created_at >= week_ago,
        )
    )
    points_this_week = result.scalar() or 0

    # Get social interaction count
    result = await db.execute(
        select(func.count(SocialInteraction.id)).where(
            SocialInteraction.veteran_id == veteran_id,
        )
    )
    social_count = result.scalar() or 0

    # Get total distance walked
    result = await db.execute(
        select(func.coalesce(func.sum(GPSTrack.altitude), 0)).where(
            GPSTrack.veteran_id == veteran_id,
            GPSTrack.activity_type == "walking",
        )
    )

    return {
        "veteran_id": str(veteran_id),
        "total_points": veteran.total_points,
        "points_this_week": int(points_this_week),
        "current_streak": veteran.current_streak,
        "longest_streak": veteran.longest_streak,
        "task_breakdown": task_stats,
        "social_interactions": social_count,
        "tasks_completed": veteran.tasks_completed,
    }


@router.post("/{veteran_id}/assessment")
async def submit_assessment(
    veteran_id: uuid.UUID,
    answers: list[dict],
    db: AsyncSession = Depends(get_db),
):
    """Submit 5-question wellness assessment (HTQ-adapted).

    The 5 questions are:
    1. Core PTSD: Intrusive Memories (1-4)
    2. Core PTSD: Hypervigilance (1-4)
    3. Core PTSD: Emotional Numbing (1-4)
    4. Core PTSD: Somatic/Sleep (1-4)
    5. Coping/Safety Baseline (1-4)

    Total score: 5-20 (lower is better)
    """
    if len(answers) != 5:
        raise HTTPException(status_code=400, detail="Assessment requires exactly 5 answers")

    # Verify veteran exists
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    # Validate answers are 1-4
    for i, answer in enumerate(answers):
        value = answer.get("value")
        if not isinstance(value, int) or value < 1 or value > 4:
            raise HTTPException(
                status_code=400,
                detail=f"Answer {i+1} must be an integer between 1 and 4"
            )

    # Calculate total score
    total_score = sum(a["value"] for a in answers)

    # Check if assessment already submitted today (daily XP limit)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    existing_today = await db.execute(
        select(PointsLedger).where(
            PointsLedger.veteran_id == veteran_id,
            PointsLedger.category == "assessment",
            PointsLedger.created_at >= today_start,
        )
    )
    already_submitted_today = existing_today.scalar_one_or_none() is not None

    # Store assessment
    assessment_entry = PointsLedger(
        veteran_id=veteran_id,
        points=20 if not already_submitted_today else 0,
        reason=f"Wellness assessment submitted (score: {total_score}/20)",
        category="assessment",
    )
    db.add(assessment_entry)

    # Award +20 XP only on first submission of the day
    xp_earned = 0
    if not already_submitted_today:
        veteran.total_points += 20
        xp_earned = 20

    await db.commit()

    # Determine risk level
    if total_score <= 8:
        risk_level = "low"
        message = "Your wellness scores look good today. Keep up the great work!"
    elif total_score <= 12:
        risk_level = "moderate"
        message = "Some areas could use attention today. We've added some supportive tasks."
    elif total_score <= 16:
        risk_level = "elevated"
        message = "We noticed you might be having a tough day. We're here for you."
    else:
        risk_level = "high"
        message = "Please reach out if you need support. You're not alone."

    return {
        "veteran_id": str(veteran_id),
        "total_score": total_score,
        "risk_level": risk_level,
        "message": message,
        "xp_earned": xp_earned,
        "xp_note": None if not already_submitted_today else "Daily XP already earned — assessment recorded.",
        "questions": [
            {"domain": "Intrusive Memories", "score": answers[0]["value"]},
            {"domain": "Hypervigilance", "score": answers[1]["value"]},
            {"domain": "Emotional Numbing", "score": answers[2]["value"]},
            {"domain": "Somatic/Sleep", "score": answers[3]["value"]},
            {"domain": "Coping/Safety", "score": answers[4]["value"]},
        ],
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/{veteran_id}/dashboard")
async def get_dashboard(veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get veteran's home dashboard with today's tasks, stats, and groups."""
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Get today's tasks
    result = await db.execute(
        select(DailyTask).where(
            DailyTask.veteran_id == veteran_id,
            DailyTask.assigned_date >= today,
        ).order_by(DailyTask.created_at)
    )
    today_tasks = result.scalars().all()

    # Get pending tasks
    result = await db.execute(
        select(func.count(DailyTask.id)).where(
            DailyTask.veteran_id == veteran_id,
            DailyTask.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
        )
    )
    pending_tasks = result.scalar() or 0

    # Get groups
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
            "id": str(membership.group_id),
            "name": group.name,
            "member_count": group.member_count,
            "total_points": group.total_group_points,
        }
        for membership, group in result.all()
    ]

    return {
        "veteran_id": str(veteran_id),
        "greeting": _get_greeting(),
        "stats": {
            "total_points": veteran.total_points,
            "current_streak": veteran.current_streak,
            "tasks_completed": veteran.tasks_completed,
            "pending_tasks": pending_tasks,
            "credibility_score": veteran.credibility_score if veteran.credibility_score is not None else 85.0,
            "stability_score": veteran.stability_score if veteran.stability_score is not None else 85.0,
        },
        "assigned_counselor_id": str(veteran.assigned_counselor_id) if veteran.assigned_counselor_id else None,
        "assigned_counselor_name": veteran.assigned_counselor_name,
        "today_tasks": [
            {
                "id": str(task.id),
                "type": task.task_type.value,
                "title": task.title,
                "description": task.description,
                "points": task.points,
                "status": task.status.value,
                "gps_required": task.gps_required,
            }
            for task in today_tasks
        ],
        "groups": groups,
    }


@router.post("/{veteran_id}/evaluate-credibility")
async def trigger_credibility_evaluation(
    veteran_id: uuid.UUID,
    payload: dict = None,
    db: AsyncSession = Depends(get_db),
):
    """Trigger AI credibility and stability calculation, generating alerts if scores drop."""
    event = payload.get("event") if payload else None
    alert = await evaluate_and_trigger_alerts(db, veteran_id, trigger_event=event)

    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()

    return {
        "success": True,
        "veteran_id": str(veteran_id),
        "credibility_score": veteran.credibility_score if (veteran and veteran.credibility_score is not None) else 85.0,
        "stability_score": veteran.stability_score if (veteran and veteran.stability_score is not None) else 85.0,
        "alert_triggered": alert is not None,
        "alert_id": str(alert.id) if alert else None,
        "alert_summary": alert.trend_summary if alert else None,
    }


def _get_greeting() -> str:
    """Get a time-appropriate greeting."""
    hour = datetime.now(timezone.utc).hour
    if hour < 12:
        return "Good morning, warrior! ☀️"
    elif hour < 17:
        return "Good afternoon, warrior! 🌤️"
    return "Good evening, warrior! 🌙"


@router.get("/{veteran_id}/rewards")
async def get_veteran_rewards(veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get all reward tiers and veteran claim status."""
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    # Fetch reward tiers
    result = await db.execute(select(RewardTier).order_by(RewardTier.points_required.asc()))
    tiers = result.scalars().all()

    # Fetch claimed rewards
    result = await db.execute(select(VeteranReward).where(VeteranReward.veteran_id == veteran_id))
    claimed = {str(r.reward_id): r for r in result.scalars().all()}

    if not tiers:
        default_tiers = [
            {"id": "r1", "name": "Bronze Warrior", "points_required": 100, "icon": "🎖️", "color": "#D97706"},
            {"id": "r2", "name": "Silver Guardian", "points_required": 250, "icon": "🛡️", "color": "#786F68"},
            {"id": "r3", "name": "Gold Champion", "points_required": 500, "icon": "🏆", "color": "#D96B27"},
            {"id": "r4", "name": "Platinum Legend", "points_required": 1000, "icon": "👑", "color": "#1C1917"},
        ]
        return {
            "total_points": veteran.total_points,
            "rewards": [
                {
                    **t,
                    "unlocked": veteran.total_points >= t["points_required"],
                    "claimed": veteran.total_points >= t["points_required"],
                }
                for t in default_tiers
            ]
        }

    return {
        "total_points": veteran.total_points,
        "rewards": [
            {
                "id": str(t.id),
                "name": t.name,
                "description": t.description,
                "points_required": t.points_required,
                "icon": t.badge_icon or "🎖️",
                "color": t.badge_color or "#D96B27",
                "unlocked": veteran.total_points >= t.points_required,
                "claimed": str(t.id) in claimed,
            }
            for t in tiers
        ]
    }


@router.post("/{veteran_id}/rewards/{reward_id}/claim", status_code=201)
async def claim_reward(
    veteran_id: uuid.UUID,
    reward_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Claim an unlocked reward tier. Can only be claimed once per reward."""
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    # Check if already claimed (prevent duplicate claims / exploit)
    try:
        r_uuid = uuid.UUID(reward_id)
        existing_claim = await db.execute(
            select(VeteranReward).where(
                VeteranReward.veteran_id == veteran_id,
                VeteranReward.reward_id == r_uuid,
            )
        )
        if existing_claim.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Reward already claimed")

        result = await db.execute(select(RewardTier).where(RewardTier.id == r_uuid))
        tier = result.scalar_one_or_none()
        if tier and veteran.total_points < tier.points_required:
            raise HTTPException(status_code=400, detail="Insufficient points for this reward")

        # Create the VeteranReward claim record
        claim_record = VeteranReward(veteran_id=veteran_id, reward_id=r_uuid)
        db.add(claim_record)
    except ValueError:
        # Non-UUID reward_id (default tier like "r1") — check by string key in ledger
        existing = await db.execute(
            select(PointsLedger).where(
                PointsLedger.veteran_id == veteran_id,
                PointsLedger.reason == f"Claimed Reward Milestone ({reward_id})",
                PointsLedger.category == "reward_claim",
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Reward already claimed")

    # Record ledger entry and award bonus points
    bonus_points = 15
    veteran.total_points += bonus_points
    ledger = PointsLedger(
        veteran_id=veteran_id,
        points=bonus_points,
        reason=f"Claimed Reward Milestone ({reward_id})",
        category="reward_claim",
    )
    db.add(ledger)
    await db.commit()

    return {
        "status": "claimed",
        "message": f"Reward claimed successfully! +{bonus_points} bonus points awarded.",
        "total_points": veteran.total_points,
    }


@router.get("/{veteran_id}/points/history")
async def get_points_history(veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get points ledger history."""
    result = await db.execute(
        select(PointsLedger)
        .where(PointsLedger.veteran_id == veteran_id)
        .order_by(PointsLedger.created_at.desc())
        .limit(20)
    )
    entries = result.scalars().all()

    if not entries:
        return {
            "entries": [
                {"id": "1", "points": 15, "reason": "Completed: Morning Walk", "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": "2", "points": 10, "reason": "Completed: Breathing Exercise", "created_at": datetime.now(timezone.utc).isoformat()},
                {"id": "3", "points": 20, "reason": "Daily Wellness Check-In", "created_at": datetime.now(timezone.utc).isoformat()},
            ]
        }

    return {
        "entries": [
            {
                "id": str(e.id),
                "points": e.points,
                "reason": e.reason,
                "category": e.category,
                "created_at": e.created_at.isoformat(),
            }
            for e in entries
        ]
    }

