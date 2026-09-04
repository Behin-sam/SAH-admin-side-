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
    # --- Grounding & Coping ---
    {
        "title": "5-4-3-2-1 Grounding Technique",
        "description": "Practice the 5-4-3-2-1 senses check during anxiety or flashbacks to ground yourself in the present.",
        "instructions": "1. Name 5 things you can SEE\n2. Name 4 things you can TOUCH\n3. Name 3 things you can HEAR\n4. Name 2 things you can SMELL\n5. Name 1 thing you can TASTE\n6. Take 3 slow breaths. You are here, you are safe.",
        "points": 15,
        "difficulty": 1,
        "category": "grounding",
    },
    {
        "title": "Box Breathing (5 min)",
        "description": "Practice box breathing or diaphragmatic breathing for 5 minutes to regulate your nervous system.",
        "instructions": "1. Sit or lie in a comfortable position\n2. Breathe IN for 4 counts\n3. HOLD for 4 counts\n4. Breathe OUT for 4 counts\n5. HOLD empty for 4 counts\n6. Repeat for 5 minutes\n7. Notice how your body feels after",
        "points": 10,
        "difficulty": 1,
        "category": "breathing",
    },
    {
        "title": "Cognitive Reframing Exercise",
        "description": "Challenge a negative thought pattern by writing it down and reframing it with a balanced perspective.",
        "instructions": "1. Write down a negative thought you had today\n2. What evidence supports this thought?\n3. What evidence contradicts it?\n4. Write a more balanced, realistic version\n5. How do you feel after reframing?",
        "points": 20,
        "difficulty": 2,
        "category": "cognitive",
    },
    {
        "title": "Daily Mood & Trigger Journal",
        "description": "Keep a daily journal entry tracking your moods, triggers, and progress. Awareness is the first step.",
        "instructions": "1. Write today's date\n2. Rate your overall mood (1-10)\n3. What triggered any difficult emotions today?\n4. How did you respond to those triggers?\n5. What is one thing you handled well today?\n6. What's one thing you want to try differently tomorrow?",
        "points": 15,
        "difficulty": 1,
        "category": "journaling",
    },
    {
        "title": "Mindfulness Meditation (10 min)",
        "description": "Spend 10 minutes in mindfulness meditation, focusing on your breath and body sensations.",
        "instructions": "1. Find a quiet, comfortable spot\n2. Set a timer for 10 minutes\n3. Close your eyes or soften your gaze\n4. Focus on your breathing\n5. When thoughts arise, gently return to your breath\n6. Notice sensations in your body without judgment\n7. When the timer ends, take a moment before opening your eyes",
        "points": 20,
        "difficulty": 2,
        "category": "mindfulness",
    },
    {
        "title": "Set One Small Goal Today",
        "description": "Set one small, achievable goal to rebuild a sense of control and accomplishment.",
        "instructions": "1. Think of something small but meaningful you can do today\n2. Write it down specifically (e.g., 'Make the bed', 'Call the VA', 'Walk to the mailbox')\n3. Break it into steps if needed\n4. Complete it\n5. Acknowledge that you did it — that matters",
        "points": 15,
        "difficulty": 1,
        "category": "goal_setting",
    },
    {
        "title": "Sleep Wind-Down Routine",
        "description": "Build a consistent sleep schedule and wind-down routine to improve sleep quality.",
        "instructions": "1. Set a consistent bedtime (same time each night)\n2. 1 hour before bed: dim lights, put away screens\n3. Try reading, gentle stretching, or breathing exercises\n4. Avoid caffeine after 2 PM\n5. Keep your bedroom cool and dark\n6. If racing thoughts come, write them down to address tomorrow",
        "points": 15,
        "difficulty": 1,
        "category": "sleep",
    },
    {
        "title": "Therapy Session Check-In",
        "description": "Schedule or attend a regular check-in with a therapist, counselor, or trusted provider.",
        "instructions": "1. If you have a therapist: confirm your next session\n2. If you don't: look into VA Vet Center, CPT, PE, or EMDR options\n3. Write down one thing you want to discuss\n4. Remember: asking for help is a sign of strength, not weakness\n5. You are taking control of your recovery",
        "points": 25,
        "difficulty": 2,
        "category": "therapy",
    },
    {
        "title": "Substance Awareness Check",
        "description": "Reflect on your alcohol and substance use. Notice how they affect your symptoms and mood.",
        "instructions": "1. Have you used alcohol or substances this week?\n2. How did you feel before using? After?\n3. Did it help or worsen your symptoms?\n4. If you want to cut back, what's one step you can take?\n5. Consider talking to a provider about support options",
        "points": 15,
        "difficulty": 2,
        "category": "substance_awareness",
    },
    {
        "title": "Positive Affirmation Practice",
        "description": "Repeat 5 positive affirmations about yourself. Say them out loud with conviction.",
        "instructions": "1. Stand in front of a mirror\n2. Look yourself in the eyes\n3. Say each affirmation 3 times:\n   - 'I am strong and capable'\n   - 'I deserve peace and happiness'\n   - 'I am making progress every day'\n   - 'My past does not define me'\n   - 'I am worthy of love and support'",
        "points": 10,
        "difficulty": 1,
        "category": "affirmations",
    },
]

