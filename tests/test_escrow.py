from __future__ import annotations

import os
import uuid

from algosdk import account, mnemonic
from algosdk.abi.method import Method
from algosdk.atomic_transaction_composer import AccountTransactionSigner, AtomicTransactionComposer, TransactionWithSigner
from algosdk.logic import get_application_address
from algosdk.transaction import PaymentTxn
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


def _account_from_env(key: str) -> tuple[str, str]:
    phrase = os.getenv(key, "")
    private_key = mnemonic.to_private_key(phrase)
    return private_key, account.address_from_private_key(private_key)


def _lock_payment(
    algod: AlgodClient,
    app_id: int,
    consumer_sk: str,
    consumer_addr: str,
    provider_addr: str,
    amount: int,
    proof_hash: bytes,
    timeout_rounds: int,
    job_id: bytes,
) -> None:
    box_key = b"job" + len(job_id).to_bytes(2, "big") + job_id

    pay_txn = PaymentTxn(
        sender=consumer_addr,
        sp=algod.suggested_params(),
        receiver=get_application_address(app_id),
        amt=amount,
    )
    pay_tws = TransactionWithSigner(pay_txn, AccountTransactionSigner(consumer_sk))

    lock_method = Method.from_signature("lock_payment(byte[],address,byte[],uint64)void")
    atc = AtomicTransactionComposer()
    atc.add_transaction(pay_tws)
    atc.add_method_call(
        app_id=app_id,
        method=lock_method,
        sender=consumer_addr,
        sp=algod.suggested_params(),
        signer=AccountTransactionSigner(consumer_sk),
        method_args=[job_id, provider_addr, proof_hash, timeout_rounds],
        boxes=[(0, box_key)],
    )
    atc.execute(algod, 4)


def _get_job_status(algod: AlgodClient, app_id: int, sender: str, sk: str, job_id: bytes) -> int:
    box_key = b"job" + len(job_id).to_bytes(2, "big") + job_id
    method = Method.from_signature("get_job_status(byte[])uint64")
    atc = AtomicTransactionComposer()
    atc.add_method_call(
        app_id=app_id,
        method=method,
        sender=sender,
        sp=algod.suggested_params(),
        signer=AccountTransactionSigner(sk),
        method_args=[job_id],
        boxes=[(0, box_key)],
    )
    result = atc.execute(algod, 4)
    return int(result.abi_results[0].return_value)


def _advance_rounds(algod: AlgodClient, rounds: int) -> None:
    admin_sk, admin_addr = _account_from_env("ADMIN_MNEMONIC")
    for _ in range(rounds):
        tx = PaymentTxn(
            sender=admin_addr,
            sp=algod.suggested_params(),
            receiver=admin_addr,
            amt=0,
        )
        txid = algod.send_transaction(tx.sign(admin_sk))
        algod.pending_transaction_info(txid)


def test_lock_and_release_status():
    load_dotenv(ROOT_ENV)
    app_id = int(os.getenv("ESCROW_APP_ID", "0"))
    assert app_id > 0

    consumer_sk, consumer_addr = _account_from_env("AGENT_MNEMONIC")
    _, provider_addr = _account_from_env("PROVIDER_MNEMONIC")
    algod = _algod()

    job_id = f"job-{uuid.uuid4()}".encode("utf-8")
    proof_hash = b"proof-release"

    _lock_payment(
        algod=algod,
        app_id=app_id,
        consumer_sk=consumer_sk,
        consumer_addr=consumer_addr,
        provider_addr=provider_addr,
        amount=1_000_000,
        proof_hash=proof_hash,
        timeout_rounds=20,
        job_id=job_id,
    )

    release_method = Method.from_signature("release_payment(byte[],byte[])void")
    box_key = b"job" + len(job_id).to_bytes(2, "big") + job_id
    atc = AtomicTransactionComposer()
    atc.add_method_call(
        app_id=app_id,
        method=release_method,
        sender=consumer_addr,
        sp=algod.suggested_params(),
        signer=AccountTransactionSigner(consumer_sk),
        method_args=[job_id, proof_hash],
        boxes=[(0, box_key)],
        accounts=[provider_addr],
    )
    atc.execute(algod, 4)

    assert _get_job_status(algod, app_id, consumer_addr, consumer_sk, job_id) == 1


def test_lock_and_refund_status():
    load_dotenv(ROOT_ENV)
    app_id = int(os.getenv("ESCROW_APP_ID", "0"))
    assert app_id > 0

    consumer_sk, consumer_addr = _account_from_env("AGENT_MNEMONIC")
    provider_sk, provider_addr = _account_from_env("PROVIDER_MNEMONIC")
    algod = _algod()

    job_id = f"job-{uuid.uuid4()}".encode("utf-8")
    proof_hash = b"proof-refund"

    _lock_payment(
        algod=algod,
        app_id=app_id,
        consumer_sk=consumer_sk,
        consumer_addr=consumer_addr,
        provider_addr=provider_addr,
        amount=1_000_000,
        proof_hash=proof_hash,
        timeout_rounds=1,
        job_id=job_id,
    )

    _advance_rounds(algod, 2)

    refund_method = Method.from_signature("refund_consumer(byte[])void")
    box_key = b"job" + len(job_id).to_bytes(2, "big") + job_id
    atc = AtomicTransactionComposer()
    atc.add_method_call(
        app_id=app_id,
        method=refund_method,
        sender=provider_addr,
        sp=algod.suggested_params(),
        signer=AccountTransactionSigner(provider_sk),
        method_args=[job_id],
        boxes=[(0, box_key)],
        accounts=[consumer_addr],
    )
    atc.execute(algod, 4)

    assert _get_job_status(algod, app_id, consumer_addr, consumer_sk, job_id) == 2
