import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { UserRole } from '../../data/users.types';
import { createUser, getUserById, updateUserProfile } from '../../data/users.repository';

/* ------------------------------ Toast simple ------------------------------- */
function useToast() {
  const [msg, setMsg] = React.useState<string | null>(null);
  const [type, setType] = React.useState<'success' | 'error' | null>(null);
  const show = (m: string, t: 'success' | 'error' = 'success') => {
    setMsg(m);
    setType(t);
    setTimeout(() => {
      setMsg(null);
      setType(null);
    }, 2500);
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
/** Nota clave:
 *  - Usamos UN solo schema para create+edit.
 *  - password se permite como undefined (propiedad presente, valor opcional).
 *  - role/active tienen default en Zod, pero el tipo de ENTRADA los puede tratar como opcionales;
 *    por eso tipamos el form con z.input<typeof Schema>.
 */
const UserFormSchema = z.object({
  full_name: z.string().min(2, 'Nombre muy corto'),
  email: z.string().email('Email inválido'),
  // propiedad presente, valor string o undefined; '' -> undefined
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

// Tipo de ENTRADA que espera el resolver (lo que RHF maneja internamente)
type FormInput = z.input<typeof UserFormSchema>;

/* ------------------------------- Utilidades -------------------------------- */
const toNull = (s?: string) => (s && s.trim() !== '' ? s : null);

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
    formState: { isSubmitting },
  } = useForm<FormInput>({
    resolver: zodResolver(UserFormSchema),
    // defaults en el tipo de ENTRADA (strings, undefineds)
    defaultValues: {
      full_name: '',
      email: '',
      password: undefined, // sólo se usa al crear
      department: '',
      phone: '',
      location: '',
      role: 'RESPONSABLE' as UserRole,
      active: true,
    },
  });

  // Cargar datos en edición
  React.useEffect(() => {
    (async () => {
      if (!isEdit || !userId) return;
      const { data, error } = await getUserById(userId);
      if (error) {
        show(error.message || 'No se pudo cargar el usuario', 'error');
        return;
      }
      if (data) {
        setValue('full_name', data.full_name ?? '');
        setValue('email', data.email ?? '');
        setValue('department', data.department ?? '');
        setValue('phone', data.phone ?? '');
        setValue('location', data.location ?? '');
        setValue('role', (data.role as UserRole) ?? 'RESPONSABLE');
        setValue('active', !!data.active);
        // password no se toca en edición
      }
    })();
  }, [isEdit, userId, setValue, show]);

  const onSubmit: SubmitHandler<FormInput> = async (values) => {
    try {
      if (isEdit && userId) {
        // EDITAR: no tocamos auth.users ni password
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
        // CREAR: password obligatorio aquí (no en el schema)
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

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {isEdit ? 'Editar usuario' : 'Nuevo usuario'}
        </h1>
      </div>

      <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 md:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
            Información general
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              aria-label="Nombre completo"
              placeholder="Nombre completo"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600"
              {...register('full_name')}
            />
            <input
              aria-label="Email"
              placeholder="Email"
              type="email"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600"
              {...register('email')}
            />
            {!isEdit && (
              <input
                aria-label="Contraseña"
                placeholder="Contraseña (mín. 8)"
                type="password"
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600"
                {...register('password')}
              />
            )}
            <select
              aria-label="Rol"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
              {...register('role')}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="TECNICO">TECNICO</option>
              <option value="RESPONSABLE">RESPONSABLE</option>
            </select>
            <input
              aria-label="Departamento"
              placeholder="Departamento"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600"
              {...register('department')}
            />
            <input
              aria-label="Teléfono"
              placeholder="Teléfono"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600"
              {...register('phone')}
            />
            <input
              aria-label="Ubicación"
              placeholder="Ubicación"
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-gray-600"
              {...register('location')}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('active')} />
              Activo
            </label>
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            onClick={() => navigate('/usuarios')}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {isEdit ? 'Guardar cambios' : 'Crear usuario'}
          </button>
        </div>
      </form>

      <Toast />
    </div>
  );
}
