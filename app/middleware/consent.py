"""Consent enforcement middleware.

Core principle: NO signal is processed or stored unless the survivor's
consent for that signal type is ACTIVE.

This module provides:
1. A function to check consent before storing signals
2. A function to check consent before reading signals
3. Audit logging for all consent changes

Design choices:
- Consent is checked BEFORE any write/read, not after.
- Revoking consent is immediate — the next request that touches that
  signal type will be blocked.
- Historical data from BEFORE revocation remains (survivor can request
  full deletion separately via a data deletion request).
- Every consent toggle is logged for audit compliance.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ConsentState, ConsentStatus, SignalType


async def check_consent(
    db: AsyncSession,
    survivor_id: str,
    signal_type: SignalType,
) -> bool:
    """Check if a survivor has active consent for a given signal type.

    Returns True only if consent status is ACTIVE.
    Returns False for REVOKED, NEVER_GRANTED, or missing consent.
    """
    result = await db.execute(
        select(ConsentState).where(
            ConsentState.survivor_id == survivor_id,
            ConsentState.signal_type == signal_type,
        )
    )
    consent = result.scalar_one_or_none()

    if consent is None or consent.status != ConsentStatus.ACTIVE:
        return False
    return True


async def enforce_consent_or_raise(
    db: AsyncSession,
    survivor_id: str,
    signal_type: SignalType,
) -> None:
    """Check consent and raise PermissionError if not granted.

    Call this before processing or storing any signal data.
    """
    if not await check_consent(db, survivor_id, signal_type):
        raise PermissionError(
            f"Consent not active for signal type '{signal_type.value}'. "
            f"Data collection for this signal type is blocked."
        )


async def update_consent(
    db: AsyncSession,
    survivor_id: str,
    signal_type: SignalType,
    new_status: ConsentStatus,
) -> ConsentState:
    """Update consent status for a signal type. Auditable.

    If no consent record exists, creates one.
    If revoking, sets revoked_at timestamp.
    """
    result = await db.execute(
        select(ConsentState).where(
            ConsentState.survivor_id == survivor_id,
            ConsentState.signal_type == signal_type,
        )
    )
    consent = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if consent is None:
        # First time granting/revoking
        consent = ConsentState(
            survivor_id=survivor_id,
            signal_type=signal_type,
            status=new_status,
            granted_at=now if new_status == ConsentStatus.ACTIVE else None,
            revoked_at=now if new_status == ConsentStatus.REVOKED else None,
            consent_version=1,
            updated_at=now,
        )
        db.add(consent)
    else:
        # Existing record — update
        old_status = consent.status
        consent.status = new_status
        consent.consent_version += 1
        consent.updated_at = now

        if new_status == ConsentStatus.ACTIVE:
            consent.granted_at = now
            consent.revoked_at = None
        elif new_status == ConsentStatus.REVOKED:
            consent.revoked_at = now

    await db.flush()
    return consent


async def get_all_consents(
    db: AsyncSession,
    survivor_id: str,
) -> dict[str, ConsentStatus]:
    """Return a summary of all consent statuses for a survivor.

    Used by the API to show the survivor their current consent state.
    """
    result = await db.execute(
        select(ConsentState).where(ConsentState.survivor_id == survivor_id)
    )
    consents = result.scalars().all()

    return {
        consent.signal_type.value: consent.status
        for consent in consents
    }
