import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { ThemeProvider } from "./lib/theme-provider";
import AppLayout from "./components/layout/AppLayout";

// Páginas existentes (relativas)
import EquiposList from "./pages/equipos/EquiposList";
import EquiposForm from "./pages/equipos/EquiposForm";
import UsersList from "./pages/usuarios/UsersList";
import UsersForm from "./pages/usuarios/UsersForm";

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

            {/* Salud y 404 */}
            <Route path="/health" element={<div>OK</div>} />
            <Route path="*" element={<div className="p-6">404</div>} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}
