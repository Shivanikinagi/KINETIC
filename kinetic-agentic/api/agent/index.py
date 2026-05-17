# Vercel serverless function entry point for agent bridge
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.agent_bridge import app

# Vercel expects a variable named 'app' or 'handler'
handler = app
