from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID


# ============================================================================
# COMMON SCHEMAS
# ============================================================================

class CommonPagination(BaseModel):
    """Paginación común para todos los recursos"""
    page: int = Field(default=1, ge=1, description="Número de página")
    size: int = Field(default=20, ge=1, le=100, description="Tamaño de página")
    search: Optional[str] = Field(default=None, max_length=255, description="Búsqueda de texto")


# ============================================================================
# VENDORS SCHEMAS
# ============================================================================

class VendorCreate(BaseModel):
    """Schema para crear un vendor"""
    name: str = Field(..., min_length=1, max_length=150, description="Nombre del vendor")
    website: Optional[str] = Field(default=None, max_length=255, description="Sitio web del vendor")


class VendorUpdate(BaseModel):
    """Schema para actualizar un vendor"""
    name: Optional[str] = Field(default=None, min_length=1, max_length=150, description="Nombre del vendor")
    website: Optional[str] = Field(default=None, max_length=255, description="Sitio web del vendor")


class VendorRead(BaseModel):
    """Schema para leer un vendor"""
    vendor_id: int
    name: str
    website: Optional[str]
    created_at: datetime


class VendorsFilters(CommonPagination):
    """Filtros para vendors"""
    pass  # Solo hereda search de CommonPagination


# ============================================================================
# PRODUCTS SCHEMAS
# ============================================================================

class ProductCreate(BaseModel):
    """Schema para crear un product"""
    vendor_id: int = Field(..., description="ID del vendor")
    name: str = Field(..., min_length=1, max_length=150, description="Nombre del producto")
    description: Optional[str] = Field(default=None, max_length=1000, description="Descripción del producto")


class ProductUpdate(BaseModel):
    """Schema para actualizar un product"""
    vendor_id: Optional[int] = Field(default=None, description="ID del vendor")
    name: Optional[str] = Field(default=None, min_length=1, max_length=150, description="Nombre del producto")
    description: Optional[str] = Field(default=None, max_length=1000, description="Descripción del producto")


class ProductRead(BaseModel):
    """Schema para leer un product"""
    product_id: int
    vendor_id: int
    name: str
    description: Optional[str]
    # Campos enriquecidos
    vendor_name: Optional[str] = None


class ProductsFilters(CommonPagination):
    """Filtros para products"""
    vendor_id: Optional[int] = Field(default=None, description="Filtrar por vendor")


# ============================================================================
# PLANS SCHEMAS
# ============================================================================

class PlanCreate(BaseModel):
    """Schema para crear un plan"""
    product_id: int = Field(..., description="ID del producto")
    plan_name: str = Field(..., min_length=1, max_length=150, description="Nombre del plan")
    billing_cycle: Literal["annual", "monthly"] = Field(default="annual", description="Ciclo de facturación")
    seat_limit: Optional[int] = Field(default=None, ge=0, description="Límite de seats")
    features: Dict[str, Any] = Field(default_factory=dict, description="Características del plan")
    currency: Literal["MXN", "USD"] = Field(default="MXN", description="Moneda")
    cost_per_cycle: Optional[Decimal] = Field(default=None, ge=0, description="Costo por ciclo")


class PlanUpdate(BaseModel):
    """Schema para actualizar un plan"""
    product_id: Optional[int] = Field(default=None, description="ID del producto")
    plan_name: Optional[str] = Field(default=None, min_length=1, max_length=150, description="Nombre del plan")
    billing_cycle: Optional[Literal["annual", "monthly"]] = Field(default=None, description="Ciclo de facturación")
    seat_limit: Optional[int] = Field(default=None, ge=0, description="Límite de seats")
    features: Optional[Dict[str, Any]] = Field(default=None, description="Características del plan")
    currency: Optional[Literal["MXN", "USD"]] = Field(default=None, description="Moneda")
    cost_per_cycle: Optional[Decimal] = Field(default=None, ge=0, description="Costo por ciclo")


class PlanRead(BaseModel):
    """Schema para leer un plan"""
    plan_id: int
    product_id: int
    plan_name: str
    billing_cycle: str
    seat_limit: Optional[int]
    features: Dict[str, Any]
    currency: str
    cost_per_cycle: Optional[Decimal]
    # Campos enriquecidos
    product_name: Optional[str] = None
    vendor_name: Optional[str] = None


class PlansFilters(CommonPagination):
    """Filtros para plans"""
    product_id: Optional[int] = Field(default=None, description="Filtrar por producto")
    billing_cycle: Optional[Literal["annual", "monthly"]] = Field(default=None, description="Filtrar por ciclo de facturación")
    currency: Optional[Literal["MXN", "USD"]] = Field(default=None, description="Filtrar por moneda")
    price_min: Optional[Decimal] = Field(default=None, ge=0, description="Precio mínimo")
    price_max: Optional[Decimal] = Field(default=None, ge=0, description="Precio máximo")


# ============================================================================
# LICENSES SCHEMAS
# ============================================================================

