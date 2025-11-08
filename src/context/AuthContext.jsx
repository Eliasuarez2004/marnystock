// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';

// 1. Crear el contexto
const AuthContext = createContext();

// 2. Crear un hook personalizado para usar el contexto
export const useAuth = () => {
  return useContext(AuthContext);
};

// 3. Crear el proveedor del contexto
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged es un listener de Firebase que se ejecuta
    // cada vez que el estado de autenticación cambia (login/logout).
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Limpiamos el listener cuando el componente se desmonta
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
  };

  // No renderizamos la app hasta que Firebase haya verificado el estado de auth.
  // Esto previene que se muestren páginas protegidas por un instante.
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};