"""
AI Assistant Backend with Real LLM Integration
Supports OpenAI, Anthropic, or local models via environment configuration
"""
from __future__ import annotations

import os
import json
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant|system)$")
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    provider_context: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    message: ChatMessage
    actions: list[dict[str, Any]] = Field(default_factory=list)
    cards: list[dict[str, Any]] = Field(default_factory=list)


# System prompt that gives the assistant context about Kinetic
SYSTEM_PROMPT = """You are Kinetic Assistant, a friendly and knowledgeable AI helper for the Kinetic decentralized GPU compute marketplace.

**Your Personality:**
- Warm, conversational, and helpful — like a knowledgeable friend, not a corporate bot
- Use natural language, contractions, and casual phrasing
- Be enthusiastic about helping users find compute resources
- Keep responses concise but informative (2-4 sentences for simple queries, more for complex ones)
- Use emojis sparingly and naturally (1-2 per response max)

**What You Know:**
Kinetic is a peer-to-peer GPU marketplace built on Algorand blockchain where:
- Consumers can rent GPU compute for AI/ML workloads (inference, training, fine-tuning, rendering)
- Providers earn ALGO by sharing their idle GPUs
- All payments go through smart contract escrow for security
- Proof-of-compute ensures providers execute jobs honestly
- Jobs run in isolated Docker containers

**Available GPU Types & Pricing:**
- RTX 3090 (24GB VRAM): ~0.65 ALGO/hour — Budget option for most inference tasks
- RTX 4090 (24GB VRAM): ~1.40 ALGO/hour — Best price/performance for LLMs and SDXL
- A100 (40-80GB VRAM): ~3.50 ALGO/hour — For large models and training
- H100 (80GB VRAM): ~4.50 ALGO/hour — Premium tier for 70B+ models

**Common Use Cases:**
- LLM Inference (Llama, Mistral, GPT-style): RTX 4090 or A100
- Image Generation (Stable Diffusion, SDXL): RTX 4090
- Fine-tuning (LoRA): RTX 4090 for 7B models, A100 for 13B+
- Training: A100 or H100 depending on model size
- 3D Rendering: RTX 3090 or 4090

**Your Capabilities:**
1. Help users find the right GPU for their workload
2. Estimate compute costs based on tokens/duration
3. Explain how proof-of-compute and escrow work
4. Guide providers on how to earn with their GPUs
5. Recommend models from the Model Hub
6. Answer questions about Algorand integration

**Response Format:**
- For provider recommendations, suggest specific GPUs with pricing
- For cost estimates, calculate based on: cost = (price_per_hour * tokens / 3600)
- When users want to deploy, encourage them to use the Submit Job page
- Be proactive — if someone asks about training, mention they'll need serious VRAM

**Tone Examples:**
❌ "I would be happy to assist you in finding a suitable GPU provider."
✅ "Let me find you the best GPU deal for that workload."

❌ "The RTX 4090 is an excellent choice for your use case."
✅ "RTX 4090 is perfect for this — great price/performance for SDXL."

Remember: You're a helpful friend who happens to know a lot about GPUs and blockchain, not a formal assistant."""


