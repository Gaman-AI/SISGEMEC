import { apiGet } from "@/services/api";

export interface EquipoOption {
  equipo_id: number;
  etiqueta: string;
}

export interface TipoServicioOption {
  tipo_servicio_id: number;
  nombre: string;
}

export const CatalogService = {
  async fetchEquiposByEmail(email: string): Promise<EquipoOption[]> {
    if (!email || !email.trim()) return [];
    try {
      const data = await apiGet(`/catalog/equipos?email=${encodeURIComponent(email.trim())}`);
      return Array.isArray(data) ? data : [];
    } catch (e: any) {
      console.warn("[CatalogService] Error fetching equipos:", e?.message ?? e);
      return [];
    }
  },

  async fetchTiposServicio(): Promise<TipoServicioOption[]> {
    try {
      const data = await apiGet(`/catalog/tipos-servicio`);
      return Array.isArray(data) ? data : [];
    } catch (e: any) {
      console.warn("[CatalogService] Error fetching tipos servicio:", e?.message ?? e);
      return [];
    }
  },
};

