import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  // Avoid throwing hard errors; app will render login and can show a friendly message
  // but we keep the client defined to avoid undefined imports.
  console.warn('Supabase env vars missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(url || '', anon || '', {
  auth: {
    storage: sessionStorage,       // ← sesión por pestaña
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    multiTab: false,              // ← evita broadcast entre pestañas
    debug: false,
    storageKey: 'sisgemec-auth',
  },
  global: { fetch },
});