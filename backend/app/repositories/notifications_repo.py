from typing import Optional, Any, Dict
import logging
from app.core.supabase_client import get_supabase

logger = logging.getLogger("notifications")

class NotificationLogsRepo:
    """
    Implementación para supabase-py v2 (sync).
    """
    def __init__(self):
        self.client = get_supabase()

    def insert_event(
        self,
        *,
        event_type: str,
        solicitud_id: Optional[int],
        servicio_id: Optional[int],
        to_email: str,
        subject: str,
        status: str,
        error_message: Optional[str],
    ) -> Optional[int]:
        row: Dict[str, Any] = {
            "event_type": event_type,
            "solicitud_id": solicitud_id,
            "servicio_id": servicio_id,
            "to_email": to_email,
            "subject": subject,
            "status": status,
            "error_message": error_message,
        }
        try:
            # v2: insert -> execute(); si quieres el id, usa select("*") tras insert o haz otra consulta
            res = self.client.table("notification_logs").insert(row).execute()
            # res.data devuelve una lista con los registros insertados si la política lo permite
            if res.data and isinstance(res.data, list) and len(res.data) > 0:
                inserted = res.data[0]
                return inserted.get("id")
            # Si tu política no devuelve data en el insert, haz un select adicional:
            # return None en ese caso (el envío de email NO depende de tener el id)
            logger.warning("[EMAIL][LOG] insert_event sin data devuelta; id desconocido.")
            return None
        except Exception as e:
            logger.error("Error insertando notification log: %s", e)
            # No re-lanzar la excepción para no romper el flujo de email
            return None

    def update_status(self, log_id: Optional[int], *, status: str, error_message: Optional[str]):
        if not log_id:
            # No conocemos el id (p.ej. insert no devolvió registros); no hacer nada
            logger.warning("[EMAIL][LOG] update_status omitido: log_id=None")
            return
        try:
            self.client.table("notification_logs") \
                .update({"status": status, "error_message": error_message}) \
                .eq("id", log_id) \
                .execute()
        except Exception as e:
            logger.error("Error actualizando notification log: %s", e)
            # No re-lanzar la excepción para no romper el flujo de email