"""
Provider on-chain registration helper.

Registers a provider node with the KINETIC hub and the Algorand
Registry smart contract in a single call.
"""

from __future__ import annotations

import json
import os
import sys

import requests


def register_with_hub(
    hub_url: str,
    gpu_model: str,
    vram_gb: int,
    price_per_hour: float,
    endpoint: str,
    provider_mnemonic: str,
    org_name: str = "",
    logo_url: str = "",
) -> dict:
    """
    Register this provider node with the KINETIC hub.

    The hub will submit an on-chain transaction to the Algorand Registry
    contract, making this provider discoverable to consumers.

    Args:
        hub_url:            URL of the KINETIC hub (e.g. http://localhost:8000)
        gpu_model:          GPU model string (e.g. "T4", "RTX 4090")
        vram_gb:            GPU VRAM in GB
        price_per_hour:     Price per hour in ALGO (e.g. 0.5)
        endpoint:           Public URL of this provider node (e.g. ngrok URL)
        provider_mnemonic:  25-word Algorand mnemonic for signing the tx
        org_name:           Optional organization name
        logo_url:           Optional logo URL

    Returns:
        Registration response dict with tx_id and explorer URL.
    """
    payload = {
        "gpu_model": gpu_model,
        "vram_gb": vram_gb,
        "price_per_hour": price_per_hour,
        "endpoint": endpoint.rstrip("/"),
        "provider_mnemonic": provider_mnemonic,
        "org_name": org_name,
        "logo_url": logo_url,
    }

    resp = requests.post(
        f"{hub_url.rstrip('/')}/provider/register",
        json=payload,
        timeout=30,
    )

    if resp.status_code != 200:
        raise RuntimeError(
            f"Registration failed ({resp.status_code}): {resp.text}"
        )

    return resp.json()


def register_from_env() -> dict:
    """Register using environment variables (convenience for Colab)."""
    return register_with_hub(
        hub_url=os.getenv("HUB_URL", "http://localhost:8000"),
        gpu_model=os.getenv("GPU_MODEL", "CPU"),
        vram_gb=int(os.getenv("VRAM_GB", "0")),
        price_per_hour=float(os.getenv("PRICE_PER_HOUR", "0.5")),
        endpoint=os.getenv("PROVIDER_ENDPOINT", ""),
        provider_mnemonic=os.getenv("PROVIDER_MNEMONIC", ""),
        org_name=os.getenv("ORG_NAME", ""),
        logo_url=os.getenv("LOGO_URL", ""),
    )


if __name__ == "__main__":
    try:
        result = register_from_env()
        print("\n✅ Provider registered successfully!")
        print(json.dumps(result, indent=2))
    except Exception as exc:
        print(f"\n❌ Registration failed: {exc}", file=sys.stderr)
        sys.exit(1)
