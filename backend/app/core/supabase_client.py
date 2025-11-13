# backend/app/core/supabase_client.py
import os
import logging
from typing import Optional, Dict, Any

from supabase import create_client, Client
from gotrue.errors import AuthApiError

from app.core.env import load_env_if_needed

logger = logging.getLogger("supabase")
_client: Optional[Client] = None

def _reset_client() -> None:
    """Invalidar el cliente global para forzar su recreación en el siguiente uso."""
    global _client
    _client = None
    try:
        logger.warning("Supabase client invalidated; will be recreated on next request.")
    except Exception:
        pass

def reset_supabase_client() -> None:
    """Export público para que otros módulos puedan forzar el reset del cliente Supabase."""
    _reset_client()

def _read_envs() -> Dict[str, str]:
    load_env_if_needed()
    return {
        "SUPABASE_URL": (os.getenv("SUPABASE_URL") or "").strip(),
        # Permitimos ambos nombres por si el integrador usa una variante:
        "SUPABASE_SERVICE_ROLE_KEY": (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE") or "").strip(),
        "SUPABASE_ANON_KEY": (os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY") or "").strip(),
    }

def get_supabase() -> Client:
    global _client
    if _client is not None:
        return _client

    env = _read_envs()
    url = env["SUPABASE_URL"]
    srole = env["SUPABASE_SERVICE_ROLE_KEY"]
    anon = env["SUPABASE_ANON_KEY"]

    if not url:
        raise ValueError("Supabase misconfigured: SUPABASE_URL is empty")
    if not srole:
        # Mensaje claro: no tenemos service role
        raise ValueError("Supabase misconfigured: SUPABASE_SERVICE_ROLE_KEY is empty (set it in backend/.env or backend/.env.local)")

    # Hint de validación (sin exponer claves):
    def _token_hint(tok: str) -> str:
        if not tok:
            return "empty"
        parts = tok.split(".")
        return f"jwt_parts={len(parts)} length={len(tok)}"

    logger.info("Supabase env check: url=%s, service_role_hint={%s}, anon_hint={%s}",
                url, _token_hint(srole), _token_hint(anon))

    try:
        client = create_client(url, srole)
        # Validación de capacidades admin:
        client.auth.admin.list_users(page=1, per_page=1)
    except AuthApiError as e:
        logger.error("Supabase admin capability check failed: %s", e.__class__.__name__)
        raise ValueError(
            "Supabase misconfigured: service-role key required for auth.admin.*. "
            "Set SUPABASE_SERVICE_ROLE_KEY in backend/.env or backend/.env.local"
        ) from e
    except Exception as e:
        logger.error("Supabase init unexpected error: %s", e.__class__.__name__)
        raise

    _client = client
    logger.info("Supabase client ready (admin capabilities verified).")
    return _client
