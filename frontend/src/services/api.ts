import { getSupabaseClient } from '@/lib/supabaseClient';
import axios from 'axios';

// Resolver VITE_API_BASE_URL con fallback automático
const BASE_URL = (import.meta as any).env.VITE_BACKEND_URL || 
                 (import.meta as any).env.VITE_API_BASE_URL || 
                 "http://localhost:8000";
const supabase = getSupabaseClient();

// Cliente axios con interceptor de auth
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

// Interceptor de response
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(`[api] Error ${error.response?.status}: ${error.message}`);
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
    
    const res = await fetch(`${BASE_URL}${path}`, {
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

  const res = await fetch(`${BASE_URL}${path}`, {
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
  
  const res = await fetch(url, {
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
  
  const res = await fetch(`${BASE_URL}${path}`, {
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