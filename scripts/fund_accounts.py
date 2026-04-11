from __future__ import annotations

import os
from pathlib import Path

from algosdk import account, mnemonic
from algosdk.v2client.algod import AlgodClient
from dotenv import load_dotenv


ENV_PATH = Path(__file__).resolve().parents[1] / ".env"


def _set_env_value(key: str, value: str) -> None:
    lines: list[str] = []
    if ENV_PATH.exists():
        lines = ENV_PATH.read_text(encoding="utf-8").splitlines()

    replaced = False
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}"
            replaced = True
            break

    if not replaced:
        lines.append(f"{key}={value}")

    ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _ensure_account(name: str, mnemonic_key: str) -> tuple[str, str, str]:
    phrase = os.getenv(mnemonic_key, "").strip()
    if phrase:
        private_key = mnemonic.to_private_key(phrase)
        address = account.address_from_private_key(private_key)
        return phrase, private_key, address

    private_key, address = account.generate_account()
    phrase = mnemonic.from_private_key(private_key)
    _set_env_value(mnemonic_key, phrase)
    print(f"Generated {name} account: {address}")
    return phrase, private_key, address


def main() -> None:
    load_dotenv()
    algod = AlgodClient(
        algod_token=os.getenv("LOCALNET_ALGOD_TOKEN", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
        algod_address=os.getenv("LOCALNET_ALGOD_URL", "http://localhost:4001"),
    )

    accounts = {
        "admin": _ensure_account("admin", "ADMIN_MNEMONIC"),
        "provider": _ensure_account("provider", "PROVIDER_MNEMONIC"),
        "agent": _ensure_account("agent", "AGENT_MNEMONIC"),
    }

    _set_env_value("PROVIDER_WALLET", accounts["provider"][2])

    print("\nAccount balances:")
    for name, (_, _, address) in accounts.items():
        info = algod.account_info(address)
        amount = int(info.get("amount", 0))
        print(f"- {name}: {address} -> {amount / 1_000_000:.6f} ALGO")

    print("\nIf balances are low, fund with:")
    print("- TestNet faucet: https://bank.testnet.algorand.network/")
    print("- LocalNet dispenser: algokit dispenser localnet --account <address> --amount 100")
    print("Current LocalNet round:", algod.status().get("last-round"))


if __name__ == "__main__":
    main()
