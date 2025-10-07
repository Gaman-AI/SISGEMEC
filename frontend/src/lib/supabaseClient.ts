import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  
  if (!url || !key) {
    console.warn('Supabase env vars missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  
  _client = createClient(url || '', key || '', {
    auth: {
      storage: sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      debug: false,
      storageKey: 'sisgemec-auth', // clave única para evitar colisiones
    },
    global: { fetch },
  });
  
  return _client;
}

// Exportar también como default para compatibilidad
export const supabase = getSupabaseClient();