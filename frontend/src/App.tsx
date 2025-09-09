import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ThemeProvider } from "./lib/theme-provider";
import AppLayout from "./components/layout/AppLayout";
import { AuthProvider, useAuth } from "./auth/auth.store";
import RequireAuth from "./routes/guards/RequireAuth";
import RequireAdmin from "./routes/guards/RequireAdmin";
import RequireResponsable from "./routes/guards/RequireResponsable";

import LoginPage from "./pages/auth/LoginPage";
import LogoutPage from "./pages/auth/LogoutPage";

import EquiposList from "./pages/equipos/EquiposList";
import EquiposForm from "./pages/equipos/EquiposForm";
import UsersList from "./pages/usuarios/UsersList";
import UsersForm from "./pages/usuarios/UsersForm";
import TiposServicioList from "./pages/tipos-servicio/TiposServicioList";
import TiposServicioForm from "./pages/tipos-servicio/TiposServicioForm";
import ServiciosList from "./pages/servicios/ServiciosList";
import ServiciosForm from "./pages/servicios/ServiciosForm";
import MisEquiposList from "./pages/solicitudes/MisEquiposList";
import MisSolicitudesList from "./pages/solicitudes/MisSolicitudesList";
import MisSolicitudesForm from "./pages/solicitudes/MisSolicitudesForm";
import MisSolicitudDetalle from "./pages/solicitudes/MisSolicitudDetalle";
import SolicitudesDeServicioList from "./pages/solicitudes/SolicitudesDeServicioList";
import SolicitudDetalle from "./pages/solicitudes/SolicitudDetalle";
import DashboardPage from "./pages/dashboard/DashboardPage";

function RoleRedirect() {
  const { state } = useAuth();
  if (state.status === "loading") {
    return <div className="p-4 text-sm text-slate-600">Cargando...</div>;
  }
  if (state.status === "unauthenticated") return <Navigate to="/login" replace />;
  return state.profile.role === "ADMIN"
    ? <Navigate to="/dashboard" replace />
    : <Navigate to="/mis-solicitudes" replace />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Rutas públicas sin AppLayout */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/logout" element={<LogoutPage />} />

            {/* Home decide según rol/sesión */}
            <Route path="/" element={<RoleRedirect />} />

            {/* Rutas protegidas envueltas en AppLayout */}
            <Route element={<AppLayout />}>
              {/* ADMIN */}
              <Route path="/dashboard" element={<RequireAuth><RequireAdmin><DashboardPage /></RequireAdmin></RequireAuth>} />
              <Route path="/equipos" element={<RequireAuth><RequireAdmin><EquiposList /></RequireAdmin></RequireAuth>} />
              <Route path="/equipos/nuevo" element={<RequireAuth><RequireAdmin><EquiposForm /></RequireAdmin></RequireAuth>} />
              <Route path="/equipos/:id/editar" element={<RequireAuth><RequireAdmin><EquiposForm /></RequireAdmin></RequireAuth>} />
              <Route path="/usuarios" element={<RequireAuth><RequireAdmin><UsersList /></RequireAdmin></RequireAuth>} />
              <Route path="/usuarios/nuevo" element={<RequireAuth><RequireAdmin><UsersForm /></RequireAdmin></RequireAuth>} />
              <Route path="/usuarios/:id/editar" element={<RequireAuth><RequireAdmin><UsersForm /></RequireAdmin></RequireAuth>} />
              <Route path="/tipos-servicio" element={<RequireAuth><RequireAdmin><TiposServicioList /></RequireAdmin></RequireAuth>} />
              <Route path="/tipos-servicio/nuevo" element={<RequireAuth><RequireAdmin><TiposServicioForm /></RequireAdmin></RequireAuth>} />
              <Route path="/tipos-servicio/:id/editar" element={<RequireAuth><RequireAdmin><TiposServicioForm /></RequireAdmin></RequireAuth>} />
              <Route path="/servicios" element={<RequireAuth><RequireAdmin><ServiciosList /></RequireAdmin></RequireAuth>} />
              <Route path="/servicios/nuevo" element={<RequireAuth><RequireAdmin><ServiciosForm /></RequireAdmin></RequireAuth>} />
              <Route path="/servicios/:id/editar" element={<RequireAuth><RequireAdmin><ServiciosForm /></RequireAdmin></RequireAuth>} />
              <Route path="/solicitudes" element={<RequireAuth><RequireAdmin><SolicitudesDeServicioList /></RequireAdmin></RequireAuth>} />
              <Route path="/solicitudes/:id" element={<RequireAuth><RequireAdmin><SolicitudDetalle /></RequireAdmin></RequireAuth>} />

              {/* RESPONSABLE */}
              <Route path="/mis-equipos" element={<RequireAuth><RequireResponsable><MisEquiposList /></RequireResponsable></RequireAuth>} />
              <Route path="/mis-solicitudes" element={<RequireAuth><RequireResponsable><MisSolicitudesList /></RequireResponsable></RequireAuth>} />
              <Route path="/mis-solicitudes/nueva" element={<RequireAuth><RequireResponsable><MisSolicitudesForm /></RequireResponsable></RequireAuth>} />
              <Route path="/mis-solicitudes/:id" element={<RequireAuth><RequireResponsable><MisSolicitudDetalle /></RequireResponsable></RequireAuth>} />

              {/* Salud y 404 */}
              <Route path="/health" element={<div>OK</div>} />
              <Route path="*" element={<div className="p-6">404</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}