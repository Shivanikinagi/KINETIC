"""
Job Scheduler — routes incoming jobs to the optimal provider node.

Features:
  - Priority queue (CRITICAL > HIGH > NORMAL > LOW)
  - Provider health tracking via heartbeats
  - VRAM-aware provider selection (closest-fit)
  - Load balancing across providers
  - Circuit breaker for failing providers
  - Automatic re-queuing on provider failure
"""

from __future__ import annotations

import asyncio
import heapq
import logging
import time
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)


# ── Priority definitions ─────────────────────────────────────────────────────

class JobPriority(IntEnum):
    CRITICAL = 0
    HIGH = 1
    NORMAL = 2
    LOW = 3


# ── Data structures ──────────────────────────────────────────────────────────

@dataclass(order=True)
class QueuedJob:
    priority: int
    created_at: float = field(compare=False)
    job_id: str = field(compare=False)
    task: dict = field(compare=False)
    retries: int = field(default=0, compare=False)
    assigned_provider: Optional[str] = field(default=None, compare=False)


@dataclass
class ProviderState:
    endpoint: str
    vram_gb: int = 0
    gpu_model: str = "unknown"
    current_load: int = 0
    max_concurrent: int = 3
    health_score: int = 100
    last_seen: float = 0.0
    consecutive_failures: int = 0
    total_jobs: int = 0
    total_failures: int = 0


# ── Circuit Breaker ──────────────────────────────────────────────────────────

class CircuitBreaker:
    """
    Prevents dispatching to providers that are consistently failing.
    Opens after `threshold` consecutive failures, resets after `reset_timeout`.
    """

    def __init__(self, threshold: int = 3, reset_timeout: float = 120.0):
        self.threshold = threshold
        self.reset_timeout = reset_timeout

    def is_open(self, provider: ProviderState) -> bool:
        if provider.consecutive_failures < self.threshold:
            return False
        # Allow retry after reset_timeout
        if time.time() - provider.last_seen > self.reset_timeout:
            return False
        return True

    def record_success(self, provider: ProviderState):
        provider.consecutive_failures = 0

    def record_failure(self, provider: ProviderState):
        provider.consecutive_failures += 1
        provider.total_failures += 1


# ── Scheduler ────────────────────────────────────────────────────────────────

