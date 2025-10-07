from fastapi import APIRouter
from datetime import datetime
import os

router = APIRouter(prefix="/healthz", tags=["Health"])

@router.get("/")
async def health_check():
    """Endpoint de salud para verificar que el backend responde"""
    return {
        "status": "ok",
        "time": datetime.now().isoformat(),
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }
