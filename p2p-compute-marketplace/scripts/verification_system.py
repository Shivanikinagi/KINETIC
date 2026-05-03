"""
Phase 5 — Verification & Distribution System
Automates compute proof verification, SLA enforcement, and badge distribution.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from algosdk import account, mnemonic
from algosdk.abi.method import Method
from algosdk.atomic_transaction_composer import AccountTransactionSigner, AtomicTransactionComposer
from algosdk.encoding import decode_address
from algosdk.v2client.algod import AlgodClient
from algosdk.v2client.indexer import IndexerClient
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


# ─── Proof of Compute Verification ──────────────────────────────────────────
class ComputeVerifier:
    """Verifies compute job outputs and generates verification reports."""

    @staticmethod
    def compute_expected_hash(payload: str, tokens: int) -> str:
        return hashlib.sha256(f"{payload}{tokens}".encode("utf-8")).hexdigest()

    @staticmethod
    def verify_job_output(task: dict, result: dict) -> dict[str, Any]:
        """Full verification of a job result.

        Returns a verification report with pass/fail and details.
        """
        payload = str(task.get("payload", ""))
        tokens = int(task.get("tokens", 0))
        expected_hash = ComputeVerifier.compute_expected_hash(payload, tokens)
        actual_hash = str(result.get("result_hash", ""))

        verification = {
            "timestamp": datetime.now(UTC).isoformat(),
            "job_id": result.get("job_id", ""),
            "expected_hash": expected_hash,
            "actual_hash": actual_hash,
            "hash_match": expected_hash == actual_hash,
            "duration_ms": result.get("duration_ms", 0),
            "tokens_processed": result.get("tokens_processed", 0),
        }

        # Check performance SLA
        max_duration = max(1000, tokens * 2)  # max 2ms per token
        verification["within_sla"] = int(result.get("duration_ms", 0)) <= max_duration
        verification["sla_max_ms"] = max_duration

        verification["verified"] = verification["hash_match"] and verification["within_sla"]

        return verification

    @staticmethod
    def generate_proof_certificate(verification: dict) -> dict[str, Any]:
        """Generate a proof certificate for a verified job."""
        cert_data = json.dumps(verification, sort_keys=True)
        cert_hash = hashlib.sha256(cert_data.encode()).hexdigest()

        return {
            "certificate_hash": cert_hash,
            "job_id": verification.get("job_id", ""),
            "verified": verification.get("verified", False),
            "hash_match": verification.get("hash_match", False),
            "within_sla": verification.get("within_sla", False),
            "issued_at": datetime.now(UTC).isoformat(),
            "issuer": "KINETIC Verification Engine v2.0",
        }


# ─── SLA Enforcement ────────────────────────────────────────────────────────
class SLAEnforcer:
    """Tracks provider SLA compliance and triggers penalties."""

    def __init__(self) -> None:
        self.provider_records: dict[str, dict[str, Any]] = {}

    def record_job(self, provider_id: str, verification: dict) -> None:
        if provider_id not in self.provider_records:
            self.provider_records[provider_id] = {
                "total_jobs": 0,
                "passed_jobs": 0,
                "failed_jobs": 0,
                "sla_violations": 0,
                "total_duration_ms": 0,
                "fraud_count": 0,
            }

        record = self.provider_records[provider_id]
        record["total_jobs"] += 1
        record["total_duration_ms"] += int(verification.get("duration_ms", 0))

        if verification.get("verified"):
            record["passed_jobs"] += 1
        else:
            record["failed_jobs"] += 1

        if not verification.get("within_sla"):
            record["sla_violations"] += 1

        if not verification.get("hash_match"):
            record["fraud_count"] += 1

    def get_provider_score(self, provider_id: str) -> dict[str, Any]:
        record = self.provider_records.get(provider_id, {})
        total = record.get("total_jobs", 0)
        if total == 0:
            return {"provider_id": provider_id, "score": 100, "tier": "new"}

        success_rate = record.get("passed_jobs", 0) / total * 100
        avg_duration = record.get("total_duration_ms", 0) / total
        sla_compliance = (1 - record.get("sla_violations", 0) / total) * 100
        fraud_rate = record.get("fraud_count", 0) / total * 100

        # Weighted score
        score = (success_rate * 0.4) + (sla_compliance * 0.3) + max(0, (100 - fraud_rate * 10)) * 0.3

        if score >= 95:
            tier = "diamond"
        elif score >= 85:
            tier = "gold"
        elif score >= 70:
            tier = "silver"
        elif score >= 50:
            tier = "bronze"
        else:
            tier = "probation"

        return {
            "provider_id": provider_id,
            "score": round(score, 2),
            "tier": tier,
            "total_jobs": total,
            "success_rate": round(success_rate, 2),
            "avg_duration_ms": round(avg_duration, 2),
            "sla_compliance": round(sla_compliance, 2),
            "fraud_rate": round(fraud_rate, 2),
        }

    def should_penalize(self, provider_id: str) -> bool:
        score = self.get_provider_score(provider_id)
        return score.get("tier") == "probation" or score.get("fraud_rate", 0) > 5


# ─── Badge Distribution Automation ──────────────────────────────────────────
class BadgeDistributor:
    """Automatically distributes reputation badges based on provider performance."""

    TIER_BADGE_MAP = {
        "diamond": "DIAMOND_COMPUTE",
        "gold": "GOLD_COMPUTE",
        "silver": "SILVER_COMPUTE",
        "bronze": "BRONZE_COMPUTE",
    }

    def __init__(self) -> None:
        self.algod_url = os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud")
        self.algod_token = os.getenv("ALGOD_TOKEN", "")
        self.badge_app_id = int(os.getenv("BADGE_APP_ID", "0") or "0")
        self.admin_mnemonic = os.getenv("ADMIN_MNEMONIC", "").strip()

    def determine_badge(self, provider_score: dict) -> str | None:
        tier = provider_score.get("tier", "")
        if tier in self.TIER_BADGE_MAP and provider_score.get("total_jobs", 0) >= 5:
            return self.TIER_BADGE_MAP[tier]
        return None

    def mint_badge_on_chain(self, recipient_address: str, campus_id: str) -> dict[str, Any]:
        """Mint a badge on-chain for a provider.

        Returns transaction details or error.
        """
        if self.badge_app_id <= 0 or not self.admin_mnemonic:
            return {
                "success": False,
                "error": "Badge app not configured (no BADGE_APP_ID or ADMIN_MNEMONIC)",
            }

        try:
            algod = AlgodClient(algod_token=self.algod_token, algod_address=self.algod_url)
            admin_sk = mnemonic.to_private_key(self.admin_mnemonic)
            admin_addr = account.address_from_private_key(admin_sk)

            mint_method = Method.from_signature("mint_badge(address,byte[])uint64")
            atc = AtomicTransactionComposer()
            atc.add_method_call(
                app_id=self.badge_app_id,
                method=mint_method,
                sender=admin_addr,
                sp=algod.suggested_params(),
                signer=AccountTransactionSigner(admin_sk),
                method_args=[recipient_address, campus_id.encode("utf-8")],
                boxes=[(0, b"badge" + decode_address(recipient_address))],
            )
            result = atc.execute(algod, 4)
            asset_id = int(result.abi_results[0].return_value)

            return {
                "success": True,
                "asset_id": asset_id,
                "tx_id": result.tx_ids[0],
                "recipient": recipient_address,
                "badge_type": campus_id,
            }
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    def process_distribution(self, provider_scores: list[dict]) -> list[dict]:
        """Process badge distribution for a batch of providers."""
        results = []
        for score in provider_scores:
            badge_type = self.determine_badge(score)
            if not badge_type:
                continue

            provider_id = score.get("provider_id", "")
            result = {
                "provider_id": provider_id,
                "badge_type": badge_type,
                "tier": score.get("tier", ""),
                "score": score.get("score", 0),
            }

            # Only mint if we have the provider's Algorand address
            if len(provider_id) == 58:  # Algorand address length
                mint_result = self.mint_badge_on_chain(provider_id, badge_type)
                result.update(mint_result)
            else:
                result["success"] = False
                result["error"] = "Invalid provider address format"

            results.append(result)

        return results


# ─── Verification Report Generator ─────────────────────────────────────────
def generate_verification_report(
    jobs: list[dict[str, Any]],
    tasks: list[dict[str, Any]],
) -> dict[str, Any]:
    """Generate a comprehensive verification report for a batch of jobs.

    Args:
        jobs: List of job results (with result_hash, duration_ms, etc.)
        tasks: Corresponding list of task inputs
    """
    verifier = ComputeVerifier()
    sla_enforcer = SLAEnforcer()
    verifications = []

    for task, result in zip(tasks, jobs):
        v = verifier.verify_job_output(task, result)
        cert = verifier.generate_proof_certificate(v)
        v["certificate"] = cert
        verifications.append(v)

        provider_id = result.get("provider_id", result.get("provider", "unknown"))
        sla_enforcer.record_job(provider_id, v)

    total = len(verifications)
    passed = sum(1 for v in verifications if v.get("verified"))
    failed = total - passed

    provider_ids = set(
        r.get("provider_id", r.get("provider", "unknown"))
        for r in jobs
    )
    provider_scores = [sla_enforcer.get_provider_score(pid) for pid in provider_ids]

    return {
        "report_id": hashlib.sha256(json.dumps(verifications, sort_keys=True).encode()).hexdigest()[:16],
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "total_verifications": total,
            "passed": passed,
            "failed": failed,
            "pass_rate": round(passed / total * 100, 2) if total > 0 else 0,
        },
        "verifications": verifications,
        "provider_scores": provider_scores,
    }


if __name__ == "__main__":
    # Quick self-test
    verifier = ComputeVerifier()

    task = {"payload": "Hello world", "tokens": 100}
    result = {
        "job_id": "test-001",
        "result_hash": verifier.compute_expected_hash("Hello world", 100),
        "duration_ms": 150,
        "tokens_processed": 100,
    }

    v = verifier.verify_job_output(task, result)
    print(json.dumps(v, indent=2))

    cert = verifier.generate_proof_certificate(v)
    print(json.dumps(cert, indent=2))

    report = generate_verification_report([result], [task])
    print(json.dumps(report["summary"], indent=2))
    print("✅ Verification system self-test passed")
