from algopy import ARC4Contract, BoxMap, UInt64, arc4


class OrganisationInfo(arc4.Struct):
    org_id: arc4.DynamicBytes
    org_name: arc4.DynamicBytes
    owner_wallet: arc4.DynamicBytes
    logo_url: arc4.DynamicBytes
    description: arc4.DynamicBytes
    verified: UInt64
    jobs_completed: UInt64
    created_at: UInt64


class OrganisationRegistry(ARC4Contract):
    def __init__(self) -> None:
        self.organisations = BoxMap(arc4.DynamicBytes, OrganisationInfo, key_prefix=b"org")
        # Single-slot mirror keeps the latest org write for lightweight global reads.
        self.latest_org = BoxMap(UInt64, OrganisationInfo, key_prefix=b"latest")

    @arc4.abimethod
    def register_org(
        self,
        org_id: arc4.DynamicBytes,
        org_name: arc4.DynamicBytes,
        owner_wallet: arc4.DynamicBytes,
        logo_url: arc4.DynamicBytes,
        description: arc4.DynamicBytes,
        created_at: UInt64,
    ) -> None:
        assert org_id not in self.organisations, "org already exists"

        info = OrganisationInfo(
            org_id=org_id.copy(),
            org_name=org_name.copy(),
            owner_wallet=owner_wallet.copy(),
            logo_url=logo_url.copy(),
            description=description.copy(),
            verified=UInt64(0),
            jobs_completed=UInt64(0),
            created_at=created_at,
        )
        self.organisations[org_id] = info
        self.latest_org[UInt64(0)] = info

    @arc4.abimethod
    def update_org(
        self,
        org_id: arc4.DynamicBytes,
        org_name: arc4.DynamicBytes,
        logo_url: arc4.DynamicBytes,
        description: arc4.DynamicBytes,
    ) -> None:
        assert org_id in self.organisations, "org not found"

        current = self.organisations[org_id].copy()
        updated = OrganisationInfo(
            org_id=current.org_id.copy(),
            org_name=org_name.copy(),
            owner_wallet=current.owner_wallet.copy(),
            logo_url=logo_url.copy(),
            description=description.copy(),
            verified=current.verified,
            jobs_completed=current.jobs_completed,
            created_at=current.created_at,
        )
        self.organisations[org_id] = updated
        self.latest_org[UInt64(0)] = updated

    @arc4.abimethod
    def verify_org(self, org_id: arc4.DynamicBytes, completed_jobs: UInt64) -> None:
        assert org_id in self.organisations, "org not found"

        current = self.organisations[org_id].copy()
        is_verified = UInt64(1) if completed_jobs >= UInt64(50) else UInt64(0)
        updated = OrganisationInfo(
            org_id=current.org_id.copy(),
            org_name=current.org_name.copy(),
            owner_wallet=current.owner_wallet.copy(),
            logo_url=current.logo_url.copy(),
            description=current.description.copy(),
            verified=is_verified,
            jobs_completed=completed_jobs,
            created_at=current.created_at,
        )
        self.organisations[org_id] = updated
        self.latest_org[UInt64(0)] = updated

    @arc4.abimethod(readonly=True)
    def get_org(self, org_id: arc4.DynamicBytes) -> OrganisationInfo:
        assert org_id in self.organisations, "org not found"
        return self.organisations[org_id]
