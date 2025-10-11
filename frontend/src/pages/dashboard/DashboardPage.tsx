import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Monitor, Users as UsersIcon, Wrench, Ticket } from "lucide-react";
import { listEquipos, countEquiposNuevosSemana } from "../../data/equipos.repository";
import { countResponsablesActivos, countResponsablesNuevosSemana } from "../../data/usuarios.repository";
import { countServiciosNoAtendidos, countServiciosNuevosSemana, listServiciosByTipoCounts } from "../../data/servicios.repository";
import { countSolicitudesNoConvertidas, countSolicitudesNuevasSemana } from "../../data/solicitudes.repository";
import { supabase } from "../../lib/supabase";

/* ⬇️ NUEVO: imports para navegar y botón */
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";

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

  // métricas semanales
  const [eqWeek, setEqWeek] = React.useState(0);
  const [usrWeek, setUsrWeek] = React.useState(0);
  const [srvWeek, setSrvWeek] = React.useState(0);
  const [solWeek, setSolWeek] = React.useState(0);

  // actividad y gráfica
  const [recent, setRecent] = React.useState<{ts:string,label:string}[]>([]);
  const [svcChart, setSvcChart] = React.useState<{tipo_servicio_id:number, count:number, nombre:string}[]>([]);

  /* ⬇️ NUEVO: hook para navegar */
  const navigate = useNavigate();

  async function getRecentActivity() {
    const pulls = [
      supabase.from('equipos').select('equipo_id, num_serie, created_at, fecha_ingreso').order('created_at', { ascending: false }).limit(5),
      supabase.from('profiles').select('user_id, full_name, role, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('servicios').select('servicio_id, tipo_servicio_id, created_at, fecha_inicio').order('created_at', { ascending: false }).limit(5),
      supabase.from('solicitudes').select('solicitud_id, estado_solicitud_id, created_at').order('created_at', { ascending: false }).limit(5),
    ];

    const results = await Promise.allSettled(pulls);
    const items:any[] = [];
    const pickDate = (row:any, candidates:string[]) => candidates.find(c => row?.[c]) ? row[candidates.find(c => row?.[c]) as string] : null;

    if (results[0].status === 'fulfilled' && results[0].value.data) {
      for (const r of results[0].value.data as any[]) items.push({ ts: pickDate(r, ['created_at','fecha_ingreso']), label: `Equipo agregado: ${r.num_serie ?? r.equipo_id}` });
    }
    if (results[1].status === 'fulfilled' && results[1].value.data) {
      for (const r of results[1].value.data as any[]) items.push({ ts: r.created_at, label: `Usuario ${r.role ?? ''} agregado: ${r.full_name ?? r.user_id}` });
    }
    if (results[2].status === 'fulfilled' && results[2].value.data) {
      for (const r of results[2].value.data as any[]) items.push({ ts: pickDate(r, ['created_at','fecha_inicio']), label: `Servicio registrado: #${r.servicio_id}` });
    }
    if (results[3].status === 'fulfilled' && results[3].value.data) {
      for (const r of results[3].value.data as any[]) items.push({ ts: r.created_at, label: `Solicitud creada: #${r.solicitud_id}` });
    }

    return items.filter(i => !!i.ts).sort((a,b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()).slice(0, 6);
  }

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          totalEquiposRes,
          responsablesActivosRes,
          serviciosNoAtendidosRes,
          solicitudesNoConvertidasRes,
          eqNew,
          usrNew,
          srvNew,
          solNew,
          recentRes,
          chartRes
        ] = await Promise.all([
          // Si ya tienes una función que devuelve count de equipos, úsala; si no, usa el listado con count exact:
          listEquipos({ page: 1, pageSize: 1 }), // ya presente en el panel
          countResponsablesActivos(),
          countServiciosNoAtendidos(),
          countSolicitudesNoConvertidas(),
          countEquiposNuevosSemana(),
          countResponsablesNuevosSemana(),
          countServiciosNuevosSemana(),
          countSolicitudesNuevasSemana(),
          getRecentActivity(),
          listServiciosByTipoCounts(),
        ]);

        if (!mounted) return;

        // Total de equipos (ya funcionaba)
        setEquiposTotal(getCount(totalEquiposRes as ListEquiposResp));

        // Usuarios responsables activos
        setUsuariosActivos(responsablesActivosRes?.count ?? 0);

        // Mantenimientos: servicios no atendidos
        setMantenimientosSemana(serviciosNoAtendidosRes?.count ?? 0);

        // Solicitudes: no convertidas a servicio
        setSolicitudesAbiertas(solicitudesNoConvertidasRes?.count ?? 0);

        // Métricas semanales
        setEqWeek(eqNew?.count ?? 0);
        setUsrWeek(usrNew?.count ?? 0);
        setSrvWeek(srvNew?.count ?? 0);
        setSolWeek(solNew?.count ?? 0);
        setRecent(Array.isArray(recentRes) ? recentRes : []);
        setSvcChart(Array.isArray(chartRes?.data) ? chartRes.data : []);
      } catch (e: any) {
        console.warn('Dashboard load error', e);
        setError(e?.message ?? "Error al cargar dashboard");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
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
                <div className="text-4xl font-bold text-[#264a55]">{equiposTotal.toLocaleString()}</div>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white bg-[#527779] mt-2">
                  {eqWeek} esta semana
                </span>
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
                <div className="text-4xl font-bold text-[#264a55]">{usuariosActivos}</div>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white bg-[#527779] mt-2">
                  {usrWeek} esta semana
                </span>
                <div className="text-xs text-muted-foreground mt-1">
                  Usuarios responsables activos
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
                <div className="text-4xl font-bold text-[#264a55]">{mantenimientosSemana}</div>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white bg-[#527779] mt-2">
                  {srvWeek} esta semana
                </span>
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
                <div className="text-4xl font-bold text-[#264a55]">{solicitudesAbiertas}</div>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white bg-[#527779] mt-2">
                  {solWeek} esta semana
                </span>
                <div className="text-xs text-muted-foreground mt-1">
                  Abiertas y pendientes de atención
                </div>

                {/* ⬇️ NUEVO: botón de acceso directo a la bandeja */}
                <div className="mt-4">
                  <Button className="rounded-xl bg-[#264a55] hover:opacity-90" onClick={() => navigate("/solicitudes")}>
                    Abrir bandeja
                  </Button>
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
            <section className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Actividad reciente</h3>
              {recent.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sin movimientos recientes.</div>
              ) : (
                <ul className="space-y-2">
                  {recent.map((i, idx) => (
                    <li key={idx} className="text-sm">
                      <span className="text-slate-500 mr-2">{new Date(i.ts).toLocaleString()}</span>
                      <span>{i.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Gráfica</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <section className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Tipos de servicio más solicitados</h3>
              {svcChart.length === 0 ? (
                <div className="text-sm text-muted-foreground">Sin datos suficientes.</div>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const max = Math.max(...svcChart.map(d => Number(d.count) || 0)) || 1;
                    return svcChart
                      .sort((a,b) => (b.count as number) - (a.count as number))
                      .slice(0,5)
                      .map((d, idx) => {
                        const pct = Math.round((Number(d.count) / max) * 100);
                        return (
                          <div key={idx}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span>{d.nombre || `Tipo ${d.tipo_servicio_id}`}</span>
                              <span>{d.count}</span>
                            </div>
                            <div className="h-2 rounded bg-slate-200">
                              <div className="h-2 rounded bg-[#208692]" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      });
                  })()}
                </div>
              )}
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

