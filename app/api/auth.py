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
from app.models.chat import CounselorProfile

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: Optional[str] = None
    identifier: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = "veteran"


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: Optional[str] = None
    role: str = "veteran"
    rank: Optional[str] = None
    unit: Optional[str] = None
    service_branch: Optional[str] = None
    serviceBranch: Optional[str] = None
    title: Optional[str] = None
    specialization: Optional[str] = None
    credentials: Optional[str] = None
    institution: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


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
        surv_email = None
        if surv.encrypted_email:
            try:
                surv_email = surv.encrypted_email.decode("utf-8")
            except Exception:
                pass
        veterans.append({
            "id": str(vet.id),
            "survivor_id": str(surv.id),
            "name": surv.preferred_language or "Veteran",
            "email": surv_email or f"vet-{str(vet.id)[:6]}@sah.org",
            "role": "veteran",
            "rank": vet.rank or "Soldier",
            "service_branch": vet.service_branch or "Army",
            "total_points": vet.total_points,
            "current_streak": vet.current_streak,
            "tasks_completed": vet.tasks_completed,
            "avatarUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
        })

    c_res = await db.execute(select(CounselorProfile).where(CounselorProfile.is_available == True))
    c_rows = c_res.scalars().all()
    counselors = [
        {
            "id": str(c.id),
            "name": c.name,
            "role": "counselor",
            "title": c.title or "Clinical Lead & Trauma Specialist",
            "specialization": c.specialization or "Trauma Care",
            "institution": getattr(c, "institution", None) or "Armed Forces Medical Command",
            "email": c.email or f"counselor-{str(c.id)[:6]}@sah.org",
            "avatarUrl": getattr(c, "avatar_url", None) or "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200",
        }
        for c in c_rows
    ]

    return {"veterans": veterans, "counselors": counselors}


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Log in as veteran or counselor."""
    raw_ident = (req.email or req.identifier or "").strip()
    email_clean = raw_ident.lower()
    if req.role == "counselor" or "counselor" in email_clean or "dr." in email_clean:
        c_found = None
        if raw_ident:
            c_res = await db.execute(select(CounselorProfile).where(CounselorProfile.email == raw_ident))
            c_found = c_res.scalar_one_or_none()
            if not c_found:
                # search by name substring or email match
                c_res2 = await db.execute(select(CounselorProfile))
                for cp in c_res2.scalars().all():
                    if cp.name.lower() in email_clean or email_clean in cp.name.lower() or (cp.email and cp.email.lower() == email_clean):
                        c_found = cp
                        break

        if not c_found:
            c_res = await db.execute(select(CounselorProfile))
            c_found = c_res.scalars().first()

        c_id = str(c_found.id) if c_found else "c0000000-0000-0000-0000-000000000001"
        c_name = c_found.name if c_found else "Dr. Ananya Nair, MD"
        c_title = c_found.title if c_found else "Lead Trauma Specialist"
        c_email = c_found.email if (c_found and c_found.email) else (raw_ident if "@" in raw_ident else "a.nair@amrita-health.org")
        c_avatar = (getattr(c_found, "avatar_url", None) if c_found else None) or "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200"
        c_inst = (getattr(c_found, "institution", None) if c_found else None) or "Amrita Health"

        return {
            "success": True,
            "token": f"counselor-jwt-{c_id}",
            "user": {
                "id": c_id,
                "name": c_name,
                "email": c_email,
                "role": "counselor",
                "rank": "Clinical Specialist",
                "title": c_title,
                "specialization": getattr(c_found, "specialization", "Trauma Recovery") if c_found else "Trauma Recovery",
                "institution": c_inst,
                "avatarUrl": c_avatar,
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
        surv_email = ""
        if surv.encrypted_email:
            try:
                surv_email = surv.encrypted_email.decode("utf-8").lower()
            except Exception:
                pass
        vet_id_str = str(vet.id)
        if email_clean and surv_email and (email_clean == surv_email or email_clean in surv_email or surv_email in email_clean):
            chosen_pair = (vet, surv)
            break
        if vet_id_str in email_clean or email_clean == vet_id_str or (email_clean and str(vet.id)[:8] in email_clean):
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
        if not email_clean or "demo" in email_clean or "vikram" in email_clean:
            chosen_pair = rows[0]
        else:
            # Fall back to matching first registered non-seeded user if available, or rows[0]
            chosen_pair = rows[0]

    if chosen_pair:
        vet, surv = chosen_pair
        surv_email = req.email
        if surv.encrypted_email:
            try:
                surv_email = surv.encrypted_email.decode("utf-8")
            except Exception:
                pass
        return {
            "success": True,
            "token": f"mock-jwt-token-{vet.id}",
            "user": {
                "id": str(vet.id),
                "survivor_id": str(surv.id),
                "name": surv.preferred_language if surv.preferred_language and len(surv.preferred_language) > 2 else "Capt. Vikram Rathore",
                "email": surv_email or req.email,
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
            "total_points": 250,
            "current_streak": 5,
            "tasks_completed": 1,
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
        encrypted_email=req.email.encode("utf-8") if req.email else None,
        encrypted_name=req.name.encode("utf-8") if req.name else None,
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

    # Counselor registration
    new_counselor_id = uuid.uuid4()
    counselor = CounselorProfile(
        id=new_counselor_id,
        name=req.name,
        title=req.title or "Licensed Clinical Counselor",
        specialization=req.specialization or "Trauma & PTSD Recovery",
        credentials=req.credentials or "PhD, LCSW",
        institution=req.institution or "Amrita Health & Rehabilitation",
        email=req.email,
        phone=req.phone or "+91 98765 43210",
        avatar_url=req.avatar_url or "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200",
        is_available=True,
        max_veterans=25,
        current_veterans=0,
        avg_response_minutes=45,
    )
    db.add(counselor)
    await db.commit()
    await db.refresh(counselor)

    return {
        "success": True,
        "token": f"counselor-jwt-{str(counselor.id)}",
        "user": {
            "id": str(counselor.id),
            "name": counselor.name,
            "email": counselor.email,
            "role": "counselor",
            "rank": "Clinical Specialist",
            "title": counselor.title,
            "specialization": counselor.specialization,
            "credentials": counselor.credentials,
            "institution": counselor.institution,
            "phone": counselor.phone,
            "avatarUrl": counselor.avatar_url,
            "isEmailVerified": True,
        },
    }
