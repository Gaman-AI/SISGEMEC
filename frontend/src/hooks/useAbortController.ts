import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook para manejar AbortController de forma segura
 * Evita updates en componentes desmontados y cargas "fantasma"
 */
export function useAbortController() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const createController = useCallback(() => {
    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller;
  }, []);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    createController,
    abort,
    get signal() {
      return abortControllerRef.current?.signal;
    }
  };
}

/**
 * Hook para ejecutar operaciones async con cancelación automática
 */
export function useAsyncOperation() {
  const { createController } = useAbortController();

  const execute = useCallback(async <T>(
    operation: (signal: AbortSignal) => Promise<T>
  ): Promise<T> => {
    const controller = createController();
    
    try {
      return await operation(controller.signal);
    } catch (error: any) {
      // Ignorar errores de cancelación
      if (error.name === "CanceledError" || error.name === "AbortError") {
        throw error; // Re-lanzar para que el componente pueda manejarlo
      }
      throw error;
    }
  }, [createController]);

  return { execute };
}
