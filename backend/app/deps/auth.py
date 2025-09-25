# backend/app/deps/auth.py
import os
import secrets
import logging
from typing import Optional
from pathlib import Path
from fastapi import Request, HTTPException, status

logger = logging.getLogger("auth")

def _load_env_from_files_once() -> None:
    """
    Carga variables desde archivos .env si el proceso no las tiene.
    No usa dependencias externas. Se ejecuta una sola vez.
    Busca en:
      - backend/.env
      - .env (raíz del proyecto)
    Respeta las variables que YA existen (no sobreescribe).
    """
    if getattr(_load_env_from_files_once, "_done", False):
        return
    _load_env_from_files_once._done = True  # type: ignore[attr-defined]

    candidates = []
    try:
        here = Path(__file__).resolve()
        backend_root = here.parents[2]  # .../backend
        project_root = backend_root.parent
        candidates = [
            backend_root / ".env",
            project_root / ".env",
        ]
    except Exception:
        pass

    def parse_and_set(env_path: Path) -> None:
        try:
            if not env_path.exists():
                return
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'").strip('"')
                if key and (os.getenv(key) is None):
                    os.environ[key] = val
        except Exception:
            # silencioso en prod; evitar crashear por .env malformado
            pass

    for p in candidates:
        parse_and_set(p)

# Carga .env si hace falta
_load_env_from_files_once()

# Token esperado
API_ADMIN_TOKEN = (os.getenv("API_ADMIN_TOKEN") or "").strip()

def _extract_bearer_token(authorization_header: Optional[str]) -> Optional[str]:
    if not authorization_header:
        return None
    parts = authorization_header.strip().split(" ", 1)
    if len(parts) != 2:
        return None
    scheme, token = parts[0], parts[1].strip()
    if scheme.lower() != "bearer":
        return None
    return token or None

def require_admin_token(request: Request) -> bool:
    """
    Valida token admin desde:
      - Authorization: Bearer <token>
      - x-admin-token: <token> (fallback)
    """
    if not API_ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfigured: API_ADMIN_TOKEN not set",
        )

    bearer = _extract_bearer_token(request.headers.get("Authorization"))
    x_admin = request.headers.get("x-admin-token")

    valid = False
    if bearer and secrets.compare_digest(bearer, API_ADMIN_TOKEN):
        valid = True
    elif x_admin and secrets.compare_digest(x_admin, API_ADMIN_TOKEN):
        valid = True

    if not valid:
        # Log mínimo: sin exponer valores
        logger.info(
            "Admin auth failed: has_auth=%s has_x_admin=%s path=%s token_len=%s",
            bool(bearer), bool(x_admin), request.url.path, len(API_ADMIN_TOKEN),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    return True

# === SHIM DE COMPATIBILIDAD ============
def get_bearer_token(request: Request) -> bool:
    """
    Compat con routers antiguos: mantiene el import `get_bearer_token`.
    Reutiliza la validación de admin.
    """
    return require_admin_token(request)

__all__ = ["require_admin_token", "get_bearer_token"]