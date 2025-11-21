import React, { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EquiposFilters, reportesRepo } from '@/data/reportes.repository';
import { listActiveProfilesLite, type ProfileLite } from '@/data/users.licenses.repository';

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
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<EquiposFilters>();
  const responsableValue = watch('responsable');
  const responsableRef = useRef<HTMLDivElement>(null);
  
  // Estado para catálogos de equipos
  const [catalogs, setCatalogs] = useState<{
    estado_equipo: string[];
    fecha_min: string;
    fecha_max: string;
  } | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  
  // Estado para autocomplete de responsable
  const [responsableSearch, setResponsableSearch] = useState('');
  const [responsableOptions, setResponsableOptions] = useState<ProfileLite[]>([]);
  const [responsableLoading, setResponsableLoading] = useState(false);
  const [showResponsableDropdown, setShowResponsableDropdown] = useState(false);
  
  // Cargar catálogos al montar
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const data = await reportesRepo.fetchEquiposCatalogs();
        setCatalogs(data);
        setCatalogError(false);
      } catch (error) {
        console.warn('[ReportFiltersEquipos] Error cargando catálogos, usando input de texto:', error);
        setCatalogError(true);
      }
    };
    loadCatalogs();
  }, []);
  
  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (responsableRef.current && !responsableRef.current.contains(event.target as Node)) {
        setShowResponsableDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Debounce para búsqueda de responsable
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(responsableSearch), 250);
    return () => clearTimeout(id);
  }, [responsableSearch]);

  // Cargar opciones de responsable
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setResponsableLoading(true);
        const res = await listActiveProfilesLite({ 
          page: 1, 
          size: 10, 
          search: debouncedSearch 
        });
        if (!cancelled) {
          setResponsableOptions(res.data);
        }
      } catch (e) {
        console.error('[ReportFiltersEquipos] Error cargando responsables', e);
        if (!cancelled) {
          setResponsableOptions([]);
        }
      } finally {
        if (!cancelled) {
          setResponsableLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedSearch]);

  // Sincronizar input con valor del form
  useEffect(() => {
    if (!responsableValue) {
      setResponsableSearch('');
    }
  }, [responsableValue]);

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
    setResponsableSearch('');
    setShowResponsableDropdown(false);
    onClear();
  };
  
  const estadoEquipoValue = watch('estado_equipo');

  const handleResponsableSelect = (profile: ProfileLite) => {
    // Preferir email, si no hay usar full_name
    const value = profile.email || profile.full_name || '';
    setValue('responsable', value);
    setResponsableSearch(`${profile.full_name || '(Sin nombre)'} · ${profile.email || '(Sin correo)'}`);
    setShowResponsableDropdown(false);
  };

  return (
    <Card className="rounded-2xl border border-[#CFD0BF] bg-white p-4 shadow-sm md:p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#164F5B]">
        Filtros de equipos
      </h3>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tipo de Equipo */}
          <div className="space-y-2">
            <Label htmlFor="tipo_equipo" className="text-sm font-medium text-[#26272A]">Tipo de Equipo</Label>
            <Input
              id="tipo_equipo"
              {...register('tipo_equipo')}
              placeholder="Ej: Laptop, Desktop"
            />
          </div>

          {/* Marca */}
          <div className="space-y-2">
            <Label htmlFor="marca" className="text-sm font-medium text-[#26272A]">Marca</Label>
            <Input
              id="marca"
              {...register('marca')}
              placeholder="Ej: Dell, HP"
            />
          </div>

          {/* Estado del Equipo */}
          <div className="space-y-2">
            <Label htmlFor="estado_equipo" className="text-sm font-medium text-[#26272A]">Estado del Equipo</Label>
            {catalogError || !catalogs ? (
              // Fallback a input si el catálogo falla
              <Input
                id="estado_equipo"
                {...register('estado_equipo')}
                placeholder="Ej: ACTIVO, EN_MANTENIMIENTO, DE_BAJA"
              />
            ) : (
              <Select 
                value={estadoEquipoValue || 'all'} 
                onValueChange={(value) => setValue('estado_equipo', value === 'all' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {catalogs.estado_equipo.map((estado) => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Responsable (Autocomplete) */}
          <div className="space-y-2 relative" ref={responsableRef}>
            <Label htmlFor="responsable" className="text-sm font-medium text-[#26272A]">Responsable (nombre o correo)</Label>
            <Input
              id="responsable"
              value={responsableSearch}
              onChange={(e) => {
                setResponsableSearch(e.target.value);
                setShowResponsableDropdown(true);
                // Si se limpia manualmente, limpiar el valor del form
                if (!e.target.value) {
                  setValue('responsable', undefined);
                }
              }}
              onFocus={() => setShowResponsableDropdown(true)}
              placeholder="Ej. Ana López o ana@empresa.com"
              autoComplete="off"
            />
            {/* Input oculto para el valor real del form */}
            <input type="hidden" {...register('responsable')} />
            
            {/* Dropdown de opciones */}
            {showResponsableDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                {responsableLoading ? (
                  <div className="p-3 text-sm text-[#527779]">Cargando...</div>
                ) : responsableOptions.length === 0 ? (
                  <div className="p-3 text-sm text-[#527779]">
                    {responsableSearch ? 'No se encontraron resultados' : 'Escriba para buscar'}
                  </div>
                ) : (
                  <ul className="divide-y">
                    {responsableOptions.map((profile) => (
                      <li
                        key={profile.user_id}
                        className="px-3 py-2 cursor-pointer text-sm hover:bg-[#E5EADF]"
                        onClick={() => handleResponsableSelect(profile)}
                      >
                        <div className="font-medium">{profile.full_name || '(Sin nombre)'}</div>
                        <div className="text-xs text-[#527779]">{profile.email || '(Sin correo)'}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Número de Serie */}
          <div className="space-y-2">
            <Label htmlFor="num_serie" className="text-sm font-medium text-[#26272A]">Número de Serie</Label>
            <Input
              id="num_serie"
              {...register('num_serie')}
              placeholder="Número de serie"
            />
          </div>

          {/* Ubicación Actual */}
          <div className="space-y-2">
            <Label htmlFor="ubicacion_actual" className="text-sm font-medium text-[#26272A]">Ubicación Actual</Label>
            <Input
              id="ubicacion_actual"
              {...register('ubicacion_actual')}
              placeholder="Ej: Oficina 101, Piso 2"
            />
          </div>

          {/* Fecha Desde */}
          <div className="space-y-2">
            <Label htmlFor="from_dt" className="text-sm font-medium text-[#26272A]">Fecha de Ingreso Desde</Label>
            <Input
              id="from_dt"
              type="date"
              {...register('from_dt')}
            />
          </div>

          {/* Fecha Hasta */}
          <div className="space-y-2">
            <Label htmlFor="to_dt" className="text-sm font-medium text-[#26272A]">Fecha de Ingreso Hasta</Label>
            <Input
              id="to_dt"
              type="date"
              {...register('to_dt')}
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 pt-4">
          <Button 
            type="submit" 
            disabled={loading} 
            className="
              inline-flex items-center gap-2 rounded-xl
              bg-[#208692] hover:bg-[#164F5B] text-white
              transition-colors duration-200 shadow-sm
              px-4 py-2.5 text-sm font-semibold
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#208692]/30
            "
          >
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
