import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Monitor, Users as UsersIcon, Wrench, Ticket } from "lucide-react";
import { listEquipos } from "../../data/equipos.repository";

/** Tipado mínimo del retorno que necesitamos aquí (no rompe nada) */
type ListEquiposResp =
  | { data: unknown[] | null; count: number | null; error?: { message?: string } | null }
  | { data: null; count: null; error: { message?: string } };

/** Utilidad para leer .count de forma segura */
function getCount(resp: ListEquiposResp): number {
  if (resp && !resp.error && typeof resp.count === "number") return resp.count;
  return 0;
}

export default function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // métricas
  const [equiposTotal, setEquiposTotal] = React.useState<number>(0);
  const [usuariosActivos, setUsuariosActivos] = React.useState<number>(0);
  const [mantenimientosSemana, setMantenimientosSemana] = React.useState<number>(0);
  const [solicitudesAbiertas, setSolicitudesAbiertas] = React.useState<number>(0);

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // TOTAL DE EQUIPOS (REAL)
        const eq = (await listEquipos({
          page: 1,
          pageSize: 1, // sólo queremos el count
          search: "",
          estado_equipo_id: null,
          responsable_id: null,
        })) as ListEquiposResp;

        setEquiposTotal(getCount(eq));

        // Placeholders (los conectamos cuando tengas repos)
        setUsuariosActivos(0);
        setMantenimientosSemana(0);
        setSolicitudesAbiertas(0);
      } catch (e: any) {
        setError(e?.message ?? "Error al cargar dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const SkeletonCard = () => (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-9 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-3 w-40 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Panel Principal</h1>
        <p className="text-sm text-rose-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Panel Principal</h1>
          <p className="text-sm text-muted-foreground">
            Resumen de actividad y salud del sistema.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            {/* Total de Equipos (REAL) */}
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Equipos</CardTitle>
                <Monitor className="h-5 w-5 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{equiposTotal.toLocaleString()}</div>
                <Badge className="mt-2" variant="default">+0%</Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  Equipos registrados en el sistema
                </div>
              </CardContent>
            </Card>

            {/* Usuarios Activos (conectar repo cuando lo tengas) */}
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                <UsersIcon className="h-5 w-5 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{usuariosActivos}</div>
                <Badge className="mt-2" variant="default">+0%</Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  Usuarios conectados hoy
                </div>
              </CardContent>
            </Card>

            {/* Mantenimientos (conectar repo cuando lo tengas) */}
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Mantenimientos</CardTitle>
                <Wrench className="h-5 w-5 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{mantenimientosSemana}</div>
                <Badge className="mt-2" variant="default">0%</Badge>
                <div className="text-xs text-muted-foreground mt-1">
                  Programados para esta semana
                </div>
              </CardContent>
            </Card>

            {/* Solicitudes de servicio (antes alertas) */}
            <Card className="rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Solicitudes de servicio</CardTitle>
                <Ticket className="h-5 w-5 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{solicitudesAbiertas}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Abiertas y pendientes de atención
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Próximamente: últimos movimientos en Equipos/Usuarios…
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Gráfica</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Próximamente: tendencias y comparativas…
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

