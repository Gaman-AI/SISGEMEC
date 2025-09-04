import { supabase } from "../lib/supabaseClient";
import type { TipoServicioRow } from "./tipos-servicio.types";
import { nullify } from "./tipos-servicio.types";

export async function listTiposServicio(args: {
  page: number;
  pageSize: number;
  search?: string;
  active?: '' | boolean;
}) {
  const page = args.page ?? 1;
  const pageSize = args.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("tipos_servicio")
    .select("*", { count: "exact" })
    .order("nombre", { ascending: true })
    .range(from, to);

  const s = (args.search ?? "").trim();
  if (s) q = q.or(`nombre.ilike.%${s}%,descripcion.ilike.%${s}%`);

  if (args.active !== undefined && args.active !== "") {
    q = q.eq("activo", args.active as boolean);
  }

  const { data, error, count } = await q;
  if (error) return { data: [] as TipoServicioRow[], count: 0, error };
  return { data: (data ?? []) as TipoServicioRow[], count: count ?? 0, error: null };
}

export async function getTipoServicioById(id: number) {
  const { data, error } = await supabase
    .from("tipos_servicio")
    .select("*")
    .eq("tipo_servicio_id", id)
    .single();
  return { data: (data as TipoServicioRow) ?? null, error };
}

export async function createTipoServicio(payload: {
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}) {
  const values = nullify({
    nombre: payload.nombre,
    descripcion: payload.descripcion ?? null,
    activo: payload.activo ?? true,
  });
  const { data, error } = await supabase
    .from("tipos_servicio")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as TipoServicioRow;
}

export async function updateTipoServicio(
  id: number,
  payload: { nombre?: string; descripcion?: string | null; activo?: boolean }
) {
  const values = nullify(payload as Record<string, any>);
  const { data, error } = await supabase
    .from("tipos_servicio")
    .update(values)
    .eq("tipo_servicio_id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TipoServicioRow;
}

export async function toggleTipoServicioActivo(id: number, nuevoActivo: boolean) {
  const { data, error } = await supabase
    .from("tipos_servicio")
    .update({ activo: nuevoActivo })
    .eq("tipo_servicio_id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as TipoServicioRow;
}


