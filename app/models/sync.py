"""Offline-first sync support.

In low-connectivity environments, check-ins happen on-device and sync
when connectivity returns. This model tracks pending sync operations
and handles conflict resolution (last-write-wins with timestamp).

Design note: The actual offline storage (SQLite, IndexedDB, etc.) is
a frontend concern. This model tracks the server-side sync queue that
the client pushes to when online.

Conflict resolution: We use a vector-clock-lite approach — each payload
carries a `client_timestamp`. The server accepts the most recent value.
For the prototype, last-write-wins is sufficient; a production system
would use CRDTs or operational transforms for collaborative fields.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Column, DateTime, Enum, Integer, String, Text
from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class SyncStatus(str, PyEnum):
    PENDING = "pending"
    SYNCED = "synced"
    CONFLICT = "conflict"
    FAILED = "failed"


class SyncQueue(Base):
    """Queue of offline operations waiting to sync."""
    __tablename__ = "sync_queue"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    survivor_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    operation = Column(String(50), nullable=False)  # "create_checkin", "create_signal", "update_consent"
    payload = Column(JSON, nullable=False)          # The actual data to sync

    # Client metadata
    client_timestamp = Column(DateTime(timezone=True), nullable=False)
    device_id = Column(String(100), nullable=True)

    # Server processing
    status = Column(Enum(SyncStatus), default=SyncStatus.PENDING)
    server_timestamp = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
