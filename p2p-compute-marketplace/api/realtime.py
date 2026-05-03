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

