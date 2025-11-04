import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TicketsReports() {
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [metrics, setMetrics] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      
      const res = await fetch(`/api/tickets/reports?${params}`);
      const data = await res.json();
      setMetrics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reportes de Tickets</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Desde</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Hasta</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchMetrics} disabled={loading}>Consultar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {metrics && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.total_tickets}</div>
              <div className="text-sm text-muted-foreground">Total Tickets</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.backlog}</div>
              <div className="text-sm text-muted-foreground">Backlog</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{Math.round(metrics.avg_ttr_hours)}h</div>
              <div className="text-sm text-muted-foreground">TTR Promedio</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{Math.round(metrics.sla_compliance_pct)}%</div>
              <div className="text-sm text-muted-foreground">Cumplimiento SLA</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
