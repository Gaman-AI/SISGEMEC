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

export async function countResponsablesNuevosSemana() {
  function getWeekRangeISO() {
    const now = new Date();
    // 0=Dom,1=Lun,...  Queremos Lunes como inicio
    const day = now.getDay(); // 0..6
    const diffToMonday = (day === 0 ? -6 : 1 - day); // si es domingo, retrocede 6
    const start = new Date(now);
    start.setHours(0,0,0,0);
    start.setDate(now.getDate() + diffToMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23,59,59,999);

    return {
      startISO: start.toISOString(),
      endISO: end.toISOString()
    };
  }

  const { startISO, endISO } = getWeekRangeISO();
  const tables = ['profiles', 'usuarios'];
  const cols = ['created_at', 'fecha_creacion', 'fecha_alta'];
  for (const t of tables) {
    for (const c of cols) {
      const { count, error } = await supabase
        .from(t)
        .select('*', { count: 'exact', head: true })
        .eq('role', 'RESPONSABLE')
        .gte(c, startISO)
        .lte(c, endISO);
      if (!error && count !== null) return { count, error: null };
    }
  }
  console.warn('countResponsablesNuevosSemana: no matching column found');
  return { count: 0, error: null };
}
