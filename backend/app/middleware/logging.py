import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()
        
        try:
            # Procesar request
            response = await call_next(request)
            
            # Calcular duración
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            # Log de request
            logger.info(
                f"[{request.method}] {request.url.path} "
                f"status={response.status_code} "
                f"dur_ms={duration_ms:.1f}"
            )
            
            return response
        except Exception as e:
            # Log de error
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"[{request.method}] {request.url.path} "
                f"ERROR={str(e)} "
                f"dur_ms={duration_ms:.1f}"
            )
            raise
