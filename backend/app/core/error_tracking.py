import uuid, traceback, logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("app")

_ERRORS_DIR = Path(__file__).resolve().parent.parent.parent / ".errors"
_ERRORS_DIR.mkdir(parents=True, exist_ok=True)

def capture_exception(e: Exception) -> str:
    err_id = str(uuid.uuid4())[:8]
    tb = traceback.format_exc()
    try:
        (_ERRORS_DIR / f"{err_id}.log").write_text(tb, encoding="utf-8")
    except Exception as io_err:
        logger.error("[ERR][%s] fallo al escribir archivo de error: %s", err_id, io_err)
    logger.error("[ERR][%s] %s\n%s", err_id, repr(e), tb)
    return err_id

def get_trace(err_id: str) -> Optional[str]:
    p = _ERRORS_DIR / f"{err_id}.log"
    if p.exists():
        try:
            return p.read_text(encoding="utf-8")
        except Exception as io_err:
            return f"(No se pudo leer el archivo de traza: {io_err})"
    return None