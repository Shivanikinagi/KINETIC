"""
Vercel serverless function entry point for Kinetic API.

Vercel's Python runtime expects an ASGI/WSGI app exposed as `app` or `handler`.
FastAPI is natively ASGI, so we export the FastAPI app directly.
"""
from api.main import app

# Vercel expects a variable named 'app' for ASGI applications
# The FastAPI app from api.main handles all routes including:
#   /health, /providers, /job, /jobs, /analytics, /activity
#   /hub/*, /models, /datasets, /spaces, /api-keys
#   /assistant/*, /agent/*, /wallet/*, /escrow/*

# This makes the entire FastAPI application available as a Vercel serverless function
handler = app
