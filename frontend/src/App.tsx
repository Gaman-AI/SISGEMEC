import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ThemeProvider } from "./lib/theme-provider";
import AppLayout from "./components/layout/AppLayout";

// Páginas existentes (relativas)
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
import SolicitudesList from "./pages/solicitudes/SolicitudesList";
import SolicitudDetalle from "./pages/solicitudes/SolicitudDetalle";

// NUEVO: Dashboard
import DashboardPage from "./pages/dashboard/DashboardPage";

export default function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <BrowserRouter>
        <AppLayout>
          <Routes>
            {/* Inicio → Dashboard (cámbialo a /equipos si quieres mantenerlo) */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Equipos */}
            <Route path="/equipos" element={<EquiposList />} />
            <Route path="/equipos/nuevo" element={<EquiposForm />} />
            <Route path="/equipos/:id/editar" element={<EquiposForm />} />

            {/* Usuarios */}
            <Route path="/usuarios" element={<UsersList />} />
            <Route path="/usuarios/nuevo" element={<UsersForm />} />
            <Route path="/usuarios/:id/editar" element={<UsersForm />} />

            {/* Tipos de Servicio */}
            <Route path="/tipos-servicio" element={<TiposServicioList />} />
            <Route path="/tipos-servicio/nuevo" element={<TiposServicioForm />} />
            <Route path="/tipos-servicio/:id/editar" element={<TiposServicioForm />} />

            {/* Servicios */}
            <Route path="/servicios" element={<ServiciosList />} />
            <Route path="/servicios/nuevo" element={<ServiciosForm />} />
            <Route path="/servicios/:id/editar" element={<ServiciosForm />} />

            {/* Responsable */}
            <Route path="/mis-equipos" element={<MisEquiposList />} />
            <Route path="/mis-solicitudes" element={<MisSolicitudesList />} />
            <Route path="/mis-solicitudes/nueva" element={<MisSolicitudesForm />} />
            <Route path="/mis-solicitudes/:id" element={<MisSolicitudDetalle />} />

            {/* Admin */}
            <Route path="/solicitudes" element={<SolicitudesList />} />
            <Route path="/solicitudes/:id" element={<SolicitudDetalle />} />

            {/* Salud y 404 */}
            <Route path="/health" element={<div>OK</div>} />
            <Route path="*" element={<div className="p-6">404</div>} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}
