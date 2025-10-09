# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import logging, datetime as dt
from typing import Optional

from app.core.supabase_client import get_supabase
from app.deps.jwt_auth import require_user_jwt, UserContext
from app.repositories.users_repo import UsersRepo, get_responsable_email_by_servicio_id
from app.services.notifications import get_notification_service, NotificationService
from app.core.error_tracking import capture_exception

router = APIRouter(prefix="/servicios", tags=["servicios"])
log = logging.getLogger("servicios")

class ServicioUpdate(BaseModel):
    equipo_id: Optional[int] = Field(default=None)
    tipo_servicio_id: Optional[int] = Field(default=None)
    estado_servicio_id: Optional[int] = Field(default=None)  # si viene "Completado", no enviar aquí -> usar /complete
    tecnico_id: Optional[str] = Field(default=None)
    fecha_servicio: Optional[str] = Field(default=None)  # 'YYYY-MM-DD'
    descripcion: Optional[str] = Field(default=None)
    observaciones: Optional[str] = Field(default=None)

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

        # 2) obtener id de estado "Completado" por nombre (sin ID mágico)
        est = sb.table("estados_servicio").select("estado_servicio_id").ilike("nombre", "completado").single().execute().data
        if not est:
            raise HTTPException(status_code=500, detail="Estado 'Completado' no configurado en estados_servicio")
        estado_completado_id = est["estado_servicio_id"]

        # 3) actualizar servicio
        sb.table("servicios").update({"estado_servicio_id": estado_completado_id}).eq("servicio_id", servicio_id).execute()

        # 4) obtener correo del responsable solicitante
        to_email = get_responsable_email_by_servicio_id(servicio_id)
        if not to_email:
            # no bloquea, solo avisa
            return {"ok": True, "servicio_id": servicio_id, "warning": "No se encontró email del solicitante"}

        # 5) notificar
        notif = NotificationService()
        subject = f"[SISGEMEC] Servicio #{servicio_id} completado"
        context = {"servicio_id": servicio_id}
        background_tasks.add_task(
            notif.send,
            event="SERVICIO_COMPLETADO",
            to_emails=[to_email],
            subject=subject,
            template_name="servicio_completado",
            context=context,
            servicio_id=servicio_id
        )

        return {"ok": True, "servicio_id": servicio_id, "status": "COMPLETADO"}

    except HTTPException:
        raise
    except Exception as e:
        err_id = capture_exception(e)
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error_id": err_id})

@router.put("/{servicio_id}", status_code=200)
async def actualizar_servicio(
    servicio_id: int, 
    body: ServicioUpdate, 
    background_tasks: BackgroundTasks,
    user: UserContext = Depends(require_user_jwt)
):
    """Actualización general de servicio (sin completar)"""
    try:
        sb = get_supabase()
        
        # validar existencia
        srv = sb.table("servicios").select("servicio_id, estado_servicio_id").eq("servicio_id", servicio_id).single().execute().data
        if not srv:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")

        # si el cliente intenta 'completar' por aquí, lo bloqueamos para evitar doble lógica de notificación
        if body.estado_servicio_id is not None:
            # buscar nombre del estado para prevenir 'Completado' por esta ruta
            est = sb.table("estados_servicio").select("estado_servicio_id, nombre").eq("estado_servicio_id", body.estado_servicio_id).single().execute().data
            if est and str(est.get("nombre","")).strip().lower() == "completado":
                raise HTTPException(status_code=409, detail="Usa /servicios/{id}/complete para marcar como 'Completado'")

        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if not updates:
            return {"ok": True, "servicio_id": servicio_id, "unchanged": True}

        # Buscar nombre del nuevo estado
        estado_nombre = None
        if body.estado_servicio_id:
            estado = (
                sb.table("estados_servicio")
                .select("nombre")
                .eq("estado_servicio_id", body.estado_servicio_id)
                .single()
                .execute()
                .data
            )
            estado_nombre = estado.get("nombre").strip().lower() if estado else None

        # Actualizar servicio normalmente
        sb.table("servicios").update(updates).eq("servicio_id", servicio_id).execute()

        # Si el nuevo estado es "atendido", dispara notificación
        if estado_nombre == "atendido":
            try:
                from app.repositories.users_repo import get_responsable_email_by_servicio_id
                
                to_email = get_responsable_email_by_servicio_id(servicio_id)
                if to_email:
                    notif = NotificationService()
                    subject = f"[SISGEMEC] Servicio #{servicio_id} atendido"
                    context = {"servicio_id": servicio_id}
                    
                    # Enviar notificación en background
                    background_tasks.add_task(
                        notif.send,
                        event="SERVICIO_ATENDIDO",
                        to_emails=[to_email],
                        subject=subject,
                        template_name="servicio_completado",  # reutilizamos la misma plantilla
                        context=context,
                        servicio_id=servicio_id
                    )
                    log.info(f"[SERVICIO_ATENDIDO] Enviando correo a {to_email} para servicio #{servicio_id}")
            except Exception as e:
                log.error(f"[SERVICIO_ATENDIDO] Error al enviar correo: {e}")

        # devolver registro actualizado
        out = sb.table("servicios").select("*").eq("servicio_id", servicio_id).single().execute().data
        return {"ok": True, "servicio_id": servicio_id, "servicio": out}

    except HTTPException:
        raise
    except Exception as e:
        err_id = capture_exception(e)
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error_id": err_id})

@router.patch("/{servicio_id}", status_code=200)
async def actualizar_servicio_patch(
    servicio_id: int, 
    body: ServicioUpdate, 
    background_tasks: BackgroundTasks,
    user: UserContext = Depends(require_user_jwt)
):
    """Alias del PUT para actualización general de servicio"""
    return await actualizar_servicio(servicio_id, body, background_tasks, user)