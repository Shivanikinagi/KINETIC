from __future__ import annotations

import sqlite3
from datetime import date
from pathlib import Path

from algosdk import account, mnemonic
from algosdk.transaction import PaymentTxn, wait_for_confirmation


class BudgetExceededError(Exception):
    pass


class AutonomousWallet:
    def __init__(self, mnemonic_phrase: str, algod_client, budget_per_job: int, daily_budget: int):
        self.private_key = mnemonic.to_private_key(mnemonic_phrase)
        self.address = account.address_from_private_key(self.private_key)
        self.algod_client = algod_client
        self.budget_per_job = budget_per_job
        self.daily_budget = daily_budget

        self.db_path = Path(__file__).resolve().parent / "spend_log.db"
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS spends(date TEXT, amount INTEGER)")
            conn.commit()

    def check_budget(self, amount: int) -> bool:
        if amount > self.budget_per_job:
            return False

        today = date.today().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM spends WHERE date = ?", (today,)).fetchone()
        today_total = int(row[0] if row else 0)

        return (today_total + amount) <= self.daily_budget

    async def sign_and_submit_payment(self, receiver: str, amount: int, note: str, algod_client) -> str:
        if not self.check_budget(amount):
            raise BudgetExceededError(f"budget exceeded for payment amount {amount}")

        params = algod_client.suggested_params()
        txn = PaymentTxn(
            sender=self.address,
            sp=params,
            receiver=receiver,
            amt=amount,
            note=note.encode("utf-8"),
        )

        signed = txn.sign(self.private_key)
        tx_id = algod_client.send_transaction(signed)
        wait_for_confirmation(algod_client, tx_id, 10)

        today = date.today().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT INTO spends(date, amount) VALUES (?, ?)", (today, amount))
            conn.commit()

        return tx_id

    def get_balance(self, algod_client) -> int:
        data = algod_client.account_info(self.address)
        return int(data.get("amount", 0))
