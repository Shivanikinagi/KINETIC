from __future__ import annotations

import os

from algosdk import account, mnemonic
from algosdk.abi.method import Method
from algosdk.atomic_transaction_composer import AccountTransactionSigner, AtomicTransactionComposer
from algosdk.encoding import decode_address
from algosdk.v2client.algod import AlgodClient
from dotenv import load_dotenv


def _algod_client() -> AlgodClient:
    network = os.getenv("ALGORAND_NETWORK", "testnet").lower()
    if network == "localnet":
        return AlgodClient(
            algod_token=os.getenv(
                "LOCALNET_ALGOD_TOKEN",
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            ),
            algod_address=os.getenv("LOCALNET_ALGOD_URL", "http://localhost:4001"),
        )
    return AlgodClient(
        algod_token=os.getenv("ALGOD_TOKEN", ""),
        algod_address=os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud"),
    )


def main() -> None:
    load_dotenv()
    registry_app_id = os.getenv("REGISTRY_APP_ID", "")
    if not registry_app_id:
        raise SystemExit("REGISTRY_APP_ID missing in .env")

    provider_phrase = os.getenv("PROVIDER_MNEMONIC", "").strip()
    if not provider_phrase:
        raise SystemExit("PROVIDER_MNEMONIC missing in .env")

    provider_sk = mnemonic.to_private_key(provider_phrase)
    provider_addr = account.address_from_private_key(provider_sk)
    algod = _algod_client()

    signer = AccountTransactionSigner(provider_sk)
    atc = AtomicTransactionComposer()
    method = Method.from_signature("register_provider(uint64,byte[],uint64,byte[])void")

    vram_gb = int(os.getenv("PROVIDER_VRAM_GB", "8"))
    gpu_model = os.getenv("PROVIDER_GPU_MODEL", "RTX3090")
    price_per_hour = int(os.getenv("JOB_PRICE_PER_TOKEN_MICROALGO", "100"))
    endpoint = os.getenv("PROVIDER_ENDPOINT", "http://localhost:8000")

    atc.add_method_call(
        app_id=int(registry_app_id),
        method=method,
        sender=provider_addr,
        sp=algod.suggested_params(),
        signer=signer,
        method_args=[vram_gb, gpu_model.encode("utf-8"), price_per_hour, endpoint.encode("utf-8")],
        boxes=[(0, b"provider" + decode_address(provider_addr))],
    )
    result = atc.execute(algod, 4)
    print(f"Registering provider in app {registry_app_id}")
    print(f"Provider registered: {provider_addr}")
    print(f"Transaction ID: {result.tx_ids[0]}")


if __name__ == "__main__":
    main()
