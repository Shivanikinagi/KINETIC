#!/bin/bash
# Start Agent Bridge on port 3001
# This service handles autonomous agent job dispatching

echo "Starting Kinetic Agent Bridge..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 not found. Please install Python 3.8+"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "api/agent_bridge.py" ]; then
    echo "Error: Must run from p2p-compute-marketplace directory"
    exit 1
fi

echo "Agent Bridge will run on: http://localhost:3001"
echo "Press Ctrl+C to stop"
echo ""

# Start the agent bridge
python3 -m uvicorn api.agent_bridge:app --host 0.0.0.0 --port 3001 --reload
