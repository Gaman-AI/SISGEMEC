# -*- coding: utf-8 -*-
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Iterable, Optional, Literal
import logging
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from app.core.email_config import EmailSettings
from app.repositories.notifications_repo import NotificationLogsRepo

logger = logging.getLogger("notifications")

_templates_path = Path(__file__).resolve().parent.parent / "templates"
env = Environment(
    loader=FileSystemLoader(str(_templates_path)),
    autoescape=select_autoescape(["html", "xml"])
)

EventType = Literal["SOLICITUD_NUEVA", "SERVICIO_COMPLETADO", "SERVICIO_ATENDIDO"]

class NotificationService:
    def __init__(self, settings: Optional[EmailSettings] = None):
        self.s = settings or EmailSettings.load_from_env()
        self.logs = NotificationLogsRepo()

    def _render(self, html_name: str, txt_name: str, ctx: dict):
        html = env.get_template(f"email/{html_name}").render(**ctx)
        txt  = env.get_template(f"email/{txt_name}").render(**ctx)
        return html, txt


    def _build_message(self, subject: str, html_body: str, text_body: str, to_email: str):
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.s.sender
        msg["To"] = to_email

        part1 = MIMEText(text_body, "plain", "utf-8")
        part2 = MIMEText(html_body, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)
        return msg

    def _send_smtp(self, msg: MIMEMultipart, to_email: str):
        if self.s.debug_noop:
            logger.warning("[EMAIL][NOOP] DEBUG activo — no se envía correo a: %s", to_email)
            return "SENT(NOOP)"

        try:
            if self.s.use_tls:
                server = smtplib.SMTP(self.s.host, self.s.port, timeout=self.s.timeout)
                server.ehlo()
                server.starttls()
                server.login(self.s.user, self.s.password)
            else:
                server = smtplib.SMTP_SSL(self.s.host, self.s.port, timeout=self.s.timeout)
                server.login(self.s.user, self.s.password)

            server.sendmail(self.s.sender, [to_email], msg.as_string())
            server.quit()
            return "SENT"
        except Exception as e:
            logger.error("[EMAIL] SMTP Error -> host=%s port=%s user=%s err=%s",
                         self.s.host, self.s.port, self.s.user, repr(e))
            raise

    def send(self, *, event: EventType, to_emails: Iterable[str],
             subject: str, template_name: str, context: dict,
             solicitud_id: Optional[int] = None, servicio_id: Optional[int] = None):
        successes = 0
        failures = 0
        for to in filter(None, map(str.strip, to_emails)):
            try:
                html_body = self._render(template_name + ".html.j2", template_name + ".txt.j2", context)[0]
                text_body = self._render(template_name + ".html.j2", template_name + ".txt.j2", context)[1]
                msg = self._build_message(subject, html_body, text_body, to)
                status = self._send_smtp(msg, to)
                
                # Registrar en logs
                log_id = self.logs.insert_event(
                    event_type=event,
                    solicitud_id=solicitud_id,
                    servicio_id=servicio_id,
                    to_email=to,
                    subject=subject,
                    status="SENT" if status.startswith("SENT") else status,
                    error_message=None
                )
                successes += 1
            except Exception as e:
                # Registrar fallo en logs
                self.logs.insert_event(
                    event_type=event,
                    solicitud_id=solicitud_id,
                    servicio_id=servicio_id,
                    to_email=to,
                    subject=subject,
                    status="FAILED",
                    error_message=str(e)[:1000]
                )
                failures += 1
        logger.info("[EMAIL] %s -> ok=%s fail=%s", event, successes, failures)
        return {"ok": successes, "fail": failures}

    # ========= Eventos =========
    # (1) Creación de solicitud/servicio por RESPONSABLE → correos a ADMINS activos
    def send_nueva_solicitud(self, *, solicitud: dict, admin_email: str):
        """
        solicitud: { id, titulo, descripcion, fecha_creacion (ISO), responsable_nombre, responsable_email }
        """
        logger.info("[EMAIL] preparando 'SOLICITUD_NUEVA' → %s", admin_email)
        ctx = {"solicitud": solicitud, "app_base_url": self.s.app_base_url, "title": "Nueva Solicitud"}
        html, txt = self._render("solicitud_nueva.html.j2", "solicitud_nueva.txt.j2", ctx)
        subject = f"Nueva Solicitud #{solicitud['id']} de {solicitud['responsable_nombre']}"
        log_id = None
        try:
            log_id = self.logs.insert_event(
                event_type="SOLICITUD_NUEVA",
                solicitud_id=solicitud.get("id"),
                servicio_id=None,
                to_email=admin_email,
                subject=subject,
                status="RETRYING",
                error_message=None
            )
        except Exception as e:
            logger.warning("[EMAIL][LOG] insert_event falló: %s", e)
        try:
            msg = self._build(subject, admin_email, html, txt)
            self._smtp_send(msg)
            if log_id is not None:
                try:
                    self.logs.update_status(log_id, status="SENT", error_message=None)
                except Exception as e:
                    logger.warning("[EMAIL][LOG] update_status(SENT) falló: %s", e)
            logger.info("[EMAIL] ENVIADO 'SOLICITUD_NUEVA' → %s", admin_email)
        except Exception as e:
            err = f"{type(e).__name__}: {e}"
            if log_id is not None:
                try:
                    self.logs.update_status(log_id, status="FAILED", error_message=err)
                except Exception as e2:
                    logger.warning("[EMAIL][LOG] update_status(FAILED) falló: %s", e2)
            logger.exception("[EMAIL] SMTP ERROR 'SOLICITUD_NUEVA': %s", err)

    # (2) Servicio completado por ADMIN → correo al RESPONSABLE autor
    def send_servicio_completado(self, *, solicitud: dict, servicio: dict, responsable_email: str):
        """
        solicitud: { id }
        servicio: { id, tipo, tecnico_nombre, fecha_cierre (ISO) }
        """
        logger.info("[EMAIL] preparando 'SERVICIO_COMPLETADO' → %s", responsable_email)
        ctx = {"solicitud": solicitud, "servicio": servicio, "app_base_url": self.s.app_base_url, "title": "Servicio Completado"}
        html, txt = self._render("servicio_completado.html.j2", "servicio_completado.txt.j2", ctx)
        subject = f"Servicio Completado — Solicitud #{solicitud['id']}"
        log_id = None
        try:
            log_id = self.logs.insert_event(
                event_type="SERVICIO_COMPLETADO",
                solicitud_id=solicitud.get("id"),
                servicio_id=servicio.get("id"),
                to_email=responsable_email,
                subject=subject,
                status="RETRYING",
                error_message=None
            )
        except Exception as e:
            logger.warning("[EMAIL][LOG] insert_event falló: %s", e)
        try:
            msg = self._build(subject, responsable_email, html, txt)
            self._smtp_send(msg)
            if log_id is not None:
                try:
                    self.logs.update_status(log_id, status="SENT", error_message=None)
                except Exception as e:
                    logger.warning("[EMAIL][LOG] update_status(SENT) falló: %s", e)
            logger.info("[EMAIL] ENVIADO 'SERVICIO_COMPLETADO' → %s", responsable_email)
        except Exception as e:
            err = f"{type(e).__name__}: {e}"
            if log_id is not None:
                try:
                    self.logs.update_status(log_id, status="FAILED", error_message=err)
                except Exception as e2:
                    logger.warning("[EMAIL][LOG] update_status(FAILED) falló: %s", e2)
            logger.exception("[EMAIL] SMTP ERROR 'SERVICIO_COMPLETADO': %s", err)

    # ========= Builder de Plantillas =========
    def build_email(self, body):
        """
        body puede ser:
        - {"text": "...", "html": "..."}            -> usar tal cual
        - {"tmpl": "SOLICITUD_NUEVA", "ctx": {...}} -> construir text/html
        """
        if isinstance(body, dict) and "tmpl" in body and body.get("tmpl") == "SOLICITUD_NUEVA":
            c = body.get("ctx") or {}
            text = (
                f"Nueva Solicitud #{c.get('solicitud_id')}\n"
                f"Título: Solicitud de servicio\n"
                f"Descripción:\n{c.get('descripcion')}\n"
                f"Creada por: {c.get('autor_nombre')} ({c.get('autor_email')})\n"
                f"Fecha: {c.get('fecha_iso')}\n"
                f"Ver en SISGEMEC: {c.get('cta_url')}\n"
            )
            descripcion_html = (c.get('descripcion') or '').replace('\n', '<br>')
            html = f"""
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
              <div style="background:#111827;color:#fff;padding:16px 20px">
                <h2 style="margin:0;font-size:18px">Nueva Solicitud #{c.get('solicitud_id')}</h2>
                <div style="font-size:12px;opacity:0.8">{c.get('fecha_iso')}</div>
              </div>
              <div style="padding:20px">
                <p style="margin:0 0 8px"><b>Título:</b> Solicitud de servicio</p>
                <p style="margin:0 0 8px"><b>Descripción:</b><br>{descripcion_html}</p>
                <p style="margin:0 0 8px"><b>Creada por:</b> {c.get('autor_nombre')} &lt;{c.get('autor_email')}&gt;</p>
                <p style="margin:0 0 8px"><b>Equipo:</b> {c.get('equipo_id')}</p>
                <a href="{c.get('cta_url')}" style="display:inline-block;margin-top:12px;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Ver en SISGEMEC</a>
              </div>
            </div>
            """
            return {"text": text, "html": html}
        
        # fallback: si ya viene text/html
        if isinstance(body, dict) and ("text" in body or "html" in body):
            return {"text": body.get("text",""), "html": body.get("html")}
        
        # si body es string -> text plano
        return {"text": str(body or ""), "html": None}

    # ========= Wrappers Flexibles =========
    async def send_nueva_solicitud_flexible(self, admin_emails, ctx: dict):
        if not admin_emails:
            return

        # Log del modo de email
        mode = "NOOP" if self.s.email_debug else "REAL"
        logger.info("[EMAIL] mode=%s to=%d_admins event=SOLICITUD_NUEVA solicitud_id=%s", 
                   mode, len(admin_emails), ctx.get('id'))

        # Prepara campos "seguros"
        _id = ctx.get('id')
        _titulo = ctx.get('titulo') or 'Solicitud'
        _descripcion = ctx.get('descripcion') or ''
        _descripcion_html = _descripcion.replace('\n', '<br/>')
        _resp_nombre = ctx.get('responsable_nombre') or 'N/D'
        _resp_email = ctx.get('responsable_email') or 'N/D'
        _fecha = ctx.get('fecha_creacion') or 'N/D'
        _detalle = ctx.get('detalle_url') or (self.s.app_base_url or '#')

        subject = f"Nueva Solicitud #{_id} - {_titulo}"

        text = (
            f"Nueva Solicitud #{_id}\n"
            f"Titulo: {_titulo}\n"
            f"Descripcion: {_descripcion}\n"
            f"Creada por: {_resp_nombre} ({_resp_email})\n"
            f"Fecha: {_fecha}\n"
            f"Ver: {_detalle}\n"
        )

        html = (
            f"<h2>Nueva Solicitud #{_id}</h2>"
            f"<p><b>Título:</b> {_titulo}</p>"
            f"<p><b>Descripción:</b><br/>{_descripcion_html}</p>"
            f"<p><b>Creada por:</b> {_resp_nombre} ({_resp_email})</p>"
            f"<p><b>Fecha:</b> {_fecha}</p>"
            f'<p><a href="{_detalle}">Ver en SISGEMEC</a></p>'
        )

        # Usar plantilla SOLICITUD_NUEVA
        body = {"tmpl": "SOLICITUD_NUEVA", "ctx": ctx}
        await self._send_multi(admin_emails, subject, body, "SOLICITUD_NUEVA", _id, None)

    async def send_servicio_completado_flexible(self, to_email, ctx: dict):
        if not to_email:
            return

        # Log del modo de email
        mode = "NOOP" if self.s.email_debug else "REAL"
        logger.info("[EMAIL] mode=%s to=%s event=SERVICIO_COMPLETADO servicio_id=%s", 
                   mode, to_email, ctx.get('id'))

        _id = ctx.get('id')
        _titulo = ctx.get('titulo') or ''
        _descripcion = ctx.get('descripcion') or ''
        _descripcion_html = _descripcion.replace('\n', '<br/>')
        _atendido_por = ctx.get('atendido_por') or 'N/D'
        _fecha_cierre = ctx.get('fecha_cierre') or 'N/D'
        _detalle = ctx.get('detalle_url') or (self.s.app_base_url or '#')

        subject = f"Servicio #{_id} COMPLETADO - {_titulo}"

        text = (
            f"Servicio COMPLETADO #{_id}\n"
            f"Titulo: {_titulo}\n"
            f"Descripcion: {_descripcion}\n"
            f"Finalizado por: {_atendido_por}\n"
            f"Fecha cierre: {_fecha_cierre}\n"
            f"Ver: {_detalle}\n"
        )

        html = (
            f"<h2>Servicio COMPLETADO #{_id}</h2>"
            f"<p><b>Título:</b> {_titulo}</p>"
            f"<p><b>Descripción:</b><br/>{_descripcion_html}</p>"
            f"<p><b>Finalizado por:</b> {_atendido_por}</p>"
            f"<p><b>Fecha de cierre:</b> {_fecha_cierre}</p>"
            f'<p><a href="{_detalle}">Ver en SISGEMEC</a></p>'
        )

        # Usar formato legacy para SERVICIO_COMPLETADO
        body = {"text": text, "html": html}
        await self._send_single(to_email, subject, body, "SERVICIO_COMPLETADO", None, _id)

    async def _send_multi(self, emails, subject, body, event_type="SOLICITUD_NUEVA", solicitud_id=None, servicio_id=None):
        for email in emails:
            if email:
                await self._send_single(email, subject, body, event_type, solicitud_id, servicio_id)

    async def _send_single(self, email, subject, body, event_type="SOLICITUD_NUEVA", solicitud_id=None, servicio_id=None):
        # Insertar log inicial
        log_id = None
        try:
            log_id = self.logs.insert_event(
                event_type=event_type,
                solicitud_id=solicitud_id,
                servicio_id=servicio_id,
                to_email=email,
                subject=subject,
                status="RETRYING",
                error_message=None
            )
        except Exception as e:
            logger.warning("[EMAIL][LOG] insert_event falló: %s", e)
        
        try:
            # Construir email usando build_email
            payload = self.build_email(body)
            text = payload["text"]
            html = payload["html"]
            
            msg = self._build(subject, email, html, text)
            self._smtp_send(msg)
            logger.info("[EMAIL] ENVIADO → %s", email)
            
            # Actualizar log a SENT
            if log_id:
                try:
                    self.logs.update_status(log_id, status="SENT", error_message=None)
                except Exception as e:
                    logger.warning("[EMAIL][LOG] update_status(SENT) falló: %s", e)
                    
        except Exception as e:
            logger.error("[EMAIL] ERROR → %s: %s", email, e)
            
            # Actualizar log a FAILED
            if log_id:
                try:
                    self.logs.update_status(log_id, status="FAILED", error_message=str(e)[:1000])
                except Exception as e2:
                    logger.warning("[EMAIL][LOG] update_status(FAILED) falló: %s", e2)

