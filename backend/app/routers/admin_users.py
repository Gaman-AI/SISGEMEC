# FILE: backend/app/routers/admin_users.py
# fix: usar cliente centralizado de Supabase con service role key
"""
Router para administración de usuarios (crear, actualizar, etc.)
Usa Service Role para operaciones admin
"""
import os
import time
from fastapi import APIRouter, HTTPException, status, Header, Depends
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, Iterable, Callable, Type, Sequence
from pydantic import BaseModel, EmailStr, field_validator
import logging
import secrets
import string

from app.config import settings
from app.core.supabase_client import get_supabase
from app.deps.jwt_auth import require_admin_user
from gotrue.errors import AuthApiError
from postgrest.exceptions import APIError

# Tolerancia para diferentes versiones de gotrue
try:
    from gotrue.types import User as GoTrueUser  # type: ignore
except Exception:
    GoTrueUser = Any  # tolerancia si cambia el paquete

# Configuración de reintentos para operaciones críticas
RETRYABLE_EXC: Sequence[Type[BaseException]] = (AuthApiError, APIError,)

# === Canonical roles (base de datos) ===
VALID_ROLES = {"ADMIN", "RESPONSABLE"}  # <- único set válido

ENV = os.getenv("ENV", "development")

router = APIRouter(prefix="/users", tags=["users"])  # fix: Changed from /admin/users to /users for simpler path
logger = logging.getLogger(__name__)

class UserCreateRequest(BaseModel):
    full_name: str
    email: str  # usar str para validar condicionalmente
    password: Optional[str] = None
    role: str = "RESPONSABLE"
    department: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    active: bool = True

    @field_validator('full_name')
    @classmethod
    def validate_full_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Nombre completo es requerido')
        return v.strip()

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if v is not None and len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        return v

    @field_validator('email')
    @classmethod
    def check_email(cls, v: str) -> str:
        v2 = (v or "").strip().lower()
        if ENV != "development":
            # validación estricta en prod
            EmailStr.validate(v2)  # lanzará error si no es válido
        else:
            # permitir .test en dev
            if "@" not in v2 or "." not in v2.split("@")[-1]:
                raise ValueError("Correo no válido")
        return v2

    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        valid_roles = ['ADMIN', 'TECNICO', 'RESPONSABLE']
        if v not in valid_roles:
            raise ValueError(f'Rol debe ser uno de: {", ".join(valid_roles)}')
        return v

def _check_admin_token(authorization: str | None):
    """Verifica el token de administración y lanza excepciones apropiadas"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    if not settings.API_ADMIN_TOKEN:
        raise HTTPException(status_code=500, detail="API_ADMIN_TOKEN not configured")
    if token != settings.API_ADMIN_TOKEN.strip():
        raise HTTPException(status_code=403, detail="Forbidden")

def verify_admin_token(authorization: Optional[str] = Header(None)) -> bool:
    """Verifica el token de administración (compatibilidad)"""
    try:
        _check_admin_token(authorization)
        return True
    except HTTPException:
        return False

def generate_random_password(length: int = 12) -> str:
    """Genera una contraseña aleatoria segura"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def _normalize_role(input_role: Optional[str]) -> Optional[str]:
    """
    Mapea valores de UI (posibles variantes) al valor canónico esperado por BD.
    - Acepta: "ADMIN", "ADMINISTRADOR", "Administrador", "admin"  -> "ADMIN"
    - Acepta: "RESPONSABLE", "Responsable", "responsable"          -> "RESPONSABLE"
    - Rechaza cualquier otro (devuelve None)
    """
    if not input_role:
        return None
    r = str(input_role).strip().upper()
    if r in {"ADMIN", "ADMINISTRADOR"}:
        return "ADMIN"
    if r in {"RESPONSABLE"}:
        return "RESPONSABLE"
    return None

def _retry(fn: Callable[[], Any], attempts: int = 4, base_delay: float = 0.15, factor: float = 1.8) -> Any:
    """
    Ejecuta fn con reintentos y backoff exponencial.
    
    Configuración por defecto:
    - 4 intentos totales
    - Delays: 0.15s, 0.27s, 0.49s, 0.88s
    - Factor de multiplicación: 1.8
    
    Args:
        fn: Función a ejecutar
        attempts: Número total de intentos
        base_delay: Delay inicial en segundos
        factor: Factor de multiplicación para backoff exponencial
    
    Returns:
        Resultado de la función
        
    Raises:
        La última excepción si se agotan todos los intentos
    """
    last = None
    delay = base_delay
    
    for i in range(attempts):
        try:
            return fn()
        except RETRYABLE_EXC as e:
            last = e
            if i == attempts - 1:
                # Último intento fallido, levantar excepción
                logger.warning(f"Retry agotado después de {attempts} intentos. Último error: {e.__class__.__name__}")
                raise
            
            # Log del reintento (solo en desarrollo)
            if ENV == "development":
                logger.info(f"Reintento {i+1}/{attempts-1} en {delay:.2f}s por {e.__class__.__name__}")
            
            time.sleep(delay)
            delay *= factor
    
    # Este punto no debería alcanzarse, pero por seguridad
    if last:
        raise last

