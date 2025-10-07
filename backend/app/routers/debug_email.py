from fastapi import APIRouter, Depends
import os, smtplib, ssl
from app.core.email_config import EmailSettings
from app.dependencies import get_notification_service

router = APIRouter()

@router.get("/email-config")
def email_config():
    s = EmailSettings()
    return {
        "host": s.host,
        "port": s.port,
        "user": s.user,
        "from_email": s.from_email,
        "use_tls": s.use_tls,
        "timeout": s.timeout,
        "app_base_url": s.app_base_url,
        "has_password": bool(s.password),
        "email_debug": s.email_debug,
    }

@router.get("/smtp-login")
def smtp_login():
    s = EmailSettings()
    try:
        if s.use_tls:
            with smtplib.SMTP(s.host, s.port, timeout=s.timeout) as server:
                server.starttls(context=ssl.create_default_context())
                server.login(s.user, s.password)
        else:
            with smtplib.SMTP_SSL(s.host, s.port, context=ssl.create_default_context(), timeout=s.timeout) as server:
                server.login(s.user, s.password)
        return {"ok": True, "mode": "STARTTLS" if s.use_tls else "SSL"}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}

@router.get("/send-smoke")
def send_smoke(notifier = Depends(get_notification_service)):
    admin = os.getenv("ADMIN_EMAIL", "")
    if not admin:
        return {"ok": False, "error": "Define ADMIN_EMAIL en .env para smoke test"}
    solicitud = {
        "id": 9999,
        "titulo": "Smoke Test",
        "descripcion": "Correo de prueba",
        "fecha_creacion": "2025-01-26T00:00:00Z",
        "responsable_nombre": "Smoke Tester",
        "responsable_email": "smoke@example.com"
    }
    notifier.send_nueva_solicitud(solicitud=solicitud, admin_email=admin)
    return {"ok": True, "sent_to": admin}