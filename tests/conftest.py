from __future__ import annotations

import os

import pytest
from algosdk import account
from algosdk.v2client.algod import AlgodClient


@pytest.fixture(scope="session")
def algorand_client() -> AlgodClient:
    return AlgodClient(
        algod_token=os.getenv("LOCALNET_ALGOD_TOKEN", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
        algod_address=os.getenv("LOCALNET_ALGOD_URL", "http://localhost:4001"),
    )


@pytest.fixture
def funded_accounts() -> dict[str, tuple[str, str]]:
    # Local unit tests use generated keys; funding is handled in integration environments.
    def _new_account() -> tuple[str, str]:
        priv, addr = account.generate_account()
        return priv, addr

    return {
        "admin": _new_account(),
        "provider": _new_account(),
        "consumer": _new_account(),
    }
