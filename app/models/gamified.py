"""SQLAlchemy models for the Gamified Veteran Wellness System.

Extends the trauma-backend with:
- Daily tasks (mental + physical) with point rewards
- GPS tracking for physical tasks (walking, outdoor activities)
- Veteran groups for social activities and group tasks
- Points ledger and rewards system
- Social interaction tracking
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
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class TaskType(str, PyEnum):
    MENTAL = "mental"
    PHYSICAL = "physical"
    SOCIAL = "social"


class TaskStatus(str, PyEnum):
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class GroupRole(str, PyEnum):
    MEMBER = "member"
    ADMIN = "admin"


class InteractionType(str, PyEnum):
    GROUP_ACTIVITY = "group_activity"
    ONE_ON_ONE = "one_on_one"
    CHECK_IN = "check_in"
    ENCOURAGEMENT = "encouragement"


# ─── Veteran Profile (extends SurvivorProfile) ────────────────────────────────

class VeteranProfile(Base):
    """Extended veteran profile with military background and app preferences."""
    __tablename__ = "veteran_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survivor_id = Column(UUID(as_uuid=True), ForeignKey("survivor_profiles.id"), nullable=False, unique=True)

    # Military background
    service_branch = Column(String(50), nullable=True)  # Army, Navy, Marines, Air Force, Coast Guard
    rank = Column(String(50), nullable=True)
    years_of_service = Column(Integer, nullable=True)
    deployment_count = Column(Integer, default=0)

    # App preferences
    gps_enabled = Column(Boolean, default=True)
    notifications_enabled = Column(Boolean, default=True)
    daily_task_reminder_hour = Column(Integer, default=9)  # Local hour to send reminder

    # Gamification stats
    total_points = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)  # Consecutive days with tasks completed
    longest_streak = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    groups_joined = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    survivor = relationship("SurvivorProfile")
    tasks = relationship("DailyTask", back_populates="veteran", cascade="all, delete-orphan")
    gps_tracks = relationship("GPSTrack", back_populates="veteran", cascade="all, delete-orphan")
    group_memberships = relationship("GroupMembership", back_populates="veteran", cascade="all, delete-orphan")
    points_entries = relationship("PointsLedger", back_populates="veteran", cascade="all, delete-orphan")
    social_interactions = relationship("SocialInteraction", back_populates="veteran",
                                       foreign_keys="SocialInteraction.veteran_id",
                                       cascade="all, delete-orphan")


# ─── Daily Tasks ──────────────────────────────────────────────────────────────

class DailyTask(Base):
    """Daily wellness task assigned to a veteran.

    Tasks are either mental (cognitive exercises, journaling, breathing)
    or physical (walking, stretching, outdoor activities).
    Each task has a point value and optional GPS requirement.
    """
    __tablename__ = "daily_tasks"
    __table_args__ = (
        Index("ix_task_veteran_date", "veteran_id", "assigned_date"),
        Index("ix_task_status", "status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    veteran_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)

    # Task details
    task_type = Column(Enum(TaskType), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    instructions = Column(Text, nullable=True)  # Step-by-step instructions
    points = Column(Integer, default=10)  # Points awarded on completion

    # Scheduling
    assigned_date = Column(DateTime(timezone=True), nullable=False)  # The day this task is for
    due_date = Column(DateTime(timezone=True), nullable=True)  # Optional deadline

    # Status tracking
    status = Column(Enum(TaskStatus), default=TaskStatus.ASSIGNED)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # GPS requirement for physical tasks
    gps_required = Column(Boolean, default=False)
    gps_target_distance_meters = Column(Integer, nullable=True)  # Target distance in meters
    gps_min_duration_seconds = Column(Integer, nullable=True)  # Minimum duration in seconds

    # Task metadata
    difficulty = Column(Integer, default=1)  # 1-3 scale
    category = Column(String(50), nullable=True)  # e.g., "walking", "meditation", "journaling"

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    veteran = relationship("VeteranProfile", back_populates="tasks")
    gps_tracks = relationship("GPSTrack", back_populates="task", cascade="all, delete-orphan")

    # Template reference (for generating similar tasks)
    task_template_id = Column(UUID(as_uuid=True), nullable=True)


class TaskTemplate(Base):
    """Template for generating daily tasks.

    Templates define the types of tasks that can be assigned.
    The task engine selects appropriate templates based on veteran preferences
    and progress.
    """
    __tablename__ = "task_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    task_type = Column(Enum(TaskType), nullable=False)
    title_template = Column(String(200), nullable=False)  # e.g., "Walk {distance} meters"
    description_template = Column(Text, nullable=False)
    instructions_template = Column(Text, nullable=True)

    # Point values by difficulty
    base_points = Column(Integer, default=10)
    difficulty = Column(Integer, default=1)

    # GPS settings for physical tasks
    gps_required = Column(Boolean, default=False)
    default_distance_meters = Column(Integer, nullable=True)
    default_duration_seconds = Column(Integer, nullable=True)

    # Category and tags
    category = Column(String(50), nullable=True)
    tags = Column(JSON, default=list)  # ["walking", "outdoor", "easy"]

    # Eligibility
    min_streak = Column(Integer, default=0)  # Minimum streak to unlock
    min_total_tasks = Column(Integer, default=0)  # Minimum tasks completed

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ─── GPS Tracking ─────────────────────────────────────────────────────────────

class GPSTrack(Base):
    """GPS tracking data for physical task verification.

    Records location points during physical activities to verify
    task completion (e.g., did the veteran actually walk 1km?).
    """
    __tablename__ = "gps_tracks"
    __table_args__ = (
        Index("ix_gps_veteran_time", "veteran_id", "recorded_at"),
        Index("ix_gps_task", "task_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    veteran_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("daily_tasks.id"), nullable=True)

    # Location data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, nullable=True)
    accuracy_meters = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)  # m/s

    # Activity context
    activity_type = Column(String(50), nullable=True)  # "walking", "running", "cycling"
    is_start_point = Column(Boolean, default=False)
    is_end_point = Column(Boolean, default=False)

    recorded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    veteran = relationship("VeteranProfile", back_populates="gps_tracks")
    task = relationship("DailyTask", back_populates="gps_tracks")


class GPSSummary(Base):
    """Aggregated GPS summary for a completed physical task.

    Computed after task completion from the individual GPSTrack points.
    """
    __tablename__ = "gps_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    veteran_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("daily_tasks.id"), nullable=False, unique=True)

    # Computed metrics
    total_distance_meters = Column(Float, default=0.0)
    total_duration_seconds = Column(Integer, default=0)
    average_speed_ms = Column(Float, nullable=True)
    point_count = Column(Integer, default=0)

    # Route data (simplified for display)
    start_latitude = Column(Float, nullable=True)
    start_longitude = Column(Float, nullable=True)
    end_latitude = Column(Float, nullable=True)
    end_longitude = Column(Float, nullable=True)

    # Verification
    gps_target_met = Column(Boolean, default=False)  # Did they meet the target?
    verified_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


# ─── Veteran Groups ──────────────────────────────────────────────────────────

class VeteranGroup(Base):
    """Group of veterans for social activities and group tasks.

    Groups can have scheduled activities and group challenges.
    """
    __tablename__ = "veteran_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)

    # Group settings
    max_members = Column(Integer, default=10)
    is_public = Column(Boolean, default=True)  # Can others discover and join?
    activity_schedule = Column(JSON, nullable=True)  # {"days": ["mon", "wed"], "time": "10:00"}

    # Group stats
    member_count = Column(Integer, default=0)
    total_group_points = Column(Integer, default=0)
    activities_completed = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete-orphan")
    activities = relationship("GroupActivity", back_populates="group", cascade="all, delete-orphan")


class GroupMembership(Base):
    """Links veterans to groups with roles."""
    __tablename__ = "group_memberships"
    __table_args__ = (
        UniqueConstraint("group_id", "veteran_id", name="uq_group_veteran"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("veteran_groups.id"), nullable=False)
    veteran_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)
    role = Column(Enum(GroupRole), default=GroupRole.MEMBER)

    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_active = Column(Boolean, default=True)

    # Relationships
    group = relationship("VeteranGroup", back_populates="memberships")
    veteran = relationship("VeteranProfile", back_populates="group_memberships")


class GroupActivity(Base):
    """Scheduled group activity or challenge."""
    __tablename__ = "group_activities"
    __table_args__ = (
        Index("ix_group_activity_date", "group_id", "scheduled_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("veteran_groups.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)

    # Activity details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    activity_type = Column(Enum(TaskType), nullable=False)
    points_per_participant = Column(Integer, default=20)

    # Scheduling
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    duration_minutes = Column(Integer, default=60)
    location = Column(String(200), nullable=True)  # Meeting point description
    location.latitude = Column(Float, nullable=True)
    location.longitude = Column(Float, nullable=True)

    # Status
    status = Column(String(20), default="scheduled")  # scheduled, active, completed, cancelled
    participants_count = Column(Integer, default=0)
    completed_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    group = relationship("VeteranGroup", back_populates="activities")
    participants = relationship("GroupActivityParticipant", back_populates="activity",
                                cascade="all, delete-orphan")


class GroupActivityParticipant(Base):
    """Tracks individual participation in group activities."""
    __tablename__ = "group_activity_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    activity_id = Column(UUID(as_uuid=True), ForeignKey("group_activities.id"), nullable=False)
    veteran_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)

    # Participation tracking
    status = Column(String(20), default="registered")  # registered, attended, completed, no_show
    joined_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime(timezone=True), nullable=True)
    points_earned = Column(Integer, default=0)

    # Relationships
    activity = relationship("GroupActivity", back_populates="participants")
    veteran = relationship("VeteranProfile")


class GroupMessage(Base):
    """Squad cheer board / peer encouragement messages."""
    __tablename__ = "group_messages"
    __table_args__ = (
        Index("ix_group_message_time", "group_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("veteran_groups.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)
    sender_name = Column(String(100), default="Comrade")
    sender_rank = Column(String(50), default="Soldier")
    message = Column(Text, nullable=False)
    cheer_type = Column(String(30), default="cheer")
    likes_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    group = relationship("VeteranGroup")
    sender = relationship("VeteranProfile")


# ─── Points & Rewards ─────────────────────────────────────────────────────────

class PointsLedger(Base):
    """Append-only ledger of all points earned by veterans.

    Every point event is recorded here for transparency and admin review.
    """
    __tablename__ = "points_ledger"
    __table_args__ = (
        Index("ix_points_veteran_time", "veteran_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    veteran_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)

    points = Column(Integer, nullable=False)  # Positive = earned, negative = deducted
    reason = Column(String(200), nullable=False)  # e.g., "Completed daily walk", "Group activity bonus"
    category = Column(String(50), nullable=True)  # "task_completion", "streak_bonus", "group_activity"

    # Reference to what earned the points
    task_id = Column(UUID(as_uuid=True), ForeignKey("daily_tasks.id"), nullable=True)
    group_activity_id = Column(UUID(as_uuid=True), ForeignKey("group_activities.id"), nullable=True)

    # Running total at time of entry (for efficient queries)
    running_total = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    veteran = relationship("VeteranProfile", back_populates="points_entries")


class RewardTier(Base):
    """Reward tiers that veterans can unlock with points."""
    __tablename__ = "reward_tiers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)  # e.g., "Bronze Warrior", "Silver Guardian"
    description = Column(Text, nullable=True)
    points_required = Column(Integer, nullable=False)
    badge_icon = Column(String(100), nullable=True)  # Icon reference
    badge_color = Column(String(20), nullable=True)  # Hex color

    # Rewards
    reward_type = Column(String(50), nullable=True)  # "badge", "feature_unlock", "recognition"
    reward_data = Column(JSON, nullable=True)  # Additional reward details

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class VeteranReward(Base):
    """Tracks which rewards a veteran has earned."""
    __tablename__ = "veteran_rewards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    veteran_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)
    reward_id = Column(UUID(as_uuid=True), ForeignKey("reward_tiers.id"), nullable=False)

    earned_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_displayed = Column(Boolean, default=True)  # Can veteran hide badge?

    __table_args__ = (
        UniqueConstraint("veteran_id", "reward_id", name="uq_veteran_reward"),
    )


# ─── Social Interactions ──────────────────────────────────────────────────────

class SocialInteraction(Base):
    """Tracks social interactions between veterans.

    This helps monitor social engagement and connection,
    which is a key factor in veteran wellness.
    """
    __tablename__ = "social_interactions"
    __table_args__ = (
        Index("ix_social_veteran_time", "veteran_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    veteran_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=False)
    other_veteran_id = Column(UUID(as_uuid=True), ForeignKey("veteran_profiles.id"), nullable=True)

    interaction_type = Column(Enum(InteractionType), nullable=False)
    group_id = Column(UUID(as_uuid=True), ForeignKey("veteran_groups.id"), nullable=True)
    group_activity_id = Column(UUID(as_uuid=True), ForeignKey("group_activities.id"), nullable=True)

    # Interaction details
    duration_minutes = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)  # Optional notes from the veteran
    mood_before = Column(Integer, nullable=True)  # 1-4 scale
    mood_after = Column(Integer, nullable=True)  # 1-4 scale

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    veteran = relationship("VeteranProfile", back_populates="social_interactions",
                           foreign_keys=[veteran_id])


# ─── Admin Analytics ──────────────────────────────────────────────────────────

class AdminDashboard(Base):
    """Aggregated analytics for admin review.

    This view provides admins with insights into:
    - Overall veteran engagement
    - Task completion rates
    - Group activity participation
    - Wellness trends across the population
    - GPS activity patterns
    """
    __tablename__ = "admin_dashboard"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Time period
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)

    # Engagement metrics
    total_veterans = Column(Integer, default=0)
    active_veterans = Column(Integer, default=0)  # Active in last 7 days
    new_veterans = Column(Integer, default=0)

    # Task metrics
    total_tasks_assigned = Column(Integer, default=0)
    total_tasks_completed = Column(Integer, default=0)
    mental_task_completion_rate = Column(Float, default=0.0)
    physical_task_completion_rate = Column(Float, default=0.0)
    average_points_per_veteran = Column(Float, default=0.0)

    # Social metrics
    total_groups = Column(Integer, default=0)
    active_groups = Column(Integer, default=0)
    total_group_activities = Column(Integer, default=0)
    average_group_size = Column(Float, default=0.0)

    # Wellness metrics
    average_wellness_score = Column(Float, default=0.0)  # Derived from check-ins
    improvement_rate = Column(Float, default=0.0)  # % of veterans showing improvement

    # GPS metrics
    total_distance_walked_km = Column(Float, default=0.0)
    average_activity_duration_minutes = Column(Float, default=0.0)

    computed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class DailyAdminSnapshot(Base):
    """Daily snapshot of key metrics for trend analysis."""
    __tablename__ = "daily_admin_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_date = Column(DateTime(timezone=True), nullable=False, unique=True)

    # Daily metrics
    active_veterans = Column(Integer, default=0)
    tasks_assigned = Column(Integer, default=0)
    tasks_completed = Column(Integer, default=0)
    new_checkins = Column(Integer, default=0)
    group_activities = Column(Integer, default=0)
    total_points_earned = Column(Integer, default=0)
    gps_tracks_recorded = Column(Integer, default=0)
    total_distance_km = Column(Float, default=0.0)
    social_interactions = Column(Integer, default=0)

    # Wellness snapshot
    average_mood_score = Column(Float, nullable=True)
    average_ptsd_score = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
