import os
from pydantic import BaseModel

class EmailSettings(BaseModel):
    host: str = os.getenv("SMTP_HOST", "")
    port: int = int(os.getenv("SMTP_PORT", "587"))
    user: str = os.getenv("SMTP_USER", "")
    password: str = os.getenv("SMTP_PASS", "")
    from_email: str = os.getenv("SMTP_FROM", "SISGEMEC <no-reply@sisgemec.local>")
    use_tls: bool = os.getenv("SMTP_TLS", "true").lower() == "true"  # STARTTLS si 587
    timeout: int = int(os.getenv("SMTP_TIMEOUT", "30"))
    app_base_url: str = os.getenv("APP_BASE_URL", "http://localhost:5173")
    email_debug: bool = os.getenv("EMAIL_DEBUG", "0") == "1"
