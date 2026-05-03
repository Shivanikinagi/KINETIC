from __future__ import annotations

import logging
import os
import sys
import time
import uuid
from typing import Any, Callable

import structlog
from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def configure_structlog() -> None:
    level_name = os.getenv("LOG_LEVEL", "INFO").strip().upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def error_envelope(
    *,
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: Any | None = None,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    payload: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id,
        }
    }
    if details is not None:
        payload["error"]["details"] = details

    headers = {
        "X-Request-ID": str(request_id or ""),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "strict-origin-when-cross-origin",
    }
    return JSONResponse(status_code=status_code, content=payload, headers=headers)


def install_exception_handlers(app) -> None:
    @app.exception_handler(RequestValidationError)
    async def _validation_error_handler(request: Request, exc: RequestValidationError):
        return error_envelope(
            request=request,
            status_code=422,
            code="validation_error",
            message="Validation error",
            details=exc.errors(),
        )

    @app.exception_handler(HTTPException)
    async def _http_exception_handler(request: Request, exc: HTTPException):
        # Preserve provided detail but normalize shape
        detail = exc.detail if isinstance(exc.detail, (str, dict, list)) else str(exc.detail)
        return error_envelope(
            request=request,
            status_code=int(exc.status_code),
            code="http_error",
            message=detail if isinstance(detail, str) else "Request failed",
            details=detail if not isinstance(detail, str) else None,
        )

    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception):
        logger = structlog.get_logger("api")
        logger.exception("unhandled_exception", path=str(request.url.path))
        return error_envelope(
            request=request,
            status_code=500,
            code="internal_error",
            message="Internal server error",
        )


def request_context_middleware() -> Callable:
    logger = structlog.get_logger("api")

    async def middleware(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=str(request.url.path),
        )

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            logger.warning("request_failed", elapsed_ms=elapsed_ms, exc_info=True)
            raise

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        logger.info("request", status_code=response.status_code, elapsed_ms=elapsed_ms)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    return middleware
