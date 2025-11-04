from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.services.tickets_reports import TicketsReportsService

try:
    from app.deps.jwt_auth import require_admin_user
except Exception:
    def require_admin_user():
        pass

router = APIRouter(prefix="/tickets/reports", tags=["tickets-reports"])

@router.get("")
def get_tickets_metrics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    _=Depends(require_admin_user)
):
    """Obtener métricas y KPIs de tickets"""
    svc = TicketsReportsService()
    return svc.get_metrics(date_from, date_to, priority, estado)
