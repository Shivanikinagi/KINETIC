from algopy import ARC4Contract, Account, BoxMap, Global, Txn, UInt64, arc4


class ProviderInfo(arc4.Struct):
    vram_gb: UInt64
    gpu_model: arc4.DynamicBytes
    price_per_hour: UInt64
    endpoint_url: arc4.DynamicBytes
    uptime_score: UInt64
    active: UInt64
    badge_app_id: UInt64
    org_name: arc4.DynamicBytes
    logo_url: arc4.DynamicBytes


class ProviderRegistry(ARC4Contract):
    def __init__(self) -> None:
        self.providers = BoxMap(Account, ProviderInfo, key_prefix=b"provider")
        self.badge_app_id = UInt64(0)

    @arc4.abimethod
    def set_badge_app_id(self, badge_app_id: UInt64) -> None:
        assert Txn.sender == Global.creator_address, "only creator can set badge app id"
        self.badge_app_id = badge_app_id

    @arc4.abimethod
    def register_provider(
        self,
        vram_gb: UInt64,
        gpu_model: arc4.DynamicBytes,
        price_per_hour: UInt64,
        endpoint_url: arc4.DynamicBytes,
        org_name: arc4.DynamicBytes,
        logo_url: arc4.DynamicBytes,
    ) -> None:
        # TODO: Replace this creator bypass with inner app call to BadgeMinter.verify_badge.
        assert Txn.sender == Global.creator_address or self.badge_app_id > UInt64(0), "badge check failed"

        self.providers[Txn.sender] = ProviderInfo(
            vram_gb=vram_gb,
            gpu_model=gpu_model.copy(),
            price_per_hour=price_per_hour,
            endpoint_url=endpoint_url.copy(),
            uptime_score=UInt64(100),
            active=UInt64(1),
            badge_app_id=self.badge_app_id,
            org_name=org_name.copy(),
            logo_url=logo_url.copy(),
        )

    @arc4.abimethod
    def deregister_provider(self) -> None:
        assert Txn.sender in self.providers, "provider not registered"
        data = self.providers[Txn.sender].copy()
        self.providers[Txn.sender] = ProviderInfo(
            vram_gb=data.vram_gb,
            gpu_model=data.gpu_model.copy(),
            price_per_hour=data.price_per_hour,
            endpoint_url=data.endpoint_url.copy(),
            uptime_score=data.uptime_score,
            active=UInt64(0),
            badge_app_id=data.badge_app_id,
            org_name=data.org_name.copy(),
            logo_url=data.logo_url.copy(),
        )

    @arc4.abimethod
    def update_uptime_score(self, provider: Account, score: UInt64) -> None:
        assert Txn.sender == Global.creator_address, "only creator can update uptime"
        assert provider in self.providers, "provider not found"
        assert score <= UInt64(100), "score must be 0-100"

        data = self.providers[provider].copy()
        self.providers[provider] = ProviderInfo(
            vram_gb=data.vram_gb,
            gpu_model=data.gpu_model.copy(),
            price_per_hour=data.price_per_hour,
            endpoint_url=data.endpoint_url.copy(),
            uptime_score=score,
            active=data.active,
            badge_app_id=data.badge_app_id,
            org_name=data.org_name.copy(),
            logo_url=data.logo_url.copy(),
        )

    @arc4.abimethod(readonly=True)
    def get_provider(self, provider: Account) -> ProviderInfo:
        assert provider in self.providers, "provider not found"
        return self.providers[provider]
