import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet } from '@/services/api';

export default function TicketsReports() {
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [metrics, setMetrics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      
      const data = await apiGet('/tickets/reports', { params });
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-[#164F5B]">
          Reportes de Tickets
        </h1>
        <p className="text-sm lg:text-base text-[#26272A] mt-1">
          Analiza el volumen, estados y tiempos de atención de los tickets.
        </p>
      </div>
      
      <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#164F5B] mb-4">Filtros</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label className="mb-1 block text-sm font-medium text-[#26272A]">Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="mb-1 block text-sm font-medium text-[#26272A]">Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button 
              className="
                inline-flex items-center gap-2 rounded-xl
                bg-[#208692] hover:bg-[#164F5B] text-white
                transition-colors duration-200 shadow-sm
                px-4 py-2.5 text-sm font-semibold
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
              "
              onClick={fetchMetrics} 
              disabled={loading}
            >
              Consultar
            </Button>
          </div>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
            <div className="text-2xl font-bold text-[#164F5B]">{metrics.total_tickets}</div>
            <div className="text-sm text-[#527779] mt-1">Total Tickets</div>
          </div>
          
          <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
            <div className="text-2xl font-bold text-[#164F5B]">{metrics.backlog}</div>
            <div className="text-sm text-[#527779] mt-1">Backlog</div>
          </div>
          
          <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
            <div className="text-2xl font-bold text-[#164F5B]">{Math.round(metrics.avg_ttr_hours)}h</div>
            <div className="text-sm text-[#527779] mt-1">TTR Promedio</div>
          </div>
          
          <div className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
            <div className="text-2xl font-bold text-[#164F5B]">{Math.round(metrics.sla_compliance_pct)}%</div>
            <div className="text-sm text-[#527779] mt-1">Cumplimiento SLA</div>
          </div>
        </div>
      )}
    </div>
  );
}
