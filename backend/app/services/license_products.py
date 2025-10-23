from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.core.supabase_client import get_supabase
from app.schemas.licenses import ProductCreate, ProductUpdate, ProductRead, ProductsFilters, PaginatedResponse
from ._supabase_v2 import exec_select_paged, exec_single, insert_returning, update_returning, delete_match


class LicenseProductsService:
    """Service para gestión de productos de licencias"""
    
    def __init__(self):
        self.supabase = get_supabase()
        self.table_name = "license_products"
    
    def list_products(self, filters: ProductsFilters) -> PaginatedResponse:
        """Lista productos con filtros y paginación"""
        res = exec_select_paged(
            self.supabase,
            self.table_name,
            select_fields="*, license_vendors(name)",
            page=filters.page,
            size=filters.size,
            order_by="name",
            ilike_fields=[("name", filters.search)] if filters.search else None,
            eq_fields=[("vendor_id", filters.vendor_id)] if filters.vendor_id else None,
        )
        
        # Enriquecer datos con vendor_name
        enriched_data = []
        for item in res["data"]:
            enriched_item = dict(item)
            if item.get("license_vendors"):
                enriched_item["vendor_name"] = item["license_vendors"]["name"]
            else:
                enriched_item["vendor_name"] = None
            # Remover el objeto anidado
            enriched_item.pop("license_vendors", None)
            enriched_data.append(enriched_item)
        
        res["data"] = enriched_data
        return PaginatedResponse(**res)
    
    def get_product(self, product_id: int) -> ProductRead:
        """Obtiene un producto por ID"""
        data = exec_single(
            self.supabase, 
            self.table_name, 
            select_fields="*, license_vendors(name)",
            match=("product_id", product_id)
        )
        
        # Enriquecer con vendor_name
        if data.get("license_vendors"):
            data["vendor_name"] = data["license_vendors"]["name"]
        else:
            data["vendor_name"] = None
        data.pop("license_vendors", None)
        
        return ProductRead(**data)
    
    def create_product(self, product_data: ProductCreate) -> ProductRead:
        """Crea un nuevo producto"""
        # Verificar que el vendor existe
        vendor_check = self.supabase.table("license_vendors").select("vendor_id").eq("vendor_id", product_data.vendor_id).execute()
        
        if not vendor_check.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El vendor especificado no existe"
            )
        
        # Verificar si ya existe un producto con el mismo nombre para este vendor
        existing = self.supabase.table(self.table_name).select("product_id").eq("name", product_data.name).eq("vendor_id", product_data.vendor_id).execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un producto con ese nombre para este vendor"
            )
        
        # Crear producto
        payload = {
            "vendor_id": product_data.vendor_id,
            "name": product_data.name,
            "description": product_data.description
        }
        data = insert_returning(self.supabase, self.table_name, payload)
        
        # Enriquecer con vendor_name
        if data.get("license_vendors"):
            data["vendor_name"] = data["license_vendors"]["name"]
        else:
            data["vendor_name"] = None
        data.pop("license_vendors", None)
        
        return ProductRead(**data)
    
    def update_product(self, product_id: int, product_data: ProductUpdate) -> ProductRead:
        """Actualiza un producto existente"""
        # Verificar vendor si se está actualizando
        if product_data.vendor_id:
            vendor_check = self.supabase.table("license_vendors").select("vendor_id").eq("vendor_id", product_data.vendor_id).execute()
            
            if not vendor_check.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El vendor especificado no existe"
                )
        
        # Verificar nombre único si se está actualizando
        if product_data.name:
            # Obtener vendor_id actual para la verificación
            current = self.supabase.table(self.table_name).select("vendor_id").eq("product_id", product_id).execute()
            if not current.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
            
            vendor_id_to_check = product_data.vendor_id or current.data[0].get("vendor_id")
            name_check = self.supabase.table(self.table_name).select("product_id").eq("name", product_data.name).eq("vendor_id", vendor_id_to_check).neq("product_id", product_id).execute()
            
            if name_check.data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe un producto con ese nombre para este vendor"
                )
        
        # Preparar datos para actualización
        update_data = {}
        if product_data.vendor_id is not None:
            update_data["vendor_id"] = product_data.vendor_id
        if product_data.name is not None:
            update_data["name"] = product_data.name
        if product_data.description is not None:
            update_data["description"] = product_data.description
        
        if not update_data:
            # No hay cambios, devolver el producto actual
            return self.get_product(product_id)
        
        # Actualizar producto
        data = update_returning(self.supabase, self.table_name, ("product_id", product_id), update_data)
        
        # Enriquecer con vendor_name
        if data.get("license_vendors"):
            data["vendor_name"] = data["license_vendors"]["name"]
        else:
            data["vendor_name"] = None
        data.pop("license_vendors", None)
        
        return ProductRead(**data)
    
    def delete_product(self, product_id: int) -> bool:
        """Elimina un producto"""
        # Verificar si hay planes asociados
        plans_check = self.supabase.table("license_plans").select("plan_id").eq("product_id", product_id).limit(1).execute()
        
        if plans_check.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar el producto porque tiene planes asociados"
            )
        
        # Eliminar producto
        delete_match(self.supabase, self.table_name, ("product_id", product_id))
        return True
