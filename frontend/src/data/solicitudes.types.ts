import { z } from "zod";

export type SolicitudRow = {
  solicitud_id: number;
  equipo_id: number;
  solicitante_id: string;
  descripcion: string | null;
  estado_solicitud_id: number;
  servicio_id: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  // denormalizados
  equipo_label?: string;
  solicitante_nombre?: string | null;
  estado_solicitud_nombre?: string;
};

export type EstadoSolicitudLite = {
  estado_solicitud_id: number;
  nombre: string;
};

export const ESTADOS_SOLICITUD: Record<number, string> = {
  1: "Enviada",
  2: "En revisión",
  3: "Aprobada",
  4: "Rechazada",
  5: "Convertida",
};

export type EquipoLite = {
  equipo_id: number;
  tipo_equipo: string | null;
  marca: string | null;
  modelo: string | null;
  num_serie: string | null;
};

export function buildEquipoLabel(e: EquipoLite | null | undefined): string {
  if (!e) return "";
  const parts = [
    e.tipo_equipo,
    e.marca,
    e.modelo,
    e.num_serie ? `(${e.num_serie})` : null,
  ].filter(Boolean);
  return parts.join(" - ");
}

export function estadoSolicitudPillClasses(estadoId?: number | null): string {
  const base = "inline-flex rounded-full px-2.5 py-1 text-xs font-medium border";
  switch (estadoId) {
    case 1:
      return `${base} border-amber-200 bg-amber-100 text-amber-800`;
    case 2:
      return `${base} border-sky-200 bg-sky-100 text-sky-800`;
    case 3:
      return `${base} border-emerald-200 bg-emerald-100 text-emerald-800`;
    case 4:
      return `${base} border-rose-200 bg-rose-100 text-rose-800`;
    case 5:
      return `${base} border-slate-200 bg-slate-100 text-slate-800`;
    default:
      return `${base} border-gray-200 bg-gray-100 text-gray-800`;
  }
}

export const SolicitudFormSchema = z.object({
  equipo_id: z.number().int().min(1, "Requerido"),
  descripcion: z.string().max(1000).optional(),
});

export type SolicitudFormValues = z.infer<typeof SolicitudFormSchema>;

export const PAGE_SIZE_SOLICITUDES = 10;

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


