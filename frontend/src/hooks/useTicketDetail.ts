import { useEffect, useState } from 'react';
import type { TicketOut } from '@/types/tickets';
import { fetchTicketById } from '@/services/tickets';

export function useTicketDetail(ticketId: number) {
  const [ticket, setTicket] = useState<TicketOut | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetchTicketById(ticketId);
      setTicket(res);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (ticketId) load(); }, [ticketId]);

  return { ticket, loading, error, refetch: load };
}
