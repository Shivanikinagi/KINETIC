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


def test_register_provider_and_readback():
    load_dotenv(ROOT_ENV)

    app_id = int(os.getenv("REGISTRY_APP_ID", "0"))
    assert app_id > 0

    provider_phrase = os.getenv("PROVIDER_MNEMONIC", "")
    assert provider_phrase

    provider_sk = mnemonic.to_private_key(provider_phrase)
    provider_addr = account.address_from_private_key(provider_sk)

    algod = _algod()

    reg_method = Method.from_signature("register_provider(uint64,byte[],uint64,byte[])void")
    atc = AtomicTransactionComposer()
    atc.add_method_call(
        app_id=app_id,
        method=reg_method,
        sender=provider_addr,
        sp=algod.suggested_params(),
        signer=AccountTransactionSigner(provider_sk),
        method_args=[8, b"RTX3090", 100, b"http://localhost:8000"],
        boxes=[(0, b"provider" + decode_address(provider_addr))],
    )
    atc.execute(algod, 4)

    get_method = Method.from_signature("get_provider(address)(uint64,byte[],uint64,byte[],uint64,uint64,uint64)")
    atc2 = AtomicTransactionComposer()
    atc2.add_method_call(
        app_id=app_id,
        method=get_method,
        sender=provider_addr,
        sp=algod.suggested_params(),
        signer=AccountTransactionSigner(provider_sk),
        method_args=[provider_addr],
        boxes=[(0, b"provider" + decode_address(provider_addr))],
    )
    result = atc2.execute(algod, 4)
    provider_info = result.abi_results[0].return_value

    assert int(provider_info[0]) >= 8
    assert int(provider_info[2]) >= 100
    assert int(provider_info[4]) == 100
    assert int(provider_info[5]) == 1
