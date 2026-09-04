"""Intake and check-in endpoints.

POST   /api/survivors/{id}/intake           — Submit 15-20 question intake
POST   /api/survivors/{id}/checkin          — Submit 5-question check-in + signals
GET    /api/survivors/{id}/trend            — Survivor's own trend view
GET    /api/survivors/{id}/checkins         — List check-in history
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.middleware.consent import enforce_consent_or_raise, check_consent
from app.models import (
    SurvivorProfile, CheckinResponse, QuestionBank,
    ReactionSignal, SignalType, TrajectoryLabel,
    RiskTrajectoryLog,
)
from app.schemas.requests import IntakeSubmission, CheckinSubmission
from app.schemas.responses import (
    IntakeSubmissionResponse, CheckinSubmissionResponse,
    TrendResponse, TrajectoryInfo,
)
from app.security.encryption import encrypt_string

router = APIRouter(prefix="/api/survivors/{survivor_id}", tags=["checkins"])


async def _get_survivor_or_404(db: AsyncSession, survivor_id: UUID) -> SurvivorProfile:
    result = await db.execute(
        select(SurvivorProfile).where(SurvivorProfile.id == survivor_id)
    )
    survivor = result.scalar_one_or_none()
    if not survivor:
        raise HTTPException(status_code=404, detail="Survivor not found")
    return survivor


async def _count_checkins(db: AsyncSession, survivor_id: UUID) -> int:
    """Count distinct check-in sessions for a survivor."""
    result = await db.execute(
        select(func.count(func.distinct(CheckinResponse.session_id)))
        .where(CheckinResponse.survivor_id == str(survivor_id))
    )
    return result.scalar() or 0


@router.post("/intake", response_model=IntakeSubmissionResponse, status_code=201)
async def submit_intake(
    survivor_id: UUID,
    data: IntakeSubmission,
    db: AsyncSession = Depends(get_db),
):
    """Submit the initial 15-20 question intake.

    All response text is encrypted before storage.
    Reaction signals are NOT collected during intake.
    """
    survivor = await _get_survivor_or_404(db, survivor_id)

    for answer in data.answers:
        intake = CheckinResponse(
            survivor_id=str(survivor_id),
            question_id=str(answer.question_id),
            session_id=str(data.session_id),
            encrypted_response_text=encrypt_string(answer.response_text) if answer.response_text else None,
            response_option=answer.response_option,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
        )
        db.add(intake)

    # Start baseline period
    now = datetime.now(timezone.utc)
    survivor.baseline_established = False
    survivor.baseline_period_end = now.replace(
        day=now.day + settings.BASELINE_PERIOD_DAYS
        if now.day + settings.BASELINE_PERIOD_DAYS <= 28
        else 28
    )

    return IntakeSubmissionResponse(
        survivor_id=survivor_id,
        session_id=data.session_id,
        questions_answered=len(data.answers),
        message="Intake completed. Baseline period begins now.",
    )


@router.post("/checkin", response_model=CheckinSubmissionResponse, status_code=201)
async def submit_checkin(
    survivor_id: UUID,
    data: CheckinSubmission,
    db: AsyncSession = Depends(get_db),
):
    """Submit a 5-question check-in with reaction signals.

    Consent is checked before storing any signal data.
    If baseline is not yet established and the baseline period has passed,
    the baseline is computed automatically.
    """
    survivor = await _get_survivor_or_404(db, survivor_id)

    # Store answers
    for answer in data.answers:
        checkin = CheckinResponse(
            survivor_id=str(survivor_id),
            question_id=str(answer.question_id),
            session_id=str(data.session_id),
            encrypted_response_text=encrypt_string(answer.response_text) if answer.response_text else None,
            response_option=answer.response_option,
            started_at=data.started_at,
            completed_at=data.completed_at,
            was_skipped=answer.was_skipped,
            revision_count=answer.revision_count,
        )
        db.add(checkin)

    # Store reaction signals (with consent check)
    signals = data.reaction_signals
    signal_types_to_store = []

    if signals.time_to_answer_avg is not None:
        signal_types_to_store.append((SignalType.TIME_TO_ANSWER, "time_to_answer", signals.time_to_answer_avg))
    if signals.skip_count > 0:
        signal_types_to_store.append((SignalType.SKIP_RATE, "skip_rate", signals.skip_count / signals.total_questions))
    if signals.revision_total > 0:
        signal_types_to_store.append((SignalType.ANSWER_REVISION, "answer_revision", float(signals.revision_total)))

    # Voice features (opt-in)
    if signals.voice_pitch_variability is not None:
        signal_types_to_store.append((SignalType.VOICE_PITCH, "voice_pitch", signals.voice_pitch_variability))
    if signals.voice_pace is not None:
        signal_types_to_store.append((SignalType.VOICE_PACE, "voice_pace", signals.voice_pace))
    if signals.voice_pause_duration is not None:
        signal_types_to_store.append((SignalType.VOICE_PAUSES, "voice_pauses", signals.voice_pause_duration))

    for signal_type, _name, value in signal_types_to_store:
        try:
            await enforce_consent_or_raise(db, str(survivor_id), signal_type)
        except PermissionError:
            continue  # Skip this signal — consent not granted

    # Store raw signal record
    reaction = ReactionSignal(
        survivor_id=str(survivor_id),
        checkin_session_id=str(data.session_id),
        time_to_answer=signals.time_to_answer_avg,
        was_skipped=signals.skip_count > 0,
        skip_count_in_session=signals.skip_count,
        revision_count=signals.revision_total,
        voice_pitch_variability=signals.voice_pitch_variability,
        voice_pace=signals.voice_pace,
        voice_pause_duration=signals.voice_pause_duration,
        recorded_at=data.completed_at or datetime.now(timezone.utc),
    )
    db.add(reaction)

    # Check baseline status
    checkin_count = await _count_checkins(db, survivor_id)

    # Check if we should establish baseline
    baseline_established = survivor.baseline_established
    checkins_until_baseline = None

    if not baseline_established and survivor.baseline_period_end:
        if datetime.now(timezone.utc) >= survivor.baseline_period_end:
            survivor.baseline_established = True
            baseline_established = True

    if not baseline_established and survivor.baseline_period_end:
        remaining = settings.BASELINE_PERIOD_DAYS - checkin_count
        checkins_until_baseline = max(0, remaining)

    # Get current trajectory (if baseline established)
    trajectory = None
    if baseline_established:
        result = await db.execute(
            select(RiskTrajectoryLog)
            .where(RiskTrajectoryLog.survivor_id == str(survivor_id))
            .order_by(RiskTrajectoryLog.computed_at.desc())
            .limit(1)
        )
        latest = result.scalar_one_or_none()
        if latest:
            trajectory = TrajectoryInfo(
                label=latest.trajectory_label.value,
                severity_score=latest.severity_score,
                confidence=latest.confidence,
                trend_summary=latest.trend_summary or "",
                computed_at=latest.computed_at,
            )

    return CheckinSubmissionResponse(
        survivor_id=survivor_id,
        session_id=data.session_id,
        checkins_completed=checkin_count,
        baseline_established=baseline_established,
        checkins_until_baseline=checkins_until_baseline,
        trajectory=trajectory,
    )


@router.get("/trend", response_model=TrendResponse)
async def get_trend(survivor_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get the survivor's own trend view ('your patterns').

    This is what the survivor sees — their trajectory history
    and topic sensitivity map.
    """
    survivor = await _get_survivor_or_404(db, survivor_id)

    # Get recent trajectory log
    result = await db.execute(
        select(RiskTrajectoryLog)
        .where(RiskTrajectoryLog.survivor_id == str(survivor_id))
        .order_by(RiskTrajectoryLog.computed_at.desc())
        .limit(30)
    )
    logs = result.scalars().all()

    current = logs[0] if logs else None
    history = [
        TrajectoryInfo(
            label=log.trajectory_label.value,
            severity_score=log.severity_score,
            confidence=log.confidence,
            trend_summary=log.trend_summary or "",
            computed_at=log.computed_at,
        )
        for log in reversed(logs)
    ]

    current_trajectory = TrajectoryInfo(
        label=current.trajectory_label.value if current else "stable",
        severity_score=current.severity_score if current else 0.0,
        confidence=current.confidence if current else 0.0,
        trend_summary=current.trend_summary or "No data yet." if current else "No data yet.",
        computed_at=current.computed_at if current else datetime.now(timezone.utc),
    )

    # Sensitivity map from latest log
    sensitivity_map = {}
    if current and current.contributing_topics:
        for topic in current.contributing_topics:
            sensitivity_map[topic] = 1.0  # Simplified — real score from engine

    return TrendResponse(
        survivor_id=survivor_id,
        current_trajectory=current_trajectory,
        trajectory_history=history,
        sensitivity_map=sensitivity_map,
    )
