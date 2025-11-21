// FILE: frontend/src/data/users.repository.ts
// fix: refactorizar siguiendo el patrón del módulo de equipos que funciona correctamente
import { supabase } from '@/lib/supabase';
import { apiPost, apiDelete } from '@/services/api';
import type { ListFiltros, UserRow, UserRole } from './users.types';
import { nullify } from './users.types';

const TABLE = 'profiles';

/* -------------------------------- LISTAR ----------------------------------- */
export async function getUsers(): Promise<UserRow[]> {
  // fix: Use direct Supabase for listing users (no backend endpoint needed)
  const { data, error } = await supabase.from('profiles').select('*').order('full_name');
  if (error) throw error;
  return data || [];
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
    // fix: Use new API service that sends Supabase JWT token
    return await apiPost("/users", body);
  } catch (err: any) {
    // fix: Enhanced error handling
    let errorMessage = err.message;
    if (err.response?.data?.detail) {
      errorMessage = typeof err.response.data.detail === "string" ? err.response.data.detail : JSON.stringify(err.response.data.detail);
    } else if (err.response?.data?.message) {
      errorMessage = typeof err.response.data.message === "string" ? err.response.data.message : JSON.stringify(err.response.data.message);
    }
    
    // Log para debugging
    console.error("[CREATE USER ERROR]", {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
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

/* ------------------------------- ELIMINAR ----------------------------------- */
export async function deleteUser(user_id: string): Promise<void> {
  try {
    await apiDelete(`/users/${user_id}`);
  } catch (err: any) {
    // Enhanced error handling
    let errorMessage = err.message;
    if (err.response?.data?.detail) {
      errorMessage = typeof err.response.data.detail === "string" ? err.response.data.detail : JSON.stringify(err.response.data.detail);
    } else if (err.response?.data?.message) {
      errorMessage = typeof err.response.data.message === "string" ? err.response.data.message : JSON.stringify(err.response.data.message);
    }
    
    // Log para debugging
    console.error("[DELETE USER ERROR]", {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: errorMessage
    });
    
    throw new Error(errorMessage);
  }
}
