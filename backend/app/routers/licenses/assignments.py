from typing import List, Optional
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from app.deps.jwt_auth import require_user_jwt, require_admin_user, UserContext
from app.services.license_assignments import LicenseAssignmentsService
from app.schemas.licenses import (
    AssignmentCreate, AssignmentUpdate, AssignmentRead, AssignmentsFilters,
    PaginatedResponse, SuccessResponse
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse, tags=["licenses-assignments"])
async def list_assignments(
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Tamaño de página"),
    search: str = Query(None, description="Búsqueda por código de licencia o nombre de usuario"),
    license_id: Optional[int] = Query(None, description="Filtrar por licencia"),
    user_id: Optional[UUID] = Query(None, description="Filtrar por usuario"),
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    date_from: Optional[date] = Query(None, description="Fecha desde"),
    date_to: Optional[date] = Query(None, description="Fecha hasta"),
    user: UserContext = Depends(require_admin_user)
):
    """Lista todas las asignaciones (solo ADMIN)"""
    filters = AssignmentsFilters(
        page=page, size=size, search=search, license_id=license_id,
        user_id=user_id, status=status, date_from=date_from, date_to=date_to
    )
    service = LicenseAssignmentsService()
    return service.list_assignments(filters)


@router.get("/my", response_model=PaginatedResponse, tags=["licenses-assignments"])
async def get_my_assignments(
    page: int = Query(1, ge=1, description="Número de página"),
    size: int = Query(20, ge=1, le=100, description="Tamaño de página"),
    search: str = Query(None, description="Búsqueda por código de licencia"),
    license_id: Optional[int] = Query(None, description="Filtrar por licencia"),
    status: Optional[str] = Query(None, description="Filtrar por estado"),
    date_from: Optional[date] = Query(None, description="Fecha desde"),
    date_to: Optional[date] = Query(None, description="Fecha hasta"),
    user: UserContext = Depends(require_user_jwt)
):
    """Obtiene las asignaciones del usuario actual"""
    filters = AssignmentsFilters(
        page=page, size=size, search=search, license_id=license_id,
        status=status, date_from=date_from, date_to=date_to
    )
    service = LicenseAssignmentsService()
    return service.get_my_assignments(user["user_id"], filters)


@router.get("/{assignment_id}", response_model=AssignmentRead, tags=["licenses-assignments"])
async def get_assignment(
    assignment_id: int,
    user: UserContext = Depends(require_admin_user)
):
    """Obtiene una asignación por ID (solo ADMIN)"""
    service = LicenseAssignmentsService()
    return service.get_assignment(assignment_id)


@router.post("/", response_model=AssignmentRead, status_code=status.HTTP_201_CREATED, tags=["licenses-assignments"])
async def create_assignment(
    assignment_data: AssignmentCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    user: UserContext = Depends(require_admin_user)
):
    """Crea una nueva asignación"""
    service = LicenseAssignmentsService()
    return service.create_assignment(assignment_data, idempotency_key)


@router.put("/{assignment_id}", response_model=AssignmentRead, tags=["licenses-assignments"])
async def update_assignment(
    assignment_id: int,
    assignment_data: AssignmentUpdate,
    user: UserContext = Depends(require_admin_user)
):
    """Actualiza una asignación existente"""
    service = LicenseAssignmentsService()
    return service.update_assignment(assignment_id, assignment_data)


@router.delete("/{assignment_id}", response_model=AssignmentRead, tags=["licenses-assignments"])
async def revoke_assignment(
    assignment_id: int,
    user: UserContext = Depends(require_admin_user)
):
    """Revoca una asignación (elimina lógicamente)"""
    service = LicenseAssignmentsService()
    return service.revoke_assignment(assignment_id)
