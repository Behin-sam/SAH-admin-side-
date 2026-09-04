"""SQLAlchemy models for the trauma-informed support system.

Schema design decisions:
- UUIDs as primary keys: prevents enumeration attacks and works well with
  offline-first sync (no collision risk across devices).
- All timestamps are UTC with timezone awareness.
- Sensitive fields use LargeBinary for encrypted storage.
- Consent is per-signal-type, not a single flag — survivors can opt in/out
  of voice processing independently from answering questions.
- risk_trajectory_log is append-only (audit trail).
- Response text is stored encrypted; derived signals are stored plaintext
  for query performance. Counselor queries never touch encrypted columns.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class ConsentStatus(str, PyEnum):
    ACTIVE = "active"
    REVOKED = "revoked"
    NEVER_GRANTED = "never_granted"


class SignalType(str, PyEnum):
    TIME_TO_ANSWER = "time_to_answer"
    SKIP_RATE = "skip_rate"
    ANSWER_REVISION = "answer_revision"
    VOICE_PITCH = "voice_pitch"
    VOICE_PACE = "voice_pace"
    VOICE_PAUSES = "voice_pauses"


class TrajectoryLabel(str, PyEnum):
    STABLE = "stable"
    DECLINING = "declining"
    ESCALATING = "escalating"
    ACUTE = "acute"


class AlertStatus(str, PyEnum):
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledGED"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


# ─── Models ───────────────────────────────────────────────────────────────────

class SurvivorProfile(Base):
    """Core survivor record. PII fields are encrypted at rest."""
    __tablename__ = "survivor_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Encrypted PII
    encrypted_name = Column(LargeBinary, nullable=True)
    encrypted_email = Column(LargeBinary, nullable=True)
    encrypted_phone = Column(LargeBinary, nullable=True)

    # Non-PII metadata (safe for counselors to see)
    preferred_language = Column(String(10), default="en")
    timezone_offset = Column(String(10), default="UTC")
    baseline_established = Column(Boolean, default=False)
    baseline_period_end = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    consents = relationship("ConsentState", back_populates="survivor", cascade="all, delete-orphan")
    intake_responses = relationship("IntakeResponse", back_populates="survivor", cascade="all, delete-orphan")
    checkin_responses = relationship("CheckinResponse", back_populates="survivor", cascade="all, delete-orphan")
    reaction_signals = relationship("ReactionSignal", back_populates="survivor", cascade="all, delete-orphan")
    risk_logs = relationship("RiskTrajectoryLog", back_populates="survivor", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="survivor", cascade="all, delete-orphan")
    case_assignments = relationship("CounselorCaseAssignment", back_populates="survivor", cascade="all, delete-orphan")


class ConsentState(Base):
    """Per-signal-type consent, revocable at any time.

    Each row is one signal type for one survivor. Toggling consent off
    stops future collection; historical data remains until the survivor
    requests deletion.
    """
    __tablename__ = "consent_states"
    __table_args__ = (
        UniqueConstraint("survivor_id", "signal_type", name="uq_consent_survivor_signal"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survivor_id = Column(UUID(as_uuid=True), ForeignKey("survivor_profiles.id"), nullable=False)
    signal_type = Column(Enum(SignalType), nullable=False)
    status = Column(Enum(ConsentStatus), default=ConsentStatus.NEVER_GRANTED)
    granted_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    consent_version = Column(Integer, default=1)  # Bump on each consent change
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    survivor = relationship("SurvivorProfile", back_populates="consents")


class QuestionBank(Base):
    """Question library with topic tags for sensitivity mapping.

    Questions are tagged by topic (e.g., "sleep", "safety", "self_harm")
    so the system can map which topics activate strong reactions.
    """
    __tablename__ = "question_bank"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    text = Column(Text, nullable=False)
    topic_tags = Column(JSONB, default=list)  # ["sleep", "safety", "food"]
    is_intake = Column(Boolean, default=False)  # True = part of initial 15-20 questions
    is_checkin = Column(Boolean, default=False) # True = part of 5-question rotating check-in
    is_active = Column(Boolean, default=True)   # Soft-delete for question lifecycle
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    intake_responses = relationship("IntakeResponse", back_populates="question")
    checkin_responses = relationship("CheckinResponse", back_populates="question")


class IntakeResponse(Base):
    """Initial 15-20 question intake responses (one-time per survivor)."""
    __tablename__ = "intake_responses"
    __table_args__ = (
        Index("ix_intake_survivor", "survivor_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survivor_id = Column(UUID(as_uuid=True), ForeignKey("survivor_profiles.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("question_bank.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), nullable=False)  # Groups answers from one intake session

    # Response (encrypted — raw text never visible to counselors)
    encrypted_response_text = Column(LargeBinary, nullable=True)
    response_option = Column(String(100), nullable=True)  # For multiple-choice

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    survivor = relationship("SurvivorProfile", back_populates="intake_responses")
    question = relationship("QuestionBank", back_populates="intake_responses")


class CheckinResponse(Base):
    """Rotating 5-question check-in responses (time series).

    Each row is one question answer in one check-in session.
    Multiple rows with the same session_id = one complete check-in.
    """
    __tablename__ = "checkin_responses"
    __table_args__ = (
        Index("ix_checkin_survivor_time", "survivor_id", "completed_at"),
        Index("ix_checkin_session", "session_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survivor_id = Column(UUID(as_uuid=True), ForeignKey("survivor_profiles.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("question_bank.id"), nullable=False)
    session_id = Column(UUID(as_uuid=True), nullable=False)  # Groups answers from one check-in

    # Response
    encrypted_response_text = Column(LargeBinary, nullable=True)
    response_option = Column(String(100), nullable=True)

    # Completion tracking
    started_at = Column(DateTime(timezone=True), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    was_skipped = Column(Boolean, default=False)
    revision_count = Column(Integer, default=0)  # How many times they changed their answer

    survivor = relationship("SurvivorProfile", back_populates="checkin_responses")
    question = relationship("QuestionBank", back_populates="checkin_responses")


class ReactionSignal(Base):
    """Reaction signals captured alongside check-in answers.

    These are the raw behavioral signals that get aggregated into
    the survivor's personal baseline. Stored separately from responses
    for clean separation of concerns.

    Columns for voice features are nullable — only populated if the
    survivor has opted in to voice processing.
    """
    __tablename__ = "reaction_signals"
    __table_args__ = (
        Index("ix_signal_survivor_time", "survivor_id", "recorded_at"),
        Index("ix_signal_checkin_session", "checkin_session_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survivor_id = Column(UUID(as_uuid=True), ForeignKey("survivor_profiles.id"), nullable=False)
    checkin_session_id = Column(UUID(as_uuid=True), nullable=False)

    # Time-to-answer (seconds)
    time_to_answer = Column(Float, nullable=True)

    # Skip tracking
    was_skipped = Column(Boolean, default=False)
    skip_count_in_session = Column(Integer, default=0)

    # Answer revision tracking
    revision_count = Column(Integer, default=0)

    # Voice prosody features (nullable — opt-in only)
    voice_pitch_variability = Column(Float, nullable=True)  # Hz std dev
    voice_pace = Column(Float, nullable=True)               # syllables/second
    voice_pause_duration = Column(Float, nullable=True)     # avg pause in seconds
    voice_audio_url = Column(String(500), nullable=True)    # pointer to storage

    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    survivor = relationship("SurvivorProfile", back_populates="reaction_signals")


class RiskTrajectoryLog(Base):
    """Append-only log of computed risk trajectories.

    Each entry represents a point-in-time assessment of the survivor's
    trajectory. This is the "memory" the system has — it never modifies
    historical trajectory entries.
    """
    __tablename__ = "risk_trajectory_log"
    __table_args__ = (
        Index("ix_risk_survivor_time", "survivor_id", "computed_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survivor_id = Column(UUID(as_uuid=True), ForeignKey("survivor_profiles.id"), nullable=False)

    trajectory_label = Column(Enum(TrajectoryLabel), nullable=False)
    severity_score = Column(Float, nullable=False)          # 0.0 - 1.0
    confidence = Column(Float, nullable=False)               # 0.0 - 1.0

    # Explainability: which features/questions contributed most
    contributing_features = Column(JSONB, default=list)
    contributing_topics = Column(JSONB, default=list)
    z_scores = Column(JSONB, default=dict)                   # Per-metric z-scores
    trend_summary = Column(Text, nullable=True)              # Human-readable summary

    computed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    survivor = relationship("SurvivorProfile", back_populates="risk_logs")


class CounselorCaseAssignment(Base):
    """Links counselors to survivor cases."""
    __tablename__ = "counselor_case_assignments"
    __table_args__ = (
        UniqueConstraint("counselor_id", "survivor_id", name="uq_counselor_survivor"),
        Index("ix_case_counselor", "counselor_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    counselor_id = Column(UUID(as_uuid=True), nullable=False)  # References a user table in production
    survivor_id = Column(UUID(as_uuid=True), ForeignKey("survivor_profiles.id"), nullable=False)

    assigned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    survivor = relationship("SurvivorProfile", back_populates="case_assignments")


class Alert(Base):
    """Alerts triggered by escalating/acute trajectories.

    Alerts are created by the escalation engine and acknowledged by
    counselors. The alert payload contains a trend summary and
    explainability context — never raw scores or raw response text.
    """
    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alert_counselor_status", "counselor_id", "status"),
        Index("ix_alert_survivor", "survivor_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survivor_id = Column(UUID(as_uuid=True), ForeignKey("survivor_profiles.id"), nullable=False)
    counselor_id = Column(UUID(as_uuid=True), nullable=False)

    # Alert content — these are derived/safe for counselors
    status = Column(Enum(AlertStatus), default=AlertStatus.PENDING)
    alert_type = Column(String(50), nullable=False)           # "escalating" / "acute"
    trend_summary = Column(Text, nullable=False)              # Human-readable
    contributing_topics = Column(JSONB, default=list)         # e.g. ["sleep", "safety"]
    severity_score = Column(Float, nullable=False)

    # Counselor response
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    case_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    survivor = relationship("SurvivorProfile", back_populates="alerts")
