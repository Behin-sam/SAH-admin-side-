"""Field-level encryption for sensitive columns at rest.

Uses Fernet (AES-128-CBC + HMAC) via the cryptography library.
Encrypts at the application layer so it works across any DB backend.

Clinical note: In a real deployment, key rotation and HSM-backed keys
would be required. This prototype uses a static Fernet key.
"""

from __future__ import annotations

import json
from functools import lru_cache

from cryptography.fernet import Fernet

from app.config import settings


@lru_cache
def _get_fernet() -> Fernet:
    if settings.ENCRYPTION_KEY:
        return Fernet(settings.ENCRYPTION_KEY.encode())
    # Dev-only fallback — generates a random key per process.
    # In production, this MUST be a stable, backed-up key.
    return Fernet(Fernet.generate_key())


def encrypt_string(plaintext: str) -> bytes:
    """Encrypt a plaintext string. Returns ciphertext bytes."""
    return _get_fernet().encrypt(plaintext.encode("utf-8"))


def decrypt_string(ciphertext: bytes) -> str:
    """Decrypt ciphertext back to a plaintext string."""
    return _get_fernet().decrypt(ciphertext).decode("utf-8")


def encrypt_dict(data: dict) -> bytes:
    """Encrypt a JSON-serializable dict."""
    return _get_fernet().encrypt(json.dumps(data, default=str).encode("utf-8"))


def decrypt_dict(ciphertext: bytes) -> dict:
    """Decrypt ciphertext back to a dict."""
    return json.loads(_get_fernet().decrypt(ciphertext).decode("utf-8"))
