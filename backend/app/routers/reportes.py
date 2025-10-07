from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import io
import logging

from app.deps.jwt_auth import require_admin_user
from app.schemas.reportes import EquiposFilters, ServiciosFilters, Page
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


@router.get("/{slug}/export")
async def export_report(
    slug: str,
    format: str = Query(..., regex="^(excel|pdf)$"),
    tipo_equipo: Optional[str] = Query(None),
    marca: Optional[str] = Query(None),
    estado_equipo: Optional[str] = Query(None),
    responsable_id: Optional[str] = Query(None),
    num_serie: Optional[str] = Query(None),
    ubicacion_actual: Optional[str] = Query(None),
    tipo_servicio: Optional[str] = Query(None),
    estado_servicio: Optional[str] = Query(None),
    equipo_id: Optional[int] = Query(None),
    from_dt: Optional[str] = Query(None),
    to_dt: Optional[str] = Query(None)
):
    """
    Exporta reporte a Excel o PDF
    slug: "equipos" o "servicios"
    format: "excel" o "pdf"
    """
    if slug not in ["equipos", "servicios"]:
        raise HTTPException(status_code=400, detail="Slug debe ser 'equipos' o 'servicios'")
    
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
                num_serie=num_serie,
                ubicacion_actual=ubicacion_actual,
                from_dt=from_date,
                to_dt=to_date,
                page=1,
                size=10000  # Límite alto para export
            )
            result = await repo.query_equipos(filters)
            title = "Reporte de Equipos"
        else:  # servicios
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
        
        items = result.get("items", [])
        
        # Generar archivo según formato
        if format == "excel":
            file_content = export_rows_to_excel(items, title)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            file_extension = "xlsx"
        else:  # pdf
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
