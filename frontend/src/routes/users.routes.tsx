import React from 'react';
import { Route } from 'react-router-dom';
import UsersList from '../pages/usuarios/UsersList';
import UsersForm from '../pages/usuarios/UsersForm';

export const usersRoutes = (
  <>
    <Route path="/usuarios" element={<UsersList />} />
    <Route path="/usuarios/nuevo" element={<UsersForm />} />
    <Route path="/usuarios/:id/editar" element={<UsersForm />} />
  </>
);
