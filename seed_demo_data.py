"""Seed script: Initialize demo data for SAH (Veterans, Counselor, Tasks, Groups, Questions)."""

import asyncio
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import select
from app.database import async_session_factory, engine, Base
from app.models import (
    SurvivorProfile,
    CounselorCaseAssignment,
    QuestionBank,
    RiskTrajectoryLog,
    Alert,
    AlertStatus,
    TrajectoryLabel,
)
from app.models.gamified import (
    VeteranProfile,
    DailyTask,
    VeteranGroup,
    GroupMembership,
    PointsLedger,
    TaskStatus,
    TaskType,
    RewardTier,
)
from app.models.chat import ChatConversation, ChatMessage
from seed_questions import seed_question_bank


VET_1_ID = uuid.UUID("550e8400-e29b-41d4-a716-446655440001")
VET_2_ID = uuid.UUID("550e8400-e29b-41d4-a716-446655440002")
VET_3_ID = uuid.UUID("550e8400-e29b-41d4-a716-446655440003")

COUNSELOR_ID = uuid.UUID("c0000000-0000-0000-0000-000000000001")


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Seed Question Bank
    await seed_question_bank()

    async with async_session_factory() as session:

        # 2. Check if veterans already exist
        vet_check = await session.execute(select(VeteranProfile).where(VeteranProfile.id == VET_1_ID))
        if vet_check.scalar_one_or_none():
            print("Demo veterans already seeded!")
            return

        print("Seeding demo veterans, counselor, tasks, and groups...")

        # Create SurvivorProfiles
        v1_survivor = SurvivorProfile(
            id=VET_1_ID,
            preferred_language="Capt. Vikram Rathore",
            timezone_offset="+05:30",
            baseline_established=True,
        )
        v2_survivor = SurvivorProfile(
            id=VET_2_ID,
            preferred_language="Maj. Kabir Singh",
            timezone_offset="+05:30",
            baseline_established=True,
        )
        v3_survivor = SurvivorProfile(
            id=VET_3_ID,
            preferred_language="Sub. Arjun Das",
            timezone_offset="+05:30",
            baseline_established=False,
        )
        session.add_all([v1_survivor, v2_survivor, v3_survivor])
        await session.flush()

        # Create VeteranProfiles
        v1 = VeteranProfile(
            id=VET_1_ID,
            survivor_id=VET_1_ID,
            service_branch="Indian Army (Para SF)",
            rank="Captain",
            years_of_service=12,
            total_points=250,
            current_streak=5,
            longest_streak=14,
            tasks_completed=12,
            gps_enabled=True,
            notifications_enabled=True,
        )
        v2 = VeteranProfile(
            id=VET_2_ID,
            survivor_id=VET_2_ID,
            service_branch="Indian Air Force",
            rank="Major",
            years_of_service=15,
            total_points=420,
            current_streak=12,
            longest_streak=18,
            tasks_completed=24,
            gps_enabled=True,
            notifications_enabled=True,
        )
        v3 = VeteranProfile(
            id=VET_3_ID,
            survivor_id=VET_3_ID,
            service_branch="Indian Navy (MARCOS)",
            rank="Subedar",
            years_of_service=8,
            total_points=180,
            current_streak=3,
            longest_streak=7,
            tasks_completed=8,
            gps_enabled=False,
            notifications_enabled=True,
        )
        session.add_all([v1, v2, v3])

        # Create Counselor Case Assignments
        c1 = CounselorCaseAssignment(
            counselor_id=COUNSELOR_ID,
            survivor_id=VET_1_ID,
            is_active=True,
        )
        c2 = CounselorCaseAssignment(
            counselor_id=COUNSELOR_ID,
            survivor_id=VET_2_ID,
            is_active=True,
        )
        c3 = CounselorCaseAssignment(
            counselor_id=COUNSELOR_ID,
            survivor_id=VET_3_ID,
            is_active=True,
        )
        session.add_all([c1, c2, c3])

        # Create Groups
        g1 = VeteranGroup(
            name="Morning Walkers",
            description="Daily early morning brisk walk & endurance squad.",
            created_by=VET_1_ID,
            member_count=8,
            total_group_points=450,
        )
        g2 = VeteranGroup(
            name="Tactical Mindfulness Circle",
            description="Evening peer meditation, grounding & decompression.",
            created_by=VET_1_ID,
            member_count=12,
            total_group_points=680,
        )
        g3 = VeteranGroup(
            name="Peer Brotherhood Network",
            description="Veterans supporting veterans — weekly casual check-in coffee & tea.",
            created_by=VET_1_ID,
            member_count=15,
            total_group_points=520,
        )
        session.add_all([g1, g2, g3])
        await session.flush()

        # Memberships for V1
        session.add(GroupMembership(group_id=g1.id, veteran_id=VET_1_ID, role="member", is_active=True))
        session.add(GroupMembership(group_id=g2.id, veteran_id=VET_1_ID, role="member", is_active=True))
        session.add(GroupMembership(group_id=g1.id, veteran_id=VET_2_ID, role="member", is_active=True))

        # Create Tasks for V1
        now = datetime.now(timezone.utc)
        t1 = DailyTask(
            veteran_id=VET_1_ID,
            title="5-4-3-2-1 Grounding Technique",
            description="Practice the 5-4-3-2-1 senses check during anxiety or flashbacks.",
            instructions="Name 5 things you can see, 4 touch, 3 hear, 2 smell, 1 taste.",
            task_type=TaskType.MENTAL,
            category="grounding",
            points=15,
            difficulty=1,
            status=TaskStatus.COMPLETED,
            assigned_date=now,
            completed_at=now - timedelta(hours=2),
            gps_required=False,
        )
        t2 = DailyTask(
            veteran_id=VET_1_ID,
            title="Cognitive Reframing Exercise",
            description="Challenge a negative thought pattern by writing it down and reframing it.",
            instructions="Write the thought down, examine supporting evidence, and draft a balanced view.",
            task_type=TaskType.MENTAL,
            category="cognitive",
            points=20,
            difficulty=2,
            status=TaskStatus.IN_PROGRESS,
            assigned_date=now,
            gps_required=False,
        )
        t3 = DailyTask(
            veteran_id=VET_1_ID,
            title="Brisk 30-Minute Walk or Run",
            description="Go for a brisk 30-minute walk or run to boost endorphins.",
            instructions="Maintain steady pace outdoors. GPS tracking verifies route.",
            task_type=TaskType.PHYSICAL,
            category="cardio",
            points=25,
            difficulty=2,
            status=TaskStatus.ASSIGNED,
            assigned_date=now,
            gps_required=True,
            gps_target_distance_meters=2500,
            gps_min_duration_seconds=1800,
        )
        t4 = DailyTask(
            veteran_id=VET_1_ID,
            title="VA / Vet Center Peer Support Group",
            description="Join a peer support group to connect with comrades.",
            instructions="Connect via virtual or physical chapter meeting.",
            task_type=TaskType.SOCIAL,
            category="peer_support",
            points=30,
            difficulty=2,
            status=TaskStatus.ASSIGNED,
            assigned_date=now,
            gps_required=False,
        )
        t5 = DailyTask(
            veteran_id=VET_1_ID,
            title="Box Breathing (5 min)",
            description="Inhale 4s, hold 4s, exhale 4s, hold 4s to regulate parasympathetic tone.",
            instructions="Repeat 4 cycles. Focus on calm chest and relaxed shoulders.",
            task_type=TaskType.MENTAL,
            category="breathing",
            points=10,
            difficulty=1,
            status=TaskStatus.ASSIGNED,
            assigned_date=now,
            gps_required=False,
        )
        session.add_all([t1, t2, t3, t4, t5])

        # Add sample Alert for counselor
        session.add(Alert(
            survivor_id=VET_1_ID,
            counselor_id=COUNSELOR_ID,
            alert_type="stable",
            trend_summary="Stable baseline maintained over past 7 days.",
            contributing_topics=["routine", "coping"],
            severity_score=0.15,
            status=AlertStatus.ACKNOWLEDGED,
            acknowledged_at=datetime.now(timezone.utc),
            case_notes="Routines well integrated.",
        ))

        # Seed Reward Tiers
        r1 = RewardTier(
            name="Bronze Warrior",
            description="Achieved initial 100 recovery points milestone",
            points_required=100,
            badge_icon="🎖️",
            badge_color="#D97706",
            reward_type="badge",
        )
        r2 = RewardTier(
            name="Silver Guardian",
            description="Earned 250 points with strong task consistency",
            points_required=250,
            badge_icon="🛡️",
            badge_color="#786F68",
            reward_type="badge",
        )
        r3 = RewardTier(
            name="Gold Champion",
            description="500 points milestone - exemplary discipline & wellness",
            points_required=500,
            badge_icon="🏆",
            badge_color="#D96B27",
            reward_type="badge",
        )
        r4 = RewardTier(
            name="Platinum Legend",
            description="1000 points - Veteran Peer Leader & Mentor status",
            points_required=1000,
            badge_icon="👑",
            badge_color="#1C1917",
            reward_type="badge",
        )
        session.add_all([r1, r2, r3, r4])

        # Seed Chat Conversation & Message Thread
        conv = ChatConversation(
            veteran_id=VET_1_ID,
            counselor_id=COUNSELOR_ID,
            subject="Clinical Care & Grounding",
            status="active",
            last_message="Hello Capt. Vikram! I reviewed your 5-day streak. Great discipline on the morning walks.",
            last_message_at=datetime.now(timezone.utc),
        )
        session.add(conv)
        await session.flush()

        m1 = ChatMessage(
            conversation_id=conv.id,
            sender_id=COUNSELOR_ID,
            sender_type="counselor",
            content="Hello Capt. Vikram! I reviewed your 5-day streak. Great discipline on the morning walks.",
            created_at=datetime.now(timezone.utc) - timedelta(hours=2),
        )
        m2 = ChatMessage(
            conversation_id=conv.id,
            sender_id=VET_1_ID,
            sender_type="veteran",
            content="Thank you Dr. Nair. The grounding technique really helped with the sensory overload yesterday.",
            created_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        session.add_all([m1, m2])

        await session.commit()
        print("Database seeded successfully with demo veterans, counselor, tasks, groups, rewards, and chat!")


if __name__ == "__main__":
    asyncio.run(seed())
