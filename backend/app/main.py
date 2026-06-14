"""ScoreFlow Backend - FastAPI Application."""

import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import router

app = FastAPI(
    title="ScoreFlow API",
    description="AI-powered cross-instrument music transcription and conversion",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")

# Ensure uploads directory exists (volume-mountable path)
_uploads_static = Path(__file__).parent.parent / "uploads"
try:
    _uploads_static.mkdir(exist_ok=True)
except OSError:
    pass

@app.get("/health")
async def health():
    return {"status": "ok", "service": "scoreflow"}
