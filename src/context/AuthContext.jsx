// src/context/AuthContext.jsx
import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { AuthContext } from './useAuth';

// El proveedor del contexto
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