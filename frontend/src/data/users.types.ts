// src/data/users.types.ts
import { z } from 'zod';

/* ---------------------------------- TIPOS ---------------------------------- */

export type UserRole = 'ADMIN' | 'TECNICO' | 'RESPONSABLE';

export type UserRow = {
  user_id: string;
  full_name: string;
  email: string | null;
  department?: string | null;
  phone?: string | null;
  location?: string | null;
  role: UserRole;
  active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Filtros para listar usuarios (server-side) */
export type ListFiltros = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole | '';       // '' = todos
  active?: boolean | '';      // '' = todos
  department?: string | '';   // '' = todos
};

/* ----------------------------- SCHEMAS (Zod) ------------------------------- */
/** Crear usuario: incluye password (para auth.signUp) */
export const UserCreateSchema = z.object({
  full_name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  department: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  role: z.enum(['ADMIN', 'TECNICO', 'RESPONSABLE']).default('RESPONSABLE'),
  active: z.boolean().default(true),
});
export type UserCreateValues = z.infer<typeof UserCreateSchema>;

/** Editar usuario: sin password */
export const UserEditSchema = z.object({
  full_name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido').nullable().optional(),
  department: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  role: z.enum(['ADMIN', 'TECNICO', 'RESPONSABLE']),
  active: z.boolean(),
});
export type UserEditValues = z.infer<typeof UserEditSchema>;

/* ------------------------------ UTILIDADES --------------------------------- */
/** Convierte '' → null y elimina keys undefined para payloads limpios */
export function nullify<T extends Record<string, any>>(obj: T): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (typeof v === 'string') {
      const t = v.trim();
      out[k] = t === '' ? null : t;
    } else {
      out[k] = v;
    }
  }
  return out;
}
