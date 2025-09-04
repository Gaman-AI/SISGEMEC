import { z } from "zod";

export type TipoServicioRow = {
  tipo_servicio_id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at?: string | null;
};

/**
 * IMPORTANTÍSIMO:
 * - Sin coerce, sin transform, sin default() -> entrada y salida iguales
 * - RHF nos da boolean real en checkboxes, así que no necesitamos coerce
 * - Los defaults se definen en useForm.defaultValues (no aquí)
 */
export const TipoServicioFormSchema = z.object({
  nombre: z.string().min(2, "Nombre muy corto").trim(),
  activo: z.boolean(), // requerido, sin default en el schema
  descripcion: z
    .string()
    .max(1000, "Máximo 1000 caracteres")
    .optional(), // string | undefined sin transform
});

export type TipoServicioFormValues = z.infer<typeof TipoServicioFormSchema>;

/** Utilidad para convertir "" -> null y quitar undefined antes de DB (si la necesitas) */
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



