from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
import logging, datetime as dt
from typing import Optional

from app.core.supabase_client import get_supabase
from app.deps.jwt_auth import require_user_jwt, UserContext
from app.repositories.users_repo import UsersRepo
from app.services.notifications import get_notification_service
from app.core.error_tracking import capture_exception

router = APIRouter(prefix="/servicios", tags=["servicios"])
log = logging.getLogger("servicios")

async def _send_responsable_notification_background(notifier, responsable_email, ctx):
    """Envía email al responsable en background - no bloquea el flujo principal"""
    try:
        await notifier.send_servicio_completado_flexible(responsable_email, ctx)
        log.info("[/servicios] Email enviado exitosamente al responsable: %s", responsable_email)
    except Exception as e:
        err_id = capture_exception(e)
        log.warning("[/servicios] Email falló en background, err_id=%s", err_id)

@router.put("/{servicio_id}/complete")
async def completar_servicio_endpoint(
    servicio_id: int,
    background_tasks: BackgroundTasks,
    user: UserContext = Depends(require_user_jwt),
    users_repo: UsersRepo = Depends(UsersRepo),
    notifier = Depends(get_notification_service),
):
    try:
        sb = get_supabase()

        # 1) Verificar que el servicio existe
        chk = sb.table("servicios").select("servicio_id, descripcion").eq("servicio_id", servicio_id).execute()
        if not chk.data:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
        
        servicio_data = chk.data[0]

        # 2) Actualizar estado del servicio a COMPLETADO
        # Buscar el ID del estado COMPLETADO en estados_servicio
        estado_resp = sb.table("estados_servicio").select("estado_servicio_id").eq("nombre", "COMPLETADO").execute()
        estado_completado_id = estado_resp.data[0].get("estado_servicio_id") if estado_resp.data else None
        
        if estado_completado_id:
            upd = sb.table("servicios").update({
                "estado_servicio_id": estado_completado_id,
                "updated_at": dt.datetime.utcnow().isoformat()
            }).eq("servicio_id", servicio_id).execute()
        else:
            # Fallback: actualizar con un valor por defecto o campo de estado
            upd = sb.table("servicios").update({
                "updated_at": dt.datetime.utcnow().isoformat()
            }).eq("servicio_id", servicio_id).execute()

        # 3) Buscar email del responsable (solicitante de la solicitud ligada)
        responsable_email: Optional[str] = users_repo.get_responsable_email_by_servicio_id(servicio_id)
        log.info("[SERVICIO] completado #%d responsable_email=%s", servicio_id, responsable_email or "NO_ENCONTRADO")

        # 4) Enviar correo en background si hay email
        if responsable_email:
            from app.core.email_config import EmailSettings
            settings = EmailSettings()
            
            body = {
                "text": f"Tu servicio #{servicio_id} ha sido completado.\nVer en SISGEMEC: {settings.app_base_url}/responsable/servicios/{servicio_id}",
                "html": f"""
                <div style='font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden'>
                  <div style='background:#065f46;color:#fff;padding:16px 20px'>
                    <h2 style='margin:0;font-size:18px'>Servicio #{servicio_id} completado</h2>
                    <div style="font-size:12px;opacity:0.8">{dt.datetime.utcnow().isoformat()[:19]}Z</div>
                  </div>
                  <div style='padding:20px'>
                    <p>Hemos terminado el servicio asociado a tu solicitud. Gracias por usar SISGEMEC.</p>
                    <a href="{settings.app_base_url}/responsable/servicios/{servicio_id}" style="display:inline-block;margin-top:12px;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Ver en SISGEMEC</a>
                  </div>
                </div>
                """
            }
            background_tasks.add_task(
                notifier.send,
                "SERVICIO_COMPLETADO",
                responsable_email,
                f"SISGEMEC: Servicio #{servicio_id} completado",
                body,
                solicitud_id=None,
                servicio_id=servicio_id
            )
            log.info("[/servicios] Email programado en background para responsable: %s", responsable_email)
        else:
            log.warning("[/servicios] No se encontró email del responsable para servicio %d", servicio_id)

        return {"ok": True, "servicio_id": servicio_id, "status": "COMPLETADO"}

    except HTTPException:
        raise
    except Exception as e:
        err_id = capture_exception(e)
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error_id": err_id})