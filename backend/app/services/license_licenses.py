from typing import List, Dict, Any, Optional
from datetime import date, datetime
from fastapi import HTTPException, status
from app.core.supabase_client import get_supabase
from app.schemas.licenses import LicenseCreate, LicenseUpdate, LicenseRead, LicensesFilters, PaginatedResponse, LicenseCapacity
from ._supabase_v2 import exec_select_paged, exec_single, insert_returning, update_returning, delete_match


class LicenseLicensesService:
    """Service para gestión de licencias"""
    
    def __init__(self):
        self.supabase = get_supabase()
        self.table_name = "licenses"
    
    def list_licenses(self, filters: LicensesFilters) -> PaginatedResponse:
        """Lista licencias con filtros y paginación"""
        # Para filtros complejos con joins, necesitamos usar el cliente directo
        try:
            query = self.supabase.table(self.table_name).select(
                "*, license_plans(plan_name, license_products(name, license_vendors(name)))",
                count="exact"
            )
            
            # Aplicar filtros
            if filters.search:
                query = query.ilike("code", f"%{filters.search}%")
            
            if filters.vendor_id:
                # Filtrar por vendor a través de los joins
                query = query.eq("license_plans.license_products.license_vendors.vendor_id", filters.vendor_id)
            
            if filters.product_id:
                # Filtrar por product a través de los joins
                query = query.eq("license_plans.license_products.product_id", filters.product_id)
            
            if filters.plan_id:
                query = query.eq("plan_id", filters.plan_id)
            
            if filters.date_from:
                query = query.gte("start_date", filters.date_from.isoformat())
            
            if filters.date_to:
                query = query.lte("end_date", filters.date_to.isoformat())
            
            # Aplicar paginación
            offset = (filters.page - 1) * filters.size
            query = query.range(offset, offset + filters.size - 1)
            
            # Ordenar por fecha de creación
            query = query.order("created_at", desc=True)
            
            # Ejecutar query
            result = query.execute()
            
            data = result.data or []
            total = result.count or 0
            pages = (total + filters.size - 1) // filters.size
            
            # Enriquecer datos con plan_name, product_name y vendor_name
            enriched_data = []
            for item in data:
                enriched_item = dict(item)
                
                # Calcular seats_available
                enriched_item["seats_available"] = item["seats_total"] - item["seats_in_use"]
                
                # Enriquecer con datos de plan, product y vendor
                if item.get("license_plans"):
                    enriched_item["plan_name"] = item["license_plans"]["plan_name"]
                    if item["license_plans"].get("license_products"):
                        enriched_item["product_name"] = item["license_plans"]["license_products"]["name"]
                        if item["license_plans"]["license_products"].get("license_vendors"):
                            enriched_item["vendor_name"] = item["license_plans"]["license_products"]["license_vendors"]["name"]
                        else:
                            enriched_item["vendor_name"] = None
                    else:
                        enriched_item["product_name"] = None
                        enriched_item["vendor_name"] = None
                else:
                    enriched_item["plan_name"] = None
                    enriched_item["product_name"] = None
                    enriched_item["vendor_name"] = None
                
                # Remover los objetos anidados
                enriched_item.pop("license_plans", None)
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
                detail=f"Error interno al listar licencias: {str(e)}"
            )
    
    def get_license(self, license_id: int) -> LicenseRead:
        """Obtiene una licencia por ID"""
        data = exec_single(
            self.supabase, 
            self.table_name, 
            select_fields="*, license_plans(plan_name, license_products(name, license_vendors(name)))",
            match=("license_id", license_id)
        )
        
        # Calcular seats_available
        data["seats_available"] = data["seats_total"] - data["seats_in_use"]
        
        # Enriquecer con datos de plan, product y vendor
        if data.get("license_plans"):
            data["plan_name"] = data["license_plans"]["plan_name"]
            if data["license_plans"].get("license_products"):
                data["product_name"] = data["license_plans"]["license_products"]["name"]
                if data["license_plans"]["license_products"].get("license_vendors"):
                    data["vendor_name"] = data["license_plans"]["license_products"]["license_vendors"]["name"]
                else:
                    data["vendor_name"] = None
            else:
                data["product_name"] = None
                data["vendor_name"] = None
        else:
            data["plan_name"] = None
            data["product_name"] = None
            data["vendor_name"] = None
        
        # Remover los objetos anidados
        data.pop("license_plans", None)
        
        return LicenseRead(**data)
    
    def create_license(self, license_data: LicenseCreate, created_by: str) -> LicenseRead:
        """Crea una nueva licencia"""
        # Verificar que el plan existe
        plan_check = self.supabase.table("license_plans").select("plan_id").eq("plan_id", license_data.plan_id).execute()
        
        if not plan_check.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El plan especificado no existe"
            )
        
        # Verificar código único si se proporciona
        if license_data.code:
            existing = self.supabase.table(self.table_name).select("license_id").eq("code", license_data.code).execute()
            
            if existing.data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe una licencia con ese código"
                )
        
        # Preparar datos para inserción
        insert_data = {
            "plan_id": license_data.plan_id,
            "code": license_data.code,
            "seats_total": license_data.seats_total,
            "seats_in_use": 0,  # Inicialmente 0
            "start_date": license_data.start_date.isoformat() if license_data.start_date else None,
            "end_date": license_data.end_date.isoformat() if license_data.end_date else None,
            "renewal_date": license_data.renewal_date.isoformat() if license_data.renewal_date else None,
            "notes": license_data.notes,
            "created_by": created_by
        }
        
        # Crear licencia
        data = insert_returning(self.supabase, self.table_name, insert_data)
        
        # Calcular seats_available
        data["seats_available"] = data["seats_total"] - data["seats_in_use"]
        
        # Enriquecer con datos de plan, product y vendor
        if data.get("license_plans"):
            data["plan_name"] = data["license_plans"]["plan_name"]
            if data["license_plans"].get("license_products"):
                data["product_name"] = data["license_plans"]["license_products"]["name"]
                if data["license_plans"]["license_products"].get("license_vendors"):
                    data["vendor_name"] = data["license_plans"]["license_products"]["license_vendors"]["name"]
                else:
                    data["vendor_name"] = None
            else:
                data["product_name"] = None
                data["vendor_name"] = None
        else:
            data["plan_name"] = None
            data["product_name"] = None
            data["vendor_name"] = None
        
        # Remover los objetos anidados
        data.pop("license_plans", None)
        
        return LicenseRead(**data)
    
    def update_license(self, license_id: int, license_data: LicenseUpdate) -> LicenseRead:
        """Actualiza una licencia existente"""
        try:
            # Verificar que la licencia existe y obtener seats_in_use actual
            existing = self.supabase.table(self.table_name).select("license_id, seats_in_use").eq("license_id", license_id).execute()
        
            if not existing.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Licencia no encontrada"
                )
            
            current_seats_in_use = existing.data[0]["seats_in_use"]
            
            # Verificar plan si se está actualizando
            if license_data.plan_id:
                plan_check = self.supabase.table("license_plans").select("plan_id").eq("plan_id", license_data.plan_id).execute()
                
                if not plan_check.data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="El plan especificado no existe"
                    )
            
            # Verificar código único si se está actualizando
            if license_data.code:
                code_check = self.supabase.table(self.table_name).select("license_id").eq("code", license_data.code).neq("license_id", license_id).execute()
                
                if code_check.data:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Ya existe una licencia con ese código"
                    )
            
            # Verificar que seats_total no sea menor que seats_in_use
            if license_data.seats_total is not None and license_data.seats_total < current_seats_in_use:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No se puede reducir seats_total a {license_data.seats_total} porque hay {current_seats_in_use} seats en uso"
                )
            
            # Preparar datos para actualización
            update_data = {}
            if license_data.plan_id is not None:
                update_data["plan_id"] = license_data.plan_id
            if license_data.code is not None:
                update_data["code"] = license_data.code
            if license_data.seats_total is not None:
                update_data["seats_total"] = license_data.seats_total
            if license_data.start_date is not None:
                update_data["start_date"] = license_data.start_date.isoformat()
            if license_data.end_date is not None:
                update_data["end_date"] = license_data.end_date.isoformat()
            if license_data.renewal_date is not None:
                update_data["renewal_date"] = license_data.renewal_date.isoformat()
            if license_data.notes is not None:
                update_data["notes"] = license_data.notes
            
            if not update_data:
                # No hay cambios, devolver la licencia actual
                return self.get_license(license_id)
            
            # Actualizar licencia
            data = update_returning(self.supabase, self.table_name, ("license_id", license_id), update_data)
            
            # Calcular seats_available
            data["seats_available"] = data["seats_total"] - data["seats_in_use"]
            
            # Enriquecer con datos de plan, product y vendor
            if data.get("license_plans"):
                data["plan_name"] = data["license_plans"]["plan_name"]
                if data["license_plans"].get("license_products"):
                    data["product_name"] = data["license_plans"]["license_products"]["name"]
                    if data["license_plans"]["license_products"].get("license_vendors"):
                        data["vendor_name"] = data["license_plans"]["license_products"]["license_vendors"]["name"]
                    else:
                        data["vendor_name"] = None
                else:
                    data["product_name"] = None
                    data["vendor_name"] = None
            else:
                data["plan_name"] = None
                data["product_name"] = None
                data["vendor_name"] = None
            
            # Remover los objetos anidados
            data.pop("license_plans", None)
            
            return LicenseRead(**data)
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error interno al actualizar licencia: {str(e)}"
            )
    
    def delete_license(self, license_id: int) -> bool:
        """Elimina una licencia"""
        # Verificar si hay asignaciones activas
        assignments_check = self.supabase.table("license_assignments").select("assignment_id").eq("license_id", license_id).eq("status", "active").limit(1).execute()
        
        if assignments_check.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar la licencia porque tiene asignaciones activas"
            )
        
        # Eliminar licencia
        delete_match(self.supabase, self.table_name, ("license_id", license_id))
        return True
    
    def get_license_capacity(self, license_id: int) -> LicenseCapacity:
        """Obtiene la capacidad de una licencia"""
        data = exec_single(
            self.supabase, 
            self.table_name, 
            select_fields="license_id, seats_total, seats_in_use",
            match=("license_id", license_id)
        )
        
        seats_available = data["seats_total"] - data["seats_in_use"]
        
        return LicenseCapacity(
            license_id=data["license_id"],
            seats_total=data["seats_total"],
            seats_in_use=data["seats_in_use"],
            seats_available=seats_available
        )
