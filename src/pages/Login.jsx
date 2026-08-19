import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch {
      setError('Credenciales incorrectas o usuario no encontrado.');
      setLoading(false);
    }
  };
  
  if (currentUser) { return <Navigate to="/" />; }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden font-sans selection:bg-blue-500 selection:text-white">
      
      {/* --- FONDO ANIMADO --- */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s'}}></div>
      </div>

      {/* --- TARJETA PRINCIPAL (GLASSMORPHISM) --- */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 w-full max-w-md p-6"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] relative overflow-hidden">
            
            {/* Cabecera */}
            <div className="text-center mb-8">
                <motion.h1 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                  className="text-4xl font-bold text-white tracking-tight mb-2"
                >
                  MarnyStock
                </motion.h1>
                <p className="text-slate-400 text-sm font-medium">Sistema de Gestión Inteligente</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
                
                {/* Input Email */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Correo Electrónico</label>
                    <div className="relative group">
                        <FiMail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-400 transition-colors text-lg" />
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            placeholder="ejemplo@marnys.hn"
                            className="w-full bg-slate-800/50 border border-slate-700 text-white text-sm rounded-xl pl-12 pr-4 py-3.5 focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all placeholder-slate-500 shadow-inner"
                        />
                    </div>
                </div>

                {/* Input Password */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">Contraseña</label>
                    <div className="relative group">
                        <FiLock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-400 transition-colors text-lg" />
                        <input 
                            type={showPassword ? 'text' : 'password'} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            placeholder="••••••••"
                            className="w-full bg-slate-800/50 border border-slate-700 text-white text-sm rounded-xl pl-12 pr-12 py-3.5 focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all placeholder-slate-500 shadow-inner"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-3.5 text-slate-400 hover:text-white transition-colors"
                        >
                            {showPassword ? <FiEyeOff size={18}/> : <FiEye size={18}/>}
                        </button>
                    </div>
                </div>

                {/* Mensaje de Error */}
                <AnimatePresence>
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-200 text-sm text-center"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Botón Submit */}
                <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>Ingresar al Sistema <FiArrowRight /></>
                    )}
                </motion.button>
            </form>

            <div className="mt-8 text-center border-t border-white/5 pt-6">
                <p className="text-xs text-slate-500">© 2026 Marny's Honduras. Acceso seguro.</p>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;