// A:\Proyectos\SISGEMEC\frontend\src\data\equipos.repository.ts
import { supabase } from '../lib/supabaseClient';

type ListArgs = {
  page?: number;
  pageSize?: number;
  search?: string;
  estado_equipo_id?: number | null;
  responsable_id?: string | null;
  fecha_desde?: string | null; // YYYY-MM-DD
  fecha_hasta?: string | null;
};

const TABLE = 'equipos';

const clean = (obj: Record<string, any>) => {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue; // no enviar undefined
    if (typeof v === 'string') {
      const trimmed = v.trim();
      out[k] = trimmed === '' ? null : trimmed;
    } else {
      out[k] = v === undefined ? null : v;
    }
  }
  if (out.num_serie === null) delete out.num_serie; // no tocar UNIQUE si no hay serie
  return out;
};

export async function listEstados() {
  const { data, error } = await supabase.from('estados_equipo')
    .select('estado_equipo_id, nombre')
    .order('nombre', { ascending: true });
  if (error) return { data: [], error };
  return {
    data: (data ?? []).map((e: any) => ({ id: e.estado_equipo_id, nombre: e.nombre })),
    error: null,
  };
}

export async function listResponsables() {
  const { data, error } = await supabase.from('profiles')
    .select('user_id, full_name, active')
    .order('full_name', { ascending: true });
  if (error) return { data: [], error };
  return {
    data: (data ?? [])
      // si quieres solo activos, descomenta:
      // .filter((r: any) => r.active !== false)
      .map((r: any) => ({ user_id: r.user_id, full_name: r.full_name })),
    error: null,
  };
}

export async function listEquipos(args: ListArgs = {}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from(TABLE)
    .select('*', { count: 'exact' })
    .order('fecha_ingreso', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  // búsqueda OR por marca|modelo|num_serie
  const q = (args.search ?? '').trim();
  if (q) {
    query = query.or(
      `marca.ilike.%${q}%,modelo.ilike.%${q}%,num_serie.ilike.%${q}%`
    );
  }

  if (args.estado_equipo_id) {
    query = query.eq('estado_equipo_id', args.estado_equipo_id);
  }
  if (args.responsable_id) {
    query = query.eq('responsable_id', args.responsable_id);
  }
  if (args.fecha_desde) {
    query = query.gte('fecha_ingreso', args.fecha_desde);
  }
  if (args.fecha_hasta) {
    query = query.lte('fecha_ingreso', args.fecha_hasta);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error };

  // enriquecer con nombres (sin joins)
  const [estadosRes, respRes] = await Promise.all([listEstados(), listResponsables()]);
  const estadosMap = new Map(estadosRes.data.map((e: any) => [e.id, e.nombre]));
  const respMap = new Map(respRes.data.map((r: any) => [r.user_id, r.full_name]));

  const mapped = (data ?? []).map((row: any) => ({
    ...row,
    estado_nombre: row.estado_equipo_id ? estadosMap.get(row.estado_equipo_id) ?? null : null,
    responsable_nombre: row.responsable_id ? respMap.get(row.responsable_id) ?? null : null,
  }));

  return { data: mapped, count: count ?? mapped.length, error: null };
}

export async function getEquipoById(id: number) {
  const { data, error } = await supabase.from(TABLE)
    .select('*')
    .eq('equipo_id', id)
    .single();
  return { data, error };
}

export async function createEquipo(values: Record<string, any>) {
  const payload = clean(values);
  const { data, error } = await supabase.from(TABLE)
    .insert(payload)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateEquipo(id: number, values: Record<string, any>) {
  const payload = clean(values);
  const { data, error } = await supabase.from(TABLE)
    .update(payload)
    .eq('equipo_id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEquipo(id: number) {
  const { error } = await supabase.from(TABLE)
    .delete()
    .eq('equipo_id', id);
  if (error) return { error };
  return { ok: true };
}
