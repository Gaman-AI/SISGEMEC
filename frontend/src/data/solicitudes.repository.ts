import { supabase } from "../lib/supabaseClient";
import type {
  SolicitudRow,
  EquipoLite,
  EstadoSolicitudLite,
  SolicitudFormValues,
} from "./solicitudes.types";
import {
  buildEquipoLabel,
  nullify,
  PAGE_SIZE_SOLICITUDES,
} from "./solicitudes.types";

export type ListParams = {
  page: number;
  pageSize?: number;
  search?: string;
  estadoId?: number;
  solicitanteId?: string;
  equipoId?: number;
  fromDate?: string;
  toDate?: string;
};

export async function listSolicitudesAdmin(params: ListParams): Promise<{ data: SolicitudRow[]; count: number; error: Error | null }> {
  try {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? PAGE_SIZE_SOLICITUDES;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("solicitudes_servicio")
      .select(`
        solicitud_id, equipo_id, solicitante_id, descripcion, estado_solicitud_id, servicio_id, created_at, updated_at,
        equipos:equipo_id(tipo_equipo, marca, modelo, num_serie),
        solicitante:solicitante_id(full_name),
        estados:estado_solicitud_id(nombre)
      `, { count: 'exact' })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.estadoId) q = q.eq("estado_solicitud_id", params.estadoId);
    if (params.solicitanteId) q = q.eq("solicitante_id", params.solicitanteId);
    if (params.equipoId) q = q.eq("equipo_id", params.equipoId);
    if (params.fromDate) q = q.gte("created_at", params.fromDate);
    if (params.toDate) q = q.lte("created_at", params.toDate);

    const { data, error, count } = await q;
    if (error) return { data: [], count: 0, error: new Error(error.message) };

    const mapped: SolicitudRow[] = (data || []).map((row: any) => ({
      solicitud_id: row.solicitud_id,
      equipo_id: row.equipo_id,
      solicitante_id: row.solicitante_id,
      descripcion: row.descripcion,
      estado_solicitud_id: row.estado_solicitud_id,
      servicio_id: row.servicio_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      equipo_label: buildEquipoLabel(row.equipos as EquipoLite),
      solicitante_nombre: row.solicitante?.full_name ?? null,
      estado_solicitud_nombre: row.estados?.nombre ?? '',
    }));

    let filtered = mapped;
    if (params.search) {
      const s = params.search.toLowerCase();
      filtered = mapped.filter((r) =>
        r.equipo_label?.toLowerCase().includes(s) ||
        r.descripcion?.toLowerCase().includes(s) ||
        r.solicitante_nombre?.toLowerCase().includes(s) ||
        r.estado_solicitud_nombre?.toLowerCase().includes(s)
      );
    }

    return { data: filtered, count: count || 0, error: null };
  } catch (e: any) {
    return { data: [], count: 0, error: new Error(e?.message || 'Error al listar solicitudes') };
  }
}

export async function listMisSolicitudes(params: ListParams & { solicitanteId: string }): Promise<{ data: SolicitudRow[]; count: number; error: Error | null }> {
  return listSolicitudesAdmin(params);
}

export async function getSolicitudById(id: number): Promise<{ data: SolicitudRow | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("solicitudes_servicio")
      .select(`
        solicitud_id, equipo_id, solicitante_id, descripcion, estado_solicitud_id, servicio_id, created_at, updated_at,
        equipos:equipo_id(tipo_equipo, marca, modelo, num_serie),
        solicitante:solicitante_id(full_name),
        estados:estado_solicitud_id(nombre)
      `)
      .eq("solicitud_id", id)
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    if (!data) return { data: null, error: null };

    const mapped: SolicitudRow = {
      solicitud_id: data.solicitud_id,
      equipo_id: data.equipo_id,
      solicitante_id: data.solicitante_id,
      descripcion: data.descripcion,
      estado_solicitud_id: data.estado_solicitud_id,
      servicio_id: data.servicio_id,
      created_at: data.created_at,
      updated_at: data.updated_at,
      equipo_label: buildEquipoLabel(data.equipos as EquipoLite),
      solicitante_nombre: data.solicitante?.full_name ?? null,
      estado_solicitud_nombre: data.estados?.nombre ?? '',
    };
    return { data: mapped, error: null };
  } catch (e: any) {
    return { data: null, error: new Error(e?.message || 'Error al obtener solicitud') };
  }
}

export async function createSolicitud(payload: SolicitudFormValues & { solicitante_id: string }): Promise<{ data: { solicitud_id: number } | null; error: Error | null }> {
  try {
    const values = nullify(payload);
    const { data, error } = await supabase
      .from("solicitudes_servicio")
      .insert({
        equipo_id: values.equipo_id,
        solicitante_id: payload.solicitante_id,
        descripcion: values.descripcion ?? null,
        estado_solicitud_id: 1,
      })
      .select("solicitud_id")
      .single();
    if (error) return { data: null, error: new Error(error.message) };
    return { data: { solicitud_id: data.solicitud_id }, error: null };
  } catch (e: any) {
    return { data: null, error: new Error(e?.message || 'Error al crear solicitud') };
  }
}

export async function updateSolicitudEstado(id: number, nextEstadoId: number, motivo?: string): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("solicitudes_servicio")
      .update({ estado_solicitud_id: nextEstadoId })
      .eq("solicitud_id", id);
    if (error) return { ok: false, error: new Error(error.message) };
    return { ok: true, error: null };
  } catch (e: any) {
    return { ok: false, error: new Error(e?.message || 'Error al actualizar estado') };
  }
}

export async function linkSolicitudToServicio(solicitudId: number, servicioId: number): Promise<{ ok: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from("solicitudes_servicio")
      .update({ servicio_id: servicioId, estado_solicitud_id: 5 })
      .eq("solicitud_id", solicitudId);
    if (error) return { ok: false, error: new Error(error.message) };
    return { ok: true, error: null };
  } catch (e: any) {
    return { ok: false, error: new Error(e?.message || 'Error al vincular servicio') };
  }
}

export async function listEstadosSolicitudLite(): Promise<{ data: EstadoSolicitudLite[]; error: Error | null }> {
  try {
    const data: EstadoSolicitudLite[] = [
      { estado_solicitud_id: 1, nombre: 'Enviada' },
      { estado_solicitud_id: 2, nombre: 'En revisión' },
      { estado_solicitud_id: 3, nombre: 'Aprobada' },
      { estado_solicitud_id: 4, nombre: 'Rechazada' },
      { estado_solicitud_id: 5, nombre: 'Convertida' },
    ];
    return { data, error: null };
  } catch (e: any) {
    return { data: [], error: new Error(e?.message || 'Error al listar estados') };
  }
}

export async function listEquiposPropiosLite(userId: string): Promise<{ data: EquipoLite[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("equipos")
      .select("equipo_id, tipo_equipo, marca, modelo, num_serie, responsable_id")
      .eq("responsable_id", userId)
      .order("num_serie", { ascending: true });
    if (error) return { data: [], error: new Error(error.message) };
    return { data: (data as any[]).map((e) => ({
      equipo_id: e.equipo_id,
      tipo_equipo: e.tipo_equipo,
      marca: e.marca,
      modelo: e.modelo,
      num_serie: e.num_serie,
    })), error: null };
  } catch (e: any) {
    return { data: [], error: new Error(e?.message || 'Error al listar equipos propios') };
  }
}


