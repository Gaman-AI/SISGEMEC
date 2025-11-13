from supabase import create_client, Client
from app.config import settings

_sb_client: Client | None = None
_sb_service_client: Client | None = None

def reset_supabase_service_client() -> None:
    """Invalidar el cliente service role para forzar su recreación."""
    global _sb_service_client
    _sb_service_client = None

def reset_supabase_client() -> None:
    """Invalidar el cliente anon para forzar su recreación."""
    global _sb_client
    _sb_client = None

def supa() -> Client:
    global _sb_client
    if _sb_client is None:
        # cliente público ANON si el proyecto lo usa
        try:
            _sb_client = create_client(
                supabase_url=settings.SUPABASE_URL,
                supabase_key=settings.SUPABASE_ANON_KEY
            )
        except Exception as e:
            # Fallback to positional arguments if keyword arguments fail
            _sb_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _sb_client

def supa_service() -> Client:
    """Singleton Service Role client for admin operations"""
    global _sb_service_client
    if _sb_service_client is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError(
                "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configurados en backend/.env. "
                "Para importación admin se requiere la Service Role Key (no el ANON KEY)."
            )
        # Clean singleton - explicitly pass only required parameters
        try:
            _sb_service_client = create_client(
                supabase_url=settings.SUPABASE_URL,
                supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY
            )
        except Exception as e:
            # Fallback to positional arguments if keyword arguments fail
            _sb_service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _sb_service_client

# Funciones legacy para compatibilidad (deprecated)
def _new_base_client() -> Client:
    """DEPRECATED: Usar supa() en su lugar"""
    return supa()

def client_with_token(token: str) -> Client:
    """
    Devuelve un cliente Supabase con el JWT del usuario inyectado en PostgREST.
    NO usa service key. RLS decidirá permisos.
    """
    client = supa()
    client.postgrest.auth(token)
    return client

def get_supabase_service_client() -> Client:
    """DEPRECATED: Usar supa_service() en su lugar"""
    return supa_service()