DEFAULT_PHYSICAL_TASKS = [
    # --- Cardio & Movement ---
    {
        "title": "Brisk 30-Minute Walk or Run",
        "description": "Go for a brisk 30-minute walk or run to boost endorphins and clear your mind.",
        "instructions": "1. Put on comfortable shoes and clothes\n2. Start your GPS tracking\n3. Walk or jog at a pace that gets your heart rate up\n4. Focus on your breathing rhythm\n5. Notice your surroundings as you move\n6. Cool down for 5 minutes at the end",
        "points": 25,
        "difficulty": 2,
        "category": "cardio",
        "gps_required": True,
        "distance_meters": 3000,
        "duration_seconds": 1800,
    },
    {
        "title": "Strength Training Session",
        "description": "Do a strength training session using bodyweight exercises or weights.",
        "instructions": "1. Warm up with 5 min light movement\n2. Choose 4-5 exercises (squats, push-ups, rows, lunges, planks)\n3. Do 3 sets of 8-12 reps each\n4. Rest 60-90 seconds between sets\n5. Focus on form over speed\n6. Cool down and stretch",
        "points": 25,
        "difficulty": 2,
        "category": "strength",
    },
    {
        "title": "Yoga or Tai Chi Session",
        "description": "Try yoga or tai chi for movement combined with breath control and mindfulness.",
        "instructions": "1. Find a quiet space and a yoga mat or soft surface\n2. Start with 3 deep breaths\n3. Follow a beginner routine (YouTube or app)\n4. Focus on linking breath to movement\n5. Hold each pose for 30-60 seconds\n6. End with 5 minutes of Savasana (rest)",
        "points": 20,
        "difficulty": 2,
        "category": "yoga",
    },
    {
        "title": "Outdoor Nature Time",
        "description": "Spend time outdoors — hiking, fishing, or just sitting in nature to ground yourself.",
        "instructions": "1. Find a park, trail, lake, or quiet outdoor spot\n2. Leave your phone on silent\n3. Start GPS tracking if hiking\n4. Walk slowly and observe nature\n5. Listen to birds, feel the breeze\n6. Sit quietly for at least 10 minutes\n7. Notice how nature makes you feel",
        "points": 20,
        "difficulty": 1,
        "category": "nature",
        "gps_required": True,
        "distance_meters": 1500,
        "duration_seconds": 1800,
    },
    {
        "title": "Low-Impact Cardio (Swim or Cycle)",
        "description": "Try swimming or cycling for low-impact cardio that's easy on your joints.",
        "instructions": "1. Head to a pool or get on your bike\n2. Start with a 5-minute warm-up\n3. Go at a moderate pace for 20-25 minutes\n4. Focus on steady breathing\n5. Cool down for 5 minutes\n6. Note how you feel afterward",
        "points": 25,
        "difficulty": 2,
        "category": "cardio",
        "gps_required": True,
        "distance_meters": 2000,
        "duration_seconds": 1800,
    },
    {
        "title": "Martial Arts or Boxing Class",
        "description": "Take a martial arts or boxing class for controlled physical outlet and discipline.",
        "instructions": "1. Find a local gym or studio with beginner classes\n2. Arrive 10 minutes early\n3. Tell the instructor you're new\n4. Focus on technique, not power\n5. Use the class as a healthy outlet for energy\n6. Stretch and cool down after",
        "points": 30,
        "difficulty": 3,
        "category": "martial_arts",
    },
    {
        "title": "10-Minute Stretching Routine",
        "description": "Do a 10-minute stretching or mobility routine to release tension from your body.",
        "instructions": "1. Neck rolls (1 min)\n2. Shoulder shrugs and arm circles (1 min)\n3. Chest opener stretch (1 min)\n4. Cat-cow spine stretch (1 min)\n5. Hip circles and pigeon pose (2 min)\n6. Hamstring stretch (1 min)\n7. Quad stretch (1 min)\n8. Calf stretch (1 min)\n9. Deep breathing in final pose (1 min)",
        "points": 10,
        "difficulty": 1,
        "category": "stretching",
    },
    {
        "title": "Cold Shower or Breathwork Session",
        "description": "Try a cold shower or breathwork session to regulate your nervous system and build resilience.",
        "instructions": "Option A - Cold Shower:\n1. Take your normal warm shower\n2. For the last 30-60 seconds, turn the water to cold\n3. Focus on slow, controlled breathing\n4. Notice the adrenaline and how you recover\n\nOption B - Breathwork:\n1. Find a quiet space\n2. Do 3 rounds of 30 rapid breaths\n3. Hold on the last exhale for 15-30 seconds\n4. Inhale deeply and hold for 15 seconds\n5. Repeat 3 times",
        "points": 20,
        "difficulty": 2,
        "category": "nervous_system",
    },
    {
        "title": "Gardening or Yard Work",
        "description": "Do gardening or yard work as active, grounding movement that connects you to the earth.",
        "instructions": "1. Choose a task: weeding, planting, mowing, raking\n2. Put on gloves and get outside\n3. Focus on the physical sensations\n4. Feel the earth, the sun, the breeze\n5. Work for at least 20 minutes\n6. Step back and appreciate what you accomplished",
        "points": 15,
        "difficulty": 1,
        "category": "outdoor",
        "gps_required": False,
    },
    {
        "title": "Track Sleep & Activity Patterns",
        "description": "Use a fitness app or journal to track your sleep and activity to spot patterns.",
        "instructions": "1. Log what time you went to bed and woke up\n2. Rate your sleep quality (1-10)\n3. Note any physical activity you did\n4. Track your energy levels throughout the day\n5. Look for patterns after a week\n6. Share insights with your provider if needed",
        "points": 10,
        "difficulty": 1,
        "category": "tracking",
    },
]


