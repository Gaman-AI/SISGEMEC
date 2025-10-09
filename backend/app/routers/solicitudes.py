# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, Request, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Any, Dict
import logging, datetime as dt

from app.core.supabase_client import get_supabase
from app.deps.jwt_auth import require_user_jwt, UserContext
from app.repositories.users_repo import UsersRepo, get_profile_by_user_id, get_active_admin_emails
from app.services.notifications import get_notification_service, NotificationService
from app.core.error_tracking import capture_exception

router = APIRouter(prefix="/solicitudes", tags=["solicitudes"])
log = logging.getLogger("solicitudes")

def _to_int(val):
    try:
        return int(val)
    except Exception:
        return None

def _now_iso():
    return dt.datetime.utcnow().isoformat(timespec="seconds") + "Z"

async def _send_admin_notifications_background(notifier, admin_emails, ctx_email):
    """Envía emails a admins en background - no bloquea el flujo principal"""
    try:
        await notifier.send_nueva_solicitud_flexible(admin_emails, ctx_email)
        log.info("[/solicitudes] Emails enviados exitosamente a %d admins", len(admin_emails))
    except Exception as e:
        err_id = capture_exception(e)
        log.warning("[/solicitudes] Email falló en background, err_id=%s", err_id)

@router.post("", status_code=201)
async def crear_solicitud_endpoint(
    request: Request,
    background_tasks: BackgroundTasks,
    user: UserContext = Depends(require_user_jwt),
    users_repo: UsersRepo = Depends(UsersRepo),
    notifier = Depends(get_notification_service),
):
    # Este try/except cubre todo el flujo del endpoint
    try:
        # 1) Body flexible (JSON o FormData)
        body: Dict[str, Any] = {}
        ctype = (request.headers.get("content-type") or "").lower()
        if "application/json" in ctype:
            body = await request.json()
        elif "multipart/form-data" in ctype or "application/x-www-form-urlencoded" in ctype:
            form = await request.form()
            body = dict(form)

        # 2) Normalizar campos (acepta alias)
        equipo_id = _to_int(body.get("equipo_id") or body.get("equipoId") or body.get("id_equipo"))
        descripcion = (body.get("descripcion") or body.get("description") or "").strip()

        if not equipo_id or not descripcion:
            return JSONResponse(status_code=422, content={"detail": "Campos requeridos: equipo_id y descripcion"})

        # USAR SIEMPRE el UID del JWT como solicitante_id (no email)
        solicitante_id = user.get("user_id") or user.get("sub")
        if not solicitante_id:
            raise HTTPException(status_code=401, detail="Token sin 'sub' válido para solicitante_id")
        
        log.info("[SOLICITUD] solicitante_id=%s (desde JWT sub)", solicitante_id)

        # 3) Insert en la tabla real - SIN .select() encadenado
        sb = get_supabase()
        
        # estado inicial por defecto (NO usamos ID mágico fijo; si existe 1, bien, si no, toma el primero)
        estado_resp = sb.table("estados_solicitud").select("estado_solicitud_id,nombre").order("estado_solicitud_id").limit(1).execute()
        if not estado_resp.data:
            raise HTTPException(status_code=500, detail="No hay estados para solicitudes configurados")
        estado_id = estado_resp.data[0]["estado_solicitud_id"]
        
        record = {
            "equipo_id": equipo_id,
            "solicitante_id": solicitante_id,
            "descripcion": descripcion,
            "estado_solicitud_id": estado_id,
        }
        r = sb.table("solicitudes_servicio").insert(record).execute()
        data = r.data or []
        if not data:
            raise HTTPException(status_code=500, detail="Insert no devolvió filas")
        solicitud_id = data[0].get("solicitud_id")

        # Releer fila desde BD para construir el autor/ctx de forma CONFIABLE
        sb = get_supabase()
        row = sb.table("solicitudes_servicio") \
            .select("solicitante_id, equipo_id, descripcion, created_at") \
            .eq("solicitud_id", solicitud_id).limit(1).execute()
        srow = (row.data or [{}])[0]
        autor_uid = srow.get("solicitante_id") or solicitante_id
        equipo_id_final = srow.get("equipo_id") or equipo_id
        descripcion_final = srow.get("descripcion") or descripcion
        fecha_iso = (srow.get("created_at") or dt.datetime.utcnow().isoformat())[:19] + "Z"

        autor = get_profile_by_user_id(sb, autor_uid) or {}
        autor_nombre = autor.get("full_name") or "(sin nombre)"
        autor_email = autor.get("email") or "(sin email)"
        ctx = {
            "solicitud_id": solicitud_id,
            "equipo_id": equipo_id_final,
            "descripcion": descripcion_final,
            "autor_nombre": autor_nombre,
            "autor_email": autor_email,
            "fecha_iso": fecha_iso,
            "cta_url": f"http://localhost:5173/admin/solicitudes/{solicitud_id}"
        }
        log.info(f"[SOLICITUD] creada #{solicitud_id} uid={autor_uid} autor={autor_email}")

        # notificaciones a admins activos (no bloqueante)
        admin_emails = get_active_admin_emails()
        if not admin_emails:
            log.warning("[SOLICITUD_NUEVA] No hay admins activos con email; se omite notificación")
            return {"ok": True, "solicitud_id": solicitud_id, "warnings": ["No admins activos"]}

        notif = NotificationService()
        context = {
            "solicitud_id": solicitud_id,
            "equipo_id": equipo_id_final,
            "descripcion": descripcion_final,
            "solicitante": autor_nombre,
        }
        subject = f"[SISGEMEC] Nueva solicitud #{solicitud_id}"
        # background task para no bloquear
        background_tasks.add_task(
            notif.send,
            event="SOLICITUD_NUEVA",
            to_emails=admin_emails,
            subject=subject,
            template_name="solicitud_nueva",
            context=context,
            solicitud_id=solicitud_id
        )

        return {"ok": True, "solicitud_id": solicitud_id}

    except HTTPException:
        raise
    except Exception as e:
        err_id = capture_exception(e)
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error_id": err_id})

