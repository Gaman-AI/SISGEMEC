export type EstadoType = 'Pendiente' | 'En atención' | 'Cerrado';
export type FuenteType = 'google_forms' | 'email' | 'manual';
export type PriorityType = 'Urgent' | 'Important' | 'Medium' | 'Low'; // NUEVO

export interface TicketOut {
  ticket_id: number;
  solicitante_email: string;
  solicitante_nombre?: string | null;
  descripcion: string;
  equipo_id?: number | null;
  solicitante_id?: string | null;
  tipo_servicio_id?: number | null;
  estado: EstadoType;
  priority: PriorityType; // NUEVO
  prioritario?: boolean | null; // DEPRECATED
  fuente: FuenteType;
  external_id?: string | null;
  raw_payload?: Record<string, any> | null;
  requires_classification: boolean;
  received_at?: string | null;
  first_response_at?: string | null;
  closed_at?: string | null;
  tecnico_id?: string | null;
  trabajo_realizado?: string | null;
  notas_internas?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TicketListFilters {
  estado?: EstadoType;
  priority?: PriorityType; // NUEVO
  prioritario?: boolean; // DEPRECATED - para compatibilidad
  fuente?: FuenteType;
  received_start?: string;
  received_end?: string;
  closed_start?: string;
  closed_end?: string;
  q?: string;
  page?: number;
  size?: number;
  order_by?: string; // 'received_at.desc' por defecto
}

export interface TicketUpdate {
  tipo_servicio_id?: number | null;
  tecnico_id?: string | null;
  trabajo_realizado?: string | null;
  notas_internas?: string | null;
  priority?: PriorityType | null; // NUEVO
}

export interface TicketClassify {
  solicitante_id?: string | null;
  equipo_id?: number | null;
  tipo_servicio_id?: number | null; // NUEVO
  priority: PriorityType; // NUEVO - obligatorio
  observaciones?: string | null; // NUEVO
}

// NUEVO
export interface TicketEvent {
  event_id: number;
  ticket_id: number;
  actor_id?: string | null;
  event_type: string;
  payload?: Record<string, any> | null;
  created_at: string;
}
