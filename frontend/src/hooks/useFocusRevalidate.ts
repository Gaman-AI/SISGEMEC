import { useEffect } from "react";

/**
 * Hook para revalidar datos al volver al foco de la ventana
 * 
 * NOTA: Este hook NO debe usarse para manejar sesión de autenticación.
 * La sesión se maneja automáticamente a través de AuthProvider y onAuthStateChange.
 * Supabase tiene autoRefreshToken: true configurado, por lo que no es necesario
 * llamar a refreshSession() manualmente.
 * 
 * Este hook solo ejecuta el callback de invalidación si se proporciona.
 */
export function useFocusRevalidate(invalidate?: () => void) {
  useEffect(() => {
    function onFocus() {
      // Ejecutar callback de invalidación si se proporciona
      if (invalidate) {
        invalidate();
      }
    }

    function onVisibilityChange() {
      // Solo revalidar cuando la pestaña se vuelve visible
      if (document.visibilityState === "visible") {
        onFocus();
      }
    }

    // Agregar listeners
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [invalidate]);
}

/**
 * Hook simplificado que solo refresca la sesión sin invalidación adicional
 * Útil para componentes que no necesitan revalidación de datos específicos
 */
export function useSessionRefresh() {
  useFocusRevalidate();
}
