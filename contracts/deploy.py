from pathlib import Path
import json
import os
import subprocess
import sys

from algokit_utils import (
    AlgoAmount,
    AlgorandClient,
    AppCreateParams,
    AppCreateSchema,
    AppDeleteParams,
    AppDeployParams,
    AppDeploymentMetaData,
    AppUpdateParams,
)
from algosdk import account, mnemonic
from algosdk.abi.method import Method
from algosdk.atomic_transaction_composer import AccountTransactionSigner, AtomicTransactionComposer
from algosdk.logic import get_application_address
from algosdk.transaction import PaymentTxn, wait_for_confirmation
from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env"
ARTIFACTS_DIR = PROJECT_ROOT / "contracts" / "contracts" / "artifacts"


def _update_env_var(path: Path, key: str, value: str) -> None:
    lines: list[str] = []
    if path.exists():
        lines = path.read_text(encoding="utf-8").splitlines()

    replaced = False
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}"
            replaced = True
            break

    if not replaced:
        lines.append(f"{key}={value}")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _select_algorand_client() -> AlgorandClient:
    network = os.getenv("ALGORAND_NETWORK", "testnet").lower().strip()
    if network == "localnet":
        raise RuntimeError("LocalNet is disabled for this deployment flow. Set ALGORAND_NETWORK=testnet.")

    if network == "mainnet":
        return AlgorandClient.mainnet()

    return AlgorandClient.testnet()


def _compile_contracts() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable,
        "-m",
        "puyapy",
        "contracts/escrow.py",
        "contracts/registry.py",
        "contracts/badge.py",
        "--out-dir",
        str(ARTIFACTS_DIR),
        "--output-bytecode",
        "--output-client",
        "--output-arc56",
    ]
    subprocess.run(cmd, cwd=PROJECT_ROOT, check=True)


def _read_program(path: Path) -> bytes:
    return path.read_bytes()


