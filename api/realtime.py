"""
Real-time updates via Server-Sent Events (SSE)
Provides live streaming of agent activity, job status, and provider updates
"""
import asyncio
import json
import logging
from datetime import datetime
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from api.job_history import get_job, get_job_logs

logger = logging.getLogger(__name__)

router = APIRouter()

# Global event queue for broadcasting updates
event_queue = asyncio.Queue()


class RealtimeEventBus:
    """Event bus for broadcasting real-time updates to all connected clients"""
    
    def __init__(self):
        self.subscribers = set()
    
    async def subscribe(self) -> AsyncGenerator:
        """Subscribe to real-time events"""
        queue = asyncio.Queue()
        self.subscribers.add(queue)
        
        try:
            while True:
                event = await queue.get()
                yield event
        finally:
            self.subscribers.remove(queue)
    
    async def publish(self, event_type: str, data: dict):
        """Publish an event to all subscribers"""
        event = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send to all subscribers
        dead_queues = set()
        for queue in self.subscribers:
            try:
                await asyncio.wait_for(queue.put(event), timeout=1.0)
            except asyncio.TimeoutError:
                dead_queues.add(queue)
        
        # Clean up dead subscribers
        self.subscribers -= dead_queues
        
        logger.info(f"Published event: {event_type} to {len(self.subscribers)} subscribers")


# Global event bus instance
event_bus = RealtimeEventBus()


@router.get("/stream")
async def stream_events():
    """
    Server-Sent Events endpoint for real-time updates
    
    Event types:
    - agent_status: Agent state changes
    - job_update: Job progress updates
    - provider_update: Provider availability changes
    - payment: Payment transactions
    - proof: Proof of compute verification
    """
    
    async def event_generator():
        # Send initial connection message
        yield {
            "event": "connected",
            "data": json.dumps({
                "message": "Connected to real-time stream",
                "timestamp": datetime.utcnow().isoformat()
            })
        }
        
        # Stream events
        async for event in event_bus.subscribe():
            yield {
                "event": event["type"],
                "data": json.dumps(event["data"]),
                "id": event["timestamp"]
            }
    
    return EventSourceResponse(event_generator())


@router.get("/activity/stream")
async def stream_activity():
    """
    Stream agent activity logs in real-time
    """
    
    async def activity_generator():
        # Send initial message
        yield {
            "event": "connected",
            "data": json.dumps({
                "message": "Connected to activity stream",
                "timestamp": datetime.utcnow().isoformat()
            })
        }
        
        # Stream activity events
        async for event in event_bus.subscribe():
            if event["type"] in ["agent_status", "job_update", "agent_log"]:
                yield {
                    "event": "activity",
                    "data": json.dumps(event["data"]),
                    "id": event["timestamp"]
                }
    
    return EventSourceResponse(activity_generator())


@router.get("/providers/stream")
async def stream_providers():
    """
    Stream provider updates in real-time
    """
    
    async def provider_generator():
        # Send initial message
        yield {
            "event": "connected",
            "data": json.dumps({
                "message": "Connected to provider stream",
                "timestamp": datetime.utcnow().isoformat()
            })
        }
        
        # Stream provider events
        async for event in event_bus.subscribe():
            if event["type"] in ["provider_update", "provider_registered", "provider_heartbeat"]:
                yield {
                    "event": "provider",
                    "data": json.dumps(event["data"]),
                    "id": event["timestamp"]
                }
    
    return EventSourceResponse(provider_generator())


@router.get("/jobs/{job_id}/logs")
async def get_job_logs_endpoint(job_id: str) -> dict:
    """Return all logs for a specific job."""
    logs = get_job_logs(job_id)
    return {"job_id": job_id, "logs": logs}


@router.get("/jobs/{job_id}/stream")
async def stream_job_updates(job_id: str):
    """
    SSE endpoint that streams job-specific updates (progress, logs, status changes).
    Uses simple polling against the database every second.
    """
    
    async def job_generator():
        # Send initial snapshot
        job = get_job(job_id)
        if job:
            yield {
                "event": "snapshot",
                "data": json.dumps({
                    "job_id": job_id,
                    "status": job.get("status", "pending"),
                    "progress": job.get("progress", 0),
                    "logs": job.get("logs", []),
                    "gpu_utilization": job.get("gpu_utilization", 0.0),
                    "vram_usage": job.get("vram_usage", 0.0),
                    "vram_total": job.get("vram_total", 0.0),
                    "escrow_status": job.get("escrow_status", "locked"),
                    "cost_algo": job.get("cost_algo", 0.0),
                    "provider": job.get("provider", ""),
                    "timestamp": datetime.utcnow().isoformat(),
                })
            }
        else:
            yield {
                "event": "error",
                "data": json.dumps({"message": "Job not found", "job_id": job_id})
            }
            return
        
        last_log_count = len(job.get("logs", []))
        last_status = job.get("status")
        last_progress = job.get("progress", 0)
        
        # Poll database every second for changes
        while True:
            await asyncio.sleep(1.0)
            current = get_job(job_id)
            if not current:
                yield {
                    "event": "error",
                    "data": json.dumps({"message": "Job not found", "job_id": job_id})
                }
                return
            
            current_logs = current.get("logs", [])
            current_status = current.get("status")
            current_progress = current.get("progress", 0)
            
            changed = False
            payload = {
                "job_id": job_id,
                "timestamp": datetime.utcnow().isoformat(),
            }
            
            if len(current_logs) > last_log_count:
                payload["new_logs"] = current_logs[last_log_count:]
                payload["logs"] = current_logs
                last_log_count = len(current_logs)
                changed = True
            
            if current_status != last_status:
                payload["status"] = current_status
                last_status = current_status
                changed = True
            
            if current_progress != last_progress:
                payload["progress"] = current_progress
                last_progress = current_progress
                changed = True
            
            if changed:
                yield {
                    "event": "job_update",
                    "data": json.dumps(payload)
                }
            
            # Stop streaming if job is terminal
            if current_status in ("completed", "failed"):
                # Send one final snapshot then close
                yield {
                    "event": "final",
                    "data": json.dumps({
                        "job_id": job_id,
                        "status": current_status,
                        "progress": current_progress,
                        "logs": current_logs,
                        "timestamp": datetime.utcnow().isoformat(),
                    })
                }
                return
    
    return EventSourceResponse(job_generator())


# Helper functions for publishing events

async def publish_agent_status(status: str, details: dict = None):
    """Publish agent status update"""
    await event_bus.publish("agent_status", {
        "status": status,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat()
    })


async def publish_job_update(job_id: str, status: str, progress: int = None, details: dict = None):
    """Publish job progress update"""
    await event_bus.publish("job_update", {
        "job_id": job_id,
        "status": status,
        "progress": progress,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat()
    })


async def publish_provider_update(provider_id: str, status: str, details: dict = None):
    """Publish provider status update"""
    await event_bus.publish("provider_update", {
        "provider_id": provider_id,
        "status": status,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat()
    })


async def publish_payment(tx_id: str, amount: float, from_addr: str, to_addr: str, details: dict = None):
    """Publish payment transaction"""
    await event_bus.publish("payment", {
        "tx_id": tx_id,
        "amount": amount,
        "from": from_addr,
        "to": to_addr,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat()
    })


async def publish_agent_log(level: str, message: str, details: dict = None):
    """Publish agent log message"""
    await event_bus.publish("agent_log", {
        "level": level,
        "message": message,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat()
    })


async def publish_proof(proof_data: dict):
    """Publish proof verification event"""
    await event_bus.publish("proof", {
        **proof_data,
        "timestamp": datetime.utcnow().isoformat()
    })
