import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/auth.store";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const loc = useLocation();

  if (state.status === "loading") {
    return <div className="p-4 text-sm text-slate-600">Cargando...</div>;
  }
  if (state.status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  return <>{children}</>;
}