from __future__ import annotations

import hashlib
import json
import random
from typing import Any

import httpx


def generate_expected_hash(task: dict) -> str:
    payload = str(task.get("payload", ""))
    tokens = int(task.get("tokens", 0))
    return hashlib.sha256(f"{payload}{tokens}".encode("utf-8")).hexdigest()


def verify_output(result: dict, task: dict) -> bool:
    expected_hash = generate_expected_hash(task)
    actual_hash = str(result.get("result_hash", ""))
    ok = expected_hash == actual_hash
    print(
        json.dumps(
            {
                "event": "output_verification",
                "ok": ok,
                "expected": expected_hash,
                "actual": actual_hash,
            }
        )
    )
    return ok


async def spot_rerun(task: dict, provider_endpoint: str, wallet: Any, algod_client: Any) -> bool:
    async with httpx.AsyncClient(timeout=30) as client:
        first = await client.post(f"{provider_endpoint}/job", json={**task, "job_id": ""})
    if first.status_code != 402:
        print(json.dumps({"event": "spot_rerun", "ok": False, "reason": "expected_402"}))
        return False

    payload = first.json()
    payment = payload.get("payment", {})
    job_id = payload.get("job_id", "")
    tx_id = await wallet.sign_and_submit_payment(
        receiver=payment.get("receiver", ""),
        amount=int(payment.get("amount_microalgo", 0)),
        note=payment.get("note", ""),
        algod_client=algod_client,
    )

    async with httpx.AsyncClient(timeout=60) as client:
        second = await client.post(
            f"{provider_endpoint}/job",
            json={**task, "job_id": job_id},
            headers={"X-Payment-TxId": tx_id},
        )
    if second.status_code != 200:
        print(json.dumps({"event": "spot_rerun", "ok": False, "reason": f"status_{second.status_code}"}))
        return False

    rerun_result = second.json()
    ok = verify_output(rerun_result, task)
    if not ok:
        print(json.dumps({"event": "FRAUD_DETECTED", "provider": provider_endpoint}))
    return ok


def should_spot_check() -> bool:
    return random.random() < 0.10
