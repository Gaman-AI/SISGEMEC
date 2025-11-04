import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PriorityBadgeSelect from './PriorityBadgeSelect';
import { CatalogService, type EquipoOption, type TipoServicioOption } from '@/services/catalog';
import type { TicketClassify, PriorityType } from '@/types/tickets';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: TicketClassify) => Promise<void>;
  loading?: boolean;
  defaultEmail?: string;
  defaultPriority?: PriorityType;
}

export default function TicketClassifyDialog({
  open,
  onClose,
  onSave,
  loading,
  defaultEmail = '',
  defaultPriority = 'Medium',
}: Props) {
  const [email, setEmail] = React.useState(defaultEmail);
  const [equipoId, setEquipoId] = React.useState<number | null>(null);
  const [tipoId, setTipoId] = React.useState<number | null>(null);
  const [priority, setPriority] = React.useState<PriorityType>(defaultPriority);
  const [obs, setObs] = React.useState('');
  const [equipos, setEquipos] = React.useState<EquipoOption[]>([]);
  const [tipos, setTipos] = React.useState<TipoServicioOption[]>([]);
  const [loadingEquipos, setLoadingEquipos] = React.useState(false);
  const [loadingTipos, setLoadingTipos] = React.useState(false);

  // Cargar catálogos cuando se abre el modal
  React.useEffect(() => {
    if (!open) {
      // Reset al cerrar
      setEmail('');
      setEquipoId(null);
      setTipoId(null);
      setPriority('Medium');
      setObs('');
      setEquipos([]);
      setTipos([]);
      return;
    }

    // Inicializar con valores por defecto
    setEmail(defaultEmail || '');
    setPriority(defaultPriority || 'Medium');
    setEquipoId(null);
    setTipoId(null);
    setObs('');

    // Cargar tipos de servicio (siempre)
    (async () => {
      try {
        setLoadingTipos(true);
        const ts = await CatalogService.fetchTiposServicio();
        setTipos(ts);
      } catch (e: any) {
        console.warn('[TicketClassifyDialog] Error loading tipos:', e?.message ?? e);
      } finally {
        setLoadingTipos(false);
      }
    })();

    // Cargar equipos por email (solo si hay email)
    (async () => {
      try {
        setLoadingEquipos(true);
        if (defaultEmail && defaultEmail.trim()) {
          const es = await CatalogService.fetchEquiposByEmail(defaultEmail.trim());
          setEquipos(es);
        } else {
          setEquipos([]);
        }
      } catch (e: any) {
        console.warn('[TicketClassifyDialog] Error loading equipos:', e?.message ?? e);
        setEquipos([]);
      } finally {
        setLoadingEquipos(false);
      }
    })();
  }, [open, defaultEmail, defaultPriority]);

  const canSave = Boolean(tipoId) && !loading;

  const handleSave = async () => {
    if (!tipoId) return; // tipo_servicio_id es obligatorio

    const data: TicketClassify = {
      solicitante_id: email || undefined,
      equipo_id: equipoId ?? undefined,
      tipo_servicio_id: tipoId,
      priority,
      observaciones: obs || undefined,
    };

    await onSave(data);
    // onClose se llama desde el padre después de éxito
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Clasificar Ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Email Solicitante</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              disabled
            />
          </div>

          <div>
            <Label>Equipo</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={equipoId ?? ''}
              onChange={(e) => setEquipoId(e.target.value ? Number(e.target.value) : null)}
              disabled={loadingEquipos || loading}
            >
              <option value="">
                {loadingEquipos ? 'Cargando equipos...' : equipos.length === 0 ? 'Sin equipos asociados' : 'Sin selección (opcional)'}
              </option>
              {equipos.map((eq) => (
                <option key={eq.equipo_id} value={eq.equipo_id}>
                  {eq.etiqueta}
                </option>
              ))}
            </select>
            {!loadingEquipos && equipos.length === 0 && email && (
              <p className="text-xs text-muted-foreground mt-1">
                No hay equipos asociados a este correo.
              </p>
            )}
          </div>

          <div>
            <Label>Tipo Servicio *</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={tipoId ?? ''}
              onChange={(e) => setTipoId(e.target.value ? Number(e.target.value) : null)}
              disabled={loadingTipos || loading}
            >
              <option value="">
                {loadingTipos ? 'Cargando tipos...' : 'Selecciona un tipo'}
              </option>
              {tipos.map((t) => (
                <option key={t.tipo_servicio_id} value={t.tipo_servicio_id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            {!loadingTipos && tipos.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No hay tipos de servicio disponibles.
              </p>
            )}
          </div>

          <div>
            <Label>Prioridad *</Label>
            <div className="max-w-[220px]">
              <PriorityBadgeSelect
                value={priority}
                onChange={setPriority}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Notas adicionales..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!canSave || loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
