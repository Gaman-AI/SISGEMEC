import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { EquiposFilters } from '@/data/reportes.repository';

interface ReportFiltersEquiposProps {
  onSubmit: (filters: EquiposFilters) => void;
  onClear: () => void;
  loading?: boolean;
}

export default function ReportFiltersEquipos({ 
  onSubmit, 
  onClear, 
  loading = false 
}: ReportFiltersEquiposProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EquiposFilters>();

  const handleFormSubmit = (data: EquiposFilters) => {
    // Limpiar valores vacíos
    const cleanData: EquiposFilters = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        cleanData[key as keyof EquiposFilters] = value;
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
      <h3 className="text-lg font-semibold mb-4">Filtros de Equipos</h3>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tipo de Equipo */}
          <div className="space-y-2">
            <Label htmlFor="tipo_equipo">Tipo de Equipo</Label>
            <Input
              id="tipo_equipo"
              {...register('tipo_equipo')}
              placeholder="Ej: Laptop, Desktop"
            />
          </div>

          {/* Marca */}
          <div className="space-y-2">
            <Label htmlFor="marca">Marca</Label>
            <Input
              id="marca"
              {...register('marca')}
              placeholder="Ej: Dell, HP"
            />
          </div>

          {/* Estado del Equipo */}
          <div className="space-y-2">
            <Label htmlFor="estado_equipo">Estado del Equipo</Label>
            <Input
              id="estado_equipo"
              {...register('estado_equipo')}
              placeholder="Ej: Buen estado, En mantenimiento"
            />
          </div>

          {/* Responsable ID */}
          <div className="space-y-2">
            <Label htmlFor="responsable_id">ID del Responsable</Label>
            <Input
              id="responsable_id"
              {...register('responsable_id')}
              placeholder="UUID del responsable"
            />
          </div>

          {/* Número de Serie */}
          <div className="space-y-2">
            <Label htmlFor="num_serie">Número de Serie</Label>
            <Input
              id="num_serie"
              {...register('num_serie')}
              placeholder="Número de serie"
            />
          </div>

          {/* Ubicación Actual */}
          <div className="space-y-2">
            <Label htmlFor="ubicacion_actual">Ubicación Actual</Label>
            <Input
              id="ubicacion_actual"
              {...register('ubicacion_actual')}
              placeholder="Ej: Oficina 101, Piso 2"
            />
          </div>

          {/* Fecha Desde */}
          <div className="space-y-2">
            <Label htmlFor="from_dt">Fecha de Ingreso Desde</Label>
            <Input
              id="from_dt"
              type="date"
              {...register('from_dt')}
            />
          </div>

          {/* Fecha Hasta */}
          <div className="space-y-2">
            <Label htmlFor="to_dt">Fecha de Ingreso Hasta</Label>
            <Input
              id="to_dt"
              type="date"
              {...register('to_dt')}
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
