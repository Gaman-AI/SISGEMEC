import { apiGet, api } from '@/services/api';

// Tipos para los filtros
export interface EquiposFilters {
  tipo_equipo?: string;
  marca?: string;
  estado_equipo?: string;
  responsable_id?: string;
  num_serie?: string;
  ubicacion_actual?: string;
  from_dt?: string; // YYYY-MM-DD
  to_dt?: string;   // YYYY-MM-DD
  page?: number;
  size?: number;
}

export interface ServiciosFilters {
  tipo_servicio?: string;
  estado_servicio?: string;
  equipo_id?: number;
  num_serie?: string;
  from_dt?: string; // YYYY-MM-DD
  to_dt?: string;   // YYYY-MM-DD
  page?: number;
  size?: number;
}

// Tipos para las respuestas
export interface ReportPage {
  items: any[];
  total: number;
  page: number;
  size: number;
  summary?: {
    equipos_por_estado?: Array<{ estado_equipo: string; total: number }>;
    servicios_por_tipo?: Array<{ tipo_servicio: string; total: number }>;
  };
}

// Función auxiliar para limpiar parámetros
function cleanParams(params: Record<string, any>): Record<string, any> {
  const out: any = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v === undefined || v === null || v === '') continue;
    // Si es string con solo espacios
    if (typeof v === 'string' && v.trim() === '') continue;
    // Si es número no finito (NaN / Infinity)
    if (typeof v === 'number' && !Number.isFinite(v)) continue;
    // Si es string "NaN"
    if (typeof v === 'string' && v.toLowerCase() === 'nan') continue;
    out[k] = v;
  }
  return out;
}

// Función auxiliar para descargar blob
function downloadBlob(blob: Blob, filename: string): void {
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

// Repository de reportes
export class ReportesRepository {
  
  /**
   * Obtiene reporte de equipos con filtros y paginación
   */
  async fetchReportEquipos(filters: EquiposFilters): Promise<ReportPage> {
    const clean = cleanParams(filters);
    return await apiGet('/reportes/equipos', { params: clean });
  }
  
  /**
   * Obtiene reporte de servicios con filtros y paginación
   */
  async fetchReportServicios(filters: ServiciosFilters): Promise<ReportPage> {
    const clean = cleanParams(filters);
    return await apiGet('/reportes/servicios', { params: clean });
  }
  
  /**
   * Obtiene catálogos para filtros de servicios
   */
  async fetchServiciosCatalogs(): Promise<{
    tipo_servicio: string[];
    estado_servicio: string[];
    num_serie: string[];
    fecha_min: string;
    fecha_max: string;
  }> {
    return await apiGet('/reportes/servicios/catalogs');
  }
  
  /**
   * Exporta reporte a Excel o PDF
   * Usa el endpoint unificado /reportes/{slug}/export según el backend
   */
  async exportReport(
    slug: 'equipos' | 'servicios',
    format: 'excel' | 'pdf',
    filters: EquiposFilters | ServiciosFilters
  ): Promise<Blob> {
    const clean = cleanParams({ ...filters, format });
    const res = await api.get(`/reportes/${slug}/export`, {
      params: clean,
      responseType: 'blob'
    });
    return res.data as Blob;
  }
}

// Instancia singleton
export const reportesRepo = new ReportesRepository();