# === Helpers de normalización ===
def _user_email(u: Any) -> str:
    """Extrae email de cualquier formato de usuario de Supabase"""
    # dict
    if isinstance(u, dict):
        return (u.get("email") or "").lower()
    # objeto pydantic User
    em = getattr(u, "email", None)
    if em:
        return str(em).lower()
    # algunos clientes retornan {"user": {...}}
    inner = getattr(u, "user", None)
    if isinstance(inner, dict):
        return (inner.get("email") or "").lower()
    return ""

def _user_id(u: Any) -> Optional[str]:
    """Extrae user_id de cualquier formato de usuario de Supabase"""
    # dict
    if isinstance(u, dict):
        return u.get("id") or (u.get("user") or {}).get("id")
    # objeto pydantic User
    uid = getattr(u, "id", None)
    if uid:
        return str(uid)
    inner = getattr(u, "user", None)
    if isinstance(inner, dict):
        return inner.get("id")
    return None

def _as_user_list(obj: Any) -> list[Any]:
    """Convierte respuesta de list_users a lista de usuarios"""
    # Puede venir como dict {"users": [...]} o lista directa
    if isinstance(obj, dict) and "users" in obj:
        return obj.get("users") or []
    if isinstance(obj, list):
        return obj
    # Algunos clientes envían objetos con atributo .users
    users_attr = getattr(obj, "users", None)
    if isinstance(users_attr, list):
        return users_attr
    return []

def _find_user_by_email_once(supabase, email: str) -> Optional[Any]:
    """Busca usuario por email en una sola consulta (sin paginado completo)"""
    target = email.lower()
    page, per_page = 1, 200
    data = supabase.auth.admin.list_users(page=page, per_page=per_page)
    users = _as_user_list(data)
    for u in users:
        if _user_email(u) == target:
            return u
    return None

def _find_user_by_email_with_retry(supabase, email: str, attempts: int = 5, base_delay: float = 0.12) -> Optional[Any]:
    """
    Busca con polling suave (p. ej., tras create_user puede tardar unos ms)
    """
    for i in range(attempts):
        u = _find_user_by_email_once(supabase, email)
        if u: 
            return u
        time.sleep(base_delay * (1.7 ** i))
    return None

def _find_user_by_email(supabase, email: str) -> Optional[Any]:
    """
    Busca usuario por email usando Admin API (paginado simple) con retry/backoff.
    """
    target = email.lower()

    def _page(page: int, per_page: int):
        return supabase.auth.admin.list_users(page=page, per_page=per_page)

    page = 1
    per_page = 200
    while True:
        # Usar retry para la llamada a list_users
        data = _retry(lambda: _page(page, per_page))
        users = _as_user_list(data)
        if not users:
            return None
        for u in users:
            if _user_email(u) == target:
                return u
        if len(users) < per_page:
            return None
        page += 1

def _upsert_profile_simple(supabase, user_id: str, full_name: Optional[str], role_canonical: str, email: Optional[str] = None):
    """UPSERT simplificado en profiles por user_id"""
    profile_data = {
        "user_id": user_id, 
        "full_name": full_name, 
        "role": role_canonical
    }
    if email:
        profile_data["email"] = email
    
    return supabase.table("profiles").upsert(
        profile_data,
        on_conflict="user_id",
    ).execute()

def _upsert_profile(supabase, user_id: str, payload: Any) -> dict:
    """UPSERT en profiles por user_id. Evita el 23505."""
    profile_data = {
        "user_id": user_id,
        "full_name": getattr(payload, "full_name", None),
        "email": getattr(payload, "email", None),
        "role": getattr(payload, "role", None),
        "department": getattr(payload, "department", None),
        "phone": getattr(payload, "phone", None),
        "location": getattr(payload, "location", None),
        "active": getattr(payload, "active", True),
    }
    # Preferir upsert con on_conflict
    try:
        res = supabase.table("profiles").upsert(
            profile_data, on_conflict="user_id"
        ).execute()
        data = getattr(res, "data", None)
        return {"ok": True, "profile": data}
    except APIError as e:
        # Si por alguna razón la lib no soporta on_conflict y regresa 23505,
        # tratamos como idempotente (no error 500).
        first = e.args[0] if e.args else {}
        if isinstance(first, dict) and first.get("code") == "23505":
            return {"ok": True, "profile": None, "note": "duplicate ignored via idempotency"}
        raise

