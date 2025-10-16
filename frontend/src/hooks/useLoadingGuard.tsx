import React, { useEffect, useState } from "react";

/**
 * Hook para detectar cuando un loading state se ha quedado "colgado"
 * Útil para mostrar opciones de recuperación al usuario
 */
export function useLoadingGuard(isLoading: boolean, timeoutMs = 12000) {
  const [isStalled, setIsStalled] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsStalled(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsStalled(true);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [isLoading, timeoutMs]);

  return isStalled;
}

/**
 * Componente de UI para mostrar cuando el loading está colgado
 */
interface LoadingGuardProps {
  isLoading: boolean;
  onRetry?: () => void;
  timeoutMs?: number;
  children?: React.ReactNode;
}

export function LoadingGuard({ 
  isLoading, 
  onRetry, 
  timeoutMs = 12000, 
  children 
}: LoadingGuardProps) {
  const isStalled = useLoadingGuard(isLoading, timeoutMs);

  if (!isLoading || !isStalled) {
    return <>{children}</>;
  }

  return (
    <div className="mt-2 text-sm text-amber-600">
      <p>La operación está tardando más de lo normal.</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="mt-1 text-blue-600 hover:text-blue-800 underline"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
