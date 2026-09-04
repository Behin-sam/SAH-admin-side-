"""Admin dashboard endpoints for data collection and analytics.

GET    /api/admin/dashboard             — Get admin dashboard overview
GET    /api/admin/veterans              — List all veterans with stats
GET    /api/admin/veterans/{id}         — Get veteran detail for admin
GET    /api/admin/analytics/tasks       — Task completion analytics
GET    /api/admin/analytics/groups      — Group activity analytics
GET    /api/admin/analytics/wellness    — Wellness trend analytics
GET    /api/admin/analytics/gps         — GPS activity analytics
GET    /api/admin/analytics/interactions — Social interaction analytics
GET    /api/admin/reports/daily         — Daily snapshot report
GET    /api/admin/reports/export        — Export data for analysis
"""

from __future__ import annotations

import uuid
import json
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.gamified import (
    VeteranProfile,
    DailyTask,
    VeteranGroup,
    GroupMembership,
    GroupActivity,
    PointsLedger,
    GPSTrack,
    GPSSummary,
    SocialInteraction,
    AdminDashboard,
    DailyAdminSnapshot,
    TaskStatus,
    TaskType,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard")
async def get_admin_dashboard(db: AsyncSession = Depends(get_db)):
    """Get admin dashboard overview with key metrics."""
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # Total veterans
    result = await db.execute(select(func.count(VeteranProfile.id)))
    total_veterans = result.scalar() or 0

    # Active veterans (completed task in last 7 days)
    result = await db.execute(
        select(func.count(func.distinct(DailyTask.veteran_id))).where(
            DailyTask.status == TaskStatus.COMPLETED,
            DailyTask.completed_at >= week_ago,
        )
    )
    active_veterans = result.scalar() or 0

    # Tasks today
    result = await db.execute(
        select(func.count(DailyTask.id)).where(
            DailyTask.assigned_date >= today,
        )
    )
    tasks_today = result.scalar() or 0

    result = await db.execute(
        select(func.count(DailyTask.id)).where(
            DailyTask.assigned_date >= today,
            DailyTask.status == TaskStatus.COMPLETED,
        )
    )
    tasks_completed_today = result.scalar() or 0

    # Total points awarded this week
    result = await db.execute(
        select(func.coalesce(func.sum(PointsLedger.points), 0)).where(
            PointsLedger.created_at >= week_ago,
        )
    )
    points_this_week = result.scalar() or 0

    # Groups
    result = await db.execute(select(func.count(VeteranGroup.id)))
    total_groups = result.scalar() or 0

    result = await db.execute(
        select(func.count(GroupActivity.id)).where(
            GroupActivity.status == "completed",
            GroupActivity.created_at >= week_ago,
        )
    )
    activities_this_week = result.scalar() or 0

    # Social interactions
    result = await db.execute(
        select(func.count(SocialInteraction.id)).where(
            SocialInteraction.created_at >= week_ago,
        )
    )
    interactions_this_week = result.scalar() or 0

    # GPS activities
    result = await db.execute(
        select(func.coalesce(func.sum(GPSSummary.total_distance_meters), 0)).where(
            GPSSummary.verified_at >= week_ago,
        )
    )
    distance_this_week = (result.scalar() or 0) / 1000  # Convert to km

    return {
        "overview": {
            "total_veterans": total_veterans,
            "active_veterans": active_veterans,
            "engagement_rate": round(active_veterans / total_veterans * 100, 1) if total_veterans > 0 else 0,
        },
        "tasks": {
            "assigned_today": tasks_today,
            "completed_today": tasks_completed_today,
            "completion_rate_today": round(tasks_completed_today / tasks_today * 100, 1) if tasks_today > 0 else 0,
        },
        "points": {
            "awarded_this_week": points_this_week,
            "average_per_veteran": round(points_this_week / active_veterans, 1) if active_veterans > 0 else 0,
        },
        "social": {
            "total_groups": total_groups,
            "activities_this_week": activities_this_week,
            "interactions_this_week": interactions_this_week,
        },
        "gps": {
            "distance_this_week_km": round(distance_this_week, 2),
        },
        "generated_at": now.isoformat(),
    }


@router.get("/veterans")
async def list_veterans(
    search: str | None = None,
    sort_by: str = "total_points",
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List all veterans with their stats for admin review."""
    query = select(VeteranProfile)

    if search:
        query = query.where(
            VeteranProfile.service_branch.ilike(f"%{search}%") |
            VeteranProfile.rank.ilike(f"%{search}%")
        )

    # Sorting
    if sort_by == "total_points":
        query = query.order_by(VeteranProfile.total_points.desc())
    elif sort_by == "current_streak":
        query = query.order_by(VeteranProfile.current_streak.desc())
    elif sort_by == "tasks_completed":
        query = query.order_by(VeteranProfile.tasks_completed.desc())
    else:
        query = query.order_by(VeteranProfile.created_at.desc())

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    veterans = result.scalars().all()

    return {
        "veterans": [
            {
                "id": str(v.id),
                "service_branch": v.service_branch,
                "rank": v.rank,
                "years_of_service": v.years_of_service,
                "total_points": v.total_points,
                "current_streak": v.current_streak,
                "tasks_completed": v.tasks_completed,
                "groups_joined": v.groups_joined,
                "created_at": v.created_at.isoformat(),
            }
            for v in veterans
        ],
        "total": len(veterans),
    }


@router.get("/veterans/{veteran_id}")
async def get_veteran_detail(veteran_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Get detailed veteran info for admin review."""
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    # Task breakdown
    task_stats = {}
    for task_type in [TaskType.MENTAL, TaskType.PHYSICAL, TaskType.SOCIAL]:
        result = await db.execute(
            select(
                func.count(DailyTask.id),
                func.coalesce(func.sum(DailyTask.points), 0),
            ).where(
                DailyTask.veteran_id == veteran_id,
                DailyTask.task_type == task_type,
            )
        )
        row = result.one()
        task_stats[task_type.value] = {
            "total": row[0],
            "completed": row[0],  # Simplified
            "points": int(row[1]),
        }

    # Recent points
    result = await db.execute(
        select(PointsLedger).where(
            PointsLedger.veteran_id == veteran_id,
        ).order_by(PointsLedger.created_at.desc()).limit(10)
    )
    recent_points = [
        {
            "points": p.points,
            "reason": p.reason,
            "category": p.category,
            "created_at": p.created_at.isoformat(),
        }
        for p in result.scalars().all()
    ]

    # Social interactions
    result = await db.execute(
        select(func.count(SocialInteraction.id)).where(
            SocialInteraction.veteran_id == veteran_id,
        )
    )
    social_count = result.scalar() or 0

    return {
        "veteran": {
            "id": str(veteran.id),
            "service_branch": veteran.service_branch,
            "rank": veteran.rank,
            "years_of_service": veteran.years_of_service,
            "gps_enabled": veteran.gps_enabled,
            "total_points": veteran.total_points,
            "current_streak": veteran.current_streak,
            "longest_streak": veteran.longest_streak,
            "tasks_completed": veteran.tasks_completed,
            "groups_joined": veteran.groups_joined,
        },
        "task_breakdown": task_stats,
        "social_interactions": social_count,
        "recent_activity": recent_points,
    }


@router.get("/analytics/tasks")
async def task_analytics(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """Task completion analytics over time."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Daily task counts
    result = await db.execute(
        select(
            func.date(DailyTask.assigned_date).label("date"),
            func.count(DailyTask.id).label("total"),
            func.count(DailyTask.id).filter(DailyTask.status == TaskStatus.COMPLETED).label("completed"),
        ).where(
            DailyTask.assigned_date >= cutoff,
        ).group_by(func.date(DailyTask.assigned_date))
    )
    daily_stats = [
        {"date": str(row.date), "assigned": row.total, "completed": row.completed}
        for row in result.all()
    ]

    # By type
    result = await db.execute(
        select(
            DailyTask.task_type,
            func.count(DailyTask.id).label("total"),
            func.count(DailyTask.id).filter(DailyTask.status == TaskStatus.COMPLETED).label("completed"),
        ).where(
            DailyTask.assigned_date >= cutoff,
        ).group_by(DailyTask.task_type)
    )
    type_stats = [
        {"type": row.task_type.value, "assigned": row.total, "completed": row.completed}
        for row in result.all()
    ]

    return {
        "period_days": days,
        "daily": daily_stats,
        "by_type": type_stats,
    }


@router.get("/analytics/groups")
async def group_analytics(db: AsyncSession = Depends(get_db)):
    """Group activity analytics."""
    # Groups by size
    result = await db.execute(
        select(
            VeteranGroup.name,
            VeteranGroup.member_count,
            VeteranGroup.total_group_points,
            VeteranGroup.activities_completed,
        ).order_by(VeteranGroup.member_count.desc()).limit(10)
    )
    top_groups = [
        {
            "name": g.name,
            "members": g.member_count,
            "points": g.total_group_points,
            "activities": g.activities_completed,
        }
        for g in result.all()
    ]

    # Activity participation rates
    result = await db.execute(
        select(
            func.count(GroupActivity.id).label("total"),
            func.count(GroupActivity.id).filter(GroupActivity.status == "completed").label("completed"),
        )
    )
    activity_stats = result.one()

    return {
        "top_groups": top_groups,
        "activity_completion_rate": round(
            activity_stats.completed / activity_stats.total * 100, 1
        ) if activity_stats.total > 0 else 0,
    }


@router.get("/analytics/wellness")
async def wellness_analytics(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """Wellness trend analytics."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Average streak
    result = await db.execute(
        select(func.avg(VeteranProfile.current_streak))
    )
    avg_streak = result.scalar() or 0

    # Points distribution
    result = await db.execute(
        select(
            func.min(VeteranProfile.total_points),
            func.max(VeteranProfile.total_points),
            func.avg(VeteranProfile.total_points),
        )
    )
    points_stats = result.one()

    # Task completion rate by difficulty
    result = await db.execute(
        select(
            DailyTask.difficulty,
            func.count(DailyTask.id).label("total"),
            func.count(DailyTask.id).filter(DailyTask.status == TaskStatus.COMPLETED).label("completed"),
        ).where(
            DailyTask.assigned_date >= cutoff,
        ).group_by(DailyTask.difficulty)
    )
    difficulty_stats = [
        {
            "difficulty": row.difficulty,
            "total": row.total,
            "completed": row.completed,
            "rate": round(row.completed / row.total * 100, 1) if row.total > 0 else 0,
        }
        for row in result.all()
    ]

    return {
        "average_streak": round(avg_streak, 1),
        "points_distribution": {
            "min": points_stats[0] or 0,
            "max": points_stats[1] or 0,
            "average": round(points_stats[2] or 0, 1),
        },
        "completion_by_difficulty": difficulty_stats,
    }


@router.get("/analytics/gps")
async def gps_analytics(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """GPS activity analytics."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Total distance
    result = await db.execute(
        select(func.coalesce(func.sum(GPSSummary.total_distance_meters), 0)).where(
            GPSSummary.verified_at >= cutoff,
        )
    )
    total_distance = (result.scalar() or 0) / 1000

    # Average activity duration
    result = await db.execute(
        select(func.avg(GPSSummary.total_duration_seconds)).where(
            GPSSummary.verified_at >= cutoff,
        )
    )
    avg_duration = (result.scalar() or 0) / 60  # Convert to minutes

    # Target completion rate
    result = await db.execute(
        select(
            func.count(GPSSummary.id).label("total"),
            func.count(GPSSummary.id).filter(GPSSummary.gps_target_met == True).label("met"),
        ).where(
            GPSSummary.verified_at >= cutoff,
        )
    )
    target_stats = result.one()

    return {
        "period_days": days,
        "total_distance_km": round(total_distance, 2),
        "average_duration_minutes": round(avg_duration, 1),
        "target_met_rate": round(
            target_stats.met / target_stats.total * 100, 1
        ) if target_stats.total > 0 else 0,
    }


@router.get("/analytics/interactions")
async def interaction_analytics(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """Social interaction analytics."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Interaction types breakdown
    result = await db.execute(
        select(
            SocialInteraction.interaction_type,
            func.count(SocialInteraction.id).label("count"),
        ).where(
            SocialInteraction.created_at >= cutoff,
        ).group_by(SocialInteraction.interaction_type)
    )
    type_breakdown = [
        {"type": row.interaction_type.value, "count": row.count}
        for row in result.all()
    ]

    # Mood improvement
    result = await db.execute(
        select(
            func.avg(SocialInteraction.mood_after - SocialInteraction.mood_before)
        ).where(
            SocialInteraction.created_at >= cutoff,
            SocialInteraction.mood_before.isnot(None),
            SocialInteraction.mood_after.isnot(None),
        )
    )
    avg_mood_improvement = result.scalar() or 0

    return {
        "period_days": days,
        "type_breakdown": type_breakdown,
        "average_mood_improvement": round(avg_mood_improvement, 2),
    }


@router.get("/reports/daily")
async def daily_report(
    date: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get or generate daily snapshot report."""
    if date:
        target_date = datetime.fromisoformat(date.replace("Z", "+00:00"))
    else:
        target_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    next_day = target_date + timedelta(days=1)

    # Check if snapshot exists
    result = await db.execute(
        select(DailyAdminSnapshot).where(
            DailyAdminSnapshot.snapshot_date == target_date,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {
            "date": target_date.isoformat(),
            "snapshot": {
                "active_veterans": existing.active_veterans,
                "tasks_assigned": existing.tasks_assigned,
                "tasks_completed": existing.tasks_completed,
                "new_checkins": existing.new_checkins,
                "group_activities": existing.group_activities,
                "total_points_earned": existing.total_points_earned,
                "gps_tracks_recorded": existing.gps_tracks_recorded,
                "total_distance_km": existing.total_distance_km,
                "social_interactions": existing.social_interactions,
                "average_mood_score": existing.average_mood_score,
                "average_ptsd_score": existing.average_ptsd_score,
            },
            "generated_at": existing.created_at.isoformat(),
        }

    # Generate new snapshot
    result = await db.execute(
        select(func.count(func.distinct(DailyTask.veteran_id))).where(
            DailyTask.assigned_date >= target_date,
            DailyTask.assigned_date < next_day,
        )
    )
    active_veterans = result.scalar() or 0

    result = await db.execute(
        select(func.count(DailyTask.id)).where(
            DailyTask.assigned_date >= target_date,
            DailyTask.assigned_date < next_day,
        )
    )
    tasks_assigned = result.scalar() or 0

    result = await db.execute(
        select(func.count(DailyTask.id)).where(
            DailyTask.assigned_date >= target_date,
            DailyTask.assigned_date < next_day,
            DailyTask.status == TaskStatus.COMPLETED,
        )
    )
    tasks_completed = result.scalar() or 0

    result = await db.execute(
        select(func.coalesce(func.sum(PointsLedger.points), 0)).where(
            PointsLedger.created_at >= target_date,
            PointsLedger.created_at < next_day,
        )
    )
    points_earned = result.scalar() or 0

    result = await db.execute(
        select(func.count(GPSTrack.id)).where(
            GPSTrack.recorded_at >= target_date,
            GPSTrack.recorded_at < next_day,
        )
    )
    gps_tracks = result.scalar() or 0

    result = await db.execute(
        select(func.count(SocialInteraction.id)).where(
            SocialInteraction.created_at >= target_date,
            SocialInteraction.created_at < next_day,
        )
    )
    interactions = result.scalar() or 0

    snapshot = DailyAdminSnapshot(
        snapshot_date=target_date,
        active_veterans=active_veterans,
        tasks_assigned=tasks_assigned,
        tasks_completed=tasks_completed,
        total_points_earned=points_earned,
        gps_tracks_recorded=gps_tracks,
        social_interactions=interactions,
    )
    db.add(snapshot)

    return {
        "date": target_date.isoformat(),
        "snapshot": {
            "active_veterans": active_veterans,
            "tasks_assigned": tasks_assigned,
            "tasks_completed": tasks_completed,
            "total_points_earned": points_earned,
            "gps_tracks_recorded": gps_tracks,
            "social_interactions": interactions,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/reports/export")
async def export_data(
    format: str = "json",
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """Export data for analysis (JSON or CSV)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Get all veterans
    result = await db.execute(select(VeteranProfile))
    veterans = result.scalars().all()

    export_data = []
    for veteran in veterans:
        # Get task stats
        result = await db.execute(
            select(
                func.count(DailyTask.id).label("total"),
                func.count(DailyTask.id).filter(DailyTask.status == TaskStatus.COMPLETED).label("completed"),
            ).where(
                DailyTask.veteran_id == veteran.id,
                DailyTask.assigned_date >= cutoff,
            )
        )
        task_stats = result.one()

        # Get points
        result = await db.execute(
            select(func.coalesce(func.sum(PointsLedger.points), 0)).where(
                PointsLedger.veteran_id == veteran.id,
                PointsLedger.created_at >= cutoff,
            )
        )
        points = result.scalar() or 0

        # Get interactions
        result = await db.execute(
            select(func.count(SocialInteraction.id)).where(
                SocialInteraction.veteran_id == veteran.id,
                SocialInteraction.created_at >= cutoff,
            )
        )
        interactions = result.scalar() or 0

        export_data.append({
            "veteran_id": str(veteran.id),
            "service_branch": veteran.service_branch,
            "rank": veteran.rank,
            "years_of_service": veteran.years_of_service,
            "total_points": veteran.total_points,
            "current_streak": veteran.current_streak,
            "tasks_assigned": task_stats.total,
            "tasks_completed": task_stats.completed,
            "completion_rate": round(task_stats.completed / task_stats.total * 100, 1) if task_stats.total > 0 else 0,
            "points_earned_period": points,
            "social_interactions": interactions,
            "groups_joined": veteran.groups_joined,
        })

    if format == "csv":
        # Convert to CSV
        if not export_data:
            return {"message": "No data to export"}

        headers = export_data[0].keys()
        csv_lines = [",".join(headers)]
        for row in export_data:
            csv_lines.append(",".join(str(row[h]) for h in headers))

        return StreamingResponse(
            iter(["\n".join(csv_lines)]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=veteran_export_{days}d.csv"},
        )

    return {
        "export": export_data,
        "total_veterans": len(export_data),
        "period_days": days,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
