from typing import List, Dict, Any
from datetime import datetime, timezone

# Supabase service client flexible (mismo patrón que tickets_service)
try:
    from app.deps.supabase_client import supa_service  # proyecto A
except Exception:
    try:
        from app.core.supabase_client import get_supabase  # proyecto B
        def supa_service():
            return get_supabase()
    except Exception:
        supa_service = None  # será validado al construir

TABLE_EQUIPOS = "equipos"
TABLE_TIPOS = "tipos_servicio"
TABLE_PROFILES = "profiles"

class CatalogService:
    def __init__(self):
        if supa_service is None:
            raise RuntimeError("No se encontró supa_service. Ajusta el import en catalog_service.py")
        self.sb = supa_service()

    def equipos_by_email(self, email: str) -> List[Dict[str, Any]]:
        """
        Buscar equipos asociados a un responsable por su email.
        Primero busca el user_id del perfil, luego los equipos relacionados.
        """
        if not email or not email.strip():
            return []

        # Primero buscar el perfil por email para obtener el user_id
        profile_res = (
            self.sb.table(TABLE_PROFILES)
            .select("user_id, email")
            .eq("email", email.strip().lower())
            .execute()
        )
        
        profiles = profile_res.data or []
        if not profiles:
            # No hay perfil con ese email
            return []
        
        user_id = profiles[0].get("user_id")
        if not user_id:
            return []

        # Buscar equipos por responsable_id
        equipos_res = (
            self.sb.table(TABLE_EQUIPOS)
            .select("equipo_id, num_serie, marca, modelo, tipo_equipo")
            .eq("responsable_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        items = equipos_res.data or []
        out = []
        for it in items:
            # Construir etiqueta descriptiva
            num_serie = it.get("num_serie") or "SN"
            marca = it.get("marca") or ""
            modelo = it.get("modelo") or ""
            tipo = it.get("tipo_equipo") or ""
            
            parts = [num_serie]
            if marca or modelo:
                parts.append(f"{marca} {modelo}".strip())
            if tipo:
                parts.append(f"({tipo})")
            
            etiqueta = " • ".join(parts)
            
            out.append({
                "equipo_id": it.get("equipo_id"),
                "etiqueta": etiqueta if etiqueta else f"Equipo #{it.get('equipo_id')}",
            })
        
        return out

    def tipos_servicio(self) -> List[Dict[str, Any]]:
        """Obtener catálogo completo de tipos de servicio"""
        tipos_res = (
            self.sb.table(TABLE_TIPOS)
            .select("tipo_servicio_id, nombre")
            .order("nombre", desc=False)
            .execute()
        )
        
        items = tipos_res.data or []
        return [
            {
                "tipo_servicio_id": it.get("tipo_servicio_id"),
                "nombre": it.get("nombre") or "",
            }
            for it in items
            if it.get("tipo_servicio_id") and it.get("nombre")
        ]

