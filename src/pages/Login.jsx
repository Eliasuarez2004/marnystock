// src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import MarnystockLogo from '../assets/marnystock-logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      setError('Credenciales incorrectas o el usuario no existe.');
      setLoading(false);
    }
  };
  
  if (currentUser) { return <Navigate to="/" />; }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  const formVariants = {
    shake: { x: [-8, 8, -8, 8, 0], transition: { duration: 0.4 } }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-light-bg p-4">
      <div className="gradient-border">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          // --- LA CORRECCIÓN CLAVE ESTÁ AQUÍ ---
          // Quitamos bg-light-card. El contenedor ahora es transparente.
          className="gradient-border-inner grid grid-cols-1 lg:grid-cols-2 w-full max-w-4xl min-h-[600px] shadow-2xl overflow-hidden"
        >
          {/* === PANEL IZQUIERDO: BRANDING (Ahora con su propio fondo) === */}
          <div className="relative hidden lg:flex w-full items-center justify-center p-12 bg-light-card"> {/* <-- Se añade el fondo aquí */}
            <motion.div 
              className="relative z-10 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.5, ease: "easeOut"}}
            >
              <img src={MarnystockLogo} alt="MarnyStock Logo" className="w-64 mx-auto"/>
              <h2 className="text-3xl font-bold text-text-dark mt-6">Sistema de Facturación</h2>
              <p className="text-gray-500 mt-2 max-w-xs mx-auto">Gestión de inventario y ventas para Marny's de Honduras.</p>
            </motion.div>
          </div>
          
          {/* === PANEL DERECHO: FORMULARIO (Mantiene su fondo oscuro) === */}
          <div className="relative p-8 sm:p-12 flex flex-col justify-center bg-secondary overflow-hidden">
            <div 
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: `
                  radial-gradient(
                    circle 800px at ${mousePosition.x}px ${mousePosition.y}px,
                    rgba(37, 99, 235, 0.15),
                    transparent 80%
                  )
                `,
              }}
            />
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.1, delayChildren: 0.5 } } }}
                className="w-full relative z-10"
            >
                <motion.h1 variants={itemVariants} className="text-3xl font-bold text-white mb-2">Bienvenido</motion.h1>
                <motion.p variants={itemVariants} className="text-text-light mb-8">Ingresa tus credenciales para acceder.</motion.p>
                
                <motion.form onSubmit={handleLogin} variants={formVariants} animate={error ? "shake" : ""} className="space-y-6">
                    <motion.div variants={itemVariants}>
                        <label htmlFor="email" className="block text-sm font-bold text-gray-300 mb-2">Correo Electrónico</label>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 transition-colors group-focus-within:text-accent"><FiMail /></span>
                            <input type="email" id="email" className="block w-full pl-10 pr-3 py-2 text-white bg-white/5 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 group-focus-within:bg-white/10" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@correo.com"/>
                        </div>
                    </motion.div>
                    <motion.div variants={itemVariants}>
                        <label htmlFor="password" className="block text-sm font-bold text-gray-300 mb-2">Contraseña</label>
                        <div className="relative group">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 transition-colors group-focus-within:text-accent"><FiLock /></span>
                            <input type={showPassword ? 'text' : 'password'} id="password" className="block w-full pl-10 pr-10 py-2 text-white bg-white/5 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-300 group-focus-within:bg-white/10" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"/>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-400 hover:text-gray-200" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <FiEyeOff /> : <FiEye />}</span>
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {error && <motion.p initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="text-red-400 text-sm text-center -my-2">{error}</motion.p>}
                    </AnimatePresence>
                    
                    <motion.div variants={itemVariants}>
                        <motion.button whileHover={{ scale: 1.02, y: -2, boxShadow: "0 8px 15px rgba(37, 99, 235, 0.2)" }} whileTap={{ scale: 0.98, y: 0 }} type="submit" className="w-full bg-primary text-white py-3 rounded-lg font-semibold text-lg hover:bg-primary-dark transition-colors shadow-lg shadow-blue-500/20 disabled:bg-blue-300" disabled={loading}>
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </motion.button>
                    </motion.div>
                </motion.form>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;