import asyncio
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import date, datetime, timezone
from fastapi import HTTPException
from app.core.supabase_client import get_supabase
from app.schemas.reportes import EquiposFilters, ServiciosFilters, TicketsFilters

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
                # Usar eq para match exacto (mejor precisión con select)
                query = query.eq("estado_equipo", filters.estado_equipo)
            if filters.responsable_id:
                # Prioridad: si viene responsable_id, usar ese (compatibilidad)
                query = query.eq("responsable_id", filters.responsable_id)
            elif filters.responsable:
                # Si viene responsable (nombre o email), buscar en responsable o responsable_email
                # La vista vw_inventario_equipos tiene: responsable (full_name) y responsable_email
                query = query.or_(f"responsable.ilike.%{filters.responsable}%,responsable_email.ilike.%{filters.responsable}%")
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
                # Usar eq para match exacto (mejor precisión con select)
                summary_query = summary_query.eq("estado_equipo", filters.estado_equipo)
            if filters.responsable_id:
                # Prioridad: si viene responsable_id, usar ese (compatibilidad)
                summary_query = summary_query.eq("responsable_id", filters.responsable_id)
            elif filters.responsable:
                # Si viene responsable (nombre o email), buscar en responsable o responsable_email
                summary_query = summary_query.or_(f"responsable.ilike.%{filters.responsable}%,responsable_email.ilike.%{filters.responsable}%")
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
    
    async def get_equipos_catalogs(self) -> Dict[str, Any]:
        """
        Obtiene catálogos para filtros de equipos
        Retorna estados de equipo y rangos de fechas
        """
        t0 = time.perf_counter()
        try:
            # Obtener estados de equipo desde la tabla estados_equipo
            estados_query = self.supabase.table("estados_equipo").select("nombre").order("nombre")
            estados_result = await _with_timeout(
                asyncio.to_thread(estados_query.execute), 10
            )
            estados_data = estados_result.data or []
            estados_equipo = sorted([e.get("nombre") for e in estados_data if e.get("nombre")])
            
            # Obtener rango de fechas desde la vista
            fechas_query = self.supabase.table("vw_inventario_equipos").select("fecha_ingreso")
            fechas_result = await _with_timeout(
                asyncio.to_thread(fechas_query.execute), 10
            )
            fechas_data = fechas_result.data or []
            fechas = [item.get("fecha_ingreso") for item in fechas_data if item.get("fecha_ingreso")]
            fecha_min = min(fechas) if fechas else None
            fecha_max = max(fechas) if fechas else None
            
            return {
                "estado_equipo": estados_equipo,
                "fecha_min": fecha_min,
                "fecha_max": fecha_max
            }
            
        except Exception as e:
            logger.exception(f"Error en get_equipos_catalogs: {e}")
            raise HTTPException(status_code=502, detail="Error consultando catálogos")
        finally:
            dur = (time.perf_counter() - t0) * 1000
            logger.info(f"[reportes] /equipos/catalogs dur_ms={dur:.1f}")
    
    async def get_tickets_catalogs(self) -> Dict[str, Any]:
        """
        Obtiene catálogos para filtros de tickets
        Retorna estados, prioridades, fuentes, tipos de servicio, equipos y rangos de fechas
        """
        t0 = time.perf_counter()
        try:
            sb = self.supabase
            
            # Estados fijos
            estados = ['Pendiente', 'En atención', 'Cerrado']
            
            # Prioridades fijas
            prioridades = ['Urgent', 'Important', 'Medium', 'Low']
            
            # Fuentes fijas
            fuentes = ['google_forms', 'email', 'manual']
            
            # Tipos de servicio
            ts_result = await _with_timeout(
                asyncio.to_thread(
                    lambda: sb.table("tipos_servicio")
                    .select("tipo_servicio_id,nombre")
                    .order("nombre")
                    .execute()
                ), 10
            )
            tipos_servicio = [
                {"id": r["tipo_servicio_id"], "nombre": r["nombre"]}
                for r in (ts_result.data or [])
            ]
            
            # Equipos (limitar a activos, máximo 500)
            eq_result = await _with_timeout(
                asyncio.to_thread(
                    lambda: sb.table("equipos")
                    .select("equipo_id,num_serie,marca,modelo")
                    .limit(500)
                    .execute()
                ), 10
            )
            equipos = [
                {
                    "id": r["equipo_id"],
                    "label": " ".join(filter(None, [
                        r.get("marca"),
                        r.get("modelo"),
                        f"({r.get('num_serie')})" if r.get("num_serie") else None
                    ]))
                }
                for r in (eq_result.data or [])
            ]
            
            # Fechas mín/max desde tickets
            fecha_result = await _with_timeout(
                asyncio.to_thread(
                    lambda: sb.table("tickets")
                    .select("received_at")
                    .execute()
                ), 10
            )
            fechas_data = fecha_result.data or []
            fechas = [item.get("received_at") for item in fechas_data if item.get("received_at")]
            fecha_min = min(fechas) if fechas else None
            fecha_max = max(fechas) if fechas else None
            
            return {
                "estados": estados,
                "prioridades": prioridades,
                "fuentes": fuentes,
                "tipos_servicio": tipos_servicio,
                "equipos": equipos,
                "fecha_min": fecha_min,
                "fecha_max": fecha_max,
            }
            
        except Exception as e:
            logger.exception(f"Error en get_tickets_catalogs: {e}")
            raise HTTPException(status_code=502, detail="Error consultando catálogos")
        finally:
            dur = (time.perf_counter() - t0) * 1000
            logger.info(f"[reportes] /tickets/catalogs dur_ms={dur:.1f}")
    
    async def query_tickets(self, filters: TicketsFilters) -> Dict[str, Any]:
        """
        Consulta tickets con filtros y métricas calculadas
        Retorna items paginados con TTR, TTA, edad, SLA y summary
        """
        t0 = time.perf_counter()
        try:
            sb = self.supabase
            page = max(1, filters.page or 1)
            size = max(1, min(1000, filters.size or 20))
            
            # Query base
            q = sb.table("tickets").select(
                "ticket_id, estado, priority, fuente, descripcion, received_at, closed_at, "
                "first_response_at, tipo_servicio_id, equipo_id, solicitante_nombre, solicitante_email"
            )
            
            # Aplicar filtros
            if filters.estado:
                q = q.eq("estado", filters.estado)
            if filters.priority:
                q = q.eq("priority", filters.priority)
            if filters.fuente:
                q = q.eq("fuente", filters.fuente)
            if filters.tipo_servicio_id:
                q = q.eq("tipo_servicio_id", filters.tipo_servicio_id)
            if filters.equipo_id:
                q = q.eq("equipo_id", filters.equipo_id)
            if filters.from_dt:
                q = q.gte("received_at", str(filters.from_dt))
            if filters.to_dt:
                # Incluir todo el día
                q = q.lte("received_at", str(filters.to_dt) + " 23:59:59")
            
            # Orden por fecha desc
            q = q.order("received_at", desc=True)
            
            # Paginación
            from_idx = (page - 1) * size
            to_idx = from_idx + size - 1
            
            result = await _with_timeout(
                asyncio.to_thread(lambda: q.range(from_idx, to_idx).execute()), 10
            )
            rows = result.data or []
            
            # Enriquecer con relaciones (tipos_servicio, equipos)
            ts_ids = sorted({r["tipo_servicio_id"] for r in rows if r.get("tipo_servicio_id")})
            ts_map = {}
            if ts_ids:
                ts_result = await _with_timeout(
                    asyncio.to_thread(
                        lambda: sb.table("tipos_servicio")
                        .select("tipo_servicio_id,nombre")
                        .in_("tipo_servicio_id", ts_ids)
                        .execute()
                    ), 10
                )
                ts_map = {t["tipo_servicio_id"]: t["nombre"] for t in (ts_result.data or [])}
            
            eq_ids = sorted({r["equipo_id"] for r in rows if r.get("equipo_id")})
            eq_map = {}
            if eq_ids:
                eq_result = await _with_timeout(
                    asyncio.to_thread(
                        lambda: sb.table("equipos")
                        .select("equipo_id,marca,modelo,num_serie")
                        .in_("equipo_id", eq_ids)
                        .execute()
                    ), 10
                )
                for e in (eq_result.data or []):
                    label = " ".join(filter(None, [
                        e.get("marca"),
                        e.get("modelo"),
                        f"({e.get('num_serie')})" if e.get("num_serie") else None
                    ]))
                    eq_map[e["equipo_id"]] = label
            
            # Calcular métricas (TTR, edad, SLA)
            def to_dt(s):
                if not s:
                    return None
                try:
                    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)
                except:
                    return None
            
            SLA = {
                "Urgent": 4 * 3600,
                "Important": 24 * 3600,
                "Medium": 3 * 24 * 3600,
                "Low": 5 * 24 * 3600,
            }
            
            now = datetime.now(timezone.utc)
            
            items: List[Dict[str, Any]] = []
            for r in rows:
                received = to_dt(r.get("received_at"))
                closed = to_dt(r.get("closed_at"))
                first_response = to_dt(r.get("first_response_at"))
                
                # TTR (Tiempo de Resolución)
                ttr_seconds = None
                if received and closed:
                    ttr_seconds = int((closed - received).total_seconds())
                
                # TTA (Tiempo de Atención) - desde received_at hasta first_response_at
                tta_seconds = None
                if received and first_response:
                    tta_seconds = int((first_response - received).total_seconds())
                
                # Edad actual
                edad_dias = None
                if received:
                    edad_dias = int((now - received).total_seconds() // 86400)
                
                # SLA
                priority = r.get("priority") or "Medium"
                sla_limit = SLA.get(priority, SLA["Medium"])
                sla_cumplido = bool(ttr_seconds is not None and ttr_seconds <= sla_limit)
                
                items.append({
                    **r,
                    "tipo_servicio_nombre": ts_map.get(r.get("tipo_servicio_id")),
                    "equipo_label": eq_map.get(r.get("equipo_id")),
                    "ttr_seconds": ttr_seconds,
                    "ttr_hours": round(ttr_seconds / 3600, 2) if ttr_seconds else None,
                    "tta_seconds": tta_seconds,
                    "tta_hours": round(tta_seconds / 3600, 2) if tta_seconds else None,
                    "edad_dias": edad_dias,
                    "sla_cumplido": sla_cumplido,
                    "sla_limite_hours": round(sla_limit / 3600, 2),
                })
            
            # Conteo total (con los mismos filtros) -------------------------------
            total: int = 0
            try:
                cq = sb.table("tickets").select("ticket_id", count="exact")

                if filters.estado:
                    cq = cq.eq("estado", filters.estado)
                if filters.priority:
                    cq = cq.eq("priority", filters.priority)
                if filters.fuente:
                    cq = cq.eq("fuente", filters.fuente)
                if filters.tipo_servicio_id:
                    cq = cq.eq("tipo_servicio_id", filters.tipo_servicio_id)
                if filters.equipo_id:
                    cq = cq.eq("equipo_id", filters.equipo_id)
                if filters.from_dt:
                    cq = cq.gte("received_at", str(filters.from_dt))
                if filters.to_dt:
                    cq = cq.lte("received_at", str(filters.to_dt) + " 23:59:59")

                cnt_res = await _with_timeout(
                    asyncio.to_thread(lambda: cq.execute()), 10
                )
                # Algunos clientes devuelven count en la respuesta:
                total = int(getattr(cnt_res, "count", None) or 0)
            except Exception:
                total = 0

            if not total:
                # Fallback seguro para cumplir con Page[int]:
                total = len(items)
            
            # Summary por estado y prioridad
            by_estado = {}
            by_priority = {}
            for it in items:
                estado = it.get("estado") or "Sin estado"
                by_estado[estado] = by_estado.get(estado, 0) + 1
                pr = it.get("priority") or "Sin prioridad"
                by_priority[pr] = by_priority.get(pr, 0) + 1
            
            return {
                "items": items,
                "page": page,
                "size": size,
                "total": total,
                "summary": {
                    "by_estado": [{"estado": k, "total": v} for k, v in by_estado.items()],
                    "by_priority": [{"priority": k, "total": v} for k, v in by_priority.items()],
                }
            }
            
        except Exception as e:
            logger.exception(f"Error en query_tickets: {e}")
            raise HTTPException(status_code=502, detail="Error consultando datos")
        finally:
            dur = (time.perf_counter() - t0) * 1000
            logger.info(f"[reportes] /tickets filtros={filters.dict()} dur_ms={dur:.1f}")
