import { useEffect, useState } from 'react';
import type { TicketEvent } from '@/types/tickets';
import { fetchTicketEvents } from '@/services/tickets';

export function useTicketEvents(ticketId: number) {
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchTicketEvents(ticketId);
      setEvents(res);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar eventos');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) load();
  }, [ticketId]);

  return { events, loading, error, refetch: load };
}
