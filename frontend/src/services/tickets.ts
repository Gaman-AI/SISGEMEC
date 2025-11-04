import { apiGet, apiPost, apiPut } from '@/services/api';
import type { TicketOut, TicketListFilters, TicketUpdate, TicketClassify, TicketEvent, PriorityType } from '@/types/tickets';

export async function fetchTickets(params: TicketListFilters): Promise<{ items: TicketOut[]; page: number; size: number; total: number; }> {
  try {
    const res = await apiGet('/tickets', { params });
    const data = res as any;
    console.log('[TicketsService] RAW /tickets =>', data);
    if (Array.isArray(data)) {
      return { items: data, page: params.page ?? 1, size: params.size ?? 20, total: data.length };
    }
    const items = Array.isArray(data?.items) ? data.items : [];
    const total = Number.isFinite(data?.total) ? data.total : items.length;
    const page = data?.page ?? params.page ?? 1;
    const size = data?.size ?? params.size ?? 20;
    console.log('[TicketsService] Normalized =>', { page, size, total, itemsLen: items.length });
    return { items, page, size, total };
  } catch (err: any) {
    console.warn('[TicketsService] falling back to empty list. reason=', err?.message ?? err);
    const page = params.page ?? 1;
    const size = params.size ?? 20;
    return { items: [], page, size, total: 0 };
  }
}

export async function fetchTicketById(ticketId: number): Promise<TicketOut> {
  const data = await apiGet(`/tickets/${ticketId}`);
  return data;
}

export async function updateTicket(ticketId: number, patch: TicketUpdate): Promise<TicketOut> {
  const { data } = await apiPut(`/tickets/${ticketId}`, patch);
  return data;
}

export async function changeTicketState(
  ticketId: number, 
  estado: 'Pendiente' | 'En atención' | 'Cerrado',
  resultado_servicio?: string
): Promise<TicketOut> {
  const payload: any = { estado };
  if (resultado_servicio) {
    payload.resultado_servicio = resultado_servicio;
  }
  const { data } = await apiPut(`/tickets/${ticketId}/estado`, payload);
  return data;
}

export async function updateTicketPriority(ticketId: number, priority: PriorityType): Promise<TicketOut> {
  const { data } = await apiPut(`/tickets/${ticketId}/prioridad`, { priority });
  return data;
}

export async function fetchTicketEvents(ticketId: number): Promise<TicketEvent[]> {
  const data = await apiGet(`/tickets/${ticketId}/events`);
  return Array.isArray(data) ? data : [];
}

export async function classifyTicket(ticketId: number, payload: TicketClassify): Promise<TicketOut> {
  const { data } = await apiPut(`/tickets/${ticketId}/clasificar`, payload);
  return data;
}
