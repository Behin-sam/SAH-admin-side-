"""Counselor dashboard endpoints.

GET    /api/counselors/{id}/cases              — List assigned cases with summaries
GET    /api/counselors/{id}/cases/{sid}        — Get specific case detail
GET    /api/counselors/{id}/alerts              — List alerts (pending first)
POST   /api/counselors/{id}/alerts/{aid}/ack    — Acknowledge an alert
PUT    /api/counselors/{id}/alerts/{aid}/notes  — Add/update case notes

All responses are filtered: counselors NEVER see raw response text,
raw signal logs, or survivor PII.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    CounselorCaseAssignment, SurvivorProfile,
    RiskTrajectoryLog, Alert, AlertStatus,
    CheckinResponse, ConsentState, ConsentStatus,
)
from app.schemas.requests import CaseNoteUpdate, AlertAcknowledge
from app.schemas.responses import (
    CounselorCaseSummary, AlertResponse, AlertListResponse,
    TrajectoryInfo,
)
from app.security.access_control import verify_case_access

router = APIRouter(prefix="/api/counselors/{counselor_id}", tags=["counselor"])


async def _get_assigned_survivor_ids(db: AsyncSession, counselor_id: UUID) -> list[str]:
    """Get all survivor IDs assigned to this counselor."""
    result = await db.execute(
        select(CounselorCaseAssignment.survivor_id)
        .where(
            CounselorCaseAssignment.counselor_id == str(counselor_id),
            CounselorCaseAssignment.is_active == True,
        )
    )
    return [str(row[0]) for row in result.all()]


async def _get_latest_trajectory(db: AsyncSession, survivor_id: str) -> RiskTrajectoryLog | None:
    result = await db.execute(
        select(RiskTrajectoryLog)
        .where(RiskTrajectoryLog.survivor_id == survivor_id)
        .order_by(RiskTrajectoryLog.computed_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def _get_checkin_count(db: AsyncSession, survivor_id: str) -> int:
    result = await db.execute(
        select(func.count(func.distinct(CheckinResponse.session_id)))
        .where(CheckinResponse.survivor_id == survivor_id)
    )
    return result.scalar() or 0


async def _get_consent_summary(db: AsyncSession, survivor_id: str) -> dict[str, str]:
    result = await db.execute(
        select(ConsentState).where(ConsentState.survivor_id == survivor_id)
    )
    consents = result.scalars().all()
    return {c.signal_type.value: c.status.value for c in consents}


@router.get("/cases", response_model=list[CounselorCaseSummary])
async def list_cases(counselor_id: UUID, db: AsyncSession = Depends(get_db)):
    """List all active cases for this counselor with trajectory summaries."""
    survivor_ids = await _get_assigned_survivor_ids(db, counselor_id)
    cases = []

    for sid in survivor_ids:
        # Survivor profile
        result = await db.execute(
            select(SurvivorProfile).where(SurvivorProfile.id == sid)
        )
        survivor = result.scalar_one_or_none()
        if not survivor:
            continue

        trajectory_log = await _get_latest_trajectory(db, sid)
        checkin_count = await _get_checkin_count(db, sid)
        consent_status = await _get_consent_summary(db, sid)

        # Latest alert
        alert_result = await db.execute(
            select(Alert)
            .where(Alert.survivor_id == sid, Alert.counselor_id == str(counselor_id))
            .order_by(Alert.created_at.desc())
            .limit(1)
        )
        latest_alert = alert_result.scalar_one_or_none()

        current_trajectory = TrajectoryInfo(
            label=trajectory_log.trajectory_label.value if trajectory_log else "stable",
            severity_score=trajectory_log.severity_score if trajectory_log else 0.0,
            confidence=trajectory_log.confidence if trajectory_log else 0.0,
            trend_summary=trajectory_log.trend_summary or "No data yet." if trajectory_log else "No data yet.",
            computed_at=trajectory_log.computed_at if trajectory_log else datetime.now(timezone.utc),
        )

        # Sensitivity map
        sensitivity_map = {}
        if trajectory_log and trajectory_log.contributing_topics:
            for topic in trajectory_log.contributing_topics:
                sensitivity_map[topic] = 1.0

        cases.append(CounselorCaseSummary(
            survivor_id=survivor.id,
            current_trajectory=current_trajectory,
            alert_status=latest_alert.status.value if latest_alert else None,
            alert_created_at=latest_alert.created_at if latest_alert else None,
            baseline_established=survivor.baseline_established,
            checkin_count=checkin_count,
            consent_status=consent_status,
            sensitivity_map=sensitivity_map,
        ))

    return cases


@router.get("/alerts", response_model=AlertListResponse)
async def list_alerts(
    counselor_id: UUID,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List alerts for this counselor, pending first."""
    query = select(Alert).where(Alert.counselor_id == str(counselor_id))

    if status:
        query = query.where(Alert.status == status)

    query = query.order_by(
        Alert.status.desc(),  # pending first
        Alert.created_at.desc(),
    )

    result = await db.execute(query.limit(50))
    alerts = result.scalars().all()

    pending_count = await db.execute(
        select(func.count(Alert.id))
        .where(
            Alert.counselor_id == str(counselor_id),
            Alert.status == AlertStatus.PENDING,
        )
    )

    return AlertListResponse(
        alerts=[
            AlertResponse(
                id=alert.id,
                survivor_id=alert.survivor_id,
                alert_type=alert.alert_type,
                status=alert.status.value,
                trend_summary=alert.trend_summary,
                contributing_topics=alert.contributing_topics or [],
                severity_score=alert.severity_score,
                case_notes=alert.case_notes,
                created_at=alert.created_at,
                acknowledged_at=alert.acknowledged_at,
            )
            for alert in alerts
        ],
        total_pending=pending_count.scalar() or 0,
    )


@router.post("/alerts/{alert_id}/ack", response_model=AlertResponse)
async def acknowledge_alert(
    counselor_id: UUID,
    alert_id: UUID,
    data: AlertAcknowledge,
    db: AsyncSession = Depends(get_db),
):
    """Acknowledge an alert. Records when it was seen and optional notes."""
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.counselor_id != str(counselor_id):
        raise HTTPException(status_code=403, detail="Not your alert")

    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_at = datetime.now(timezone.utc)
    if data.case_notes:
        alert.case_notes = data.case_notes

    return AlertResponse(
        id=alert.id,
        survivor_id=alert.survivor_id,
        alert_type=alert.alert_type,
        status=alert.status.value,
        trend_summary=alert.trend_summary,
        contributing_topics=alert.contributing_topics or [],
        severity_score=alert.severity_score,
        case_notes=alert.case_notes,
        created_at=alert.created_at,
        acknowledged_at=alert.acknowledged_at,
    )


@router.put("/alerts/{alert_id}/notes", response_model=AlertResponse)
async def update_case_notes(
    counselor_id: UUID,
    alert_id: UUID,
    data: CaseNoteUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Add or update case notes on an alert."""
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.counselor_id != str(counselor_id):
        raise HTTPException(status_code=403, detail="Not your alert")

    alert.case_notes = data.case_notes
    alert.updated_at = datetime.now(timezone.utc)

    return AlertResponse(
        id=alert.id,
        survivor_id=alert.survivor_id,
        alert_type=alert.alert_type,
        status=alert.status.value,
        trend_summary=alert.trend_summary,
        contributing_topics=alert.contributing_topics or [],
        severity_score=alert.severity_score,
        case_notes=alert.case_notes,
        created_at=alert.created_at,
        acknowledged_at=alert.acknowledged_at,
    )