# ========= Provider tolerante para DI =========
import logging
from app.core.email_config import EmailSettings
from app.repositories.notifications_repo import NotificationLogsRepo

_logger = logging.getLogger("notifications")

class _NoOpNotifier:
    def __init__(self, reason: str):
        self.s = type("S", (), {"app_base_url": ""})()  # mínima compatibilidad
        self.logs = NotificationLogsRepo()
        _logger.warning("[EMAIL][NOOP] usando NoOpNotifier por: %s", reason)
    
    async def send_nueva_solicitud_flexible(self, admin_emails, ctx_email):
        """NoOp pero registra en logs para tracking"""
        _logger.info("[EMAIL][NOOP] send_nueva_solicitud_flexible - %d admins", len(admin_emails))
        
        # Registrar en notification_logs para tracking
        for email in admin_emails:
            try:
                log_id = self.logs.insert_event(
                    event_type="SOLICITUD_NUEVA",
                    solicitud_id=ctx_email.get("id"),
                    servicio_id=None,
                    to_email=email,
                    subject=f"SISGEMEC: Nueva solicitud #{ctx_email.get('id')}",
                    status="SENT",
                    error_message="EMAIL_DEBUG=1 (NoOp)"
                )
                if log_id:
                    _logger.info("[EMAIL][NOOP] Registrado en logs: %d", log_id)
            except Exception as e:
                _logger.warning("[EMAIL][NOOP] Error registrando en logs: %s", e)
    
    async def send_servicio_completado_flexible(self, responsable_email, ctx_email):
        """NoOp pero registra en logs para tracking"""
        _logger.info("[EMAIL][NOOP] send_servicio_completado_flexible - %s", responsable_email)
        
        # Registrar en notification_logs para tracking
        try:
            log_id = self.logs.insert_event(
                event_type="SERVICIO_COMPLETADO",
                solicitud_id=None,
                servicio_id=ctx_email.get("id"),
                to_email=responsable_email,
                subject=f"SISGEMEC: Servicio #{ctx_email.get('id')} completado",
                status="SENT",
                error_message="EMAIL_DEBUG=1 (NoOp)"
            )
            if log_id:
                _logger.info("[EMAIL][NOOP] Registrado en logs: %d", log_id)
        except Exception as e:
            _logger.warning("[EMAIL][NOOP] Error registrando en logs: %s", e)

