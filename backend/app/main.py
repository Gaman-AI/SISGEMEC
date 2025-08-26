from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.routers.me import router as me_router
from app.routers.equipos import router as equipos_router
from app.routers.servicios import router as servicios_router
from app.routers.auth import router as auth_router
from app.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rutas de API
app.include_router(auth_router)
app.include_router(me_router)
app.include_router(equipos_router)
app.include_router(servicios_router)

# Servir estáticos (frontend mínimo)
import os
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def root():
    return RedirectResponse(url="/static/login.html")

@app.get("/health")
def health():
    return {"status": "ok"}




