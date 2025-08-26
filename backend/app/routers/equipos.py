from fastapi import APIRouter, Depends, HTTPException, status
from app.deps.auth import get_bearer_token
from app.deps.supabase_client import client_with_token

router = APIRouter(prefix="/equipos", tags=["equipos"])

@router.get("")
def list_equipos(token: str = Depends(get_bearer_token)):
    """
    Lista equipos según RLS:
    - ADMIN: todos
    - RESPONSABLE: solo los suyos
    """
    sb = client_with_token(token)
    resp = sb.table("equipos").select("*").execute()
    if resp.error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(resp.error))
    return resp.data or []
