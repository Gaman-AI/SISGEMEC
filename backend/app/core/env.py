# backend/app/core/env.py
import os
from pathlib import Path

ENV_LOADED_FLAG = "_env_loaded_flag"

def _parse_env_file(path: Path) -> None:
    try:
        if not path.exists():
            return
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip("'").strip('"')
            if k and os.getenv(k) is None:
                os.environ[k] = v
    except Exception:
        # Silencioso: no romper si hay .env mal formateado
        pass

def load_env_if_needed() -> None:
    if os.getenv(ENV_LOADED_FLAG) == "1":
        return
    os.environ[ENV_LOADED_FLAG] = "1"

    here = Path(__file__).resolve()      # .../app/core/env.py
    backend_root = here.parents[2]       # .../backend
    project_root = backend_root.parent   # repo root

    # Orden de lectura (primero más específico):
    # 1) backend/.env.local
    # 2) backend/env.local (sin punto)
    # 3) backend/.env
    # 4) ./.env  (raíz del repo)
    for candidate in [
        backend_root / ".env.local",
        backend_root / "env.local",
        backend_root / ".env",
        project_root / ".env",
    ]:
        _parse_env_file(candidate)
