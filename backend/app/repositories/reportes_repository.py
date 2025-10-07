import asyncio
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import date
from fastapi import HTTPException
from app.core.supabase_client import get_supabase
from app.schemas.reportes import EquiposFilters, ServiciosFilters

logger = logging.getLogger(__name__)


async def _with_timeout(coro, sec=10):
    """Wrapper para timeout en operaciones async"""
    try:
        return await asyncio.wait_for(coro, timeout=sec)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Timeout en consulta")


class ReportesRepository:
    """Repository para consultas de reportes usando vistas de Supabase"""
    
    def __init__(self):
        self.supabase = get_supabase()
    
    async def query_equipos(self, filters: EquiposFilters) -> Dict[str, Any]:
        """
        Consulta equipos usando la vista vw_inventario_equipos
        Retorna items paginados y summary de equipos por estado
        """
        t0 = time.perf_counter()
        try:
            # Construir query base
            query = self.supabase.table("vw_inventario_equipos").select("*")
            
            # Aplicar filtros
            if filters.tipo_equipo:
                query = query.ilike("tipo_equipo", f"%{filters.tipo_equipo}%")
            if filters.marca:
                query = query.ilike("marca", f"%{filters.marca}%")
            if filters.estado_equipo:
                query = query.ilike("estado_equipo", f"%{filters.estado_equipo}%")
            if filters.responsable_id:
                query = query.eq("responsable_id", filters.responsable_id)
            if filters.num_serie:
                query = query.ilike("num_serie", f"%{filters.num_serie}%")
            if filters.ubicacion_actual:
                query = query.ilike("ubicacion_actual", f"%{filters.ubicacion_actual}%")
            if filters.from_dt:
                query = query.gte("fecha_ingreso", filters.from_dt.isoformat())
            if filters.to_dt:
                query = query.lte("fecha_ingreso", filters.to_dt.isoformat())
            
            # Contar total con timeout
            count_query = query
            count_result = await _with_timeout(
                asyncio.to_thread(count_query.execute), 10
            )
            total = len(count_result.data) if count_result.data else 0
            
            # Aplicar paginación
            offset = (filters.page - 1) * filters.size
            query = query.range(offset, offset + filters.size - 1)
            
            # Ejecutar query con timeout
            result = await _with_timeout(
                asyncio.to_thread(query.execute), 10
            )
            items = result.data or []
            
            # Calcular summary: equipos por estado
            summary_query = self.supabase.table("vw_inventario_equipos").select("estado_equipo")
            
            # Aplicar mismos filtros para summary (excepto paginación)
            if filters.tipo_equipo:
                summary_query = summary_query.ilike("tipo_equipo", f"%{filters.tipo_equipo}%")
            if filters.marca:
                summary_query = summary_query.ilike("marca", f"%{filters.marca}%")
            if filters.estado_equipo:
                summary_query = summary_query.ilike("estado_equipo", f"%{filters.estado_equipo}%")
            if filters.responsable_id:
                summary_query = summary_query.eq("responsable_id", filters.responsable_id)
            if filters.num_serie:
                summary_query = summary_query.ilike("num_serie", f"%{filters.num_serie}%")
            if filters.ubicacion_actual:
                summary_query = summary_query.ilike("ubicacion_actual", f"%{filters.ubicacion_actual}%")
            if filters.from_dt:
                summary_query = summary_query.gte("fecha_ingreso", filters.from_dt.isoformat())
            if filters.to_dt:
                summary_query = summary_query.lte("fecha_ingreso", filters.to_dt.isoformat())
            
            summary_result = await _with_timeout(
                asyncio.to_thread(summary_query.execute), 10
            )
            summary_data = summary_result.data or []
            
            # Agrupar por estado
            estado_counts = {}
            for item in summary_data:
                estado = item.get("estado_equipo") or "Sin estado"
                estado_counts[estado] = estado_counts.get(estado, 0) + 1
            
            equipos_por_estado = [
                {"estado_equipo": estado, "total": count}
                for estado, count in estado_counts.items()
            ]
            
            return {
                "items": items,
                "total": total,
                "page": filters.page,
                "size": filters.size,
                "summary": {
                    "equipos_por_estado": equipos_por_estado
                }
            }
            
        except Exception as e:
            logger.exception(f"Error en query_equipos: {e}")
            raise HTTPException(status_code=502, detail="Error consultando datos")
        finally:
            dur = (time.perf_counter() - t0) * 1000
            logger.info(f"[reportes] /equipos filtros={filters.dict()} dur_ms={dur:.1f}")
    
    async def query_servicios(self, filters: ServiciosFilters) -> Dict[str, Any]:
        """
        Consulta servicios usando la vista vw_servicios_detalle
        Retorna items paginados y summary de servicios por tipo
        """
        t0 = time.perf_counter()
        try:
            # Construir query base
            query = self.supabase.table("vw_servicios_detalle").select("*")
            
            # Aplicar filtros
            if filters.tipo_servicio:
                query = query.ilike("tipo_servicio", f"%{filters.tipo_servicio}%")
            if filters.estado_servicio:
                query = query.ilike("estado_servicio", f"%{filters.estado_servicio}%")
            if filters.equipo_id:
                query = query.eq("equipo_id", filters.equipo_id)
            if filters.num_serie:
                query = query.ilike("num_serie", f"%{filters.num_serie}%")
            if filters.from_dt:
                query = query.gte("fecha_servicio", filters.from_dt.isoformat())
            if filters.to_dt:
                query = query.lte("fecha_servicio", filters.to_dt.isoformat())
            
            # Contar total con timeout
            count_query = query
            count_result = await _with_timeout(
                asyncio.to_thread(count_query.execute), 10
            )
            total = len(count_result.data) if count_result.data else 0
            
            # Aplicar paginación
            offset = (filters.page - 1) * filters.size
            query = query.range(offset, offset + filters.size - 1)
            
            # Ejecutar query con timeout
            result = await _with_timeout(
                asyncio.to_thread(query.execute), 10
            )
            items = result.data or []
            
            # Calcular summary: servicios por tipo
            summary_query = self.supabase.table("vw_servicios_detalle").select("tipo_servicio")
            
            # Aplicar mismos filtros para summary (excepto paginación)
            if filters.tipo_servicio:
                summary_query = summary_query.ilike("tipo_servicio", f"%{filters.tipo_servicio}%")
            if filters.estado_servicio:
                summary_query = summary_query.ilike("estado_servicio", f"%{filters.estado_servicio}%")
            if filters.equipo_id:
                summary_query = summary_query.eq("equipo_id", filters.equipo_id)
            if filters.num_serie:
                summary_query = summary_query.ilike("num_serie", f"%{filters.num_serie}%")
            if filters.from_dt:
                summary_query = summary_query.gte("fecha_servicio", filters.from_dt.isoformat())
            if filters.to_dt:
                summary_query = summary_query.lte("fecha_servicio", filters.to_dt.isoformat())
            
            summary_result = await _with_timeout(
                asyncio.to_thread(summary_query.execute), 10
            )
            summary_data = summary_result.data or []
            
            # Agrupar por tipo
            tipo_counts = {}
            for item in summary_data:
                tipo = item.get("tipo_servicio") or "Sin tipo"
                tipo_counts[tipo] = tipo_counts.get(tipo, 0) + 1
            
            servicios_por_tipo = [
                {"tipo_servicio": tipo, "total": count}
                for tipo, count in tipo_counts.items()
            ]
            
            return {
                "items": items,
                "total": total,
                "page": filters.page,
                "size": filters.size,
                "summary": {
                    "servicios_por_tipo": servicios_por_tipo
                }
            }
            
        except Exception as e:
            logger.exception(f"Error en query_servicios: {e}")
            raise HTTPException(status_code=502, detail="Error consultando datos")
        finally:
            dur = (time.perf_counter() - t0) * 1000
            logger.info(f"[reportes] /servicios filtros={filters.dict()} dur_ms={dur:.1f}")
    
    async def get_servicios_catalogs(self) -> Dict[str, Any]:
        """
        Obtiene catálogos para filtros de servicios
        Retorna tipos de servicio, estados, números de serie y rangos de fechas
        """
        t0 = time.perf_counter()
        try:
            # Obtener tipos de servicio únicos
            tipos_query = self.supabase.table("vw_servicios_detalle").select("tipo_servicio")
            tipos_result = await _with_timeout(
                asyncio.to_thread(tipos_query.execute), 10
            )
            tipos_data = tipos_result.data or []
            tipos_servicio = sorted(list(set(
                item.get("tipo_servicio") for item in tipos_data 
                if item.get("tipo_servicio")
            )))
            
            # Obtener estados de servicio únicos
            estados_query = self.supabase.table("vw_servicios_detalle").select("estado_servicio")
            estados_result = await _with_timeout(
                asyncio.to_thread(estados_query.execute), 10
            )
            estados_data = estados_result.data or []
            estados_servicio = sorted(list(set(
                item.get("estado_servicio") for item in estados_data 
                if item.get("estado_servicio")
            )))
            
            # Obtener números de serie únicos
            series_query = self.supabase.table("vw_servicios_detalle").select("num_serie")
            series_result = await _with_timeout(
                asyncio.to_thread(series_query.execute), 10
            )
            series_data = series_result.data or []
            num_serie = sorted(list(set(
                item.get("num_serie") for item in series_data 
                if item.get("num_serie")
            )))
            
            # Obtener rango de fechas
            fechas_query = self.supabase.table("vw_servicios_detalle").select("fecha_servicio")
            fechas_result = await _with_timeout(
                asyncio.to_thread(fechas_query.execute), 10
            )
            fechas_data = fechas_result.data or []
            
            fechas = [item.get("fecha_servicio") for item in fechas_data if item.get("fecha_servicio")]
            fecha_min = min(fechas) if fechas else None
            fecha_max = max(fechas) if fechas else None
            
            return {
                "tipo_servicio": tipos_servicio,
                "estado_servicio": estados_servicio,
                "num_serie": num_serie,
                "fecha_min": fecha_min,
                "fecha_max": fecha_max
            }
            
        except Exception as e:
            logger.exception(f"Error en get_servicios_catalogs: {e}")
            raise HTTPException(status_code=502, detail="Error consultando catálogos")
        finally:
            dur = (time.perf_counter() - t0) * 1000
            logger.info(f"[reportes] /servicios/catalogs dur_ms={dur:.1f}")
