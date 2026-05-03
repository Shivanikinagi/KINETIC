from __future__ import annotations

import argparse
import asyncio
import base64
import json
import os
from datetime import UTC, datetime
from uuid import UUID

import httpx
from algosdk.abi.method import Method
from algosdk.atomic_transaction_composer import (
    AccountTransactionSigner,
    AtomicTransactionComposer,
    TransactionWithSigner,
)
from algosdk.encoding import encode_address
from algosdk.logic import get_application_address
from algosdk.transaction import PaymentTxn
from algosdk.v2client.algod import AlgodClient
from algosdk.v2client.indexer import IndexerClient
from dotenv import load_dotenv

from agent import job_matcher
from agent.verifier import should_spot_check, spot_rerun, verify_output
from agent.wallet import AutonomousWallet, BudgetExceededError


class ProviderFailedError(Exception):
    pass


class ComputeAgent:
    def __init__(
        self,
        task: dict,
        algod_url: str,
        algod_token: str,
        registry_app_id: int,
        agent_mnemonic: str,
        budget_per_job: int,
        daily_budget: int,
        escrow_app_id: int = 0,
    ):
        self.task = task
        self.registry_app_id = registry_app_id
        self.escrow_app_id = escrow_app_id
        self.indexer_url = os.getenv("INDEXER_URL", "https://testnet-idx.algonode.cloud")
        self.algod_client = AlgodClient(algod_token=algod_token, algod_address=algod_url)
        self.indexer_client = IndexerClient(indexer_token="", indexer_address=self.indexer_url)
        self.wallet = AutonomousWallet(agent_mnemonic, self.algod_client, budget_per_job, daily_budget)

    @staticmethod
    def _decode_provider_info(raw_value: bytes) -> dict:
        abi = Method.from_signature("get_provider(address)(uint64,byte[],uint64,byte[],uint64,uint64,uint64,byte[],byte[])")
        decoded = abi.returns.type.decode(raw_value)
        gpu_raw = bytes(decoded[1]) if not isinstance(decoded[1], (bytes, bytearray)) else decoded[1]
        endpoint_raw = bytes(decoded[3]) if not isinstance(decoded[3], (bytes, bytearray)) else decoded[3]
        org_raw = bytes(decoded[7]) if not isinstance(decoded[7], (bytes, bytearray)) else decoded[7]
        logo_raw = bytes(decoded[8]) if not isinstance(decoded[8], (bytes, bytearray)) else decoded[8]
        gpu_model = gpu_raw.decode("utf-8", errors="ignore").rstrip("\x00")
        endpoint = endpoint_raw.decode("utf-8", errors="ignore").rstrip("\x00")
        org_name = org_raw.decode("utf-8", errors="ignore").rstrip("\x00")
        logo_url = logo_raw.decode("utf-8", errors="ignore").rstrip("\x00")
        return {
            "vram_gb": int(decoded[0]),
            "gpu_model": gpu_model,
            "price_per_hour": int(decoded[2]),
            "endpoint": endpoint,
            "uptime_score": int(decoded[4]),
            "active": int(decoded[5]),
            "badge_app_id": int(decoded[6]),
            "org_name": org_name,
            "logo_url": logo_url,
        }

    @staticmethod
    def _decode_provider_address(box_name_b64: str) -> str | None:
        raw = base64.b64decode(box_name_b64)
        prefix = b"provider"
        if not raw.startswith(prefix):
            return None
        key = raw[len(prefix) :]
        if len(key) != 32:
            return None
        return encode_address(key)

    async def discover_providers(self) -> list[dict]:
        providers: list[dict] = []

        if self.registry_app_id > 0:
            try:
                boxes = self.indexer_client.application_boxes(self.registry_app_id).get("boxes", [])
                for box in boxes:
                    provider_addr = self._decode_provider_address(box.get("name", ""))
                    if not provider_addr:
                        continue
                    box_value = self.indexer_client.application_box_by_name(
                        self.registry_app_id,
                        base64.b64decode(box["name"]),
                    ).get("value", "")
                    parsed = self._decode_provider_info(base64.b64decode(box_value))
                    if parsed.get("active", 0) != 1:
                        continue
                    providers.append({"address": provider_addr, **parsed, "price_per_token": parsed["price_per_hour"]})
            except Exception as exc:
                self.log(f"registry discovery failed: {exc}")

        async with httpx.AsyncClient(timeout=10) as client:
            for provider in providers:
                endpoint = str(provider.get("endpoint", "")).rstrip("/")
                if not endpoint:
                    continue
                try:
                    resp = await client.get(f"{endpoint}/providers/me")
                    if resp.status_code == 200:
                        live = resp.json()
                        provider["price_per_token"] = int(live.get("price_per_hour", provider.get("price_per_hour", 0)))
                        provider["vram_gb"] = int(live.get("vram_gb", provider.get("vram_gb", 0)))
                        provider["gpu_model"] = str(live.get("gpu_model", provider.get("gpu_model", "")))
                except Exception as exc:
                    self.log(f"provider live info failed for {endpoint}: {exc}")

        if not providers:
            endpoints = [
                ep.strip()
                for ep in os.getenv("PROVIDER_ENDPOINT", "").split(",")
                if ep.strip()
            ]
            for endpoint in endpoints:
                providers.append(
                    {
                        "endpoint": endpoint,
                        "vram_gb": int(os.getenv("PROVIDER_VRAM_GB", "8")),
                        "gpu_model": os.getenv("PROVIDER_GPU_MODEL", "RTX3090"),
                        "price_per_hour": int(os.getenv("JOB_PRICE_PER_TOKEN_MICROALGO", "100")),
                        "price_per_token": int(os.getenv("JOB_PRICE_PER_TOKEN_MICROALGO", "100")),
                        "uptime_score": 100,
                    }
                )
        return providers

    async def lock_escrow(self, provider_address: str, job_id: str, expected_hash: str, amount: int) -> None:
        if self.escrow_app_id <= 0:
            return

        signer = AccountTransactionSigner(self.wallet.private_key)
        composer = AtomicTransactionComposer()
        sp = self.algod_client.suggested_params()
        pay_txn = PaymentTxn(
            sender=self.wallet.address,
            sp=sp,
            receiver=get_application_address(self.escrow_app_id),
            amt=amount,
        )
        composer.add_transaction(TransactionWithSigner(pay_txn, signer))
        method = Method.from_signature("lock_payment(byte[],address,byte[],uint64)void")

        job_id_bytes = job_id.encode("utf-8")
        proof_bytes = expected_hash.encode("utf-8")
        box_key = b"job" + len(job_id_bytes).to_bytes(2, "big") + job_id_bytes
        timeout_rounds = 20

        composer.add_method_call(
            app_id=self.escrow_app_id,
            method=method,
            sender=self.wallet.address,
            sp=self.algod_client.suggested_params(),
            signer=signer,
            method_args=[job_id_bytes, provider_address, proof_bytes, timeout_rounds],
            boxes=[(0, box_key)],
            accounts=[provider_address],
        )
        result = composer.execute(self.algod_client, 4)
        self.log(f"ESCROW_LOCKED job={job_id} tx_id={result.tx_ids[-1]}")

    async def request_job(self, provider: dict) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(provider["endpoint"] + "/job", json={**self.task, "job_id": ""})

        if resp.status_code != 402:
            raise ProviderFailedError(f"Expected 402, got {resp.status_code}")

        payment_info = resp.json()["payment"]
        job_id = resp.json()["job_id"]
        amount = payment_info["amount_microalgo"]
        receiver = payment_info["receiver"]
        note = payment_info["note"]

        expected_hash = self.task.get("expected_result_hash")
        if not expected_hash:
            from agent.verifier import generate_expected_hash

            expected_hash = generate_expected_hash(self.task)
            self.task["expected_result_hash"] = expected_hash

        try:
            UUID(job_id)
            await self.lock_escrow(receiver, job_id, str(expected_hash), int(amount))
        except Exception as exc:
            self.log(f"ESCROW_LOCK_SKIPPED job={job_id} reason={exc}")

        self.log(f"Provider {provider['endpoint']} requested {amount} microALGO for job {job_id}")

        tx_id = await self.wallet.sign_and_submit_payment(receiver, amount, note, self.algod_client)
        self.log(f"Payment submitted: tx_id={tx_id}")

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                provider["endpoint"] + "/job",
                json={**self.task, "job_id": job_id},
                headers={"X-Payment-TxId": tx_id},
            )

        if resp.status_code == 402:
            raise ProviderFailedError("Payment verification failed on provider side")
        if resp.status_code != 200:
            raise ProviderFailedError(f"Job failed: {resp.status_code}")

        return resp.json()

    async def trigger_refund(self, job_id: str):
        if self.escrow_app_id <= 0:
            self.log(f"REFUND_TRIGGERED for job {job_id} (escrow disabled)")
            return

        job_id_bytes = job_id.encode("utf-8")
        box_key = b"job" + len(job_id_bytes).to_bytes(2, "big") + job_id_bytes
        signer = AccountTransactionSigner(self.wallet.private_key)
        composer = AtomicTransactionComposer()
        method = Method.from_signature("refund_consumer(byte[])void")
        composer.add_method_call(
            app_id=self.escrow_app_id,
            method=method,
            sender=self.wallet.address,
            sp=self.algod_client.suggested_params(),
            signer=signer,
            method_args=[job_id_bytes],
            boxes=[(0, box_key)],
            accounts=[self.wallet.address],
        )
        try:
            result = composer.execute(self.algod_client, 4)
            self.log(f"REFUND_TRIGGERED for job {job_id} tx_id={result.tx_ids[0]}")
        except Exception as exc:
            self.log(f"REFUND_TRIGGER_FAILED for job {job_id}: {exc}")

    async def release_escrow(self, job_id: str, proof_hash: str) -> bool:
        if self.escrow_app_id <= 0:
            self.log(f"ESCROW_RELEASE_REQUESTED job={job_id} proof={proof_hash} (escrow disabled)")
            return False

        provider_addr = os.getenv("PROVIDER_WALLET", "").strip()
        job_id_bytes = job_id.encode("utf-8")
        proof_bytes = proof_hash.encode("utf-8")
        box_key = b"job" + len(job_id_bytes).to_bytes(2, "big") + job_id_bytes

        signer = AccountTransactionSigner(self.wallet.private_key)
        composer = AtomicTransactionComposer()
        method = Method.from_signature("release_payment(byte[],byte[])void")
        accounts = [provider_addr] if provider_addr else None
        composer.add_method_call(
            app_id=self.escrow_app_id,
            method=method,
            sender=self.wallet.address,
            sp=self.algod_client.suggested_params(),
            signer=signer,
            method_args=[job_id_bytes, proof_bytes],
            boxes=[(0, box_key)],
            accounts=accounts,
        )
        try:
            result = composer.execute(self.algod_client, 4)
            self.log(f"ESCROW_RELEASE_REQUESTED job={job_id} tx_id={result.tx_ids[0]}")
            return True
        except Exception as exc:
            self.log(f"ESCROW_RELEASE_SKIPPED job={job_id} reason={exc}")
            return False

    async def run(self) -> dict:
        self.log("Agent starting job dispatch")

        providers = await self.discover_providers()
        if not providers:
            raise RuntimeError("No providers found in registry")

        ranked = job_matcher.score_providers(self.task, providers)

        preferred_endpoint = str(self.task.get("preferred_provider_endpoint", "")).strip().rstrip("/")
        if preferred_endpoint:
            preferred = [p for p in ranked if str(p.get("endpoint", "")).rstrip("/") == preferred_endpoint]
            if preferred:
                ranked = preferred + [p for p in ranked if p not in preferred]
                self.log(f"Preferred provider selected: {preferred_endpoint}")

        self.log(f"Found {len(ranked)} providers, trying in ranked order")

        for provider in ranked:
            try:
                result = await self.request_job(provider)

                if not verify_output(result, self.task):
                    self.log("OUTPUT_VERIFICATION_FAILED - triggering refund")
                    await self.trigger_refund(result.get("job_id", ""))
                    raise ProviderFailedError("Output hash mismatch")

                if should_spot_check():
                    self.log("SPOT_CHECK triggered for fraud detection")
                    ok = await spot_rerun(self.task, provider["endpoint"], self.wallet, self.algod_client)
                    if not ok:
                        self.log("FRAUD_DETECTED - provider returned different output on rerun")
                        await self.trigger_refund(result.get("job_id", ""))
                        raise ProviderFailedError("Fraud detected on spot check")

                released = await self.release_escrow(result.get("job_id", ""), result.get("result_hash", ""))
                if released:
                    self.log(f"ESCROW_RELEASED for job {result.get('job_id', '')}")
                self.log(f"Job completed: result_hash={result.get('result_hash', '')}")
                return result
            except ProviderFailedError as exc:
                self.log(f"Provider {provider['endpoint']} failed: {exc}, trying next")
                continue
            except BudgetExceededError as exc:
                self.log(f"Budget exceeded: {exc}")
                raise

        raise RuntimeError("All providers failed")

    def log(self, message: str):
        entry = {
            "timestamp": datetime.now(UTC).isoformat(),
            "message": message,
            "task_type": self.task.get("type", "inference"),
            "task_tokens": int(self.task.get("tokens", 0)),
        }
        print(json.dumps(entry))
        log_path = os.path.join(os.path.dirname(__file__), "agent.log")
        os.makedirs(os.path.dirname(log_path), exist_ok=True)
        with open(log_path, "a", encoding="utf-8") as log_file:
            log_file.write(json.dumps(entry) + "\n")


