from algopy import (
    ARC4Contract,
    Account,
    BoxMap,
    Global,
    Txn,
    UInt64,
    arc4,
    gtxn,
    itxn,
)


class JobState(arc4.Struct):
    consumer: Account
    provider: Account
    amount: UInt64
    proof_hash: arc4.DynamicBytes
    timeout_round: UInt64
    status: UInt64


class EscrowContract(ARC4Contract):
    def __init__(self) -> None:
        self.jobs = BoxMap(arc4.DynamicBytes, JobState, key_prefix=b"job")

    @arc4.abimethod
    def lock_payment(
        self,
        job_id: arc4.DynamicBytes,
        provider: Account,
        expected_proof_hash: arc4.DynamicBytes,
        timeout_rounds: UInt64,
    ) -> None:
        assert job_id not in self.jobs, "job already exists"

        pay_txn = gtxn.PaymentTransaction(0)
        assert pay_txn.receiver == Global.current_application_address, "group payment must fund escrow"
        assert pay_txn.amount > UInt64(0), "payment must be positive"

        timeout_round = Global.round + timeout_rounds
        self.jobs[job_id] = JobState(
            consumer=Txn.sender,
            provider=provider,
            amount=pay_txn.amount,
            proof_hash=expected_proof_hash.copy(),
            timeout_round=timeout_round,
            status=UInt64(0),
        )

        arc4.emit(
            "JobLocked(byte[],address,address,uint64)",
            job_id,
            Txn.sender,
            provider,
            pay_txn.amount,
        )

    @arc4.abimethod
    def release_payment(self, job_id: arc4.DynamicBytes, proof_hash: arc4.DynamicBytes) -> None:
        assert job_id in self.jobs, "job not found"

        job = self.jobs[job_id].copy()
        assert job.status == UInt64(0), "job is not locked"
        assert Txn.sender == job.consumer, "only original consumer can release"
        assert proof_hash == job.proof_hash, "proof hash mismatch"

        itxn.Payment(receiver=job.provider, amount=job.amount, fee=UInt64(1000)).submit()

        self.jobs[job_id] = JobState(
            consumer=job.consumer,
            provider=job.provider,
            amount=job.amount,
            proof_hash=job.proof_hash.copy(),
            timeout_round=job.timeout_round,
            status=UInt64(1),
        )

        arc4.emit("JobCompleted(byte[],byte[])", job_id, proof_hash)

    @arc4.abimethod
    def refund_consumer(self, job_id: arc4.DynamicBytes) -> None:
        assert job_id in self.jobs, "job not found"

        job = self.jobs[job_id].copy()
        assert job.status == UInt64(0), "job is not locked"
        assert Global.round > job.timeout_round, "timeout not reached"

        itxn.Payment(receiver=job.consumer, amount=job.amount, fee=UInt64(1000)).submit()

        self.jobs[job_id] = JobState(
            consumer=job.consumer,
            provider=job.provider,
            amount=job.amount,
            proof_hash=job.proof_hash.copy(),
            timeout_round=job.timeout_round,
            status=UInt64(2),
        )

        arc4.emit("JobRefunded(byte[])", job_id)

    @arc4.abimethod(readonly=True)
    def get_job_status(self, job_id: arc4.DynamicBytes) -> UInt64:
        assert job_id in self.jobs, "job not found"
        return self.jobs[job_id].status
