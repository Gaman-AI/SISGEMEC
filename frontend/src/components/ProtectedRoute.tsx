import React from "react";
import { Navigate } from "react-router-dom";
import { useSessionReady } from "@/hooks/useSessionReady";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { ready, hasSession } = useSessionReady();

  if (!ready) return <div className="p-6">Cargando…</div>;
  if (!hasSession) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
