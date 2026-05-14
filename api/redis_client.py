from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

try:
    import redis.asyncio as redis
except Exception:  # pragma: no cover
    redis = None


@lru_cache(maxsize=1)
def get_redis_url() -> str:
    return os.getenv("REDIS_URL", "").strip()


@lru_cache(maxsize=1)
def get_redis() -> Optional["redis.Redis"]:
    if redis is None:
        return None
    url = get_redis_url()
    if not url:
        return None
    return redis.from_url(url, encoding="utf-8", decode_responses=True)
