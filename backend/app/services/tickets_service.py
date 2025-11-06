from typing import Optional, Dict, Any
from datetime import datetime, timezone
from uuid import UUID
import logging

# Supabase service client flexible
try:
    from app.deps.supabase_client import supa_service  # proyecto A
except Exception:
    try:
        from app.core.supabase_client import get_supabase  # proyecto B
        def supa_service():
            return get_supabase()
    except Exception:
        supa_service = None  # será validado al construir

from app.schemas.tickets import (
    TicketCreateIntake, TicketIntakeResponse, TicketListFilters, TicketOut, TicketUpdate,
    TicketClassify, TicketChangePriority
)
from app.services.tickets_notifier import TicketsNotifier

TABLE_TICKETS = "tickets"
TABLE_EVENTS = "ticket_events"

# Constantes SLA (en segundos)
SLA_URGENT = 4 * 3600      # 4 horas
SLA_IMPORTANT = 24 * 3600   # 1 día
SLA_MEDIUM = 3 * 24 * 3600  # 3 días
SLA_LOW = 5 * 24 * 3600     # 5 días

class TicketsService:
    def __init__(self):
        if supa_service is None:
            raise RuntimeError("No se encontró supa_service. Ajusta el import en tickets_service.py")
        self.sb = supa_service()
        self.notifier = TicketsNotifier()
        self.logger = logging.getLogger(__name__)

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _is_uuid(self, value: str) -> bool:
        try:
            UUID(str(value))
            return True
        except Exception:
            return False

    def _get_user_id_by_email(self, email: str) -> Optional[str]:
        if not email:
            return None
        normalized = email.strip().lower()
        res = self.sb.table("profiles").select("user_id, email").ilike("email", normalized).limit(1).execute()
        rows = (res.data or [])
        return rows[0].get("user_id") if rows else None

    def _map_priority_from_boolean(self, prioritario: bool) -> str:
        """Mapeo temporal para compatibilidad"""
        return 'Important' if prioritario else 'Medium'

    def _calculate_prioritario(self, priority: str) -> bool:
        """Cálculo inverso temporal para compatibilidad"""
        return priority in ('Urgent', 'Important')

    def _insert_event(self, ticket_id: int, actor_id: Optional[str], event_type: str, payload: Optional[Dict[str, Any]] = None):
        payload = payload or {}
        self.sb.table(TABLE_EVENTS).insert({
            "ticket_id": ticket_id,
            "actor_id": actor_id,
            "event_type": event_type,
            "payload": payload
        }).execute()

    # ---------- Intake (Google Forms) ----------
    def create_from_forms(self, data: TicketCreateIntake) -> TicketIntakeResponse:
        external_id = data.submissionId if data.submissionId else None

        # Normalizar payload para capturar campos extra fuera de meta
        try:
            data_dict = data.dict()
        except Exception:
            data_dict = {}
        known_keys = {"submissionId", "email", "nombre", "descripcion", "meta"}
        extra_payload = {k: v for k, v in data_dict.items() if k not in known_keys and v is not None}

        raw_payload: Dict[str, Any] = {}
        if getattr(data, "meta", None):
            try:
                raw_payload.update(data.meta or {})
            except Exception:
                pass
        if extra_payload:
            try:
                raw_payload.update(extra_payload)
            except Exception:
                pass

        ticket_payload = {
            "solicitante_email": data.email,
            "solicitante_nombre": data.nombre,
            "descripcion": data.descripcion,
            "fuente": "google_forms",
            "external_id": external_id,
            "raw_payload": raw_payload,
            "received_at": self._now_iso(),
            "priority": "Medium",  # NUEVO - default para intake
        }

        created = None
        if external_id:
            # Intento de upsert por external_id (idempotencia) con fallback
            try:
                res_up = self.sb.table(TABLE_TICKETS).upsert(ticket_payload, on_conflict="external_id").execute()
                created = (res_up.data or [None])[0]
            except Exception:
                existing = self.sb.table(TABLE_TICKETS).select("*").eq("external_id", external_id).limit(1).execute()
                if existing.data:
                    created = existing.data[0]
                else:
                    res_ins = self.sb.table(TABLE_TICKETS).insert(ticket_payload).execute()
                    created = (res_ins.data or [None])[0]
        else:
            res_ins = self.sb.table(TABLE_TICKETS).insert(ticket_payload).execute()
            created = (res_ins.data or [None])[0]

        if not created:
            raise RuntimeError("No fue posible crear o recuperar el ticket de intake.")

        # Clasificación mínima: si no hay solicitante/equipo, marcar requiere clasificación
        if created.get("solicitante_id") is None or created.get("equipo_id") is None:
            try:
                self.sb.table(TABLE_TICKETS).update({"requires_classification": True}).eq("ticket_id", created["ticket_id"]).execute()
                created["requires_classification"] = True
            except Exception:
                pass

        # Evento CREATED
        try:
            self._insert_event(ticket_id=created["ticket_id"], actor_id=None, event_type="CREATED",
                               payload={"source": "google_forms"})
        except Exception:
            pass

        # Notificación a admins (no rompe si falla)
        try:
            if hasattr(self, "notifier") and self.notifier:
                count = self.notifier.send_ticket_created_admin_alert({"ticket": created})
                if count > 0:
                    self.logger.info("[TicketsService] Admin alert para ticket #%s: enviados=%s",
                                     created.get("ticket_id"), count)
        except Exception as e:
            self.logger.warning("[TicketsService] Error al notificar admins de ticket #%s: %s",
                                created.get("ticket_id"), e)

        return TicketIntakeResponse(
            ticket_id=created["ticket_id"],
            estado=created["estado"],
            priority=created.get("priority", "Medium"),  # NUEVO
            prioritario=self._calculate_prioritario(created.get("priority", "Medium")),  # DEPRECATED
            requires_classification=created.get("requires_classification", False),
            received_at=created["received_at"]
        )

    # ---------- Listado con filtros ----------
    def list_tickets(self, f: TicketListFilters) -> Dict[str, Any]:
        # --- COUNT: aplicar exactamente los mismos filtros, sin paginar ---
        def apply_filters(query):
            if f.estado:
                query = query.eq("estado", f.estado)
            if f.priority:  # NUEVO - filtro por priority
                query = query.eq("priority", f.priority)
            elif f.prioritario is not None:  # DEPRECATED - compatibilidad
                # Mapear boolean a priority para filtro
                priority_value = self._map_priority_from_boolean(f.prioritario)
                query = query.eq("priority", priority_value)
            if f.fuente:
                query = query.eq("fuente", f.fuente)
            if f.received_start:
                query = query.gte("received_at", f.received_start)
            if f.received_end:
                query = query.lte("received_at", f.received_end)
            if f.closed_start:
                query = query.gte("closed_at", f.closed_start)
            if f.closed_end:
                query = query.lte("closed_at", f.closed_end)
            if getattr(f, "q", None):
                # Buscar por email, nombre o descripción
                like = f"%{f.q}%"
                query = query.or_(f"solicitante_email.ilike.{like},solicitante_nombre.ilike.{like},descripcion.ilike.{like}")
            return query

        count_query = apply_filters(self.sb.table(TABLE_TICKETS).select("*", count="exact"))
        count_res = count_query.execute()
        total_count = getattr(count_res, "count", 0) or 0

        # --- DATA: aplicar mismos filtros + orden + rango ---
        q = apply_filters(self.sb.table(TABLE_TICKETS).select("*"))
        # Ordenamiento seguro
        order = getattr(f, "order_by", None) or "received_at.desc"
        if isinstance(order, str) and order.endswith(".desc"):
            q = q.order(order[:-5], desc=True)
        elif isinstance(order, str):
            q = q.order(order, desc=False)
        else:
            q = q.order("received_at", desc=True)

        page = max(int(getattr(f, "page", 1) or 1), 1)
        size = max(int(getattr(f, "size", 20) or 20), 1)
        start = max((page - 1) * size, 0)
        end = start + size - 1

        resp = q.range(start, end).execute()
        data = resp.data or []

        # Log no intrusivo
        try:
            print(f"[TICKETS:list] page={page} size={size} start={start} end={end} items={len(data)} total={total_count} order={order}")
        except Exception:
            pass

        return {"items": data, "page": page, "size": size, "total": total_count}

    # ---------- Cambiar estado ----------
    def change_state(self, ticket_id: int, new_state: str, actor_id: Optional[str]) -> Dict[str, Any]:
        # Obtener ticket actual para validaciones
        current = self.sb.table(TABLE_TICKETS).select("estado,priority").eq("ticket_id", ticket_id).single().execute().data
        if not current:
            raise RuntimeError("Ticket no encontrado")
        
        # VALIDACIÓN: No permitir Pendiente → Cerrado
        if current["estado"] == "Pendiente" and new_state == "Cerrado":
            raise RuntimeError("Debe pasar por 'En atención' primero.")
        
        # VALIDACIÓN: Requiere priority para cerrar
        if new_state == "Cerrado" and not current.get("priority"):
            raise RuntimeError("Asigne una prioridad antes de cerrar el ticket.")
        
        update_fields = {"estado": new_state}
        
        # Fijar first_response_at solo si es null y pasa a "En atención"
        if new_state == "En atención":
            existing = self.sb.table(TABLE_TICKETS).select("first_response_at").eq("ticket_id", ticket_id).single().execute()
            if existing.data and not existing.data.get("first_response_at"):
                update_fields["first_response_at"] = self._now_iso()
        
        if new_state == "Cerrado":
            update_fields["closed_at"] = self._now_iso()

        res = self.sb.table(TABLE_TICKETS).update(update_fields).eq("ticket_id", ticket_id).execute()
        updated = (res.data or [None])[0]
        if not updated:
            raise RuntimeError("Ticket no encontrado o no actualizado.")

        try:
            self._insert_event(ticket_id=ticket_id, actor_id=actor_id, event_type="STATE_CHANGED", payload={"to": new_state})
        except Exception:
            pass

        if new_state == "Cerrado":
            # Intento de notificación (no rompe si falla) y registrar resultado real
            solicitante_email = updated.get("solicitante_email")
            self.logger.info("[TicketsService] Cerrando ticket #%s, solicitante_email=%s",
                             ticket_id, solicitante_email or "VACÍO")
            
            notified = False
            try:
                # Preparar contexto mínimo - TicketsNotifier enriquecerá con app_base_url
                ctx = {"ticket": updated}
                notified = bool(self.notifier.send_ticket_closed(solicitante_email, ctx))
                self.logger.info("[TicketsService] Notificación cierre ticket #%s: notified=%s", ticket_id, notified)
            except Exception as ex:
                self.logger.exception("[TicketsService] Excepción en notificación cierre ticket #%s: %s", ticket_id, ex)
                notified = False
            
            # Registrar evento CLOSED con payload.notified real (siempre, incluso si es False)
            try:
                self._insert_event(ticket_id=ticket_id, actor_id=actor_id,
                                   event_type="CLOSED", payload={"notified": notified})
            except Exception as evt_err:
                # No romper flujo si el evento falla, pero loggear
                self.logger.warning("[TicketsService] Error al insertar evento CLOSED para ticket #%s: %s", ticket_id, evt_err)

        # Calcular prioritario para compatibilidad
        updated["prioritario"] = self._calculate_prioritario(updated.get("priority", "Medium"))
        return updated

    # ---------- Update técnico / notas ----------
    def update_ticket(self, ticket_id: int, patch: TicketUpdate, actor_id: Optional[str]) -> Dict[str, Any]:
        dirty = {k: v for k, v in patch.dict(exclude_none=True).items()}
        
        # Manejar compatibilidad prioritario -> priority
        if "prioritario" in dirty and "priority" not in dirty:
            dirty["priority"] = self._map_priority_from_boolean(dirty["prioritario"])
            del dirty["prioritario"]
        
        if not dirty:
            res = self.sb.table(TABLE_TICKETS).select("*").eq("ticket_id", ticket_id).single().execute()
            result = res.data or {}
            result["prioritario"] = self._calculate_prioritario(result.get("priority", "Medium"))
            return result
            
        res = self.sb.table(TABLE_TICKETS).update(dirty).eq("ticket_id", ticket_id).execute()
        updated = (res.data or [None])[0]
        if not updated:
            raise RuntimeError("Ticket no encontrado o no actualizado.")
        try:
            self._insert_event(ticket_id=ticket_id, actor_id=actor_id, event_type="UPDATED", payload=dirty)
        except Exception:
            pass
        
        # Calcular prioritario para compatibilidad
        updated["prioritario"] = self._calculate_prioritario(updated.get("priority", "Medium"))
        return updated

    # ---------- Clasificar ----------
    def classify(self, ticket_id: int, data: TicketClassify, actor_id: Optional[str]) -> Dict[str, Any]:
        """Clasificar ticket - ahora incluye priority obligatorio"""
        patch: Dict[str, Any] = {}
        event_payload: Dict[str, Any] = {}

        # Resolver solicitante_id si vino en el payload (puede ser email o UUID)
        if data.solicitante_id is not None:
            incoming = str(data.solicitante_id).strip()
            resolved_user_id: Optional[str] = None

            if self._is_uuid(incoming):
                resolved_user_id = incoming
            elif "@" in incoming:
                resolved_user_id = self._get_user_id_by_email(incoming)

            if resolved_user_id:
                patch["solicitante_id"] = resolved_user_id
                event_payload["solicitante_id"] = resolved_user_id
            else:
                # No interrumpir: solo loggear y continuar con el resto del patch
                self.logger.warning(f"[TicketsService.classify] No se pudo resolver solicitante_id desde '{incoming}'")

        if data.equipo_id is not None:
            patch["equipo_id"] = data.equipo_id
            event_payload["equipo_id"] = data.equipo_id

        if data.tipo_servicio_id is not None:
            patch["tipo_servicio_id"] = data.tipo_servicio_id
            event_payload["tipo_servicio_id"] = data.tipo_servicio_id

        if data.priority:
            patch["priority"] = data.priority
            event_payload["priority"] = data.priority

        if data.observaciones:
            patch["notas_internas"] = data.observaciones
            event_payload["observaciones"] = True  # evitar volcar texto largo en payload

        if patch:
            patch["requires_classification"] = False

            # Persistir cambios
            self.sb.table(TABLE_TICKETS).update(patch).eq("ticket_id", ticket_id).execute()

            # Evento de auditoría
            self._insert_event(ticket_id=ticket_id, actor_id=actor_id, event_type="CLASSIFIED", payload=event_payload)

        # Devolver el ticket actualizado
        res = self.sb.table(TABLE_TICKETS).select("*").eq("ticket_id", ticket_id).single().execute()
        updated = res.data
        if not updated:
            raise RuntimeError("Ticket no encontrado")
        
        # Calcular prioritario para compatibilidad
        updated["prioritario"] = self._calculate_prioritario(updated.get("priority", "Medium"))
        return updated

    # ---------- Actualizar prioridad ----------
    def update_priority(self, ticket_id: int, priority: str, prioritario: Optional[bool], actor_id: Optional[str]) -> Dict[str, Any]:
        """Actualizar prioridad con compatibilidad temporal"""
        # Si viene prioritario (deprecated), convertir a priority
        if prioritario is not None and not priority:
            priority = self._map_priority_from_boolean(prioritario)
        
        # Obtener estado anterior para payload
        current = self.sb.table(TABLE_TICKETS).select("priority").eq("ticket_id", ticket_id).single().execute().data
        old_priority = current.get("priority") if current else None
        
        res = self.sb.table(TABLE_TICKETS).update({"priority": priority}).eq("ticket_id", ticket_id).execute()
        updated = (res.data or [None])[0]
        if not updated:
            raise RuntimeError("Ticket no encontrado")
        
        # Registrar evento con from/to
        try:
            self._insert_event(
                ticket_id=ticket_id,
                actor_id=actor_id,
                event_type="PRIORITY_CHANGED",
                payload={"from": old_priority, "to": priority}
            )
        except Exception:
            pass
        
        # Calcular prioritario para compatibilidad
        updated["prioritario"] = self._calculate_prioritario(priority)
        return updated

    # ---------- Obtener eventos ----------
    def get_ticket_events(self, ticket_id: int) -> list:
        """NUEVO - Obtener eventos de un ticket ordenados cronológicamente"""
        res = self.sb.table(TABLE_EVENTS)\
            .select("*")\
            .eq("ticket_id", ticket_id)\
            .order("created_at", desc=False)\
            .execute()
        return res.data or []
