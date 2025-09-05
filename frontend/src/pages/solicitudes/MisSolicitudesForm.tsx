// frontend/src/pages/solicitudes/MisSolicitudesForm.tsx
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  SolicitudFormSchema,
  type SolicitudFormValues,
  buildEquipoLabel,
  type EquipoLite,
} from "@/data/solicitudes.types";
import { listEquiposPropiosLite, createSolicitud } from "@/data/solicitudes.repository";
import { Button } from "@/components/ui/button";

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
      <div
        className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md ${
          type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        }`}
      >
        {msg}
      </div>
    ) : null;
  return { show, Toast };
}

export default function MisSolicitudesForm() {
  const navigate = useNavigate();
  const { show, Toast } = useToast();
  const [params] = useSearchParams();

  // Catálogo de equipos del responsable
  const [equipos, setEquipos] = React.useState<EquipoLite[]>([]);
  const [loading, setLoading] = React.useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SolicitudFormValues>({
    resolver: zodResolver(SolicitudFormSchema),
    defaultValues: {
      equipo_id: params.get("equipo_id") ? Number(params.get("equipo_id")) : (undefined as any),
      descripcion: params.get("descripcion") ?? "",
    },
  });

  // Prefetch equipos propios
  React.useEffect(() => {
    (async () => {
      try {
        // TODO: reemplazar por el userId de sesión real
        const solicitanteId = (window as any).__currentUserId || "me";
        const { data, error } = await listEquiposPropiosLite(solicitanteId);
        if (error) throw error;
        setEquipos(data);

        // Si viene ?equipo_id=..., validar que sea de la lista del responsable
        const preId = params.get("equipo_id");
        if (preId) {
          const n = Number(preId);
          if (data.some((e) => e.equipo_id === n)) {
            setValue("equipo_id", n, { shouldDirty: true, shouldValidate: true });
          }
        }
      } catch (e: any) {
        show(e?.message || "No se pudieron cargar tus equipos", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [params, setValue, show]);

  const onSubmit: SubmitHandler<SolicitudFormValues> = async (values) => {
    try {
      // TODO: reemplazar por el userId real desde sesión
      const solicitanteId = (window as any).__currentUserId || "me";

      const { ok, error } = await createSolicitud({
        equipo_id: values.equipo_id,
        solicitante_id: solicitanteId as string,
        descripcion: values.descripcion,
      });

      if (error || !ok) throw error ?? new Error("Error al crear solicitud");
      show("Solicitud enviada");
      setTimeout(() => navigate("/mis-solicitudes"), 500);
    } catch (e: any) {
      show(e?.message || "No se pudo enviar la solicitud", "error");
    }
  };

  const equipoId = watch("equipo_id");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nueva solicitud</h1>
        <p className="mt-1 text-sm text-slate-600">
          Envía una solicitud para que el administrador atienda tu equipo.
        </p>
      </div>

      <form
        className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Equipo */}
        <div className="mb-4">
          <label htmlFor="equipo_id" className="mb-1 block text-sm font-medium text-slate-700">
            Equipo *
          </label>
          <div className="relative">
            <select
              id="equipo_id"
              className={`h-11 w-full appearance-none rounded-xl border px-3 text-sm shadow-sm outline-none transition
                ${errors.equipo_id ? "border-rose-300 bg-rose-50" : "border-gray-300 bg-white"}`}
              value={equipoId ?? ""}
              onChange={(e) =>
                setValue("equipo_id", Number(e.target.value), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              disabled={loading}
            >
              <option value="" disabled>
                {loading ? "Cargando..." : "Selecciona un equipo"}
              </option>
              {equipos.map((e) => (
                <option key={e.equipo_id} value={e.equipo_id}>
                  {buildEquipoLabel(e)}
                </option>
              ))}
            </select>
          </div>
          {errors.equipo_id && (
            <p className="mt-1 text-xs text-rose-600">{errors.equipo_id.message as string}</p>
          )}
        </div>

        {/* Descripción */}
        <div className="mb-4">
          <label htmlFor="descripcion" className="mb-1 block text-sm font-medium text-slate-700">
            Descripción (opcional)
          </label>
          <textarea
            id="descripcion"
            rows={4}
            className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm shadow-sm outline-none transition focus:border-gray-400"
            placeholder="Describe el problema o la petición"
            {...register("descripcion")}
          />
          {errors.descripcion && (
            <p className="mt-1 text-xs text-rose-600">
              {errors.descripcion.message as string}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" className="rounded-xl" onClick={() => navigate("/mis-solicitudes")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="rounded-xl">
            Enviar solicitud
          </Button>
        </div>
      </form>

      <Toast />
    </div>
  );
}



