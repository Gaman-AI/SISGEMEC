from typing import List, Dict, Any, Optional
from decimal import Decimal
from fastapi import HTTPException, status
from app.core.supabase_client import get_supabase
from app.schemas.licenses import PlanCreate, PlanUpdate, PlanRead, PlansFilters, PaginatedResponse
from ._supabase_v2 import exec_select_paged, exec_single, insert_returning, update_returning, delete_match


class LicensePlansService:
    """Service para gestión de planes de licencias"""
    
    def __init__(self):
        self.supabase = get_supabase()
        self.table_name = "license_plans"
    
    def list_plans(self, filters: PlansFilters) -> PaginatedResponse:
        """Lista planes con filtros y paginación"""
        # Construir filtros para exec_select_paged
        eq_fields = []
        if filters.product_id:
            eq_fields.append(("product_id", filters.product_id))
        if filters.billing_cycle:
            eq_fields.append(("billing_cycle", filters.billing_cycle))
        if filters.currency:
            eq_fields.append(("currency", filters.currency))
        
        # Para filtros de precio, necesitamos usar el cliente directo
        # ya que exec_select_paged no maneja gte/lte directamente
        try:
            query = self.supabase.table(self.table_name).select(
                "*, license_products(name, license_vendors(name))",
                count="exact"
            )
            
            # Aplicar filtros
            if filters.search:
                query = query.ilike("plan_name", f"%{filters.search}%")
            
            for col, val in eq_fields:
                query = query.eq(col, val)
            
            if filters.price_min is not None:
                query = query.gte("cost_per_cycle", float(filters.price_min))
            
            if filters.price_max is not None:
                query = query.lte("cost_per_cycle", float(filters.price_max))
            
            # Aplicar paginación
            offset = (filters.page - 1) * filters.size
            query = query.range(offset, offset + filters.size - 1)
            
            # Ordenar por nombre del plan
            query = query.order("plan_name")
            
            # Ejecutar query
            result = query.execute()
            
            data = result.data or []
            total = result.count or 0
            pages = (total + filters.size - 1) // filters.size
            
            # Enriquecer datos con product_name y vendor_name
            enriched_data = []
            for item in data:
                enriched_item = dict(item)
                if item.get("license_products"):
                    enriched_item["product_name"] = item["license_products"]["name"]
                    if item["license_products"].get("license_vendors"):
                        enriched_item["vendor_name"] = item["license_products"]["license_vendors"]["name"]
                    else:
                        enriched_item["vendor_name"] = None
                else:
                    enriched_item["product_name"] = None
                    enriched_item["vendor_name"] = None
                # Remover los objetos anidados
                enriched_item.pop("license_products", None)
                enriched_data.append(enriched_item)
            
            return PaginatedResponse(
                data=enriched_data,
                total=total,
                page=filters.page,
                size=filters.size,
                pages=pages
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error interno al listar planes: {str(e)}"
            )
    
    def get_plan(self, plan_id: int) -> PlanRead:
        """Obtiene un plan por ID"""
        data = exec_single(
            self.supabase, 
            self.table_name, 
            select_fields="*, license_products(name, license_vendors(name))",
            match=("plan_id", plan_id)
        )
        
        # Enriquecer con product_name y vendor_name
        if data.get("license_products"):
            data["product_name"] = data["license_products"]["name"]
            if data["license_products"].get("license_vendors"):
                data["vendor_name"] = data["license_products"]["license_vendors"]["name"]
            else:
                data["vendor_name"] = None
        else:
            data["product_name"] = None
            data["vendor_name"] = None
        data.pop("license_products", None)
        
        return PlanRead(**data)
    
    def create_plan(self, plan_data: PlanCreate) -> PlanRead:
        """Crea un nuevo plan"""
        # Verificar que el producto existe
        product_check = self.supabase.table("license_products").select("product_id").eq("product_id", plan_data.product_id).execute()
        
        if not product_check.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El producto especificado no existe"
            )
        
        # Verificar si ya existe un plan con el mismo nombre para este producto
        existing = self.supabase.table(self.table_name).select("plan_id").eq("plan_name", plan_data.plan_name).eq("product_id", plan_data.product_id).execute()
        
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe un plan con ese nombre para este producto"
            )
        
        # Preparar datos para inserción
        insert_data = {
            "product_id": plan_data.product_id,
            "plan_name": plan_data.plan_name,
            "billing_cycle": plan_data.billing_cycle,
            "seat_limit": plan_data.seat_limit,
            "features": plan_data.features,
            "currency": plan_data.currency,
            "cost_per_cycle": float(plan_data.cost_per_cycle) if plan_data.cost_per_cycle is not None else None
        }
        
        # Crear plan
        data = insert_returning(self.supabase, self.table_name, insert_data)
        
        # Enriquecer con product_name y vendor_name
        if data.get("license_products"):
            data["product_name"] = data["license_products"]["name"]
            if data["license_products"].get("license_vendors"):
                data["vendor_name"] = data["license_products"]["license_vendors"]["name"]
            else:
                data["vendor_name"] = None
        else:
            data["product_name"] = None
            data["vendor_name"] = None
        data.pop("license_products", None)
        
        return PlanRead(**data)
    
    def update_plan(self, plan_id: int, plan_data: PlanUpdate) -> PlanRead:
        """Actualiza un plan existente"""
        # Verificar producto si se está actualizando
        if plan_data.product_id:
            product_check = self.supabase.table("license_products").select("product_id").eq("product_id", plan_data.product_id).execute()
            
            if not product_check.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El producto especificado no existe"
                )
        
        # Verificar nombre único si se está actualizando
        if plan_data.plan_name:
            # Obtener product_id actual para la verificación
            current = self.supabase.table(self.table_name).select("product_id").eq("plan_id", plan_id).execute()
            if not current.data:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan no encontrado")
            
            product_id_to_check = plan_data.product_id or current.data[0].get("product_id")
            name_check = self.supabase.table(self.table_name).select("plan_id").eq("plan_name", plan_data.plan_name).eq("product_id", product_id_to_check).neq("plan_id", plan_id).execute()
            
            if name_check.data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ya existe un plan con ese nombre para este producto"
                )
        
        # Preparar datos para actualización
        update_data = {}
        if plan_data.product_id is not None:
            update_data["product_id"] = plan_data.product_id
        if plan_data.plan_name is not None:
            update_data["plan_name"] = plan_data.plan_name
        if plan_data.billing_cycle is not None:
            update_data["billing_cycle"] = plan_data.billing_cycle
        if plan_data.seat_limit is not None:
            update_data["seat_limit"] = plan_data.seat_limit
        if plan_data.features is not None:
            update_data["features"] = plan_data.features
        if plan_data.currency is not None:
            update_data["currency"] = plan_data.currency
        if plan_data.cost_per_cycle is not None:
            update_data["cost_per_cycle"] = float(plan_data.cost_per_cycle)
        
        if not update_data:
            # No hay cambios, devolver el plan actual
            return self.get_plan(plan_id)
        
        # Actualizar plan
        data = update_returning(self.supabase, self.table_name, ("plan_id", plan_id), update_data)
        
        # Enriquecer con product_name y vendor_name
        if data.get("license_products"):
            data["product_name"] = data["license_products"]["name"]
            if data["license_products"].get("license_vendors"):
                data["vendor_name"] = data["license_products"]["license_vendors"]["name"]
            else:
                data["vendor_name"] = None
        else:
            data["product_name"] = None
            data["vendor_name"] = None
        data.pop("license_products", None)
        
        return PlanRead(**data)
    
    def delete_plan(self, plan_id: int) -> bool:
        """Elimina un plan"""
        # Verificar si hay licencias asociadas
        licenses_check = self.supabase.table("licenses").select("license_id").eq("plan_id", plan_id).limit(1).execute()
        
        if licenses_check.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar el plan porque tiene licencias asociadas"
            )
        
        # Eliminar plan
        delete_match(self.supabase, self.table_name, ("plan_id", plan_id))
        return True
