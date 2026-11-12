import { createContext, useContext } from 'react';
import type { UserProfile, TokenResponse } from '../api/client';

/**
 * Contexto de autenticación (sin JSX).
 *
 * Vive en un `.ts` aparte para que `AuthContext.tsx` solo exporte el
 * componente `AuthProvider`: `react-refresh/only-export-components` exige que
 * un archivo con componentes no exporte hooks ni utilidades.
 */
export interface AuthState {
  token: string | null;
  user: UserProfile | null;
  role: string | null;
  loading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (data: TokenResponse) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isSupport: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
