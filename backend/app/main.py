from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.routers.me import router as me_router
from app.routers.equipos import router as equipos_router
from app.routers.servicios import router as servicios_router
from app.routers.auth import router as auth_router
from app.routers.import_inventario import router as import_inventario_router
from app.routers.import_usuarios import router as import_usuarios_router
from app.routers.import_equipos import router as import_equipos_router
from app.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Rutas de API
app.include_router(auth_router)
app.include_router(me_router)
app.include_router(equipos_router)
app.include_router(servicios_router)
app.include_router(import_inventario_router)
app.include_router(import_usuarios_router)
app.include_router(import_equipos_router)

# API pura - no servir archivos estáticos del frontend
# El frontend se sirve por separado (Vite dev server o build estático)

@app.get("/")
def root():
    return {"message": "SISGEMEC API", "version": "2.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}




