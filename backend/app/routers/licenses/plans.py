from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.deps.jwt_auth import require_user_jwt, require_admin_user, UserContext
from app.services.license_plans import LicensePlansService
from app.schemas.licenses import (
    PlanCreate, PlanUpdate, PlanRead, PlansFilters,
    PaginatedResponse, SuccessResponse
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse, tags=["licenses-plans"])
async def list_plans(
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Tamaño de página"),
    search: str = Query(None, description="Búsqueda por nombre"),
    product_id: Optional[int] = Query(None, description="Filtrar por producto"),
    billing_cycle: Optional[str] = Query(None, description="Filtrar por ciclo de facturación"),
    currency: Optional[str] = Query(None, description="Filtrar por moneda"),
    price_min: Optional[Decimal] = Query(None, description="Precio mínimo"),
    price_max: Optional[Decimal] = Query(None, description="Precio máximo"),
    user: UserContext = Depends(require_user_jwt)
):
    """Lista todos los planes de licencias"""
    filters = PlansFilters(
        page=page, size=size, search=search, product_id=product_id,
        billing_cycle=billing_cycle, currency=currency,
        price_min=price_min, price_max=price_max
    )
    service = LicensePlansService()
    return service.list_plans(filters)


@router.get("/{plan_id}", response_model=PlanRead, tags=["licenses-plans"])
async def get_plan(
    plan_id: int,
    user: UserContext = Depends(require_user_jwt)
):
    """Obtiene un plan por ID"""
    service = LicensePlansService()
    return service.get_plan(plan_id)


@router.post("/", response_model=PlanRead, status_code=status.HTTP_201_CREATED, tags=["licenses-plans"])
async def create_plan(
    plan_data: PlanCreate,
    user: UserContext = Depends(require_admin_user)
):
    """Crea un nuevo plan"""
    service = LicensePlansService()
    return service.create_plan(plan_data)


@router.put("/{plan_id}", response_model=PlanRead, tags=["licenses-plans"])
async def update_plan(
    plan_id: int,
    plan_data: PlanUpdate,
    user: UserContext = Depends(require_admin_user)
):
    """Actualiza un plan existente"""
    service = LicensePlansService()
    return service.update_plan(plan_id, plan_data)


@router.delete("/{plan_id}", response_model=SuccessResponse, tags=["licenses-plans"])
async def delete_plan(
    plan_id: int,
    user: UserContext = Depends(require_admin_user)
):
    """Elimina un plan"""
    service = LicensePlansService()
    success = service.delete_plan(plan_id)
    
    if success:
        return SuccessResponse(
            message="Plan eliminado correctamente",
            id=plan_id
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar plan"
        )
