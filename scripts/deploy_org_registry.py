from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

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


def _compile_contract() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    cmd = [
        sys.executable,
        "-m",
        "puyapy",
        "contracts/org_registry.py",
        "--out-dir",
        str(ARTIFACTS_DIR),
        "--output-bytecode",
        "--output-client",
        "--output-arc56",
    ]
    required_artifacts = [
        ARTIFACTS_DIR / "OrganisationRegistry.approval.bin",
        ARTIFACTS_DIR / "OrganisationRegistry.clear.bin",
        ARTIFACTS_DIR / "OrganisationRegistry.arc56.json",
    ]

    try:
        subprocess.run(cmd, cwd=PROJECT_ROOT, check=True)
    except subprocess.CalledProcessError as exc:
        if all(path.exists() for path in required_artifacts):
            print(f"Compile skipped ({exc}); using existing artifacts from {ARTIFACTS_DIR}")
            return
        raise


def _read_program(path: Path) -> bytes:
    return path.read_bytes()


def _deploy_arc56_app(
    algorand: AlgorandClient,
    sender_address: str,
    signer,
) -> int:
    app_spec_path = ARTIFACTS_DIR / "OrganisationRegistry.arc56.json"
    approval_bin_path = ARTIFACTS_DIR / "OrganisationRegistry.approval.bin"
    clear_bin_path = ARTIFACTS_DIR / "OrganisationRegistry.clear.bin"

    app_spec_text = app_spec_path.read_text(encoding="utf-8")
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
        metadata=AppDeploymentMetaData(name="OrganisationRegistry", version="1.0.0", updatable=True, deletable=True),
        create_params=create_params,
        update_params=update_params,
        delete_params=delete_params,
        on_update="append",
        on_schema_break="append",
    )

    deploy_result = algorand.app_deployer.deploy(deployment=deployment)
    app_id = int(deploy_result.app.app_id)

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


def _fund_application_account(
    algorand: AlgorandClient,
    sender_private_key: str,
    sender_address: str,
    app_id: int,
    amount_microalgo: int,
) -> None:
    if amount_microalgo <= 0:
        return

    app_address = get_application_address(app_id)
    pay = PaymentTxn(
        sender=sender_address,
        sp=algorand.client.algod.suggested_params(),
        receiver=app_address,
        amt=amount_microalgo,
    )
    tx_id = algorand.client.algod.send_transaction(pay.sign(sender_private_key))
    wait_for_confirmation(algorand.client.algod, tx_id, 4)


def main() -> None:
    load_dotenv(ENV_PATH)

    _compile_contract()

    algorand = _select_algorand_client()
    sender, signer, admin_private_key = _get_admin_signer(algorand)

    org_registry_app_id = _deploy_arc56_app(
        algorand=algorand,
        sender_address=sender,
        signer=signer,
    )

    app_fund = int(os.getenv("ORG_REGISTRY_APP_FUND_MICROALGO", "500000"))
    _fund_application_account(
        algorand=algorand,
        sender_private_key=admin_private_key,
        sender_address=sender,
        app_id=org_registry_app_id,
        amount_microalgo=app_fund,
    )

    print(f"ORG_REGISTRY_APP_ID={org_registry_app_id}")
    _update_env_var(ENV_PATH, "ORG_REGISTRY_APP_ID", str(org_registry_app_id))


if __name__ == "__main__":
    main()
