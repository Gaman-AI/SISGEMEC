from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import logging

from app.routers.me import router as me_router
from app.routers.equipos import router as equipos_router
from app.routers.servicios import router as servicios_router
from app.routers.auth import router as auth_router
from app.routers.import_usuarios import router as import_usuarios_router
from app.routers.import_equipos import router as import_equipos_router
from app.routers.deprecations import router as deprecations_router
from app.routers.admin_users import router as admin_users_router
from app.config import settings
from app.core.supabase_client import get_supabase, _read_envs

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
    
    yield

app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

# Log API_ADMIN_TOKEN status on boot (dev only)
if getattr(settings, "ENVIRONMENT", "development") != "production":
    masked = "****" if getattr(settings, "API_ADMIN_TOKEN", None) else "(vacío)"
    print(f"[BOOT] API_ADMIN_TOKEN: {masked}")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternativo
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization", "authorization"],
)

# Rutas de API
app.include_router(auth_router)
app.include_router(me_router)
app.include_router(equipos_router)
app.include_router(servicios_router)
app.include_router(import_usuarios_router)
app.include_router(import_equipos_router)
app.include_router(admin_users_router)

# Compatibilidad temporal para endpoints legacy
app.include_router(deprecations_router)

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
