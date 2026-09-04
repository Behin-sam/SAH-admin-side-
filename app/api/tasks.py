"""Daily task management endpoints.

GET    /api/veterans/{id}/tasks            — Get veteran's tasks (filterable)
POST   /api/veterans/{id}/tasks/generate   — Generate daily tasks
GET    /api/veterans/{id}/tasks/{task_id}  — Get task detail
POST   /api/veterans/{id}/tasks/{task_id}/start   — Start a task
POST   /api/veterans/{id}/tasks/{task_id}/complete — Complete a task
POST   /api/veterans/{id}/tasks/{task_id}/skip     — Skip a task
"""

from __future__ import annotations

import uuid
import random
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.gamified import (
    VeteranProfile,
    DailyTask,
    TaskTemplate,
    PointsLedger,
    TaskStatus,
    TaskType,
)

router = APIRouter(prefix="/api/veterans/{veteran_id}/tasks", tags=["tasks"])


# ─── Task Templates ───────────────────────────────────────────────────────────

DEFAULT_MENTAL_TASKS = [
    {
        "title": "5-Minute Breathing Exercise",
        "description": "Take 5 minutes to focus on deep, slow breathing. Inhale for 4 counts, hold for 4, exhale for 6.",
        "instructions": "1. Find a quiet spot\n2. Close your eyes\n3. Breathe in for 4 counts\n4. Hold for 4 counts\n5. Exhale for 6 counts\n6. Repeat for 5 minutes",
        "points": 10,
        "difficulty": 1,
        "category": "breathing",
    },
    {
        "title": "Gratitude Journal Entry",
        "description": "Write down 3 things you're grateful for today. They can be big or small.",
        "instructions": "1. Open your journal or notes app\n2. Write today's date\n3. List 3 things you're grateful for\n4. For each one, write one sentence about why",
        "points": 15,
        "difficulty": 1,
        "category": "journaling",
    },
    {
        "title": "Mindful Observation",
        "description": "Spend 3 minutes observing your surroundings without judgment. Notice colors, sounds, and textures.",
        "instructions": "1. Sit comfortably\n2. Look around you\n3. Name 5 things you can see\n4. Name 4 things you can hear\n5. Name 3 things you can feel\n6. Stay present for 3 minutes",
        "points": 10,
        "difficulty": 1,
        "category": "mindfulness",
    },
    {
        "title": "Progressive Muscle Relaxation",
        "description": "Tense and release each muscle group for 5 seconds each, starting from your toes.",
        "instructions": "1. Start with your toes - tense for 5 seconds, then release\n2. Move to your calves\n3. Then thighs\n4. Continue up through your body\n5. Finish with your face and jaw",
        "points": 15,
        "difficulty": 2,
        "category": "relaxation",
    },
    {
        "title": "Positive Affirmation Practice",
        "description": "Repeat 5 positive affirmations about yourself. Say them out loud with conviction.",
        "instructions": "1. Stand in front of a mirror\n2. Look yourself in the eyes\n3. Say each affirmation 3 times:\n   - 'I am strong and capable'\n   - 'I deserve peace and happiness'\n   - 'I am making progress every day'\n   - 'My past does not define me'\n   - 'I am worthy of love and support'",
        "points": 10,
        "difficulty": 1,
        "category": "affirmations",
    },
    {
        "title": "Memory Processing Journal",
        "description": "Write about a positive memory from your service. Focus on what you learned or accomplished.",
        "instructions": "1. Think of a positive memory from your time in service\n2. Write about what happened\n3. What did you learn from this experience?\n4. How did this shape who you are today?\n5. What strength did this give you?",
        "points": 20,
        "difficulty": 3,
        "category": "journaling",
    },
    {
        "title": "Box Breathing Technique",
        "description": "Use the Navy SEAL box breathing technique: 4 counts in, 4 hold, 4 out, 4 hold.",
        "instructions": "1. Breathe in for 4 counts\n2. Hold your breath for 4 counts\n3. Breathe out for 4 counts\n4. Hold empty for 4 counts\n5. Repeat for 4-6 cycles",
        "points": 10,
        "difficulty": 1,
        "category": "breathing",
    },
    {
        "title": "Social Connection Check-In",
        "description": "Reach out to one person you trust - send a text, make a call, or have a quick chat.",
        "instructions": "1. Think of someone you trust\n2. Send them a message or call\n3. Ask how they're doing\n4. Share one positive thing from your day\n5. Listen to what they share",
        "points": 20,
        "difficulty": 2,
        "category": "social",
    },
]

