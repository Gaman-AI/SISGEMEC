import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Users, Monitor, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
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

interface ImportResult {
  ok: boolean;
  filas_procesadas: number;
  equipos_procesados: number;
  perfiles_creados: number;
  errores: Array<{ fila: number | string; mensaje: string }>;
}

export default function ImportInventarioPage() {
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

      // TODO: En producción, usar proxy/middleware que valide sesión y rol Admin
      // En desarrollo, usar token temporal
      const adminToken = import.meta.env.VITE_API_ADMIN_TOKEN || "dev-token";
      
      const response = await api.post("/import-inventario", formData, {
        headers: {
          "Authorization": `Bearer ${adminToken}`,
        },
      });

      const data = response.data ?? {};
      const errores = Array.isArray(data.errores) ? data.errores : [];

      setResult({
        ok: data.ok ?? false,
        filas_procesadas: data.filas_procesadas ?? 0,
        equipos_procesados: data.equipos_procesados ?? 0,
        perfiles_creados: data.perfiles_creados ?? 0,
        errores
      });

      if (data.ok) {
        show("Importación completada exitosamente");
      } else {
        show("Importación completada con errores", "error");
      }
    } catch (error: any) {
      console.error("Error en importación:", error);
      
      // Manejo de errores según status code
      if (error.response?.status >= 500) {
        show("Error interno del servidor. Revisa el backend.", "error");
      } else if (error.response?.status === 400 || error.response?.status === 422) {
        const errorData = error.response?.data;
        if (errorData?.errores && Array.isArray(errorData.errores) && errorData.errores.length > 0) {
          // Mostrar el primer error como mensaje principal
          const firstError = errorData.errores[0];
          const message = typeof firstError === 'string' ? firstError : firstError.mensaje || "Error al procesar el archivo";
          show(message, "error");
          
          // Establecer resultado para mostrar todos los errores
          setResult({
            ok: false,
            filas_procesadas: errorData.filas_procesadas ?? 0,
            equipos_procesados: errorData.equipos_procesados ?? 0,
            perfiles_creados: errorData.perfiles_creados ?? 0,
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
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Importar</h1>
          <p className="mt-1 text-sm text-slate-600">
            Importa datos desde archivos Excel a la base de datos
          </p>
        </div>
      </div>

      {/* Nuevos importadores separados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Users className="h-5 w-5" />
              Importar Usuarios
            </CardTitle>
            <CardDescription>
              Importa responsables desde Excel con la hoja "Usuarios"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Crea usuarios en auth.users y perfiles en la base de datos. 
              Columnas requeridas: First Name, Last Name, Email Address.
            </p>
            <Link to="/import-usuarios">
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Users className="h-4 w-4 mr-2" />
                Importar Usuarios
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Monitor className="h-5 w-5" />
              Importar Equipos
            </CardTitle>
            <CardDescription>
              Importa equipos desde Excel con la hoja "Equipos"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              Crea equipos vinculados a responsables existentes. 
              Columnas requeridas: Número de serie, Estado, Responsable email.
            </p>
            <Link to="/import-equipos">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Monitor className="h-4 w-4 mr-2" />
                Importar Equipos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Separador */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            O usa el importador combinado (legacy)
          </span>
        </div>
      </div>

      <div className="max-w-2xl">
        {/* Formulario de importación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir Archivo Excel (Legacy)
            </CardTitle>
            <CardDescription>
              Importador combinado: procesa usuarios y equipos desde un solo archivo Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Input de archivo */}
              <div className="space-y-2">
                <Label htmlFor="file">Archivo Excel (.xlsx, .xls)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx,.xls"
                  {...register("file")}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {errors.file && (
                  <p className="text-sm text-rose-600">{errors.file.message}</p>
                )}
              </div>

              {/* Botón de envío */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Importando...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Importar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>

      {/* Resultados */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-600" />
              )}
              Resultados de Importación
            </CardTitle>
            <CardDescription>
              {result.ok ? "Los cambios se han aplicado a la base de datos." : "La importación se completó con errores."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{result.filas_procesadas ?? 0}</div>
                <div className="text-sm text-blue-600">Filas procesadas</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{result.equipos_procesados ?? 0}</div>
                <div className="text-sm text-green-600">Equipos procesados</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{result.perfiles_creados ?? 0}</div>
                <div className="text-sm text-purple-600">Perfiles creados</div>
              </div>
            </div>

            {/* Errores */}
            {Array.isArray(result.errores) && result.errores.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
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
                  ¡Importación completada exitosamente! Todos los equipos han sido procesados correctamente.
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
