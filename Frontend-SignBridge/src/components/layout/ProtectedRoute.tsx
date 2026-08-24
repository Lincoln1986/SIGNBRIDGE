import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../UI';

/**
 * ProtectedRoute — guarda de ruta autenticada.
 * Redirige a /login si no hay sesión.
 * Redirige a /dashboard si la ruta es adminOnly y el usuario no es admin.
 */
export function ProtectedRoute({ children, adminOnly = false, supportOnly = false }: {
  children: ReactNode;
  adminOnly?: boolean;
  /** Permite el paso a Soporte y también a Admin (Admin puede ver todo). */
  supportOnly?: boolean;
}) {
  const { token, isAdmin, isSupport, loading } = useAuth();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={40} />
    </div>
  );

  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  if (supportOnly && !isSupport && !isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

/**
 * PublicRoute — guarda de ruta pública.
 * Redirige al dashboard si ya hay sesión activa.
 */
export function PublicRoute({ children }: { children: ReactNode }) {
  const { token, isAdmin, isSupport, loading } = useAuth();
  if (loading) return null;
  if (token) return <Navigate to={isAdmin ? '/admin' : isSupport ? '/support' : '/dashboard'} replace />;
  return <>{children}</>;
}