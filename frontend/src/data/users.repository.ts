// src/data/users.repository.ts
import { supabase } from '@/lib/supabase';
import type { ListFiltros, UserRow, UserRole } from './users.types';
import { nullify } from './users.types';

/* -------------------------------- LISTAR ----------------------------------- */
export async function listUsers(args: ListFiltros = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('full_name', { ascending: true })
    .range(from, to);

  const s = (args.search ?? '').trim();
  if (s) q = q.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,department.ilike.%${s}%`);

  // Evitar narrow a UserRole antes de comparar con ''
  if (args.role !== undefined && args.role !== '') {
    q = q.eq('role', args.role as UserRole);
  }
  if (args.active !== '' && args.active !== undefined) {
    q = q.eq('active', args.active as boolean);
  }
  if (args.department && args.department !== '') {
    q = q.ilike('department', `%${args.department}%`);
  }

  const { data, error, count } = await q;
  if (error) return { data: [] as UserRow[], count: 0, error };
  return { data: (data ?? []) as UserRow[], count: count ?? 0, error: null };
}

/* ------------------------------- OBTENER ----------------------------------- */
export async function getUserById(user_id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user_id)
    .single();
  return { data: (data as UserRow) ?? null, error };
}

/* ------------------------------- CREAR ------------------------------------- */
/**
 * Crea el usuario en Auth y pasa metadata.
 * El perfil en public.profiles lo inserta el TRIGGER (handle_new_user).
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
  const { data: sign, error: signErr } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.full_name,
        department: payload.department ?? null,
        phone: payload.phone ?? null,
        location: payload.location ?? null,
        role: payload.role,
        active: payload.active ?? true,
      },
    },
  });
  if (signErr) throw signErr;
  // El trigger creará el registro en profiles; devolvemos el user creado
  return sign.user ?? null;
}

/* ------------------------------- ACTUALIZAR -------------------------------- */
export async function updateUserProfile(
  user_id: string,
  fields: Partial<Omit<UserRow, 'user_id'>>
) {
  const values = nullify(fields as Record<string, any>);
  const { data, error } = await supabase
    .from('profiles')
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
    .from('profiles')
    .update({ active })
    .eq('user_id', user_id)
    .select('*')
    .single();
  if (error) throw error;
  return data as UserRow;
}
