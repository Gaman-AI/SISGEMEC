import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './layout/AppShell';

import EquiposList from './pages/equipos/EquiposList';
import EquiposForm from './pages/equipos/EquiposForm';

import UsersList from './pages/usuarios/UsersList';
import UsersForm from './pages/usuarios/UsersForm';

export default function App() {
  return (
    <AppShell>
      <Routes>
        {/* Ruta de prueba rápida */}
        <Route path="/health" element={<div>OK</div>} />

        {/* Inicio → Equipos */}
        <Route path="/" element={<Navigate to="/equipos" replace />} />

        {/* Equipos */}
        <Route path="/equipos" element={<EquiposList />} />
        <Route path="/equipos/nuevo" element={<EquiposForm />} />
        <Route path="/equipos/:id/editar" element={<EquiposForm />} />

        {/* Usuarios */}
        <Route path="/usuarios" element={<UsersList />} />
        <Route path="/usuarios/nuevo" element={<UsersForm />} />
        <Route path="/usuarios/:id/editar" element={<UsersForm />} />

        {/* 404 */}
        <Route path="*" element={<div className="p-6">404</div>} />
      </Routes>
    </AppShell>
  );
}


