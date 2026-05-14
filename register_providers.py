#!/usr/bin/env python3
"""
Register real providers on TestNet for Phase 3
"""

import asyncio
import os
import sys

import httpx
from algosdk.account import generate_account
from dotenv import load_dotenv

load_dotenv()


async def register_provider(
    gpu_model: str,
    vram_gb: int,
    price_per_hour: float,
    endpoint: str,
    org_name: str,
    logo_url: str,
    provider_mnemonic: str,
) -> dict:
    """Register a provider via API"""
    
    payload = {
        "gpu_model": gpu_model,
        "vram_gb": vram_gb,
        "price_per_hour": price_per_hour,
        "endpoint": endpoint,
        "org_name": org_name,
        "logo_url": logo_url,
        "provider_mnemonic": provider_mnemonic,
    }
    
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "http://localhost:8000/provider/register",
            json=payload
        )
        
        if resp.status_code == 200:
            return resp.json()
        else:
            print(f"Error: {resp.status_code} - {resp.text}")
            return None


async def main():
    print("=" * 60)
    print("PHASE 3: Register Real Providers on TestNet")
    print("=" * 60)
    
    # Check if server is running
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            health = await client.get("http://localhost:8000/health")
            if health.status_code != 200:
                print("❌ Server not healthy. Please start the server first:")
                print("   python -m uvicorn api.main:app --reload")
                return 1
    except Exception:
        print("❌ Server not running. Please start the server first:")
        print("   python -m uvicorn api.main:app --reload")
        return 1
    
    print("\n✓ Server is running")
    
    # Generate 3 new provider accounts
    print("\n📝 Generating provider accounts...")
    
    providers = []
    
    # Provider 1: ARES CLUSTER-04 (RTX 4090)
    private_key1, address1 = generate_account()
    from algosdk.mnemonic import from_private_key
    mnemonic1 = from_private_key(private_key1)
    
    providers.append({
        "gpu_model": "RTX 4090",
        "vram_gb": 24,
        "price_per_hour": 1.42,
        "endpoint": "",
        "org_name": "ARES CLUSTER-04",
        "logo_url": "",
        "provider_mnemonic": mnemonic1,
        "address": address1,
    })
    
    # Provider 2: A100 GPU Pod
    private_key2, address2 = generate_account()
    mnemonic2 = from_private_key(private_key2)
    
    providers.append({
        "gpu_model": "A100",
        "vram_gb": 40,
        "price_per_hour": 2.85,
        "endpoint": "",
        "org_name": "A100 GPU Pod",
        "logo_url": "",
        "provider_mnemonic": mnemonic2,
        "address": address2,
    })
    
    # Provider 3: H100 Cluster
    private_key3, address3 = generate_account()
    mnemonic3 = from_private_key(private_key3)
    
    providers.append({
        "gpu_model": "H100",
        "vram_gb": 80,
        "price_per_hour": 4.50,
        "endpoint": "",
        "org_name": "H100 Cluster",
        "logo_url": "",
        "provider_mnemonic": mnemonic3,
        "address": address3,
    })
    
    print(f"\n✓ Generated {len(providers)} provider accounts")
    
    # Fund accounts (user needs to do this manually)
    print("\n⚠️  IMPORTANT: Fund these accounts with TestNet ALGO:")
    print("   Visit: https://bank.testnet.algorand.network/")
    print()
    for i, p in enumerate(providers, 1):
        print(f"   Provider {i} ({p['org_name']}): {p['address']}")
    
    print("\n⏳ Waiting for you to fund the accounts...")
    print("   Press ENTER when done, or Ctrl+C to cancel")
    
    try:
        input()
    except KeyboardInterrupt:
        print("\n\n❌ Cancelled")
        return 1
    
    # Register providers
    print("\n🚀 Registering providers on-chain...")
    
    results = []
    for i, provider in enumerate(providers, 1):
        print(f"\n[{i}/{len(providers)}] Registering {provider['org_name']}...")
        
        result = await register_provider(
            gpu_model=provider["gpu_model"],
            vram_gb=provider["vram_gb"],
            price_per_hour=provider["price_per_hour"],
            endpoint=provider["endpoint"],
            org_name=provider["org_name"],
            logo_url=provider["logo_url"],
            provider_mnemonic=provider["provider_mnemonic"],
        )
        
        if result:
            print(f"   ✓ Success!")
            print(f"   Address: {result['provider_address']}")
            print(f"   TxID: {result['tx_id']}")
            print(f"   Explorer: {result['explorer_url']}")
            results.append(result)
        else:
            print(f"   ✗ Failed")
    
    # Summary
    print("\n" + "=" * 60)
    print("REGISTRATION SUMMARY")
    print("=" * 60)
    
    print(f"\nRegistered: {len(results)}/{len(providers)} providers")
    
    if results:
        print("\n✅ Successfully registered providers:")
        for r in results:
            print(f"   - {r['details']['org_name']}")
            print(f"     Address: {r['provider_address']}")
            print(f"     GPU: {r['details']['gpu_model']} ({r['details']['vram_gb']}GB)")
            print(f"     Price: {r['details']['price_per_hour']} ALGO/hour")
            print(f"     Explorer: {r['explorer_url']}")
            print()
        
        print("🎉 Phase 3 Task 2 Complete!")
        print("\nVerify on AlgoExplorer:")
        print(f"   https://testnet.algoexplorer.io/application/{os.getenv('REGISTRY_APP_ID', '758813563')}")
        
        return 0
    else:
        print("\n❌ No providers registered successfully")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
