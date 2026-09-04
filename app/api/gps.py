"""GPS tracking endpoints for physical task verification.

POST   /api/veterans/{id}/gps/track       — Record GPS point during activity
POST   /api/veterans/{id}/gps/track/batch — Record multiple GPS points
GET    /api/veterans/{id}/gps/track/{task_id} — Get GPS track for a task
GET    /api/veterans/{id}/gps/history     — Get GPS activity history
GET    /api/veterans/{id}/gps/stats       — Get GPS statistics
"""

from __future__ import annotations

import uuid
import math
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.gamified import (
    VeteranProfile,
    DailyTask,
    GPSTrack,
    GPSSummary,
    TaskStatus,
)

router = APIRouter(prefix="/api/veterans/{veteran_id}/gps", tags=["gps"])


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS points in meters using Haversine formula."""
    R = 6371000  # Earth's radius in meters

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


@router.post("/track", status_code=201)
async def record_gps_point(
    veteran_id: uuid.UUID,
    task_id: uuid.UUID | None = None,
    latitude: float = 0.0,
    longitude: float = 0.0,
    altitude: float | None = None,
    accuracy: float | None = None,
    speed: float | None = None,
    activity_type: str | None = None,
    is_start: bool = False,
    is_end: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """Record a single GPS point during a physical activity."""
    # Verify veteran exists
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Veteran not found")

    # Validate coordinates
    if not (-90 <= latitude <= 90):
        raise HTTPException(status_code=400, detail="Invalid latitude")
    if not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid longitude")

    track_point = GPSTrack(
        veteran_id=veteran_id,
        task_id=task_id,
        latitude=latitude,
        longitude=longitude,
        altitude=altitude,
        accuracy_meters=accuracy,
        speed=speed,
        activity_type=activity_type,
        is_start_point=is_start,
        is_end_point=is_end,
    )
    db.add(track_point)

    # If this is the end point, compute summary
    if is_end and task_id:
        await _compute_gps_summary(veteran_id, task_id, db)

    await db.flush()

    return {
        "id": str(track_point.id),
        "recorded_at": track_point.recorded_at.isoformat(),
        "message": "GPS point recorded",
    }


@router.post("/track/batch", status_code=201)
async def record_gps_batch(
    veteran_id: uuid.UUID,
    points: list[dict],
    task_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Record multiple GPS points in a batch for efficiency."""
    if len(points) > 1000:
        raise HTTPException(status_code=400, detail="Maximum 1000 points per batch")

    # Verify veteran exists
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Veteran not found")

    recorded_count = 0
    last_point = None

    for point_data in points:
        lat = point_data.get("latitude", 0)
        lon = point_data.get("longitude", 0)

        if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
            continue

        track_point = GPSTrack(
            veteran_id=veteran_id,
            task_id=task_id or point_data.get("task_id"),
            latitude=lat,
            longitude=lon,
            altitude=point_data.get("altitude"),
            accuracy_meters=point_data.get("accuracy"),
            speed=point_data.get("speed"),
            activity_type=point_data.get("activity_type"),
            is_start_point=point_data.get("is_start", False),
            is_end_point=point_data.get("is_end", False),
            recorded_at=datetime.fromisoformat(point_data.get("timestamp", datetime.now(timezone.utc).isoformat())),
        )
        db.add(track_point)
        recorded_count += 1
        last_point = track_point

    # Compute summary if last point is end point
    if last_point and last_point.is_end_point and task_id:
        await _compute_gps_summary(veteran_id, task_id, db)

    return {
        "recorded": recorded_count,
        "message": f"Recorded {recorded_count} GPS points",
    }


