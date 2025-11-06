from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime, date
import io
import logging
import os

from app.deps.jwt_auth import require_admin_user
from app.schemas.reportes import EquiposFilters, ServiciosFilters, TicketsFilters, Page
from app.repositories.reportes_repository import ReportesRepository
from app.utils.export_excel import export_rows_to_excel
from app.utils.export_pdf import export_rows_to_pdf

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reportes", tags=["Reportes"], dependencies=[Depends(require_admin_user)])


@router.get("/equipos", response_model=Page)
async def get_report_equipos(
    tipo_equipo: Optional[str] = Query(None),
    marca: Optional[str] = Query(None),
    estado_equipo: Optional[str] = Query(None),
    responsable_id: Optional[str] = Query(None),
    responsable: Optional[str] = Query(None),  # Búsqueda por nombre o email
    num_serie: Optional[str] = Query(None),
    ubicacion_actual: Optional[str] = Query(None),
    from_dt: Optional[str] = Query(None),
    to_dt: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200)
):
    """
    Obtiene reporte de equipos con filtros y paginación
    """
    try:
        # Convertir fechas si se proporcionan
        from_date = None
        to_date = None
        if from_dt:
            from_date = datetime.fromisoformat(from_dt).date()
        if to_dt:
            to_date = datetime.fromisoformat(to_dt).date()
        
        filters = EquiposFilters(
            tipo_equipo=tipo_equipo,
            marca=marca,
            estado_equipo=estado_equipo,
            responsable_id=responsable_id,
            responsable=responsable,
            num_serie=num_serie,
            ubicacion_actual=ubicacion_actual,
            from_dt=from_date,
            to_dt=to_date,
            page=page,
            size=size
        )
        
        repo = ReportesRepository()
        result = await repo.query_equipos(filters)
        
        return Page(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar reporte de equipos: {str(e)}")


@router.get("/servicios", response_model=Page)
async def get_report_servicios(
    tipo_servicio: Optional[str] = Query(None),
    estado_servicio: Optional[str] = Query(None),
    equipo_id: Optional[int] = Query(None),
    num_serie: Optional[str] = Query(None),
    from_dt: Optional[str] = Query(None),
    to_dt: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200)
):
    """
    Obtiene reporte de servicios con filtros y paginación
    """
    try:
        # Convertir fechas si se proporcionan
        from_date = None
        to_date = None
        if from_dt:
            from_date = datetime.fromisoformat(from_dt).date()
        if to_dt:
            to_date = datetime.fromisoformat(to_dt).date()
        
        filters = ServiciosFilters(
            tipo_servicio=tipo_servicio,
            estado_servicio=estado_servicio,
            equipo_id=equipo_id,
            num_serie=num_serie,
            from_dt=from_date,
            to_dt=to_date,
            page=page,
            size=size
        )
        
        repo = ReportesRepository()
        result = await repo.query_servicios(filters)
        
        return Page(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar reporte de servicios: {str(e)}")


@router.get("/servicios/catalogs")
async def get_servicios_catalogs():
    """
    Obtiene catálogos para filtros de servicios
    Retorna tipos de servicio, estados, números de serie y rangos de fechas
    """
    try:
        repo = ReportesRepository()
        catalogs = await repo.get_servicios_catalogs()
        return catalogs
    except Exception as e:
        logger.exception("Error al obtener catálogos de servicios")
        raise HTTPException(status_code=500, detail=f"Error al obtener catálogos: {str(e)}")


@router.get("/equipos/catalogs")
async def get_equipos_catalogs():
    """
    Obtiene catálogos para filtros de equipos
    Retorna estados de equipo y rangos de fechas
    """
    try:
        repo = ReportesRepository()
        catalogs = await repo.get_equipos_catalogs()
        return catalogs
    except Exception as e:
        logger.exception("Error al obtener catálogos de equipos")
        raise HTTPException(status_code=500, detail=f"Error al obtener catálogos: {str(e)}")


@router.get("/tickets", response_model=Page)
async def get_report_tickets(
    estado: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    tipo_servicio_id: Optional[int] = Query(None),
    equipo_id: Optional[int] = Query(None),
    fuente: Optional[str] = Query(None),
    from_dt: Optional[str] = Query(None),
    to_dt: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=1000)
):
    """
    Obtiene reporte de tickets con filtros y paginación
    """
    try:
        # Convertir fechas si se proporcionan
        from_date = None
        to_date = None
        if from_dt:
            from_date = datetime.fromisoformat(from_dt).date()
        if to_dt:
            to_date = datetime.fromisoformat(to_dt).date()
        
        filters = TicketsFilters(
            estado=estado,
            priority=priority,
            tipo_servicio_id=tipo_servicio_id,
            equipo_id=equipo_id,
            fuente=fuente,
            from_dt=from_date,
            to_dt=to_date,
            page=page,
            size=size
        )
        
        repo = ReportesRepository()
        result = await repo.query_tickets(filters)
        
        return Page(**result)
        
    except Exception as e:
        logger.exception("Error al generar reporte de tickets")
        raise HTTPException(status_code=500, detail=f"Error al generar reporte de tickets: {str(e)}")


