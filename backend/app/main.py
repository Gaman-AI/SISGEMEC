# ==== .env robusto (no intrusivo) ====
import os
import logging
try:
    from dotenv import load_dotenv, find_dotenv
    # Cargar solo .env (no env.local que tiene EMAIL_DEBUG=1)
    env_path = find_dotenv(filename=".env", usecwd=True)
    if env_path:
        load_dotenv(env_path, override=True)
        logging.getLogger("uvicorn").info(f"[CONFIG] Cargando configuración desde: {env_path}")
    else:
        logging.getLogger("uvicorn").warning("[CONFIG] No se encontró archivo .env")
except Exception as e:
    logging.getLogger("uvicorn").error(f"[CONFIG] Error cargando .env: {e}")
    pass

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, FileResponse, JSONResponse, Response, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys
import uuid
import traceback

logger = logging.getLogger("uvicorn")

from app.routers.me import router as me_router
from app.routers.equipos import router as equipos_router
# DEPRECATED: import routers servicios/solicitudes (ocultos del API público)
# from app.routers.servicios import router as servicios_router
# from app.routers.solicitudes import router as solicitudes_router
from app.routers.auth import router as auth_router
from app.routers.import_usuarios import router as import_usuarios_router
from app.routers.import_equipos import router as import_equipos_router
from app.routers.deprecations import router as deprecations_router
from app.routers.admin_users import router as admin_users_router
from app.routers.debug_auth import router as debug_auth_router
from app.routers.debug_cors import router as debug_cors_router
from app.routers.debug_last_error import router as debug_last_error_router
from app.routers.reportes import router as reportes_router
from app.routers.health import router as health_router
from app.middleware.logging import LoggingMiddleware
from app.config import settings
from app.core.supabase_client import get_supabase, _read_envs
from app.core.email_config import EmailSettings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan manager para precalentar Supabase al arranque.
    Evita el fallo del primer intento (500) al crear usuarios.
    """
    # Precalienta Supabase (evita "primer request" fallida)
    try:
        _ = get_supabase()
        logging.getLogger("supabase").info("✅ Supabase client precalentado exitosamente")
    except Exception as e:
        # Loguea pero no aborta servidor; se reintentará en endpoints.
        logging.getLogger("supabase").warning("⚠️ Supabase warm-up failed on startup: %s", e.__class__.__name__)
        logging.getLogger("supabase").warning("   Los endpoints reintentarán automáticamente")
    
    # Log de EmailSettings al startup (sin exponer password)
    try:
        s = EmailSettings()
        masked_user = (s.user[:2] + "***") if s.user else ""
        logging.getLogger("uvicorn").info(
            f"[EMAIL] loaded host={s.host} port={s.port} tls={s.use_tls} user={masked_user} from={s.from_email} debug={s.email_debug}"
        )
    except Exception as e:
        logging.getLogger("uvicorn").warning(f"[EMAIL] Error cargando EmailSettings: {e}")
    
    yield

app = FastAPI(
    title="SISGEMEC API", 
    lifespan=lifespan,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Logging consistente y visible
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Log API_ADMIN_TOKEN status on boot (dev only)
if getattr(settings, "ENVIRONMENT", "development") != "production":
    masked = "****" if getattr(settings, "API_ADMIN_TOKEN", None) else "(vacío)"
    print(f"[BOOT] API_ADMIN_TOKEN: {masked}")

# --- Config CORS ---
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").rstrip("/")
allow_origins = [FRONTEND_ORIGIN, "http://127.0.0.1:5173"]

# 1) CORSMiddleware oficial (único y al inicio)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

logger.info("[CORS] allow_origins=%s", allow_origins)

# Import global error tracking
from app.core.error_tracking import capture_exception

# 2) CORS Shield + Error Capture Middleware
@app.middleware("http")
async def cors_and_error_shield(request: Request, call_next):
    # OPTIONS (preflight) sale rápido con CORS - SIN AUTENTICACIÓN
    if request.method.upper() == "OPTIONS":
        resp = Response(status_code=204)
        origin = request.headers.get("origin")
        if origin in allow_origins:
            resp.headers["Access-Control-Allow-Origin"] = origin
            resp.headers["Vary"] = "Origin"
        else:
            # Permitir localhost y 127.0.0.1 por defecto
            resp.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, X-Requested-With, Accept, Origin, Idempotency-Key"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        resp.headers["Access-Control-Max-Age"] = "86400"  # Cache preflight por 24h
        return resp
    
    try:
        resp = await call_next(request)
    except Exception as e:
        error_id = str(uuid.uuid4())[:8]
        trace = traceback.format_exc()
        where = f"{request.method} {request.url.path}"
        extra = {"headers": dict(request.headers)}
        
        capture_exception(e)
        logger.error("[ERR][%s] %s\n%s", error_id, repr(e), trace)
        
        resp = JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error_id": error_id})

    # Forzar CORS en toda respuesta
    origin = request.headers.get("origin")
    if origin in allow_origins:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
    else:
        # Fallback para desarrollo
        resp.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
    resp.headers["Access-Control-Allow-Credentials"] = "true"
    resp.headers["Access-Control-Expose-Headers"] = "Content-Disposition, Idempotency-Key"
    return resp

# Middleware de logging
app.add_middleware(LoggingMiddleware)

# Rutas de API
app.include_router(health_router)  # Health check (sin auth)
app.include_router(auth_router)
app.include_router(me_router)
app.include_router(equipos_router)
# DEPRECATED: routers de servicios/solicitudes deshabilitados del enrutador principal.
# app.include_router(servicios_router, prefix="/servicios", tags=["Servicios"])
# app.include_router(solicitudes_router, prefix="/solicitudes", tags=["Solicitudes"])
app.include_router(import_usuarios_router)
app.include_router(import_equipos_router)
app.include_router(admin_users_router)
app.include_router(reportes_router)

# Compatibilidad temporal para endpoints legacy
app.include_router(deprecations_router)

# ------------------------------------------------------------------
# Registro de routers del módulo Tickets (seguro, sin romper nada).
# Si tu proyecto usa otra estructura de paths, ajusta los imports.
# ------------------------------------------------------------------
try:
    from app.routers.intake import router as intake_router
    app.include_router(intake_router)
    logging.getLogger("uvicorn").info("[TICKETS] Intake router registrado exitosamente")
except Exception as e:
    # Loguea de forma no intrusiva si tu proyecto tiene logger.
    logging.getLogger("uvicorn").warning(f"[TICKETS] Intake router no registrado: {e}")

try:
    from app.routers.tickets import router as tickets_router
    app.include_router(tickets_router)
    logging.getLogger("uvicorn").info("[TICKETS] Tickets router registrado exitosamente")
except Exception as e:
    logging.getLogger("uvicorn").warning(f"[TICKETS] Tickets router no registrado: {e}")

try:
    from app.routers.tickets_reports import router as tickets_reports_router
    app.include_router(tickets_reports_router)
    logging.getLogger("uvicorn").info("[TICKETS] Reports router registrado exitosamente")
except Exception as e:
    logging.getLogger("uvicorn").warning(f"[TICKETS] Reports router no registrado: {e}")

try:
    from app.routers.catalog import router as catalog_router
    app.include_router(catalog_router)
    logging.getLogger("uvicorn").info("[CATALOG] Catalog router registrado exitosamente")
except Exception as e:
    logging.getLogger("uvicorn").warning(f"[CATALOG] Catalog router no registrado: {e}")

# Debug endpoints (solo si EMAIL_DEBUG=1)
EMAIL_DEBUG = os.getenv("EMAIL_DEBUG", "0")
logging.getLogger("uvicorn").info(f"[EMAIL] env=development | EMAIL_DEBUG(env)={EMAIL_DEBUG} | SMTP_USER={os.getenv('SMTP_USER', 'NOT_SET')}")

if EMAIL_DEBUG in ("1", "true", "True"):
    app.include_router(debug_auth_router, tags=["debug"])
    app.include_router(debug_cors_router, tags=["debug"])
    app.include_router(debug_last_error_router, tags=["debug"])

# --- Ruta de diagnóstico para ver TODAS las rutas registradas ---
@app.get("/__routes")
def __routes():
    # Nota: las rutas con prefijo '/debug' deben aparecer aquí si el router se montó
    return sorted([f"{list(r.methods)} {r.path}" for r in app.router.routes])

# --- Montaje condicional del router de debug CON prefijo '/debug' ---
try:
    from app.routers.debug_email import router as debug_router
    if EmailSettings().email_debug:
        app.include_router(debug_router, prefix="/debug", tags=["debug-email"])
        logging.getLogger("uvicorn").info("[DEBUG] Router /debug montado (EMAIL_DEBUG=1)")
    else:
        logging.getLogger("uvicorn").info("[DEBUG] Router /debug NO montado (EMAIL_DEBUG != 1)")
except Exception as e:
    logging.getLogger("uvicorn").warning(f"[DEBUG] No se pudo montar /debug: {e}")

# --- Montaje condicional del router de licencias ---
FEATURE_LICENSES = os.getenv("FEATURE_LICENSES", "false").lower() in ("true", "1")
if FEATURE_LICENSES:
    try:
        from app.routers.licenses.vendors import router as vendors_router
        from app.routers.licenses.products import router as products_router
        from app.routers.licenses.plans import router as plans_router
        from app.routers.licenses.licenses import router as licenses_router
        from app.routers.licenses.assignments import router as assignments_router
        
        app.include_router(vendors_router, prefix="/licenses/vendors", tags=["licenses-vendors"])
        app.include_router(products_router, prefix="/licenses/products", tags=["licenses-products"])
        app.include_router(plans_router, prefix="/licenses/plans", tags=["licenses-plans"])
        app.include_router(licenses_router, prefix="/licenses", tags=["licenses"])
        app.include_router(assignments_router, prefix="/licenses/assignments", tags=["licenses-assignments"])
        
        logging.getLogger("uvicorn").info("[LICENSES] Router /licenses montado (FEATURE_LICENSES=true)")
    except Exception as e:
        logging.getLogger("uvicorn").warning(f"[LICENSES] No se pudo montar /licenses: {e}")
else:
    logging.getLogger("uvicorn").info("[LICENSES] Router /licenses NO montado (FEATURE_LICENSES != true)")

# Endpoint de diagnóstico para desarrollo
if getattr(settings, "ENVIRONMENT", "development") != "production":
    from fastapi import APIRouter
    from typing import Any
    
    diag = APIRouter(prefix="/__diagnostics", tags=["__diagnostics"])
    
    @diag.get("/env")
    def diag_env():
        env = _read_envs()
        # NO exponemos valores; solo hints/longitudes
        def hint(s: str):
            return {"empty": (s == ""), "len": len(s), "is_jwt": (len(s.split(".")) == 3)}
        return {
            "SUPABASE_URL": {"empty": (env["SUPABASE_URL"] == "")},
            "SUPABASE_SERVICE_ROLE_KEY": hint(env["SUPABASE_SERVICE_ROLE_KEY"]),
            "SUPABASE_ANON_KEY": hint(env["SUPABASE_ANON_KEY"]),
        }
    
    @diag.get("/supabase")
    def diag_supabase():
        try:
            client = get_supabase()
            users = client.auth.admin.list_users(page=1, per_page=1)
            return {"supabase_admin_ok": True, "sample_count": len(users) if users else 0}
        except Exception as e:
            return {"supabase_admin_ok": False, "error": e.__class__.__name__}
    
    app.include_router(diag)

# API pura - no servir archivos estáticos del frontend
# El frontend se sirve por separado (Vite dev server o build estático)

@app.get("/")
def root():
    return {"message": "SISGEMEC API", "version": "2.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}

# SPA Fallback para client-side routing
# Solo se activa si existe el directorio dist del frontend
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(FRONTEND_DIR):
    # Servir archivos estáticos
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets"), html=False), name="assets")
    
    @app.get("/{full_path:path}")
    async def spa_catch_all(full_path: str):
        """Catch-all para SPA routing - devuelve index.html para cualquier ruta no encontrada"""
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"detail": "Frontend not built - index.html not found"}
