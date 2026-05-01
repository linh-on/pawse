import React, { createContext, useContext, useState } from 'react';

// Simple in-memory auth context (no persistence — sign-out happens on app restart).
// For real auth, replace this with Supabase auth or AsyncStorage persistence.

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
