from __future__ import annotations

import asyncio

import httpx


class ProviderMonitor:
    def __init__(self, provider_endpoints: list[str]):
        self.endpoints = provider_endpoints
        self.health_scores = {ep: 100 for ep in provider_endpoints}

    async def check_all(self):
        async with httpx.AsyncClient(timeout=5) as client:
            for ep in self.endpoints:
                try:
                    resp = await client.get(ep + "/health")
                    if resp.status_code == 200:
                        self.health_scores[ep] = min(100, self.health_scores[ep] + 5)
                    else:
                        self.health_scores[ep] = max(0, self.health_scores[ep] - 20)
                except Exception:
                    self.health_scores[ep] = max(0, self.health_scores[ep] - 20)

    def get_healthy_providers(self, min_score=60) -> list[str]:
        return [ep for ep, score in self.health_scores.items() if score >= min_score]

    async def run_forever(self, interval_seconds=30):
        while True:
            await self.check_all()
            await asyncio.sleep(interval_seconds)
