"""Response schemas for all API endpoints.

These define the exact JSON shape the frontend receives.
Every response is filtered through access_control.filter_for_role()
before being returned, so counselors never see raw response text.
"""

from __future__ import annotations

from datetime import datetime
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
