"""On-chain proof submitter — writes compute-result hashes to Algorand TestNet."""
from __future__ import annotations

import base64
import logging
import os
from typing import Any

from algosdk import transaction
from algosdk.account import address_from_private_key
from algosdk.mnemonic import to_private_key
from algosdk.v2client.algod import AlgodClient

logger = logging.getLogger(__name__)


def _get_agent_client() -> tuple[AlgodClient, str, str]:
    """Return (algod_client, agent_address, agent_private_key)."""
    algod_url = os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud")
    algod_token = os.getenv("ALGOD_TOKEN", "")
    client = AlgodClient(algod_token=algod_token, algod_address=algod_url)

    mnemonic = os.getenv("AGENT_MNEMONIC", "").strip()
    if not mnemonic:
        raise RuntimeError("AGENT_MNEMONIC not configured")

    private_key = to_private_key(mnemonic)
    address = address_from_private_key(private_key)
    return client, address, private_key


def _build_explorer_url(tx_id: str) -> str:
    network = os.getenv("ALGORAND_NETWORK", "testnet").lower()
    if network == "mainnet":
        return f"https://allo.info/tx/{tx_id}"
    return f"https://testnet.explorer.perawallet.app/tx/{tx_id}"


async def submit_job_proof(
    job_id: str,
    result_hash: str,
    provider_address: str = "",
) -> dict[str, Any]:
    """
    Submit a 0-ALGO payment transaction with the job proof in the note field.

    Returns {"tx_id": "...", "explorer_url": "..."} on success,
    or {"tx_id": "", "explorer_url": "", "error": "..."} on failure.
    """
    try:
        client, sender, private_key = _get_agent_client()

        # Receiver can be provider or sender itself (keeps it simple)
        receiver = provider_address if provider_address else sender

        params = client.suggested_params()
        # Ensure flat fee so we don't overpay
        params.flat_fee = True
        params.fee = 1000

        note = f"p2p-proof:{job_id}:{result_hash}".encode("utf-8")

        pay_txn = transaction.PaymentTxn(
            sender=sender,
            sp=params,
            receiver=receiver,
            amt=0,
            note=note,
        )

        signed_txn = pay_txn.sign(private_key)
        tx_id = client.send_transaction(signed_txn)

        # Wait for confirmation (best-effort; don't block forever)
        try:
            transaction.wait_for_confirmation(client, tx_id, timeout=12)
        except Exception:
            pass

        explorer_url = _build_explorer_url(tx_id)
        logger.info(f"Proof submitted on-chain: {tx_id} for job {job_id}")
        return {"tx_id": tx_id, "explorer_url": explorer_url}

    except Exception as exc:
        logger.exception("Failed to submit on-chain proof for job %s: %s", job_id, exc)
        return {"tx_id": "", "explorer_url": "", "error": str(exc)}
