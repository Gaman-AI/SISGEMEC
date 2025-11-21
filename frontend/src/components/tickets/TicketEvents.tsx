import React from 'react';
import type { TicketEvent } from '@/types/tickets';
import { Badge } from '@/components/ui/badge';

interface Props {
  events: TicketEvent[];
  loading?: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  CREATED: 'Creado',
  STATE_CHANGED: 'Estado cambiado',
  PRIORITY_CHANGED: 'Prioridad cambiada',
  CLASSIFIED: 'Clasificado',
  ASSIGNED: 'Asignado',
  UPDATED: 'Actualizado',
  CLOSED: 'Cerrado',
};

function getFriendlyTitle(ev: TicketEvent): string {
  const base = EVENT_LABELS[ev.event_type] ?? 'Evento';
  if (ev.event_type === 'STATE_CHANGED' && ev.payload?.to) {
    return `${base}: ${ev.payload.to}`;
  }
  return base;
}

function truncate(text: string, max = 80) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function getPayloadFields(payload: Record<string, any> | null | undefined): Array<[string, string]> {
  if (!payload || typeof payload !== 'object') return [];
  const fields: Array<[string, string]> = [];

  if (payload.to) fields.push(['Estado', String(payload.to)]);
  if (payload.priority) fields.push(['Prioridad', String(payload.priority)]);
  if (payload.equipo_nombre || payload.equipo_id)
    fields.push(['Equipo', String(payload.equipo_nombre ?? `#${payload.equipo_id}`)]);
  if (payload.tipo_servicio_nombre || payload.tipo_servicio_id)
    fields.push(['Tipo de servicio', String(payload.tipo_servicio_nombre ?? `ID:${payload.tipo_servicio_id}`)]);
  if (payload.trabajo_realizado) fields.push(['Trabajo', truncate(String(payload.trabajo_realizado))]);
  if (payload.notas_internas) fields.push(['Notas', truncate(String(payload.notas_internas))]);
  if (payload.observaciones) fields.push(['Observaciones', truncate(String(payload.observaciones))]);

  return fields;
}

function PriorityBadge({ value }: { value: string }) {
  const priorityConfig: Record<string, { bg: string; text: string; ring: string }> = {
    URGENT: {
      bg: "bg-[#D4D970]",
      text: "text-[#164F5B]",
      ring: "ring-[#CFD0BF]",
    },
    IMPORTANT: {
      bg: "bg-[#208692]",
      text: "text-white",
      ring: "ring-[#164F5B]",
    },
    MEDIUM: {
      bg: "bg-[#C7D8D0]",
      text: "text-[#164F5B]",
      ring: "ring-[#CFD0BF]",
    },
    LOW: {
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

  const normalized = (value || "").toUpperCase().trim();
  let cfg = priorityConfig.DEFAULT;

  if (normalized.startsWith("URGENT")) cfg = priorityConfig.URGENT;
  else if (normalized.startsWith("IMPORTANT")) cfg = priorityConfig.IMPORTANT;
  else if (normalized.startsWith("MEDIUM")) cfg = priorityConfig.MEDIUM;
  else if (normalized.startsWith("LOW")) cfg = priorityConfig.LOW;

  return (
    <span
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ring-1 ring-inset ${cfg.bg} ${cfg.text} ${cfg.ring}
      `}
      role="status"
    >
      {value || "-"}
    </span>
  );
}

export default function TicketEvents({ events, loading }: Props) {
  if (loading) return <div className="text-[#527779]">Cargando eventos...</div>;
  if (!events?.length) return <div className="text-[#527779]">Sin eventos</div>;

  return (
    <ol className="relative border-s ps-6 space-y-3">
      {events.map((ev) => {
        const title = getFriendlyTitle(ev);
        const fields = getPayloadFields(ev.payload);

        return (
          <li key={ev.event_id}>
            <div className="absolute -start-1.5 mt-1.5 h-3 w-3 rounded-full bg-[#208692]" />
            <div className="text-sm font-medium text-[#26272A]">{title}</div>
            <div className="text-xs text-[#527779] mb-2">
              {ev.created_at ? new Date(ev.created_at).toLocaleString() : ''}
            </div>

            {fields.length > 0 && (
              <div className="mt-2 space-y-1">
                {fields.map(([label, value], i) => (
                  <div key={i} className="text-xs text-[#26272A]">
                    <span className="font-medium text-[#527779]">{label}:</span>{' '}
                    {label === 'Prioridad' ? <PriorityBadge value={value} /> : <span>{value}</span>}
                  </div>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
