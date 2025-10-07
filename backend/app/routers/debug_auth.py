from fastapi import APIRouter, Depends, Request
from app.deps.jwt_auth import require_user_jwt

router = APIRouter()

@router.get("/whoami")
def whoami(user=Depends(require_user_jwt), request: Request = None):
    return {"ok": True, "user": user, "headers": dict(request.headers)}
