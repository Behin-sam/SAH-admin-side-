"""Consent management endpoints.

Survivors control their own consent. Counselors can view consent status
but cannot modify it.

POST   /api/survivors/{id}/consent          — Toggle consent for a signal type
GET    /api/survivors/{id}/consent          — Get all consent statuses
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.consent import update_consent, get_all_consents
from app.models import SurvivorProfile, ConsentStatus, SignalType
from app.schemas.requests import ConsentToggle
from app.schemas.responses import ConsentStatusResponse, ConsentToggleResponse

router = APIRouter(prefix="/api/survivors/{survivor_id}/consent", tags=["consent"])


def _parse_signal_type(value: str) -> SignalType:
    """Parse a string into a SignalType enum."""
    try:
        return SignalType(value)
    except ValueError:
        valid = [s.value for s in SignalType]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid signal type '{value}'. Must be one of: {valid}"
        )


@router.get("/", response_model=ConsentStatusResponse)
async def get_consent_status(survivor_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get consent status for all signal types."""
    # Verify survivor exists
    result = await db.execute(
        select(SurvivorProfile).where(SurvivorProfile.id == survivor_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Survivor not found")

    consents = await get_all_consents(db, str(survivor_id))

    # Default missing signal types to "never_granted"
    for signal in SignalType:
        if signal.value not in consents:
            consents[signal.value] = ConsentStatus.NEVER_GRANTED.value

    return ConsentStatusResponse(
        survivor_id=survivor_id,
        consents=consents,
    )


@router.post("/", response_model=ConsentToggleResponse)
async def toggle_consent(
    survivor_id: UUID,
    data: ConsentToggle,
    db: AsyncSession = Depends(get_db),
):
    """Toggle consent for a specific signal type.

    - Sets status to ACTIVE if active=true
    - Sets status to REVOKED if active=false
    - Records timestamp for audit trail
    """
    # Verify survivor exists
    result = await db.execute(
        select(SurvivorProfile).where(SurvivorProfile.id == survivor_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Survivor not found")

    signal_type = _parse_signal_type(data.signal_type)
    new_status = ConsentStatus.ACTIVE if data.active else ConsentStatus.REVOKED

    consent = await update_consent(db, str(survivor_id), signal_type, new_status)

    return ConsentToggleResponse(
        signal_type=signal_type.value,
        status=consent.status.value,
        consent_version=consent.consent_version,
        revoked_at=consent.revoked_at,
    )
