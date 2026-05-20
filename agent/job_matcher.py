from __future__ import annotations

import random


def score_providers(task: dict, providers: list[dict]) -> list[dict]:
    required_vram = int(task.get("required_vram", 4))

    scored: list[dict] = []
    for provider in providers:
        score = 100.0
        vram_gb = int(provider.get("vram_gb", 0))
        price_per_hour = float(provider.get("price_per_hour", 0))
        uptime_score = float(provider.get("uptime_score", 0))
        gpu_model = str(provider.get("gpu_model", ""))

        if vram_gb < required_vram:
            score -= 50.0

        score -= price_per_hour / 1000.0
        score += uptime_score * 0.3

        if "RTX" in gpu_model.upper():
            score += 10.0

        score *= random.uniform(0.95, 1.05)
        if score >= 0:
            enriched = dict(provider)
            enriched["score"] = score
            scored.append(enriched)

    scored.sort(key=lambda p: p["score"], reverse=True)
    return scored


def estimate_job_cost(task: dict, provider: dict) -> int:
    tokens = int(task.get("tokens", 0))
    price_per_token = int(provider.get("price_per_token", provider.get("price_per_hour", 0)))
    return tokens * price_per_token
