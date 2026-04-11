from __future__ import annotations

import asyncio
import base64
import logging
from typing import Any

from algosdk.v2client.algod import AlgodClient


logger = logging.getLogger(__name__)


def _extract_txn_dict(raw: dict[str, Any]) -> dict[str, Any]:
    txn = raw.get("txn", {})
    if "txn" in txn and isinstance(txn["txn"], dict):
        return txn["txn"]
    return txn


def _decode_note(note_b64: str | None) -> str:
    if not note_b64:
        return ""
    return base64.b64decode(note_b64).decode("utf-8")


async def verify_payment(
    tx_id: str,
    job_id: str,
    expected_amount: int,
    expected_receiver: str,
    algod_url: str,
    algod_token: str,
) -> bool:
    try:
        client = AlgodClient(algod_token=algod_token, algod_address=algod_url)

        tx_info: dict[str, Any] = {}
        # Allow short propagation/confirmation lag on public TestNet nodes.
        for _ in range(8):
            tx_info = client.pending_transaction_info(tx_id)
            if tx_info and tx_info.get("txn") and tx_info.get("confirmed-round"):
                break
            await asyncio.sleep(1)

        if not tx_info or not tx_info.get("txn"):
            # Some algod deployments do not expose transaction lookups by tx id here,
            # so this fallback is intentionally defensive.
            info_fn = getattr(client, "transaction_info", None)
            if callable(info_fn):
                try:
                    tx_info = info_fn(tx_id)
                except TypeError:
                    tx_info = {}

        txn = _extract_txn_dict(tx_info)
        tx_type = txn.get("type")
        amount = int(txn.get("amt", 0))
        receiver = txn.get("rcv", "")
        note = _decode_note(txn.get("note"))
        confirmed_round = tx_info.get("confirmed-round")

        if tx_type != "pay":
            return False
        if amount < expected_amount:
            return False
        if receiver != expected_receiver:
            return False
        if note != f"p2p-compute:{job_id}":
            return False
        if not confirmed_round:
            return False

        return True
    except Exception as exc:
        logger.exception("payment verification failed: %s", exc)
        return False
