import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/client';
import type { TokenResponse } from '../api/client';
import { AuthContext } from './auth-context';
import type { AuthState } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  // El estado inicial se deriva de localStorage en el propio initializer:
  // así no hace falta un effect que haga setState síncrono al montar.
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    return {
      token,
      user: null,
      role: localStorage.getItem('role'),
      loading: !!token,   // sin token no hay nada que cargar
    };
  });

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    authApi.me()
      .then(r => setState(s => ({ ...s, user: r.data, loading: false })))
      .catch(() => { localStorage.clear(); setState({ token: null, user: null, role: null, loading: false }); });
  }, []);

  const login = async (data: TokenResponse) => {
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('role', data.role);
    const profile = await authApi.me();
    setState({ token: data.access_token, user: profile.data, role: data.role, loading: false });
  };

  const logout = () => {
    localStorage.clear();
    setState({ token: null, user: null, role: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      isAdmin: state.role === 'Administrador' || state.role === 'admin',
      isSupport: state.role === 'Soporte' || state.role === 'soporte',
    }}>
      {children}
    </AuthContext.Provider>
  );
}
