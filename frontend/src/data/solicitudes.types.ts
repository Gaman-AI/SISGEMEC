// frontend/src/data/solicitudes.types.ts
import { z } from "zod";

export type EstadoSolicitudId = 1 | 2 | 3 | 4 | 5;

export const ESTADOS_SOLICITUD_LABEL: Record<number, string> = {
  1: "Enviada",
  2: "En revisión",
  3: "Aprobada",
  4: "Rechazada",
  5: "Convertida",
};

export type SolicitudRow = {
  solicitud_id: number;
  equipo_id: number;
  solicitante_id: string; // UUID de profiles.user_id
  descripcion: string | null;
  estado_solicitud_id: EstadoSolicitudId;
  servicio_id: number | null;
  created_at: string; // ISO
  updated_at: string | null;

  // denormalizados (opcionales):
  equipo_label?: string;
  solicitante_nombre?: string;
  estado_solicitud_nombre?: string;
};

export type ListSolicitudesParams = {
  page: number; // 1-based
  pageSize: number; // 10
  search?: string;
  estadoId?: number | null;
  solicitanteId?: string | null;
  equipoId?: number | null;
  fromDate?: string | null; // YYYY-MM-DD
  toDate?: string | null; // YYYY-MM-DD
};

export type EquipoLite = {
  equipo_id: number;
  tipo_equipo: string | null;
  marca: string | null;
  modelo: string | null;
  num_serie: string | null;
};

export type ResponsableLite = {
  user_id: string;
  full_name: string | null;
};

export function buildEquipoLabel(e: EquipoLite): string {
  const tipo = e.tipo_equipo ?? "Equipo";
  const marcaModelo = [e.marca, e.modelo].filter(Boolean).join(" ");
  const serie = e.num_serie ? `(${e.num_serie})` : "";
  return [tipo, marcaModelo, serie].filter(Boolean).join(" ").trim();
}

export const PAGE_SIZE_SOLICITUDES = 10;

/* =======================
   ✅ FORM SCHEMA (Zod)
   ======================= */
export const SolicitudFormSchema = z.object({
  equipo_id: z.number().min(1, "Selecciona un equipo"),
  descripcion: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type SolicitudFormValues = z.infer<typeof SolicitudFormSchema>;

/* =======================
   Utilidad: nullificar strings vacíos
   ======================= */
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
