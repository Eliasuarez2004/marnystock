// src/pages/Login.jsx (actualizado)
import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import AnimatedPage from '../components/AnimatedPage';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      navigate('/'); // Redirigir al dashboard en caso de éxito
    } catch (err) {
      setError('Error al iniciar sesión. Verifica tus credenciales.');
      console.error(err);
    }

    setLoading(false);
  };
  
  // Si el usuario ya está logueado, redirigirlo al dashboard
  if (currentUser) {
    return <Navigate to="/" />;
  }

  return (
    <AnimatedPage>
    <div className="flex items-center justify-center min-h-screen bg-accent">
      <div className="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-center text-secondary mb-6">
          MarnyStock
        </h1>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">
              Correo Electrónico
            </label>
            <input
              type="email"
              id="email"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-red-700 transition-colors disabled:bg-red-300"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
    </AnimatedPage>
  );
};

export default Login;