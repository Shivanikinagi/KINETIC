"""
Simple web server to serve the Kinetic Marketplace frontend
and proxy API requests to the backend.
"""
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

# Get the directory where this script is located
WEB_DIR = Path(__file__).parent
STATIC_DIR = WEB_DIR / "static"

app = FastAPI(title="Kinetic Marketplace Frontend")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def index():
    """Serve the homepage"""
    index_file = WEB_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return HTMLResponse("<h1>Kinetic Marketplace</h1><p>Frontend files not found</p>", status_code=404)


@app.get("/providers.html")
async def providers():
    """Serve the providers page"""
    providers_file = WEB_DIR / "providers.html"
    if providers_file.exists():
        return FileResponse(providers_file)
    return HTMLResponse("<h1>Providers</h1><p>Page not found</p>", status_code=404)


@app.get("/activity.html")
async def activity():
    """Serve the activity page"""
    activity_file = WEB_DIR / "activity.html"
    if activity_file.exists():
        return FileResponse(activity_file)
    return HTMLResponse("<h1>Activity</h1><p>Page not found</p>", status_code=404)


@app.get("/wallet.html")
async def wallet():
    """Serve the wallet page"""
    wallet_file = WEB_DIR / "wallet.html"
    if wallet_file.exists():
        return FileResponse(wallet_file)
    return HTMLResponse("<h1>Wallet</h1><p>Page not found</p>", status_code=404)


@app.get("/status.html")
async def status():
    """Serve the integration status page"""
    status_file = WEB_DIR / "status.html"
    if status_file.exists():
        return FileResponse(status_file)
    return HTMLResponse("<h1>Status</h1><p>Page not found</p>", status_code=404)


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "frontend"}


if __name__ == "__main__":
    import uvicorn
    
    print("=" * 60)
    print("🚀 Kinetic Marketplace Frontend Server")
    print("=" * 60)
    print(f"📁 Serving from: {WEB_DIR}")
    print(f"🌐 Frontend: http://localhost:3000")
    print(f"🔌 Backend API: http://localhost:8000")
    print("=" * 60)
    
    uvicorn.run(app, host="0.0.0.0", port=3000, log_level="info")
