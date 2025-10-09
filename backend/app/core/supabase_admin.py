"""
Helper aislado para operaciones de Auth Admin
"""
import os
import httpx
import logging

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

def create_or_get_auth_user(email: str, password: str | None):
    """
    Crea (si no existe) o recupera usuario en auth.users via Admin API.
    Devuelve dict con {'id', 'email'} o None si no es posible crear.
    Nunca loguea la contraseña.
    """
    if not SUPABASE_URL or not SERVICE_KEY:
        logger.warning("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados")
        return None

    headers = {"apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}"}
    admin_users_url = f"{SUPABASE_URL}/auth/v1/admin/users"

    try:
        with httpx.Client(timeout=15.0) as client:
            # Lookup
            r = client.get(admin_users_url, headers=headers, params={"email": email})
            if r.status_code == 200 and r.json().get("users"):
                u = r.json()["users"][0]
                logger.info(f"Usuario encontrado en auth.users: {email}")
                return {"id": u["id"], "email": u["email"]}

            # Create if missing (requires password)
            if not password:
                logger.warning(f"No se puede crear usuario {email}: falta password")
                return None

            payload = {"email": email, "password": password, "email_confirm": True}
            r = client.post(admin_users_url, headers=headers, json=payload)
            if r.status_code in (200, 201):
                u = r.json()
                logger.info(f"Usuario creado en auth.users: {email}")
                return {"id": u["id"], "email": u["email"]}

            # Race fallback
            r2 = client.get(admin_users_url, headers=headers, params={"email": email})
            if r2.status_code == 200 and r2.json().get("users"):
                u = r2.json()["users"][0]
                logger.info(f"Usuario encontrado en auth.users (fallback): {email}")
                return {"id": u["id"], "email": u["email"]}
            
            logger.error(f"Error creando usuario {email}: {r.status_code} - {r.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error en create_or_get_auth_user para {email}: {e}")
        return None
