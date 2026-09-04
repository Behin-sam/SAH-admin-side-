"""Authentication and Demo User Endpoints for SAH Web & Mobile Apps."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import SurvivorProfile
from app.models.gamified import VeteranProfile, DailyTask, TaskStatus, TaskType

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: Optional[str] = None
    identifier: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = "veteran"


class RegisterRequest(BaseModel):
    name: str
    email: str
    role: str = "veteran"
    rank: Optional[str] = None
    unit: Optional[str] = None
    service_branch: Optional[str] = None
    serviceBranch: Optional[str] = None


@router.get("/demo-users")
async def get_demo_users(db: AsyncSession = Depends(get_db)):
    """Get pre-seeded demo veterans and counselors for quick UI selection."""
    result = await db.execute(
        select(VeteranProfile, SurvivorProfile)
        .join(SurvivorProfile, VeteranProfile.survivor_id == SurvivorProfile.id)
    )
    rows = result.all()

    veterans = []
    for vet, surv in rows:
        veterans.append({
            "id": str(vet.id),
            "survivor_id": str(surv.id),
            "name": surv.preferred_language or "Veteran",
            "email": f"vet-{str(vet.id)[:6]}@sah.org",
            "role": "veteran",
            "rank": vet.rank or "Soldier",
            "service_branch": vet.service_branch or "Army",
            "total_points": vet.total_points,
            "current_streak": vet.current_streak,
            "tasks_completed": vet.tasks_completed,
            "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
        })

    counselors = [
        {
            "id": "counselor-01",
            "name": "Dr. Ananya Nair",
            "role": "counselor",
            "title": "Clinical Lead & Trauma Specialist",
            "email": "a.nair@amrita-health.org",
            "avatarUrl": "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200",
        }
    ]

    return {"veterans": veterans, "counselors": counselors}


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Log in as veteran or counselor."""
    raw_ident = (req.email or req.identifier or "").strip()
    email_clean = raw_ident.lower()
    if req.role == "counselor" or "counselor" in email_clean or "dr." in email_clean or "nair" in email_clean:
        return {
            "success": True,
            "token": "mock-counselor-jwt-token",
            "user": {
                "id": "counselor-01",
                "name": "Dr. Ananya Nair",
                "email": raw_ident if "@" in raw_ident else "a.nair@amrita-health.org",
                "role": "counselor",
                "rank": "Clinical Lead",
                "title": "Clinical Lead & Trauma Specialist",
                "avatarUrl": "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200",
                "isEmailVerified": True,
            },
        }

    # Find veteran in DB
    result = await db.execute(
        select(VeteranProfile, SurvivorProfile)
        .join(SurvivorProfile, VeteranProfile.survivor_id == SurvivorProfile.id)
    )
    rows = result.all()

    chosen_pair = None
    for vet, surv in rows:
        vet_name = (surv.preferred_language or "").lower()
        vet_id_str = str(vet.id)
        if vet_id_str in email_clean or email_clean == vet_id_str:
            chosen_pair = (vet, surv)
            break
        if "kabir" in email_clean and "kabir" in vet_name:
            chosen_pair = (vet, surv)
            break
        if "arjun" in email_clean and "arjun" in vet_name:
            chosen_pair = (vet, surv)
            break
        if ("vikram" in email_clean or "rathore" in email_clean) and "vikram" in vet_name:
            chosen_pair = (vet, surv)
            break
        if email_clean and (email_clean in vet_name or vet_name in email_clean):
            chosen_pair = (vet, surv)
            break

    if not chosen_pair and rows:
        chosen_pair = rows[0]

    if chosen_pair:
        vet, surv = chosen_pair
        return {
            "success": True,
            "token": f"mock-jwt-token-{vet.id}",
            "user": {
                "id": str(vet.id),
                "survivor_id": str(surv.id),
                "name": surv.preferred_language if surv.preferred_language and len(surv.preferred_language) > 2 else "Capt. Vikram Rathore",
                "email": req.email,
                "role": "veteran",
                "rank": vet.rank or "Captain",
                "service_branch": vet.service_branch or "Indian Army (Para SF)",
                "unit": "9 Para Special Forces",
                "total_points": vet.total_points,
                "current_streak": vet.current_streak,
                "tasks_completed": vet.tasks_completed,
                "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
                "isEmailVerified": True,
                "assignedCounselorId": "counselor-01",
                "assignedCounselorName": "Dr. Ananya Nair",
            },
        }

    return {
        "success": True,
        "token": "mock-demo-token",
        "user": {
            "id": "550e8400-e29b-41d4-a716-446655440001",
            "name": "Capt. Vikram Rathore",
            "email": req.email,
            "role": "veteran",
            "rank": "Captain",
            "service_branch": "Indian Army (Para SF)",
            "total_points": 335,
            "current_streak": 5,
            "tasks_completed": 16,
            "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
            "isEmailVerified": True,
            "assignedCounselorId": "counselor-01",
            "assignedCounselorName": "Dr. Ananya Nair",
        },
    }


