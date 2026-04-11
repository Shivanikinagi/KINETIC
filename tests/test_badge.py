from __future__ import annotations

import os

from algosdk import account, mnemonic
from algosdk.abi.method import Method
from algosdk.atomic_transaction_composer import AccountTransactionSigner, AtomicTransactionComposer
from algosdk.encoding import decode_address
from algosdk.v2client.algod import AlgodClient
from dotenv import load_dotenv


ROOT_ENV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))


def _algod() -> AlgodClient:
    return AlgodClient(
        algod_token=os.getenv(
            "ALGOD_TOKEN",
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ),
        algod_address=os.getenv("ALGOD_URL", "http://localhost:4001"),
    )


def test_mint_and_verify_badge():
    load_dotenv(ROOT_ENV)

    app_id = int(os.getenv("BADGE_APP_ID", "0"))
    assert app_id > 0

    admin_phrase = os.getenv("ADMIN_MNEMONIC", "")
    provider_phrase = os.getenv("PROVIDER_MNEMONIC", "")
    assert admin_phrase and provider_phrase

    admin_sk = mnemonic.to_private_key(admin_phrase)
    admin_addr = account.address_from_private_key(admin_sk)
    provider_addr = account.address_from_private_key(mnemonic.to_private_key(provider_phrase))

    algod = _algod()

    mint_method = Method.from_signature("mint_badge(address,byte[])uint64")
    atc = AtomicTransactionComposer()
    atc.add_method_call(
        app_id=app_id,
        method=mint_method,
        sender=admin_addr,
        sp=algod.suggested_params(),
        signer=AccountTransactionSigner(admin_sk),
        method_args=[provider_addr, b"provider-test"],
        boxes=[(0, b"badge" + decode_address(provider_addr))],
    )
    mint_result = atc.execute(algod, 4)
    asset_id = int(mint_result.abi_results[0].return_value)
    assert asset_id > 0

    verify_method = Method.from_signature("verify_badge(address)uint64")
    atc2 = AtomicTransactionComposer()
    atc2.add_method_call(
        app_id=app_id,
        method=verify_method,
        sender=admin_addr,
        sp=algod.suggested_params(),
        signer=AccountTransactionSigner(admin_sk),
        method_args=[provider_addr],
        boxes=[(0, b"badge" + decode_address(provider_addr))],
    )
    verify_result = atc2.execute(algod, 4)
    verified_id = int(verify_result.abi_results[0].return_value)
    assert verified_id == asset_id
