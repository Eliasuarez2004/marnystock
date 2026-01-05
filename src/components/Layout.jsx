import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import MarnystockLogo from '../assets/marnystock-logo.png'; // Asegúrate de que el logo esté en src/assets

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

  // Función para definir las clases de los enlaces de navegación, para un código más limpio
  const navLinkClasses = ({ isActive }) =>
    `flex items-center py-2.5 px-4 rounded-md transition duration-200 text-text-light hover:bg-white/10 hover:text-text-light-hover ${
      isActive ? 'bg-primary text-white shadow-lg' : ''
    }`;

  return (
    <div className="flex h-screen bg-light-bg">
      {/* Sidebar con el nuevo diseño oscuro */}
      <aside className="w-64 bg-secondary text-white flex flex-col">
        <div className="p-4 flex justify-center items-center border-b border-white/10 h-20">
          <img src={MarnystockLogo} alt="MarnyStock Logo" className="w-32" />
        </div>
        <nav className="flex-grow p-4 space-y-2">
          <NavLink to="/" className={navLinkClasses}>Dashboard</NavLink>
          <NavLink to="/catalogo" className={navLinkClasses}>Catálogo</NavLink> {/* <-- NUEVO ENLACE */}
          <NavLink to="/inventario" className={navLinkClasses}>Inventario</NavLink> {/* <-- ENLACE RENOMBRADO */}
          <NavLink to="/clientes" className={navLinkClasses}>Clientes</NavLink>
          <NavLink to="/facturas" className={navLinkClasses}>Facturas</NavLink>
          <NavLink to="/reportes" className={navLinkClasses}>Reportes</NavLink>
        </nav>
        <div className="p-4 border-t border-white/10">
            <p className="text-sm text-gray-400 truncate mb-2">Hola, {currentUser?.email}</p>
             <button
                onClick={handleLogout}
                className="w-full text-center py-2 px-4 rounded-md transition duration-200 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
                Cerrar Sesión
            </button>
        </div>
      </aside>

      {/* Área de Contenido Principal con fondo claro */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;