#!/usr/bin/env python3
"""
Stress Test: Demo Flow (5 iterations)
Tests the complete flow to ensure it works reliably before demo
"""

import asyncio
import os
import sys
import time
from datetime import datetime

import httpx
from dotenv import load_dotenv

load_dotenv()


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'


async def check_server_health():
    """Check if backend server is running"""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get("http://localhost:8000/health")
            if resp.status_code == 200:
                data = resp.json()
                return data.get("status") == "ok"
    except Exception:
        return False
    return False


async def check_frontend():
    """Check if frontend is accessible"""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get("http://localhost:3000")
            return resp.status_code == 200
    except Exception:
        return False


async def test_providers_endpoint():
    """Test /providers endpoint"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("http://localhost:8000/providers")
            if resp.status_code != 200:
                return False, f"Status {resp.status_code}"
            
            providers = resp.json()
            if len(providers) == 0:
                return False, "No providers found"
            
            return True, f"{len(providers)} providers"
    except Exception as e:
        return False, str(e)


async def test_job_submission():
    """Test job submission (402 flow)"""
    try:
        task = {
            "type": "inference",
            "tokens": 100,
            "payload": f"Stress test {datetime.now().isoformat()}",
            "required_vram": 4,
        }
        
        async with httpx.AsyncClient(timeout=30) as client:
            # First request should return 402
            resp1 = await client.post("http://localhost:8000/job", json={**task, "job_id": ""})
            
            if resp1.status_code != 402:
                return False, f"Expected 402, got {resp1.status_code}"
            
            payment_info = resp1.json()
            job_id = payment_info.get("job_id")
            
            if not job_id:
                return False, "No job_id in response"
            
            return True, f"Job ID: {job_id[:16]}..."
    except Exception as e:
        return False, str(e)


async def test_provider_dashboard():
    """Test provider dashboard"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get("http://localhost:8000/provider/dashboard")
            if resp.status_code != 200:
                return False, f"Status {resp.status_code}"
            
            if "Provider Dashboard" not in resp.text:
                return False, "Dashboard HTML not found"
            
            return True, "Dashboard accessible"
    except Exception as e:
        return False, str(e)


async def test_algoexplorer_links():
    """Test that AlgoExplorer links are valid"""
    registry_app_id = os.getenv("REGISTRY_APP_ID", "758813563")
    escrow_app_id = os.getenv("ESCROW_APP_ID", "758813574")
    
    links = [
        f"https://testnet.algoexplorer.io/application/{registry_app_id}",
        f"https://testnet.algoexplorer.io/application/{escrow_app_id}",
    ]
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            for link in links:
                resp = await client.get(link)
                if resp.status_code != 200:
                    return False, f"Link failed: {link}"
            
            return True, "All links valid"
    except Exception as e:
        return False, str(e)


async def run_single_iteration(iteration: int):
    """Run a single iteration of all tests"""
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}ITERATION {iteration}/5{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    start_time = time.time()
    results = {}
    
    # Test 1: Server Health
    print(f"\n{Colors.YELLOW}[1/5] Checking server health...{Colors.END}")
    health_ok = await check_server_health()
    results["health"] = health_ok
    if health_ok:
        print(f"{Colors.GREEN}✓ Server healthy{Colors.END}")
    else:
        print(f"{Colors.RED}✗ Server not healthy{Colors.END}")
        return results, time.time() - start_time
    
    # Test 2: Frontend
    print(f"\n{Colors.YELLOW}[2/5] Checking frontend...{Colors.END}")
    frontend_ok = await check_frontend()
    results["frontend"] = frontend_ok
    if frontend_ok:
        print(f"{Colors.GREEN}✓ Frontend accessible{Colors.END}")
    else:
        print(f"{Colors.RED}✗ Frontend not accessible{Colors.END}")
    
    # Test 3: Providers Endpoint
    print(f"\n{Colors.YELLOW}[3/5] Testing /providers endpoint...{Colors.END}")
    providers_ok, providers_msg = await test_providers_endpoint()
    results["providers"] = providers_ok
    if providers_ok:
        print(f"{Colors.GREEN}✓ Providers endpoint: {providers_msg}{Colors.END}")
    else:
        print(f"{Colors.RED}✗ Providers endpoint failed: {providers_msg}{Colors.END}")
    
    # Test 4: Job Submission
    print(f"\n{Colors.YELLOW}[4/5] Testing job submission (402 flow)...{Colors.END}")
    job_ok, job_msg = await test_job_submission()
    results["job"] = job_ok
    if job_ok:
        print(f"{Colors.GREEN}✓ Job submission: {job_msg}{Colors.END}")
    else:
        print(f"{Colors.RED}✗ Job submission failed: {job_msg}{Colors.END}")
    
    # Test 5: Provider Dashboard
    print(f"\n{Colors.YELLOW}[5/5] Testing provider dashboard...{Colors.END}")
    dashboard_ok, dashboard_msg = await test_provider_dashboard()
    results["dashboard"] = dashboard_ok
    if dashboard_ok:
        print(f"{Colors.GREEN}✓ Provider dashboard: {dashboard_msg}{Colors.END}")
    else:
        print(f"{Colors.RED}✗ Provider dashboard failed: {dashboard_msg}{Colors.END}")
    
    # Bonus: AlgoExplorer Links
    print(f"\n{Colors.YELLOW}[BONUS] Testing AlgoExplorer links...{Colors.END}")
    links_ok, links_msg = await test_algoexplorer_links()
    results["algoexplorer"] = links_ok
    if links_ok:
        print(f"{Colors.GREEN}✓ AlgoExplorer links: {links_msg}{Colors.END}")
    else:
        print(f"{Colors.RED}✗ AlgoExplorer links failed: {links_msg}{Colors.END}")
    
    duration = time.time() - start_time
    
    # Summary
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"\n{Colors.BLUE}Iteration {iteration} Summary:{Colors.END}")
    print(f"  Passed: {passed}/{total}")
    print(f"  Duration: {duration:.2f}s")
    
    return results, duration


