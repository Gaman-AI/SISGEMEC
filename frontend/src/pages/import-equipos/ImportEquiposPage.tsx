import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Monitor, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import api from "@/lib/axios";
import ErrorBoundaryWrapper from "@/components/ErrorBoundaryWrapper";

// Schema de validación
const ImportFormSchema = z.object({
  file: z.instanceof(FileList).refine((files) => files.length > 0, "Selecciona un archivo"),
});

type ImportFormValues = z.infer<typeof ImportFormSchema>;

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
    }, 5000);
  };
  const Toast = () =>
    msg ? (
      <div
        className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md z-50 ${
          type === "success" ? "bg-[#208692] text-white" : "bg-rose-600 text-white"
        }`}
        role="status"
        aria-live="polite"
      >
        {msg}
      </div>
    ) : null;
  return { show, Toast };
}

interface ImportResult {
  ok: boolean;
  total_filas_excel: number;
  equipos_procesados: number;
  equipos_creados: number;
  equipos_actualizados: number;
  errores: Array<{ fila: number | string; mensaje: string }>;
}

export default function ImportEquiposPage() {
  const { show, Toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ImportFormValues>({
    resolver: zodResolver(ImportFormSchema),
  });

  const onSubmit = async (values: ImportFormValues) => {
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", values.file[0]);

      // El interceptor maneja automáticamente el token admin
      const response = await api.post("/import-equipos", formData);

      const data = response.data ?? {};
      const errores = Array.isArray(data.errores) ? data.errores : [];

      setResult({
        ok: data.ok ?? false,
        total_filas_excel: data.total_filas_excel ?? 0,
        equipos_procesados: data.equipos_procesados ?? 0,
        equipos_creados: data.equipos_creados ?? 0,
        equipos_actualizados: data.equipos_actualizados ?? 0,
        errores
      });

      if (data.ok) {
        show("Importación de equipos completada exitosamente");
      } else {
        show("Importación completada con errores", "error");
      }
    } catch (error: any) {
      console.error("Error en importación de equipos:", error);
      
      // Manejo de errores según status code
      if (error.response?.status >= 500) {
        show("Error interno del servidor. Revisa el backend.", "error");
      } else if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 403) {
        const errorData = error.response?.data;
        if (errorData?.errores && Array.isArray(errorData.errores) && errorData.errores.length > 0) {
          // Mostrar el primer error como mensaje principal
          const firstError = errorData.errores[0];
          const message = typeof firstError === 'string' ? firstError : firstError.mensaje || "Error al procesar el archivo";
          show(message, "error");
          
          // Establecer resultado para mostrar todos los errores
          setResult({
            ok: false,
            total_filas_excel: errorData.total_filas_excel ?? 0,
            equipos_procesados: errorData.equipos_procesados ?? 0,
            equipos_creados: errorData.equipos_creados ?? 0,
            equipos_actualizados: errorData.equipos_actualizados ?? 0,
            errores: errorData.errores
          });
        } else {
          show("Error al procesar el archivo", "error");
        }
      } else {
        show("Error al procesar el archivo", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundaryWrapper>
      <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
          Importar Equipos
        </h1>
        <p className="text-sm lg:text-base text-[#26272A] mt-1">
          Sube un archivo Excel (.xlsx/.xls) con la hoja "Equipos" para importar equipos al sistema.
        </p>
      </div>

      {/* Formulario de importación */}
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#164F5B]">
            <Monitor className="h-5 w-5" />
            Subir Archivo Excel - Equipos
          </CardTitle>
          <CardDescription className="text-[#26272A]">
            Selecciona un archivo Excel con la hoja "Equipos" para importar equipos a la base de datos
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Input de archivo */}
              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium text-[#26272A]">Archivo Excel (.xlsx, .xls)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  {...register("file")}
                  className="
                    file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0
                    file:text-sm file:font-semibold
                    file:bg-[#E5EADF] file:text-[#164F5B]
                    hover:file:bg-[#CFD0BF]
                  "
                />
                {errors.file && (
                  <p className="text-sm text-rose-600">{errors.file.message}</p>
                )}
              </div>

              {/* Información de plantilla */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Plantilla requerida:</strong> Hoja "Equipos" con columnas: Número de serie, Estado, Responsable email (obligatorias), 
                  Tipo, Marca, Modelo, Procesador, RAM, Disco, Sistema Operativo, Ubicación actual, Fecha de ingreso, Fecha de salida, Observaciones (opcionales)
                </AlertDescription>
              </Alert>

              {/* Información de estados */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Estados válidos:</strong> ACTIVO, EN_MANTENIMIENTO, DE_BAJA (acepta variaciones como "activo", "en mantenimiento", "de baja")
                </AlertDescription>
              </Alert>

              {/* Botón de envío */}
              <div className="pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="
                  w-full inline-flex items-center justify-center gap-2 rounded-xl
                  bg-[#208692] hover:bg-[#164F5B] text-white
                  transition-colors duration-200 shadow-sm
                  px-4 py-2.5 text-sm font-semibold
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
                "
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Importando equipos...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar equipos
                  </>
                )}
              </Button>
              </div>
            </form>
        </CardContent>
      </Card>

      {/* Resultados */}
      {result && (
        <Card className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#164F5B]">
              {result.ok ? (
                <CheckCircle className="h-5 w-5 text-[#208692]" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-600" />
              )}
              Resultados de Importación de Equipos
            </CardTitle>
            <CardDescription className="text-[#26272A]">
              {result.ok ? "Los equipos se han importado correctamente a la base de datos." : "La importación se completó con errores."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="p-4 rounded-xl border border-[#CFD0BF] bg-white">
                <div className="text-2xl lg:text-3xl font-bold text-[#164F5B]">{result.total_filas_excel ?? 0}</div>
                <div className="text-sm text-[#26272A]">Filas procesadas</div>
              </div>
              <div className="p-4 rounded-xl border border-[#CFD0BF] bg-[#E5EADF]">
                <div className="text-2xl lg:text-3xl font-bold text-[#164F5B]">{result.equipos_procesados ?? 0}</div>
                <div className="text-sm text-[#26272A]">Equipos procesados</div>
              </div>
              <div className="p-4 rounded-xl border border-[#CFD0BF] bg-[#C7D8D0]">
                <div className="text-2xl lg:text-3xl font-bold text-[#164F5B]">{result.equipos_creados ?? 0}</div>
                <div className="text-sm text-[#26272A]">Equipos creados</div>
              </div>
              <div className="p-4 rounded-xl border border-[#CFD0BF] bg-[#D4D970]">
                <div className="text-2xl lg:text-3xl font-bold text-[#164F5B]">{result.equipos_actualizados ?? 0}</div>
                <div className="text-sm text-[#26272A]">Equipos actualizados</div>
              </div>
            </div>

            {/* Errores */}
            {Array.isArray(result.errores) && result.errores.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wide text-[#164F5B] mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-rose-600" />
                  Errores encontrados ({result.errores.length})
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {result.errores.map((error, index) => {
                    const fila = error.fila ?? "-";
                    const mensaje = typeof error.mensaje === "string" ? error.mensaje : String(error.mensaje || "Error desconocido");
                    return (
                      <Alert key={index} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Fila {fila}: {mensaje}
                        </AlertDescription>
                      </Alert>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mensaje de éxito si no hay errores */}
            {result.ok && (!Array.isArray(result.errores) || result.errores.length === 0) && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  ¡Importación de equipos completada exitosamente! Todos los equipos han sido procesados correctamente.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Toast />
      </div>
    </ErrorBoundaryWrapper>
  );
}
