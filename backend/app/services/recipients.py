import os, logging
logger = logging.getLogger("notifications")

class RecipientResolver:
    def __init__(self, users_repo=None):
        self.users_repo = users_repo

    def admins_activos(self):
        emails = []
        try:
            if self.users_repo and hasattr(self.users_repo, "get_active_admin_emails"):
                emails = self.users_repo.get_active_admin_emails() or []
        except Exception as e:
            logger.warning("[EMAIL][RECIPIENTS] get_active_admin_emails fallo: %s", e)
        if not emails:
            fallback = os.getenv("ADMIN_EMAIL", "")
            if fallback:
                emails = [fallback]
        return [e for e in emails if e]

    def responsable_por_servicio(self, servicio_id: int):
        email = None
        try:
            if self.users_repo and hasattr(self.users_repo, "get_responsable_email_by_servicio_id"):
                email = self.users_repo.get_responsable_email_by_servicio_id(servicio_id)
        except Exception as e:
            logger.warning("[EMAIL][RECIPIENTS] responsable_por_servicio fallo: %s", e)
        if not email:
            email = os.getenv("RESPONSABLE_EMAIL", "")
        return email or ""
