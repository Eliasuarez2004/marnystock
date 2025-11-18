// src/pages/Login.jsx (VERSIÓN "SUPERNOVA" FINAL)
import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    const handleMouseMove = (e) => {
      document.documentElement.style.setProperty('--x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--y', `${e.clientY}px`);
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

  // --- Variantes de Animación ---
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };
  
  const formElementVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  const title = "MarnyStock";

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
      <div className="aurora-background" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 p-8 bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md border border-white/20"
      >
        <motion.h1
          className="text-5xl font-bold text-white text-center mb-8 tracking-wider"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {title.split("").map((char, index) => (
            <motion.span key={index} variants={letterVariants}>
              {char}
            </motion.span>
          ))}
        </motion.h1>

        <motion.form 
            onSubmit={handleLogin} 
            className="space-y-6"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.2, delayChildren: 1 } } }}
        >
          <motion.div variants={formElementVariants}>
            <label htmlFor="email" className="block text-sm font-bold text-gray-300 mb-2">Correo Electrónico</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 transition-colors duration-300 group-focus-within:text-white"><FiMail /></span>
              <input type="email" id="email"
                className="block w-full pl-10 pr-3 py-2 text-white bg-white/10 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/80 transition"
                value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@correo.com"
              />
            </div>
          </motion.div>
          <motion.div variants={formElementVariants}>
            <label htmlFor="password" className="block text-sm font-bold text-gray-300 mb-2">Contraseña</label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 transition-colors duration-300 group-focus-within:text-white"><FiLock /></span>
              <input type={showPassword ? 'text' : 'password'} id="password"
                className="block w-full pl-10 pr-10 py-2 text-white bg-white/10 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/80 transition"
                value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-gray-400 hover:text-gray-200" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </span>
            </div>
          </motion.div>

          <AnimatePresence>
            {error && <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-400 text-sm text-center -my-2">{error}</motion.p>}
          </AnimatePresence>
          
          <motion.button
            variants={formElementVariants}
            whileHover={{ scale: 1.02, y: -2, boxShadow: "0 10px 20px -5px rgba(204, 0, 51, 0.4)" }}
            whileTap={{ scale: 0.98, y: 0 }}
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold text-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30 disabled:bg-red-400 shimmer-button"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </motion.button>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default Login;