from __future__ import annotations

import os
import time
from collections.abc import Awaitable, Callable

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from api.redis_client import get_redis
from api.security import api_key_rate_limit_bucket


def _rpm_limit() -> int:
    try:
        return int(os.getenv("API_KEY_RATE_LIMIT_RPM", "120"))
    except ValueError:
        return 120


class ApiKeyRateLimitMiddleware(BaseHTTPMiddleware):
    """Redis-backed rate limiting per API key.

    Enabled only when REDIS_URL is set.
    """

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable]):
        redis = get_redis()
        if redis is None:
            return await call_next(request)

        raw_key = request.headers.get("X-API-Key")
        if not raw_key:
            return await call_next(request)

        bucket = api_key_rate_limit_bucket(raw_key)
        minute = int(time.time() // 60)
        redis_key = f"rl:api_key:{bucket}:{minute}"

        count = await redis.incr(redis_key)
        if count == 1:
            await redis.expire(redis_key, 120)

        if int(count) > _rpm_limit():
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "rate_limited",
                        "message": "Rate limit exceeded",
                        "details": {"limit_rpm": _rpm_limit()},
                        "request_id": getattr(request.state, "request_id", None),
                    }
                },
                headers={"Retry-After": "60"},
            )

        return await call_next(request)
