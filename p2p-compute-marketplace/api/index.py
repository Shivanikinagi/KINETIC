# Vercel serverless function entry point for main API
from api.main import app

# Vercel expects a variable named 'app' or 'handler'
handler = app
