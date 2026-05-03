from __future__ import annotations

import os

import algosdk
from algosdk import account, mnemonic
from algosdk.abi.method import Method
from algosdk.atomic_transaction_composer import AccountTransactionSigner, AtomicTransactionComposer
from algosdk.encoding import decode_address
from algosdk.v2client.algod import AlgodClient
from dotenv import load_dotenv


def _algod_client() -> AlgodClient:
    return AlgodClient(
        algod_token=os.getenv("ALGOD_TOKEN", ""),
        algod_address=os.getenv("ALGOD_URL", "https://testnet-api.algonode.cloud"),
    )


def _app_address(app_id: int) -> str:
    return algosdk.logic.get_application_address(app_id)


def _account_from_mnemonic(env_key: str) -> tuple[str, str]:
    phrase = os.getenv(env_key, "").strip()
    if not phrase:
        raise SystemExit(f"{env_key} missing in .env")
    private_key = mnemonic.to_private_key(phrase)
    address = account.address_from_private_key(private_key)
    return private_key, address


def _ensure_opted_in(algod: AlgodClient, sender_sk: str, sender_addr: str, app_id: int) -> None:
    app_info = algod.application_info(app_id).get("params", {})
    creator = app_info.get("creator")
    if creator == sender_addr:
        return

    info = algod.account_info(sender_addr)
    app_ids = {entry.get("id") for entry in info.get("apps-local-state", [])}
    if app_id in app_ids:
        return

    sp = algod.suggested_params()
    txn = algosdk.transaction.ApplicationOptInTxn(sender=sender_addr, sp=sp, index=app_id)
    signed = txn.sign(sender_sk)
    txid = algod.send_transaction(signed)
    algosdk.transaction.wait_for_confirmation(algod, txid, 4)


def _ensure_asset_opt_in(algod: AlgodClient, sender_sk: str, sender_addr: str, asset_id: int) -> None:
    info = algod.account_info(sender_addr)
    held_assets = {entry.get("asset-id") for entry in info.get("assets", [])}
    if asset_id in held_assets:
        return
    sp = algod.suggested_params()
    optin = algosdk.transaction.AssetTransferTxn(
        sender=sender_addr,
        sp=sp,
        receiver=sender_addr,
        amt=0,
        index=asset_id,
    )
    txid = algod.send_transaction(optin.sign(sender_sk))
    algosdk.transaction.wait_for_confirmation(algod, txid, 4)


def _mint_badge(
    algod: AlgodClient,
    app_id: int,
    admin_sk: str,
    admin_addr: str,
    recipient: str,
    campus_id: str,
) -> int:
    signer = AccountTransactionSigner(admin_sk)
    atc = AtomicTransactionComposer()
    method = Method.from_signature("mint_badge(address,byte[])uint64")
    atc.add_method_call(
        app_id=app_id,
        method=method,
        sender=admin_addr,
        sp=algod.suggested_params(),
        signer=signer,
        method_args=[recipient, campus_id.encode("utf-8")],
        boxes=[(0, b"badge" + decode_address(recipient))],
    )
    result = atc.execute(algod, 4)
    return int(result.abi_results[0].return_value)


def main() -> None:
    load_dotenv()
    badge_app_id = os.getenv("BADGE_APP_ID", "")
    if not badge_app_id:
        raise SystemExit("BADGE_APP_ID missing in .env")

    app_id = int(badge_app_id)
    algod = _algod_client()

    admin_sk, admin_addr = _account_from_mnemonic("ADMIN_MNEMONIC")
    provider_sk, provider_addr = _account_from_mnemonic("PROVIDER_MNEMONIC")
    agent_sk, agent_addr = _account_from_mnemonic("AGENT_MNEMONIC")

    _ensure_opted_in(algod, admin_sk, admin_addr, app_id)

    print(f"Minting badges via BadgeMinter app {app_id} ({_app_address(app_id)})")
    provider_badge = _mint_badge(algod, app_id, admin_sk, admin_addr, provider_addr, "provider")
    agent_badge = _mint_badge(algod, app_id, admin_sk, admin_addr, agent_addr, "agent")

    _ensure_asset_opt_in(algod, provider_sk, provider_addr, provider_badge)
    _ensure_asset_opt_in(algod, agent_sk, agent_addr, agent_badge)

    print(f"Minted provider badge ASA: {provider_badge}")
    print(f"Minted agent badge ASA: {agent_badge}")
    print(
        "Note: current contract stores badge mapping on-chain but does not include a distribution call to move ASA to recipient account."
    )


if __name__ == "__main__":
    main()
