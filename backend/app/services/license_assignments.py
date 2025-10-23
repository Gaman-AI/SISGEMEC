from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID
from fastapi import HTTPException, status, Header
from app.core.supabase_client import get_supabase
from app.schemas.licenses import AssignmentCreate, AssignmentUpdate, AssignmentRead, AssignmentsFilters, PaginatedResponse
from ._supabase_v2 import exec_select_paged, exec_single, insert_returning, update_returning, delete_match


class LicenseAssignmentsService:
    """Service para gestión de asignaciones de licencias"""
    
    def __init__(self):
        self.supabase = get_supabase()
        self.table_name = "license_assignments"
    
    def list_assignments(self, filters: AssignmentsFilters) -> PaginatedResponse:
        """Lista asignaciones con filtros y paginación"""
        # Para filtros complejos con joins, necesitamos usar el cliente directo
        try:
            query = self.supabase.table(self.table_name).select(
                "*, licenses(code, license_plans(plan_name, license_products(name, license_vendors(name)))), profiles(full_name, email)",
                count="exact"
            )
            
            # Aplicar filtros
            if filters.search:
                # Buscar por código de licencia o nombre de usuario
                query = query.or_(f"licenses.code.ilike.%{filters.search}%,profiles.full_name.ilike.%{filters.search}%")
            
            if filters.license_id:
                query = query.eq("license_id", filters.license_id)
            
            if filters.user_id:
                query = query.eq("user_id", filters.user_id)
            
            if filters.status:
                query = query.eq("status", filters.status)
            
            if filters.date_from:
                query = query.gte("assigned_at", filters.date_from.isoformat())
            
            if filters.date_to:
                query = query.lte("assigned_at", filters.date_to.isoformat())
            
            # Aplicar paginación
            offset = (filters.page - 1) * filters.size
            query = query.range(offset, offset + filters.size - 1)
            
            # Ordenar por fecha de asignación
            query = query.order("assigned_at", desc=True)
            
            # Ejecutar query
            result = query.execute()
            
            data = result.data or []
            total = result.count or 0
            pages = (total + filters.size - 1) // filters.size
            
            # Enriquecer datos
            enriched_data = []
            for item in data:
                enriched_item = dict(item)
                
                # Enriquecer con datos de licencia
                if item.get("licenses"):
                    enriched_item["license_code"] = item["licenses"]["code"]
                    if item["licenses"].get("license_plans"):
                        enriched_item["plan_name"] = item["licenses"]["license_plans"]["plan_name"]
                    else:
                        enriched_item["plan_name"] = None
                else:
                    enriched_item["license_code"] = None
                    enriched_item["plan_name"] = None
                
                # Enriquecer con datos de usuario
                if item.get("profiles"):
                    enriched_item["user_full_name"] = item["profiles"]["full_name"]
                    enriched_item["user_email"] = item["profiles"]["email"]
                else:
                    enriched_item["user_full_name"] = None
                    enriched_item["user_email"] = None
                
                # Remover los objetos anidados
                enriched_item.pop("licenses", None)
                enriched_item.pop("profiles", None)
                enriched_data.append(enriched_item)
            
            return PaginatedResponse(
                data=enriched_data,
                total=total,
                page=filters.page,
                size=filters.size,
                pages=pages
            )
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error interno al listar asignaciones: {str(e)}"
            )
    
    def get_assignment(self, assignment_id: int) -> AssignmentRead:
        """Obtiene una asignación por ID"""
        data = exec_single(
            self.supabase, 
            self.table_name, 
            select_fields="*, licenses(code, license_plans(plan_name, license_products(name, license_vendors(name)))), profiles(full_name, email)",
            match=("assignment_id", assignment_id)
        )
        
        # Enriquecer con datos de licencia
        if data.get("licenses"):
            data["license_code"] = data["licenses"]["code"]
            if data["licenses"].get("license_plans"):
                data["plan_name"] = data["licenses"]["license_plans"]["plan_name"]
            else:
                data["plan_name"] = None
        else:
            data["license_code"] = None
            data["plan_name"] = None
        
        # Enriquecer con datos de usuario
        if data.get("profiles"):
            data["user_full_name"] = data["profiles"]["full_name"]
            data["user_email"] = data["profiles"]["email"]
        else:
            data["user_full_name"] = None
            data["user_email"] = None
        
        # Remover los objetos anidados
        data.pop("licenses", None)
        data.pop("profiles", None)
        
        return AssignmentRead(**data)
    
    def create_assignment(self, assignment_data: AssignmentCreate, idempotency_key: Optional[str] = None) -> AssignmentRead:
        """Crea una nueva asignación"""
        # Verificar idempotencia si se proporciona key
        if idempotency_key:
            existing_key = self.supabase.table("idempotency_keys").select("entity_id").eq("key", idempotency_key).eq("resource", "license_assignments:create").execute()
            
            if existing_key.data:
                # Devolver la asignación existente
                existing_assignment_id = existing_key.data[0]["entity_id"]
                return self.get_assignment(existing_assignment_id)
        
        # Verificar que la licencia existe
        license_check = self.supabase.table("licenses").select("license_id, seats_total, seats_in_use").eq("license_id", assignment_data.license_id).execute()
        
        if not license_check.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La licencia especificada no existe"
            )
        
        license_info = license_check.data[0]
        
        # Verificar capacidad
        if license_info["seats_in_use"] >= license_info["seats_total"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No hay seats disponibles",
                headers={"code": "NO_SEATS_AVAILABLE"}
            )
        
        # Verificar que el usuario existe
        user_check = self.supabase.table("profiles").select("user_id").eq("user_id", str(assignment_data.user_id)).eq("active", True).execute()
        
        if not user_check.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario especificado no existe o no está activo"
            )
        
        # Verificar que no existe una asignación activa para la misma licencia y usuario
        existing_assignment = self.supabase.table(self.table_name).select("assignment_id").eq("license_id", assignment_data.license_id).eq("user_id", str(assignment_data.user_id)).eq("status", "active").execute()
        
        if existing_assignment.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El usuario ya tiene una asignación activa para esta licencia",
                headers={"code": "ASSIGNMENT_ALREADY_ACTIVE"}
            )
        
        # Crear asignación y actualizar seats_in_use en una transacción
        # Nota: Supabase no soporta transacciones explícitas, pero las operaciones son atómicas a nivel de fila
        
        # 1. Crear asignación
        assignment_payload = {
            "license_id": assignment_data.license_id,
            "user_id": str(assignment_data.user_id),
            "status": "active",
            "assigned_at": datetime.utcnow().isoformat(),
            "notes": assignment_data.notes
        }
        assignment_data_result = insert_returning(self.supabase, self.table_name, assignment_payload)
        assignment_id = assignment_data_result["assignment_id"]
        
        # 2. Actualizar seats_in_use usando helper v2
        updated_rows = update_returning(
            self.supabase, "licenses", ("license_id", assignment_data.license_id),
            {"seats_in_use": license_info["seats_in_use"] + 1}
        )
        
        if not updated_rows:
            # Si falla la actualización, intentar limpiar la asignación creada
            self.supabase.table(self.table_name).delete().eq("assignment_id", assignment_id).execute()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo actualizar la capacidad de la licencia"
            )
        
        # 3. Registrar idempotencia si se proporciona key
        if idempotency_key:
            self.supabase.table("idempotency_keys").insert({
                "key": idempotency_key,
                "resource": "license_assignments:create",
                "entity_id": assignment_id,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
        
        # Devolver la asignación creada
        return self.get_assignment(assignment_id)
    
    def update_assignment(self, assignment_id: int, assignment_data: AssignmentUpdate) -> AssignmentRead:
        """Actualiza una asignación existente"""
        # Verificar que la asignación existe
        existing = self.supabase.table(self.table_name).select("assignment_id, status").eq("assignment_id", assignment_id).execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asignación no encontrada"
            )
        
        current_status = existing.data[0]["status"]
        
        # Verificar que no se está intentando reactivar una asignación revocada
        if current_status == "revoked" and assignment_data.status == "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede reactivar una asignación revocada"
            )
        
        # Preparar datos para actualización
        update_data = {}
        if assignment_data.status is not None:
            update_data["status"] = assignment_data.status
            if assignment_data.status == "revoked":
                update_data["revoked_at"] = datetime.utcnow().isoformat()
        if assignment_data.notes is not None:
            update_data["notes"] = assignment_data.notes
        
        if not update_data:
            # No hay cambios, devolver la asignación actual
            return self.get_assignment(assignment_id)
        
        # Actualizar asignación
        data = update_returning(self.supabase, self.table_name, ("assignment_id", assignment_id), update_data)
        
        # Enriquecer con datos de licencia
        if data.get("licenses"):
            data["license_code"] = data["licenses"]["code"]
            if data["licenses"].get("license_plans"):
                data["plan_name"] = data["licenses"]["license_plans"]["plan_name"]
            else:
                data["plan_name"] = None
        else:
            data["license_code"] = None
            data["plan_name"] = None
        
        # Enriquecer con datos de usuario
        if data.get("profiles"):
            data["user_full_name"] = data["profiles"]["full_name"]
            data["user_email"] = data["profiles"]["email"]
        else:
            data["user_full_name"] = None
            data["user_email"] = None
        
        # Remover los objetos anidados
        data.pop("licenses", None)
        data.pop("profiles", None)
        
        return AssignmentRead(**data)
    
    def revoke_assignment(self, assignment_id: int) -> AssignmentRead:
        """Revoca una asignación (elimina lógicamente)"""
        # Verificar que la asignación existe y está activa
        existing = self.supabase.table(self.table_name).select("assignment_id, license_id, status").eq("assignment_id", assignment_id).execute()
        
        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asignación no encontrada"
            )
        
        if existing.data[0]["status"] != "active":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La asignación no está activa",
                headers={"code": "ASSIGNMENT_NOT_ACTIVE"}
            )
        
        license_id = existing.data[0]["license_id"]
        
        # Obtener información de la licencia usando helper v2
        try:
            license_info = exec_single(
                self.supabase, "licenses", 
                "seats_in_use", 
                ("license_id", license_id)
            )
            current_seats_in_use = license_info["seats_in_use"]
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al obtener información de licencia: {str(e)}"
            )
        
        # Revocar asignación y actualizar seats_in_use usando helpers v2
        # 1. Actualizar asignación
        updated_assign = update_returning(
            self.supabase, "license_assignments", ("assignment_id", assignment_id),
            {"status": "revoked", "revoked_at": datetime.utcnow().isoformat()}
        )
        
        if not updated_assign:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo revocar la asignación"
            )
        
        # 2. Actualizar seats_in_use (nunca menor que 0)
        new_seats_in_use = max(0, current_seats_in_use - 1)
        updated_lic = update_returning(
            self.supabase, "licenses", ("license_id", license_id),
            {"seats_in_use": new_seats_in_use}
        )
        
        if not updated_lic:
            # Si falla la actualización, revertir el estado de la asignación
            self.supabase.table(self.table_name).update({
                "status": "active",
                "revoked_at": None
            }).eq("assignment_id", assignment_id).execute()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No se pudo actualizar la capacidad de la licencia"
            )
        
        # Devolver la asignación revocada
        return self.get_assignment(assignment_id)
    
    def get_my_assignments(self, user_id: str, filters: AssignmentsFilters) -> PaginatedResponse:
        """Obtiene las asignaciones del usuario actual"""
        try:
            # Aplicar filtro de usuario
            filters.user_id = UUID(user_id)
            return self.list_assignments(filters)
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error interno al obtener asignaciones del usuario: {str(e)}"
            )
