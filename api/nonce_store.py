from __future__ import annotations

import os
import secrets
import time
from dataclasses import dataclass
from typing import Optional

from api.redis_client import get_redis


def nonce_ttl_seconds() -> int:
    try:
        return int(os.getenv("AUTH_NONCE_TTL_SECONDS", "300"))
    except ValueError:
        return 300


@dataclass(frozen=True)
class NonceIssue:
    nonce: str
    expires_at: int


# In-memory fallback (dev-only)
_memory: dict[str, tuple[str, int]] = {}


def _key(wallet_address: str) -> str:
    return f"auth:nonce:{wallet_address}"


async def issue_nonce(wallet_address: str) -> NonceIssue:
    nonce = secrets.token_urlsafe(24)
    expires_at = int(time.time()) + nonce_ttl_seconds()
    redis = get_redis()
    if redis is not None:
        await redis.setex(_key(wallet_address), nonce_ttl_seconds(), nonce)
    else:
        _memory[wallet_address] = (nonce, expires_at)
    return NonceIssue(nonce=nonce, expires_at=expires_at)


async def consume_nonce(wallet_address: str, nonce: str) -> bool:
    redis = get_redis()
    if redis is not None:
        stored = await redis.get(_key(wallet_address))
        if not stored or stored != nonce:
            return False
        await redis.delete(_key(wallet_address))
        return True

    stored = _memory.get(wallet_address)
    if not stored:
        return False
    expected, expires_at = stored
    if int(time.time()) > int(expires_at):
        _memory.pop(wallet_address, None)
        return False
    if expected != nonce:
        return False
    _memory.pop(wallet_address, None)
    return True