class JobScheduler:
    """
    Central job scheduler that manages a priority queue and dispatches
    jobs to the best available provider nodes.
    """

    MAX_RETRIES = 3
    HEALTH_CHECK_INTERVAL = 30  # seconds
    PROVIDER_TIMEOUT = 120  # seconds before marking provider stale

    def __init__(self):
        self.queue: list[QueuedJob] = []
        self.running: dict[str, QueuedJob] = {}
        self.completed: dict[str, dict] = {}
        self.providers: dict[str, ProviderState] = {}
        self.circuit_breaker = CircuitBreaker()
        self.max_concurrent = 20
        self._processing = False

    # ── Provider management ──────────────────────────────────────────────

    def register_provider(self, endpoint: str, capabilities: dict[str, Any]):
        """Register or update a provider node."""
        endpoint = endpoint.rstrip("/")
        if endpoint in self.providers:
            p = self.providers[endpoint]
            p.vram_gb = int(capabilities.get("vram_gb", p.vram_gb))
            p.gpu_model = str(capabilities.get("gpu_model", p.gpu_model))
            p.last_seen = time.time()
            p.health_score = min(100, p.health_score + 5)
        else:
            self.providers[endpoint] = ProviderState(
                endpoint=endpoint,
                vram_gb=int(capabilities.get("vram_gb", 0)),
                gpu_model=str(capabilities.get("gpu_model", "unknown")),
                last_seen=time.time(),
            )
        logger.info(f"Provider registered: {endpoint}")

    def remove_provider(self, endpoint: str):
        self.providers.pop(endpoint.rstrip("/"), None)

    def get_provider_states(self) -> list[dict[str, Any]]:
        """Return serializable provider states."""
        return [
            {
                "endpoint": p.endpoint,
                "vram_gb": p.vram_gb,
                "gpu_model": p.gpu_model,
                "current_load": p.current_load,
                "health_score": p.health_score,
                "last_seen": p.last_seen,
                "consecutive_failures": p.consecutive_failures,
                "total_jobs": p.total_jobs,
                "circuit_open": self.circuit_breaker.is_open(p),
            }
            for p in self.providers.values()
        ]

    # ── Job submission ───────────────────────────────────────────────────

    def enqueue(
        self,
        job_id: str,
        task: dict[str, Any],
        priority: JobPriority = JobPriority.NORMAL,
    ) -> str:
        """Add a job to the priority queue."""
        job = QueuedJob(
            priority=priority.value,
            created_at=time.time(),
            job_id=job_id,
            task=task,
        )
        heapq.heappush(self.queue, job)
        logger.info(f"Job {job_id} enqueued (priority={priority.name}, queue_size={len(self.queue)})")
        return job_id

    # ── Provider selection ───────────────────────────────────────────────

    def select_provider(self, task: dict[str, Any]) -> Optional[str]:
        """
        Select the best provider for a task based on:
          1. VRAM requirement satisfaction
          2. Circuit breaker state (skip broken providers)
          3. Current load (prefer less loaded)
          4. Closest VRAM fit (avoid waste)
        """
        required_vram = int(task.get("required_vram", 0))
        now = time.time()

        eligible: list[tuple[str, ProviderState]] = []
        for ep, p in self.providers.items():
            # Skip stale providers
            if now - p.last_seen > self.PROVIDER_TIMEOUT:
                continue
            # Skip overloaded providers
            if p.current_load >= p.max_concurrent:
                continue
            # Skip circuit-broken providers
            if self.circuit_breaker.is_open(p):
                continue
            # VRAM check
            if p.vram_gb < required_vram:
                continue
            eligible.append((ep, p))

        if not eligible:
            return None

        # Sort: lowest load first, then closest VRAM fit
        eligible.sort(key=lambda x: (
            x[1].current_load,
            abs(x[1].vram_gb - required_vram),
            -x[1].health_score,
        ))

        return eligible[0][0]

    # ── Dispatch ─────────────────────────────────────────────────────────

    async def process_queue(self):
        """Process pending jobs from the queue."""
        if self._processing:
            return
        self._processing = True
        try:
            while self.queue and len(self.running) < self.max_concurrent:
                job = heapq.heappop(self.queue)
                provider_ep = self.select_provider(job.task)

                if not provider_ep:
                    # No provider available — put back
                    heapq.heappush(self.queue, job)
                    logger.warning(f"No provider for job {job.job_id}, re-queued")
                    break

                job.assigned_provider = provider_ep
                self.running[job.job_id] = job
                self.providers[provider_ep].current_load += 1

                asyncio.create_task(self._dispatch_job(job, provider_ep))
        finally:
            self._processing = False

    async def _dispatch_job(self, job: QueuedJob, provider_endpoint: str):
        """Dispatch a single job to a provider node."""
        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"{provider_endpoint}/job",
                    json={**job.task, "job_id": job.job_id},
                )

            if resp.status_code != 200:
                raise RuntimeError(f"Provider returned {resp.status_code}: {resp.text[:200]}")

            result = resp.json()
            self.completed[job.job_id] = result

            # Record success
            if provider_endpoint in self.providers:
                p = self.providers[provider_endpoint]
                self.circuit_breaker.record_success(p)
                p.total_jobs += 1

            logger.info(f"Job {job.job_id} completed on {provider_endpoint}")

        except Exception as exc:
            logger.error(f"Job {job.job_id} failed on {provider_endpoint}: {exc}")

            if provider_endpoint in self.providers:
                self.circuit_breaker.record_failure(self.providers[provider_endpoint])

            # Retry on another provider
            if job.retries < self.MAX_RETRIES:
                job.retries += 1
                job.assigned_provider = None
                heapq.heappush(self.queue, job)
                logger.info(f"Job {job.job_id} re-queued (retry {job.retries}/{self.MAX_RETRIES})")
            else:
                self.completed[job.job_id] = {
                    "job_id": job.job_id,
                    "status": "failed",
                    "error": str(exc),
                }

        finally:
            # Release provider load
            self.running.pop(job.job_id, None)
            if provider_endpoint in self.providers:
                self.providers[provider_endpoint].current_load = max(
                    0, self.providers[provider_endpoint].current_load - 1
                )

    # ── Health checker ───────────────────────────────────────────────────

    async def health_check_loop(self, interval: float | None = None):
        """Periodically ping all registered providers."""
        interval = interval or self.HEALTH_CHECK_INTERVAL
        while True:
            await self._check_provider_health()
            await asyncio.sleep(interval)

    async def _check_provider_health(self):
        """Ping all providers and update their health scores."""
        async with httpx.AsyncClient(timeout=10) as client:
            for ep, p in list(self.providers.items()):
                try:
                    resp = await client.get(f"{ep}/health")
                    if resp.status_code == 200:
                        data = resp.json()
                        p.last_seen = time.time()
                        p.health_score = min(100, p.health_score + 5)
                        p.vram_gb = int(data.get("vram_gb", p.vram_gb))
                        p.gpu_model = str(data.get("gpu_model", p.gpu_model))
                    else:
                        p.health_score = max(0, p.health_score - 20)
                except Exception:
                    p.health_score = max(0, p.health_score - 20)

    # ── Stats ────────────────────────────────────────────────────────────

    def get_stats(self) -> dict[str, Any]:
        return {
            "queue_size": len(self.queue),
            "running_jobs": len(self.running),
            "completed_jobs": len(self.completed),
            "active_providers": len([
                p for p in self.providers.values()
                if time.time() - p.last_seen < self.PROVIDER_TIMEOUT
            ]),
            "total_providers": len(self.providers),
        }


# ── Global instance ──────────────────────────────────────────────────────────

scheduler = JobScheduler()
