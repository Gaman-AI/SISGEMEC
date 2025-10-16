import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Hook para revalidar sesión y datos al volver al foco de la ventana
 * Evita "zombie sessions" y datos obsoletos
 */
export function useFocusRevalidate(invalidate?: () => void) {
  useEffect(() => {
    async function onFocus() {
      try {
        // Siempre intentar refrescar la sesión al volver al foco
        await supabase.auth.refreshSession();
      } catch (error) {
        // Si falla el refresh, no hacer nada - el interceptor de API lo manejará
        console.debug('[useFocusRevalidate] Session refresh failed:', error);
      }
      
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
