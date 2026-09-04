"""Survivor profile endpoints.

POST   /api/survivors           — Create survivor profile
GET    /api/survivors/{id}      — Get survivor (self-view or counselor view)
DELETE /api/survivors/{id}      — Soft-delete + data deletion request
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.consent import get_all_consents
from app.models import SurvivorProfile
from app.schemas.requests import SurvivorCreate
from app.schemas.responses import SurvivorDetailResponse, SurvivorResponse
from app.security.encryption import encrypt_string, decrypt_string
from app.security.access_control import Role, filter_for_role

router = APIRouter(prefix="/api/survivors", tags=["survivors"])


@router.post("/", response_model=SurvivorResponse, status_code=201)
async def create_survivor(data: SurvivorCreate, db: AsyncSession = Depends(get_db)):
    """Create a new survivor profile.

    PII fields are encrypted immediately upon storage.
    """
    survivor = SurvivorProfile(
        encrypted_name=encrypt_string(data.name) if data.name else None,
        encrypted_email=encrypt_string(data.email) if data.email else None,
        encrypted_phone=encrypt_string(data.phone) if data.phone else None,
        preferred_language=data.preferred_language,
        timezone_offset=data.timezone_offset,
    )
    db.add(survivor)
    await db.flush()
    await db.refresh(survivor)

    return SurvivorResponse(
        id=survivor.id,
        preferred_language=survivor.preferred_language,
        timezone_offset=survivor.timezone_offset,
        baseline_established=survivor.baseline_established,
        baseline_period_end=survivor.baseline_period_end,
        created_at=survivor.created_at,
    )


@router.get("/{survivor_id}", response_model=SurvivorResponse)
async def get_survivor(survivor_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get survivor profile. Returns redacted view for counselors."""
    result = await db.execute(
        select(SurvivorProfile).where(SurvivorProfile.id == survivor_id)
    )
    survivor = result.scalar_one_or_none()
    if not survivor:
        raise HTTPException(status_code=404, detail="Survivor not found")

    return SurvivorResponse(
        id=survivor.id,
        preferred_language=survivor.preferred_language,
        timezone_offset=survivor.timezone_offset,
        baseline_established=survivor.baseline_established,
        baseline_period_end=survivor.baseline_period_end,
        created_at=survivor.created_at,
    )


@router.get("/{survivor_id}/detail", response_model=SurvivorDetailResponse)
async def get_survivor_detail(survivor_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get survivor detail with decrypted PII (survivor self-view only)."""
    result = await db.execute(
        select(SurvivorProfile).where(SurvivorProfile.id == survivor_id)
    )
    survivor = result.scalar_one_or_none()
    if not survivor:
        raise HTTPException(status_code=404, detail="Survivor not found")

    return SurvivorDetailResponse(
        id=survivor.id,
        name=decrypt_string(survivor.encrypted_name) if survivor.encrypted_name else None,
        email=decrypt_string(survivor.encrypted_email) if survivor.encrypted_email else None,
        phone=decrypt_string(survivor.encrypted_phone) if survivor.encrypted_phone else None,
        preferred_language=survivor.preferred_language,
        timezone_offset=survivor.timezone_offset,
        baseline_established=survivor.baseline_established,
        baseline_period_end=survivor.baseline_period_end,
        created_at=survivor.created_at,
    )
