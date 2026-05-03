# This file is auto-generated, do not modify
# flake8: noqa
# fmt: off
import typing

import algopy


class EscrowContract(algopy.arc4.ARC4Client, typing.Protocol):
    @algopy.arc4.abimethod
    def lock_payment(
        self,
        job_id: algopy.arc4.DynamicBytes,
        provider: algopy.arc4.Address,
        expected_proof_hash: algopy.arc4.DynamicBytes,
        timeout_rounds: algopy.arc4.UIntN[typing.Literal[64]],
    ) -> None: ...

    @algopy.arc4.abimethod
    def release_payment(
        self,
        job_id: algopy.arc4.DynamicBytes,
        proof_hash: algopy.arc4.DynamicBytes,
    ) -> None: ...

    @algopy.arc4.abimethod
    def refund_consumer(
        self,
        job_id: algopy.arc4.DynamicBytes,
    ) -> None: ...

    @algopy.arc4.abimethod(readonly=True)
    def get_job_status(
        self,
        job_id: algopy.arc4.DynamicBytes,
    ) -> algopy.arc4.UIntN[typing.Literal[64]]: ...
