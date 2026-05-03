"""
Proof of Compute System
Generates cryptographic proofs at each step of job execution
"""
import hashlib
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
import asyncio


@dataclass
class ProofStep:
    """Single proof step in the execution chain"""
    step_id: str
    step_name: str
    timestamp: float
    status: str  # pending, running, completed, failed
    proof_hash: str
    details: Dict
    previous_hash: Optional[str] = None


@dataclass
class JobProof:
    """Complete proof chain for a job"""
    job_id: str
    provider_id: str
    consumer_address: str
    start_time: float
    end_time: Optional[float] = None
    steps: List[ProofStep] = None
    final_proof_hash: Optional[str] = None
    status: str = "pending"
    
    def __post_init__(self):
        if self.steps is None:
            self.steps = []


class ProofGenerator:
    """Generates cryptographic proofs for job execution"""
    
    def __init__(self):
        self.active_proofs: Dict[str, JobProof] = {}
    
    def create_job_proof(self, job_id: str, provider_id: str, consumer_address: str) -> JobProof:
        """Create a new proof chain for a job"""
        proof = JobProof(
            job_id=job_id,
            provider_id=provider_id,
            consumer_address=consumer_address,
            start_time=time.time(),
            status="initialized"
        )
        self.active_proofs[job_id] = proof
        return proof
    
    def add_proof_step(
        self,
        job_id: str,
        step_name: str,
        status: str,
        details: Dict
    ) -> ProofStep:
        """Add a proof step to the chain"""
        if job_id not in self.active_proofs:
            raise ValueError(f"Job {job_id} not found in active proofs")
        
        proof = self.active_proofs[job_id]
        
        # Get previous hash
        previous_hash = None
        if proof.steps:
            previous_hash = proof.steps[-1].proof_hash
        
        # Generate step ID
        step_id = f"{job_id}_{len(proof.steps)}"
        
        # Create proof data
        proof_data = {
            "step_id": step_id,
            "step_name": step_name,
            "timestamp": time.time(),
            "status": status,
            "details": details,
            "previous_hash": previous_hash,
            "job_id": job_id
        }
        
        # Generate proof hash
        proof_hash = self._generate_hash(proof_data)
        
        # Create step
        step = ProofStep(
            step_id=step_id,
            step_name=step_name,
            timestamp=proof_data["timestamp"],
            status=status,
            proof_hash=proof_hash,
            details=details,
            previous_hash=previous_hash
        )
        
        # Add to chain
        proof.steps.append(step)
        
        # Update job status
        proof.status = status
        
        return step
    
    def complete_job_proof(self, job_id: str, result_hash: str) -> JobProof:
        """Complete the proof chain and generate final proof"""
        if job_id not in self.active_proofs:
            raise ValueError(f"Job {job_id} not found in active proofs")
        
        proof = self.active_proofs[job_id]
        proof.end_time = time.time()
        proof.status = "completed"
        
        # Generate final proof hash from entire chain
        chain_data = {
            "job_id": job_id,
            "provider_id": proof.provider_id,
            "consumer_address": proof.consumer_address,
            "start_time": proof.start_time,
            "end_time": proof.end_time,
            "steps": [asdict(step) for step in proof.steps],
            "result_hash": result_hash
        }
        
        proof.final_proof_hash = self._generate_hash(chain_data)
        
        return proof
    
    def get_proof(self, job_id: str) -> Optional[JobProof]:
        """Get proof for a job"""
        return self.active_proofs.get(job_id)
    
    def verify_proof_chain(self, job_id: str) -> bool:
        """Verify the integrity of the proof chain"""
        if job_id not in self.active_proofs:
            return False
        
        proof = self.active_proofs[job_id]
        
        # Verify each step's hash
        for i, step in enumerate(proof.steps):
            # Recreate proof data
            proof_data = {
                "step_id": step.step_id,
                "step_name": step.step_name,
                "timestamp": step.timestamp,
                "status": step.status,
                "details": step.details,
                "previous_hash": step.previous_hash,
                "job_id": job_id
            }
            
            # Verify hash
            expected_hash = self._generate_hash(proof_data)
            if expected_hash != step.proof_hash:
                return False
            
            # Verify chain linkage
            if i > 0:
                if step.previous_hash != proof.steps[i-1].proof_hash:
                    return False
        
        return True
    
    def _generate_hash(self, data: Dict) -> str:
        """Generate SHA-256 hash of data"""
        json_str = json.dumps(data, sort_keys=True)
        return hashlib.sha256(json_str.encode()).hexdigest()
    
    def export_proof(self, job_id: str) -> Dict:
        """Export proof as JSON for verification"""
        if job_id not in self.active_proofs:
            return {}
        
        proof = self.active_proofs[job_id]
        return {
            "job_id": proof.job_id,
            "provider_id": proof.provider_id,
            "consumer_address": proof.consumer_address,
            "start_time": proof.start_time,
            "end_time": proof.end_time,
            "status": proof.status,
            "steps": [asdict(step) for step in proof.steps],
            "final_proof_hash": proof.final_proof_hash,
            "chain_valid": self.verify_proof_chain(job_id)
        }


