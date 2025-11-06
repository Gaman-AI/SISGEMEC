from typing import List, Optional, Dict, Any
from pydantic import BaseModel, field_validator
from datetime import date


class Page(BaseModel):
    """Modelo de respuesta paginada con summary opcional"""
    items: List[Dict[str, Any]]
    total: int
    page: int
    size: int
    summary: Optional[Dict[str, List[Dict[str, Any]]]] = None


class EquiposFilters(BaseModel):
    """Filtros para reporte de equipos"""
    tipo_equipo: Optional[str] = None
    marca: Optional[str] = None
    estado_equipo: Optional[str] = None
    responsable_id: Optional[str] = None  # Mantener para compatibilidad
    responsable: Optional[str] = None  # Búsqueda por nombre o email
    num_serie: Optional[str] = None
    ubicacion_actual: Optional[str] = None
    from_dt: Optional[date] = None
    to_dt: Optional[date] = None
    page: int = 1
    size: int = 20


class ServiciosFilters(BaseModel):
    """Filtros para reporte de servicios"""
    tipo_servicio: Optional[str] = None
    estado_servicio: Optional[str] = None
    equipo_id: Optional[int] = None
    num_serie: Optional[str] = None
    from_dt: Optional[date] = None
    to_dt: Optional[date] = None
    page: int = 1
    size: int = 20

    @field_validator('equipo_id', mode='before')
    @classmethod
    def coerce_equipo_id(cls, v):
        if v in (None, '', ' ', 'NaN', 'nan'):
            return None
        # permitir strings numéricas
        if isinstance(v, str):
            v = v.strip()
            if v.isdigit():
                return int(v)
            # si no es dígito puro, intenta parseo robusto:
            try:
                n = int(float(v))
                return n
            except:
                return None
        # si es float NaN
        try:
            if isinstance(v, float) and (v != v):  # NaN check
                return None
        except:
            pass
        return v


class ExportFormat(BaseModel):
    """Formato de exportación"""
    format: str  # "excel" o "pdf"


class TicketsFilters(BaseModel):
    """Filtros para reporte de tickets"""
    estado: Optional[str] = None         # 'Pendiente', 'En atención', 'Cerrado'
    priority: Optional[str] = None       # 'Urgent', 'Important', 'Medium', 'Low'
    tipo_servicio_id: Optional[int] = None
    equipo_id: Optional[int] = None
    fuente: Optional[str] = None         # 'google_forms', 'email', 'manual' (si aplica)
    from_dt: Optional[date] = None       # filtra por received_at >=
    to_dt: Optional[date] = None         # filtra por received_at <=
    page: int = 1
    size: int = 20