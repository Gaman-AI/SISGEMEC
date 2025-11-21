import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { reportesRepo, EquiposFilters, ServiciosFilters, TicketsFilters, ReportPage } from '@/data/reportes.repository';
import ReportFiltersEquipos from '@/components/reportes/ReportFiltersEquipos';
// DEPRECATED: Componente de filtros de servicios no se usa en el UI. Se mantiene para referencia histórica.
// import ReportFiltersServicios from '@/components/reportes/ReportFiltersServicios';
import ReportFiltersTickets from '@/components/reportes/ReportFiltersTickets';

type ReportType = 'equipos' | 'tickets';
// DEPRECATED: 'servicios' removido del selector de reportes. Backend /reportes/servicios se conserva para históricos.

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

export default function ReportesPage() {
  const [reportType, setReportType] = useState<ReportType>('equipos');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFilters, setLastFilters] = useState<EquiposFilters | TicketsFilters>({});
  // DEPRECATED: ServiciosFilters removido aquí. No se usan filtros de servicios en el UI.
  const { show, Toast } = useToast();

  const handleFiltersSubmit = async (filters: EquiposFilters | TicketsFilters) => {
    // DEPRECATED: Se elimina soporte a 'servicios' en el formulario UI.
    setLoading(true);
    setError(null);
    setLastFilters(filters);
    
    try {
      let result: ReportPage;
      if (reportType === 'equipos') {
        result = await reportesRepo.fetchReportEquipos({ ...filters as EquiposFilters, page: 1, size: 20 });
      } else {
        // reportType === 'tickets'
        result = await reportesRepo.fetchReportTickets({ ...filters as TicketsFilters, page: 1, size: 20 });
      }
      // DEPRECATED: Rama para 'servicios' eliminada solo en el UI. Backend /reportes/servicios se conserva para históricos.
      setData(result);
    } catch (err: any) {
      console.error('Report error', err);
      const errorMsg = err?.message || 'Error al cargar el reporte';
      setError(errorMsg);
      
      // Manejar errores de autenticación
      if (err?.message?.includes('401') || err?.message?.includes('403')) {
        show('No autorizado. Se requiere rol de administrador.', 'error');
      } else {
        show(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setData(null);
    setError(null);
    setLastFilters({});
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setLoading(true);
    try {
      const blob = await reportesRepo.exportReport(reportType, format, lastFilters);
      
      // Crear URL temporal y descargar
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${reportType}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      show(`Reporte exportado exitosamente como ${format.toUpperCase()}`, 'success');
    } catch (err: any) {
      console.error('Export error', err);
      const errorMsg = err?.response?.data?.detail ?? err?.message ?? 'Error al exportar';
      
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        show('No autorizado. Se requiere rol de administrador.', 'error');
      } else {
        show(errorMsg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderSummary = () => {
    if (!data?.summary) return null;

    const summary = data.summary;
    
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-[#164F5B]">
          Resumen
        </h4>
        <div className="flex flex-wrap gap-2">
          {summary.equipos_por_estado?.map((item, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="inline-flex items-center rounded-full bg-[#E5EADF] px-3 py-1 text-xs font-medium text-[#527779] ring-1 ring-inset ring-[#CFD0BF]"
            >
              {item.estado_equipo}: {item.total}
            </Badge>
          ))}
          {summary.servicios_por_tipo?.map((item, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="inline-flex items-center rounded-full bg-[#E5EADF] px-3 py-1 text-xs font-medium text-[#527779] ring-1 ring-inset ring-[#CFD0BF]"
            >
              {item.tipo_servicio}: {item.total}
            </Badge>
          ))}
          {summary.by_estado?.map((item, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="inline-flex items-center rounded-full bg-[#E5EADF] px-3 py-1 text-xs font-medium text-[#527779] ring-1 ring-inset ring-[#CFD0BF]"
            >
              {item.estado}: {item.total}
            </Badge>
          ))}
          {summary.by_priority?.map((item, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="inline-flex items-center rounded-full bg-[#E5EADF] px-3 py-1 text-xs font-medium text-[#527779] ring-1 ring-inset ring-[#CFD0BF]"
            >
              {item.priority}: {item.total}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const renderTable = () => {
    if (loading) {
      return (
        <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-8 text-center shadow-sm">
          <p className="text-[#26272A]">Cargando datos...</p>
        </Card>
      );
    }

    if (!data?.items) {
      return (
        <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-8 text-center shadow-sm">
          <p className="text-[#26272A]">Haga clic en "Buscar" para cargar los datos</p>
        </Card>
      );
    }

    const items = data.items;
    if (items.length === 0) {
      return (
        <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-8 text-center shadow-sm">
          <p className="text-[#26272A]">No se encontraron registros</p>
        </Card>
      );
    }

    // Obtener las columnas del primer item
    const columns = Object.keys(items[0]);

    return (
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white shadow-sm">
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base lg:text-lg font-semibold text-[#164F5B]">
              {reportType === 'equipos' ? 'Equipos' : 'Tickets'} ({data.total || 'N/A'})
              {/* DEPRECATED: Referencia a 'servicios' removida del título. */}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm"
                className="
                  inline-flex items-center gap-2 rounded-xl
                  bg-[#208692] hover:bg-[#164F5B] text-white
                  transition-colors duration-200 shadow-sm
                  px-4 py-2.5 text-sm font-semibold
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
                "
                onClick={() => handleExport('excel')}
                disabled={loading}
              >
                Exportar Excel
              </Button>
              <Button 
                variant="outline"
                size="sm"
                className="
                  inline-flex items-center gap-2 rounded-xl
                  border border-[#CFD0BF] text-[#164F5B]
                  bg-white hover:bg-[#E5EADF]
                  transition-colors duration-200 shadow-sm
                  px-4 py-2.5 text-sm font-semibold
                "
                onClick={() => handleExport('pdf')}
                disabled={loading}
              >
                Exportar PDF
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-100/90 border-b border-[#CFD0BF]">
                <TableRow className="text-[13px] uppercase tracking-wide text-[#26272A] font-semibold">
                  {columns.map((column) => (
                    <TableHead key={column} className="px-4 py-3 capitalize font-semibold">
                      {column.replace(/_/g, ' ')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow 
                    key={index}
                    className="
                      transition
                      bg-white
                      hover:bg-slate-50 hover:shadow-sm
                    "
                  >
                    {columns.map((column) => (
                      <TableCell key={column} className="px-4 py-3 text-sm text-[#26272A]">
                        {item[column] ? String(item[column]) : '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
          Reportes
        </h1>
        <p className="text-sm lg:text-base text-[#26272A]">
          Genera reportes detallados de equipos y tickets del sistema.
        </p>
      </div>

      {/* Selector de tipo de reporte */}
      <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-[#26272A]">Tipo de Reporte:</label>
          <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equipos">Equipos</SelectItem>
              <SelectItem value="tickets">Tickets</SelectItem>
              {/* DEPRECATED: Opción "Servicios" removida del selector de reportes en el UI. Backend /reportes/servicios se conserva para históricos. */}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Filtros */}
      {reportType === 'equipos' ? (
        <ReportFiltersEquipos
          onSubmit={handleFiltersSubmit}
          onClear={handleClearFilters}
          loading={loading}
        />
      ) : (
        <ReportFiltersTickets
          onSubmit={handleFiltersSubmit}
          onClear={handleClearFilters}
          loading={loading}
        />
      )}
      {/* DEPRECATED: Filtros de servicios removidos del renderizado. Componente ReportFiltersServicios se mantiene pero no se usa en el UI. */}

      {/* Error */}
      {error && (
        <Card className="rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-sm">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </Card>
      )}

      {/* Resumen */}
      {data && renderSummary()}

      <Separator />

      {/* Tabla */}
      {renderTable()}
      
      {/* Toast */}
      <Toast />
    </div>
  );
}
