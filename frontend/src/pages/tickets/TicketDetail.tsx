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
          type === "success" ? "bg-[#208692] text-white" : "bg-rose-600 text-white"
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
  const ticketStatusConfig: Record<string, { bg: string; text: string; ring: string }> = {
    PENDIENTE: {
      bg: "bg-[#D4D970]",
      text: "text-[#164F5B]",
      ring: "ring-[#CFD0BF]",
    },
    EN_ATENCION: {
      bg: "bg-[#208692]",
      text: "text-white",
      ring: "ring-[#164F5B]",
    },
    CERRADO: {
      bg: "bg-[#E5EADF]",
      text: "text-[#527779]",
      ring: "ring-[#CFD0BF]",
    },
    DEFAULT: {
      bg: "bg-[#E5EADF]",
      text: "text-[#527779]",
      ring: "ring-[#CFD0BF]",
    },
  };

  const normalized = (estado || "").toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  let cfg = ticketStatusConfig.DEFAULT;

  if (normalized.startsWith("PENDIENTE")) cfg = ticketStatusConfig.PENDIENTE;
  else if (normalized.startsWith("EN ATENCION")) cfg = ticketStatusConfig.EN_ATENCION;
  else if (normalized.startsWith("CERRADO")) cfg = ticketStatusConfig.CERRADO;

  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}
      `}
      role="status"
    >
      {estado || "-"}
    </span>
  );
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
    <div className="p-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
            Ticket #{ticket.ticket_id}
          </h1>
          <p className="text-sm lg:text-base text-[#26272A] mt-1">
            Consulta el detalle, historial y acciones de este ticket.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="
              inline-flex items-center gap-2 rounded-xl
              border border-[#CFD0BF] text-[#164F5B]
              hover:bg-[#E5EADF] transition-colors
              px-4 py-2.5 text-sm font-semibold
            "
            onClick={()=>nav(-1)}
          >
            Volver
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
        <div className="grid md:grid-cols-2 gap-2 text-sm text-[#26272A]">
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
        <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#164F5B] mb-2">Eventos</h3>
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
