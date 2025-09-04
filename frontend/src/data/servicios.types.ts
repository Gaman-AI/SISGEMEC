import { z } from "zod";

export type ServicioRow = {
  servicio_id: number;
  fecha_servicio: string; // YYYY-MM-DD
  equipo_id: number;
  tipo_servicio_id: number;
  estado_servicio_id: number | null; // 1/2/3
  tecnico_id: string | null; // UUID
  descripcion: string | null;
  observaciones: string | null;
  // denormalizados (para listado/get):
  equipo_label?: string;              // "Laptop - Dell 5430 (SN123)"
  tipo_servicio_nombre?: string;
  estado_servicio_nombre?: string;
  tecnico_nombre?: string;
};

export type EquipoLite = {
  equipo_id: number;
  tipo_equipo: string | null;
  marca: string | null;
  modelo: string | null;
  num_serie: string | null;
};

export type TipoServicioLite = { 
  tipo_servicio_id: number; 
  nombre: string; 
};

export type EstadoServicioLite = { 
  estado_servicio_id: number; 
  nombre: string; 
};

export type TecnicoLite = { 
  user_id: string; 
  full_name: string | null; 
};

// NOTE: Desde Fase 2 se unifica rol operativo en ADMIN. tecnico_id representa admin asignado.
export type AdminLite = { user_id: string; full_name: string | null };

/**
 * @deprecated Usar AdminLite. Se mantiene por compatibilidad temporal.
 */
export type DeprecatedTecnicoLite = AdminLite;

export const PAGE_SIZE_SERVICIOS = 10;

export const ServicioFormSchema = z.object({
  equipo_id: z.number().int().min(1, 'Requerido'),
  tipo_servicio_id: z.number().int().min(1, 'Requerido'),
  estado_servicio_id: z.number().int().min(1, 'Requerido'), // 1/2/3
  tecnico_id: z.string().uuid().optional(),
  fecha_servicio: z.string().optional(), // YYYY-MM-DD
  descripcion: z.string().max(1000).optional(),
  observaciones: z.string().max(1000).optional(),
});

export type ServicioFormValues = z.infer<typeof ServicioFormSchema>;

export function buildEquipoLabel(e: EquipoLite | null | undefined): string {
  if (!e) return '';
  const parts = [
    e.tipo_equipo,
    e.marca,
    e.modelo,
    e.num_serie ? `(${e.num_serie})` : null
  ].filter(Boolean);
  return parts.join(' - ');
}

export function estadoToPillClasses(estadoId?: number | null): string {
  const base = "inline-flex rounded-full px-2.5 py-1 text-xs font-medium border";
  switch (estadoId) {
    case 1: // Pendiente
      return `${base} border-amber-200 bg-amber-100 text-amber-800`;
    case 2: // En atención
      return `${base} border-sky-200 bg-sky-100 text-sky-800`;
    case 3: // Atendido
      return `${base} border-emerald-200 bg-emerald-100 text-emerald-800`;
    default:
      return `${base} border-gray-200 bg-gray-100 text-gray-800`;
  }
}

export function nullify<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === "string") {
      const t = v.trim();
      out[k] = t === "" ? null : t;
    } else {
      out[k] = v;
    }
  }
  return out;
}
