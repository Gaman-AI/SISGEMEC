// frontend/src/data/solicitudes.repository.ts
import { supabase } from "@/lib/supabase";
import { apiPost, apiPut, api } from "@/services/api";
import {
  ESTADOS_SOLICITUD_LABEL,
  type ListSolicitudesParams,
  type SolicitudRow,
  type EquipoLite,
  type ResponsableLite,
  type EstadoSolicitudId,
  buildEquipoLabel,
} from "./solicitudes.types";

/** Utilidad local: convierte "" -> null y preserva otros tipos */
function nullifyLocal<T extends Record<string, any>>(obj: T): Record<string, any> {
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

/* =========================================================
   Catálogos lite (para denormalizar labels en listados)
   ========================================================= */
export async function listEquiposLite(
  signal?: AbortSignal
): Promise<{ data: EquipoLite[]; error: Error | null }> {
  let q = supabase
    .from("equipos")
    .select("equipo_id, tipo_equipo, marca, modelo, num_serie")
    .order("equipo_id", { ascending: true });

  if (signal) q = q.abortSignal(signal);

  const { data, error } = await q;
  return { data: (data as EquipoLite[]) ?? [], error: error ? new Error(error.message) : null };
}

export async function listResponsablesLite(
  signal?: AbortSignal
): Promise<{ data: ResponsableLite[]; error: Error | null }> {
  let q = supabase
    .from("profiles")
    .select("user_id, full_name, role, active")
    .eq("role", "RESPONSABLE")
    .eq("active", true)
    .order("full_name", { ascending: true });

  if (signal) q = q.abortSignal(signal);

  const { data, error } = await q;

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
export async function listTiposServicioLite(): Promise<{
  data: Array<{ tipo_servicio_id: number; nombre: string }>;
  error: Error | null;
}> {
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
  userId: string | null | undefined
): Promise<{ data: EquipoLite[]; error: Error | null }> {
  // ⚠️ Hardening: si no hay userId o viene "me", no llamamos, retornamos vacío (evita 400)
  if (!userId || userId === "me") {
    return { data: [], error: null };
  }

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
export async function createSolicitud(input: any) {
  let result;
  
  if ((import.meta as any).env.VITE_USE_BACKEND_API === "true") {
    // Usar apiPost que ya maneja Authorization automáticamente
    result = await apiPost("/solicitudes", input);
  } else {
    // Fallback a Supabase directo
    const { data, error } = await supabase.from('solicitudes_servicio').insert(input).select().single();
    if (error) throw error;
    result = { ok: true, error: null };
  }
  
  // REFRESH inmediato de "mis solicitudes" - trigger para que la UI se actualice
  try {
    // Disparar evento personalizado para que los componentes sepan que deben refetch
    window.dispatchEvent(new CustomEvent('solicitud-created', { 
      detail: { solicitud_id: result.solicitud_id } 
    }));
  } catch (e) {
    console.warn('No se pudo disparar evento de actualización:', e);
  }
  
  return result;
}

/* =========================================================
   Listado Admin con filtros + denormalización
   ========================================================= */
export async function listSolicitudesAdmin(
  params: ListSolicitudesParams,
  signal?: AbortSignal
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

  if (signal) query = query.abortSignal(signal);

  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error: new Error(error.message) };

  const rows = (data as SolicitudRow[]) ?? [];

  // Denormalización (equipo y responsable)
  const [eqLite, respLite] = await Promise.all([listEquiposLite(signal), listResponsablesLite(signal)]);
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
  params: ListSolicitudesParams & { solicitanteId: string | null | undefined },
  signal?: AbortSignal
): Promise<{ data: SolicitudRow[]; count: number; error: Error | null }> {
  const { page, pageSize, search, estadoId, fromDate, toDate, solicitanteId } = params;

  // ⚠️ Hardening: si no hay solicitanteId o viene "me", devolvemos vacío (evita 400)
  if (!solicitanteId || solicitanteId === "me") {
    return { data: [], count: 0, error: null };
  }

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

  if (signal) query = query.abortSignal(signal);

  const { data, error, count } = await query;
  if (error) return { data: [], count: 0, error: new Error(error.message) };

  const rows = (data as SolicitudRow[]) ?? [];

  // Denormalización (equipo y responsable)
  const [eqLite, respLite] = await Promise.all([listEquiposLite(signal), listResponsablesLite(signal)]);
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
  id: number,
  signal?: AbortSignal
): Promise<{ data: SolicitudRow | null; error: Error | null }> {
  let q = supabase
    .from("solicitudes_servicio")
    .select(
      "solicitud_id, equipo_id, solicitante_id, descripcion, estado_solicitud_id, servicio_id, created_at, updated_at"
    )
    .eq("solicitud_id", id);

  if (signal) q = q.abortSignal(signal);

  const { data, error } = await q.maybeSingle();

  if (error) return { data: null, error: new Error(error.message) };
  if (!data) return { data: null, error: null };

  const base = data as SolicitudRow;

  const [eqLite, respLite] = await Promise.all([listEquiposLite(signal), listResponsablesLite(signal)]);
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
export async function updateSolicitudEstado(id: number, estado: string) {
  if ((import.meta as any).env.VITE_USE_BACKEND_API === "true") {
    // Usar apiPut que ya maneja Authorization automáticamente
    return apiPut(`/solicitudes/${id}/estado`, { estado });
  }
  // Fallback a Supabase directo
  const { data, error } = await supabase.from('solicitudes_servicio').update({ estado }).eq('id', id).select().single();
  if (error) throw error;
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
      updated_at: new Date().toISOString(),
    })
    .eq("solicitud_id", solicitudId);

  if (error) return { ok: false, error: new Error(error.message) };
  return { ok: true, error: null };
}

/* =========================================================
   ✅ Convertir solicitud → servicio (RPC)
   ========================================================= */
export type ConvertirSolicitudPayload = {
  tipo_servicio_id: number;
  descripcion?: string;
  observaciones?: string;
};

export async function convertirSolicitudAServicio(
  solicitudId: number,
  payload: ConvertirSolicitudPayload
): Promise<{ ok: boolean; solicitud_id: number; servicio_id: number }> {
  if (!Number.isFinite(solicitudId)) {
    throw new Error("solicitudId inválido");
  }
  
  // Usar backend cuando VITE_USE_BACKEND_API=true
  if ((import.meta as any).env.VITE_USE_BACKEND_API === "true") {
    // Usar apiPost que ya maneja Authorization automáticamente
    const result = await apiPost(`/solicitudes/${solicitudId}/convertir-servicio`, payload);
    return result as { ok: boolean; solicitud_id: number; servicio_id: number };
  }
  
  // Fallback a Supabase directo (implementar lógica existente)
  throw new Error("Función no implementada en modo Supabase directo");
}

// Mantener función anterior para compatibilidad (deprecated)
export async function convertirSolicitudEnServicio(args: {
  solicitudId: number;
  tipoServicioId: number;
  adminId: string; // profiles.user_id del admin actual
  fechaServicio?: string; // YYYY-MM-DD
  observaciones?: string | null;
}): Promise<{ ok: boolean; servicio_id: number | null; error: Error | null }> {
  // Usar la nueva función con el ID en la URL
  try {
    const result = await convertirSolicitudAServicio(args.solicitudId, {
      tipo_servicio_id: args.tipoServicioId,
      observaciones: args.observaciones || undefined
    });
    return { ok: result.ok, servicio_id: result.servicio_id, error: null };
  } catch (error) {
    return { ok: false, servicio_id: null, error: error as Error };
  }
}

/* =========================================================
   ✅ Actualizar estado de solicitud (nueva función robusta)
   ========================================================= */
export type SolicitudEstadoPayload =
  | { estado_solicitud_id: number; estado_nombre?: never }
  | { estado_nombre: string; estado_solicitud_id?: never };

export async function actualizarEstadoSolicitud(
  solicitudId: number,
  payload: SolicitudEstadoPayload
) {
  const { data } = await api.put(`/solicitudes/${solicitudId}/estado`, payload);
  return data as {
    ok: boolean;
    solicitud_id: number;
    estado_solicitud_id: number;
    estado_nombre: string;
    solicitud: any;
  };
}

// NUEVO: contar solicitudes no convertidas a servicio
export async function countSolicitudesNoConvertidas() {
  // 1️⃣ Preferencia: esquema numérico (estado_solicitud_id)
  // Mapeo detectado en auditoría:
  // 1: Enviada, 2: En revisión, 3: Aprobada, 4: Rechazada, 5: Convertida
  let q = supabase
    .from('solicitudes')
    .select('*', { count: 'exact', head: true })
    .in('estado_solicitud_id', [1, 2, 4]);

  let { count, error } = await q;

  // 2️⃣ Esquema textual (columna "estado")
  if (error || count === null) {
    q = supabase
      .from('solicitudes')
      .select('*', { count: 'exact', head: true })
      .or(
        [
          "estado.ilike.Enviada",
          "estado.ilike.En revisión",
          "estado.ilike.En revision",
          "estado.ilike.Rechazada",
        ].join(",")
      );
    ({ count, error } = await q);
  }

  // 3️⃣ Alternativo textual (columna "estado_solicitud")
  if (error || count === null) {
    q = supabase
      .from('solicitudes')
      .select('*', { count: 'exact', head: true })
      .or(
        [
          "estado_solicitud.ilike.Enviada",
          "estado_solicitud.ilike.En revisión",
          "estado_solicitud.ilike.En revision",
          "estado_solicitud.ilike.Rechazada",
        ].join(",")
      );
    ({ count, error } = await q);
  }

  // 4️⃣ Si la tabla real es "solicitudes_servicio"
  if (error || count === null) {
    q = supabase
      .from('solicitudes_servicio')
      .select('*', { count: 'exact', head: true })
      .in('estado_solicitud_id', [1, 2, 4]);
    ({ count, error } = await q);
  }
  if (error || count === null) {
    q = supabase
      .from('solicitudes_servicio')
      .select('*', { count: 'exact', head: true })
      .or(
        [
          "estado.ilike.Enviada",
          "estado.ilike.En revisión",
          "estado.ilike.En revision",
          "estado.ilike.Rechazada",
        ].join(",")
      );
    ({ count, error } = await q);
  }
  if (error || count === null) {
    q = supabase
      .from('solicitudes_servicio')
      .select('*', { count: 'exact', head: true })
      .or(
        [
          "estado_solicitud.ilike.Enviada",
          "estado_solicitud.ilike.En revisión",
          "estado_solicitud.ilike.En revision",
          "estado_solicitud.ilike.Rechazada",
        ].join(",")
      );
    ({ count, error } = await q);
  }

  if (error || count === null) {
    console.warn('countSolicitudesNoConvertidas:error', error);
    return { count: 0, error: error ?? new Error('No se pudo contar solicitudes') };
  }
  return { count: count ?? 0, error: null };
}

export async function countSolicitudesNuevasSemana() {
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
  const tables = ['solicitudes', 'solicitudes_servicio'];
  const cols = ['created_at', 'fecha_creacion', 'fecha', 'fecha_solicitud'];
  for (const t of tables) {
    for (const c of cols) {
      const { count, error } = await supabase
        .from(t)
        .select('*', { count: 'exact', head: true })
        .gte(c, startISO)
        .lte(c, endISO);
      if (!error && count !== null) return { count, error: null };
    }
  }
  console.warn('countSolicitudesNuevasSemana: no matching column found');
  return { count: 0, error: null };
}