async def main():
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}STRESS TEST: Demo Flow (5 Iterations){Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    # Pre-flight check
    print(f"\n{Colors.YELLOW}Pre-flight check...{Colors.END}")
    
    if not await check_server_health():
        print(f"{Colors.RED}✗ Backend server not running!{Colors.END}")
        print(f"\n{Colors.YELLOW}Please start the backend:{Colors.END}")
        print("  python -m uvicorn api.main:app --reload")
        return 1
    
    if not await check_frontend():
        print(f"{Colors.RED}✗ Frontend not accessible!{Colors.END}")
        print(f"\n{Colors.YELLOW}Please start the frontend:{Colors.END}")
        print("  cd web && npm run dev")
        return 1
    
    print(f"{Colors.GREEN}✓ Pre-flight check passed{Colors.END}")
    
    # Run 5 iterations
    all_results = []
    all_durations = []
    
    for i in range(1, 6):
        results, duration = await run_single_iteration(i)
        all_results.append(results)
        all_durations.append(duration)
        
        # Wait 2 seconds between iterations
        if i < 5:
            print(f"\n{Colors.YELLOW}Waiting 2 seconds before next iteration...{Colors.END}")
            await asyncio.sleep(2)
    
    # Final Summary
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BLUE}FINAL SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*60}{Colors.END}")
    
    # Calculate success rate per test
    test_names = ["health", "frontend", "providers", "job", "dashboard", "algoexplorer"]
    
    print(f"\n{Colors.YELLOW}Success Rate by Test:{Colors.END}")
    for test_name in test_names:
        successes = sum(1 for r in all_results if r.get(test_name, False))
        rate = (successes / 5) * 100
        
        if rate == 100:
            color = Colors.GREEN
        elif rate >= 80:
            color = Colors.YELLOW
        else:
            color = Colors.RED
        
        print(f"  {color}{test_name.capitalize()}: {successes}/5 ({rate:.0f}%){Colors.END}")
    
    # Overall success rate
    total_tests = len(test_names) * 5
    total_passed = sum(sum(1 for v in r.values() if v) for r in all_results)
    overall_rate = (total_passed / total_tests) * 100
    
    print(f"\n{Colors.YELLOW}Overall:{Colors.END}")
    print(f"  Total Tests: {total_tests}")
    print(f"  Passed: {total_passed}")
    print(f"  Success Rate: {overall_rate:.1f}%")
    
    # Performance
    avg_duration = sum(all_durations) / len(all_durations)
    min_duration = min(all_durations)
    max_duration = max(all_durations)
    
    print(f"\n{Colors.YELLOW}Performance:{Colors.END}")
    print(f"  Average Duration: {avg_duration:.2f}s")
    print(f"  Min Duration: {min_duration:.2f}s")
    print(f"  Max Duration: {max_duration:.2f}s")
    
    # Verdict
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    
    if overall_rate >= 95:
        print(f"{Colors.GREEN}✓ DEMO READY!{Colors.END}")
        print(f"{Colors.GREEN}All systems operational. Safe to demo.{Colors.END}")
        return 0
    elif overall_rate >= 80:
        print(f"{Colors.YELLOW}⚠ MOSTLY READY{Colors.END}")
        print(f"{Colors.YELLOW}Some issues detected. Review failures above.{Colors.END}")
        return 0
    else:
        print(f"{Colors.RED}✗ NOT READY{Colors.END}")
        print(f"{Colors.RED}Multiple failures detected. Fix issues before demo.{Colors.END}")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
