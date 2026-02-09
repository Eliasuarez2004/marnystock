import React from 'react';
import { Link } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';

const NotFound = () => {
  return (
    <AnimatedPage>
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-center p-4">
      <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full">
          <h1 className="text-8xl font-black text-slate-200 mb-4">404</h1>
          <h2 className="text-2xl font-bold text-slate-800">Página no encontrada</h2>
          <p className="text-slate-500 mt-2 mb-8">
            Parece que te has perdido en el inventario. La página que buscas no existe.
          </p>
          <Link to="/" className="inline-block px-8 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-transform active:scale-95 shadow-lg shadow-blue-600/30">
            Volver al Panel
          </Link>
      </div>
    </div>
    </AnimatedPage>
  );
};

export default NotFound;