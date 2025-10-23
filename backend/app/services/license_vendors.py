from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.core.supabase_client import get_supabase
from app.schemas.licenses import VendorCreate, VendorUpdate, VendorRead, VendorsFilters, PaginatedResponse
from ._supabase_v2 import exec_select_paged, exec_single, insert_returning, update_returning, delete_match


class LicenseVendorsService:
    """Service para gestión de vendors de licencias"""
    
    def __init__(self):
        self.supabase = get_supabase()
        self.table_name = "license_vendors"
    
    def list_vendors(self, filters: VendorsFilters) -> PaginatedResponse:
        """Lista vendors con filtros y paginación"""
        res = exec_select_paged(
            self.supabase,
            self.table_name,
            select_fields="*",
            page=filters.page,
            size=filters.size,
            order_by="name",
            ilike_fields=[("name", filters.search)] if filters.search else None,
        )
        return PaginatedResponse(**res)
    
    def get_vendor(self, vendor_id: int) -> VendorRead:
        """Obtiene un vendor por ID"""
        data = exec_single(self.supabase, self.table_name, match=("vendor_id", vendor_id))
        return VendorRead(**data)
    
    def create_vendor(self, vendor_data: VendorCreate) -> VendorRead:
        """Crea un nuevo vendor"""
        # Verificar si ya existe un vendor con el mismo nombre
        existing = self.supabase.table(self.table_name).select("vendor_id").eq("name", vendor_data.name).execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un vendor con ese nombre"
            )
        
        # Crear vendor
        payload = {
            "name": vendor_data.name,
            "website": vendor_data.website
        }
        data = insert_returning(self.supabase, self.table_name, payload)
        return VendorRead(**data)
    
    def update_vendor(self, vendor_id: int, vendor_data: VendorUpdate) -> VendorRead:
        """Actualiza un vendor existente"""
        # Verificar nombre único si se está actualizando
        if vendor_data.name:
            name_check = self.supabase.table(self.table_name).select("vendor_id").eq("name", vendor_data.name).neq("vendor_id", vendor_id).execute()
            
            if name_check.data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe un vendor con ese nombre"
                )
        
        # Preparar datos para actualización
        update_data = {}
        if vendor_data.name is not None:
            update_data["name"] = vendor_data.name
        if vendor_data.website is not None:
            update_data["website"] = vendor_data.website
        
        if not update_data:
            # No hay cambios, devolver el vendor actual
            return self.get_vendor(vendor_id)
        
        # Actualizar vendor
        data = update_returning(self.supabase, self.table_name, ("vendor_id", vendor_id), update_data)
        return VendorRead(**data)
    
    def delete_vendor(self, vendor_id: int) -> bool:
        """Elimina un vendor"""
        # Verificar si hay productos asociados
        products_check = self.supabase.table("license_products").select("product_id").eq("vendor_id", vendor_id).limit(1).execute()
        
        if products_check.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar el vendor porque tiene productos asociados"
            )
        
        # Eliminar vendor
        delete_match(self.supabase, self.table_name, ("vendor_id", vendor_id))
        return True
