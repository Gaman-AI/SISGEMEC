from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.deps.jwt_auth import require_user_jwt, require_admin_user, UserContext
from app.services.license_vendors import LicenseVendorsService
from app.schemas.licenses import (
    VendorCreate, VendorUpdate, VendorRead, VendorsFilters,
    PaginatedResponse, SuccessResponse
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse, tags=["licenses-vendors"])
async def list_vendors(
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Tamaño de página"),
    search: str = Query(None, description="Búsqueda por nombre"),
    user: UserContext = Depends(require_user_jwt)
):
    """Lista todos los vendors de licencias"""
    filters = VendorsFilters(page=page, size=size, search=search)
    service = LicenseVendorsService()
    return service.list_vendors(filters)


@router.get("/{vendor_id}", response_model=VendorRead, tags=["licenses-vendors"])
async def get_vendor(
    vendor_id: int,
    user: UserContext = Depends(require_user_jwt)
):
    """Obtiene un vendor por ID"""
    service = LicenseVendorsService()
    return service.get_vendor(vendor_id)


@router.post("/", response_model=VendorRead, status_code=status.HTTP_201_CREATED, tags=["licenses-vendors"])
async def create_vendor(
    vendor_data: VendorCreate,
    user: UserContext = Depends(require_admin_user)
):
    """Crea un nuevo vendor"""
    service = LicenseVendorsService()
    return service.create_vendor(vendor_data)


@router.put("/{vendor_id}", response_model=VendorRead, tags=["licenses-vendors"])
async def update_vendor(
    vendor_id: int,
    vendor_data: VendorUpdate,
    user: UserContext = Depends(require_admin_user)
):
    """Actualiza un vendor existente"""
    service = LicenseVendorsService()
    return service.update_vendor(vendor_id, vendor_data)


@router.delete("/{vendor_id}", response_model=SuccessResponse, tags=["licenses-vendors"])
async def delete_vendor(
    vendor_id: int,
    user: UserContext = Depends(require_admin_user)
):
    """Elimina un vendor"""
    service = LicenseVendorsService()
    success = service.delete_vendor(vendor_id)
    
    if success:
        return SuccessResponse(
            message="Vendor eliminado correctamente",
            id=vendor_id
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar vendor"
        )
