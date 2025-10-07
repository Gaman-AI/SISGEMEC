import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiciosFilters, reportesRepo } from '@/data/reportes.repository';

interface ReportFiltersServiciosProps {
  onSubmit: (filters: ServiciosFilters) => void;
  onClear: () => void;
  loading?: boolean;
}

export default function ReportFiltersServicios({ 
  onSubmit, 
  onClear, 
  loading = false 
}: ReportFiltersServiciosProps) {
  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<ServiciosFilters>();
  const [catalogs, setCatalogs] = useState<{
    tipo_servicio: string[];
    estado_servicio: string[];
    num_serie: string[];
    fecha_min: string;
    fecha_max: string;
  } | null>(null);

  // Cargar catálogos al montar
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const data = await reportesRepo.fetchServiciosCatalogs();
        setCatalogs(data);
      } catch (error) {
        console.error('Error cargando catálogos:', error);
      }
    };
    loadCatalogs();
  }, []);

  const handleFormSubmit = (data: ServiciosFilters) => {
    // Limpiar valores vacíos
    const cleanData: ServiciosFilters = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleanData[key as keyof ServiciosFilters] = value;
      }
    });
    onSubmit(cleanData);
  };

  const handleClear = () => {
    reset();
    onClear();
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Filtros de Servicios</h3>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tipo de Servicio */}
          <div className="space-y-2">
            <Label htmlFor="tipo_servicio">Tipo de Servicio</Label>
            <Select onValueChange={(value) => setValue('tipo_servicio', value === 'all' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo de servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {catalogs?.tipo_servicio.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado del Servicio */}
          <div className="space-y-2">
            <Label htmlFor="estado_servicio">Estado del Servicio</Label>
            <Select onValueChange={(value) => setValue('estado_servicio', value === 'all' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {catalogs?.estado_servicio.map((estado) => (
                  <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ID del Equipo */}
          <div className="space-y-2">
            <Label htmlFor="equipo_id">ID del Equipo</Label>
            <Input
              id="equipo_id"
              type="number"
              {...register('equipo_id', {
                setValueAs: (v) => {
                  // v puede venir como string '' o '123'
                  if (v === '' || v === null || v === undefined) return undefined;
                  const n = Number(v);
                  return Number.isFinite(n) ? n : undefined;
                }
              })}
              placeholder="ID numérico del equipo"
            />
          </div>

          {/* Número de Serie */}
          <div className="space-y-2">
            <Label htmlFor="num_serie">Número de Serie</Label>
            <Select onValueChange={(value) => setValue('num_serie', value === 'all' ? undefined : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar número de serie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los números de serie</SelectItem>
                {catalogs?.num_serie.map((serie) => (
                  <SelectItem key={serie} value={serie}>{serie}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fecha Desde */}
          <div className="space-y-2">
            <Label htmlFor="from_dt">Fecha de Servicio Desde</Label>
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
            <Label htmlFor="to_dt">Fecha de Servicio Hasta</Label>
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
          <Button type="submit" disabled={loading}>
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