async def call_openai(messages: list[dict[str, str]], api_key: str) -> str:
    """Call OpenAI API"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def call_anthropic(messages: list[dict[str, str]], api_key: str) -> str:
    """Call Anthropic Claude API"""
    # Convert messages format (remove system message, it goes in a separate field)
    system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
    conversation = [m for m in messages if m["role"] != "system"]
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"),
                "max_tokens": 500,
                "system": system_msg,
                "messages": conversation,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["content"][0]["text"]


async def call_grok(messages: list[dict[str, str]], api_key: str) -> str:
    """Call xAI Grok API"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.x.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": os.getenv("GROK_MODEL", "grok-beta"),
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def call_groq(messages: list[dict[str, str]], api_key: str) -> str:
    """Call Groq API (fast inference)"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": os.getenv("GROQ_MODEL", "llama3-70b-8192"),
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def call_local_llm(messages: list[dict[str, str]], endpoint: str) -> str:
    """Call local LLM (Ollama, LM Studio, etc.)"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{endpoint}/v1/chat/completions",
            json={
                "model": os.getenv("LOCAL_MODEL", "llama3"),
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 500,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


def extract_actions_from_response(content: str, provider_context: dict) -> tuple[str, list[dict], list[dict]]:
    """
    Parse the LLM response and extract any action buttons or cards.
    This is a simple heuristic-based approach.
    """
    actions = []
    cards = []
    
    # Check for common action triggers in the response
    lower_content = content.lower()
    
    if "submit job" in lower_content or "deploy" in lower_content:
        actions.append({"label": "Submit Job", "action": "navigate", "payload": {"to": "/submit"}})
    
    if "browse" in lower_content and ("gpu" in lower_content or "provider" in lower_content):
        actions.append({"label": "Browse GPUs", "action": "navigate", "payload": {"to": "/explore"}})
    
    if "model hub" in lower_content or "browse model" in lower_content:
        actions.append({"label": "Model Hub", "action": "navigate", "payload": {"to": "/models"}})
    
    if "register" in lower_content and "provider" in lower_content:
        actions.append({"label": "Register Provider", "action": "navigate", "payload": {"to": "/provide"}})
    
    # If provider context includes specific providers, create cards
    if provider_context.get("providers"):
        providers = provider_context["providers"][:3]  # Max 3 cards
        for p in providers:
            if p.get("name") and any(p["name"].lower() in lower_content.lower() for _ in [1]):
                cards.append({
                    "type": "provider",
                    "title": p.get("name", "Unknown"),
                    "subtitle": p.get("gpu_model", ""),
                    "meta": [
                        {"label": "Price", "value": f"{p.get('price_per_hour', 0):.2f} ALGO/hr"},
                        {"label": "VRAM", "value": f"{p.get('vram_gb', 0)}GB"},
                        {"label": "Uptime", "value": f"{p.get('uptime', 0):.1f}%"},
                    ],
                    "badge": "Available",
                })
    
    return content, actions, cards


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Main chat endpoint that routes to the configured LLM provider.
    
    Environment variables:
    - LLM_PROVIDER: "openai" | "anthropic" | "grok" | "groq" | "local" (default: "openai")
    - OPENAI_API_KEY: Your OpenAI API key
    - ANTHROPIC_API_KEY: Your Anthropic API key
    - GROK_API_KEY: Your xAI Grok API key
    - GROQ_API_KEY: Your Groq API key
    - LOCAL_LLM_ENDPOINT: URL for local LLM (e.g., "http://localhost:11434")
    """
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    
    # Build messages with system prompt
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend([{"role": m.role, "content": m.content} for m in request.messages])
    
    # Add provider context to the last user message if available
    if request.provider_context and messages[-1]["role"] == "user":
        context_str = f"\n\n[Available Providers: {len(request.provider_context.get('providers', []))} online]"
        messages[-1]["content"] += context_str
    
    try:
        # Route to appropriate LLM provider
        if provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")
            response_content = await call_anthropic(messages, api_key)
        
        elif provider == "grok":
            api_key = os.getenv("GROK_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="GROK_API_KEY not configured")
            response_content = await call_grok(messages, api_key)
        
        elif provider == "groq":
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
            response_content = await call_groq(messages, api_key)
        
        elif provider == "local":
            endpoint = os.getenv("LOCAL_LLM_ENDPOINT", "http://localhost:11434")
            response_content = await call_local_llm(messages, endpoint)
        
        else:  # default to openai
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                # Fallback to rule-based if no API key
                raise HTTPException(
                    status_code=503,
                    detail="LLM_PROVIDER not configured. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, GROK_API_KEY, GROQ_API_KEY, or LOCAL_LLM_ENDPOINT in .env"
                )
            response_content = await call_openai(messages, api_key)
        
        # Extract actions and cards from response
        content, actions, cards = extract_actions_from_response(response_content, request.provider_context)
        
        return ChatResponse(
            message=ChatMessage(role="assistant", content=content),
            actions=actions,
            cards=cards,
        )
    
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"LLM API error: {e.response.text}"
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to LLM: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant error: {str(e)}")


@router.get("/health")
async def assistant_health() -> dict[str, Any]:
    """Check if the assistant is properly configured"""
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    
    config = {
        "provider": provider,
        "configured": False,
        "model": None,
    }
    
    if provider == "openai":
        config["configured"] = bool(os.getenv("OPENAI_API_KEY"))
        config["model"] = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    elif provider == "anthropic":
        config["configured"] = bool(os.getenv("ANTHROPIC_API_KEY"))
        config["model"] = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
    elif provider == "grok":
        config["configured"] = bool(os.getenv("GROK_API_KEY"))
        config["model"] = os.getenv("GROK_MODEL", "grok-beta")
    elif provider == "groq":
        config["configured"] = bool(os.getenv("GROQ_API_KEY"))
        config["model"] = os.getenv("GROQ_MODEL", "llama3-70b-8192")
    elif provider == "local":
        config["configured"] = bool(os.getenv("LOCAL_LLM_ENDPOINT"))
        config["model"] = os.getenv("LOCAL_MODEL", "llama3")
    
    return config
