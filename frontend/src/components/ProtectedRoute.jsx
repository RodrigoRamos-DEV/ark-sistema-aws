import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const token = localStorage.getItem('token');

  // Se não há token, redireciona para a página de login.
  // Senão, mostra a página solicitada (que é representada por <Outlet />).
  return token ? <Outlet /> : <Navigate to="/" />;
};

export default ProtectedRoute;