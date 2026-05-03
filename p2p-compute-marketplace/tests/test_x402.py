from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from api.main import app


@pytest.mark.asyncio
async def test_job_without_payment():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/job", json={"type": "inference", "tokens": 100, "payload": "hello"})

    assert response.status_code == 402
    assert response.headers.get("X-Payment-Required") == "true"
    assert response.headers.get("X-Payment-Job-Id")
    assert response.headers.get("X-Payment-Amount")
    assert response.headers.get("X-Payment-Address") is not None
    assert response.headers.get("X-Payment-Expiry")


@pytest.mark.asyncio
async def test_job_with_invalid_txid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        first = await client.post("/job", json={"type": "inference", "tokens": 50, "payload": "x"})
        job_id = first.json()["job_id"]

    with patch("api.x402_middleware.verify_payment", new=AsyncMock(return_value=False)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/job",
                json={"job_id": job_id, "type": "inference", "tokens": 50, "payload": "x"},
                headers={"X-Payment-TxId": "fakeid"},
            )

    assert response.status_code == 402
    assert response.json()["error"] == "payment_invalid"


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
