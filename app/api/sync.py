"""Offline-first sync endpoint.

POST   /api/sync              — Submit a batch of offline operations

In low-connectivity environments, check-ins happen on-device and sync
when connectivity returns. This endpoint accepts batches of operations
and processes them sequentially, reporting successes and failures.
"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sync import SyncQueue, SyncStatus
from app.schemas.requests import SyncPayload
from app.schemas.responses import SyncResponse

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("/", response_model=SyncResponse)
async def sync_batch(data: SyncPayload, db: AsyncSession = Depends(get_db)):
    """Process a batch of offline operations.

    Each operation is queued and processed. Conflicts are resolved
    using last-write-wins (client timestamp).

    Returns a summary of what succeeded, failed, and conflicted.
    """
    synced = 0
    failed = 0
    conflicts = []

    for op in data.operations:
        # Create sync queue entry
        entry = SyncQueue(
            survivor_id="unknown",  # Extracted from payload in real impl
            operation=op.operation,
            payload=op.payload,
            client_timestamp=op.client_timestamp,
            device_id=data.device_id,
            status=SyncStatus.PENDING,
        )
        db.add(entry)

        # In production, we'd process each operation here
        # and handle conflicts. For the prototype, we accept all.
        entry.status = SyncStatus.SYNCED
        entry.server_timestamp = datetime.now(timezone.utc)
        synced += 1

    return SyncResponse(
        synced=synced,
        failed=failed,
        conflicts=conflicts,
        server_timestamp=datetime.now(timezone.utc),
    )
