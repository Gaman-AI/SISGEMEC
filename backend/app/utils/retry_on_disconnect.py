"""
Decorador para auto-recovery de errores de conexión Supabase.
Detecta RemoteProtocolError, ConnectError y ConnectionError,
resetea el cliente Supabase y reintenta la operación una vez.
"""
import functools
import httpx
import logging
from app.core.supabase_client import reset_supabase_client

# Intentar importar reset de deps también
try:
    from app.deps.supabase_client import reset_supabase_service_client
except ImportError:
    reset_supabase_service_client = None

logger = logging.getLogger("app.retry")

def retry_on_disconnect(fn):
    """
    Decorador que detecta errores de conexión Supabase y reintenta una vez
    después de resetear el cliente.
    
    Uso:
        @router.get("/equipos")
        @retry_on_disconnect
        def list_equipos(...):
            return svc.list_equipos(...)
    """
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except (httpx.RemoteProtocolError, httpx.ConnectError, ConnectionError) as e:
            logger.warning("[RETRY] %s → %s. Resetting client and retrying once.", fn.__name__, e.__class__.__name__)
            reset_supabase_client()  # Reset core client
            if reset_supabase_service_client:
                reset_supabase_service_client()  # Reset deps client si existe
            return fn(*args, **kwargs)
    return wrapper

