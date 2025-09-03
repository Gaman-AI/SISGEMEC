// src/pages/usuarios/UsersForm.tsx
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { UserRole } from '../../data/users.types';
import { createUser, getUserById, updateUserProfile } from '../../data/users.repository';

import { Button } from '@/components/ui/button';
import {
  Save, X, ChevronDown,
  User as UserIcon, Mail, Building2, MapPin, Phone, ShieldCheck, Lock
} from 'lucide-react';

/* ------------------------------ Toast simple ------------------------------- */
function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [type, setType] = React.useState<'success' | 'error' | null>(null);
  const show = (m: string, t: 'success' | 'error' = 'success') => {
    setMsg(m);
    setType(t);
    window.clearTimeout((show as any)._t);
    (show as any)._t = window.setTimeout(() => {
      setMsg(null);
      setType(null);
    }, 3000);
  };
  const Toast = () =>
    msg ? (
      <div
        className={`fixed bottom-4 right-4 rounded-md px-4 py-2 text-sm shadow-md ${
          type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}
        role="status"
        aria-live="polite"
      >
        {msg}
      </div>
    ) : null;
  return { show, Toast };
}

/* ------------------------------ Schema unificado --------------------------- */
const UserFormSchema = z.object({
  full_name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido'),
  password: z
    .union([z.string().min(8, 'Mínimo 8 caracteres'), z.undefined()])
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  department: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'TECNICO', 'RESPONSABLE']).default('RESPONSABLE'),
  active: z.boolean().default(true),
});
type FormInput = z.input<typeof UserFormSchema>;

/* ------------------------------- Utilidades -------------------------------- */
const toNull = (s?: string) => (s && s.trim() !== '' ? s : null);

/* ---------- FancySelect (nativo con look shadcn + icono) ----------- */
type FancySelectProps = {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
};
function FancySelect({ id, value, onChange, placeholder, icon, children, required }: FancySelectProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          {icon}
        </span>
      )}
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`
          h-11 w-full appearance-none rounded-xl
          border border-input bg-white
          ${icon ? 'pl-10' : 'pl-3'} pr-9
          text-sm shadow-sm transition
          hover:bg-slate-50
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2
          ring-offset-background
        `}
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80"
        aria-hidden
      />
    </div>
  );
}

/* ---------------------------------- Form ----------------------------------- */
export default function UsersForm() {
  const navigate = useNavigate();
  const params = useParams();
  const userId = params.id;
  const isEdit = Boolean(userId);
  const { show, Toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset, // <-- IMPORTANTE para hidratar en edición
    formState: { isSubmitting, errors },
  } = useForm<FormInput>({
    resolver: zodResolver(UserFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: undefined, // sólo en creación
      department: '',
      phone: '',
      location: '',
      role: 'RESPONSABLE' as UserRole,
      active: true,
    },
  });

  // Evita rehidratar repetidamente el mismo usuario en edición
  const hydratedRef = React.useRef<string | null>(null);

  // Cargar datos en edición (hidratar el form de una sola vez)
  React.useEffect(() => {
    (async () => {
      if (!isEdit || !userId) return;

      if (hydratedRef.current === userId) return; // ya hidratado

      const { data, error } = await getUserById(userId);
      if (error) {
        show(error.message || 'No se pudo cargar el usuario', 'error');
        return;
      }
      if (data) {
        // Mapeo estricto para tipos correctos del form
        const mapped: FormInput = {
          full_name: data.full_name ?? '',
          email: data.email ?? '',
          password: undefined, // nunca hidratar password
          department: data.department ?? '',
          phone: data.phone ?? '',
          location: data.location ?? '',
          role: (data.role as UserRole) ?? 'RESPONSABLE',
          active: !!data.active,
        };
        reset(mapped); // <-- hidrata todo el formulario de una sola vez
        hydratedRef.current = userId;
      }
    })();
    // OJO: no metemos `show` en deps para evitar re-ejecuciones inestables
  }, [isEdit, userId, reset, show]);

  const onSubmit: SubmitHandler<FormInput> = async (values) => {
    try {
      if (isEdit && userId) {
        await updateUserProfile(userId, {
          full_name: values.full_name,
          email: values.email ?? null,
          department: toNull(values.department),
          phone: toNull(values.phone),
          location: toNull(values.location),
          role: (values.role ?? 'RESPONSABLE') as UserRole,
          active: values.active ?? true,
        });
        show('Usuario actualizado');
      } else {
        if (!values.password) {
          show('La contraseña es obligatoria', 'error');
          return;
        }
        await createUser({
          full_name: values.full_name,
          email: values.email ?? '',
          password: values.password,
          department: toNull(values.department),
          phone: toNull(values.phone),
          location: toNull(values.location),
          role: (values.role ?? 'RESPONSABLE') as UserRole,
          active: values.active ?? true,
        });
        show('Usuario creado');
      }
      setTimeout(() => navigate('/usuarios'), 500);
    } catch (e: any) {
      const msg = e?.message || e?.error_description || 'Ocurrió un error al guardar el usuario';
      show(msg, 'error');
    }
  };

  /* ------------------------------- UI -------------------------------------- */
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      {/* Header sin botones (para evitar duplicados) */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Captura la información del usuario. Los campos marcados con <span className="text-slate-900">*</span> son obligatorios.
        </p>
      </div>

      {/* Card del formulario */}
      <form
        id="users-form"
        className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6 shadow-sm"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* ---- Identidad ---- */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Identidad</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="full_name" className="mb-1 block text-sm font-medium text-slate-700">
                Nombre completo <span className="text-slate-900">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <UserIcon className="h-4 w-4" />
                </span>
                <input
                  id="full_name"
                  placeholder="Nombre completo"
                  className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                  {...register('full_name')}
                />
              </div>
              {errors.full_name && (
                <p className="mt-1 text-xs text-rose-600">{errors.full_name.message as string}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email <span className="text-slate-900">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="correo@empresa.com"
                  className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600">{errors.email.message as string}</p>
              )}
            </div>

            {!isEdit && (
              <div className="md:col-span-2">
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                  Contraseña (mín. 8) <span className="text-slate-900">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                    {...register('password')}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ---- Perfil ---- */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Perfil</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="department" className="mb-1 block text-sm font-medium text-slate-700">
                Departamento
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Building2 className="h-4 w-4" />
                </span>
                <input
                  id="department"
                  placeholder="TI, Administración…"
                  className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                  {...register('department')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="location" className="mb-1 block text-sm font-medium text-slate-700">
                Ubicación
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <MapPin className="h-4 w-4" />
                </span>
                <input
                  id="location"
                  placeholder="Oficina A-2…"
                  className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                  {...register('location')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-700">
                Teléfono
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <Phone className="h-4 w-4" />
                </span>
                <input
                  id="phone"
                  placeholder="55 0000 0000"
                  className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm shadow-sm outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 ring-offset-background"
                  {...register('phone')}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ---- Permisos ---- */}
        <div className="mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Permisos</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">
                Rol <span className="text-slate-900">*</span>
              </label>
              <FancySelect
                id="role"
                value={watch('role') || ''}
                onChange={(v) =>
                  setValue('role', (v as UserRole) || 'RESPONSABLE', { shouldDirty: true, shouldValidate: true })
                }
                placeholder="Selecciona un rol"
                icon={<ShieldCheck className="h-4 w-4" />}
                required
              >
                <option value="ADMIN">ADMIN</option>
                <option value="TECNICO">TECNICO</option>
                <option value="RESPONSABLE">RESPONSABLE</option>
              </FancySelect>
              {errors.role && (
                <p className="mt-1 text-xs text-rose-600">{errors.role.message as string}</p>
              )}
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-slate-700"
                  {...register('active')}
                />
                <span className="text-sm text-slate-700">Activo</span>
              </label>
            </div>
          </div>
        </div>

        {/* Botonera inferior (ÚNICA) */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            onClick={() => navigate('/usuarios')}
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-gradient-to-b from-slate-900 to-slate-700 text-white hover:from-slate-800 hover:to-slate-600"
          >
            <Save className="mr-2 h-4 w-4" />
            {isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      </form>

      <Toast />
    </div>
  );
}


