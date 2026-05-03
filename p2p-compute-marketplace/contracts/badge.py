from algopy import ARC4Contract, Account, BoxMap, Global, GlobalState, Txn, UInt64, arc4, itxn


class BadgeMinter(ARC4Contract):
    def __init__(self) -> None:
        self.badge_holders = BoxMap(Account, UInt64, key_prefix=b"badge")
        self.total_minted = GlobalState(UInt64(0), key=b"total_minted")

    @arc4.abimethod
    def mint_badge(self, recipient: Account, campus_id: arc4.DynamicBytes) -> UInt64:
        assert Txn.sender == Global.creator_address, "only admin can mint"

        asset_name = b"CampusBadge-" + campus_id.bytes
        minted = itxn.AssetConfig(
            fee=UInt64(1000),
            total=UInt64(1),
            decimals=UInt64(0),
            default_frozen=True,
            clawback=Global.current_application_address,
            manager=Global.zero_address,
            reserve=Global.zero_address,
            freeze=Global.zero_address,
            unit_name=b"BADGE",
            asset_name=asset_name,
            url=b"ipfs://bafybeicampusbadgemetadata",
        ).submit()

        asset_id = minted.created_asset.id
        self.badge_holders[recipient] = asset_id
        self.total_minted.value = self.total_minted.value + UInt64(1)
        return asset_id

    @arc4.abimethod(readonly=True)
    def verify_badge(self, holder: Account) -> UInt64:
        if holder not in self.badge_holders:
            return UInt64(0)
        asa_id = self.badge_holders[holder]
        if asa_id == UInt64(0):
            return UInt64(0)
        return asa_id

    @arc4.abimethod
    def revoke_badge(self, holder: Account) -> None:
        assert Txn.sender == Global.creator_address, "only admin can revoke"
        assert holder in self.badge_holders, "holder has no badge"

        asset_id = self.badge_holders[holder]

        itxn.AssetTransfer(
            fee=UInt64(1000),
            xfer_asset=asset_id,
            asset_receiver=Global.current_application_address,
            asset_amount=UInt64(1),
            asset_sender=holder,
        ).submit()

        del self.badge_holders[holder]
