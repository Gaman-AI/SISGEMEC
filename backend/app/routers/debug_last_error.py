from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse
from app.core.error_tracking import get_trace

router = APIRouter()

@router.get("/debug/last-error", response_class=PlainTextResponse)
def last_error(error_id: str = Query(...)):
    return get_trace(error_id) or "No trace found"