"""Response schemas for all API endpoints.

These define the exact JSON shape the frontend receives.
Every response is filtered through access_control.filter_for_role()
before being returned, so counselors never see raw response text.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ─── Common ───────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: str | None = None


class SuccessResponse(BaseModel):
    """Standard success response."""
    message: str
    id: UUID | None = None


# ─── Survivor ─────────────────────────────────────────────────────────────────

class SurvivorResponse(BaseModel):
    """Survivor profile — PII is redacted for counselors."""
    id: UUID
    preferred_language: str
    timezone_offset: str
    baseline_established: bool
    baseline_period_end: datetime | None
    created_at: datetime


class SurvivorDetailResponse(SurvivorResponse):
    """Full survivor detail (for survivor self-view)."""
    name: str | None = Field(None, description="Decrypted name (only for survivor/admin)")
    email: str | None = None
    phone: str | None = None


# ─── Consent ──────────────────────────────────────────────────────────────────

class ConsentStatusResponse(BaseModel):
    """Consent status for all signal types."""
    survivor_id: UUID
    consents: dict[str, str] = Field(..., description="Map of signal_type -> status")


class ConsentToggleResponse(BaseModel):
    """Confirmation of a consent toggle."""
    signal_type: str
    status: str
    consent_version: int
    revoked_at: datetime | None = None


# ─── Intake ───────────────────────────────────────────────────────────────────

class IntakeSubmissionResponse(BaseModel):
    """Confirmation of intake submission."""
    survivor_id: UUID
    session_id: UUID
    questions_answered: int
    message: str = "Intake completed. Baseline period begins now."


# ─── Check-in ─────────────────────────────────────────────────────────────────

class CheckinSubmissionResponse(BaseModel):
    """Confirmation of check-in submission with baseline status."""
    survivor_id: UUID
    session_id: UUID
    checkins_completed: int
    baseline_established: bool
    checkins_until_baseline: int | None = Field(None, description="Remaining check-ins before baseline is set")
    trajectory: TrajectoryInfo | None = Field(None, description="Current trajectory (only after baseline)")


# ─── Trajectory ───────────────────────────────────────────────────────────────

class TrajectoryInfo(BaseModel):
    """Current trajectory assessment."""
    label: str = Field(..., description="stable / declining / escalating / acute")
    severity_score: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    trend_summary: str = Field(..., description="Human-readable trend summary")
    computed_at: datetime


class TrendResponse(BaseModel):
    """Survivor's own trend view ('your patterns')."""
    survivor_id: UUID
    current_trajectory: TrajectoryInfo
    trajectory_history: list[TrajectoryInfo] = Field(default_factory=list, description="Last 30 days of trajectory points")
    sensitivity_map: dict[str, float] = Field(default_factory=dict, description="Topic -> activation score (0-1)")


# ─── Counselor Dashboard ─────────────────────────────────────────────────────

class CounselorCaseSummary(BaseModel):
    """Summary view of a survivor case for the counselor dashboard."""
    survivor_id: UUID
    current_trajectory: TrajectoryInfo
    alert_status: str | None
    alert_created_at: datetime | None
    baseline_established: bool
    checkin_count: int
    consent_status: dict[str, str]
    sensitivity_map: dict[str, float]


class AlertResponse(BaseModel):
    """Alert detail for counselor view."""
    id: UUID
    survivor_id: UUID
    alert_type: str
    status: str
    trend_summary: str
    contributing_topics: list[str]
    severity_score: float
    case_notes: str | None
    created_at: datetime
    acknowledged_at: datetime | None


class AlertListResponse(BaseModel):
    """List of alerts for a counselor."""
    alerts: list[AlertResponse]
    total_pending: int


# ─── Counselor Case Report (LLM-powered) ────────────────────────────────────

class AnsweringPatternsResponse(BaseModel):
    """How the survivor answers questions — timing, skips, revisions."""
    response_timing: str = Field("", description="How their answer speed has changed")
    skip_behavior: str = Field("", description="Which topics they skip and how often")
    revision_behavior: str = Field("", description="How often they change answers")
    engagement_level: str = Field("", description="Overall engagement with check-ins")


class TopicBreakdownResponse(BaseModel):
    """Detailed breakdown for a single topic."""
    topic: str
    status: str = Field(..., description="stable / elevated / strongly_elevated / improving")
    detail: str = Field("", description="How this topic compares to their baseline")
    trend: str = Field("stable", description="improving / worsening / stable")
    counselor_note: str = Field("", description="What to be aware of for this topic")


class CounselorCaseReportResponse(BaseModel):
    """Full counselor case report — the complete dashboard view."""
    survivor_id: UUID

    # Overall
    overall_status: str = Field("", description="Concise overall assessment")
    risk_level_plain_language: str = Field("unknown", description="low / moderate / elevated / high / critical")

    # Answering patterns
    answering_patterns: AnsweringPatternsResponse = Field(default_factory=AnsweringPatternsResponse)

    # Topic-by-topic
    topic_breakdown: list[TopicBreakdownResponse] = Field(default_factory=list)

    # Trend
    trend_history: str = Field("", description="How patterns changed over time")

    # Key insights
    key_patterns: list[str] = Field(default_factory=list, description="Most notable behavioral patterns")
    protective_factors: list[str] = Field(default_factory=list, description="Positive or stable patterns")
    recommended_focus_areas: list[str] = Field(default_factory=list, description="What to explore in conversation")
    conversation_starters: list[str] = Field(default_factory=list, description="Trauma-informed opening questions")
    important_context: str = Field("", description="Additional context for the counselor")

    # Metadata
    provider: str = Field("rule_based", description="Which provider generated this report")
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ─── Sync ─────────────────────────────────────────────────────────────────────

class SyncResponse(BaseModel):
    """Result of a sync batch."""
    synced: int = 0
    failed: int = 0
    conflicts: list[dict[str, Any]] = Field(default_factory=list)
    server_timestamp: datetime


# Rebuild to resolve forward references
TrendResponse.model_rebuild()
CounselorCaseSummary.model_rebuild()
CheckinSubmissionResponse.model_rebuild()
