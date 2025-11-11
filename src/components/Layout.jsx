// src/components/Layout.jsx
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
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
    <div className="flex h-screen bg-accent">
      {/* Sidebar */}
      <aside className="w-64 bg-secondary text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-center">MarnyStock</h1>
        </div>
        <nav className="flex-grow p-4">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-primary' : ''}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink 
            to="/productos" 
            className={({ isActive }) => 
              `block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-primary' : ''}`
            }
          >
            Productos
          </NavLink>
          <NavLink 
            to="/clientes" 
            className={({ isActive }) => 
              `block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-primary' : ''}`
            }
          >
            Clientes
          </NavLink>
          <NavLink 
            to="/facturas" 
            className={({ isActive }) => 
              `block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-primary' : ''}`
            }
          >
            Facturas
          </NavLink>
          <NavLink 
            to="/reportes" 
            className={({ isActive }) => 
              `block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-700 ${isActive ? 'bg-primary' : ''}`
            }
          >
            Reportes
          </NavLink>
        </nav>
        <div className="p-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 truncate">Hola, {currentUser?.email}</p>
             <button
                onClick={handleLogout}
                className="w-full mt-2 text-left py-2.5 px-4 rounded transition duration-200 bg-red-600 hover:bg-red-700"
            >
                Cerrar Sesión
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;