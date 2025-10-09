"""
Helper aislado para operaciones de Auth Admin
"""
import os
import httpx
import logging

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

def _admin_headers():
    return {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}

def _admin_users_url():
    return f"{SUPABASE_URL}/auth/v1/admin/users"

def _extract_user(payload):
    """
    La API Admin de Supabase puede regresar:
    - dict {"users": [ {...} ]}  (en algunas versiones)
    - list [ {...} ]             (en otras)
    - dict {...}                 (cuando es POST create)
    Esta función normaliza y regresa {"id": "...", "email": "..."} o None.
    """
    if not payload:
        return None
    if isinstance(payload, dict):
        if "users" in payload and isinstance(payload["users"], list) and payload["users"]:
            u = payload["users"][0]
            return {"id": u.get("id"), "email": u.get("email")}
        # respuesta de creación (POST)
        if "id" in payload and "email" in payload:
            return {"id": payload.get("id"), "email": payload.get("email")}
    if isinstance(payload, list) and payload:
        u = payload[0]
        return {"id": u.get("id"), "email": u.get("email")}
    return None

def create_or_get_auth_user(email: str, password: str | None):
    """
    Busca usuario en Supabase Auth por email EXACTO.
    Si no existe y hay password, lo crea.
    Devuelve {"id","email"} o None. NO cachea resultados.
    """
    if not SUPABASE_URL or not SERVICE_KEY or not email:
        return None

    headers = _admin_headers()
    url = _admin_users_url()

    try:
        with httpx.Client(timeout=15.0) as client:
            # 🔎 Lookup por email exacto (evitar paginación)
            r = client.get(f"{url}?email={email}", headers=headers)
            if r.status_code == 200:
                user = _extract_user(r.json())
                if user and user.get("email", "").lower() == email.lower():
                    return user

            # 🆕 Crear si no existe y tenemos password
            if password:
                payload = {"email": email, "password": password, "email_confirm": True}
                r = client.post(url, headers=headers, json=payload)
                if r.status_code in (200, 201):
                    user = _extract_user(r.json())
                    if user and user.get("email", "").lower() == email.lower():
                        return user
                # Carrera: intentar lookup nuevamente
                r2 = client.get(f"{url}?email={email}", headers=headers)
                if r2.status_code == 200:
                    user2 = _extract_user(r2.json())
                    if user2 and user2.get("email", "").lower() == email.lower():
                        return user2

            return None
    except Exception:
        # No exponemos detalles para no filtrar secretos
        return None
