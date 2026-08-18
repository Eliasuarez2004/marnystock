// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    // Si no hay usuario, redirigir a la página de login
    return <Navigate to="/login" />;
  }

  // Si hay un usuario, mostrar el componente hijo (la página protegida)
  return children;
};

export default ProtectedRoute;