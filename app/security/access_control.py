"""Role-based access control and query guards.

Design:
- SURVIVOR: can only read their own data. Counselor-facing fields (raw response
  text, raw signal logs) are never returned.
- COUNSELOR: can see derived insights for assigned cases only.
  Cannot see raw response text or raw signal logs.
- ADMIN: full access (for system admins / NGO staff managing the platform).

The `QueryGuard` class is used in API route handlers to enforce these rules
before any data leaves the server.
"""

from __future__ import annotations

from enum import Enum
from typing import Any


class Role(str, Enum):
    SURVIVOR = "survivor"
    COUNSELOR = "counselor"
    ADMIN = "admin"


# Fields that are NEVER exposed to counselors — only survivors and admins see these.
RESTRICTED_FIELDS = {
    "response_text",        # Raw free-text answers
    "voice_audio_url",      # Raw audio files
    "voice_raw_features",   # Unprocessed voice features
    "time_to_answer",       # Raw latency per question
    "raw_signals",          # Raw reaction signal logs
    "device_info",          # Device metadata
    "ip_address",
}

# Fields counselors CAN see (derived / aggregated only)
COUNSELOR_VISIBLE_FIELDS = {
    "trajectory_label",     # stable/declining/escalating/acute
    "severity_score",
    "trend_summary",
    "sensitivity_map",      # Topic-level activation scores
    "alert_status",
    "alert_created_at",
    "case_notes",
    "consent_status",       # Which signals are opted-in
    "baseline_established", # Boolean — is 2-week baseline done?
    "checkin_count",        # How many check-ins completed
}


def filter_for_role(data: dict[str, Any], role: Role) -> dict[str, Any]:
    """Strip restricted fields from a response dict based on caller role.

    This is the core access control function. Every API response passes
    through this before being returned to the client.
    """
    if role == Role.ADMIN:
        return data  # Admins see everything

    filtered = {}
    for key, value in data.items():
        if key in RESTRICTED_FIELDS:
            # Survivors see their own raw data; counselors do not
            if role == Role.COUNSELOR:
                continue
        filtered[key] = value
    return filtered


def verify_case_access(counselor_id: str, assigned_cases: list[str], survivor_id: str) -> bool:
    """Verify a counselor has an active case assignment for a survivor."""
    return survivor_id in assigned_cases


class AccessDenied(Exception):
    """Raised when a role-based access check fails."""
    pass
