from typing import Dict, Any, Optional
from datetime import datetime

SLA_SECONDS = {
    'Urgent': 4 * 3600,
    'Important': 24 * 3600,
    'Medium': 3 * 24 * 3600,
    'Low': 5 * 24 * 3600
}

class TicketsReportsService:
    def __init__(self):
        try:
            from app.deps.supabase_client import supa_service
            self.sb = supa_service()
        except Exception:
            try:
                from app.core.supabase_client import get_supabase
                self.sb = get_supabase()
            except Exception:
                raise RuntimeError("No se encontró supa_service. Ajusta el import en tickets_reports.py")
    
    def get_metrics(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        priority: Optional[str] = None,
        estado: Optional[str] = None
    ) -> Dict[str, Any]:
        """Obtener métricas y KPIs de tickets"""
        
        # Query base con filtros
        query = self.sb.table("v_report_tickets").select("*")
        
        if date_from:
            query = query.gte("received_at", date_from)
        if date_to:
            query = query.lte("received_at", date_to)
        if priority:
            query = query.eq("priority", priority)
        if estado:
            query = query.eq("estado", estado)
        
        tickets = query.execute().data or []
        
        # Calcular métricas
        total_tickets = len(tickets)
        closed_tickets = [t for t in tickets if t.get("closed_at")]
        
        # TTR y TFR
        ttr_values = [t.get("ttr_seconds", 0) for t in closed_tickets if t.get("ttr_seconds")]
        tfr_values = []
        for t in closed_tickets:
            if t.get("first_response_at") and t.get("received_at"):
                # Calcular TFR
                try:
                    first_response = datetime.fromisoformat(t["first_response_at"].replace('Z', '+00:00'))
                    received = datetime.fromisoformat(t["received_at"].replace('Z', '+00:00'))
                    tfr_seconds = (first_response - received).total_seconds()
                    tfr_values.append(tfr_seconds)
                except Exception:
                    pass
        
        avg_ttr = sum(ttr_values) / len(ttr_values) if ttr_values else 0
        avg_tfr = sum(tfr_values) / len(tfr_values) if tfr_values else 0
        
        # SLA Compliance
        sla_compliant = 0
        for t in closed_tickets:
            priority_at_close = t.get("priority", "Medium")
            sla_limit = SLA_SECONDS.get(priority_at_close, SLA_SECONDS["Medium"])
            ttr = t.get("ttr_seconds", 0)
            if ttr <= sla_limit:
                sla_compliant += 1
        
        sla_compliance_pct = (sla_compliant / len(closed_tickets) * 100) if closed_tickets else 0
        
        # Backlog actual
        backlog = self.sb.table("tickets")\
            .select("*", count="exact")\
            .neq("estado", "Cerrado")\
            .execute()
        
        return {
            "total_tickets": total_tickets,
            "closed_tickets": len(closed_tickets),
            "backlog": backlog.count or 0,
            "avg_ttr_seconds": avg_ttr,
            "avg_tfr_seconds": avg_tfr,
            "avg_ttr_hours": avg_ttr / 3600,
            "sla_compliance_pct": sla_compliance_pct,
            "by_priority": self._group_by_priority(tickets),
            "by_estado": self._group_by_estado(tickets)
        }
    
    def _group_by_priority(self, tickets):
        groups = {}
        for t in tickets:
            p = t.get("priority", "Medium")
            if p not in groups:
                groups[p] = 0
            groups[p] += 1
        return groups
    
    def _group_by_estado(self, tickets):
        groups = {}
        for t in tickets:
            e = t.get("estado", "Pendiente")
            if e not in groups:
                groups[e] = 0
            groups[e] += 1
        return groups
