import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketFilters from '@/components/tickets/TicketFilters';
import TicketsTable from '@/components/tickets/TicketsTable';
import TicketClassifyDialog from '@/components/tickets/TicketClassifyDialog';
import TicketCloseDialog from '@/components/tickets/TicketCloseDialog';
import { useTickets } from '@/hooks/useTickets';
import { useUpdateTicket } from '@/hooks/useUpdateTicket';
import type { TicketListFilters, PriorityType, TicketClassify } from '@/types/tickets';

// Hook de toast local (reutilizando patrón existente)
function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [type, setType] = React.useState<"success" | "error" | null>(null);
  const show = (m: string, t: "success" | "error" = "success") => {
    setMsg(m);
    setType(t);
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => {
      setMsg(null);
      setType(null);
    }, 3000);
  };
  const Toast = () =>
    msg ? (
      <div
        className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md z-50 ${
          type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}
        role="status"
        aria-live="polite"
      >
        {msg}
      </div>
    ) : null;
  return { show, Toast };
}

export default function TicketsList() {
  const navigate = useNavigate();
  const { show, Toast } = useToast();

  const initialFilters = useMemo<TicketListFilters>(() => ({
    page: 1, size: 20, order_by: 'received_at.desc'
  }), []);
  const { data: items, total, loading, error, refetch, setData, filters, setFilters, page, size, setPage, setSize } =
    useTickets(initialFilters);
  const updater = useUpdateTicket();
  const itemsLen = Array.isArray(items) ? items.length : 0;

  // Estados para modales
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [classifyTicketId, setClassifyTicketId] = useState<number | null>(null);
  const [classifyDefaultEmail, setClassifyDefaultEmail] = useState<string>('');
  const [classifyDefaultPriority, setClassifyDefaultPriority] = useState<PriorityType>('Medium');
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeTicketId, setCloseTicketId] = useState<number | null>(null);

  React.useEffect(() => { if (error) show(error, 'error'); }, [error]);

  const apply = (f: TicketListFilters) => setFilters(f);
  const clear = () => setFilters({ page: 1, size: 20, order_by: 'received_at.desc' });

  const onState = async (id: number, next: 'En atención' | 'Cerrado') => {
    if (next === 'Cerrado') {
      setCloseTicketId(id);
      setCloseOpen(true);
    } else {
      const res = await updater.changeState(id, next);
      if (res) { 
        show('Estado actualizado'); 
        await refetch(); 
      }
    }
  };

  const onPriority = async (id: number, priority: PriorityType) => {
    const ok = await updater.updatePriority(id, priority);
    if (ok) {
      show('Prioridad actualizada');
      await refetch(); // 🔑 ahora sí debe pintar al terminar
    } else {
      show('No se pudo actualizar la prioridad', 'error');
    }
  };

  const onClassify = (id: number) => {
    // Buscar el ticket en items para obtener datos por defecto
    const ticket = items.find((t) => t.ticket_id === id);
    if (ticket) {
      setClassifyDefaultEmail(ticket.solicitante_email || '');
      setClassifyDefaultPriority(ticket.priority || 'Medium');
    } else {
      setClassifyDefaultEmail('');
      setClassifyDefaultPriority('Medium');
    }
    setClassifyTicketId(id);
    setClassifyOpen(true);
  };

  const handleClassify = async (data: TicketClassify) => {
    if (!classifyTicketId) return;
    const ok = await updater.classify(classifyTicketId, data);
    if (ok) {
      show('Ticket clasificado');
      await refetch();
      setClassifyOpen(false);
    } else {
      show('No se pudo clasificar el ticket', 'error');
    }
  };

  const handleClose = async (resultado: string) => {
    if (!closeTicketId) return;
    const ok = await updater.changeState(closeTicketId, 'Cerrado', resultado);
    if (ok) {
      show('Ticket cerrado');
      await refetch();
      setCloseOpen(false);
    } else {
      show('No se pudo cerrar el ticket', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">🎫 Tickets</h1>
        <div className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700">
          <span className="font-semibold">debug:</span>{' '}
          items=<b>{itemsLen}</b> · total=<b>{total}</b> · page=<b>{filters.page || 1}</b> · size=<b>{filters.size || 20}</b> · order_by=<b>{filters.order_by ?? '-'}</b>
        </div>
      </div>
      <TicketFilters initial={filters} onSubmit={apply} onClear={clear} loading={loading} />
                  <TicketsTable
                    data={items}
                    loading={loading || updater.loading}
                    onView={(id)=>navigate(`/tickets/${id}`)}
                    onState={onState}
                    onPriority={onPriority}
                    onClassify={onClassify}
                  />
      
      <TicketClassifyDialog
        open={classifyOpen}
        onClose={() => setClassifyOpen(false)}
        onSave={handleClassify}
        loading={updater.loading}
        defaultEmail={classifyDefaultEmail}
        defaultPriority={classifyDefaultPriority}
      />

      <TicketCloseDialog
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onConfirm={handleClose}
        loading={updater.loading}
      />
      
      <Toast />
    </div>
  );
}
