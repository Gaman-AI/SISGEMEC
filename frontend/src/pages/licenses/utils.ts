/**
 * Helper para parsear errores de la API en el módulo de Licencias
 * 
 * Maneja diferentes formatos de error:
 * - Estructura tipo axios (compatibilidad futura)
 * - apiPost: JSON directo en err.message
 * - apiPut/apiDelete: formato "METHOD /path STATUS {...}"
 */
export function parseApiError(err: any): { status?: number; detail?: string; data?: any } {
  // Caso 1: Formato tipo axios (compatibilidad futura)
  if (err?.response?.status && err?.response?.data) {
    return {
      status: err.response.status,
      detail: err.response.data?.detail,
      data: err.response.data,
    };
  }

  const rawMessage = err?.message || '';

  // Caso 2: apiPost - mensaje es JSON directo: '{"detail": "..."}'
  try {
    const parsed = JSON.parse(rawMessage);
    if (parsed && (parsed.detail || parsed.status)) {
      return {
        status: parsed.status || err.status || 500,
        detail: parsed.detail,
        data: parsed,
      };
    }
  } catch {
    // No es JSON puro, continuamos
  }

  // Caso 3: apiPut/apiDelete - mensaje tipo: 'PUT /path 409 {"detail": "..."}'
  const statusMatch = rawMessage.match(/\s(\d{3})\s/);
  const status = statusMatch ? Number(statusMatch[1]) : err.status || undefined;

  const jsonMatch = rawMessage.match(/\{.*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        status,
        detail: parsed.detail || rawMessage,
        data: parsed,
      };
    } catch {
      // JSON inválido, seguimos al fallback
    }
  }

  // Caso 4: Fallback seguro
  return {
    status,
    detail: rawMessage || err.detail || 'Error inesperado',
    data: err.data || undefined,
  };
}

