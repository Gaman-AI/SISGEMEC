import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SolicitudFormSchema, type SolicitudFormValues } from "@/data/solicitudes.types";
import { createSolicitud, listEquiposPropiosLite } from "@/data/solicitudes.repository";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [type, setType] = React.useState<"success" | "error" | null>(null);
  const show = (m: string, t: "success" | "error" = "success") => {
    setMsg(m);
    setType(t);
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => { setMsg(null); setType(null); }, 3000);
  };
  const Toast = () => msg ? (
    <div className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>{msg}</div>
  ) : null;
  return { show, Toast };
}

function FancySelect({ id, value, onChange, placeholder }: { id?: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-input bg-white pl-3 pr-9 text-sm shadow-sm outline-none transition-colors focus:border-gray-400"
      >
        <option value="">{placeholder}</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
    </div>
  );
}

export default function MisSolicitudesForm() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { show, Toast } = useToast();

  const equipoIdQuery = sp.get("equipo_id");
  const equipoIdInitial = equipoIdQuery ? Number(equipoIdQuery) : 0;

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<SolicitudFormValues>({
    resolver: zodResolver(SolicitudFormSchema),
    defaultValues: {
      equipo_id: equipoIdInitial,
      descripcion: undefined,
    },
  });

  const equipoId = watch("equipo_id");
  const [equipos, setEquipos] = React.useState<Array<{ equipo_id: number; tipo_equipo: string | null; marca: string | null; modelo: string | null; num_serie: string | null }>>([]);

  React.useEffect(() => {
    (async () => {
      // TODO: userId real
      const userId = (window as any).__currentUserId || "me";
      const { data } = await listEquiposPropiosLite(userId as string);
      setEquipos(data);
    })();
  }, []);

  const onSubmit: SubmitHandler<SolicitudFormValues> = async (values) => {
    try {
      // TODO: solicitante real desde sesión
      const solicitante_id = (window as any).__currentUserId || "me";
      const res = await createSolicitud({ ...values, solicitante_id: solicitante_id as string });
      if (res.error) throw res.error;
      show("Solicitud enviada");
      setTimeout(() => navigate("/mis-solicitudes"), 500);
    } catch (e: any) {
      show(e?.message || "Error al enviar", "error");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Nueva solicitud</h1>
        <p className="mt-1 text-sm text-slate-600">Completa la información de la solicitud.</p>
      </div>

      <form className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="equipo_id" className="mb-1 block text-sm font-medium text-slate-700">Equipo *</label>
            <div className="relative">
              <select
                id="equipo_id"
                className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-3 pr-9 text-sm shadow-sm outline-none focus:border-gray-400"
                value={equipoId?.toString() || ""}
                onChange={(e) => setValue("equipo_id", e.target.value ? Number(e.target.value) : 0, { shouldDirty: true, shouldValidate: true })}
                required
              >
                <option value="">Seleccionar equipo</option>
                {equipos.map((e) => (
                  <option key={e.equipo_id} value={e.equipo_id}>
                    {[e.tipo_equipo, e.marca, e.modelo, e.num_serie].filter(Boolean).join(' - ')}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            </div>
            {errors.equipo_id && <p className="mt-1 text-xs text-rose-600">{errors.equipo_id.message as string}</p>}
          </div>

          <div>
            <label htmlFor="descripcion" className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
            <textarea id="descripcion" rows={4} className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm shadow-sm outline-none focus:border-gray-400" placeholder="Describe el problema (opcional)" {...register("descripcion")} />
            {errors.descripcion && <p className="mt-1 text-xs text-rose-600">{errors.descripcion.message as string}</p>}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" className="rounded-xl" onClick={() => navigate("/mis-solicitudes")}>Cancelar</Button>
          <Button type="submit" className="rounded-xl" disabled={isSubmitting}>Enviar</Button>
        </div>
      </form>

      <Toast />
    </div>
  );
}


