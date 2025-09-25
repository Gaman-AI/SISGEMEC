# FILE: backend/app/routers/deprecations.py
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/import-inventario")
async def deprecated_import_inventario():
    """
    Compatibilidad temporal para clientes antiguos
    Quita este router cuando ya no haya consumidores legacy.
    """
    raise HTTPException(
        status_code=410,
        detail="El importador combinado (legacy) fue retirado. Usa /import-usuarios y /import-equipos."
    )
