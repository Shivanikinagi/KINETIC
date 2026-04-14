from __future__ import annotations

import os
from functools import lru_cache

from algosdk import account, mnemonic
from algosdk.encoding import is_valid_address


@lru_cache(maxsize=1)
def resolve_provider_wallet() -> str:
    configured = os.getenv("PROVIDER_WALLET", "").strip()
    if configured and is_valid_address(configured):
        return configured

    provider_mnemonic = os.getenv("PROVIDER_MNEMONIC", "").strip()
    if not provider_mnemonic:
        return ""

    try:
        private_key = mnemonic.to_private_key(provider_mnemonic)
        derived = account.address_from_private_key(private_key)
        return derived if is_valid_address(derived) else ""
    except Exception:
        return ""