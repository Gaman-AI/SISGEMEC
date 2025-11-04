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
  const color = estado === 'Pendiente' ? 'bg-amber-100 text-amber-700'
    : estado === 'En atención' ? 'bg-blue-100 text-blue-700'
    : 'bg-emerald-100 text-emerald-700';
  return <Badge className={color}>{estado}</Badge>;
}

export default function TicketsTable({ data, loading, onView, onState, onPriority, onClassify }: Props) {
  // Asegurar que data sea siempre un array válido
  const rows = Array.isArray(data) ? data : [];
  
  return (
    <div className="border rounded-lg overflow-x-auto bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Recibida</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Prioridad</TableHead>
            <TableHead>Fuente</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && !loading && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Sin resultados</TableCell></TableRow>
          )}
          {rows.map((t) => (
            <TableRow key={t.ticket_id}>
              <TableCell>{t.ticket_id}</TableCell>
              <TableCell>{t.received_at ? new Date(t.received_at).toLocaleString() : '-'}</TableCell>
              <TableCell><EstadoBadge estado={t.estado} /></TableCell>
              <TableCell>
                <PriorityBadgeSelect
                  value={t.priority}
                  onChange={(p) => onPriority(t.ticket_id, p)}
                  disabled={loading}
                />
              </TableCell>
              <TableCell>{t.fuente}</TableCell>
              <TableCell>{t.solicitante_nombre || t.solicitante_email}</TableCell>
              <TableCell className="flex gap-2">
                <Button size="sm" onClick={()=>onView(t.ticket_id)}>Ver</Button>
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
                  <Button size="sm" variant="secondary" onClick={()=>onState(t.ticket_id,'Cerrado')}>
                    Cerrar
                  </Button>
                )}
                {t.estado === 'Pendiente' && (
                  <Button size="sm" variant="ghost" disabled title="Primero debe pasar a 'En atención'">
                    Cerrar
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
