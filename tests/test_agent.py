from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from algosdk import account, mnemonic

from agent.consumer_agent import ComputeAgent
from agent.wallet import BudgetExceededError


def _valid_mnemonic() -> str:
    private_key, _ = account.generate_account()
    return mnemonic.from_private_key(private_key)


@pytest.mark.asyncio
async def test_full_happy_path(monkeypatch):
    monkeypatch.setenv("PROVIDER_ENDPOINT", "http://provider")

    with patch("agent.consumer_agent.AlgodClient") as mock_algod:
        algod = MagicMock()
        mock_algod.return_value = algod

        agent = ComputeAgent(
            task={"type": "inference", "tokens": 10, "payload": "abc", "required_vram": 4},
            algod_url="http://algod",
            algod_token="",
            registry_app_id=1,
            agent_mnemonic=_valid_mnemonic(),
            budget_per_job=1_000_000,
            daily_budget=10_000_000,
        )

    fake_provider = {
        "endpoint": "http://provider",
        "vram_gb": 16,
        "gpu_model": "RTX4090",
        "price_per_hour": 10,
        "price_per_token": 10,
        "uptime_score": 99,
    }

    with patch.object(agent, "discover_providers", AsyncMock(return_value=[fake_provider])):
        with patch.object(agent, "request_job", AsyncMock(return_value={"job_id": "1", "result_hash": "bad", "output": "ok"})):
            with patch("agent.consumer_agent.verify_output", return_value=True):
                with patch("agent.consumer_agent.should_spot_check", return_value=False):
                    with patch.object(agent, "release_escrow", AsyncMock()):
                        result = await agent.run()

    assert "result_hash" in result


@pytest.mark.asyncio
async def test_budget_exceeded(monkeypatch):
    monkeypatch.setenv("PROVIDER_ENDPOINT", "http://provider")

    with patch("agent.consumer_agent.AlgodClient") as mock_algod:
        mock_algod.return_value = MagicMock()
        agent = ComputeAgent(
            task={"type": "inference", "tokens": 10, "payload": "abc", "required_vram": 4},
            algod_url="http://algod",
            algod_token="",
            registry_app_id=1,
            agent_mnemonic=_valid_mnemonic(),
            budget_per_job=1,
            daily_budget=1,
        )

    with patch.object(agent.wallet, "sign_and_submit_payment", AsyncMock(side_effect=BudgetExceededError("limit"))):
        with pytest.raises(BudgetExceededError):
            await agent.wallet.sign_and_submit_payment("R", 500000, "n", MagicMock())


@pytest.mark.asyncio
async def test_provider_fallback(monkeypatch):
    monkeypatch.setenv("PROVIDER_ENDPOINT", "http://a,http://b")

    with patch("agent.consumer_agent.AlgodClient") as mock_algod:
        mock_algod.return_value = MagicMock()
        agent = ComputeAgent(
            task={"type": "inference", "tokens": 10, "payload": "abc", "required_vram": 4},
            algod_url="http://algod",
            algod_token="",
            registry_app_id=1,
            agent_mnemonic=_valid_mnemonic(),
            budget_per_job=1_000_000,
            daily_budget=10_000_000,
        )

    providers = [
        {"endpoint": "http://a", "vram_gb": 8, "gpu_model": "RTX3070", "price_per_hour": 100, "price_per_token": 100, "uptime_score": 50},
        {"endpoint": "http://b", "vram_gb": 16, "gpu_model": "RTX4090", "price_per_hour": 50, "price_per_token": 50, "uptime_score": 90},
    ]

    responses = [Exception("fail"), {"job_id": "2", "result_hash": "hash2", "output": "ok"}]

    async def request_side_effect(provider):
        result = responses.pop(0)
        if isinstance(result, Exception):
            from agent.consumer_agent import ProviderFailedError

            raise ProviderFailedError("boom")
        return result

    with patch.object(agent, "discover_providers", AsyncMock(return_value=providers)):
        with patch.object(agent, "request_job", side_effect=request_side_effect):
            with patch("agent.consumer_agent.verify_output", return_value=True):
                with patch("agent.consumer_agent.should_spot_check", return_value=False):
                    with patch.object(agent, "release_escrow", AsyncMock()):
                        result = await agent.run()

    assert result["job_id"] == "2"


def test_provider_ranking():
    from agent.job_matcher import score_providers

    task = {"required_vram": 8}
    providers = [
        {"endpoint": "a", "vram_gb": 8, "gpu_model": "RTX2060", "price_per_hour": 90, "uptime_score": 80},
        {"endpoint": "b", "vram_gb": 16, "gpu_model": "RTX4090", "price_per_hour": 50, "uptime_score": 95},
        {"endpoint": "c", "vram_gb": 12, "gpu_model": "A100", "price_per_hour": 130, "uptime_score": 99},
    ]

    ranked = score_providers(task, providers)
    assert ranked
    assert ranked[0]["endpoint"] in {"a", "b"}