DEFAULT_GROUP_TASKS = [
    # --- Peer Support & Community ---
    {
        "title": "VA / Vet Center Peer Support Group",
        "description": "Join a VA or Vet Center PTSD peer support group to connect with others who understand.",
        "instructions": "1. Find your nearest Vet Center: vetcenter.va.gov or call 1-877-927-8387\n2. Attend a group session (many are virtual)\n3. You don't have to share — just being there counts\n4. Listen to others' experiences\n5. Notice you are not alone in this journey",
        "points": 30,
        "difficulty": 2,
        "category": "peer_support",
    },
    {
        "title": "Team RWB or Team Rubicon Event",
        "description": "Attend a Team RWB or Team Rubicon community event to stay active and connected.",
        "instructions": "1. Visit teamrwb.org or teamrubiconusa.org\n2. Find a local event near you\n3. Sign up and show up\n4. Introduce yourself to one new person\n5. Enjoy being part of a mission again",
        "points": 30,
        "difficulty": 2,
        "category": "community",
    },
    {
        "title": "Wounded Warrior Project Activity",
        "description": "Participate in a Wounded Warrior Project program or activity.",
        "instructions": "1. Visit woundedwarriorproject.org\n2. Explore programs: Warriors to Work, Project Odyssey, etc.\n3. Sign up for an upcoming event\n4. Attend and engage with other veterans\n5. Take advantage of the resources available to you",
        "points": 30,
        "difficulty": 2,
        "category": "veteran_program",
    },
    {
        "title": "Veteran Outdoor Program",
        "description": "Participate in a veteran outdoor program like Sierra Club Military Outdoors or Warrior Expeditions.",
        "instructions": "1. Research: Sierra Club Military Outdoors, Warrior Expeditions, or Operation Outdoor Freedom\n2. Find a group hike, camping trip, or outdoor adventure\n3. Sign up and prepare your gear\n4. Enjoy nature alongside fellow veterans\n5. Reflect on the experience afterward",
        "points": 30,
        "difficulty": 2,
        "category": "outdoor_program",
    },
    {
        "title": "Adaptive / Veteran Group Fitness",
        "description": "Try an adaptive or veteran-focused group fitness class for structured movement with peers.",
        "instructions": "1. Look for: CrossFit boxes with veteran programs, adaptive sports, or YMCA veteran classes\n2. Call ahead and let them know you're coming\n3. Arrive early to meet the instructor\n4. Go at your own pace — modifications are okay\n5. Stay after to chat with other participants",
        "points": 25,
        "difficulty": 2,
        "category": "group_fitness",
    },
    {
        "title": "Community Service Project",
        "description": "Volunteer on a community service project with other veterans to give back and stay connected.",
        "instructions": "1. Find local volunteer opportunities: habitat for humanity, food banks, veteran memorials\n2. Sign up for a project\n3. Show up and work alongside others\n4. Focus on the purpose and mission\n5. Connect with fellow volunteers",
        "points": 25,
        "difficulty": 2,
        "category": "volunteering",
    },
    {
        "title": "Veteran Writing / Art / Music Group",
        "description": "Join a veteran writing, art, or music therapy group to express and process creatively.",
        "instructions": "1. Look for: Veterans Writing Project, Warrior Writers, or local art therapy groups\n2. Attend a session — no experience needed\n3. Write, draw, or create without judgment\n4. Share if you feel comfortable\n5. Creative expression is a powerful healing tool",
        "points": 25,
        "difficulty": 2,
        "category": "creative_therapy",
    },
    {
        "title": "VFW or American Legion Event",
        "description": "Attend a local VFW or American Legion social event to connect with fellow veterans.",
        "instructions": "1. Find your nearest post: vfw.org or legion.org\n2. Check their calendar for events\n3. Stop by for a meal, game night, or meeting\n4. Introduce yourself to someone new\n5. See if membership is right for you",
        "points": 20,
        "difficulty": 1,
        "category": "social",
    },
    {
        "title": "Group Hiking or Camping Trip",
        "description": "Join a group hiking or camping trip with fellow veterans for outdoor bonding.",
        "instructions": "1. Find a veteran hiking group: Hiking Warriors, local Meetup groups, or VA recreation therapy\n2. Sign up for an upcoming trip\n3. Prepare: water, snacks, proper shoes\n4. Enjoy the trail and the company\n5. Reflect on the experience when you return",
        "points": 25,
        "difficulty": 2,
        "category": "outdoor",
        "gps_required": True,
        "distance_meters": 3000,
        "duration_seconds": 3600,
    },
    {
        "title": "Veteran Team Sports League",
        "description": "Participate in a team sports league — softball, golf, bowling — with fellow veterans.",
        "instructions": "1. Find a veteran sports league: Disabled Veterans Sports, local rec leagues\n2. Sign up for softball, golf, bowling, or another sport\n3. Attend practice or games\n4. Enjoy the camaraderie and friendly competition\n5. Teamwork is good for the soul",
        "points": 25,
        "difficulty": 2,
        "category": "team_sports",
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

    # Select tasks: 2 mental, 1 physical, 1 group/social
    mental_tasks = random.sample(DEFAULT_MENTAL_TASKS, min(2, len(DEFAULT_MENTAL_TASKS)))
    physical_task = random.choice(DEFAULT_PHYSICAL_TASKS)
    group_task = random.choice(DEFAULT_GROUP_TASKS)

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

    # Create group/social task
    grp_task = DailyTask(
        veteran_id=veteran_id,
        task_type=TaskType.SOCIAL,
        title=group_task["title"],
        description=group_task["description"],
        instructions=group_task["instructions"],
        points=group_task["points"],
        assigned_date=today,
        difficulty=group_task["difficulty"],
        category=group_task["category"],
        gps_required=group_task.get("gps_required", False),
        gps_target_distance_meters=group_task.get("distance_meters"),
        gps_min_duration_seconds=group_task.get("duration_seconds"),
    )
    db.add(grp_task)
    created_tasks.append(grp_task)

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
