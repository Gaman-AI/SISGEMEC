import { useState } from 'react';
import { updateTicket, changeTicketState, updateTicketPriority, classifyTicket } from '@/services/tickets';
import type { TicketUpdate, TicketClassify, PriorityType } from '@/types/tickets';

export function useUpdateTicket() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wrap = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      const res = await fn();
      setError(null);

      // Si el service nos devuelve { data: null } o algo "falsy" pero sin excepción,
      // considerar que fue éxito (porque el backend mandó 200 OK).
      // Deja pasar res tal cual; el caller solo verifica truthiness.
      return (res as any) ?? ({} as T);
    } catch (e: any) {
      // Errores reales (red, 4xx/5xx ya validados en apiPut)
      setError(e?.message || "Error en operación");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading, error,
    update: (id: number, data: TicketUpdate) => wrap(() => updateTicket(id, data)),
    changeState: (id: number, estado: 'Pendiente' | 'En atención' | 'Cerrado', resultado?: string) => wrap(() => changeTicketState(id, estado, resultado)),
    updatePriority: (id: number, priority: PriorityType) => wrap(() => updateTicketPriority(id, priority)), // ACTUALIZADO
    classify: (id: number, data: TicketClassify) => wrap(() => classifyTicket(id, data)),
  };
}
