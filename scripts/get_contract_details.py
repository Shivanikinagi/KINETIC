from algosdk.v2client.algod import AlgodClient
from algosdk.v2client.indexer import IndexerClient

algod = AlgodClient('', 'https://testnet-api.algonode.cloud')
indexer = IndexerClient('', 'https://testnet-idx.algonode.cloud')

app_ids = {
    758813563: "Provider Registry",
    758813574: "Escrow",
    758813562: "Badge Minter"
}

print("=== SMART CONTRACT DETAILS ===\n")

for app_id, name in app_ids.items():
    try:
        app_info = algod.application_info(app_id)
        params = app_info.get('params', {})
        print(f"{name}")
        print(f"  App ID: {app_id}")
        print(f"  Creator: {params.get('creator', 'N/A')}")
        print(f"  App Address: {params.get('address', 'N/A')}")
        print(f"  Global State Vars: {len(params.get('global-state', []))}")
        
        # Get recent transactions for this app
        txs = indexer.search_transactions(application_id=app_id, limit=5)
        print(f"  Recent Transactions:")
        for tx in txs.get('transactions', [])[:3]:
            tx_id = tx.get('id', '')
            note = tx.get('note', '')
            print(f"    - {tx_id[:20]}... (Round: {tx.get('confirmed-round', 'N/A')})")
        print()
    except Exception as e:
        print(f"{name} (App {app_id}): Error - {e}\n")

# Get agent wallet address and balance
from algosdk.mnemonic import to_private_key
from algosdk.account import address_from_private_key

mnemonic_str = 'senior tribe earth north spell depth aspect favorite rotate narrow image fix mushroom legal local omit reveal box bind sister noodle ramp skin able sight'
private_key = to_private_key(mnemonic_str)
address = address_from_private_key(private_key)

print(f"Agent Wallet: {address}")

try:
    account_info = algod.account_info(address)
    print(f"  Balance: {account_info.get('amount', 0)} microALGO ({account_info.get('amount', 0) / 1_000_000:.2f} ALGO)")
    print(f"  Min Balance: {account_info.get('min-balance', 0)} microALGO")
except Exception as e:
    print(f"  Error getting balance: {e}")

# Get provider wallet
provider_mnemonic = 'exhibit casual spike wild injury humor wet update cup only left coconut carry hedgehog legend nephew october lava credit almost hard estate wheel about achieve'
provider_private_key = to_private_key(provider_mnemonic)
provider_address = address_from_private_key(provider_private_key)
print(f"\nProvider Wallet: {provider_address}")

try:
    account_info = algod.account_info(provider_address)
    print(f"  Balance: {account_info.get('amount', 0)} microALGO ({account_info.get('amount', 0) / 1_000_000:.2f} ALGO)")
except Exception as e:
    print(f"  Error getting balance: {e}")
