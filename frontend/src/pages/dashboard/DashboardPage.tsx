import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Separator } from "../../components/ui/separator";
import { Monitor, Users as UsersIcon, Wrench, Ticket, Activity } from "lucide-react";
import { listEquipos, countEquiposNuevosSemana } from "../../data/equipos.repository";
import { countResponsablesActivos, countResponsablesNuevosSemana } from "../../data/usuarios.repository";
// DEPRECATED: imports de repositorios antiguos de servicios/solicitudes
// import { countServiciosNoAtendidos, countServiciosNuevosSemana, listServiciosByTipoCounts } from "../../data/servicios.repository";
// import { countSolicitudesNoConvertidas, countSolicitudesNuevasSemana } from "../../data/solicitudes.repository";
import { fetchTickets } from "../../services/tickets";
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
  const [ticketsPendientes, setTicketsPendientes] = React.useState<number>(0);
  const [ticketsAbiertos, setTicketsAbiertos] = React.useState<number>(0);

  // métricas semanales
  const [eqWeek, setEqWeek] = React.useState(0);
  const [usrWeek, setUsrWeek] = React.useState(0);
  const [ticketsWeek, setTicketsWeek] = React.useState(0);

  // métricas con tickets abiertos
  const [equiposConTickets, setEquiposConTickets] = React.useState<number | null>(null);
  const [responsablesConTickets, setResponsablesConTickets] = React.useState<number | null>(null);
  const [loadingTicketsDashboard, setLoadingTicketsDashboard] = React.useState(false);

  // métricas de tickets para el resumen
  const [ticketsEnAtencion, setTicketsEnAtencion] = React.useState<number>(0);
  const [ticketsCerrados, setTicketsCerrados] = React.useState<number>(0);

  // actividad reciente
  const [recent, setRecent] = React.useState<{ts:string,label:string,module?:string}[]>([]);

  /* ⬇️ NUEVO: hook para navegar */
  const navigate = useNavigate();

  async function getRecentActivity() {
    const pulls = [
      supabase.from('equipos').select('equipo_id, num_serie, created_at, fecha_ingreso').order('created_at', { ascending: false }).limit(5),
      supabase.from('profiles').select('user_id, full_name, role, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('tickets').select('ticket_id, estado, descripcion, received_at, created_at').order('received_at', { ascending: false }).limit(5),
      // Intentar obtener licencias (si la tabla existe)
      supabase.from('licenses').select('license_id, code, created_at').order('created_at', { ascending: false }).limit(5),
      // Intentar obtener asignaciones de licencias (si la tabla existe)
      supabase.from('license_assignments').select('assignment_id, license_id, user_id, assigned_at').order('assigned_at', { ascending: false }).limit(5),
    ];

    const results = await Promise.allSettled(pulls);
    const items: Array<{ts: string, label: string, module?: string}> = [];
    const pickDate = (row:any, candidates:string[]) => candidates.find(c => row?.[c]) ? row[candidates.find(c => row?.[c]) as string] : null;

    // Equipos
    if (results[0].status === 'fulfilled' && results[0].value.data) {
      for (const r of results[0].value.data as any[]) {
        items.push({ 
          ts: pickDate(r, ['created_at','fecha_ingreso']) || '', 
          label: `Equipo agregado: ${r.num_serie ?? r.equipo_id}`,
          module: 'equipos'
        });
      }
    }

    // Usuarios
    if (results[1].status === 'fulfilled' && results[1].value.data) {
      for (const r of results[1].value.data as any[]) {
        items.push({ 
          ts: r.created_at || '', 
          label: `Usuario ${r.role ?? ''} agregado: ${r.full_name ?? r.user_id}`,
          module: 'usuarios'
        });
      }
    }

    // Tickets
    if (results[2].status === 'fulfilled' && results[2].value.data) {
      for (const r of results[2].value.data as any[]) {
        const fecha = pickDate(r, ['received_at', 'created_at']);
        items.push({ 
          ts: fecha || '', 
          label: `Ticket ${r.estado ?? 'Pendiente'}: #${r.ticket_id}`,
          module: 'tickets'
        });
      }
    }

    // Licencias
    if (results[3].status === 'fulfilled' && results[3].value.data) {
      for (const r of results[3].value.data as any[]) {
        items.push({ 
          ts: r.created_at || '', 
          label: `Licencia creada: ${r.code ?? `#${r.license_id}`}`,
          module: 'licencias'
        });
      }
    }

    // Asignaciones de licencias
    if (results[4].status === 'fulfilled' && results[4].value.data) {
      for (const r of results[4].value.data as any[]) {
        items.push({ 
          ts: r.assigned_at || r.created_at || '', 
          label: `Licencia asignada: #${r.license_id}`,
          module: 'licencias'
        });
      }
    }

    return items
      .filter(i => !!i.ts)
      .sort((a,b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 8);
  }

  // Helper para contar tickets pendientes
  async function countTicketsPendientes(): Promise<number> {
    try {
      const result = await fetchTickets({ estado: 'Pendiente', page: 1, size: 1 });
      return result.total || 0;
    } catch {
      return 0;
    }
  }

  // Helper para contar tickets abiertos (Pendiente + En atención)
  async function countTicketsAbiertos(): Promise<number> {
    try {
      const [pendientes, enAtencion] = await Promise.all([
        fetchTickets({ estado: 'Pendiente', page: 1, size: 1 }),
        fetchTickets({ estado: 'En atención', page: 1, size: 1 }),
      ]);
      return (pendientes.total || 0) + (enAtencion.total || 0);
    } catch {
      return 0;
    }
  }

  // Helper para contar tickets nuevos esta semana
  async function countTicketsNuevosSemana(): Promise<number> {
    try {
      const semanaAtras = new Date();
      semanaAtras.setDate(semanaAtras.getDate() - 7);
      const result = await fetchTickets({ 
        received_start: semanaAtras.toISOString().split('T')[0],
        page: 1, 
        size: 1 
      });
      return result.total || 0;
    } catch {
      return 0;
    }
  }

  // Helper para calcular equipos y responsables con tickets abiertos
  async function calcularEquiposYResponsablesConTickets() {
    setLoadingTicketsDashboard(true);
    try {
      // Obtener tickets pendientes y en atención
      const [pendientesRes, enAtencionRes] = await Promise.all([
        fetchTickets({ estado: 'Pendiente', page: 1, size: 500 }),
        fetchTickets({ estado: 'En atención', page: 1, size: 500 }),
      ]);

      // Combinar items sin duplicar por ticket_id
      const allTickets = new Map<number, typeof pendientesRes.items[0]>();
      pendientesRes.items.forEach(t => allTickets.set(t.ticket_id, t));
      enAtencionRes.items.forEach(t => allTickets.set(t.ticket_id, t));
      const allItems = Array.from(allTickets.values());

      // Equipos con tickets abiertos
      const equiposIds = new Set(
        allItems
          .filter(t => t.equipo_id != null)
          .map(t => t.equipo_id as number)
      );
      setEquiposConTickets(equiposIds.size);

      // Responsables/usuarios con tickets abiertos
      const solicitantesIds = new Set(
        allItems
          .filter(t => t.solicitante_id != null)
          .map(t => t.solicitante_id as string)
      );
      setResponsablesConTickets(solicitantesIds.size);
    } catch (error) {
      console.error('Error calculando equipos/responsables con tickets abiertos', error);
      setEquiposConTickets(null);
      setResponsablesConTickets(null);
    } finally {
      setLoadingTicketsDashboard(false);
    }
  }

  // Helper para contar tickets en atención
  async function countTicketsEnAtencion(): Promise<number> {
    try {
      const result = await fetchTickets({ estado: 'En atención', page: 1, size: 1 });
      return result.total || 0;
    } catch {
      return 0;
    }
  }

  // Helper para contar tickets cerrados
  async function countTicketsCerrados(): Promise<number> {
    try {
      const result = await fetchTickets({ estado: 'Cerrado', page: 1, size: 1 });
      return result.total || 0;
    } catch {
      return 0;
    }
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
          ticketsPendientesRes,
          ticketsAbiertosRes,
          ticketsEnAtencionRes,
          ticketsCerradosRes,
          eqNew,
          usrNew,
          ticketsNew,
          recentRes
        ] = await Promise.all([
          // Si ya tienes una función que devuelve count de equipos, úsala; si no, usa el listado con count exact:
          listEquipos({ page: 1, pageSize: 1 }), // ya presente en el panel
          countResponsablesActivos(),
          countTicketsPendientes(),
          countTicketsAbiertos(),
          countTicketsEnAtencion(),
          countTicketsCerrados(),
          countEquiposNuevosSemana(),
          countResponsablesNuevosSemana(),
          countTicketsNuevosSemana(),
          getRecentActivity(),
        ]);

        // Calcular equipos y responsables con tickets (en paralelo pero separado para no bloquear)
        calcularEquiposYResponsablesConTickets();

        if (!mounted) return;

        // Total de equipos (ya funcionaba)
        setEquiposTotal(getCount(totalEquiposRes as ListEquiposResp));

        // Usuarios responsables activos
        setUsuariosActivos(responsablesActivosRes?.count ?? 0);

        // Tickets pendientes
        setTicketsPendientes(ticketsPendientesRes);

        // Tickets abiertos (pendientes + en atención)
        setTicketsAbiertos(ticketsAbiertosRes);

        // Tickets en atención y cerrados (para el resumen)
        setTicketsEnAtencion(ticketsEnAtencionRes);
        setTicketsCerrados(ticketsCerradosRes);

        // Métricas semanales
        setEqWeek(eqNew?.count ?? 0);
        setUsrWeek(usrNew?.count ?? 0);
        setTicketsWeek(ticketsNew);
        setRecent(Array.isArray(recentRes) ? recentRes : []);
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
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">Panel Principal</h1>
          <p className="text-sm lg:text-base text-[#26272A]">
            Resumen de actividad y salud del sistema.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            {/* Total de Equipos (REAL) */}
            <Card className="rounded-2xl hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-[#164F5B]">Total de Equipos</CardTitle>
                <Monitor className="h-5 w-5 text-[#208692]" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl lg:text-5xl font-bold text-[#164F5B]">{equiposTotal.toLocaleString()}</div>
                <span className="inline-flex items-center rounded-full bg-[#E5EADF] px-3 py-1 text-xs font-semibold text-[#164F5B] mt-2">
                  {loadingTicketsDashboard && equiposConTickets === null
                    ? 'Calculando...'
                    : `${equiposConTickets ?? 0} con tickets`}
                </span>
                <div className="text-xs lg:text-sm text-[#26272A] mt-1">
                  Equipos registrados en el sistema
                </div>
              </CardContent>
            </Card>

            {/* Usuarios Activos (conectar repo cuando lo tengas) */}
            <Card className="rounded-2xl hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-[#164F5B]">Usuarios Activos</CardTitle>
                <UsersIcon className="h-5 w-5 text-[#208692]" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl lg:text-5xl font-bold text-[#164F5B]">{usuariosActivos}</div>
                <span className="inline-flex items-center rounded-full bg-[#E5EADF] px-3 py-1 text-xs font-semibold text-[#164F5B] mt-2">
                  {loadingTicketsDashboard && responsablesConTickets === null
                    ? 'Calculando...'
                    : `${responsablesConTickets ?? 0} con tickets`}
                </span>
                <div className="text-xs lg:text-sm text-[#26272A] mt-1">
                  Usuarios responsables activos
                </div>
              </CardContent>
            </Card>

            {/* Tickets Pendientes */}
            <Card className="rounded-2xl hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-[#164F5B]">Tickets Pendientes</CardTitle>
                <Ticket className="h-5 w-5 text-[#208692]" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl lg:text-5xl font-bold text-[#164F5B]">{ticketsPendientes}</div>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white bg-[#527779] mt-2">
                  {ticketsWeek} esta semana
                </span>
                <div className="text-xs lg:text-sm text-[#26272A] mt-1">
                  Tickets pendientes de atención
                </div>

                {/* Botón de acceso directo a la bandeja */}
                <div className="mt-4">
                  <Button className="rounded-xl bg-[#208692] hover:bg-[#164F5B] text-white transition-colors duration-200" onClick={() => navigate("/tickets")}>
                    Abrir bandeja
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tickets Abiertos */}
            <Card className="rounded-2xl hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-[#164F5B]">Tickets Abiertos</CardTitle>
                <Wrench className="h-5 w-5 text-[#208692]" />
              </CardHeader>
              <CardContent>
                <div className="text-4xl lg:text-5xl font-bold text-[#164F5B]">{ticketsAbiertos}</div>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold text-white bg-[#527779] mt-2">
                  Pendientes + En atención
                </span>
                <div className="text-xs lg:text-sm text-[#26272A] mt-1">
                  Tickets en proceso de resolución
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
            <CardTitle className="text-sm font-semibold text-[#164F5B]">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-12 w-12 text-[#CFD0BF] mb-3" />
                <p className="text-sm font-semibold text-[#164F5B]">
                  Sin actividad reciente
                </p>
                <p className="text-xs text-[#26272A] mt-1 opacity-70">
                  Los nuevos eventos aparecerán aquí cuando se registren cambios en el sistema.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recent.map((i, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-[#527779] text-xs font-medium min-w-[140px]">
                      {new Date(i.ts).toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      {i.module && (
                        <span className="inline-flex items-center rounded-full bg-[#E5EADF] text-xs text-[#527779] px-2 py-0.5 font-medium">
                          {i.module}
                        </span>
                      )}
                      <span className="text-[#26272A]">{i.label}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-[#164F5B]">
              Tickets por estado
            </CardTitle>
            <p className="text-sm text-[#527779] mt-1">
              Distribución actual de tickets en el sistema.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Pendientes', value: ticketsPendientes, color: 'bg-[#208692]' },
              { label: 'En atención', value: ticketsEnAtencion, color: 'bg-[#D4D970]' },
              { label: 'Cerrados', value: ticketsCerrados, color: 'bg-[#527779]' },
            ]
              .filter(item => item.value != null && item.value >= 0)
              .map(item => {
                const total = (ticketsPendientes ?? 0) + (ticketsEnAtencion ?? 0) + (ticketsCerrados ?? 0);
                const pct = total > 0 ? (item.value! / total) * 100 : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-[#26272A]">
                      <span className="font-medium">{item.label}</span>
                      <span className="tabular-nums">{item.value} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E5EADF]">
                      <div
                        className={`h-2 rounded-full ${item.color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

