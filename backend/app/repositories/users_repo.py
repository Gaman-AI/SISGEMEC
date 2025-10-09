# -*- coding: utf-8 -*-
from typing import List, Optional
import logging
from app.core.supabase_client import get_supabase

logger = logging.getLogger("notifications")

def get_active_admin_emails() -> List[str]:
    sb = get_supabase()
    # role='ADMIN' AND active=true AND email NOT NULL
    res = sb.table("profiles") \
        .select("email") \
        .eq("role", "ADMIN") \
        .eq("active", True) \
        .not_.is_("email", "null") \
        .execute()
    rows = res.data or []
    return [r["email"] for r in rows if r.get("email")]

def get_responsable_email_by_servicio_id(servicio_id: int) -> Optional[str]:
    sb = get_supabase()
    # buscar solicitante por join solicitud -> servicio
    sol = sb.table("solicitudes_servicio").select("solicitante_id").eq("servicio_id", servicio_id).single().execute().data
    if not sol or not sol.get("solicitante_id"):
        return None
    uid = sol["solicitante_id"]
    prof = sb.table("profiles").select("email,active").eq("user_id", uid).single().execute().data
    if prof and prof.get("email") and prof.get("active", True):
        return prof["email"]
    return None

class UsersRepo:
    def __init__(self):
        self.client = get_supabase()

    def get_active_admin_emails(self) -> List[str]:
        emails: List[str] = []
        try:
            # Buscar por role = 'ADMIN', active = true, email NOT NULL
            # Nota: solo usar 'role' ya que 'user_role' no existe en la tabla
            res = self.client.table("profiles") \
                .select("email, role, active") \
                .eq("role", "ADMIN") \
                .eq("active", True) \
                .not_.is_("email", "null") \
                .execute()
            
            for r in (res.data or []):
                e = (r or {}).get("email")
                if e and e.strip():  # Verificar que el email no esté vacío
                    emails.append(e.strip())
            
            logger.info("[USERS] get_active_admin_emails found %d admins: %s", len(emails), emails)
        except Exception as e:
            logger.error("[USERS] get_active_admin_emails error: %s", e)
        return emails

    def get_responsable_email_by_servicio_id(self, servicio_id: int) -> Optional[str]:
        try:
            # Buscar en solicitudes_servicio la solicitud que apunta a ese servicio
            rq = self.client.table("solicitudes_servicio") \
                .select("solicitante_id") \
                .eq("servicio_id", servicio_id) \
                .limit(1) \
                .execute()
            
            rows = rq.data or []
            if not rows:
                logger.warning("[USERS] No se encontró solicitud para servicio_id=%d", servicio_id)
                return None
            
            solicitante_id = rows[0].get("solicitante_id")
            if not solicitante_id:
                logger.warning("[USERS] Solicitud sin solicitante_id para servicio_id=%d", servicio_id)
                return None
            
            # Buscar email del solicitante en profiles
            pr = self.client.table("profiles") \
                .select("email") \
                .eq("user_id", solicitante_id) \
                .limit(1) \
                .execute()
            
            prow = (pr.data or [])
            if prow:
                email = prow[0].get("email")
                if email and email.strip():
                    logger.info("[USERS] Email del responsable encontrado: %s", email)
                    return email.strip()
                else:
                    logger.warning("[USERS] Email vacío para user_id=%s", solicitante_id)
            else:
                logger.warning("[USERS] No se encontró profile para user_id=%s", solicitante_id)
                
        except Exception as e:
            logger.error("[USERS] get_responsable_email_by_servicio_id error: %s", e)
        return None

    def get_profile_by_user_id(self, user_id: str) -> Optional[dict]:
        """Obtiene el perfil completo de un usuario por su user_id"""
        try:
            res = self.client.table("profiles") \
                .select("user_id, full_name, email") \
                .eq("user_id", user_id) \
                .limit(1) \
                .execute()
            
            rows = res.data or []
            if rows:
                profile = rows[0]
                logger.info("[USERS] Profile encontrado para user_id=%s: %s", user_id, profile.get("email"))
                return profile
            else:
                logger.warning("[USERS] No se encontró profile para user_id=%s", user_id)
                return None
                
        except Exception as e:
            logger.error("[USERS] get_profile_by_user_id error: %s", e)
            return None

def get_profile_by_user_id(supabase, user_id: str):
    """
    Devuelve { user_id, full_name, email } o None.
    """
    try:
        res = supabase.table("profiles") \
            .select("user_id, full_name, email") \
            .eq("user_id", user_id) \
            .limit(1).execute()
        rows = res.data or []
        return rows[0] if rows else None
    except Exception as e:
        logger.exception(f"[USERS] get_profile_by_user_id error user_id={user_id}: {e}")
        return None