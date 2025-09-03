import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  EquipoFormSchema,
  type EquipoFormValues,
  nullify,
} from '../../data/equipos.types';
import {
  createEquipo,
  getEquipoById,
  listEstados,
  listResponsables,
  updateEquipo,
} from '../../data/equipos.repository';

import { Button } from '@/components/ui/button';
import { ChevronDown, Loader2, Save, X, Cpu, HardDrive, MemoryStick, BadgeInfo, UserRound } from 'lucide-react';

type Estado = { id: number; nombre: string };
type Responsable = { user_id: string; full_name: string };

/* ---------- Toast simple (sin dependencias) ---------- */
function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [type, setType] = React.useState<'success' | 'error' | null>(null);
  const show = (m: string, t: 'success' | 'error' = 'success') => {
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
        className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md ${
          type === 'success'
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'
        }`}
        role="status"
        aria-live="polite"
      >
        {msg}
      </div>
    ) : null;
  return { show, Toast };
}

/* ---------- Util: date a input YYYY-MM-DD ---------- */
const toDateInput = (v: unknown): string => {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  try {
    return new Date(v as any).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

/* ---------- FancySelect: nativo con look shadcn + icono ---------- */
type FancySelectProps = {
  id?: string;
  value: string | number | undefined;
  onChange: (v: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
};
function FancySelect({ id, value, onChange, placeholder, icon, children, required }: FancySelectProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80">
          {icon}
        </span>
      )}

      <select
        id={id}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`
          h-11 w-full appearance-none rounded-xl
          border border-input bg-white
          ${icon ? 'pl-10' : 'pl-3'} pr-9
          text-sm shadow-sm transition
          hover:bg-slate-50
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2
          ring-offset-background
        `}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>

      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80"
        aria-hidden
      />
    </div>
  );
}

export default function EquiposForm() {
  const navigate = useNavigate();
  const params = useParams();
  const equipoId = params.id ? Number(params.id) : undefined;
  const isEdit = Boolean(equipoId);
  const { show, Toast } = useToast();

  const [estados, setEstados] = React.useState<Estado[]>([]);
  const [responsables, setResponsables] = React.useState<Responsable[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset, // <- usamos reset para hidratar en edición
    formState: { isSubmitting, errors },
  } = useForm<EquipoFormValues>({
    resolver: zodResolver(EquipoFormSchema) as unknown as Resolver<EquipoFormValues>,
    defaultValues: {
      tipo_equipo: '',
      marca: '',
      modelo: '',
      num_serie: '',
      procesador: '',
      ram: '',
      disco: '',
      sistema_operativo: '',
      ubicacion_actual: '',
      estado_equipo_id: undefined,
      responsable_id: undefined,
      fecha_ingreso: '',
      fecha_salida: '',
      observaciones: '',
    },
  });

  // valores actuales (para controlar FancySelect)
  const estadoValue = watch('estado_equipo_id');      // number | undefined
  const responsableValue = watch('responsable_id');   // string | undefined

  /* --------- cargar catálogos --------- */
  React.useEffect(() => {
    (async () => {
      const [e, r] = await Promise.all([listEstados(), listResponsables()]);
      if (!e.error && Array.isArray(e.data)) setEstados(e.data as Estado[]);
      if (!r.error && Array.isArray(r.data)) setResponsables(r.data as Responsable[]);
    })();
  }, []);

  /* --------- cargar equipo si es edición --------- */
  const hydratedRef = React.useRef<number | null>(null); // guarda el id ya hidratado

  React.useEffect(() => {
    (async () => {
      if (!isEdit) {
        setLoading(false);
        hydratedRef.current = null;
        return;
      }

      // Evita rehidratar repetidamente el mismo id
      if (hydratedRef.current === equipoId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await getEquipoById(equipoId!);
      if (error) {
        setLoading(false);
        show(error.message || 'No se pudo cargar el equipo', 'error');
        return;
      }
      if (data) {
        const mapped: EquipoFormValues = {
          tipo_equipo: data.tipo_equipo ?? '',
          marca: data.marca ?? '',
          modelo: data.modelo ?? '',
          num_serie: data.num_serie ?? '',
          procesador: data.procesador ?? '',
          ram: data.ram ?? '',
          disco: data.disco ?? '',
          sistema_operativo: data.sistema_operativo ?? '',
          ubicacion_actual: data.ubicacion_actual ?? '',
          estado_equipo_id:
            data.estado_equipo_id == null ? undefined : Number(data.estado_equipo_id),
          responsable_id:
            data.responsable_id == null || data.responsable_id === ''
              ? undefined
              : String(data.responsable_id),
          fecha_ingreso: toDateInput(data.fecha_ingreso),
          fecha_salida: toDateInput(data.fecha_salida),
          observaciones: data.observaciones ?? '',
        };

        reset(mapped);                 // <- hidrata una sola vez
        hydratedRef.current = equipoId!;
      }
      setLoading(false);
    })();
    // OJO: NO incluir `show` aquí; puede ser inestable y re-disparar el efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, equipoId, reset]); // deps mínimas y seguras

  const onSubmit = async (values: EquipoFormValues) => {
    const payload = nullify(values) as any;
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    if (payload.num_serie === null) delete payload.num_serie;

    try {
      if (isEdit) await updateEquipo(equipoId!, payload);
      else await createEquipo(payload);

      show('Equipo guardado');
      setTimeout(() => navigate('/equipos'), 500);
    } catch (err: any) {
      const code = err?.code;
      if (code === '23505') show('Número de serie ya existe', 'error');
      else if (code === '23503') show('Datos inválidos: estado o responsable', 'error');
      else show(err?.message || 'Error inesperado', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" aria-label="Cargando" role="status" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? 'Editar equipo' : 'Nuevo equipo'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Completa los datos del equipo. Los campos marcados con <span className="text-slate-900">*</span> son obligatorios.
        </p>
      </div>

      {/* Card del formulario */}
      <form
        id="equipos-form"
        className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* ---- Sección: Identidad ---- */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Identidad</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="tipo_equipo" className="mb-1 block text-sm font-medium text-slate-700">
                Tipo de equipo <span className="text-slate-900">*</span>
              </label>
              <input
                id="tipo_equipo"
                placeholder="Laptop, PC de escritorio, Impresora…"
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                {...register('tipo_equipo')}
              />
              {errors.tipo_equipo && (
                <p className="mt-1 text-xs text-rose-600">{errors.tipo_equipo.message as string}</p>
              )}
            </div>

            <div>
              <label htmlFor="marca" className="mb-1 block text-sm font-medium text-slate-700">
                Marca
              </label>
              <input
                id="marca"
                placeholder="Dell, HP, Lenovo…"
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                {...register('marca')}
              />
            </div>

            <div>
              <label htmlFor="modelo" className="mb-1 block text-sm font-medium text-slate-700">
                Modelo
              </label>
              <input
                id="modelo"
                placeholder="Latitude 5430…"
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                {...register('modelo')}
              />
            </div>

            <div>
              <label htmlFor="num_serie" className="mb-1 block text-sm font-medium text-slate-700">
                Número de serie
              </label>
              <input
                id="num_serie"
                placeholder="SN-XXXXXX"
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                {...register('num_serie')}
              />
            </div>

            <div>
              <label htmlFor="ubicacion_actual" className="mb-1 block text-sm font-medium text-slate-700">
                Ubicación actual
              </label>
              <input
                id="ubicacion_actual"
                placeholder="Almacén, Oficina A-2, Soporte…"
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                {...register('ubicacion_actual')}
              />
            </div>
          </div>
        </div>

        {/* ---- Sección: Especificaciones ---- */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Especificaciones</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="procesador" className="mb-1 block text-sm font-medium text-slate-700">
                Procesador
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Cpu className="h-4 w-4" />
                </span>
                <input
                  id="procesador"
                  placeholder="Intel i5, Ryzen 7…"
                  className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                  {...register('procesador')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="ram" className="mb-1 block text-sm font-medium text-slate-700">
                RAM
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <MemoryStick className="h-4 w-4" />
                </span>
                <input
                  id="ram"
                  placeholder="8 GB, 16 GB…"
                  className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                  {...register('ram')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="disco" className="mb-1 block text-sm font-medium text-slate-700">
                Disco
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <HardDrive className="h-4 w-4" />
                </span>
                <input
                  id="disco"
                  placeholder="SSD 512 GB…"
                  className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                  {...register('disco')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="sistema_operativo" className="mb-1 block text-sm font-medium text-slate-700">
                Sistema Operativo
              </label>
              <input
                id="sistema_operativo"
                placeholder="Windows 11, Ubuntu 24.04…"
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                {...register('sistema_operativo')}
              />
            </div>
          </div>
        </div>

        {/* ---- Sección: Estado & Responsable ---- */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Asignación</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Estado (number) */}
            <div>
              <label htmlFor="estado_equipo_id" className="mb-1 block text-sm font-medium text-slate-700">
                Estado <span className="text-slate-900">*</span>
              </label>
              <FancySelect
                id="estado_equipo_id"
                value={estadoValue === undefined || estadoValue === null ? '' : String(estadoValue)}
                onChange={(val) => {
                  setValue(
                    'estado_equipo_id',
                    val === '' ? undefined : Number(val),
                    { shouldValidate: true, shouldDirty: true }
                  );
                }}
                placeholder="Selecciona un estado"
                icon={<BadgeInfo className="h-4 w-4" />}
                required
              >
                {estados.map((e) => (
                  <option key={e.id} value={String(e.id)}>
                    {e.nombre}
                  </option>
                ))}
              </FancySelect>
              {errors.estado_equipo_id && (
                <p className="mt-1 text-xs text-rose-600">{errors.estado_equipo_id.message as string}</p>
              )}
            </div>

            {/* Responsable (uuid string) */}
            <div>
              <label htmlFor="responsable_id" className="mb-1 block text-sm font-medium text-slate-700">
                Responsable
              </label>
              <FancySelect
                id="responsable_id"
                value={responsableValue ?? ''}
                onChange={(val) => {
                  setValue(
                    'responsable_id',
                    val || undefined,
                    { shouldValidate: true, shouldDirty: true }
                  );
                }}
                placeholder="Sin responsable"
                icon={<UserRound className="h-4 w-4" />}
              >
                {responsables.map((r) => (
                  <option key={r.user_id} value={r.user_id}>
                    {r.full_name}
                  </option>
                ))}
              </FancySelect>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 gap-4 md:col-span-1">
              <div>
                <label htmlFor="fecha_ingreso" className="mb-1 block text-sm font-medium text-slate-700">
                  Fecha de ingreso
                </label>
                <input
                  id="fecha_ingreso"
                  type="date"
                  className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                  {...register('fecha_ingreso')}
                />
              </div>
              <div>
                <label htmlFor="fecha_salida" className="mb-1 block text-sm font-medium text-slate-700">
                  Fecha de salida
                </label>
                <input
                  id="fecha_salida"
                  type="date"
                  className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                  {...register('fecha_salida')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---- Sección: Observaciones ---- */}
        <div className="mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Observaciones</h2>
          <div className="mt-3">
            <textarea
              id="observaciones"
              aria-label="Observaciones"
              placeholder="Notas, daños, accesorios incluidos…"
              rows={5}
              className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
              {...register('observaciones')}
            />
            <p className="mt-1 text-xs text-slate-500">Máximo recomendado: 500 caracteres.</p>
          </div>
        </div>

        {/* Botonera inferior */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            onClick={() => navigate('/equipos')}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="
              rounded-xl bg-gradient-to-b from-slate-900 to-slate-700 text-white
              hover:from-slate-800 hover:to-slate-600
            "
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEdit ? 'Guardar cambios' : 'Guardar'}
          </Button>
        </div>
      </form>

      <Toast />
    </div>
  );
}


