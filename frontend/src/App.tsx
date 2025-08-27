import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppSidebar from './layout/AppSidebar';
import EquiposList from './pages/equipos/EquiposList';
import EquiposForm from './pages/equipos/EquiposForm';

export default function App() {
  return (
    <div className="min-h-screen flex">
      <AppSidebar />
      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/equipos" replace />} />
          <Route path="/equipos" element={<EquiposList />} />
          <Route path="/equipos/nuevo" element={<EquiposForm />} />
          <Route path="/equipos/:id/editar" element={<EquiposForm />} />
          <Route path="*" element={<div>404</div>} />
        </Routes>
      </main>
    </div>
  );
}


