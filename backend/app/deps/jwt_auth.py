import os
import base64
import json
from typing import Optional, TypedDict
from fastapi import Header, HTTPException, status, Depends
from app.core.error_tracking import capture_exception
from app.core.supabase_client import get_supabase

class UserContext(TypedDict, total=False):
    user_id: str
    email: Optional[str]
    full_name: Optional[str]
    role: Optional[str]

def _extract_bearer(auth_header: Optional[str]) -> str:
    if not auth_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")
    parts = auth_header.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Authorization header")
    return parts[1]

def _unsafe_jwt_payload(token: str) -> dict:
    # Decodifica sin verificar para leer claims (sub/email)
    try:
        _, payload_b64, _ = token.split(".")
        payload_b64 += "=" * (-len(payload_b64) % 4)
        data = json.loads(base64.urlsafe_b64decode(payload_b64.encode()).decode())
        return data
    except Exception as e:
        capture_exception(e)
        return {}

def _lookup_profile_by_email(email: str) -> Optional[dict]:
    if not email:
        return None
    sb = get_supabase()
    res = sb.table("profiles").select("user_id, email, full_name, role, active").eq("email", email).execute()
    rows = res.data or []
    return rows[0] if rows else None

def _lookup_profile_by_user_id(user_id: str) -> Optional[dict]:
    if not user_id:
        return None
    sb = get_supabase()
    res = sb.table("profiles").select("user_id, email, full_name, role, active").eq("user_id", user_id).execute()
    rows = res.data or []
    return rows[0] if rows else None

async def require_user_jwt(authorization: Optional[str] = Header(None)) -> UserContext:
    token = _extract_bearer(authorization)
    payload = _unsafe_jwt_payload(token)
    user_id = payload.get("sub")
    email = payload.get("email")

    profile = None
    # 1) si hay user_id, intenta por user_id
    if user_id:
        profile = _lookup_profile_by_user_id(user_id)
    # 2) si no hay o falló, intenta por email
    if not profile and email:
        profile = _lookup_profile_by_email(email)

    if not profile:
        # Último recurso: exige al menos sub/email para pasar
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se pudo resolver el perfil del usuario")

    role = profile.get("role")
    return UserContext(
        user_id=profile.get("user_id") or user_id,
        email=profile.get("email") or email,
        full_name=profile.get("full_name"),
        role=role,
    )

async def require_admin_user(user: UserContext = Depends(require_user_jwt)) -> UserContext:
    """Requiere que el usuario tenga rol de administrador"""
    role = user.get("role")
    if not role or role.upper() != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Se requiere rol de administrador")
    return user