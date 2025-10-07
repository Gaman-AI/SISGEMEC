from .core.email_config import EmailSettings
from .services.notifications import NotificationService
from .repositories.notifications_repo import NotificationLogsRepo
from .repositories.users_repo import UsersRepo
from .deps.supabase_client import supa_service

# Servicio de notificaciones (logs reales)
def get_notification_service():
    settings = EmailSettings()
    supa = supa_service()  # SupabaseClient con service role
    logs_repo = NotificationLogsRepo(supa)
    return NotificationService(settings, logs_repo)

# Resolver de usuarios (para inyectar en hooks si quieres)
def get_users_repo():
    supa = supa_service()
    return UsersRepo(supa)
