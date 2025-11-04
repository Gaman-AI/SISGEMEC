from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any
from app.services.catalog_service import CatalogService

# Guardia ADMIN existente en el repo; mismo patrón que tickets.py
try:
    from app.deps.jwt_auth import require_admin_user
except Exception:
    def require_admin_user():
        raise HTTPException(status_code=500, detail="Dependencia require_admin_user no disponible. Ajusta el import en app/routers/catalog.py")

router = APIRouter(prefix="/catalog", tags=["catalog"])

@router.get("/equipos")
def list_equipos(
    email: str = Query(..., description="Correo del solicitante para buscar equipos asociados"),
    _=Depends(require_admin_user)
) -> List[Dict[str, Any]]:
    """
    Listar equipos asociados a un responsable por su email.
    Retorna lista de {equipo_id, etiqueta} con información descriptiva del equipo.
    """
    if not email or not email.strip():
        raise HTTPException(status_code=400, detail="email requerido")
    
    svc = CatalogService()
    return svc.equipos_by_email(email)

@router.get("/tipos-servicio")
def list_tipos_servicio(
    _=Depends(require_admin_user)
) -> List[Dict[str, Any]]:
    """
    Listar catálogo completo de tipos de servicio.
    Retorna lista de {tipo_servicio_id, nombre}.
    """
    svc = CatalogService()
    return svc.tipos_servicio()

