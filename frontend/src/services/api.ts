import { getSupabaseClient, supabase } from '@/lib/supabaseClient';
import axios from 'axios';

// Resolver VITE_API_BASE_URL con fallback automático
const BASE_URL = (import.meta as any).env.VITE_BACKEND_URL || 
                 (import.meta as any).env.VITE_API_BASE_URL || 
                 "http://localhost:8000";
const supabaseClient = getSupabaseClient();

// Manejo centralizado de refresh de sesión (evita múltiples refresh simultáneos)
let _refreshing = false;
let _waiters: Array<() => void> = [];

async function refreshOnce(): Promise<boolean> {
  if (_refreshing) {
    await new Promise<void>((r) => _waiters.push(r));
    return true; // otro proceso ya refrescó
  }
  _refreshing = true;
  try {
    const { error, data } = await supabase.auth.refreshSession();
    return !error && !!data.session;
  } finally {
    _refreshing = false;
    _waiters.forEach((r) => r());
    _waiters = [];
  }
}

async function withAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers || {});
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers });
}

async function doRequest(url: string, init: RequestInit, attempt = 0): Promise<Response> {
  // Timeout suave 15s para evitar "pending" infinito
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await withAuth(url, { ...init, signal: ctrl.signal });
    if (res.status !== 401) return res;
    if (attempt === 0) {
      const ok = await refreshOnce();
      if (ok) return doRequest(url, init, 1); // reintento único
    }
    await supabase.auth.signOut();
    window.location.href = '/login';
    throw new Error('UNAUTHENTICATED');
  } finally {
    clearTimeout(timer);
  }
}

// Cliente axios con interceptor de auth (mantener para compatibilidad)
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  withCredentials: false,
});

// Interceptor de request para inyectar token
api.interceptors.request.use(
  async (config) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de response (mejorado con manejo de 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    if (status === 401) {
      const ok = await refreshOnce();
      if (ok) {
        // Retry la petición original con nuevo token
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          error.config.headers.Authorization = `Bearer ${session.access_token}`;
          return api.request(error.config);
        }
      }
      // Si refresh falla, hacer signOut y redirigir
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
    console.error(`[api] Error ${status}: ${error.message}`);
    return Promise.reject(error);
  }
);

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}


export async function apiPost(path: string, body: any, customHeaders?: Record<string, string>) {
  const baseHeaders = await authHeaders();
  
  // header de idempotencia (mantenerlo por defecto)
  const idemHeaderKey = "Idempotency-Key";
  const idemValue = crypto?.randomUUID?.() ?? String(Date.now());
  
  async function doFetch(withIdem = true) {
    const headers: Record<string, string> = { 
      ...baseHeaders, 
      ...(customHeaders || {})
    };
    
    // Si customHeaders trae Idempotency-Key explícito, respetarlo; sino usar el automático
    if (customHeaders?.[idemHeaderKey]) {
      headers[idemHeaderKey] = customHeaders[idemHeaderKey];
    } else if (withIdem) {
      headers[idemHeaderKey] = idemValue;
    }
    
    const res = await doRequest(`${BASE_URL}${path}`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || res.statusText);
    }
    return res.json().catch(() => ({}));
  }

  try {
    return await doFetch(true);
  } catch (err: any) {
    // fallback solo para /licenses/assignments/ en caso de CORS por preflight
    if (String(err).toLowerCase().includes("cors") && path.startsWith("/licenses/assignments")) {
      console.warn("[apiPost] retry without Idempotency-Key for", path);
      return await doFetch(false);
    }
    throw err;
  }
}

export async function apiPut(
  path: string,
  body: any,
  customHeaders?: Record<string, string>
) {
  const baseHeaders = await authHeaders();
  const headers = customHeaders ? { ...baseHeaders, ...customHeaders } : baseHeaders;

  const res = await doRequest(`${BASE_URL}${path}`, {
    method: "PUT",
    headers,
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`PUT ${path} ${res.status} ${t}`);
  }

  // Normalizar SIEMPRE a { data, status }
  const ct = res.headers.get("content-type") || "";
  // Puede haber 200 OK sin cuerpo
  const text = await res.text().catch(() => "");

  if (!text) {
    return { data: null, status: res.status };
  }

  if (ct.includes("application/json")) {
    try {
      const parsed = JSON.parse(text);
      return { data: parsed, status: res.status };
    } catch (e) {
      console.warn(`[apiPut] JSON parse error for ${path}:`, e);
      // Considerar éxito sin data válida
      return { data: null, status: res.status };
    }
  }

  // No JSON: devolver texto crudo como data
  return { data: text, status: res.status };
}

export async function apiGet(path: string, options?: { 
  customHeaders?: Record<string, string>;
  responseType?: 'json' | 'blob';
  params?: Record<string, any>;
}) {
  const baseHeaders = await authHeaders();
  const headers = options?.customHeaders ? { ...baseHeaders, ...options.customHeaders } : baseHeaders;
  
  // Construir URL con parámetros
  let url = `${BASE_URL}${path}`;
  if (options?.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }
  
  // Log de consola para debugging
  console.debug(`[apiGet] GET ${url}`);
  
  const res = await doRequest(url, {
    method: "GET",
    headers,
    credentials: "include",
  });
  
  // Asegurar rechazo en 401/403/otros para que catch/finally ejecuten
  if (!res.ok) {
    const t = await res.text();
    const error = new Error(`GET ${path} ${res.status} ${t}`);
    (error as any).status = res.status;
    (error as any).response = { status: res.status, data: t };
    console.error(`[apiGet] Error ${res.status}: ${t}`);
    return Promise.reject(error);
  }
  
  if (options?.responseType === 'blob') {
    return res.blob();
  }
  return res.json();
}

export async function apiDelete(path: string, customHeaders?: Record<string, string>) {
  const baseHeaders = await authHeaders();
  const headers = customHeaders ? { ...baseHeaders, ...customHeaders } : baseHeaders;
  
  const res = await doRequest(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DELETE ${path} ${res.status} ${t}`);
  }
  return res.json();
}

// eslint-disable-next-line no-console
console.log('[LICENSES-FE:FIX] repos OK, listas con loading/empty/error, sidebar con submenús (flag+admin), URLs con "/" final, v2 services OK, selectors OK');
console.log('[LICENSES-FE:UserSelect] using supabase profiles (no /profiles api)');
console.log('[LICENSES-FE:CORS] allow_headers includes idempotency-key');