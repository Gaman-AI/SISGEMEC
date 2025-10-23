from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.deps.jwt_auth import require_user_jwt, require_admin_user, UserContext
from app.services.license_products import LicenseProductsService
from app.schemas.licenses import (
    ProductCreate, ProductUpdate, ProductRead, ProductsFilters,
    PaginatedResponse, SuccessResponse
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse, tags=["licenses-products"])
async def list_products(
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Tamaño de página"),
    search: str = Query(None, description="Búsqueda por nombre"),
    vendor_id: Optional[int] = Query(None, description="Filtrar por vendor"),
    user: UserContext = Depends(require_user_jwt)
):
    """Lista todos los productos de licencias"""
    filters = ProductsFilters(page=page, size=size, search=search, vendor_id=vendor_id)
    service = LicenseProductsService()
    return service.list_products(filters)


@router.get("/{product_id}", response_model=ProductRead, tags=["licenses-products"])
async def get_product(
    product_id: int,
    user: UserContext = Depends(require_user_jwt)
):
    """Obtiene un producto por ID"""
    service = LicenseProductsService()
    return service.get_product(product_id)


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED, tags=["licenses-products"])
async def create_product(
    product_data: ProductCreate,
    user: UserContext = Depends(require_admin_user)
):
    """Crea un nuevo producto"""
    service = LicenseProductsService()
    return service.create_product(product_data)


@router.put("/{product_id}", response_model=ProductRead, tags=["licenses-products"])
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    user: UserContext = Depends(require_admin_user)
):
    """Actualiza un producto existente"""
    service = LicenseProductsService()
    return service.update_product(product_id, product_data)


@router.delete("/{product_id}", response_model=SuccessResponse, tags=["licenses-products"])
async def delete_product(
    product_id: int,
    user: UserContext = Depends(require_admin_user)
):
    """Elimina un producto"""
    service = LicenseProductsService()
    success = service.delete_product(product_id)
    
    if success:
        return SuccessResponse(
            message="Producto eliminado correctamente",
            id=product_id
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar producto"
        )
