import { supabase } from '@/lib/supabase';

// NUEVO: contar responsables activos
export async function countResponsablesActivos() {
  // Preferencia 1: profiles.role + profiles.active
  let q = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'RESPONSABLE')
    .eq('active', true);

  const { count, error } = await q;
  if (error) {
    console.warn('countResponsablesActivos:error', error);
    return { count: 0, error };
  }
  return { count: count ?? 0, error: null };
}
