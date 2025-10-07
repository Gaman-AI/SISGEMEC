# FILE: backend/app/routers/debug_cors.py
# fix: Debug endpoints para verificar CORS
from fastapi import APIRouter, Request

router = APIRouter()

@router.get("/debug/cors-check")
def cors_check(request: Request):
    """
    Endpoint simple para probar CORS GET
    """
    return {
        "ok": True, 
        "origin": request.headers.get("origin"),
        "message": "CORS OK"
    }
