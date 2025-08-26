from typing import Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.deps.auth import get_bearer_token
from app.deps.supabase_client import client_with_token

router = APIRouter(prefix="/servicios", tags=["servicios"])

class ServicioCreate(BaseModel):
    equipo_id: Any  # puede ser UUID/str/int según tu DB
    descripcion: Optional[str] = None
    estado_servicio_id: Optional[Any] = None  # opcional; si no viene, intentamos NUEVO

def _try_get_estado_id_nuevo(sb) -> Optional[Any]:
    """
    Intenta encontrar el ID del estado 'NUEVO' en un catálogo razonable.
    No rompe si no existe; en tal caso se regresa None y se espera default de la DB.
    Ajusta el nombre de la tabla/campo si tu catálogo difiere.
    """
    # Intento 1: tabla 'estados_servicio' con columna 'codigo'
    resp = sb.table("estados_servicio").select("id,codigo").eq("codigo", "NUEVO").single().execute()
    if resp.data and resp.data.get("id") is not None:
        return resp.data["id"]

    # Intento 2: misma tabla pero columna 'nombre'
    resp2 = sb.table("estados_servicio").select("id,nombre").eq("nombre", "NUEVO").single().execute()
    if resp2.data and resp2.data.get("id") is not None:
        return resp2.data["id"]

    # Si tu esquema usa otro catálogo, ajusta arriba.
    return None

@router.post("")
def crear_servicio(payload: ServicioCreate, token: str = Depends(get_bearer_token)):
    """
    Crea un servicio/ticket para un equipo. RLS debe validar que:
    - El RESPONSABLE solo puede crear para sus equipos.
    - ADMIN puede crear para cualquier equipo.
    Si no viene estado_servicio_id, intenta setear a NUEVO (por ID). Si no se encuentra,
    se confía en default de la DB.
    """
    sb = client_with_token(token)

    insert_data: Dict[str, Any] = {
        "equipo_id": payload.equipo_id,
        "descripcion": payload.descripcion,
    }

    estado_id = payload.estado_servicio_id
    if estado_id is None:
        estado_id = _try_get_estado_id_nuevo(sb)
    if estado_id is not None:
        insert_data["estado_servicio_id"] = estado_id

    resp = sb.table("servicios").insert(insert_data).select("*").single().execute()
    if resp.error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(resp.error))
    return resp.data
