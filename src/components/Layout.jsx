import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiBox, FiLayers, FiUsers, FiFileText, FiBarChart2, FiLogOut, FiMenu, FiBell } from 'react-icons/fi';
import MarnystockLogo from '../assets/marnystock-logo.png'; 

const Layout = ({ children }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await signOut(auth); navigate('/login'); } 
    catch (error) { console.error('Error al cerrar sesión', error); }
  };

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-200 font-medium text-sm mb-1 ${
      isActive 
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* 1. SIDEBAR (Solo Navegación - Más limpio) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 z-20 shadow-xl">
        {/* Título pequeño o Icono de App (Opcional, decorativo) */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-900">
           <span className="text-lg font-black tracking-tighter text-blue-500">MARNYSTOCK</span>
           <span className="ml-2 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">v2.0</span>
        </div>

        {/* Menú */}
        <nav className="flex-grow px-4 py-6 overflow-y-auto custom-scrollbar">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">Gestión</div>
            <NavLink to="/" className={navLinkClasses}><FiHome size={18}/> Dashboard</NavLink>
            <NavLink to="/facturas" className={navLinkClasses}><FiFileText size={18}/> Facturación</NavLink>
            <NavLink to="/inventario" className={navLinkClasses}><FiLayers size={18}/> Inventario</NavLink>
            
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2 mt-6">Administración</div>
            <NavLink to="/catalogo" className={navLinkClasses}><FiBox size={18}/> Catálogo</NavLink>
            <NavLink to="/clientes" className={navLinkClasses}><FiUsers size={18}/> Clientes</NavLink>
            <NavLink to="/reportes" className={navLinkClasses}><FiBarChart2 size={18}/> Reportes</NavLink>
        </nav>

        {/* Footer Sidebar (Versión App) */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
            <div className="text-xs text-slate-500 text-center">
                &copy; 2026 Marny's Honduras
            </div>
        </div>
      </aside>

      {/* 2. AREA PRINCIPAL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* HEADER SUPERIOR (Aquí va el Logo y el Usuario) */}
        <header className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-6 md:px-8 shadow-sm z-10 flex-shrink-0">
            
            {/* IZQUIERDA: Logo de la Empresa (Se ve perfecto en fondo blanco) */}
            <div className="flex items-center gap-4">
                 <img 
                    src={MarnystockLogo} 
                    alt="MarnyStock Logo" 
                    className="h-40 w-auto object-contain hover:opacity-80 transition-opacity cursor-pointer"
                    onClick={() => navigate('/')}
                 />
                 <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                 <h2 className="text-slate-500 text-sm font-medium hidden md:block">Panel Administrativo</h2>
            </div>

            {/* DERECHA: Perfil y Acciones */}
            <div className="flex items-center gap-4 md:gap-6">
                {/* Botón de Notificaciones (Visual) */}
                <button className="relative p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-full hover:bg-slate-50">
                    <FiBell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                </button>

                {/* Separador */}
                <div className="h-8 w-px bg-slate-100"></div>

                {/* Dropdown Usuario */}
                <div className="flex items-center gap-3 pl-2">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-slate-700 leading-none">Admin User</p>
                        <p className="text-xs text-slate-400 mt-1">{currentUser?.email}</p>
                    </div>
                    
                    <div className="relative group">
                        <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white cursor-pointer">
                            {currentUser?.email?.substring(0,2).toUpperCase()}
                        </button>
                        
                        {/* Menú Flotante al hacer Hover (Simple) */}
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                             <div className="px-4 py-2 border-b border-slate-50 md:hidden">
                                <p className="text-sm font-bold text-slate-700">{currentUser?.email}</p>
                             </div>
                             <button 
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 font-medium flex items-center gap-2"
                             >
                                <FiLogOut /> Cerrar Sesión
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>

        {/* CONTENIDO DE LA PÁGINA (Scrollable) */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6 scroll-smooth">
            {children}
        </main>

      </div>
    </div>
  );
};

export default Layout;