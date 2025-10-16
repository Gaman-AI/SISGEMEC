import React from 'react';

/**
 * Utilidad para garantizar que setLoading(false) siempre se ejecute,
 * incluso cuando hay errores o cancelaciones
 */
export async function safeAsync<T>(
  promise: Promise<T>, 
  onFinally?: () => void
): Promise<T> {
  try {
    return await promise;
  } finally {
    onFinally?.();
  }
}

/**
 * Hook helper para manejar loading states de forma segura
 */
export function useSafeLoading() {
  const [isLoading, setIsLoading] = React.useState(false);
  
  const safeSetLoading = React.useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);
  
  const withSafeLoading = React.useCallback(async <T>(
    promise: Promise<T>
  ): Promise<T> => {
    return safeAsync(promise, () => safeSetLoading(false));
  }, [safeSetLoading]);
  
  return {
    isLoading,
    setLoading: safeSetLoading,
    withSafeLoading
  };
}