def _read_arc56(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _deploy_arc56_app(
    algorand: AlgorandClient,
    app_name: str,
    app_spec_path: Path,
    approval_bin_path: Path,
    clear_bin_path: Path,
    sender_address: str,
    signer,
) -> int:
    app_spec_text = _read_arc56(app_spec_path)
    approval = _read_program(approval_bin_path)
    clear = _read_program(clear_bin_path)

    create_params = AppCreateParams(
        sender=sender_address,
        signer=signer,
        approval_program=approval,
        clear_state_program=clear,
        schema=AppCreateSchema(global_ints=8, global_byte_slices=8, local_ints=8, local_byte_slices=8),
        max_fee=AlgoAmount.from_micro_algo(2_000_000),
    )
    update_params = AppUpdateParams(
        sender=sender_address,
        signer=signer,
        app_id=0,
        approval_program=approval,
        clear_state_program=clear,
        max_fee=AlgoAmount.from_micro_algo(2_000_000),
    )
    delete_params = AppDeleteParams(
        sender=sender_address,
        signer=signer,
        app_id=0,
        max_fee=AlgoAmount.from_micro_algo(2_000_000),
    )

    deployment = AppDeployParams(
        metadata=AppDeploymentMetaData(name=app_name, version="1.0.0", updatable=True, deletable=True),
        create_params=create_params,
        update_params=update_params,
        delete_params=delete_params,
        on_update="append",
        on_schema_break="append",
    )

    factory_result = algorand.app_deployer.deploy(deployment=deployment)

    app_id = int(factory_result.app.app_id)

    # record ARC-56 with latest app id in networks section for downstream tooling
    spec_json = json.loads(app_spec_text)
    spec_json.setdefault("networks", {})
    spec_json["networks"]["current"] = {"appID": app_id}
    app_spec_path.write_text(json.dumps(spec_json, indent=2), encoding="utf-8")

    return app_id


def _get_admin_signer(algorand: AlgorandClient):
    admin_mnemonic = os.getenv("ADMIN_MNEMONIC", "").strip()
    if not admin_mnemonic:
        raise RuntimeError("ADMIN_MNEMONIC missing from .env")

    private_key = mnemonic.to_private_key(admin_mnemonic)
    address = account.address_from_private_key(private_key)
    signer = algorand.account.from_mnemonic(mnemonic=admin_mnemonic)
    algorand.account.set_signer_from_account(signer)
    return address, signer.signer, private_key


def _set_registry_badge_app_id(
    algorand: AlgorandClient,
    registry_app_id: int,
    badge_app_id: int,
    admin_address: str,
    admin_private_key: str,
) -> None:
    composer = AtomicTransactionComposer()
    signer = AccountTransactionSigner(admin_private_key)
    method = Method.from_signature("set_badge_app_id(uint64)void")
    composer.add_method_call(
        app_id=registry_app_id,
        method=method,
        sender=admin_address,
        sp=algorand.client.algod.suggested_params(),
        signer=signer,
        method_args=[badge_app_id],
    )
    composer.execute(algorand.client.algod, 4)


def _fund_application_account(
    algorand: AlgorandClient,
    sender_private_key: str,
    sender_address: str,
    app_id: int,
    amount_microalgo: int,
) -> None:
    app_address = get_application_address(app_id)
    sp = algorand.client.algod.suggested_params()
    pay = PaymentTxn(
        sender=sender_address,
        sp=sp,
        receiver=app_address,
        amt=amount_microalgo,
    )
    tx_id = algorand.client.algod.send_transaction(pay.sign(sender_private_key))
    wait_for_confirmation(algorand.client.algod, tx_id, 4)


def main() -> None:
    load_dotenv(ENV_PATH)

    _compile_contracts()

    algorand = _select_algorand_client()
    sender, signer, admin_private_key = _get_admin_signer(algorand)

    badge_app_id = _deploy_arc56_app(
        algorand=algorand,
        app_name="BadgeMinter",
        app_spec_path=ARTIFACTS_DIR / "BadgeMinter.arc56.json",
        approval_bin_path=ARTIFACTS_DIR / "BadgeMinter.approval.bin",
        clear_bin_path=ARTIFACTS_DIR / "BadgeMinter.clear.bin",
        sender_address=sender,
        signer=signer,
    )

    registry_app_id = _deploy_arc56_app(
        algorand=algorand,
        app_name="ProviderRegistry",
        app_spec_path=ARTIFACTS_DIR / "ProviderRegistry.arc56.json",
        approval_bin_path=ARTIFACTS_DIR / "ProviderRegistry.approval.bin",
        clear_bin_path=ARTIFACTS_DIR / "ProviderRegistry.clear.bin",
        sender_address=sender,
        signer=signer,
    )

    _set_registry_badge_app_id(
        algorand=algorand,
        registry_app_id=registry_app_id,
        badge_app_id=badge_app_id,
        admin_address=sender,
        admin_private_key=admin_private_key,
    )

    escrow_app_id = _deploy_arc56_app(
        algorand=algorand,
        app_name="EscrowContract",
        app_spec_path=ARTIFACTS_DIR / "EscrowContract.arc56.json",
        approval_bin_path=ARTIFACTS_DIR / "EscrowContract.approval.bin",
        clear_bin_path=ARTIFACTS_DIR / "EscrowContract.clear.bin",
        sender_address=sender,
        signer=signer,
    )

    _fund_application_account(
        algorand=algorand,
        sender_private_key=admin_private_key,
        sender_address=sender,
        app_id=badge_app_id,
        amount_microalgo=3_000_000,
    )
    _fund_application_account(
        algorand=algorand,
        sender_private_key=admin_private_key,
        sender_address=sender,
        app_id=registry_app_id,
        amount_microalgo=2_000_000,
    )
    _fund_application_account(
        algorand=algorand,
        sender_private_key=admin_private_key,
        sender_address=sender,
        app_id=escrow_app_id,
        amount_microalgo=5_000_000,
    )

    print(f"BADGE_APP_ID={badge_app_id}")
    print(f"REGISTRY_APP_ID={registry_app_id}")
    print(f"ESCROW_APP_ID={escrow_app_id}")

    _update_env_var(ENV_PATH, "BADGE_APP_ID", str(badge_app_id))
    _update_env_var(ENV_PATH, "REGISTRY_APP_ID", str(registry_app_id))
    _update_env_var(ENV_PATH, "ESCROW_APP_ID", str(escrow_app_id))


if __name__ == "__main__":
    main()
