"""AI Alert & Credibility Evaluation Engine.

Analyzes longitudinal adherence, self-reported signals, and crisis triggers
to calculate a composite Credibility and Stability Score (0-100).
Automatically evaluates and triggers explainable clinical alerts targeted
specifically to the veteran's assigned counselor.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Alert,
    AlertStatus,
    SurvivorProfile,
    RiskTrajectoryLog,
    TrajectoryLabel,
    CheckinResponse,
    CounselorCaseAssignment,
)
from app.models.gamified import VeteranProfile, DailyTask, TaskStatus, TaskType
from app.models.chat import CounselorProfile


# Scoring Weights: Task Adherence (40%), Daily Routine & Streak (35%), Baseline Stability (25%)
CREDIBILITY_THRESHOLD_WARNING = 65.0
CREDIBILITY_THRESHOLD_ALERT = 50.0
CREDIBILITY_THRESHOLD_CRITICAL = 35.0


def calculate_credibility_metrics(
    tasks: list[DailyTask],
    checkin_count: int,
    streak: int,
    recent_emergency: bool = False,
) -> dict:
    """Calculate composite credibility and stability scores (0 - 100)."""
    # 1. Task Adherence Component (max 40 pts)
    if not tasks:
        task_score = 30.0  # baseline default
        completed_rate = 0.5
    else:
        completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
        completed_rate = completed / len(tasks)
        task_score = completed_rate * 40.0

    # 2. Daily Routine and Streak Concordance (max 35 pts)
    if streak <= 0:
        streak_score = 12.0
    elif streak < 3:
        streak_score = 22.0
    elif streak < 7:
        streak_score = 30.0
    else:
        streak_score = 35.0

    # 3. Baseline Stability and Check-in Presence (max 25 pts)
    checkin_score = min(25.0, 15.0 + (checkin_count * 2.5))

    composite = task_score + streak_score + checkin_score

    # Emergency penalty
    if recent_emergency:
        composite = max(15.0, composite - 35.0)

    composite = max(5.0, min(100.0, round(composite, 1)))

    flags = []
    if completed_rate < 0.3 and len(tasks) >= 3:
        flags.append("Significant task non-adherence (less than 30% completion rate)")
    if streak <= 0:
        flags.append("Disrupted daily recovery streak (0 consecutive days)")
    if recent_emergency:
        flags.append("Emergency SOS Crisis Beacon triggered")
    if composite < CREDIBILITY_THRESHOLD_ALERT:
        flags.append(f"Composite credibility dropped to critical level ({composite}/100)")

    return {
        "credibility_score": composite,
        "stability_score": round(max(10.0, composite * 0.95), 1),
        "task_completion_rate": round(completed_rate * 100, 1),
        "streak_days": streak,
        "flags": flags,
    }


async def evaluate_and_trigger_alerts(
    db: AsyncSession,
    veteran_id: uuid.UUID,
    trigger_event: Optional[str] = None,
    event_details: Optional[dict] = None,
) -> Optional[Alert]:
    """Evaluates veteran metrics and triggers explainable counselor alert if needed."""
    # 1. Fetch VeteranProfile
    v_res = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = v_res.scalar_one_or_none()
    if not veteran:
        return None

    # Fetch survivor profile to get name
    s_res = await db.execute(select(SurvivorProfile).where(SurvivorProfile.id == veteran.survivor_id))
    survivor = s_res.scalar_one_or_none()
    vet_name = survivor.preferred_language if (survivor and survivor.preferred_language) else "Veteran"

    # 2. Identify assigned counselor
    counselor_uuid: Optional[uuid.UUID] = None
    counselor_id = veteran.assigned_counselor_id
    if counselor_id:
        if isinstance(counselor_id, uuid.UUID):
            counselor_uuid = counselor_id
        else:
            try:
                counselor_uuid = uuid.UUID(str(counselor_id))
            except Exception:
                counselor_uuid = None

    if not counselor_uuid:
        ca_res = await db.execute(
            select(CounselorCaseAssignment)
            .where(CounselorCaseAssignment.survivor_id == veteran.survivor_id, CounselorCaseAssignment.is_active == True)
        )
        ca = ca_res.scalars().first()
        if ca:
            counselor_uuid = ca.counselor_id

    if not counselor_uuid:
        c_res = await db.execute(select(CounselorProfile).order_by(CounselorProfile.created_at.asc()))
        first_c = c_res.scalars().first()
        counselor_uuid = first_c.id if first_c else uuid.UUID("c0000000-0000-0000-0000-000000000001")

    survivor_uuid = veteran.survivor_id if isinstance(veteran.survivor_id, uuid.UUID) else uuid.UUID(str(veteran.survivor_id))

    # 3. Fetch recent tasks (last 7 days)
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    tasks_res = await db.execute(
        select(DailyTask)
        .where(DailyTask.veteran_id == veteran_id, DailyTask.assigned_date >= seven_days_ago)
    )
    recent_tasks = tasks_res.scalars().all()

    # 4. Check-in count
    chk_res = await db.execute(
        select(func.count(CheckinResponse.id)).where(CheckinResponse.survivor_id == survivor_uuid)
    )
    checkin_count = chk_res.scalar() or 2

    # 5. Compute credibility
    is_emergency = trigger_event in ["EMERGENCY_SOS", "CRISIS_BEACON", "ACUTE_TRIGGER"]
    metrics = calculate_credibility_metrics(
        tasks=list(recent_tasks),
        checkin_count=checkin_count,
        streak=veteran.current_streak or 0,
        recent_emergency=is_emergency,
    )

    new_credibility = metrics["credibility_score"]
    veteran.credibility_score = new_credibility
    veteran.stability_score = metrics["stability_score"]

    alert_to_create = None
    now = datetime.now(timezone.utc)

    # 6. Check for Alert Condition
    if is_emergency:
        alert_type = "acute"
        severity = 0.95
        trend_summary = (
            f"URGENT EMERGENCY BEACON: {vet_name} dispatched an emergency crisis beacon at "
            f"{now.strftime('%H:%M UTC')}. Immediate outreach protocol activated per acute trauma protocol."
        )
        topics = ["emergency_beacon", "acute_distress", "immediate_contact", "safety_alert"]
        alert_to_create = (alert_type, severity, trend_summary, topics)

    elif new_credibility < CREDIBILITY_THRESHOLD_ALERT:
        alert_type = "escalating"
        severity = 0.80 if new_credibility > CREDIBILITY_THRESHOLD_CRITICAL else 0.90
        trend_summary = (
            f"LOW CREDIBILITY / DISENGAGEMENT ALERT: {vet_name}'s composite credibility score "
            f"dropped to {new_credibility}/100. Notable flags: {'; '.join(metrics['flags'])}."
        )
        topics = ["credibility_drop", "disengagement", "task_nonadherence", "adherence_risk"]
        alert_to_create = (alert_type, severity, trend_summary, topics)

    elif trigger_event == "CHECKIN_HIGH_DISTRESS":
        alert_type = "escalating"
        severity = 0.75
        trend_summary = (
            f"CHECK-IN DISTRESS: {vet_name} submitted a wellness check-in reporting high emotional distress "
            f"and requested clinical counselor support."
        )
        topics = ["checkin_distress", "support_request", "emotional_dysregulation"]
        alert_to_create = (alert_type, severity, trend_summary, topics)

    # 7. Deduplicate & Save Alert
    created_alert = None
    if alert_to_create:
        atype, asev, asummary, atopics = alert_to_create

        # Check for existing unacknowledged alert of same type within last 8 hours
        eight_hours_ago = now - timedelta(hours=8)
        existing_alert_res = await db.execute(
            select(Alert).where(
                Alert.survivor_id == survivor_uuid,
                Alert.counselor_id == counselor_uuid,
                Alert.alert_type == atype,
                Alert.status == AlertStatus.PENDING,
                Alert.created_at >= eight_hours_ago,
            )
        )
        existing_alert = existing_alert_res.scalars().first()

        if existing_alert:
            existing_alert.trend_summary = asummary
            existing_alert.severity_score = asev
            existing_alert.contributing_topics = atopics
            existing_alert.updated_at = now
            created_alert = existing_alert
        else:
            new_alert = Alert(
                id=uuid.uuid4(),
                survivor_id=survivor_uuid,
                counselor_id=counselor_uuid,
                status=AlertStatus.PENDING,
                alert_type=atype,
                trend_summary=asummary,
                contributing_topics=atopics,
                severity_score=asev,
                created_at=now,
                updated_at=now,
            )
            db.add(new_alert)
            created_alert = new_alert

    # 8. Record in RiskTrajectoryLog for longitudinal audit
    traj_label = (
        TrajectoryLabel.ACUTE if is_emergency
        else TrajectoryLabel.ESCALATING if new_credibility < CREDIBILITY_THRESHOLD_ALERT
        else TrajectoryLabel.STABLE
    )
    risk_log = RiskTrajectoryLog(
        id=uuid.uuid4(),
        survivor_id=survivor_uuid,
        trajectory_label=traj_label,
        severity_score=0.95 if is_emergency else round(1.0 - (new_credibility / 100.0), 2),
        confidence=0.90,
        contributing_features=metrics["flags"],
        contributing_topics=topics if alert_to_create else ["daily_wellness"],
        trend_summary=asummary if alert_to_create else f"Recovery baseline stable. Credibility: {new_credibility}/100.",
        computed_at=now,
    )
    db.add(risk_log)

    await db.commit()
    if created_alert:
        await db.refresh(created_alert)

    return created_alert
