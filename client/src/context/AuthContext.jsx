import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, refreshSession, setAccessToken, setAuthFailureHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); 
  const queryClient = useQueryClient();


  useEffect(() => {
    setAuthFailureHandler(() => {
      setUser(null);
      setStatus('anonymous');
      queryClient.clear();
    });

    refreshSession()
      .then(({ user }) => { setUser(user); setStatus('authenticated'); })
      .catch(() => setStatus('anonymous')); 
  }, [queryClient]);

  const value = useMemo(() => {
    const startSession = ({ accessToken, user }) => {
      setAccessToken(accessToken);
      setUser(user);
      setStatus('authenticated');
      return user;
    };

    return {
      user,
      status,
      isAuthenticated: status === 'authenticated',
      
      can: (permission) => user?.permissions.includes(permission) ?? false,

      login: async (email, password) =>
        startSession((await api.post('/auth/login', { email, password })).data.data),
      registerCustomer: async (payload) =>
        startSession((await api.post('/auth/register', payload)).data.data),
      registerBusiness: async (payload) =>
        startSession((await api.post('/auth/register-tenant', payload)).data.data),

      logout: async () => {
        await api.post('/auth/logout').catch(() => {}); // even if this fails, log out locally
        setAccessToken(null);
        setUser(null);
        setStatus('anonymous');
        queryClient.clear(); 
      },
    };
  }, [user, status, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}