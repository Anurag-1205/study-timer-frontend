import React, { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try {
      const token = localStorage.getItem('sf_token');
      const username = localStorage.getItem('sf_username');
      const id = localStorage.getItem('sf_id');
      if (token && username && id) return { token, username, id };
    } catch {}
    return null;
  });

  const login = useCallback((data) => {
    localStorage.setItem('sf_token', data.token);
    localStorage.setItem('sf_username', data.username);
    localStorage.setItem('sf_id', data.id);
    setAuth({ token: data.token, username: data.username, id: data.id });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_username');
    localStorage.removeItem('sf_id');
    setAuth(null);
  }, []);

  return <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
