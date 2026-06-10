import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/client';
import type { UserProfile, TokenResponse } from '../api/client';

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  role: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (data: TokenResponse) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: localStorage.getItem('token'),
    user: null,
    role: localStorage.getItem('role'),
    loading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setState(s => ({ ...s, loading: false })); return; }
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
    <AuthContext.Provider value={{ ...state, login, logout, isAdmin: state.role === 'Administrador' || state.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
