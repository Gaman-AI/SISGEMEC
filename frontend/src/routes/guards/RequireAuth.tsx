import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/auth.store";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const loc = useLocation();

  console.log('[RequireAuth] Renderizando con state.status =', state.status);

  if (state.status === "loading") {
    console.warn('[RequireAuth] Mostrando "Cargando..." porque state.status === "loading"');
    return <div className="p-4 text-sm text-slate-600">Cargando...</div>;
  }
  if (state.status === "unauthenticated") {
    console.log('[RequireAuth] Redirigiendo a /login porque state.status === "unauthenticated"');
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  console.log('[RequireAuth] Renderizando children porque state.status === "authenticated"');
  return <>{children}</>;
}