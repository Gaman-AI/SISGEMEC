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
import ImportarPage from "./pages/ImportarPage";
import ImportUsuariosPage from "./pages/import-usuarios/ImportUsuariosPage";
import ImportEquiposPage from "./pages/import-equipos/ImportEquiposPage";
import ReportesPage from "./pages/admin/ReportesPage";
// Licencias (cargar lazy opcionalmente en el futuro)
import LicensesVendorsList from "./pages/licenses/vendors/LicensesVendorsList";
import LicensesVendorsForm from "./pages/licenses/vendors/LicensesVendorsForm";
import LicensesProductsList from "./pages/licenses/products/LicensesProductsList";
import LicensesProductsForm from "./pages/licenses/products/LicensesProductsForm";
import LicensesPlansList from "./pages/licenses/plans/LicensesPlansList";
import LicensesPlansForm from "./pages/licenses/plans/LicensesPlansForm";
import LicensesList from "./pages/licenses/LicensesList";
import LicensesForm from "./pages/licenses/LicensesForm";
import LicensesAssignmentsList from "./pages/licenses/assignments/LicensesAssignmentsList";
import LicensesAssignForm from "./pages/licenses/assignments/LicensesAssignForm";
import MyLicensesList from "./pages/licenses/MyLicensesList";
import MyLicenseDetail from "./pages/licenses/MyLicenseDetail";
// Tickets
import TicketsList from "./pages/tickets/TicketsList";
import TicketDetail from "./pages/tickets/TicketDetail";
import TicketsReports from "./pages/tickets/TicketsReports";

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
            <Route path="/health" element={<div>OK</div>} />

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
              <Route path="/import" element={<RequireAuth><RequireAdmin><ImportarPage /></RequireAdmin></RequireAuth>} />
              <Route path="/import-usuarios" element={<RequireAuth><RequireAdmin><ImportUsuariosPage /></RequireAdmin></RequireAuth>} />
              <Route path="/import-equipos" element={<RequireAuth><RequireAdmin><ImportEquiposPage /></RequireAdmin></RequireAuth>} />
              <Route path="/reportes" element={<RequireAuth><RequireAdmin><ReportesPage /></RequireAdmin></RequireAuth>} />
              
              {/* ADMIN - Tickets */}
              <Route path="/tickets" element={<RequireAuth><RequireAdmin><TicketsList /></RequireAdmin></RequireAuth>} />
              <Route path="/tickets/:id" element={<RequireAuth><RequireAdmin><TicketDetail /></RequireAdmin></RequireAuth>} />
              <Route path="/tickets/reportes" element={<RequireAuth><RequireAdmin><TicketsReports /></RequireAdmin></RequireAuth>} />

              {/* ADMIN - Licencias (condicional por feature flag) */}
              {import.meta.env.VITE_FEATURE_LICENSES === 'true' && (
                <>
                  <Route path="/licenses" element={<RequireAuth><RequireAdmin><LicensesList /></RequireAdmin></RequireAuth>} />
                  <Route path="/licenses/nuevo" element={<RequireAuth><RequireAdmin><LicensesForm /></RequireAdmin></RequireAuth>} />
                  <Route path="/licenses/:id/editar" element={<RequireAuth><RequireAdmin><LicensesForm /></RequireAdmin></RequireAuth>} />

                  <Route path="/licenses/vendors" element={<RequireAuth><RequireAdmin><LicensesVendorsList /></RequireAdmin></RequireAuth>} />
                  <Route path="/licenses/vendors/nuevo" element={<RequireAuth><RequireAdmin><LicensesVendorsForm /></RequireAdmin></RequireAuth>} />
                  <Route path="/licenses/vendors/:id/editar" element={<RequireAuth><RequireAdmin><LicensesVendorsForm /></RequireAdmin></RequireAuth>} />

                  <Route path="/licenses/products" element={<RequireAuth><RequireAdmin><LicensesProductsList /></RequireAdmin></RequireAuth>} />
                  <Route path="/licenses/products/nuevo" element={<RequireAuth><RequireAdmin><LicensesProductsForm /></RequireAdmin></RequireAuth>} />
                  <Route path="/licenses/products/:id/editar" element={<RequireAuth><RequireAdmin><LicensesProductsForm /></RequireAdmin></RequireAuth>} />

                  <Route path="/licenses/plans" element={<RequireAuth><RequireAdmin><LicensesPlansList /></RequireAdmin></RequireAuth>} />
                  <Route path="/licenses/plans/nuevo" element={<RequireAuth><RequireAdmin><LicensesPlansForm /></RequireAdmin></RequireAuth>} />
                  <Route path="/licenses/plans/:id/editar" element={<RequireAuth><RequireAdmin><LicensesPlansForm /></RequireAdmin></RequireAuth>} />

                  <Route path="/licenses/assignments" element={<RequireAuth><RequireAdmin><LicensesAssignmentsList /></RequireAdmin></RequireAuth>} />
                  <Route path="/licenses/assignments/asignar" element={<RequireAuth><RequireAdmin><LicensesAssignForm /></RequireAdmin></RequireAuth>} />
                </>
              )}

              {/* RESPONSABLE */}
              <Route path="/mis-equipos" element={<RequireAuth><RequireResponsable><MisEquiposList /></RequireResponsable></RequireAuth>} />
              <Route path="/mis-solicitudes" element={<RequireAuth><RequireResponsable><MisSolicitudesList /></RequireResponsable></RequireAuth>} />
              <Route path="/mis-solicitudes/nueva" element={<RequireAuth><RequireResponsable><MisSolicitudesForm /></RequireResponsable></RequireAuth>} />
              <Route path="/mis-solicitudes/:id" element={<RequireAuth><RequireResponsable><MisSolicitudDetalle /></RequireResponsable></RequireAuth>} />

              {/* RESPONSABLE - Mis Licencias (condicional por feature flag) */}
              {import.meta.env.VITE_FEATURE_LICENSES === 'true' && (
                <>
                  <Route path="/mis-licencias" element={<RequireAuth><RequireResponsable><MyLicensesList /></RequireResponsable></RequireAuth>} />
                  <Route path="/mis-licencias/:id" element={<RequireAuth><RequireResponsable><MyLicenseDetail /></RequireResponsable></RequireAuth>} />
                </>
              )}

              {/* 404 dentro del layout para rutas protegidas no encontradas */}
              <Route path="*" element={<div className="p-6">404</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}