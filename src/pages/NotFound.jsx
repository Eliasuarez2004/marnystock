// src/pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-accent">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <h2 className="text-2xl font-semibold text-secondary mt-4">Página No Encontrada</h2>
      <p className="text-gray-600 mt-2">
        Lo sentimos, la página que buscas no existe.
      </p>
      <Link
        to="/"
        className="mt-6 px-4 py-2 font-semibold text-white bg-primary rounded-md hover:bg-red-700 transition-colors"
      >
        Volver al Inicio
      </Link>
    </div>
  );
};

export default NotFound;