@router.get("/track/{task_id}")
async def get_task_gps_track(
    veteran_id: uuid.UUID,
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get GPS track for a specific task."""
    result = await db.execute(
        select(GPSTrack).where(
            GPSTrack.veteran_id == veteran_id,
            GPSTrack.task_id == task_id,
        ).order_by(GPSTrack.recorded_at)
    )
    points = result.scalars().all()

    if not points:
        raise HTTPException(status_code=404, detail="No GPS data found for this task")

    # Get summary if available
    result = await db.execute(
        select(GPSSummary).where(GPSSummary.task_id == task_id)
    )
    summary = result.scalar_one_or_none()

    return {
        "task_id": str(task_id),
        "points": [
            {
                "latitude": p.latitude,
                "longitude": p.longitude,
                "altitude": p.altitude,
                "speed": p.speed,
                "timestamp": p.recorded_at.isoformat(),
            }
            for p in points
        ],
        "summary": {
            "total_distance_meters": summary.total_distance_meters if summary else None,
            "total_duration_seconds": summary.total_duration_seconds if summary else None,
            "average_speed_ms": summary.average_speed_ms if summary else None,
            "gps_target_met": summary.gps_target_met if summary else None,
        } if summary else None,
        "point_count": len(points),
    }


@router.get("/history")
async def get_gps_history(
    veteran_id: uuid.UUID,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """Get GPS activity history for the last N days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(GPSTrack).where(
            GPSTrack.veteran_id == veteran_id,
            GPSTrack.recorded_at >= cutoff,
        ).order_by(GPSTrack.recorded_at.desc())
    )
    tracks = result.scalars().all()

    # Group by task
    task_tracks = {}
    for track in tracks:
        task_key = str(track.task_id) if track.task_id else "ungrouped"
        if task_key not in task_tracks:
            task_tracks[task_key] = []
        task_tracks[task_key].append({
            "latitude": track.latitude,
            "longitude": track.longitude,
            "timestamp": track.recorded_at.isoformat(),
            "activity_type": track.activity_type,
        })

    return {
        "veteran_id": str(veteran_id),
        "days": days,
        "total_points": len(tracks),
        "activities": task_tracks,
    }


@router.get("/stats")
async def get_gps_stats(
    veteran_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get GPS statistics for the veteran."""
    # Total distance from summaries
    result = await db.execute(
        select(func.coalesce(func.sum(GPSSummary.total_distance_meters), 0)).where(
            GPSSummary.veteran_id == veteran_id,
        )
    )
    total_distance = result.scalar() or 0

    # Total activities
    result = await db.execute(
        select(func.count(func.distinct(GPSTrack.task_id))).where(
            GPSTrack.veteran_id == veteran_id,
            GPSTrack.task_id.isnot(None),
        )
    )
    total_activities = result.scalar() or 0

    # Average activity duration
    result = await db.execute(
        select(func.coalesce(func.avg(GPSSummary.total_duration_seconds), 0)).where(
            GPSSummary.veteran_id == veteran_id,
        )
    )
    avg_duration = result.scalar() or 0

    # This week's distance
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    result = await db.execute(
        select(GPSTrack).where(
            GPSTrack.veteran_id == veteran_id,
            GPSTrack.recorded_at >= week_ago,
        )
    )
    week_points = result.scalars().all()
    week_distance = sum(p.altitude or 0 for p in week_points)  # Simplified

    return {
        "veteran_id": str(veteran_id),
        "total_distance_km": round(total_distance / 1000, 2),
        "total_activities": total_activities,
        "average_duration_minutes": round(avg_duration / 60, 1),
        "this_week_distance_km": round(week_distance / 1000, 2),
    }


async def _compute_gps_summary(veteran_id: uuid.UUID, task_id: uuid.UUID, db: AsyncSession):
    """Compute GPS summary for a completed task."""
    result = await db.execute(
        select(GPSTrack).where(
            GPSTrack.veteran_id == veteran_id,
            GPSTrack.task_id == task_id,
        ).order_by(GPSTrack.recorded_at)
    )
    points = result.scalars().all()

    if len(points) < 2:
        return

    # Calculate total distance
    total_distance = 0
    for i in range(1, len(points)):
        dist = haversine_distance(
            points[i-1].latitude, points[i-1].longitude,
            points[i].latitude, points[i].longitude,
        )
        total_distance += dist

    # Calculate duration
    duration = (points[-1].recorded_at - points[0].recorded_at).total_seconds()

    # Get task to check targets
    task_result = await db.execute(select(DailyTask).where(DailyTask.id == task_id))
    task = task_result.scalar_one_or_none()

    target_met = True
    if task and task.gps_target_distance_meters:
        target_met = total_distance >= task.gps_target_distance_meters
    if task and task.gps_min_duration_seconds:
        target_met = target_met and (duration >= task.gps_min_duration_seconds)

    summary = GPSSummary(
        veteran_id=veteran_id,
        task_id=task_id,
        total_distance_meters=total_distance,
        total_duration_seconds=int(duration),
        average_speed_ms=total_distance / duration if duration > 0 else 0,
        point_count=len(points),
        start_latitude=points[0].latitude,
        start_longitude=points[0].longitude,
        end_latitude=points[-1].latitude,
        end_longitude=points[-1].longitude,
        gps_target_met=target_met,
    )
    db.add(summary)
