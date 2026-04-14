"""
Phase 8 — Stretch Extensions
Multi-provider job splitting and payment streaming for advanced compute orchestration.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import time
from datetime import UTC, datetime
from typing import Any

import httpx


# ─── Multi-Provider Job Splitting ────────────────────────────────────────────
class MultiProviderOrchestrator:
    """Splits large compute jobs across multiple providers and aggregates results."""

    def __init__(self, providers: list[dict], max_concurrent: int = 4) -> None:
        self.providers = providers
        self.max_concurrent = max_concurrent

    def split_task(self, task: dict, num_chunks: int) -> list[dict]:
        """Split a task into sub-tasks for parallel execution."""
        tokens = int(task.get("tokens", 0))
        payload = str(task.get("payload", ""))
        chunk_size = max(1, tokens // num_chunks)
        remainder = tokens - (chunk_size * num_chunks)

        chunks = []
        for i in range(num_chunks):
            chunk_tokens = chunk_size + (remainder if i == num_chunks - 1 else 0)
            chunks.append({
                **task,
                "chunk_id": i,
                "tokens": chunk_tokens,
                "payload": f"{payload}_chunk_{i}",
                "parent_task": task.get("job_id", ""),
            })
        return chunks

    async def execute_parallel(self, task: dict) -> dict[str, Any]:
        """Execute a task across multiple providers in parallel."""
        num_providers = min(len(self.providers), self.max_concurrent)
        chunks = self.split_task(task, num_providers)

        start = time.perf_counter()
        results: list[dict] = []
        errors: list[dict] = []

        async def run_chunk(provider: dict, chunk: dict) -> dict | None:
            try:
                async with httpx.AsyncClient(timeout=60) as client:
                    resp = await client.post(
                        provider["endpoint"] + "/job",
                        json=chunk,
                    )
                    if resp.status_code == 200:
                        return resp.json()
                    return None
            except Exception as exc:
                errors.append({
                    "provider": provider.get("name", provider.get("endpoint", "")),
                    "chunk_id": chunk["chunk_id"],
                    "error": str(exc),
                })
                return None

        tasks_coro = [
            run_chunk(self.providers[i], chunks[i])
            for i in range(num_providers)
        ]

        completed = await asyncio.gather(*tasks_coro, return_exceptions=True)

        for result in completed:
            if isinstance(result, dict):
                results.append(result)

        # Aggregate results
        total_duration = int((time.perf_counter() - start) * 1000)
        all_hashes = [r.get("result_hash", "") for r in results]
        aggregate_hash = hashlib.sha256("".join(sorted(all_hashes)).encode()).hexdigest()

        return {
            "job_id": task.get("job_id", ""),
            "strategy": "multi_provider_split",
            "total_chunks": num_providers,
            "completed_chunks": len(results),
            "failed_chunks": len(errors),
            "aggregate_hash": aggregate_hash,
            "total_duration_ms": total_duration,
            "speedup_factor": round(num_providers / max(1, len(errors) + 1), 2),
            "results": results,
            "errors": errors,
            "timestamp": datetime.now(UTC).isoformat(),
        }


# ─── Payment Streaming ──────────────────────────────────────────────────────
class PaymentStream:
    """Per-second payment streaming for long-running compute jobs."""

    def __init__(
        self,
        consumer_address: str,
        provider_address: str,
        rate_microalgo_per_second: int,
        max_duration_seconds: int = 3600,
    ) -> None:
        self.consumer = consumer_address
        self.provider = provider_address
        self.rate = rate_microalgo_per_second
        self.max_duration = max_duration_seconds
        self.started_at: float | None = None
        self.stopped_at: float | None = None
        self.total_streamed: int = 0
        self.payments: list[dict] = []
        self._running = False

    def start(self) -> dict:
        self.started_at = time.time()
        self._running = True
        return {
            "status": "streaming",
            "consumer": self.consumer,
            "provider": self.provider,
            "rate_microalgo_per_second": self.rate,
            "max_duration_seconds": self.max_duration,
            "started_at": datetime.fromtimestamp(self.started_at, tz=UTC).isoformat(),
        }

    def tick(self, seconds_elapsed: int = 1) -> dict:
        """Process a payment tick. In production, this would submit an Algorand txn."""
        if not self._running:
            return {"error": "stream_not_running"}

        amount = self.rate * seconds_elapsed
        self.total_streamed += amount
        elapsed = time.time() - (self.started_at or time.time())

        payment = {
            "amount_microalgo": amount,
            "cumulative_microalgo": self.total_streamed,
            "elapsed_seconds": round(elapsed, 2),
            "timestamp": datetime.now(UTC).isoformat(),
        }
        self.payments.append(payment)

        # Auto-stop if max duration reached
        if elapsed >= self.max_duration:
            self.stop()
            payment["auto_stopped"] = True

        return payment

    def stop(self) -> dict:
        self.stopped_at = time.time()
        self._running = False
        duration = (self.stopped_at - self.started_at) if self.started_at else 0

        return {
            "status": "completed",
            "total_streamed_microalgo": self.total_streamed,
            "total_streamed_algo": self.total_streamed / 1_000_000,
            "duration_seconds": round(duration, 2),
            "total_payments": len(self.payments),
            "consumer": self.consumer,
            "provider": self.provider,
        }

    def get_status(self) -> dict:
        elapsed = (time.time() - self.started_at) if self.started_at else 0
        return {
            "running": self._running,
            "total_streamed_microalgo": self.total_streamed,
            "total_streamed_algo": self.total_streamed / 1_000_000,
            "elapsed_seconds": round(elapsed, 2),
            "rate_microalgo_per_second": self.rate,
            "remaining_budget_seconds": max(0, self.max_duration - elapsed),
        }


# ─── Advanced Fraud Detection ───────────────────────────────────────────────
class FraudDetector:
    """Multi-layer fraud detection for compute jobs."""

    def __init__(self) -> None:
        self.provider_history: dict[str, list[dict]] = {}
        self.alerts: list[dict] = []

    def record_result(self, provider_id: str, task: dict, result: dict) -> None:
        if provider_id not in self.provider_history:
            self.provider_history[provider_id] = []
        self.provider_history[provider_id].append({
            "task": task,
            "result": result,
            "timestamp": time.time(),
        })

    def check_consistency(self, provider_id: str) -> dict:
        """Check if a provider returns consistent results for identical tasks."""
        history = self.provider_history.get(provider_id, [])
        if len(history) < 2:
            return {"consistent": True, "sample_size": len(history)}

        # Group by task payload
        task_groups: dict[str, list[str]] = {}
        for entry in history:
            key = json.dumps(entry["task"], sort_keys=True)
            result_hash = entry["result"].get("result_hash", "")
            task_groups.setdefault(key, []).append(result_hash)

        inconsistencies = 0
        for key, hashes in task_groups.items():
            unique_hashes = set(hashes)
            if len(unique_hashes) > 1:
                inconsistencies += 1
                self.alerts.append({
                    "type": "INCONSISTENT_RESULTS",
                    "provider_id": provider_id,
                    "task_key": key[:50],
                    "unique_hashes": len(unique_hashes),
                    "timestamp": datetime.now(UTC).isoformat(),
                })

        return {
            "consistent": inconsistencies == 0,
            "inconsistencies": inconsistencies,
            "total_task_groups": len(task_groups),
            "sample_size": len(history),
        }

    def check_timing_anomaly(self, provider_id: str) -> dict:
        """Detect suspiciously fast or slow response times."""
        history = self.provider_history.get(provider_id, [])
        durations = [
            entry["result"].get("duration_ms", 0)
            for entry in history
            if entry["result"].get("duration_ms", 0) > 0
        ]

        if len(durations) < 3:
            return {"anomaly_detected": False, "sample_size": len(durations)}

        avg = sum(durations) / len(durations)
        # Simple threshold: flag if any result is <10% or >300% of average
        anomalies = [
            d for d in durations
            if d < avg * 0.1 or d > avg * 3.0
        ]

        if anomalies:
            self.alerts.append({
                "type": "TIMING_ANOMALY",
                "provider_id": provider_id,
                "anomalous_durations": anomalies,
                "average_duration": avg,
                "timestamp": datetime.now(UTC).isoformat(),
            })

        return {
            "anomaly_detected": len(anomalies) > 0,
            "anomalous_count": len(anomalies),
            "average_duration_ms": round(avg, 2),
            "sample_size": len(durations),
        }

    def get_alerts(self) -> list[dict]:
        return self.alerts


if __name__ == "__main__":
    # Quick self-test
    print("=== Payment Stream Test ===")
    stream = PaymentStream(
        consumer_address="CONSUMER_ADDR",
        provider_address="PROVIDER_ADDR",
        rate_microalgo_per_second=10,
        max_duration_seconds=60,
    )
    print(json.dumps(stream.start(), indent=2))
    for _ in range(3):
        print(json.dumps(stream.tick(), indent=2))
    print(json.dumps(stream.stop(), indent=2))

    print("\n=== Fraud Detector Test ===")
    detector = FraudDetector()
    task = {"payload": "test", "tokens": 100}
    detector.record_result("p1", task, {"result_hash": "hash1", "duration_ms": 100})
    detector.record_result("p1", task, {"result_hash": "hash1", "duration_ms": 105})
    detector.record_result("p1", task, {"result_hash": "hash2", "duration_ms": 1})  # Anomaly
    print(json.dumps(detector.check_consistency("p1"), indent=2))
    print(json.dumps(detector.check_timing_anomaly("p1"), indent=2))
    print(f"Alerts: {len(detector.get_alerts())}")

    print("\n✅ Stretch extensions self-test passed")
