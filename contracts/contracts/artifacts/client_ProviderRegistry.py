# This file is auto-generated, do not modify
# flake8: noqa
# fmt: off
import typing

import algopy

class ProviderInfo(algopy.arc4.Struct):
    vram_gb: algopy.arc4.UIntN[typing.Literal[64]]
    gpu_model: algopy.arc4.DynamicBytes
    price_per_hour: algopy.arc4.UIntN[typing.Literal[64]]
    endpoint_url: algopy.arc4.DynamicBytes
    uptime_score: algopy.arc4.UIntN[typing.Literal[64]]
    active: algopy.arc4.UIntN[typing.Literal[64]]
    badge_app_id: algopy.arc4.UIntN[typing.Literal[64]]

class ProviderRegistry(algopy.arc4.ARC4Client, typing.Protocol):
    @algopy.arc4.abimethod
    def set_badge_app_id(
        self,
        badge_app_id: algopy.arc4.UIntN[typing.Literal[64]],
    ) -> None: ...

    @algopy.arc4.abimethod
    def register_provider(
        self,
        vram_gb: algopy.arc4.UIntN[typing.Literal[64]],
        gpu_model: algopy.arc4.DynamicBytes,
        price_per_hour: algopy.arc4.UIntN[typing.Literal[64]],
        endpoint_url: algopy.arc4.DynamicBytes,
    ) -> None: ...

    @algopy.arc4.abimethod
    def deregister_provider(
        self,
    ) -> None: ...

    @algopy.arc4.abimethod
    def update_uptime_score(
        self,
        provider: algopy.arc4.Address,
        score: algopy.arc4.UIntN[typing.Literal[64]],
    ) -> None: ...

    @algopy.arc4.abimethod(readonly=True)
    def get_provider(
        self,
        provider: algopy.arc4.Address,
    ) -> ProviderInfo: ...
