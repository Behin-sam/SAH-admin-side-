"""Request schemas for all API endpoints.

These are the JSON contracts that frontend devs build against.
Every field is documented with descriptions that become OpenAPI docs.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ─── Survivor ─────────────────────────────────────────────────────────────────

class SurvivorCreate(BaseModel):
    """Create a new survivor profile."""
    name: str = Field(..., description="Survivor's display name (encrypted at rest)")
    email: str | None = Field(None, description="Optional contact email (encrypted at rest)")
    phone: str | None = Field(None, description="Optional phone number (encrypted at rest)")
    preferred_language: str = Field("en", description="ISO language code")
    timezone_offset: str = Field("UTC", description="e.g. '+05:30', 'UTC'")

    model_config = {"json_schema_extra": {
        "example": {
            "name": "Jane",
            "email": None,
            "phone": "+1234567890",
            "preferred_language": "en",
            "timezone_offset": "+05:30",
        }
    }}


# ─── Consent ──────────────────────────────────────────────────────────────────

class ConsentToggle(BaseModel):
    """Toggle consent for a specific signal type."""
    signal_type: str = Field(..., description="One of: time_to_answer, skip_rate, answer_revision, voice_pitch, voice_pace, voice_pauses")
    active: bool = Field(..., description="true to grant, false to revoke")


# ─── Intake ───────────────────────────────────────────────────────────────────

class IntakeAnswer(BaseModel):
    """Single answer in the intake form."""
    question_id: UUID
    response_text: str | None = Field(None, description="Free-text answer (encrypted before storage)")
    response_option: str | None = Field(None, description="Selected option for multiple-choice")


class IntakeSubmission(BaseModel):
    """Submit all intake answers at once (15-20 questions)."""
    session_id: UUID = Field(..., description="Client-generated session ID for idempotency")
    answers: list[IntakeAnswer] = Field(..., min_length=1, max_length=25)


# ─── Check-in ─────────────────────────────────────────────────────────────────

class CheckinAnswer(BaseModel):
    """Single answer in a 5-question check-in."""
    question_id: UUID
    response_text: str | None = Field(None, description="Free-text answer")
    response_option: str | None = Field(None, description="Selected option")
    time_to_answer_seconds: float | None = Field(None, description="How long the survivor took to answer (seconds)")
    was_skipped: bool = Field(False, description="Whether the survivor skipped this question")
    revision_count: int = Field(0, ge=0, description="How many times the answer was changed")


class ReactionSignalInput(BaseModel):
    """Reaction signals captured during a check-in session."""
    time_to_answer_avg: float | None = Field(None, description="Average time-to-answer across all questions in the session")
    skip_count: int = Field(0, ge=0, description="Total questions skipped in the session")
    total_questions: int = Field(5, ge=1, description="Total questions in the session")
    revision_total: int = Field(0, ge=0, description="Total answer revisions in the session")

    # Voice features (optional, opt-in)
    voice_pitch_variability: float | None = Field(None, description="Hz standard deviation of pitch")
    voice_pace: float | None = Field(None, description="Syllables per second")
    voice_pause_duration: float | None = Field(None, description="Average pause duration in seconds")


class CheckinSubmission(BaseModel):
    """Submit a complete check-in (5 questions + reaction signals)."""
    session_id: UUID = Field(..., description="Client-generated session ID for idempotency")
    answers: list[CheckinAnswer] = Field(..., min_length=1, max_length=10)
    reaction_signals: ReactionSignalInput
    started_at: datetime = Field(..., description="When the check-in was started (ISO 8601)")
    completed_at: datetime | None = Field(None, description="When the check-in was completed")


# ─── Counselor ────────────────────────────────────────────────────────────────

class CaseAssignment(BaseModel):
    """Assign a counselor to a survivor case."""
    counselor_id: UUID
    survivor_id: UUID


class CaseNoteUpdate(BaseModel):
    """Add or update case notes on an alert."""
    case_notes: str = Field(..., min_length=1, max_length=5000)


class AlertAcknowledge(BaseModel):
    """Acknowledge an alert."""
    case_notes: str | None = Field(None, max_length=5000)


# ─── Sync ─────────────────────────────────────────────────────────────────────

class SyncPayload(BaseModel):
    """Offline sync batch — multiple operations from one device."""
    device_id: str | None = Field(None, description="Device identifier for conflict resolution")
    operations: list[SyncOperation] = Field(..., min_length=1, max_length=50)


class SyncOperation(BaseModel):
    """Single sync operation within a batch."""
    operation: str = Field(..., description="e.g. 'create_checkin', 'create_signal', 'update_consent'")
    payload: dict = Field(..., description="The operation data")
    client_timestamp: datetime = Field(..., description="When this was created on the client")


# Rebuild to resolve forward references
SyncPayload.model_rebuild()