class LicenseCreate(BaseModel):
    """Schema para crear una licencia"""
    plan_id: int = Field(..., description="ID del plan")
    code: Optional[str] = Field(default=None, max_length=100, description="Código de la licencia")
    seats_total: int = Field(..., ge=0, description="Total de seats")
    start_date: Optional[date] = Field(default=None, description="Fecha de inicio")
    end_date: Optional[date] = Field(default=None, description="Fecha de fin")
    renewal_date: Optional[date] = Field(default=None, description="Fecha de renovación")
    notes: Optional[str] = Field(default=None, max_length=1000, description="Notas")

    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, info):
        if v and 'start_date' in info.data and info.data['start_date']:
            if v <= info.data['start_date']:
                raise ValueError('end_date debe ser posterior a start_date')
        return v


class LicenseUpdate(BaseModel):
    """Schema para actualizar una licencia"""
    plan_id: Optional[int] = Field(default=None, description="ID del plan")
    code: Optional[str] = Field(default=None, max_length=100, description="Código de la licencia")
    seats_total: Optional[int] = Field(default=None, ge=0, description="Total de seats")
    start_date: Optional[date] = Field(default=None, description="Fecha de inicio")
    end_date: Optional[date] = Field(default=None, description="Fecha de fin")
    renewal_date: Optional[date] = Field(default=None, description="Fecha de renovación")
    notes: Optional[str] = Field(default=None, max_length=1000, description="Notas")

    @field_validator('end_date')
    @classmethod
    def validate_end_date(cls, v, info):
        if v and 'start_date' in info.data and info.data['start_date']:
            if v <= info.data['start_date']:
                raise ValueError('end_date debe ser posterior a start_date')
        return v


class LicenseRead(BaseModel):
    """Schema para leer una licencia"""
    license_id: int
    plan_id: int
    code: Optional[str]
    seats_total: int
    seats_in_use: int
    start_date: Optional[date]
    end_date: Optional[date]
    renewal_date: Optional[date]
    notes: Optional[str]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    # Campos calculados
    seats_available: int = Field(description="Seats disponibles (seats_total - seats_in_use)")
    # Campos enriquecidos
    plan_name: Optional[str] = None
    product_name: Optional[str] = None
    vendor_name: Optional[str] = None


class LicensesFilters(CommonPagination):
    """Filtros para licencias"""
    vendor_id: Optional[int] = Field(default=None, description="Filtrar por vendor")
    product_id: Optional[int] = Field(default=None, description="Filtrar por producto")
    plan_id: Optional[int] = Field(default=None, description="Filtrar por plan")
    date_from: Optional[date] = Field(default=None, description="Fecha desde (start_date)")
    date_to: Optional[date] = Field(default=None, description="Fecha hasta (end_date)")


class LicenseCapacity(BaseModel):
    """Schema para capacidad de licencia"""
    license_id: int
    seats_total: int
    seats_in_use: int
    seats_available: int


# ============================================================================
# ASSIGNMENTS SCHEMAS
# ============================================================================

class AssignmentCreate(BaseModel):
    """Schema para crear una asignación"""
    license_id: int = Field(..., description="ID de la licencia")
    user_id: UUID = Field(..., description="ID del usuario")
    notes: Optional[str] = Field(default=None, max_length=1000, description="Notas")


class AssignmentUpdate(BaseModel):
    """Schema para actualizar una asignación"""
    status: Optional[Literal["active", "revoked", "expired"]] = Field(default=None, description="Estado de la asignación")
    notes: Optional[str] = Field(default=None, max_length=1000, description="Notas")


class AssignmentRead(BaseModel):
    """Schema para leer una asignación"""
    assignment_id: int
    license_id: int
    user_id: UUID
    status: str
    assigned_at: datetime
    revoked_at: Optional[datetime]
    notes: Optional[str]
    # Campos enriquecidos
    license_code: Optional[str] = None
    plan_name: Optional[str] = None
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None


class AssignmentsFilters(CommonPagination):
    """Filtros para asignaciones"""
    license_id: Optional[int] = Field(default=None, description="Filtrar por licencia")
    user_id: Optional[UUID] = Field(default=None, description="Filtrar por usuario")
    status: Optional[Literal["active", "revoked", "expired"]] = Field(default=None, description="Filtrar por estado")
    date_from: Optional[date] = Field(default=None, description="Fecha desde (assigned_at)")
    date_to: Optional[date] = Field(default=None, description="Fecha hasta (assigned_at)")


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class PaginatedResponse(BaseModel):
    """Respuesta paginada estándar"""
    data: List[Dict[str, Any]]
    total: int
    page: int
    size: int
    pages: int


class ErrorResponse(BaseModel):
    """Respuesta de error estándar"""
    detail: str
    code: Optional[str] = None
    errors: Optional[List[Dict[str, str]]] = None


class SuccessResponse(BaseModel):
    """Respuesta de éxito estándar"""
    ok: bool = True
    message: str
    id: Optional[int] = None
