import React from 'react';
import type { TicketOut, TicketUpdate } from '@/types/tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  ticket: TicketOut;
  onSave: (data: TicketUpdate) => void;
  loading?: boolean;
}

export default function TicketFormNotes({ ticket, onSave, loading }: Props) {
  const [trabajo, setTrabajo] = React.useState<string>(ticket.trabajo_realizado || '');
  const [notas, setNotas] = React.useState<string>(ticket.notas_internas || '');

  return (
    <div className="border rounded-lg p-3 bg-white">
      <h3 className="font-semibold mb-2">Notas técnicas</h3>
      <div className="grid gap-2">
        <Input placeholder="Trabajo realizado" value={trabajo} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setTrabajo(e.target.value)} />
        <Input placeholder="Notas internas" value={notas} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setNotas(e.target.value)} />
        <div><Button disabled={loading} onClick={()=>onSave({ trabajo_realizado: trabajo, notas_internas: notas })}>Guardar</Button></div>
      </div>
    </div>
  );
}
