// frontend/src/lib/axios.ts
import axios from "axios";

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:8000";
const ADMIN_TOKEN = ((import.meta as any).env?.VITE_API_ADMIN_TOKEN ?? "dev-admin-token-123").trim();

export const api = axios.create({
  baseURL: BASE_URL.replace(/\/+$/, ""),
});

// Rutas protegidas: detectar /users con o sin prefijos (p.ej. /api/v1/users)
const PROTECTED_PATHS: RegExp[] = [
  /(^|\/)users\/?$/i,     // .../users  o .../users/
];

api.interceptors.request.use((config) => {
  const rawUrl = config.url ?? "";
  const asURL = new URL(rawUrl, api.defaults.baseURL);
  const pathname = asURL.pathname;

  const isProtected = PROTECTED_PATHS.some((re) => re.test(pathname));
  if (isProtected) {
    if (!config.headers) config.headers = {} as any;
    // Fuerza Authorization si no está presente.
    // Evita duplicados en minúsculas/mayúsculas.
    const hasAuth =
      Object.keys(config.headers).some((k) => k.toLowerCase() === "authorization") ||
      Object.keys(config.headers).some((k) => k.toLowerCase() === "x-admin-token");

    if (!hasAuth) {
      if (ADMIN_TOKEN) {
        (config.headers as any)["Authorization"] = `Bearer ${ADMIN_TOKEN}`;
      } else {
        console.warn(
          "[api] VITE_API_ADMIN_TOKEN está vacío. Las rutas admin fallarán con 401."
        );
      }
    }
  }

  return config;
});

export default api;
