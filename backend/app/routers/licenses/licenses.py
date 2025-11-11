from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.deps.jwt_auth import require_user_jwt, require_admin_user, UserContext
from app.services.license_licenses import LicenseLicensesService
from app.schemas.licenses import (
    LicenseCreate, LicenseUpdate, LicenseRead, LicensesFilters,
    PaginatedResponse, SuccessResponse, LicenseCapacity
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse, tags=["licenses"])
async def list_licenses(
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Tamaño de página"),
    search: str = Query(None, description="Búsqueda por código"),
    vendor_id: Optional[int] = Query(None, description="Filtrar por vendor"),
    product_id: Optional[int] = Query(None, description="Filtrar por producto"),
    plan_id: Optional[int] = Query(None, description="Filtrar por plan"),
    date_from: Optional[date] = Query(None, description="Fecha desde"),
    date_to: Optional[date] = Query(None, description="Fecha hasta"),
    user: UserContext = Depends(require_admin_user)
):
    """
    Lista todas las licencias (solo ADMIN)
    
    Restricción de seguridad: Solo usuarios con rol ADMIN pueden ver el listado completo
    de licencias para proteger información sensible (códigos, capacidad, fechas).
    Los RESPONSABLES pueden ver solo sus asignaciones a través de /licenses/assignments/my
    """
    filters = LicensesFilters(
        page=page, size=size, search=search, vendor_id=vendor_id,
        product_id=product_id, plan_id=plan_id,
        date_from=date_from, date_to=date_to
    )
    service = LicenseLicensesService()
    return service.list_licenses(filters)


@router.get("/{license_id}", response_model=LicenseRead, tags=["licenses"])
async def get_license(
    license_id: int,
    user: UserContext = Depends(require_admin_user)
):
    """
    Obtiene una licencia por ID (solo ADMIN)
    
    Restricción de seguridad: Solo ADMIN puede ver detalles completos de licencias
    para proteger información sensible. Los RESPONSABLES ven solo sus asignaciones.
    """
    service = LicenseLicensesService()
    return service.get_license(license_id)


@router.get("/{license_id}/capacity", response_model=LicenseCapacity, tags=["licenses"])
async def get_license_capacity(
    license_id: int,
    user: UserContext = Depends(require_admin_user)
):
    """
    Obtiene la capacidad de una licencia (solo ADMIN)
    
    Restricción de seguridad: Información de capacidad solo visible para ADMIN
    para proteger métricas internas del sistema.
    """
    service = LicenseLicensesService()
    return service.get_license_capacity(license_id)


@router.post("/", response_model=LicenseRead, status_code=status.HTTP_201_CREATED, tags=["licenses"])
async def create_license(
    license_data: LicenseCreate,
    user: UserContext = Depends(require_admin_user)
):
    """Crea una nueva licencia"""
    service = LicenseLicensesService()
    return service.create_license(license_data, user["user_id"])


@router.put("/{license_id}", response_model=LicenseRead, tags=["licenses"])
async def update_license(
    license_id: int,
    license_data: LicenseUpdate,
    user: UserContext = Depends(require_admin_user)
):
    """Actualiza una licencia existente"""
    service = LicenseLicensesService()
    return service.update_license(license_id, license_data)


@router.delete("/{license_id}", response_model=SuccessResponse, tags=["licenses"])
async def delete_license(
    license_id: int,
    user: UserContext = Depends(require_admin_user)
):
    """Elimina una licencia"""
    service = LicenseLicensesService()
    success = service.delete_license(license_id)
    
    if success:
        return SuccessResponse(
            message="Licencia eliminada correctamente",
            id=license_id
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar licencia"
        )
