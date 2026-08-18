// src/context/useAuth.js
// The context object and its hook live apart from the provider component so
// that Vite's fast refresh only sees components in AuthContext.jsx.
import { createContext, useContext } from 'react';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);