DEFAULT_PHYSICAL_TASKS = [
    {
        "title": "Morning Walk (15 min)",
        "description": "Take a 15-minute walk around your neighborhood. Focus on your breathing and surroundings.",
        "instructions": "1. Put on comfortable shoes\n2. Start your GPS tracking\n3. Walk at a comfortable pace\n4. Notice the trees, sky, and sounds\n5. Return home and stop tracking",
        "points": 15,
        "difficulty": 1,
        "category": "walking",
        "gps_required": True,
        "distance_meters": 1000,
        "duration_seconds": 900,
    },
    {
        "title": "Stretching Routine",
        "description": "Complete a 10-minute full body stretching routine.",
        "instructions": "1. Neck rolls (1 min)\n2. Shoulder shrugs (1 min)\n3. Arm circles (1 min)\n4. Torso twists (1 min)\n5. Hip circles (1 min)\n6. Knee lifts (1 min)\n7. Ankle rotations (1 min)\n8. Calf stretches (1 min)\n9. Hamstring stretches (1 min)\n10. Cool down (1 min)",
        "points": 10,
        "difficulty": 1,
        "category": "stretching",
    },
    {
        "title": "Outdoor Activity (30 min)",
        "description": "Spend 30 minutes doing any outdoor physical activity - walking, gardening, or cycling.",
        "instructions": "1. Choose your activity\n2. Start GPS tracking\n3. Enjoy your time outside\n4. Focus on being present\n5. Track your full route",
        "points": 25,
        "difficulty": 2,
        "category": "outdoor",
        "gps_required": True,
        "distance_meters": 2000,
        "duration_seconds": 1800,
    },
    {
        "title": "Bodyweight Circuit",
        "description": "Complete 3 rounds of: 10 squats, 10 push-ups, 10 lunges, 30-second plank.",
        "instructions": "Round 1:\n- 10 bodyweight squats\n- 10 push-ups (modify if needed)\n- 10 lunges (5 each leg)\n- 30-second plank\nRest 1 minute, repeat 2 more times",
        "points": 20,
        "difficulty": 2,
        "category": "strength",
    },
    {
        "title": "Nature Walk (20 min)",
        "description": "Take a walk in a park or nature area. Leave your phone on silent and just be present.",
        "instructions": "1. Find a quiet outdoor space\n2. Put your phone on silent\n3. Start GPS tracking\n4. Walk slowly and observe nature\n5. Listen to birds, feel the breeze\n6. Return and stop tracking",
        "points": 20,
        "difficulty": 1,
        "category": "nature",
        "gps_required": True,
        "distance_meters": 1500,
        "duration_seconds": 1200,
    },
    {
        "title": "Yoga Flow (20 min)",
        "description": "Follow a gentle yoga flow focusing on grounding poses.",
        "instructions": "1. Mountain Pose (2 min)\n2. Forward Fold (2 min)\n3. Downward Dog (2 min)\n4. Warrior I (2 min each side)\n5. Warrior II (2 min each side)\n6. Tree Pose (2 min each side)\n7. Seated Forward Fold (2 min)\n8. Savasana (2 min)",
        "points": 20,
        "difficulty": 2,
        "category": "yoga",
    },
]


