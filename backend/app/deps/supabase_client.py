from supabase import create_client, Client
from app.config import settings

# Creamos SIEMPRE cliente por petición para evitar condiciones de carrera
def _new_base_client() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise RuntimeError("SUPABASE_URL o SUPABASE_ANON_KEY no están configurados (.env).")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

def client_with_token(token: str) -> Client:
    """
    Devuelve un cliente Supabase con el JWT del usuario inyectado en PostgREST.
    NO usa service key. RLS decidirá permisos.
    """
    client = _new_base_client()
    client.postgrest.auth(token)
    return client


