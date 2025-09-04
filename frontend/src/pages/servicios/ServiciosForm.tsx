import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ServicioFormSchema, type ServicioFormValues } from "../../data/servicios.types";
import { 
  createServicio, 
  getServicioById, 
  updateServicio,
  listEquiposLite,
  listTiposServicioLite,
  listEstadosServicioLite,
  listAdminsLite,
} from "../../data/servicios.repository";
import { Button } from "@/components/ui/button";
import { Save, X, ChevronDown, Laptop, Wrench, User, Calendar } from "lucide-react";

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
      <div className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`} role="status" aria-live="polite">{msg}</div>
    ) : null;
  return { show, Toast };
}

type FancySelectProps = {
  id?: string;
  value: string;
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
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          {icon}
        </span>
      )}
      <select
        id={id}
        value={value ?? ''}
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
      />
    </div>
  );
}

export default function ServiciosForm() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ? Number(params.id) : null;
  const isEdit = Number.isFinite(id);
  const { show, Toast } = useToast();

  const hydratedRef = React.useRef<number | null>(null);

  // Catálogos
  const [equipos, setEquipos] = React.useState<Array<{equipo_id: number; tipo_equipo: string | null; marca: string | null; modelo: string | null; num_serie: string | null}>>([]);
  const [tipos, setTipos] = React.useState<Array<{tipo_servicio_id: number; nombre: string}>>([]);
  const [estados, setEstados] = React.useState<Array<{estado_servicio_id: number; nombre: string}>>([]);
  const [admins, setAdmins] = React.useState<Array<{user_id: string; full_name: string | null}>>([]);

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<ServicioFormValues>({
    resolver: zodResolver(ServicioFormSchema),
    defaultValues: { 
      equipo_id: 0,
      tipo_servicio_id: 0,
      estado_servicio_id: 1, // Pendiente por defecto
      tecnico_id: undefined,
      fecha_servicio: new Date().toISOString().slice(0, 10), // Hoy
      descripcion: undefined,
      observaciones: undefined,
    },
  });

  // Cargar catálogos
  React.useEffect(() => {
    const loadCatálogos = async () => {
      try {
        const [equiposRes, tiposRes, estadosRes, adminsRes] = await Promise.all([
          listEquiposLite(),
          listTiposServicioLite(),
          listEstadosServicioLite(),
          listAdminsLite()
        ]);
        
        setEquipos(equiposRes.data);
        setTipos(tiposRes.data);
        setEstados(estadosRes.data);
        setAdmins(adminsRes.data);
      } catch (e) {
        console.error('Error cargando catálogos:', e);
        show('Error al cargar catálogos', 'error');
      }
    };
    
    loadCatálogos();
  }, [show]);

  // Cargar datos para edición
  React.useEffect(() => {
    const loadServicio = async () => {
      if (!isEdit || !id) return;
      if (hydratedRef.current === id) return;
      
      try {
        const { data, error } = await getServicioById(id);
        if (error) {
          show(error, 'error');
          return;
        }
        
        if (data) {
          const mapped: ServicioFormValues = {
            equipo_id: data.equipo_id,
            tipo_servicio_id: data.tipo_servicio_id,
            estado_servicio_id: data.estado_servicio_id || 1,
            tecnico_id: data.tecnico_id || undefined,
            fecha_servicio: data.fecha_servicio,
            descripcion: data.descripcion || undefined,
            observaciones: data.observaciones || undefined,
          };
          reset(mapped);
          hydratedRef.current = id;
        }
      } catch (e: any) {
        show(e?.message || 'Error al cargar servicio', 'error');
      }
    };
    
    loadServicio();
  }, [isEdit, id, reset, show]);

  const onSubmit: SubmitHandler<ServicioFormValues> = async (values) => {
    try {
      if (isEdit && id) {
        const { ok, error } = await updateServicio(id, values);
        if (error) {
          show(error, 'error');
          return;
        }
        show("Servicio actualizado");
      } else {
        const { data, error } = await createServicio(values);
        if (error) {
          show(error, 'error');
          return;
        }
        show("Servicio creado");
      }
      setTimeout(() => navigate("/servicios"), 500);
    } catch (e: any) {
      show(e?.message || "Error al guardar", "error");
    }
  };

  // Watch para selects controlados
  const equipoId = watch("equipo_id");
  const tipoId = watch("tipo_servicio_id");
  const estadoId = watch("estado_servicio_id");
  const tecnicoId = watch("tecnico_id");

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{isEdit ? "Editar servicio" : "Nuevo servicio"}</h1>
        <p className="mt-1 text-sm text-slate-600">Completa la información del servicio.</p>
      </div>

      <form
        className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Equipo */}
          <div>
            <label htmlFor="equipo_id" className="mb-1 block text-sm font-medium text-slate-700">Equipo *</label>
            <FancySelect
              id="equipo_id"
              value={equipoId?.toString() || ""}
              onChange={(v) => setValue("equipo_id", v ? Number(v) : 0, { shouldDirty: true, shouldValidate: true })}
              placeholder="Seleccionar equipo"
              icon={<Laptop className="h-4 w-4" />}
              required
            >
              {equipos.map((e) => (
                <option key={e.equipo_id} value={e.equipo_id}>
                  {[e.tipo_equipo, e.marca, e.modelo, e.num_serie].filter(Boolean).join(' - ')}
                </option>
              ))}
            </FancySelect>
            {errors.equipo_id && <p className="mt-1 text-xs text-rose-600">{errors.equipo_id.message as string}</p>}
          </div>

          {/* Tipo de servicio */}
          <div>
            <label htmlFor="tipo_servicio_id" className="mb-1 block text-sm font-medium text-slate-700">Tipo de servicio *</label>
            <FancySelect
              id="tipo_servicio_id"
              value={tipoId?.toString() || ""}
              onChange={(v) => setValue("tipo_servicio_id", v ? Number(v) : 0, { shouldDirty: true, shouldValidate: true })}
              placeholder="Seleccionar tipo"
              icon={<Wrench className="h-4 w-4" />}
              required
            >
              {tipos.map((t) => (
                <option key={t.tipo_servicio_id} value={t.tipo_servicio_id}>
                  {t.nombre}
                </option>
              ))}
            </FancySelect>
            {errors.tipo_servicio_id && <p className="mt-1 text-xs text-rose-600">{errors.tipo_servicio_id.message as string}</p>}
          </div>

          {/* Estado */}
          <div>
            <label htmlFor="estado_servicio_id" className="mb-1 block text-sm font-medium text-slate-700">Estado *</label>
            <FancySelect
              id="estado_servicio_id"
              value={estadoId?.toString() || ""}
              onChange={(v) => setValue("estado_servicio_id", v ? Number(v) : 1, { shouldDirty: true, shouldValidate: true })}
              placeholder="Seleccionar estado"
              icon={<Wrench className="h-4 w-4" />}
              required
            >
              {estados.map((e) => (
                <option key={e.estado_servicio_id} value={e.estado_servicio_id}>
                  {e.nombre}
                </option>
              ))}
            </FancySelect>
            {errors.estado_servicio_id && <p className="mt-1 text-xs text-rose-600">{errors.estado_servicio_id.message as string}</p>}
          </div>

          {/* Técnico */}
          <div>
            <label htmlFor="tecnico_id" className="mb-1 block text-sm font-medium text-slate-700">Asignado a (Admin)</label>
            <FancySelect
              id="tecnico_id"
              value={tecnicoId || ""}
              onChange={(v) => setValue("tecnico_id", v || undefined, { shouldDirty: true, shouldValidate: true })}
              placeholder="Selecciona un administrador (opcional)"
              icon={<User className="h-4 w-4" />}
            >
              {admins.map((t) => (
                <option key={t.user_id} value={t.user_id}>
                  {t.full_name || 'Sin nombre'}
                </option>
              ))}
            </FancySelect>
            {errors.tecnico_id && <p className="mt-1 text-xs text-rose-600">{errors.tecnico_id.message as string}</p>}
          </div>

          {/* Fecha de servicio */}
          <div className="md:col-span-2">
            <label htmlFor="fecha_servicio" className="mb-1 block text-sm font-medium text-slate-700">Fecha de servicio *</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Calendar className="h-4 w-4" />
              </span>
              <input
                id="fecha_servicio"
                type="date"
                className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
                {...register("fecha_servicio")}
              />
            </div>
            {errors.fecha_servicio && <p className="mt-1 text-xs text-rose-600">{errors.fecha_servicio.message as string}</p>}
          </div>

          {/* Descripción */}
          <div className="md:col-span-2">
            <label htmlFor="descripcion" className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
            <textarea
              id="descripcion"
              rows={4}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm shadow-sm outline-none transition focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
              placeholder="Descripción del servicio (opcional)"
              {...register("descripcion")}
            />
            {errors.descripcion && <p className="mt-1 text-xs text-rose-600">{errors.descripcion.message as string}</p>}
          </div>

          {/* Observaciones */}
          <div className="md:col-span-2">
            <label htmlFor="observaciones" className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
            <textarea
              id="observaciones"
              rows={4}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm shadow-sm outline-none transition focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
              placeholder="Observaciones adicionales (opcional)"
              {...register("observaciones")}
            />
            {errors.observaciones && <p className="mt-1 text-xs text-rose-600">{errors.observaciones.message as string}</p>}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" className="rounded-xl" onClick={() => navigate('/servicios')}>
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="rounded-xl">
            <Save className="mr-2 h-4 w-4" />
            {isEdit ? 'Guardar cambios' : 'Crear servicio'}
          </Button>
        </div>
      </form>

      <Toast />
    </div>
  );
}