@router.get("/")
async def get_tasks(
    veteran_id: uuid.UUID,
    status: str | None = None,
    task_type: str | None = None,
    date: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Get veteran's tasks with optional filters."""
    # Verify veteran exists
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Veteran not found")

    query = select(DailyTask).where(DailyTask.veteran_id == veteran_id)

    if status:
        query = query.where(DailyTask.status == status)
    if task_type:
        query = query.where(DailyTask.task_type == task_type)
    if date:
        target_date = datetime.fromisoformat(date.replace("Z", "+00:00"))
        next_day = target_date + timedelta(days=1)
        query = query.where(DailyTask.assigned_date >= target_date, DailyTask.assigned_date < next_day)

    query = query.order_by(DailyTask.assigned_date.desc(), DailyTask.created_at)
    result = await db.execute(query)
    tasks = result.scalars().all()

    return {
        "veteran_id": str(veteran_id),
        "tasks": [
            {
                "id": str(task.id),
                "type": task.task_type.value,
                "title": task.title,
                "description": task.description,
                "instructions": task.instructions,
                "points": task.points,
                "status": task.status.value,
                "difficulty": task.difficulty,
                "category": task.category,
                "gps_required": task.gps_required,
                "gps_target_distance_meters": task.gps_target_distance_meters,
                "assigned_date": task.assigned_date.isoformat(),
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            }
            for task in tasks
        ],
        "total": len(tasks),
    }


@router.post("/generate", status_code=201)
async def generate_daily_tasks(
    veteran_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Generate today's daily tasks for a veteran.

    Assigns 2 mental tasks and 1 physical task per day.
    Tasks are selected based on veteran's streak and preferences.
    """
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one_or_none()
    if not veteran:
        raise HTTPException(status_code=404, detail="Veteran not found")

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # Check if tasks already exist for today
    result = await db.execute(
        select(func.count(DailyTask.id)).where(
            DailyTask.veteran_id == veteran_id,
            DailyTask.assigned_date >= today,
        )
    )
    existing_count = result.scalar() or 0
    if existing_count > 0:
        return {"message": "Tasks already generated for today", "existing_tasks": existing_count}

    # Select tasks based on veteran's level
    mental_tasks = random.sample(DEFAULT_MENTAL_TASKS, min(2, len(DEFAULT_MENTAL_TASKS)))
    physical_task = random.choice(DEFAULT_PHYSICAL_TASKS)

    created_tasks = []

    # Create mental tasks
    for task_data in mental_tasks:
        task = DailyTask(
            veteran_id=veteran_id,
            task_type=TaskType.MENTAL,
            title=task_data["title"],
            description=task_data["description"],
            instructions=task_data["instructions"],
            points=task_data["points"],
            assigned_date=today,
            difficulty=task_data["difficulty"],
            category=task_data["category"],
            gps_required=False,
        )
        db.add(task)
        created_tasks.append(task)

    # Create physical task
    phys_task = DailyTask(
        veteran_id=veteran_id,
        task_type=TaskType.PHYSICAL,
        title=physical_task["title"],
        description=physical_task["description"],
        instructions=physical_task["instructions"],
        points=physical_task["points"],
        assigned_date=today,
        difficulty=physical_task["difficulty"],
        category=physical_task["category"],
        gps_required=physical_task.get("gps_required", False),
        gps_target_distance_meters=physical_task.get("distance_meters"),
        gps_min_duration_seconds=physical_task.get("duration_seconds"),
    )
    db.add(phys_task)
    created_tasks.append(phys_task)

    await db.flush()

    return {
        "message": "Daily tasks generated successfully",
        "tasks": [
            {
                "id": str(task.id),
                "type": task.task_type.value,
                "title": task.title,
                "description": task.description,
                "points": task.points,
                "difficulty": task.difficulty,
                "gps_required": task.gps_required,
            }
            for task in created_tasks
        ],
        "total_points_available": sum(t.points for t in created_tasks),
    }


@router.get("/{task_id}")
async def get_task_detail(
    veteran_id: uuid.UUID,
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get detailed task information including instructions."""
    result = await db.execute(
        select(DailyTask).where(
            DailyTask.id == task_id,
            DailyTask.veteran_id == veteran_id,
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "id": str(task.id),
        "type": task.task_type.value,
        "title": task.title,
        "description": task.description,
        "instructions": task.instructions,
        "points": task.points,
        "status": task.status.value,
        "difficulty": task.difficulty,
        "category": task.category,
        "gps_required": task.gps_required,
        "gps_target_distance_meters": task.gps_target_distance_meters,
        "gps_min_duration_seconds": task.gps_min_duration_seconds,
        "assigned_date": task.assigned_date.isoformat(),
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
    }


@router.post("/{task_id}/start")
async def start_task(
    veteran_id: uuid.UUID,
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Start working on a task."""
    result = await db.execute(
        select(DailyTask).where(
            DailyTask.id == task_id,
            DailyTask.veteran_id == veteran_id,
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != TaskStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail=f"Cannot start task in {task.status.value} status")

    task.status = TaskStatus.IN_PROGRESS
    task.started_at = datetime.now(timezone.utc)

    return {
        "message": "Task started",
        "task_id": str(task.id),
        "status": "in_progress",
        "started_at": task.started_at.isoformat(),
    }


@router.post("/{task_id}/complete")
async def complete_task(
    veteran_id: uuid.UUID,
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Complete a task and award points."""
    result = await db.execute(
        select(DailyTask).where(
            DailyTask.id == task_id,
            DailyTask.veteran_id == veteran_id,
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status not in [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]:
        raise HTTPException(status_code=400, detail=f"Cannot complete task in {task.status.value} status")

    now = datetime.now(timezone.utc)
    task.status = TaskStatus.COMPLETED
    task.completed_at = now

    # Award points
    points_entry = PointsLedger(
        veteran_id=veteran_id,
        points=task.points,
        reason=f"Completed: {task.title}",
        category="task_completion",
        task_id=task.id,
    )
    db.add(points_entry)

    # Update veteran stats
    result = await db.execute(select(VeteranProfile).where(VeteranProfile.id == veteran_id))
    veteran = result.scalar_one()
    veteran.total_points += task.points
    veteran.tasks_completed += 1

    # Check streak (simplified - check if they completed a task yesterday)
    yesterday = now - timedelta(days=1)
    result = await db.execute(
        select(func.count(DailyTask.id)).where(
            DailyTask.veteran_id == veteran_id,
            DailyTask.status == TaskStatus.COMPLETED,
            DailyTask.completed_at >= yesterday.replace(hour=0, minute=0, second=0, microsecond=0),
            DailyTask.completed_at < now.replace(hour=0, minute=0, second=0, microsecond=0),
        )
    )
    yesterday_completed = result.scalar() or 0

    if yesterday_completed > 0 or veteran.current_streak == 0:
        veteran.current_streak += 1
    else:
        veteran.current_streak = 1

    veteran.longest_streak = max(veteran.longest_streak, veteran.current_streak)

    # Check for streak bonus
    streak_bonus = 0
    if veteran.current_streak % 7 == 0:  # Every 7 days
        streak_bonus = 50
        bonus_entry = PointsLedger(
            veteran_id=veteran_id,
            points=streak_bonus,
            reason=f"🔥 {veteran.current_streak}-day streak bonus!",
            category="streak_bonus",
        )
        db.add(bonus_entry)
        veteran.total_points += streak_bonus

    return {
        "message": "Task completed! 🎉",
        "task_id": str(task.id),
        "points_earned": task.points,
        "streak_bonus": streak_bonus,
        "total_points": veteran.total_points,
        "current_streak": veteran.current_streak,
        "completed_at": task.completed_at.isoformat(),
    }


@router.post("/{task_id}/skip")
async def skip_task(
    veteran_id: uuid.UUID,
    task_id: uuid.UUID,
    reason: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Skip a task (no points awarded, streak not affected)."""
    result = await db.execute(
        select(DailyTask).where(
            DailyTask.id == task_id,
            DailyTask.veteran_id == veteran_id,
        )
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status == TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Cannot skip a completed task")

    task.status = TaskStatus.SKIPPED

    return {
        "message": "Task skipped",
        "task_id": str(task.id),
        "status": "skipped",
        "reason": reason,
    }
