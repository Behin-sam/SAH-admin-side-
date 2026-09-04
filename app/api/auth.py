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
from app.models.gamified import VeteranProfile

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None
    role: Optional[str] = "veteran"


class RegisterRequest(BaseModel):
    name: str
    email: str
    role: str = "veteran"
    rank: Optional[str] = None
    unit: Optional[str] = None
    service_branch: Optional[str] = None


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
            "email": "ananya.nair@defensehealth.gov.in",
            "avatarUrl": "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200",
        }
    ]

    return {"veterans": veterans, "counselors": counselors}


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Log in as veteran or counselor."""
    if req.role == "counselor" or "counselor" in req.email.lower() or "dr." in req.email.lower():
        return {
            "success": True,
            "token": "mock-counselor-jwt-token",
            "user": {
                "id": "counselor-01",
                "name": "Dr. Ananya Nair",
                "email": req.email,
                "role": "counselor",
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
    first_pair = result.first()

    if first_pair:
        vet, surv = first_pair
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
            "id": "demo-veteran-001",
            "name": "Capt. Vikram Rathore",
            "email": req.email,
            "role": "veteran",
            "rank": "Captain",
            "service_branch": "Indian Army (Para SF)",
            "total_points": 250,
            "current_streak": 5,
            "tasks_completed": 12,
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
                "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200",
                "isEmailVerified": True,
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