if __name__ == "__main__":
    load_dotenv()

    parser = argparse.ArgumentParser()
    parser.add_argument("--type", default="inference")
    parser.add_argument("--tokens", type=int, default=500)
    parser.add_argument("--payload", default="Hello world test payload")
    parser.add_argument("--vram", type=int, default=4)
    parser.add_argument("--provider-endpoint", default="")
    args = parser.parse_args()

    task = {
        "type": args.type,
        "tokens": args.tokens,
        "payload": args.payload,
        "required_vram": args.vram,
        "preferred_provider_endpoint": args.provider_endpoint,
    }

    agent = ComputeAgent(
        task=task,
        algod_url=os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud"),
        algod_token=os.getenv("ALGOD_TOKEN", ""),
        registry_app_id=int(os.getenv("REGISTRY_APP_ID", "0") or "0"),
        agent_mnemonic=os.getenv("AGENT_MNEMONIC", ""),
        budget_per_job=int(os.getenv("AGENT_BUDGET_PER_JOB_MICROALGO", "500000")),
        daily_budget=int(os.getenv("AGENT_DAILY_BUDGET_MICROALGO", "5000000")),
        escrow_app_id=int(os.getenv("ESCROW_APP_ID", "0") or "0"),
    )

    final_result = asyncio.run(agent.run())
    print("FINAL RESULT:")
    print(json.dumps(final_result, indent=2))
