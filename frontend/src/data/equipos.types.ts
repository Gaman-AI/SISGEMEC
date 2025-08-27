import { z } from 'zod';

export type EstadoEquipo = {
  id: number;
  nombre: string;
};

export type Responsable = {
  user_id: string;
  full_name: string;
};

export type Equipo = {
  equipo_id?: number;
  tipo_equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  num_serie?: string | null;
  procesador?: string | null;
  ram?: string | null;
  disco?: string | null;
  sistema_operativo?: string | null;
  ubicacion_actual?: string | null;
  estado_equipo_id?: number | null;
  fecha_ingreso?: string | null;
  fecha_salida?: string | null;
  responsable_id?: string | null;
  observaciones?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export const EquipoFormSchema = z.object({
  tipo_equipo: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  num_serie: z.string().optional(),
  procesador: z.string().optional(),
  ram: z.string().optional(),
  disco: z.string().optional(),
  sistema_operativo: z.string().optional(),
  ubicacion_actual: z.string().optional(),
  estado_equipo_id: z.coerce.number().optional(),
  responsable_id: z.string().uuid().optional(),
  fecha_ingreso: z.string().optional(),
  fecha_salida: z.string().optional(),
  observaciones: z.string().optional(),
});
export type EquipoFormValues = z.infer<typeof EquipoFormSchema>;

export const nullify = <T extends Record<string, any>>(obj: T) => {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    if (typeof v === 'string') out[k] = v.trim() === '' ? null : v;
    else if (v === undefined) out[k] = null;
    else out[k] = v;
  }
  return out as T;
};

export type ListFiltros = {
  search?: string;
  tipo_equipo?: string | null;
  estado_equipo_id?: number | null;
  responsable_id?: string | null;
  ingreso_desde?: string | null;
  ingreso_hasta?: string | null;
};
