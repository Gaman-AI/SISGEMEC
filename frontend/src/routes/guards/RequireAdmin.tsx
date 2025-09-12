import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/auth.store";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  if (state.status === "loading") {
    return <div className="p-4 text-sm text-slate-600">Cargando...</div>;
  }
  if (state.status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }
  if (state.profile.role !== "ADMIN") {
    return <Navigate to="/mis-solicitudes" replace />;
  }
  return <>{children}</>;
}