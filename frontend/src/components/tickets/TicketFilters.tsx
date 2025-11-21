import React from 'react';
import type { TicketListFilters } from '@/types/tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Props {
  initial?: TicketListFilters;
  onSubmit: (filters: TicketListFilters) => void;
  onClear: () => void;
  loading?: boolean;
}

export default function TicketFilters({ initial, onSubmit, onClear, loading }: Props) {
  const [local, setLocal] = React.useState<TicketListFilters>({ ...(initial || {}), order_by: initial?.order_by || 'received_at.desc' });

  const set = (k: keyof TicketListFilters, v: any) => setLocal((s) => ({ ...s, [k]: v }));

  return (
    <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div className="flex flex-col">
          <Label className="mb-1 block text-sm font-medium text-[#26272A]">Estado</Label>
          <Select value={local.estado} onValueChange={(v) => set('estado', v as any)}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
              <SelectItem value="En atención">En atención</SelectItem>
              <SelectItem value="Cerrado">Cerrado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <Label className="mb-1 block text-sm font-medium text-[#26272A]">Fuente</Label>
          <Select value={local.fuente} onValueChange={(v) => set('fuente', v as any)}>
            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="google_forms">Google Forms</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <Label className="mb-1 block text-sm font-medium text-[#26272A]">Buscar</Label>
          <Input placeholder="correo/nombre/descripcion" value={local.q || ''} onChange={(e)=>set('q', e.target.value)} />
        </div>

        <div className="flex flex-col">
          <Label className="mb-1 block text-sm font-medium text-[#26272A]">Orden</Label>
          <Select value={local.order_by} onValueChange={(v) => set('order_by', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="received_at.desc">Recibidos (desc)</SelectItem>
              <SelectItem value="received_at">Recibidos (asc)</SelectItem>
              <SelectItem value="closed_at.desc">Cerrados (desc)</SelectItem>
              <SelectItem value="closed_at">Cerrados (asc)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2 md:col-span-2">
          <Button 
            className="
              inline-flex items-center gap-2 rounded-xl
              bg-[#208692] hover:bg-[#164F5B] text-white
              transition-colors duration-200 shadow-sm
              px-4 py-2.5 text-sm font-semibold
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
            "
            disabled={loading} 
            onClick={() => onSubmit(local)}
          >
            Aplicar
          </Button>
          <Button 
            variant="secondary"
            className="
              inline-flex items-center gap-2 rounded-xl
              border border-[#CFD0BF] text-[#164F5B]
              hover:bg-[#E5EADF] transition-colors
              px-4 py-2.5 text-sm font-semibold
            "
            disabled={loading} 
            onClick={onClear}
          >
            Limpiar
          </Button>
        </div>
      </div>
    </div>
  );
}
