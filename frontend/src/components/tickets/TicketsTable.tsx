import React from 'react';
import type { TicketOut, PriorityType } from '@/types/tickets';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PriorityBadgeSelect from './PriorityBadgeSelect';

interface Props {
  data: TicketOut[] | null;
  loading: boolean;
  onView: (id: number) => void;
  onState: (id: number, next: 'En atención' | 'Cerrado') => void;
  onPriority: (id: number, priority: PriorityType) => void; // ACTUALIZADO
  onClassify: (id: number) => void; // NUEVO
}

function EstadoBadge({ estado }: { estado: TicketOut['estado'] }) {
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

export default function TicketsTable({ data, loading, onView, onState, onPriority, onClassify }: Props) {
  // Asegurar que data sea siempre un array válido
  const rows = Array.isArray(data) ? data : [];
  
  return (
    <div className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-100/90 backdrop-blur border-b border-[#CFD0BF]">
          <TableRow>
            <TableHead className="px-4 py-3 text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">#</TableHead>
            <TableHead className="px-4 py-3 text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">Recibida</TableHead>
            <TableHead className="px-4 py-3 text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">Estado</TableHead>
            <TableHead className="px-4 py-3 text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">Prioridad</TableHead>
            <TableHead className="px-4 py-3 text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">Fuente</TableHead>
            <TableHead className="px-4 py-3 text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">Solicitante</TableHead>
            <TableHead className="px-4 py-3 text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={7} className="px-4 py-3 text-sm text-[#527779] text-center">
                Sin resultados
              </TableCell>
            </TableRow>
          )}
          {rows.map((t, idx) => (
            <TableRow 
              key={t.ticket_id}
              className={`bg-white transition hover:bg-slate-50 hover:shadow-sm ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}
            >
              <TableCell className="px-4 py-3 text-sm text-[#26272A]">{t.ticket_id}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#26272A]">{t.received_at ? new Date(t.received_at).toLocaleString() : '-'}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#26272A]"><EstadoBadge estado={t.estado} /></TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#26272A]">
                <PriorityBadgeSelect
                  value={t.priority}
                  onChange={(p) => onPriority(t.ticket_id, p)}
                  disabled={loading}
                />
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#26272A]">{t.fuente}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#26272A]">{t.solicitante_nombre || t.solicitante_email}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#26272A]">
                <div className="flex gap-2">
                  <Button
                    onClick={()=>onView(t.ticket_id)}
                    className="
                      inline-flex items-center justify-center
                      rounded-full
                      bg-[#164F5B] text-white
                      px-4 py-1.5 text-xs font-semibold
                      shadow-sm
                      transition-colors duration-200
                      hover:bg-[#208692]
                      focus-visible:outline-none
                      focus-visible:ring-2 focus-visible:ring-[#164F5B]/30
                    "
                  >
                    Ver
                  </Button>
                  {t.requires_classification && (
                    <Button size="sm" variant="outline" onClick={()=>onClassify(t.ticket_id)}>
                      Clasificar
                    </Button>
                  )}
                  {t.estado === 'Pendiente' && (
                    <Button size="sm" variant="secondary" onClick={()=>onState(t.ticket_id,'En atención')}>
                      En atención
                    </Button>
                  )}
                  {t.estado !== 'Cerrado' && t.estado === 'En atención' && (
                    <Button
                      onClick={()=>onState(t.ticket_id,'Cerrado')}
                      className="
                        inline-flex items-center justify-center
                        rounded-full
                        bg-[#208692] text-white
                        px-4 py-1.5 text-xs font-semibold
                        shadow-sm
                        transition-colors duration-200
                        hover:bg-[#164F5B]
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-[#208692]/30
                      "
                    >
                      Cerrar
                    </Button>
                  )}
                  {t.estado === 'Pendiente' && (
                    <Button
                      disabled
                      title="Primero debe pasar a 'En atención'"
                      className="
                        inline-flex items-center justify-center
                        rounded-full
                        bg-[#208692] text-white
                        px-4 py-1.5 text-xs font-semibold
                        shadow-sm
                        transition-colors duration-200
                        opacity-50 cursor-not-allowed
                        focus-visible:outline-none
                        focus-visible:ring-2 focus-visible:ring-[#208692]/30
                      "
                    >
                      Cerrar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
