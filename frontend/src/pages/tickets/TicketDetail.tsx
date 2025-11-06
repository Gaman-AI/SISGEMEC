import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTicketDetail } from '@/hooks/useTicketDetail';
import { useUpdateTicket } from '@/hooks/useUpdateTicket';
import { useTicketEvents } from '@/hooks/useTicketEvents';
import TicketHeaderActions from '@/components/tickets/TicketHeaderActions';
import TicketFormNotes from '@/components/tickets/TicketFormNotes';
import TicketEvents from '@/components/tickets/TicketEvents';
import TicketClassifyDialog from '@/components/tickets/TicketClassifyDialog';
import PriorityBadgeSelect from '@/components/tickets/PriorityBadgeSelect';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TicketClassify, PriorityType } from '@/types/tickets';

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

function EstadoBadge({ estado }: { estado: string }) {
  const color = estado === 'Pendiente' ? 'bg-amber-100 text-amber-700'
    : estado === 'En atención' ? 'bg-blue-100 text-blue-700'
    : 'bg-emerald-100 text-emerald-700';
  return <Badge className={color}>{estado}</Badge>;
}

export default function TicketDetail() {
  const { id } = useParams();
  const ticketId = Number(id);
  const nav = useNavigate();
  const { show, Toast } = useToast();
  const { ticket, loading, error, refetch } = useTicketDetail(ticketId);
  const updater = useUpdateTicket();
  const { events, loading: eventsLoading, refetch: refetchEvents } = useTicketEvents(ticketId);
  const [classifyOpen, setClassifyOpen] = React.useState(false);

  React.useEffect(() => { if (error) show(error, 'error'); }, [error]);

  // Helper: refrescar ticket + eventos en paralelo
  const refreshAll = React.useCallback(async () => {
    await Promise.all([refetch(), refetchEvents()]);
  }, [refetch, refetchEvents]);

  if (!id || Number.isNaN(ticketId)) return <div>Id inválido</div>;
  if (loading || !ticket) return <div>Cargando...</div>;

  const handleState = async (estado: 'En atención' | 'Cerrado') => {
    const res = await updater.changeState(ticketId, estado);
    if (res) { 
      show('Estado actualizado'); 
      await refreshAll();
    }
  };

  const handlePriority = async (priority: PriorityType) => {
    const res = await updater.updatePriority(ticketId, priority);
    if (res) { 
      show('Prioridad actualizada'); 
      await refreshAll();
    }
  };

  const handleClassify = async (data: TicketClassify) => {
    const res = await updater.classify(ticketId, data);
    if (res) {
      show('Ticket clasificado');
      await refreshAll();
      setClassifyOpen(false); // Cerrar modal después de guardar exitosamente
    }
  };

  const handleSaveNotes = async (data: any) => {
    const res = await updater.update(ticketId, data);
    if (res) { 
      show('Notas guardadas'); 
      await refreshAll();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">🎫 Ticket #{ticket.ticket_id}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={()=>nav(-1)}>Volver</Button>
        </div>
      </div>

      <div className="border rounded-lg p-3 bg-white">
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <div><b>Estado:</b> <EstadoBadge estado={ticket.estado} /></div>
          <div className="flex items-center gap-2">
            <b>Prioridad:</b>
            {ticket.estado !== 'Cerrado' ? (
              <PriorityBadgeSelect
                value={ticket.priority}
                onChange={handlePriority}
                disabled={updater.loading}
              />
            ) : (
              <span>{ticket.priority}</span>
            )}
          </div>
          <div><b>Recibido:</b> {ticket.received_at ? new Date(ticket.received_at).toLocaleString() : '-'}</div>
          <div><b>Cerrado:</b> {ticket.closed_at ? new Date(ticket.closed_at).toLocaleString() : '-'}</div>
          <div className="md:col-span-2"><b>Descripción:</b> {ticket.descripcion}</div>
          <div className="md:col-span-2"><b>Solicitante:</b> {ticket.solicitante_nombre || ticket.solicitante_email}</div>
        </div>
      </div>

      <TicketHeaderActions
        ticket={ticket}
        onStateChange={handleState}
        onPriorityToggle={handlePriority}
        onClassify={() => setClassifyOpen(true)} // CONECTAR
      />

      <div className="grid md:grid-cols-2 gap-4">
        <TicketFormNotes ticket={ticket} onSave={handleSaveNotes} loading={updater.loading} />
        <div className="border rounded-lg p-3 bg-white">
          <h3 className="font-semibold mb-2">Eventos</h3>
          <TicketEvents events={events} loading={eventsLoading} /> {/* ACTUALIZADO */}
        </div>
      </div>
      
      <TicketClassifyDialog
        open={classifyOpen}
        onClose={() => setClassifyOpen(false)}
        onSave={handleClassify}
        loading={updater.loading}
        defaultEmail={ticket.solicitante_email || ''}
        defaultPriority={ticket.priority || 'Medium'}
      />
      
      <Toast />
    </div>
  );
}
