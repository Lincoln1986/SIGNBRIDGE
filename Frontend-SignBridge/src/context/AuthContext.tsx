import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/client';
import { olvidarSesion } from '../api/sesion';
import type { TokenResponse } from '../api/client';
import { AuthContext } from './auth-context';
import type { AuthState } from './auth-context';

/**
 * Sesión del usuario.
 *
 * El token NO se guarda en el navegador: el backend lo pone en una cookie
 * HttpOnly al iniciar sesión (OWASP A02). En localStorage solo quedan dos
 * marcas que no sirven para entrar: "sesion" (para saber si vale la pena
 * preguntar /auth/me al abrir la página) y "role" (para pintar el menú
 * mientras llega la respuesta).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  // El estado inicial se deriva de localStorage en el propio initializer:
  // así no hace falta un effect que haga setState síncrono al montar.
  const [state, setState] = useState<AuthState>(() => {
    localStorage.removeItem('token');   // restos de la versión que guardaba el JWT
    const haySesion = localStorage.getItem('sesion') === '1';
    return {
      user: null,
      role: haySesion ? localStorage.getItem('role') : null,
      loading: haySesion,   // sin sesión no hay nada que cargar
    };
  });

  useEffect(() => {
    if (localStorage.getItem('sesion') !== '1') return;
    authApi.me()
      // El rol que vale es el que dice el backend; el de localStorage solo se
      // usa para pintar el menú mientras llega la respuesta.
      .then(r => setState(s => ({ user: r.data, role: r.data.role ?? s.role, loading: false })))
      .catch(() => { olvidarSesion(); setState({ user: null, role: null, loading: false }); });
  }, []);

  const login = async (data: TokenResponse) => {
    // data.access_token no se guarda: la cookie ya quedó puesta por el backend.
    localStorage.setItem('sesion', '1');
    localStorage.setItem('role', data.role);
    const profile = await authApi.me();
    setState({ user: profile.data, role: data.role, loading: false });
  };

  const logout = () => {
    olvidarSesion();
    authApi.logout().catch(() => {});   // si falla, la cookie vence sola
    setState({ user: null, role: null, loading: false });
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