def get_notification_service():
    """
    Provider a prueba de fallos para DI. Nunca lanza excepción.
    Si falla la construcción, retorna un NoOp que no rompe el flujo.
    """
    try:
        # Usar solo settings.EMAIL_DEBUG (no os.getenv directamente)
        from app.core.email_config import EmailSettings
        settings = EmailSettings()
        
        if settings.email_debug:
            _logger.info("[EMAIL] EMAIL_DEBUG=1, usando NoOpNotifier")
            return _NoOpNotifier(reason="EMAIL_DEBUG=1")
        
        # Construir servicio normal
        _logger.info("[EMAIL] EMAIL_DEBUG=0, usando NotificationService real")
        return NotificationService()
    except Exception as e:
        _logger.error("[EMAIL] Error construyendo NotificationService: %s", e, exc_info=True)
        return _NoOpNotifier(reason=str(e))

def build_email(body):
    """
    body puede ser:
     - {"text": "...", "html": "..."}            -> usar tal cual
     - {"tmpl": "SOLICITUD_NUEVA", "ctx": {...}} -> construir text/html desde ctx
    """
    # Caso plantilla SOLICITUD_NUEVA
    if isinstance(body, dict) and body.get("tmpl") == "SOLICITUD_NUEVA":
        c = body.get("ctx") or {}
        text = (
            f"Nueva Solicitud #{c.get('solicitud_id')}\n"
            f"Título: Solicitud de servicio\n"
            f"Descripción:\n{c.get('descripcion')}\n"
            f"Creada por: {c.get('autor_nombre')} ({c.get('autor_email')})\n"
            f"Equipo: {c.get('equipo_id')}\n"
            f"Fecha: {c.get('fecha_iso')}\n"
            f"Ver en SISGEMEC: {c.get('cta_url')}\n"
        )
        descripcion_html = (c.get('descripcion') or '').replace('\n', '<br>')
        html = f"""
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
          <div style="background:#111827;color:#fff;padding:16px 20px">
            <h2 style="margin:0;font-size:18px">Nueva Solicitud #{c.get('solicitud_id')}</h2>
            <div style="font-size:12px;opacity:0.8">{c.get('fecha_iso')}</div>
          </div>
          <div style="padding:20px">
            <p style="margin:0 0 8px"><b>Título:</b> Solicitud de servicio</p>
            <p style="margin:0 0 8px"><b>Descripción:</b><br>{descripcion_html}</p>
            <p style="margin:0 0 8px"><b>Creada por:</b> {c.get('autor_nombre')} &lt;{c.get('autor_email')}&gt;</p>
            <p style="margin:0 0 8px"><b>Equipo:</b> {c.get('equipo_id')}</p>
            <a href="{c.get('cta_url')}" style="display:inline-block;margin-top:12px;padding:10px 14px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px">Ver en SISGEMEC</a>
          </div>
        </div>
        """
        return {"text": text, "html": html}
    # Caso legacy: ya vienen text/html
    if isinstance(body, dict) and ("text" in body or "html" in body):
        return {"text": body.get("text",""), "html": body.get("html")}
    # Caso string plano
    return {"text": str(body or ""), "html": None}