@router.post("/register", status_code=201)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user (creates SurvivorProfile + VeteranProfile in DB)."""
    new_survivor_id = uuid.uuid4()
    survivor = SurvivorProfile(
        id=new_survivor_id,
        preferred_language=req.name,
        timezone_offset="+05:30",
        baseline_established=False,
    )
    db.add(survivor)

    if req.role == "veteran":
        new_vet_id = uuid.uuid4()
        veteran = VeteranProfile(
            id=new_vet_id,
            survivor_id=new_survivor_id,
            service_branch=req.service_branch or "Army",
            rank=req.rank or "Soldier",
            years_of_service=5,
            total_points=50,
            current_streak=1,
            longest_streak=1,
            tasks_completed=0,
        )
        db.add(veteran)

        now = datetime.now(timezone.utc)
        starter_tasks = [
            DailyTask(
                veteran_id=new_vet_id,
                title="Starter Task: Initial Clinical Intake & Baseline Assessment",
                description="Complete your introductory Harvard Trauma clinical baseline questionnaire to personalize your recovery plan.",
                instructions="Answer the 5 core trauma questions honestly. This sets your clinical baseline and alerts your counselor if support is needed.",
                task_type=TaskType.MENTAL,
                category="assessment",
                points=50,
                difficulty=1,
                status=TaskStatus.ASSIGNED,
                assigned_date=now,
                gps_required=False,
            ),
            DailyTask(
                veteran_id=new_vet_id,
                title="5-4-3-2-1 Grounding Technique",
                description="Practice the 5-4-3-2-1 senses check during tension or flashbacks to anchor yourself in the present.",
                instructions="Name 5 things you see, 4 touch, 3 hear, 2 smell, 1 taste. Take 3 deep breaths.",
                task_type=TaskType.MENTAL,
                category="grounding",
                points=15,
                difficulty=1,
                status=TaskStatus.ASSIGNED,
                assigned_date=now,
                gps_required=False,
            ),
            DailyTask(
                veteran_id=new_vet_id,
                title="2km Tactical Walk",
                description="Engage in a steady 2km outdoor brisk walk to stimulate dopamine, rebuild stamina, and ground your senses.",
                instructions="Keep a steady rhythmic pace. Tap Start GPS Walk and verify your 2km trail.",
                task_type=TaskType.PHYSICAL,
                category="endurance",
                points=30,
                difficulty=2,
                status=TaskStatus.ASSIGNED,
                assigned_date=now,
                gps_required=True,
                gps_target_distance_meters=2000,
            ),
            DailyTask(
                veteran_id=new_vet_id,
                title="Hydration & Electrolyte Protocol",
                description="Drink at least 2 liters of water and maintain electrolytes throughout the day to support nervous system recovery.",
                instructions="Begin your morning with a large glass of water. Track regular hydration across the day.",
                task_type=TaskType.PHYSICAL,
                category="wellness",
                points=10,
                difficulty=1,
                status=TaskStatus.ASSIGNED,
                assigned_date=now,
                gps_required=False,
            ),
            DailyTask(
                veteran_id=new_vet_id,
                title="Evening Gratitude & Reflection",
                description="Write down three moments of pride or safety from today before sleeping.",
                instructions="Identify 3 specific moments. Note how your body felt during them.",
                task_type=TaskType.MENTAL,
                category="reflection",
                points=15,
                difficulty=1,
                status=TaskStatus.ASSIGNED,
                assigned_date=now,
                gps_required=False,
            ),
        ]
        db.add_all(starter_tasks)
        await db.commit()
        await db.refresh(veteran)

        return {
            "success": True,
            "user": {
                "id": str(veteran.id),
                "survivor_id": str(new_survivor_id),
                "name": req.name,
                "email": req.email,
                "role": "veteran",
                "rank": req.rank or "Soldier",
                "service_branch": req.service_branch or "Army",
                "unit": req.unit or "Infantry Division",
                "total_points": veteran.total_points,
                "current_streak": veteran.current_streak,
                "tasks_completed": veteran.tasks_completed,
                "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
                "isEmailVerified": True,
                "assignedCounselorId": "counselor-01",
                "assignedCounselorName": "Dr. Ananya Nair",
            },
        }

    await db.commit()
    return {
        "success": True,
        "user": {
            "id": "counselor-01",
            "name": req.name,
            "email": req.email,
            "role": "counselor",
            "avatarUrl": "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200",
            "isEmailVerified": True,
        },
    }
