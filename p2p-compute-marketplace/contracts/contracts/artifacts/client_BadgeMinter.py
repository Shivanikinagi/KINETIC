# This file is auto-generated, do not modify
# flake8: noqa
# fmt: off
import typing

import algopy


class BadgeMinter(algopy.arc4.ARC4Client, typing.Protocol):
    @algopy.arc4.abimethod
    def mint_badge(
        self,
        recipient: algopy.arc4.Address,
        campus_id: algopy.arc4.DynamicBytes,
    ) -> algopy.arc4.UIntN[typing.Literal[64]]: ...

    @algopy.arc4.abimethod(readonly=True)
    def verify_badge(
        self,
        holder: algopy.arc4.Address,
    ) -> algopy.arc4.UIntN[typing.Literal[64]]: ...

    @algopy.arc4.abimethod
    def revoke_badge(
        self,
        holder: algopy.arc4.Address,
    ) -> None: ...
