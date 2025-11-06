import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { reportesRepo, EquiposFilters, ServiciosFilters, TicketsFilters, ReportPage } from '@/data/reportes.repository';
import ReportFiltersEquipos from '@/components/reportes/ReportFiltersEquipos';
import ReportFiltersServicios from '@/components/reportes/ReportFiltersServicios';
import ReportFiltersTickets from '@/components/reportes/ReportFiltersTickets';

type ReportType = 'equipos' | 'servicios' | 'tickets';

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

export default function ReportesPage() {
  const [reportType, setReportType] = useState<ReportType>('equipos');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFilters, setLastFilters] = useState<EquiposFilters | ServiciosFilters | TicketsFilters>({});
  const { show, Toast } = useToast();

  const handleFiltersSubmit = async (filters: EquiposFilters | ServiciosFilters | TicketsFilters) => {
    setLoading(true);
    setError(null);
    setLastFilters(filters);
    
    try {
      let result: ReportPage;
      if (reportType === 'equipos') {
        result = await reportesRepo.fetchReportEquipos({ ...filters as EquiposFilters, page: 1, size: 20 });
      } else if (reportType === 'servicios') {
        result = await reportesRepo.fetchReportServicios({ ...filters as ServiciosFilters, page: 1, size: 20 });
      } else {
        result = await reportesRepo.fetchReportTickets({ ...filters as TicketsFilters, page: 1, size: 20 });
      }
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
        <h4 className="text-md font-semibold">Resumen</h4>
        <div className="flex flex-wrap gap-2">
          {summary.equipos_por_estado?.map((item, index) => (
            <Badge key={index} variant="secondary">
              {item.estado_equipo}: {item.total}
            </Badge>
          ))}
          {summary.servicios_por_tipo?.map((item, index) => (
            <Badge key={index} variant="secondary">
              {item.tipo_servicio}: {item.total}
            </Badge>
          ))}
          {summary.by_estado?.map((item, index) => (
            <Badge key={index} variant="secondary">
              {item.estado}: {item.total}
            </Badge>
          ))}
          {summary.by_priority?.map((item, index) => (
            <Badge key={index} variant="secondary">
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
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Cargando datos...</p>
        </Card>
      );
    }

    if (!data?.items) {
      return (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Haga clic en "Buscar" para cargar los datos</p>
        </Card>
      );
    }

    const items = data.items;
    if (items.length === 0) {
      return (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No se encontraron registros</p>
        </Card>
      );
    }

    // Obtener las columnas del primer item
    const columns = Object.keys(items[0]);

    return (
      <Card>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {reportType === 'equipos' ? 'Equipos' : reportType === 'servicios' ? 'Servicios' : 'Tickets'} ({data.total || 'N/A'})
            </h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport('excel')}
                disabled={loading}
              >
                Exportar Excel
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport('pdf')}
                disabled={loading}
              >
                Exportar PDF
              </Button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column} className="capitalize">
                      {column.replace(/_/g, ' ')}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column}>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reportes</h1>
      </div>

      {/* Selector de tipo de reporte */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Tipo de Reporte:</label>
          <Select value={reportType} onValueChange={(value: ReportType) => setReportType(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equipos">Equipos</SelectItem>
              <SelectItem value="servicios">Servicios</SelectItem>
              <SelectItem value="tickets">Tickets</SelectItem>
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
      ) : reportType === 'servicios' ? (
        <ReportFiltersServicios
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

      {/* Error */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-red-600">{error}</p>
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
