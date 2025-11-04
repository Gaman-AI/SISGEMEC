import { useCallback, useEffect, useState } from 'react';
import type { TicketListFilters, TicketOut } from '@/types/tickets';
import { fetchTickets } from '@/services/tickets';

export function useTickets(initial: TicketListFilters) {
  const [filters, setFilters] = useState<TicketListFilters>(initial);
  const [data, setData] = useState<TicketOut[]>([]);
  const [page, setPage] = useState<number>(initial.page || 1);
  const [size, setSize] = useState<number>(initial.size || 20);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: TicketListFilters) => {
    try {
      setLoading(true);
      setError(null);

      const req = {
        ...f,
        page: Math.max(f.page ?? page ?? 1, 1),
        size: Math.max(f.size ?? size ?? 20, 1),
      };
      console.log('[useTickets] fetching with =>', req);

      const res = await fetchTickets(req);
      console.log('[useTickets] fetched =>', { page: res.page, size: res.size, total: res.total, itemsLen: res.items?.length ?? 0 });

      const safeItems = Array.isArray(res?.items) ? res.items : [];
      setData(safeItems);
      setTotal(Number.isFinite(res?.total) ? res.total : safeItems.length);
    } catch (e: any) {
      console.warn('[useTickets] error =>', e?.message ?? e);
      setError(e?.message || 'Error al cargar tickets');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []); // 🔑 sin deps

  const refetch = useCallback(async () => {
    await load(filters);
  }, [load, filters]);

  useEffect(() => {
    load({
      ...filters,
      page,
      size,
    });
  // 🔑 dependencias específicas, NO 'load'
  }, [
    page, size,
    filters.estado,
    filters.priority,
    filters.fuente,
    filters.order_by,
    filters.q,
    filters.received_start,
    filters.received_end,
    filters.closed_start,
    filters.closed_end,
  ]);

  return {
    data, total, loading, error,
    page, size, setPage, setSize,
    filters, setFilters,
    refetch, setData,
  };
}