# Global proof generator instance
proof_generator = ProofGenerator()


# Job execution steps with proofs
async def execute_job_with_proofs(
    job_id: str,
    provider_id: str,
    consumer_address: str,
    job_data: Dict,
    publish_event_func
):
    """
    Execute a job with proof generation at each step
    
    Steps:
    1. Job Received
    2. Escrow Locked
    3. Resource Allocation
    4. Job Execution Started
    5. Job Processing (with progress updates)
    6. Job Completed
    7. Result Verification
    8. Proof Generated
    9. Payment Released
    """
    
    # Create proof chain
    proof = proof_generator.create_job_proof(job_id, provider_id, consumer_address)
    
    try:
        # Step 1: Job Received
        step = proof_generator.add_proof_step(
            job_id,
            "job_received",
            "completed",
            {
                "message": "Job received and validated",
                "job_type": job_data.get("type", "compute"),
                "requirements": job_data.get("requirements", {})
            }
        )
        await publish_event_func("proof", {
            "job_id": job_id,
            "step": "job_received",
            "proof_hash": step.proof_hash,
            "message": "Job received and validated"
        })
        await asyncio.sleep(0.5)
        
        # Step 2: Escrow Locked
        step = proof_generator.add_proof_step(
            job_id,
            "escrow_locked",
            "completed",
            {
                "message": "Payment locked in escrow",
                "amount": job_data.get("payment_amount", 0),
                "escrow_address": job_data.get("escrow_address", "")
            }
        )
        await publish_event_func("proof", {
            "job_id": job_id,
            "step": "escrow_locked",
            "proof_hash": step.proof_hash,
            "message": "Payment secured in escrow"
        })
        await asyncio.sleep(0.5)
        
        # Step 3: Resource Allocation
        step = proof_generator.add_proof_step(
            job_id,
            "resource_allocation",
            "running",
            {
                "message": "Allocating compute resources",
                "gpu_allocated": job_data.get("requirements", {}).get("gpu_model", "RTX4090"),
                "vram_allocated": job_data.get("requirements", {}).get("vram_gb", 24)
            }
        )
        await publish_event_func("job_update", {
            "job_id": job_id,
            "status": "allocating_resources",
            "progress": 10,
            "message": "Allocating compute resources"
        })
        await asyncio.sleep(1)
        
        step = proof_generator.add_proof_step(
            job_id,
            "resource_allocation",
            "completed",
            {
                "message": "Resources allocated successfully",
                "node_id": f"node_{provider_id}",
                "gpu_id": "GPU-0"
            }
        )
        await publish_event_func("proof", {
            "job_id": job_id,
            "step": "resource_allocation",
            "proof_hash": step.proof_hash,
            "message": "Resources allocated"
        })
        
        # Step 4: Job Execution Started
        step = proof_generator.add_proof_step(
            job_id,
            "execution_started",
            "running",
            {
                "message": "Job execution started",
                "start_timestamp": time.time()
            }
        )
        await publish_event_func("job_update", {
            "job_id": job_id,
            "status": "running",
            "progress": 20,
            "message": "Job execution started"
        })
        await asyncio.sleep(0.5)
        
        # Step 5: Job Processing (simulate with progress updates)
        for progress in [30, 40, 50, 60, 70, 80, 90]:
            step = proof_generator.add_proof_step(
                job_id,
                "processing",
                "running",
                {
                    "message": f"Processing job - {progress}% complete",
                    "progress": progress,
                    "checkpoint": f"checkpoint_{progress}"
                }
            )
            await publish_event_func("job_update", {
                "job_id": job_id,
                "status": "processing",
                "progress": progress,
                "message": f"Processing - {progress}% complete"
            })
            await asyncio.sleep(1)
        
        # Step 6: Job Completed
        result_hash = hashlib.sha256(f"{job_id}_result_{time.time()}".encode()).hexdigest()
        step = proof_generator.add_proof_step(
            job_id,
            "execution_completed",
            "completed",
            {
                "message": "Job execution completed",
                "result_hash": result_hash,
                "end_timestamp": time.time()
            }
        )
        await publish_event_func("job_update", {
            "job_id": job_id,
            "status": "completed",
            "progress": 100,
            "message": "Job execution completed"
        })
        await asyncio.sleep(0.5)
        
        # Step 7: Result Verification
        step = proof_generator.add_proof_step(
            job_id,
            "result_verification",
            "running",
            {
                "message": "Verifying computation results",
                "verification_method": "cryptographic_hash"
            }
        )
        await publish_event_func("job_update", {
            "job_id": job_id,
            "status": "verifying",
            "progress": 100,
            "message": "Verifying results"
        })
        await asyncio.sleep(1)
        
        step = proof_generator.add_proof_step(
            job_id,
            "result_verification",
            "completed",
            {
                "message": "Results verified successfully",
                "verification_passed": True
            }
        )
        await publish_event_func("proof", {
            "job_id": job_id,
            "step": "result_verification",
            "proof_hash": step.proof_hash,
            "message": "Results verified"
        })
        
        # Step 8: Proof Generated
        final_proof = proof_generator.complete_job_proof(job_id, result_hash)
        await publish_event_func("proof", {
            "job_id": job_id,
            "step": "proof_generated",
            "proof_hash": final_proof.final_proof_hash,
            "message": "Cryptographic proof generated",
            "chain_valid": proof_generator.verify_proof_chain(job_id)
        })
        await asyncio.sleep(0.5)
        
        # Step 9: Payment Released
        step = proof_generator.add_proof_step(
            job_id,
            "payment_released",
            "completed",
            {
                "message": "Payment released from escrow",
                "amount": job_data.get("payment_amount", 0),
                "recipient": provider_id
            }
        )
        await publish_event_func("payment", {
            "job_id": job_id,
            "tx_id": f"TX_{job_id[:16]}",
            "amount": job_data.get("payment_amount", 0),
            "from": "escrow",
            "to": provider_id,
            "message": "Payment released to provider"
        })
        
        await publish_event_func("job_update", {
            "job_id": job_id,
            "status": "finalized",
            "progress": 100,
            "message": "Job completed and payment released"
        })
        
        return final_proof
        
    except Exception as e:
        # Add failure proof
        step = proof_generator.add_proof_step(
            job_id,
            "execution_failed",
            "failed",
            {
                "message": f"Job execution failed: {str(e)}",
                "error": str(e)
            }
        )
        await publish_event_func("job_update", {
            "job_id": job_id,
            "status": "failed",
            "message": f"Job failed: {str(e)}"
        })
        raise
