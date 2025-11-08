// src/pages/Dashboard.jsx (actualizado)
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase/config';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-secondary">Dashboard Principal</h1>
        <div className='flex items-center'>
          <p className="text-gray-600 mr-4">Hola, {currentUser?.email}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 font-semibold text-white bg-secondary rounded-md hover:bg-gray-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
      <p className="mt-2 text-gray-600">¡Bienvenido a MarnyStock!</p>
      {/* El contenido del dashboard irá aquí */}
    </div>
  );
};

export default Dashboard;