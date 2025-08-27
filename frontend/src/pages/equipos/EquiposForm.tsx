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

type Estado = { id: number; nombre: string };
type Responsable = { user_id: string; full_name: string };

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

const toDateInput = (v: unknown): string => {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  try {
    return new Date(v as any).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

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
    formState: { isSubmitting },
  } = useForm<EquipoFormValues>({
    // 🔧 FIX TIPOS: evitamos genérico aquí y casteamos al tipo resolver esperado
    resolver: zodResolver(EquipoFormSchema) as unknown as Resolver<EquipoFormValues>,
    defaultValues: {
      // sin nulls en el form; usar '' o undefined
      tipo_equipo: '',
      marca: '',
      modelo: '',
      num_serie: '',
      procesador: '',
      ram: '',
      disco: '',
      sistema_operativo: '',
      ubicacion_actual: '',
      estado_equipo_id: undefined, // number | undefined
      responsable_id: undefined,   // uuid string | undefined
      fecha_ingreso: '',
      fecha_salida: '',
      observaciones: '',
    },
  });

  React.useEffect(() => {
    (async () => {
      const [e, r] = await Promise.all([listEstados(), listResponsables()]);
      if (!e.error && Array.isArray(e.data)) setEstados(e.data as Estado[]);
      if (!r.error && Array.isArray(r.data)) setResponsables(r.data as Responsable[]);
    })();
  }, []);

  React.useEffect(() => {
    (async () => {
      if (!isEdit) {
        setLoading(false);
        return;
      }
      const { data, error } = await getEquipoById(equipoId!);
      if (error) {
        setLoading(false);
        show(error.message || 'No se pudo cargar el equipo', 'error');
        return;
      }
      if (data) {
        const stringKeys = new Set<keyof EquipoFormValues>([
          'tipo_equipo','marca','modelo','num_serie','procesador','ram','disco',
          'sistema_operativo','ubicacion_actual','observaciones','responsable_id',
        ]);
        const dateKeys = new Set<keyof EquipoFormValues>(['fecha_ingreso','fecha_salida']);
        const numberKeys = new Set<keyof EquipoFormValues>(['estado_equipo_id']);

        (Object.entries(data) as [keyof EquipoFormValues, any][]).forEach(([k, v]) => {
          if (stringKeys.has(k)) setValue(k, (v ?? '') as any);
          else if (dateKeys.has(k)) setValue(k, toDateInput(v) as any);
          else if (numberKeys.has(k)) setValue(k, v == null ? undefined : Number(v));
        });
      }
      setLoading(false);
    })();
  }, [isEdit, equipoId, setValue, show]);

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
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"
          aria-label="Cargando"
          role="status"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto w-full max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Editar equipo' : 'Nuevo equipo'}
          </h1>
        </div>

        <form
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
          onSubmit={handleSubmit(onSubmit)}
        >
          <input aria-label="Tipo de equipo" placeholder="Tipo de equipo"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('tipo_equipo')}
          />
          <input aria-label="Marca" placeholder="Marca"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('marca')}
          />
          <input aria-label="Modelo" placeholder="Modelo"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('modelo')}
          />
          <input aria-label="Número de serie" placeholder="Número de serie"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('num_serie')}
          />
          <input aria-label="Procesador" placeholder="Procesador"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('procesador')}
          />
          <input aria-label="RAM" placeholder="RAM"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('ram')}
          />
          <input aria-label="Disco" placeholder="Disco"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('disco')}
          />
          <input aria-label="Sistema Operativo" placeholder="Sistema Operativo"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('sistema_operativo')}
          />
          <input aria-label="Ubicación actual" placeholder="Ubicación actual"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('ubicacion_actual')}
          />

          {/* Estado como number */}
          <select
            aria-label="Estado"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('estado_equipo_id', { valueAsNumber: true })}
            defaultValue=""
          >
            <option value="">Sin estado</option>
            {estados.map((e) => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>

          {/* Responsable como uuid string */}
          <select
            aria-label="Responsable"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('responsable_id')}
            defaultValue=""
          >
            <option value="">Sin responsable</option>
            {responsables.map((r) => (
              <option key={r.user_id} value={r.user_id}>{r.full_name}</option>
            ))}
          </select>

          <input type="date" aria-label="Fecha ingreso"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('fecha_ingreso')}
          />
          <input type="date" aria-label="Fecha salida"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            {...register('fecha_salida')}
          />

          <div className="md:col-span-3">
            <textarea
              aria-label="Observaciones"
              placeholder="Observaciones"
              rows={4}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              {...register('observaciones')}
            />
          </div>

          <div className="col-span-full flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200"
              onClick={() => navigate('/equipos')}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isEdit ? 'Guardar cambios' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      <Toast />
    </div>
  );
}