@router.post("/{solicitud_id}/convertir-servicio", status_code=201)
async def convertir_solicitud_a_servicio(
    solicitud_id: int,
    request: Request,
    user: UserContext = Depends(require_user_jwt),
):
    """
    ADMIN: convierte una solicitud en servicio
    payload: { tipo_servicio_id: int, descripcion?: str, observaciones?: str }
    """
    try:
        # 1) Body flexible (JSON o FormData)
        body: Dict[str, Any] = {}
        ctype = (request.headers.get("content-type") or "").lower()
        if "application/json" in ctype:
            body = await request.json()
        elif "multipart/form-data" in ctype or "application/x-www-form-urlencoded" in ctype:
            form = await request.form()
            body = dict(form)

        tipo_servicio_id = _to_int(body.get("tipo_servicio_id") or body.get("tipoServicioId"))
        if not tipo_servicio_id:
            return JSONResponse(status_code=422, content={"detail": "Campo requerido: tipo_servicio_id"})

        sb = get_supabase()
        
        # 1) verificar solicitud
        sol = sb.table("solicitudes_servicio").select("*").eq("solicitud_id", solicitud_id).single().execute().data
        if not sol:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        # 2) crear servicio
        serv_row = {
            "equipo_id": sol["equipo_id"],
            "tipo_servicio_id": tipo_servicio_id,
            "descripcion": body.get("descripcion"),
            "observaciones": body.get("observaciones"),
        }
        ins = sb.table("servicios").insert(serv_row).execute()
        if not ins.data:
            raise HTTPException(status_code=500, detail="No se pudo crear el servicio")
        servicio = ins.data[0]

        # 3) vincular servicio a la solicitud
        sb.table("solicitudes_servicio").update({"servicio_id": servicio["servicio_id"]}).eq("solicitud_id", solicitud_id).execute()

        return {"ok": True, "solicitud_id": solicitud_id, "servicio_id": servicio["servicio_id"]}

    except HTTPException:
        raise
    except Exception as e:
        err_id = capture_exception(e)
        return JSONResponse(status_code=500, content={"detail": "Internal Server Error", "error_id": err_id})