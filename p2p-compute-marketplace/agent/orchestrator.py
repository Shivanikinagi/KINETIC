"""
Provider Orchestrator — health monitoring, circuit breaking, and load balancing.

Monitors all registered provider nodes and maintains health scores.
Integrates with the scheduler to prevent dispatching to broken providers.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """
    Prevents dispatching to providers that are consistently failing.
    Opens after `threshold` consecutive failures, resets after `reset_timeout`.
    """

    def __init__(self, failure_threshold: int = 3, reset_timeout: float = 120.0):
        self.failure_threshold = failure_threshold
        self.reset_timeout = reset_timeout
        self._failures: dict[str, dict[str, Any]] = {}

    def is_open(self, endpoint: str) -> bool:
        """Check if circuit is open (provider should be skipped)."""
        entry = self._failures.get(endpoint)
        if not entry:
            return False
        if entry["count"] >= self.failure_threshold:
            # Allow retry after reset_timeout (half-open state)
            if time.time() - entry["last_failure"] > self.reset_timeout:
                return False
            return True
        return False

    def record_failure(self, endpoint: str):
        """Record a failure for a provider."""
        if endpoint not in self._failures:
            self._failures[endpoint] = {"count": 0, "last_failure": 0}
        self._failures[endpoint]["count"] += 1
        self._failures[endpoint]["last_failure"] = time.time()
        logger.warning(
            f"Circuit breaker: {endpoint} failure "
            f"#{self._failures[endpoint]['count']}"
        )

    def record_success(self, endpoint: str):
        """Reset failure count on success."""
        if endpoint in self._failures:
            self._failures.pop(endpoint)

    def get_status(self) -> dict[str, Any]:
        """Return circuit breaker status for all tracked providers."""
        return {
            ep: {
                "failures": entry["count"],
                "last_failure": entry["last_failure"],
                "circuit_open": self.is_open(ep),
            }
            for ep, entry in self._failures.items()
        }


class ProviderMonitor:
    """
    Monitors provider health via periodic heartbeat checks.
    Maintains health scores that decay on failure and recover on success.
    """

    def __init__(self, provider_endpoints: list[str] | None = None):
        self.endpoints: list[str] = provider_endpoints or []
        self.health_scores: dict[str, int] = {ep: 100 for ep in self.endpoints}
        self.provider_info: dict[str, dict[str, Any]] = {}
        self.circuit_breaker = CircuitBreaker()
        self._last_check: float = 0.0

    def add_provider(self, endpoint: str):
        """Register a new provider endpoint."""
        endpoint = endpoint.rstrip("/")
        if endpoint not in self.endpoints:
            self.endpoints.append(endpoint)
            self.health_scores[endpoint] = 100

    def remove_provider(self, endpoint: str):
        """Remove a provider endpoint."""
        endpoint = endpoint.rstrip("/")
        self.endpoints = [ep for ep in self.endpoints if ep != endpoint]
        self.health_scores.pop(endpoint, None)
        self.provider_info.pop(endpoint, None)

    async def check_all(self):
        """Probe all registered providers and update health scores."""
        self._last_check = time.time()
        async with httpx.AsyncClient(timeout=10) as client:
            tasks = [self._check_one(client, ep) for ep in self.endpoints]
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _check_one(self, client: httpx.AsyncClient, endpoint: str):
        """Check a single provider's health."""
        try:
            resp = await client.get(f"{endpoint}/health")
            if resp.status_code == 200:
                data = resp.json()
                self.health_scores[endpoint] = min(
                    100, self.health_scores.get(endpoint, 50) + 5
                )
                self.provider_info[endpoint] = {
                    "status": data.get("status", "unknown"),
                    "gpu_model": data.get("gpu_model", "unknown"),
                    "vram_gb": data.get("vram_gb", 0),
                    "gpu_available": data.get("gpu_available", False),
                    "jobs_running": data.get("jobs_running", 0),
                    "jobs_completed": data.get("jobs_completed", 0),
                    "uptime_seconds": data.get("uptime_seconds", 0),
                    "last_seen": time.time(),
                }
                self.circuit_breaker.record_success(endpoint)
            else:
                self.health_scores[endpoint] = max(
                    0, self.health_scores.get(endpoint, 50) - 20
                )
                self.circuit_breaker.record_failure(endpoint)
        except Exception:
            self.health_scores[endpoint] = max(
                0, self.health_scores.get(endpoint, 50) - 20
            )
            self.circuit_breaker.record_failure(endpoint)

    def get_healthy_providers(self, min_score: int = 60) -> list[str]:
        """Return endpoints with health score above threshold and open circuit."""
        return [
            ep for ep, score in self.health_scores.items()
            if score >= min_score and not self.circuit_breaker.is_open(ep)
        ]

    def get_best_provider(
        self,
        required_vram: int = 0,
        prefer_gpu: bool = False,
    ) -> str | None:
        """Select the best available provider based on health, VRAM, and GPU."""
        healthy = self.get_healthy_providers()
        if not healthy:
            return None

        candidates: list[tuple[str, float]] = []
        for ep in healthy:
            info = self.provider_info.get(ep, {})
            vram = int(info.get("vram_gb", 0))
            if vram < required_vram:
                continue

            # Scoring: health + GPU bonus + low-load bonus
            score = float(self.health_scores.get(ep, 0))
            if prefer_gpu and info.get("gpu_available", False):
                score += 50
            running = int(info.get("jobs_running", 0))
            score -= running * 10  # Penalize loaded providers
            candidates.append((ep, score))

        if not candidates:
            return None

        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0]

    def get_status(self) -> dict[str, Any]:
        """Return full monitoring status."""
        return {
            "providers": {
                ep: {
                    "health_score": self.health_scores.get(ep, 0),
                    "circuit_open": self.circuit_breaker.is_open(ep),
                    "info": self.provider_info.get(ep, {}),
                }
                for ep in self.endpoints
            },
            "healthy_count": len(self.get_healthy_providers()),
            "total_count": len(self.endpoints),
            "last_check": self._last_check,
            "circuit_breaker": self.circuit_breaker.get_status(),
        }

    async def run_forever(self, interval_seconds: float = 30):
        """Continuously monitor providers."""
        logger.info(
            f"Provider monitor started: {len(self.endpoints)} providers, "
            f"interval={interval_seconds}s"
        )
        while True:
            await self.check_all()
            healthy = self.get_healthy_providers()
            logger.info(
                f"Health check: {len(healthy)}/{len(self.endpoints)} providers healthy"
            )
            await asyncio.sleep(interval_seconds)


# Global monitor instance
monitor = ProviderMonitor()
