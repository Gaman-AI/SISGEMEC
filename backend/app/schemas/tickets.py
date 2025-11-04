from typing import Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, EmailStr

EstadoType = Literal['Pendiente', 'En atención', 'Cerrado']
FuenteType = Literal['google_forms', 'email', 'manual']
PriorityType = Literal['Urgent', 'Important', 'Medium', 'Low']  # NUEVO

class TicketCreateIntake(BaseModel):
    submissionId: Optional[str] = Field(None, description="Id externo para idempotencia (Google Forms)")
    email: EmailStr
    nombre: Optional[str] = None
    descripcion: str
    meta: Optional[Dict[str, Any]] = None

    class Config:
        extra = "allow"

class TicketIntakeResponse(BaseModel):
    ticket_id: int
    estado: EstadoType
    priority: PriorityType  # NUEVO
    prioritario: Optional[bool] = None  # DEPRECATED - calculado desde priority
    requires_classification: bool
    received_at: str

class TicketListFilters(BaseModel):
    estado: Optional[EstadoType] = None
    priority: Optional[PriorityType] = None  # NUEVO
    prioritario: Optional[bool] = None  # DEPRECATED - para compatibilidad
    fuente: Optional[FuenteType] = None
    received_start: Optional[str] = None
    received_end: Optional[str] = None
    closed_start: Optional[str] = None
    closed_end: Optional[str] = None
    q: Optional[str] = None
    page: int = 1
    size: int = 20
    order_by: Optional[str] = 'received_at.desc'

class TicketOut(BaseModel):
    ticket_id: int
    solicitante_email: EmailStr
    solicitante_nombre: Optional[str]
    descripcion: str
    equipo_id: Optional[int]
    solicitante_id: Optional[str]
    tipo_servicio_id: Optional[int]
    estado: EstadoType
    priority: PriorityType  # NUEVO
    prioritario: Optional[bool] = None  # DEPRECATED - calculado desde priority
    fuente: FuenteType
    external_id: Optional[str]
    raw_payload: Optional[Dict[str, Any]] = None
    requires_classification: bool
    received_at: Optional[str]
    first_response_at: Optional[str]
    closed_at: Optional[str]
    tecnico_id: Optional[str]
    trabajo_realizado: Optional[str]
    notas_internas: Optional[str]
    created_at: Optional[str]
    updated_at: Optional[str]

class TicketUpdate(BaseModel):
    tipo_servicio_id: Optional[int] = None
    tecnico_id: Optional[str] = None
    trabajo_realizado: Optional[str] = None
    notas_internas: Optional[str] = None
    priority: Optional[PriorityType] = None  # NUEVO (reemplaza prioritario)
    prioritario: Optional[bool] = None  # DEPRECATED - para compatibilidad temporal

class TicketChangeState(BaseModel):
    estado: EstadoType

class TicketChangePriority(BaseModel):  # NUEVO (reemplaza TicketTogglePriority)
    priority: PriorityType

class TicketClassify(BaseModel):
    solicitante_id: Optional[str] = None
    equipo_id: Optional[int] = None
    tipo_servicio_id: Optional[int] = None  # NUEVO
    priority: PriorityType  # NUEVO - obligatorio en clasificación
    observaciones: Optional[str] = None  # NUEVO

# NUEVO - para eventos
class TicketEvent(BaseModel):
    event_id: int
    ticket_id: int
    actor_id: Optional[str]
    event_type: str
    payload: Optional[Dict[str, Any]]
    created_at: str
