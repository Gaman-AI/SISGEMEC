import { supabase } from "@/lib/supabase";
import type { 
  ServicioRow, 
  EquipoLite, 
  TipoServicioLite, 
  EstadoServicioLite, 
  AdminLite,
  ServicioFormValues 
} from "./servicios.types";
import { buildEquipoLabel, nullify } from "./servicios.types";

export type ListParams = {
  page: number;            // 1-based
  pageSize: number;        // usar PAGE_SIZE_SERVICIOS = 10
  search?: string;
  estadoId?: number;       // 1/2/3
  tipoId?: number;
  tecnicoId?: string;      // UUID
  equipoId?: number;
  fromDate?: string;       // YYYY-MM-DD
  toDate?: string;         // YYYY-MM-DD
};

export async function listServicios(params: ListParams): Promise<{ data: ServicioRow[]; count: number; error?: string }> {
  try {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 10;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from("servicios")
      .select(`
        servicio_id, fecha_servicio, equipo_id, tipo_servicio_id, estado_servicio_id, tecnico_id, descripcion, observaciones,
        equipos:equipo_id(tipo_equipo, marca, modelo, num_serie),
        tipos_servicio:tipo_servicio_id(nombre),
        estados_servicio:estado_servicio_id(nombre),
        tecnico:tecnico_id(full_name)
      `, { count: 'exact' })
      .order("fecha_servicio", { ascending: false })
      .range(from, to);

    // Filtros
    if (params.estadoId) {
      q = q.eq("estado_servicio_id", params.estadoId);
    }
    if (params.tipoId) {
      q = q.eq("tipo_servicio_id", params.tipoId);
    }
    if (params.tecnicoId) {
      q = q.eq("tecnico_id", params.tecnicoId);
    }
    if (params.equipoId) {
      q = q.eq("equipo_id", params.equipoId);
    }
    if (params.fromDate) {
      q = q.gte("fecha_servicio", params.fromDate);
    }
    if (params.toDate) {
      q = q.lte("fecha_servicio", params.toDate);
    }

    const { data, error, count } = await q;
    
    if (error) {
      return { data: [], count: 0, error: error.message };
    }

    // Mapear y denormalizar
    const mappedData: ServicioRow[] = (data || []).map((row: any) => {
      const equipo = row.equipos as any;
      const equipo_label = buildEquipoLabel(equipo);
      
      return {
        servicio_id: row.servicio_id,
        fecha_servicio: row.fecha_servicio,
        equipo_id: row.equipo_id,
        tipo_servicio_id: row.tipo_servicio_id,
        estado_servicio_id: row.estado_servicio_id,
        tecnico_id: row.tecnico_id,
        descripcion: row.descripcion,
        observaciones: row.observaciones,
        equipo_label,
        tipo_servicio_nombre: row.tipos_servicio?.nombre || '',
        estado_servicio_nombre: row.estados_servicio?.nombre || '',
        tecnico_nombre: row.tecnico?.full_name || null,
      };
    });

    // Aplicar filtro de búsqueda si existe
    let filteredData = mappedData;
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredData = mappedData.filter(row => 
        row.equipo_label?.toLowerCase().includes(searchLower) ||
        row.descripcion?.toLowerCase().includes(searchLower) ||
        row.observaciones?.toLowerCase().includes(searchLower) ||
        row.tipo_servicio_nombre?.toLowerCase().includes(searchLower) ||
        row.tecnico_nombre?.toLowerCase().includes(searchLower)
      );
    }

    return { data: filteredData, count: count || 0, error: undefined };
  } catch (error: any) {
    return { data: [], count: 0, error: error.message || 'Error al listar servicios' };
  }
}

export async function getServicioById(id: number): Promise<{ data: ServicioRow | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("servicios")
      .select(`
        servicio_id, fecha_servicio, equipo_id, tipo_servicio_id, estado_servicio_id, tecnico_id, descripcion, observaciones,
        equipos:equipo_id(tipo_equipo, marca, modelo, num_serie),
        tipos_servicio:tipo_servicio_id(nombre),
        estados_servicio:estado_servicio_id(nombre),
        tecnico:tecnico_id(full_name)
      `)
      .eq("servicio_id", id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Servicio no encontrado' };
    }

    const equipo = data.equipos as any;
    const equipo_label = buildEquipoLabel(equipo);
    
    const mappedData: ServicioRow = {
      servicio_id: data.servicio_id,
      fecha_servicio: data.fecha_servicio,
      equipo_id: data.equipo_id,
      tipo_servicio_id: data.tipo_servicio_id,
      estado_servicio_id: data.estado_servicio_id,
      tecnico_id: data.tecnico_id,
      descripcion: data.descripcion,
      observaciones: data.observaciones,
      equipo_label,
      tipo_servicio_nombre: (data.tipos_servicio as any)?.nombre || '',
      estado_servicio_nombre: (data.estados_servicio as any)?.nombre || '',
      tecnico_nombre: (data.tecnico as any)?.full_name || null,
    };

    return { data: mappedData, error: undefined };
  } catch (error: any) {
    return { data: null, error: error.message || 'Error al obtener servicio' };
  }
}

export async function createServicio(payload: ServicioFormValues): Promise<{ data: { servicio_id: number } | null; error?: string }> {
  try {
    const values = nullify(payload);
    
    const { data, error } = await supabase
      .from("servicios")
      .insert(values)
      .select("servicio_id")
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: { servicio_id: data.servicio_id }, error: undefined };
  } catch (error: any) {
    return { data: null, error: error.message || 'Error al crear servicio' };
  }
}

export async function updateServicio(id: number, payload: ServicioFormValues): Promise<{ ok: boolean; error?: string }> {
  try {
    const values = nullify(payload);
    
    const { error } = await supabase
      .from("servicios")
      .update(values)
      .eq("servicio_id", id);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, error: undefined };
  } catch (error: any) {
    return { ok: false, error: error.message || 'Error al actualizar servicio' };
  }
}

export async function listEquiposLite(): Promise<{ data: EquipoLite[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("equipos")
      .select("equipo_id, tipo_equipo, marca, modelo, num_serie")
      .order("num_serie", { ascending: true, nullsFirst: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: [], error: new Error(error.message || 'Error al cargar equipos') };
  }
}

export async function listTiposServicioLite(): Promise<{ data: TipoServicioLite[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("tipos_servicio")
      .select("tipo_servicio_id, nombre")
      .eq("activo", true)
      .order("nombre", { ascending: true });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: [], error: new Error(error.message || 'Error al cargar tipos de servicio') };
  }
}

export async function listEstadosServicioLite(): Promise<{ data: EstadoServicioLite[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("estados_servicio")
      .select("estado_servicio_id, nombre")
      .in("estado_servicio_id", [1, 2, 3]) // IDs fijos
      .order("estado_servicio_id", { ascending: true });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { data: [], error: new Error(error.message || 'Error al cargar estados de servicio') };
  }
}

// NOTE: Desde Fase 2 se unifica rol operativo en ADMIN. tecnico_id representa admin asignado.
export async function listAdminsLite(): Promise<{ data: AdminLite[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("role", "ADMIN")
      .eq("active", true)
      .order("full_name", { ascending: true });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data as AdminLite[]) || [], error: null };
  } catch (error: any) {
    return { data: [], error: new Error(error.message || 'Error al cargar administradores') };
  }
}

// Compatibilidad: devolvemos admins activos
export async function listTecnicosLite() {
  return listAdminsLite();
}
