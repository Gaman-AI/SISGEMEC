import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TicketsFilters, reportesRepo } from '@/data/reportes.repository';

interface ReportFiltersTicketsProps {
  onSubmit: (filters: TicketsFilters) => void;
  onClear: () => void;
  loading?: boolean;
}

export default function ReportFiltersTickets({ 
  onSubmit, 
  onClear, 
  loading = false 
}: ReportFiltersTicketsProps) {
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<TicketsFilters>();
  const [catalogs, setCatalogs] = useState<{
    estados: string[];
    prioridades: string[];
    fuentes: string[];
    tipos_servicio: { id: number; nombre: string }[];
    equipos: { id: number; label: string }[];
    fecha_min?: string;
    fecha_max?: string;
  } | null>(null);

  // Cargar catálogos al montar
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const data = await reportesRepo.fetchTicketsCatalogs();
        setCatalogs(data);
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };
    loadCatalogs();
  }, []);

  const handleFormSubmit = (data: TicketsFilters) => {
    // Limpiar valores vacíos con tipado laxo y casteo final
    const cleanData: Partial<TicketsFilters> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        (cleanData as any)[key] = value;
      }
    });
    onSubmit(cleanData as TicketsFilters);
  };

  const handleClear = () => {
    reset();
    onClear();
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Filtros de Tickets</h3>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Estado */}
          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select onValueChange={(value) => setValue('estado', value === 'all' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {catalogs?.estados.map((estado) => (
                  <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridad */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridad</Label>
            <Select onValueChange={(value) => setValue('priority', value === 'all' ? undefined : value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                {catalogs?.prioridades.map((prioridad) => (
                  <SelectItem key={prioridad} value={prioridad}>{prioridad}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fuente */}
          <div className="space-y-2">
            <Label htmlFor="fuente">Fuente</Label>
            <Select onValueChange={(value) => setValue('fuente', value === 'all' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar fuente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fuentes</SelectItem>
                {catalogs?.fuentes.map((fuente) => (
                  <SelectItem key={fuente} value={fuente}>{fuente}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Servicio */}
          <div className="space-y-2">
            <Label htmlFor="tipo_servicio_id">Tipo de Servicio</Label>
            <Select onValueChange={(value) => setValue('tipo_servicio_id', value === 'all' ? undefined : parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo de servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {catalogs?.tipos_servicio.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.id.toString()}>{tipo.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipo */}
          <div className="space-y-2">
            <Label htmlFor="equipo_id">Equipo</Label>
            <Select onValueChange={(value) => setValue('equipo_id', value === 'all' ? undefined : parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar equipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los equipos</SelectItem>
                {catalogs?.equipos.map((equipo) => (
                  <SelectItem key={equipo.id} value={equipo.id.toString()}>{equipo.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha Desde */}
          <div className="space-y-2">
            <Label htmlFor="from_dt">Fecha de Recepción Desde</Label>
            <Input
              id="from_dt"
              type="date"
              {...register('from_dt')}
              placeholder={catalogs?.fecha_min ? `Desde: ${catalogs.fecha_min}` : 'Fecha desde'}
            />
            {catalogs?.fecha_min && (
              <p className="text-xs text-gray-500">Rango disponible: {catalogs.fecha_min} - {catalogs.fecha_max}</p>
            )}
          </div>

          {/* Fecha Hasta */}
          <div className="space-y-2">
            <Label htmlFor="to_dt">Fecha de Recepción Hasta</Label>
            <Input
              id="to_dt"
              type="date"
              {...register('to_dt')}
              placeholder={catalogs?.fecha_max ? `Hasta: ${catalogs.fecha_max}` : 'Fecha hasta'}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading} className="bg-[#264a55] text-white hover:brightness-95 active:brightness-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#264a55]/30">
            {loading ? 'Buscando...' : 'Buscar'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClear}>
            Limpiar
          </Button>
        </div>
      </form>
    </Card>
  );
}

