import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, type DefaultValues, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  TipoServicioFormSchema,
  type TipoServicioFormValues,
} from "../../data/tipos-servicio.types";
import {
  createTipoServicio,
  getTipoServicioById,
  updateTipoServicio,
} from "../../data/tipos-servicio.repository";
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
        role="status"
        aria-live="polite"
      >
        {msg}
      </div>
    ) : null;
  return { show, Toast };
}

export default function TiposServicioForm() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ? Number(params.id) : null;
  const isEdit = Number.isFinite(id);
  const { show, Toast } = useToast();

  const hydratedRef = React.useRef<number | null>(null);

  // ✅ Defaults aquí, no en el schema
  const defaultValues: DefaultValues<TipoServicioFormValues> = {
    nombre: "",
    activo: true,
    descripcion: undefined,
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TipoServicioFormValues>({
    // ✅ sin genéricos extra; con el schema “puro” ya no hay overcarga conflictiva
    resolver: zodResolver(TipoServicioFormSchema),
    defaultValues,
  });

  React.useEffect(() => {
    (async () => {
      if (!isEdit || !id) return;
      if (hydratedRef.current === id) return;

      // Soporta ambos estilos de repo: que devuelva { data, error } o directamente la fila
      const res = (await getTipoServicioById(id)) as any;
      const data = (res && "data" in res) ? res.data : res;
      const error = (res && "error" in res) ? res.error : null;

      if (error) {
        show(String(error?.message ?? error ?? "No se pudo cargar"), "error");
        return;
      }
      if (data) {
        const mapped: TipoServicioFormValues = {
          nombre: data.nombre ?? "",
          descripcion: data.descripcion ?? undefined,
          activo: !!data.activo,
        };
        reset(mapped);
        hydratedRef.current = id;
      }
    })();
  }, [isEdit, id, reset, show]);

  const onSubmit: SubmitHandler<TipoServicioFormValues> = async (values) => {
    try {
      // Normaliza descripción a null si tu DB lo prefiere así
      const descripcionNorm =
        values.descripcion?.trim() === "" ? null : values.descripcion ?? null;

      if (isEdit && id) {
        const res = (await updateTipoServicio(id, {
          nombre: values.nombre,
          descripcion: descripcionNorm,
          activo: values.activo,
        })) as any;
        const error = res?.error ?? null;
        if (error) throw error;
        show("Tipo de servicio actualizado");
      } else {
        const res = (await createTipoServicio({
          nombre: values.nombre,
          descripcion: descripcionNorm,
          activo: values.activo,
        })) as any;
        const error = res?.error ?? null;
        if (error) throw error;
        show("Tipo de servicio creado");
      }
      setTimeout(() => navigate("/tipos-servicio"), 500);
    } catch (e: any) {
      show(e?.message || "Error al guardar", "error");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? "Editar tipo de servicio" : "Nuevo tipo de servicio"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Completa la información del tipo de servicio.
        </p>
      </div>

      <form
        className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label
              htmlFor="nombre"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Nombre *
            </label>
            <input
              id="nombre"
              className={`h-11 w-full rounded-xl border px-3 text-sm shadow-sm outline-none transition ${
                errors.nombre
                  ? "border-rose-300 bg-rose-50"
                  : "border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
              }`}
              placeholder="Nombre del tipo"
              {...register("nombre")}
            />
            {errors.nombre && (
              <p className="mt-1 text-xs text-rose-600">
                {String(errors.nombre.message)}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="descripcion"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Descripción
            </label>
            <textarea
              id="descripcion"
              rows={4}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm shadow-sm outline-none transition focus:border-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-gray-600"
              placeholder="Descripción opcional"
              {...register("descripcion")}
            />
            {errors.descripcion && (
              <p className="mt-1 text-xs text-rose-600">
                {String(errors.descripcion.message)}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-slate-700"
                {...register("activo")}
              />
              <span className="text-sm text-slate-700">Activo</span>
            </label>
            {errors.activo && (
              <p className="mt-1 text-xs text-rose-600">
                {String(errors.activo.message)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            onClick={() => navigate("/tipos-servicio")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="rounded-xl">
            {isEdit ? "Guardar cambios" : "Crear tipo"}
          </Button>
        </div>
      </form>

      <Toast />
    </div>
  );
}


