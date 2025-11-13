from typing import Dict, Any, Optional
import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, Path
from app.schemas.tickets import (
    TicketListFilters, TicketOut, TicketUpdate,
    TicketChangeState, TicketClassify, TicketChangePriority,  # ACTUALIZADO
    TicketEvent  # NUEVO
)
from app.services.tickets_service import TicketsService
from app.core.supabase_client import reset_supabase_client

# Intentar importar reset de deps también (por si TicketsService usa ese cliente)
try:
    from app.deps.supabase_client import reset_supabase_service_client
except ImportError:
    reset_supabase_service_client = None

logger = logging.getLogger("app.routers.tickets")

# Guardia ADMIN existente en el repo; si no coincide el path, ajusta import.
try:
    from app.deps.jwt_auth import require_admin_user
except Exception:
    def require_admin_user():
        raise HTTPException(status_code=500, detail="Dependencia require_admin_user no disponible. Ajusta el import en app/routers/tickets.py")

router = APIRouter(prefix="/tickets", tags=["tickets"])

@router.get("", response_model=Dict[str, Any])
def list_tickets(filters: TicketListFilters = Depends(), _=Depends(require_admin_user)):
    svc = TicketsService()
    try:
        return svc.list_tickets(filters)
    except (httpx.RemoteProtocolError, httpx.ConnectError, ConnectionError) as e:
        logger.warning("[TICKETS:list] Supabase link dropped (%s). Resetting client and retrying once.", e.__class__.__name__)
        reset_supabase_client()  # Reset core client
        if reset_supabase_service_client:
            reset_supabase_service_client()  # Reset deps client si existe
        svc = TicketsService()  # re-instancia para que tome cliente fresco
        return svc.list_tickets(filters)

@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(ticket_id: int = Path(..., ge=1), _=Depends(require_admin_user)):
    svc = TicketsService()
    data = svc.sb.table("tickets").select("*").eq("ticket_id", ticket_id).single().execute().data
    if not data:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    # Calcular prioritario para compatibilidad
    data["prioritario"] = svc._calculate_prioritario(data.get("priority", "Medium"))
    return data

@router.post("", response_model=TicketOut, status_code=201)
def create_ticket_manual(payload: TicketUpdate, _=Depends(require_admin_user)):
    svc = TicketsService()
    res = svc.sb.table("tickets").insert(payload.dict(exclude_none=True)).execute().data
    if not res:
        raise HTTPException(status_code=400, detail="No fue posible crear el ticket")
    created = res[0]
    try:
        svc._insert_event(ticket_id=created["ticket_id"], actor_id=None, event_type="CREATED", payload={"source": "manual"})
    except Exception:
        pass
    return created

@router.put("/{ticket_id}", response_model=TicketOut)
def update_ticket(ticket_id: int, patch: TicketUpdate, _=Depends(require_admin_user)):
    svc = TicketsService()
    return svc.update_ticket(ticket_id, patch, actor_id=None)

@router.get("/{ticket_id}/events", response_model=list[TicketEvent])  # NUEVO
def get_ticket_events(ticket_id: int = Path(..., ge=1), _=Depends(require_admin_user)):
    """Obtener timeline de eventos de un ticket"""
    svc = TicketsService()
    return svc.get_ticket_events(ticket_id)

@router.put("/{ticket_id}/estado", response_model=TicketOut)
def change_state(ticket_id: int, data: TicketChangeState, _=Depends(require_admin_user)):
    svc = TicketsService()
    try:
        return svc.change_state(ticket_id, data.estado, actor_id=None)
    except RuntimeError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.put("/{ticket_id}/prioridad", response_model=TicketOut)  # ACTUALIZADO
def update_priority(
    ticket_id: int,
    data: TicketChangePriority,
    prioritario: Optional[bool] = None,  # Query param para compat
    _=Depends(require_admin_user)
):
    """Actualizar prioridad del ticket (acepta priority enum o prioritario bool deprecated)"""
    svc = TicketsService()
    return svc.update_priority(ticket_id, data.priority, prioritario, actor_id=None)

@router.put("/{ticket_id}/clasificar", response_model=TicketOut)
def classify_ticket(ticket_id: int, data: TicketClassify, _=Depends(require_admin_user)):
    """Clasificar ticket - ahora requiere priority"""
    svc = TicketsService()
    return svc.classify(ticket_id, data, actor_id=None)
