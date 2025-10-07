import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("email-hooks")

def trace_event(event: str, **kv):
    safe = {k: (v if k not in {"password", "smtp_pass"} else "***") for k, v in kv.items()}
    logger.info("[EMAIL_HOOK] %s :: %s", event, safe)

def trace_error(event: str, err: Exception, **kv):
    safe = {k: (v if k not in {"password", "smtp_pass"} else "***") for k, v in kv.items()}
    logger.exception("[EMAIL_HOOK][ERROR] %s :: %s :: %s: %s", event, safe, type(err).__name__, err)
