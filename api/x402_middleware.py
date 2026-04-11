from __future__ import annotations

import json
import os
import time
import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from api.payment_verifier import verify_payment


class X402Middleware(BaseHTTPMiddleware):
    def __init__(self, app: Any):
        super().__init__(app)
        self.pending_sessions: dict[str, dict[str, int | str]] = {}

    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Any]]):
        if request.method != "POST" or request.url.path != "/job":
            return await call_next(request)

        provider_wallet = os.getenv("PROVIDER_WALLET", "")
        price_per_token = int(os.getenv("JOB_PRICE_PER_TOKEN_MICROALGO", "100"))
        algod_url = os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud")
        algod_token = os.getenv("ALGOD_TOKEN", "")

        raw_body = await request.body()
        try:
            body = json.loads(raw_body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            body = {}

        tokens = int(body.get("tokens", 0))
        expected_amount = max(1, tokens * price_per_token)
        tx_id = request.headers.get("X-Payment-TxId")
        job_id = str(body.get("job_id", ""))

        if not tx_id:
            job_id = str(uuid.uuid4())
            expiry = int(time.time()) + 120
            note = f"p2p-compute:{job_id}"
            self.pending_sessions[job_id] = {
                "amount": expected_amount,
                "expiry": expiry,
                "receiver": provider_wallet,
            }

            response = JSONResponse(
                status_code=402,
                content={
                    "error": "payment_required",
                    "job_id": job_id,
                    "payment": {
                        "amount_microalgo": expected_amount,
                        "receiver": provider_wallet,
                        "network": "algorand-testnet",
                        "expires_at": expiry,
                        "note": note,
                    },
                },
            )
            response.headers["X-Payment-Required"] = "true"
            response.headers["X-Payment-Job-Id"] = job_id
            response.headers["X-Payment-Amount"] = str(expected_amount)
            response.headers["X-Payment-Address"] = provider_wallet
            response.headers["X-Payment-Expiry"] = str(expiry)
            return response

        session = self.pending_sessions.get(job_id)
        if not session:
            return JSONResponse(status_code=402, content={"error": "payment_invalid", "reason": "unknown_job"})

        if int(session.get("expiry", 0)) < int(time.time()):
            return JSONResponse(status_code=402, content={"error": "payment_invalid", "reason": "expired"})

        valid = await verify_payment(
            tx_id=tx_id,
            job_id=job_id,
            expected_amount=int(session.get("amount", expected_amount)),
            expected_receiver=str(session.get("receiver", provider_wallet)),
            algod_url=algod_url,
            algod_token=algod_token,
        )
        if not valid:
            return JSONResponse(status_code=402, content={"error": "payment_invalid"})

        request.state.job_id = job_id
        return await call_next(request)
