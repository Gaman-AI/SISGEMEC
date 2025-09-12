import React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/auth/auth.store";
import { listTiposServicioLite, convertirSolicitudEnServicio } from "@/data/solicitudes.repository";

// Schema de validación
const ConvertirFormSchema = z.object({
  tipoServicioId: z.string().min(1, "Selecciona un tipo de servicio"),
  fecha: z.string().min(1, "Fecha requerida"),
  observaciones: z.string().max(1000, "Máximo 1000 caracteres").optional(),
});

type ConvertirFormValues = z.infer<typeof ConvertirFormSchema>;

// Hook de toast local
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

interface ConvertirSolicitudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitudId: number | null;
  adminId: string;
  onConverted: (servicioId: number) => void;
}

export default function ConvertirSolicitudModal({
  open,
  onOpenChange,
  solicitudId,
  adminId,
  onConverted,
}: ConvertirSolicitudModalProps) {
  const { show, Toast } = useToast();
  
  const [tipos, setTipos] = React.useState<Array<{ tipo_servicio_id: number; nombre: string }>>([]);
  const [loadingTipos, setLoadingTipos] = React.useState(false);
  const [errorTipos, setErrorTipos] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Fecha por defecto: hoy
  const today = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<ConvertirFormValues>({
    resolver: zodResolver(ConvertirFormSchema),
    defaultValues: {
      tipoServicioId: "",
      fecha: today,
      observaciones: "",
    },
  });

  // Cargar tipos de servicio al abrir el modal
  const loadTipos = React.useCallback(async () => {
    setLoadingTipos(true);
    setErrorTipos(null);
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ConvertirModal] Cargando tipos de servicio...');
      }
      
      const { data, error } = await listTiposServicioLite();
      
      if (error) {
        const errorMsg = error.message || "Error al cargar tipos de servicio";
        setErrorTipos(errorMsg);
        if (process.env.NODE_ENV === 'development') {
          console.debug('[ConvertirModal] Error cargando tipos:', errorMsg);
        }
        return;
      }
      
      setTipos(data ?? []);
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ConvertirModal] Tipos cargados:', data?.length || 0);
      }
    } catch (e: any) {
      const errorMsg = e?.message || "Error al cargar tipos de servicio";
      setErrorTipos(errorMsg);
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ConvertirModal] Error cargando tipos:', errorMsg);
      }
    } finally {
      setLoadingTipos(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    
    let alive = true;
    const controller = new AbortController();
    
    const loadWithTimeout = async () => {
      const timeout = setTimeout(() => {
        if (alive) {
          controller.abort();
          setErrorTipos("Tiempo de espera agotado");
          setLoadingTipos(false);
        }
      }, 20000);
      
      try {
        await loadTipos();
      } finally {
        if (alive) {
          clearTimeout(timeout);
        }
      }
    };
    
    loadWithTimeout();
    
    return () => {
      alive = false;
      controller.abort();
    };
  }, [open, loadTipos]);

  // Reset form al cerrar
  React.useEffect(() => {
    if (!open) {
      reset();
      setSubmitting(false);
      setErrorTipos(null);
    }
  }, [open, reset]);

  const onSubmit: SubmitHandler<ConvertirFormValues> = async (values) => {
    if (submitting || !solicitudId) return;
    
    setSubmitting(true);
    
    try {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ConvertirModal] Enviando conversión:', { solicitudId, tipoServicioId: values.tipoServicioId });
      }
      
      const { ok, servicio_id, error } = await convertirSolicitudEnServicio({
        solicitudId,
        tipoServicioId: Number(values.tipoServicioId),
        adminId,
        fechaServicio: values.fecha,
        observaciones: values.observaciones || null,
      });

      if (!ok || !servicio_id) {
        throw error ?? new Error("No se pudo convertir la solicitud");
      }

      if (process.env.NODE_ENV === 'development') {
        console.debug('[ConvertirModal] Conversión exitosa:', servicio_id);
      }

      show(`Solicitud convertida a servicio #${servicio_id}`);
      onConverted(servicio_id);
      onOpenChange(false);
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[ConvertirModal] Error en conversión:', e?.message);
      }
      show(e?.message || "Error al convertir solicitud", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const tipoServicioId = watch("tipoServicioId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convertir a Servicio</DialogTitle>
        </DialogHeader>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo de Servicio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Servicio *
            </label>
            {errorTipos ? (
              <div className="space-y-2">
                <div className="h-11 w-full rounded-xl border border-rose-300 bg-rose-50 px-3 flex items-center text-sm text-rose-600">
                  {errorTipos}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadTipos}
                  className="rounded-xl"
                >
                  Reintentar
                </Button>
              </div>
            ) : (
              <Select
                value={tipoServicioId}
                onValueChange={(value) => setValue("tipoServicioId", value, { shouldValidate: true })}
                disabled={loadingTipos}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={loadingTipos ? "Cargando tipos..." : "Selecciona un tipo"} />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((tipo) => (
                    <SelectItem key={tipo.tipo_servicio_id} value={String(tipo.tipo_servicio_id)}>
                      {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.tipoServicioId && (
              <p className="mt-1 text-xs text-rose-600">{errors.tipoServicioId.message}</p>
            )}
          </div>

          {/* Fecha de Servicio */}
          <div>
            <label htmlFor="fecha" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Servicio *
            </label>
            <input
              type="date"
              id="fecha"
              className={`h-11 w-full rounded-xl border px-3 text-sm shadow-sm outline-none transition
                ${errors.fecha ? "border-rose-300 bg-rose-50" : "border-gray-300 bg-white"}`}
              {...register("fecha")}
            />
            {errors.fecha && (
              <p className="mt-1 text-xs text-rose-600">{errors.fecha.message}</p>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones (opcional)
            </label>
            <textarea
              id="observaciones"
              rows={3}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm shadow-sm outline-none transition focus:border-gray-400"
              placeholder="Observaciones adicionales..."
              {...register("observaciones")}
            />
            {errors.observaciones && (
              <p className="mt-1 text-xs text-rose-600">{errors.observaciones.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={submitting || loadingTipos || !isValid || !!errorTipos}
            >
              {submitting ? "Convirtiendo..." : "Convertir"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <Toast />
    </Dialog>
  );
}