@router.get("/tickets/catalogs")
async def get_tickets_catalogs():
    """
    Obtiene catálogos para filtros de tickets
    Retorna estados, prioridades, fuentes, tipos de servicio, equipos y rangos de fechas
    """
    try:
        repo = ReportesRepository()
        catalogs = await repo.get_tickets_catalogs()
        return catalogs
    except Exception as e:
        logger.exception("Error al obtener catálogos de tickets")
        raise HTTPException(status_code=500, detail=f"Error al obtener catálogos: {str(e)}")


@router.get("/{slug}/export")
async def export_report(
    slug: str,
    format: str = Query(..., regex="^(excel|pdf)$"),
    tipo_equipo: Optional[str] = Query(None),
    marca: Optional[str] = Query(None),
    estado_equipo: Optional[str] = Query(None),
    responsable_id: Optional[str] = Query(None),
    responsable: Optional[str] = Query(None),  # Búsqueda por nombre o email
    num_serie: Optional[str] = Query(None),
    ubicacion_actual: Optional[str] = Query(None),
    tipo_servicio: Optional[str] = Query(None),
    estado_servicio: Optional[str] = Query(None),
    equipo_id: Optional[int] = Query(None),
    from_dt: Optional[str] = Query(None),
    to_dt: Optional[str] = Query(None),
    # Filtros de tickets
    estado: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    tipo_servicio_id: Optional[int] = Query(None),
    fuente: Optional[str] = Query(None)
):
    """
    Exporta reporte a Excel o PDF
    slug: "equipos", "servicios" o "tickets"
    format: "excel" o "pdf"
    """
    if slug not in ["equipos", "servicios", "tickets"]:
        raise HTTPException(status_code=400, detail="Slug debe ser 'equipos', 'servicios' o 'tickets'")
    
    # Log de inicio
    filters_dict = {
        "tipo_equipo": tipo_equipo,
        "marca": marca,
        "estado_equipo": estado_equipo,
        "responsable_id": responsable_id,
        "num_serie": num_serie,
        "ubicacion_actual": ubicacion_actual,
        "tipo_servicio": tipo_servicio,
        "estado_servicio": estado_servicio,
        "equipo_id": equipo_id,
        "from_dt": from_dt,
        "to_dt": to_dt
    }
    # Limpiar valores None
    clean_filters = {k: v for k, v in filters_dict.items() if v is not None}
    logger.info(f"[reportes] export slug={slug} format={format} filtros={clean_filters}")
    
    try:
        repo = ReportesRepository()
        
        # Convertir fechas si se proporcionan
        from_date = None
        to_date = None
        if from_dt:
            from_date = datetime.fromisoformat(from_dt).date()
        if to_dt:
            to_date = datetime.fromisoformat(to_dt).date()
        
        if slug == "equipos":
            # Obtener todos los equipos (sin paginación para export)
            filters = EquiposFilters(
                tipo_equipo=tipo_equipo,
                marca=marca,
                estado_equipo=estado_equipo,
                responsable_id=responsable_id,
                responsable=responsable,
                num_serie=num_serie,
                ubicacion_actual=ubicacion_actual,
                from_dt=from_date,
                to_dt=to_date,
                page=1,
                size=10000  # Límite alto para export
            )
            result = await repo.query_equipos(filters)
            title = "Reporte de Equipos"
        elif slug == "servicios":
            filters = ServiciosFilters(
                tipo_servicio=tipo_servicio,
                estado_servicio=estado_servicio,
                equipo_id=equipo_id,
                num_serie=num_serie,
                from_dt=from_date,
                to_dt=to_date,
                page=1,
                size=10000  # Límite alto para export
            )
            result = await repo.query_servicios(filters)
            title = "Reporte de Servicios"
        else:  # tickets
            filters = TicketsFilters(
                estado=estado,
                priority=priority,
                tipo_servicio_id=tipo_servicio_id,
                equipo_id=equipo_id,
                fuente=fuente,
                from_dt=from_date,
                to_dt=to_date,
                page=1,
                size=10000  # Límite alto para export
            )
            result = await repo.query_tickets(filters)
            title = "Reporte de Tickets"
        
        items = result.get("items", [])
        
        # Generar archivo según formato
        if format == "excel":
            file_content = export_rows_to_excel(items, title)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            file_extension = "xlsx"
        else:  # pdf
            from app.utils.pdf_theme import AOSENUMA_THEME
            
            if slug == "tickets":
                theme = AOSENUMA_THEME.copy()
                env_logo = os.getenv("PDF_LOGO_PATH")
                if env_logo and os.path.exists(env_logo):
                    theme["logo_path"] = env_logo
                
                # Helper local para enmascarar email
                def mask_email_local(email: str) -> str:
                    """Enmascara un email dejando 1-2 chars y dominio"""
                    if not email or "@" not in email:
                        return email
                    parts = email.split("@")
                    if len(parts) != 2:
                        return email
                    local, domain = parts
                    if len(local) <= 2:
                        masked_local = local[0] + "*"
                    else:
                        masked_local = local[:2] + "***"
                    return f"{masked_local}@{domain}"
                
                # Preprocesar items: combinar solicitante y abreviar fuente
                for item in items:
                    # Derivar equipo_label si no viene
                    if not item.get("equipo_label") and item.get("equipo_id"):
                        parts = []
                        if item.get("equipo_marca"):
                            parts.append(item["equipo_marca"])
                        if item.get("equipo_modelo"):
                            parts.append(item["equipo_modelo"])
                        if item.get("equipo_num_serie"):
                            parts.append(f"({item['equipo_num_serie']})")
                        if parts:
                            item["equipo_label"] = " ".join(parts)
                    
                    # Combinar solicitante_nombre y solicitante_email en solicitante_compuesto
                    nombre = item.get("solicitante_nombre") or ""
                    email = item.get("solicitante_email") or ""
                    email_masked = mask_email_local(email) if email else ""
                    
                    if nombre and email_masked:
                        item["solicitante_compuesto"] = f"{nombre}<br/>{email_masked}"
                    elif email_masked:
                        item["solicitante_compuesto"] = email_masked
                    elif nombre:
                        item["solicitante_compuesto"] = nombre
                    else:
                        item["solicitante_compuesto"] = "-"
                    
                    # Abreviar fuente
                    fuente = item.get("fuente", "")
                    if fuente == "google_forms":
                        item["fuente"] = "gforms"
                    elif fuente == "manual":
                        item["fuente"] = "man."
                    elif fuente == "email":
                        item["fuente"] = "mail"
                
                # Presets para Tickets
                columns = [
                    "ticket_id", "estado", "priority", "fuente",
                    "descripcion", "received_at", "first_response_at", "closed_at",
                    "tipo_servicio_nombre", "equipo_label", "solicitante_compuesto",
                    "ttr_hours", "sla_cumplido"
                ]
                
                header_map = {
                    "ticket_id": "#",
                    "estado": "Esta<br/>do",
                    "priority": "Priori<br/>dad",
                    "fuente": "Fuente",
                    "descripcion": "Descripción",
                    "received_at": "Recibido",
                    "first_response_at": "1ra Resp.",
                    "closed_at": "Cerrado",
                    "tipo_servicio_nombre": "Tipo<br/>Servicio",
                    "equipo_label": "Equipo",
                    "solicitante_compuesto": "Solici<br/>tante",
                    "ttr_hours": "TTR<br/>(h)",
                    "sla_cumplido": "SLA"
                }
                
                align_map = {
                    "ticket_id": "CENTER",
                    "estado": "CENTER",
                    "priority": "CENTER",
                    "fuente": "CENTER",
                    "descripcion": "LEFT",
                    "received_at": "RIGHT",
                    "first_response_at": "RIGHT",
                    "closed_at": "RIGHT",
                    "tipo_servicio_nombre": "LEFT",
                    "equipo_label": "LEFT",
                    "solicitante_compuesto": "LEFT",
                    "ttr_hours": "RIGHT",
                    "sla_cumplido": "CENTER"
                }
                
                col_width_overrides = {
                    "ticket_id": 28,
                    "estado": 66,
                    "priority": 70,
                    "fuente": 62,
                    "descripcion": 270,
                    "received_at": 100,
                    "first_response_at": 100,
                    "closed_at": 100,
                    "tipo_servicio_nombre": 150,
                    "equipo_label": 150,
                    "solicitante_compuesto": 170,
                    "ttr_hours": 58,
                    "sla_cumplido": 42
                }
                
                mask_email_fields = []  # ya enmascaramos al componer
                
                file_content = export_rows_to_pdf(
                    items,
                    title=title,
                    orientation="landscape",
                    theme=theme,
                    summary=result.get("summary"),
                    columns=columns,
                    header_map=header_map,
                    align_map=align_map,
                    col_width_overrides=col_width_overrides,
                    mask_email_fields=mask_email_fields
                )
            elif slug == "equipos":
                # Presets para Equipos con tema AOSENUMA
                theme = AOSENUMA_THEME.copy()
                env_logo = os.getenv("PDF_LOGO_PATH")
                if env_logo and os.path.exists(env_logo):
                    theme["logo_path"] = env_logo
                
                # Columnas típicas de equipos (ajustar según campos disponibles en la vista)
                columns = [
                    "equipo_id", "num_serie", "tipo_equipo", "marca", "modelo",
                    "sistema_operativo", "ram", "disco", "procesador",
                    "ubicacion_actual", "estado_equipo", "responsable",
                    "fecha_ingreso", "fecha_salida"
                ]
                
                header_map = {
                    "equipo_id": "#",
                    "num_serie": "Nº<br/>Serie",
                    "tipo_equipo": "Tipo",
                    "marca": "Marca",
                    "modelo": "Modelo",
                    "sistema_operativo": "S.O.",
                    "ram": "RAM",
                    "disco": "Disco",
                    "procesador": "Procesador",
                    "ubicacion_actual": "Ubicación",
                    "estado_equipo": "Estado",
                    "responsable": "Responsable",
                    "fecha_ingreso": "Ingreso",
                    "fecha_salida": "Salida"
                }
                
                align_map = {
                    "equipo_id": "CENTER",
                    "num_serie": "LEFT",
                    "tipo_equipo": "LEFT",
                    "marca": "LEFT",
                    "modelo": "LEFT",
                    "sistema_operativo": "LEFT",
                    "ram": "LEFT",
                    "disco": "LEFT",
                    "procesador": "LEFT",
                    "ubicacion_actual": "LEFT",
                    "estado_equipo": "CENTER",
                    "responsable": "LEFT",
                    "fecha_ingreso": "RIGHT",
                    "fecha_salida": "RIGHT"
                }
                
                col_width_overrides = {
                    "equipo_id": 40,
                    "num_serie": 100,
                    "tipo_equipo": 80,
                    "marca": 80,
                    "modelo": 100,
                    "sistema_operativo": 90,
                    "ram": 60,
                    "disco": 80,
                    "procesador": 120,
                    "ubicacion_actual": 120,
                    "estado_equipo": 90,
                    "responsable": 150,
                    "fecha_ingreso": 90,
                    "fecha_salida": 90
                }
                
                file_content = export_rows_to_pdf(
                    items,
                    title=title,
                    orientation="landscape",
                    theme=theme,
                    summary=result.get("summary"),
                    columns=columns,
                    header_map=header_map,
                    align_map=align_map,
                    col_width_overrides=col_width_overrides
                )
            else:  # servicios - mantener comportamiento por defecto
                file_content = export_rows_to_pdf(items, title)
            media_type = "application/pdf"
            file_extension = "pdf"
        
        # Generar nombre de archivo
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"reporte_{slug}_{timestamp}.{file_extension}"
        
        # Crear respuesta de streaming
        def iter_content():
            yield file_content
        
        return StreamingResponse(
            iter_content(),
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Cache-Control": "no-store"
            }
        )
        
    except Exception as e:
        logger.exception("Error al exportar")
        raise HTTPException(status_code=500, detail=f"Error al exportar reporte: {str(e)}")
