// FILE: frontend/src/data/users.repository.ts
// fix: refactorizar siguiendo el patrón del módulo de equipos que funciona correctamente
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/axios';
import type { ListFiltros, UserRow, UserRole } from './users.types';
import { nullify } from './users.types';
import type { AxiosError } from 'axios';

const TABLE = 'profiles';

/* -------------------------------- LISTAR ----------------------------------- */
export async function getUsers(): Promise<UserRow[]> {
  const res = await api.get(`/users`, {
    // Evitar cache del navegador/proxy
    headers: {
      "Cache-Control": "no-store",
      "Pragma": "no-cache",
    },
    // Cache-buster en querystring para proxies agresivos
    params: { _ts: Date.now() },
  });
  return res.data;
}

export async function listUsers(args: ListFiltros = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from(TABLE)
    .select('*', { count: 'exact' })
    .order('full_name', { ascending: true })
    .range(from, to);

  // búsqueda OR por full_name|email|department
  const q = (args.search ?? '').trim();
  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,email.ilike.%${q}%,department.ilike.%${q}%`
    );
  }

  if (args.role !== undefined && args.role !== '') {
    query = query.eq('role', args.role as UserRole);
  }
  if (args.active !== '' && args.active !== undefined) {
    query = query.eq('active', args.active as boolean);
  }
  if (args.department && args.department !== '') {
    query = query.ilike('department', `%${args.department}%`);
  }

  const { data, error, count } = await query;
  if (error) return { data: [] as UserRow[], count: 0, error };
  return { data: (data ?? []) as UserRow[], count: count ?? 0, error: null };
}

/* ------------------------------- OBTENER ----------------------------------- */
export async function getUserById(user_id: string) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', user_id)
    .single();
  return { data: (data as UserRow) ?? null, error };
}

/* ------------------------------- CREAR ------------------------------------- */
/**
 * Crea el usuario usando el endpoint admin del backend (Service Role)
 * Siguiendo el patrón del módulo de equipos que funciona correctamente
 */
export async function createUser(payload: {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string | null;
  phone?: string | null;
  location?: string | null;
  active?: boolean;
}) {
  try {
    const body = { ...payload, email: String(payload.email || "").trim().toLowerCase() };
    // El interceptor inyecta automáticamente el Authorization header
    const res = await api.post("/users", body);
    return res.data;
  } catch (err) {
    const ax = err as AxiosError<any>;
    const detail = ax.response?.data?.detail;
    const message = ax.response?.data?.message;
    
    // Mejorar el manejo de errores
    let errorMessage = ax.message;
    if (detail) {
      errorMessage = typeof detail === "string" ? detail : JSON.stringify(detail);
    } else if (message) {
      errorMessage = typeof message === "string" ? message : JSON.stringify(message);
    }
    
    // Log para debugging
    console.error("[CREATE USER ERROR]", {
      status: ax.response?.status,
      statusText: ax.response?.statusText,
      data: ax.response?.data,
      message: errorMessage
    });
    
    throw new Error(errorMessage);
  }
}

/* ------------------------------- ACTUALIZAR -------------------------------- */
export async function updateUserProfile(
  user_id: string,
  fields: Partial<Omit<UserRow, 'user_id'>>
) {
  const values = nullify(fields as Record<string, any>);
  const { data, error } = await supabase
    .from(TABLE)
    .update(values)
    .eq('user_id', user_id)
    .select('*')
    .single();
  if (error) throw error;
  return data as UserRow;
}

/* --------------------------- ACTIVAR / DESACTIVAR -------------------------- */
export async function toggleUserActive(user_id: string, active: boolean) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ active })
    .eq('user_id', user_id)
    .select('*')
    .single();
  if (error) throw error;
  return data as UserRow;
}
