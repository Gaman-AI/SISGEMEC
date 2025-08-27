import React from 'react';
import { RouteObject } from 'react-router-dom';
import EquiposList from '../pages/equipos/EquiposList';
import EquiposForm from '../pages/equipos/EquiposForm';

export const equiposRoutes: RouteObject[] = [
  { path: '/equipos', element: <EquiposList /> },
  { path: '/equipos/nuevo', element: <EquiposForm /> },
  { path: '/equipos/:id/editar', element: <EquiposForm /> },
];

export default equiposRoutes;
