import logging
from typing import Dict, Any

try:
    from app.services.notifications import NotificationService
except Exception as e:
    NotificationService = None
    _import_error = e
else:
    _import_error = None

logger = logging.getLogger(__name__)

def _compose_equipo_nombre(row: dict) -> str:
    """Construye un nombre legible de equipo a partir de marca, modelo y num_serie."""
    if not row:
        return ""
    marca = (row.get("marca") or "").strip()
    modelo = (row.get("modelo") or "").strip()
    num_serie = (row.get("num_serie") or "").strip()
    piezas = [p for p in [marca, modelo] if p]
    base = " ".join(piezas).strip()
    if base and num_serie:
        return f"{base} ({num_serie})"
    return base or num_serie or ""

class TicketsNotifier:
    """
    Adaptador para envío de notificaciones de Tickets.
    Reutiliza NotificationService si existe; si no, hace no-op seguro.
    """
    def __init__(self):
        self.ns = None
        try:
            if NotificationService is not None:
                self.ns = NotificationService()
                logger.debug("[TicketsNotifier] NotificationService inicializado correctamente")
            else:
                logger.warning("[TicketsNotifier] NotificationService no disponible (import falló: %s)", _import_error)
        except Exception as e:
            logger.error("[TicketsNotifier] Error inicializando NotificationService: %s", e, exc_info=True)
            self.ns = None

    def send_ticket_closed(self, to_email: str, context: Dict[str, Any]) -> bool:
        """
        Envía correo de notificación al cerrar un ticket.
        Retorna True si el envío fue exitoso, False en caso contrario.
        """
        # Validación: NotificationService disponible
        if self.ns is None:
            logger.warning("[TicketsNotifier] NotificationService no disponible - no se enviará correo")
            return False
        
        # Validación: email no vacío
        if not to_email or not to_email.strip():
            logger.warning("[TicketsNotifier] to_email vacío - no se enviará correo")
            return False

        # Enriquecer contexto con app_base_url si existe
        ctx = dict(context or {})
        try:
            app_base_url = getattr(getattr(self.ns, "s", None), "app_base_url", None)
            if app_base_url:
                ctx["app_base_url"] = app_base_url
        except Exception as e:
            logger.debug("[TicketsNotifier] No se pudo obtener app_base_url: %s", e)

        ticket = (ctx.get("ticket") or {}) if isinstance(ctx, dict) else {}
        ticket_id = ticket.get("ticket_id")
        
        if not ticket_id:
            logger.warning("[TicketsNotifier] ticket_id no encontrado en contexto")
            return False
        
        # --- INICIO ENRIQUECIMIENTO SEGURO ---
        sb = None
        try:
            # Obtén cliente Supabase sin introducir dependencias nuevas
            try:
                from app.deps.supabase_client import supa_service
                sb = supa_service()
            except Exception:
                try:
                    from app.core.supabase_client import get_supabase
                    sb = get_supabase()
                except Exception:
                    sb = None

            if sb:
                # Equipo: si tenemos equipo_id pero no un nombre legible aún
                if ticket.get("equipo_id") and not ticket.get("equipo_nombre"):
                    try:
                        eq = sb.table("equipos").select("marca,modelo,num_serie").eq("equipo_id", ticket["equipo_id"]).single().execute()
                        eqd = eq.data or {}
                        ticket["equipo_marca"] = eqd.get("marca")
                        ticket["equipo_modelo"] = eqd.get("modelo")
                        ticket["equipo_num_serie"] = eqd.get("num_serie")
                        composed = _compose_equipo_nombre(eqd)
                        if composed:
                            ticket["equipo_nombre"] = composed
                    except Exception as e:
                        logger.debug("[TicketsNotifier] Lookup equipo falló: %s", e)

                # Tipo de servicio: si tenemos id pero no nombre
                if ticket.get("tipo_servicio_id") and not ticket.get("tipo_servicio_nombre"):
                    try:
                        ts = sb.table("tipos_servicio").select("nombre").eq("tipo_servicio_id", ticket["tipo_servicio_id"]).single().execute()
                        tsd = ts.data or {}
                        if tsd.get("nombre"):
                            ticket["tipo_servicio_nombre"] = tsd["nombre"]
                    except Exception as e:
                        logger.debug("[TicketsNotifier] Lookup tipo_servicio falló: %s", e)

                logger.info("[EMAIL-CTX] ticket_id=%s equipo=%s tipo_servicio=%s",
                            ticket_id, ticket.get("equipo_nombre") or ticket.get("equipo_id"),
                            ticket.get("tipo_servicio_nombre") or ticket.get("tipo_servicio_id"))
            else:
                logger.debug("[TicketsNotifier] Supabase client no disponible para enriquecimiento")
        except Exception as e:
            logger.debug("[TicketsNotifier] Enriquecimiento ignorado: %s", e)

        # Actualiza el contexto con el ticket enriquecido
        ctx["ticket"] = ticket
        # --- FIN ENRIQUECIMIENTO SEGURO ---
        
        subject = f"[SISGEMEC] Ticket #{ticket_id} cerrado"

        logger.info("[TicketsNotifier] Enviando cierre de ticket #%s to=%s has_base_url=%s",
                    ticket_id, to_email, "yes" if ctx.get("app_base_url") else "no")

        try:
            # Usar el mismo método que Servicios: NotificationService.send()
            result = self.ns.send(
                event="TICKET_CLOSED_USER",
                to_emails=[to_email],
                subject=subject,
                template_name="ticket_closed",
                context=ctx,
                solicitud_id=None,
                servicio_id=None,
            )
            
            # Interpretar resultado: ok > 0 significa éxito
            ok = int(result.get("ok", 0) or 0)
            fail = int(result.get("fail", 0) or 0)
            logger.info("[TicketsNotifier] cierre ticket #%s -> ok=%s fail=%s", ticket_id, ok, fail)
            return ok > 0
            
        except Exception as e:
            logger.exception("[TicketsNotifier] Error enviando cierre de ticket #%s: %s", ticket_id, e)
            
            # Fallback: insertar registro FAILED en notification_logs
            try:
                if hasattr(self.ns, "logs") and self.ns.logs is not None:
                    self.ns.logs.insert_event(
                        event_type="TICKET_CLOSED_USER",
                        solicitud_id=None,
                        servicio_id=None,
                        to_email=to_email,
                        subject=subject,
                        status="FAILED",
                        error_message=str(e)[:1000],
                    )
                    logger.debug("[TicketsNotifier] Registrado FAILED en notification_logs como fallback")
            except Exception as log_err:
                logger.warning("[TicketsNotifier] Error al registrar fallo en logs: %s", log_err)
            
            return False