def _ensure_user_and_profile(supabase, email: str, password: Optional[str], full_name: Optional[str], role_canonical: str) -> tuple[str, bool]:
    """
    Orquesta todo el flujo con reintentos a nivel transacción completa:
    - Intenta encontrar; si no existe, crea.
    - Poll hasta ver reflejado al user.
    - Upsert profile.
    Devuelve (user_id, created).
    Lanza HTTPException con mensajes claros si falla.
    """
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        try:
            # 1) find
            u = _find_user_by_email_with_retry(supabase, email)
            created = False

            # 2) create si no existe
            if not u:
                body = {
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "user_metadata": {"full_name": full_name, "role": role_canonical},
                }
                try:
                    created_resp = supabase.auth.admin.create_user(body)
                except AuthApiError:
                    # Puede decir "ya existe"; re-verificamos
                    u = _find_user_by_email_with_retry(supabase, email, attempts=6)
                    if not u:
                        raise
                else:
                    u = created_resp.get("user") if isinstance(created_resp, dict) else created_resp
                    created = True

            user_id = _user_id(u)
            if not user_id:
                # Poll adicional por consistencia eventual
                u = _find_user_by_email_with_retry(supabase, email, attempts=6)
                user_id = _user_id(u) if u else None
            if not user_id:
                raise HTTPException(status_code=500, detail="Cannot resolve user_id after create/find")

            # 3) pequeña espera y upsert con reintento local si hay borde de consistencia
            time.sleep(0.05 * attempt)
            _upsert_profile_simple(supabase, user_id, full_name, role_canonical, email)

            return user_id, created

        except (AuthApiError, APIError) as e:
            if attempt == max_attempts:
                raise HTTPException(status_code=500, detail="User creation failed after retries") from e
            time.sleep(0.18 * (1.8 ** attempt))
    # no debería llegar
    raise HTTPException(status_code=500, detail="User creation orchestrator unexpected failure")

@router.post("", dependencies=[Depends(require_admin_user)])
def create_user(payload: UserCreateRequest):
    """
    Crea un nuevo usuario usando Service Role (IDEMPOTENTE con ORQUESTADOR)
    
    - **payload**: Datos del usuario a crear
    
    **Proceso:**
    1. Normaliza y valida email y rol
    2. Usa orquestador _ensure_user_and_profile con auto-retry interno
    3. Responde 201 (creado) o 200 (ya existía), nunca 500
    """
    supabase = get_supabase()

    # Normalización/validación
    if not getattr(payload, "email", None):
        raise HTTPException(status_code=400, detail="email is required")
    email = payload.email.strip().lower()

    role_canonical = _normalize_role(getattr(payload, "role", None))
    if not role_canonical:
        raise HTTPException(status_code=400, detail="Invalid role. Allowed: ADMIN, RESPONSABLE")

    full_name = getattr(payload, "full_name", None)
    password = getattr(payload, "password", None) or generate_random_password()

    # Usar orquestador con auto-retry interno
    user_id, created = _ensure_user_and_profile(
        supabase=supabase,
        email=email,
        password=password,
        full_name=full_name,
        role_canonical=role_canonical,
    )

    resp = {
        "ok": True, 
        "user_id": user_id, 
        "created": created,
        "message": "Usuario creado exitosamente" if created else "Usuario ya existía, perfil actualizado",
        "action": "created" if created else "updated"
    }
    
    if created and not getattr(payload, "password", None):
        resp["generated_password"] = password
    
    return JSONResponse(
        content=resp, 
        status_code=status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )

@router.get("", dependencies=[Depends(require_admin_user)])
def list_users():
    """
    Lista todos los usuarios desde la tabla profiles.
    Incluye campos necesarios para la lista y evita caché HTTP.
    """
    supabase = get_supabase()
    
    # Incluye campos necesarios para la lista, ordenado por fecha de actualización
    res = supabase.table("profiles").select("*").order("updated_at", desc=True).execute()
    data = getattr(res, "data", None) or []
    
    # Cabeceras para evitar caché en navegadores/proxies
    return JSONResponse(
        content=data,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
        }
    )

@router.get("/template")
async def get_user_template():
    """
    Devuelve información sobre la estructura esperada para crear usuarios
    """
    return {
        "message": "Estructura para crear usuarios",
        "required_fields": ["full_name", "email"],
        "optional_fields": ["password", "role", "department", "phone", "location", "active"],
        "defaults": {
            "role": "RESPONSABLE",
            "active": True
        },
        "validation": {
            "full_name": "Requerido, no vacío",
            "email": "Formato de email válido",
            "password": "Mínimo 8 caracteres (se genera automáticamente si no se proporciona)",
            "role": "ADMIN, TECNICO o RESPONSABLE"
        }
    }
