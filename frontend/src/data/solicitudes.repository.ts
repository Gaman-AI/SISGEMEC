// frontend/src/data/solicitudes.repository.ts

import supabase from "@/lib/supabaseClient";
import {
  ESTADOS_SOLICITUD_LABEL,
  type ListSolicitudesParams,
  type SolicitudRow,
  type EquipoLite,
  type ResponsableLite,
  type EstadoSolicitudId,
  buildEquipoLabel,
  nullify,
} from "./solicitudes.types";

/* =========================================================
   Catálogos lite (para denormalizar labels en listados)
   ========================================================= */
export async function listEquiposLite(): Promise<{ data: EquipoLite[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("equipos")
    .select("equipo_id, tipo_equipo, marca, modelo, num_serie")
    .order("equipo_id", { ascending: true });

  return { data: (data as EquipoLite[]) ?? [], error: error ? new Error(error.message) : null };
}

export async function listResponsablesLite(): Promise<{ data: ResponsableLite[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, role, active")
    .eq("role", "RESPONSABLE")
    .eq("active", true)
    .order("full_name", { ascending: true });

  const rows =
    ((data as any[]) ?? []).map((r) => ({
      user_id: r.user_id as string,
      full_name: (r.full_name ?? null) as string | null,
    })) ?? [];

  return { data: rows, error: error ? new Error(error.message) : null };
}

/* =========================================================
   ✅ Catálogo de tipos de servicio (para convertir)
   ========================================================= */
export async function listTiposServicioLite(): Promise<{ data: Array<{ tipo_servicio_id: number; nombre: string }>; error: Error | null }> {
  const { data, error } = await supabase
    .from("tipos_servicio")
    .select("tipo_servicio_id, nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  return { data: (data as any[]) ?? [], error: error ? new Error(error.message) : null };
}

/* =========================================================
   ✅ Equipos del responsable autenticado (para MisEquiposList)
   ========================================================= */
export async function listEquiposPropiosLite(
  userId: string
): Promise<{ data: EquipoLite[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("equipos")
    .select("equipo_id, tipo_equipo, marca, modelo, num_serie")
    .eq("responsable_id", userId)
    .order("equipo_id", { ascending: true });

  return { data: (data as EquipoLite[]) ?? [], error: error ? new Error(error.message) : null };
}

/* =========================================================
   ✅ Crear solicitud (para MisSolicitudesForm)
   ========================================================= */
export async function createSolicitud(payload: {
  equipo_id: number;
  solicitante_id: string;
  descripcion?: string;
}): Promise<{ ok: boolean; error: Error | null }> {
  const insert = {
    equipo_id: payload.equipo_id,
    solicitante_id: payload.solicitante_id,
    descripcion: nullify({ descripcion: payload.descripcion ?? "" }).descripcion, // "" -> null
    estado_solicitud_id: 1 as const, // Enviada
  };

  const { error } = await supabase.from("solicitudes_servicio").insert(insert);
  if (error) return { ok: false, error: new Error(error.message) };
  return { ok: true, error: null };
}

/* =========================================================
   Listado Admin con filtros + denormalización
   ========================================================= */
export async function listSolicitudesAdmin(
  params: ListSolicitudesParams
): Promise<{ data: SolicitudRow[]; count: number; error: Error | null }> {
  const { page, pageSize, search, estadoId, fromDate, toDate } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("solicitudes_servicio")
    .select(
      "solicitud_id, equipo_id, solicitante_id, descripcion, estado_solicitud_id, servicio_id, created_at, updated_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search && search.trim() !== "") query = query.ilike("descripcion", `%${search.trim()}%`);
  if (typeof estadoId === "number") query = query.eq("estado_solicitud_id", estadoId);
  if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00`);
  if (toDate) query = query.lte("created_at", `${toDate}T23:59:59.999`);

  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error: new Error(error.message) };

  const rows = (data as SolicitudRow[]) ?? [];

  // Denormalización (equipo y responsable)
  const [eqLite, respLite] = await Promise.all([listEquiposLite(), listResponsablesLite()]);
  const eqMap = new Map<number, EquipoLite>();
  const respMap = new Map<string, ResponsableLite>();
  (eqLite.data || []).forEach((e) => eqMap.set(e.equipo_id, e));
  (respLite.data || []).forEach((r) => respMap.set(r.user_id, r));

  const denorm = rows.map((r) => {
    const e = r.equipo_id ? eqMap.get(r.equipo_id) : undefined;
    const u = r.solicitante_id ? respMap.get(r.solicitante_id) : undefined;
    return {
      ...r,
      equipo_label: e ? buildEquipoLabel(e) : `Equipo #${r.equipo_id}`,
      solicitante_nombre: u?.full_name ?? r.solicitante_id,
      estado_solicitud_nombre:
        ESTADOS_SOLICITUD_LABEL[r.estado_solicitud_id] ?? String(r.estado_solicitud_id),
    } as SolicitudRow;
  });

  return { data: denorm, count: count ?? denorm.length, error: null };
}

/* =========================================================
   ✅ Listado del Responsable (sus propias solicitudes)
   ========================================================= */
export async function listMisSolicitudes(
  params: ListSolicitudesParams & { solicitanteId: string }
): Promise<{ data: SolicitudRow[]; count: number; error: Error | null }> {
  const { page, pageSize, search, estadoId, fromDate, toDate, solicitanteId } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("solicitudes_servicio")
    .select(
      "solicitud_id, equipo_id, solicitante_id, descripcion, estado_solicitud_id, servicio_id, created_at, updated_at",
      { count: "exact" }
    )
    .eq("solicitante_id", solicitanteId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search && search.trim() !== "") query = query.ilike("descripcion", `%${search.trim()}%`);
  if (typeof estadoId === "number") query = query.eq("estado_solicitud_id", estadoId);
  if (fromDate) query = query.gte("created_at", `${fromDate}T00:00:00`);
  if (toDate) query = query.lte("created_at", `${toDate}T23:59:59.999`);

  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error: new Error(error.message) };

  const rows = (data as SolicitudRow[]) ?? [];

  // Denormalización (equipo y responsable)
  const [eqLite, respLite] = await Promise.all([listEquiposLite(), listResponsablesLite()]);
  const eqMap = new Map<number, EquipoLite>();
  const respMap = new Map<string, ResponsableLite>();
  (eqLite.data || []).forEach((e) => eqMap.set(e.equipo_id, e));
  (respLite.data || []).forEach((r) => respMap.set(r.user_id, r));

  const denorm = rows.map((r) => {
    const e = r.equipo_id ? eqMap.get(r.equipo_id) : undefined;
    const u = r.solicitante_id ? respMap.get(r.solicitante_id) : undefined;
    return {
      ...r,
      equipo_label: e ? buildEquipoLabel(e) : `Equipo #${r.equipo_id}`,
      solicitante_nombre: u?.full_name ?? r.solicitante_id,
      estado_solicitud_nombre:
        ESTADOS_SOLICITUD_LABEL[r.estado_solicitud_id] ?? String(r.estado_solicitud_id),
    } as SolicitudRow;
  });

  return { data: denorm, count: count ?? denorm.length, error: null };
}

/* =========================================================
   ✅ Obtener una solicitud por ID
   ========================================================= */
export async function getSolicitudById(
  id: number
): Promise<{ data: SolicitudRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("solicitudes_servicio")
    .select(
      "solicitud_id, equipo_id, solicitante_id, descripcion, estado_solicitud_id, servicio_id, created_at, updated_at"
    )
    .eq("solicitud_id", id)
    .maybeSingle();

  if (error) return { data: null, error: new Error(error.message) };
  if (!data) return { data: null, error: null };

  const base = data as SolicitudRow;

  const [eqLite, respLite] = await Promise.all([listEquiposLite(), listResponsablesLite()]);
  const eqMap = new Map<number, EquipoLite>();
  const respMap = new Map<string, ResponsableLite>();
  (eqLite.data || []).forEach((e) => eqMap.set(e.equipo_id, e));
  (respLite.data || []).forEach((r) => respMap.set(r.user_id, r));

  const e = eqMap.get(base.equipo_id);
  const u = respMap.get(base.solicitante_id);

  const denorm: SolicitudRow = {
    ...base,
    equipo_label: e ? buildEquipoLabel(e) : `Equipo #${base.equipo_id}`,
    solicitante_nombre: u?.full_name ?? base.solicitante_id,
    estado_solicitud_nombre:
      ESTADOS_SOLICITUD_LABEL[base.estado_solicitud_id] ?? String(base.estado_solicitud_id),
  };

  return { data: denorm, error: null };
}

/* =========================================================
   ✅ Actualizar estado de solicitud
   ========================================================= */
export async function updateSolicitudEstado(
  id: number,
  estadoId: EstadoSolicitudId,
  motivo?: string
): Promise<{ ok: boolean; error: Error | null }> {
  const { error } = await supabase
    .from("solicitudes_servicio")
    .update({ 
      estado_solicitud_id: estadoId,
      updated_at: new Date().toISOString()
    })
    .eq("solicitud_id", id);

  if (error) return { ok: false, error: new Error(error.message) };
  return { ok: true, error: null };
}

// Alias para compatibilidad
export const setSolicitudEstado = updateSolicitudEstado;

/* =========================================================
   ✅ Vincular solicitud a servicio
   ========================================================= */
export async function linkSolicitudToServicio(
  solicitudId: number,
  servicioId: number
): Promise<{ ok: boolean; error: Error | null }> {
  const { error } = await supabase
    .from("solicitudes_servicio")
    .update({ 
      servicio_id: servicioId,
      estado_solicitud_id: 5, // Convertida
      updated_at: new Date().toISOString()
    })
    .eq("solicitud_id", solicitudId);

  if (error) return { ok: false, error: new Error(error.message) };
  return { ok: true, error: null };
}

/* =========================================================
   ✅ Convertir solicitud → servicio (RPC)
   ========================================================= */
export async function convertirSolicitudEnServicio(args: {
  solicitudId: number;
  tipoServicioId: number;
  adminId: string;           // profiles.user_id del admin actual
  fechaServicio?: string;    // YYYY-MM-DD
  observaciones?: string | null;
}): Promise<{ ok: boolean; servicio_id: number | null; error: Error | null }> {
  const { solicitudId, tipoServicioId, adminId, fechaServicio, observaciones } = args;

  const { data, error } = await supabase.rpc("convertir_solicitud_a_servicio", {
    p_solicitud_id: solicitudId,
    p_tipo_servicio_id: tipoServicioId,
    p_admin_id: adminId,
    p_fecha_servicio: fechaServicio ?? null,
    p_observaciones: observaciones ?? null,
  });

  if (error) return { ok: false, servicio_id: null, error: new Error(error.message) };

  const newId = typeof data === "number" ? data : Number(data?.servicio_id ?? NaN);
  if (!newId || Number.isNaN(newId)) {
    return { ok: false, servicio_id: null, error: new Error("No se obtuvo servicio_id del RPC") };
  }
  return { ok: true, servicio_id: newId, error: null };
}