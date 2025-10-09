# -*- coding: utf-8 -*-
from dataclasses import dataclass
import os

def _as_bool(v: str | None, default=False) -> bool:
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")

@dataclass
class EmailSettings:
    host: str
    port: int
    user: str
    password: str
    sender: str
    use_tls: bool
    timeout: int
    debug_noop: bool  # Si True, no envía correos (solo log)
    app_base_url: str

    @staticmethod
    def load_from_env() -> "EmailSettings":
        # NOMBRES ESTÁNDAR que usará el código
        host = os.getenv("SMTP_HOST", "").strip()
        port = int(os.getenv("SMTP_PORT", "587").strip())
        user = os.getenv("SMTP_USER", "").strip()
        # Acepta SMTP_PASS (preferido) o SMTP_PASSWORD como alias
        password = (os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD") or "").strip()
        sender = os.getenv("SMTP_FROM", os.getenv("SMTP_USER", "")).strip()
        use_tls = _as_bool(os.getenv("SMTP_TLS", "1"), True)
        timeout = int(os.getenv("SMTP_TIMEOUT", "30"))
        debug_noop = _as_bool(os.getenv("EMAIL_DEBUG", "0"), False)
        app_base_url = os.getenv("APP_BASE_URL", "http://localhost:5173")

        missing = []
        if not host: missing.append("SMTP_HOST")
        if not user: missing.append("SMTP_USER")
        if not password and not debug_noop:
            missing.append("SMTP_PASS (o SMTP_PASSWORD)")
        if not sender:
            missing.append("SMTP_FROM (o SMTP_USER)")

        if missing and not debug_noop:
            # Al fallar, será súper evidente en logs
            raise RuntimeError(f"[EMAIL] Variables SMTP faltantes: {', '.join(missing)}")

        return EmailSettings(
            host=host, port=port, user=user, password=password,
            sender=sender, use_tls=use_tls, timeout=timeout, debug_noop=debug_noop,
            app_base_url=app_base_url
        )
