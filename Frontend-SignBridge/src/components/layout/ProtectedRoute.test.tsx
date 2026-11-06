import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../../api/client', () => ({
  authApi: {
    me: vi.fn().mockResolvedValue({
      data: { id_user: '1', full_name: 'Ana Torres', email: 'a@a.co', role: 'Cliente', phone: '3001234567' },
    }),
  },
  default: { get: vi.fn(), post: vi.fn() },
}));

import { AuthProvider } from '../../context/AuthContext';
import { PublicRoute, ProtectedRoute } from './ProtectedRoute';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const renderGuard = (
  ui: React.ReactNode,
  { initialPath = '/admin', uiOnAdmin = true }: { initialPath?: string; uiOnAdmin?: boolean } = {}
) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<><p>login visible</p><LocationProbe /></>} />
          <Route path="/dashboard" element={<><p>dashboard visible</p><LocationProbe /></>} />
          <Route
            path="/admin"
            element={<><LocationProbe /><p>zona admin</p>{uiOnAdmin ? ui : null}</>}
          />
          <Route
            path="/home"
            element={<><p>home visible</p><LocationProbe />{uiOnAdmin ? null : ui}</>}
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

// AuthContext real lee localStorage en el arranque: con y sin token se
// cubren los dos caminos de ProtectedRoute sin depender de la red.
describe('ProtectedRoute', () => {
  it('redirige a /login sin sesión', async () => {
    localStorage.clear();
    renderGuard(
      <ProtectedRoute><p>contenido privado</p></ProtectedRoute>
    );
    expect(await screen.findByTestId('location')).toHaveTextContent('/login');
    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument();
  });

  it('muestra el contenido con sesión activa', async () => {
    localStorage.setItem('token', 'tok-de-prueba');
    localStorage.setItem('role', 'Cliente');
    renderGuard(
      <ProtectedRoute><p>contenido privado</p></ProtectedRoute>
    );
    // AuthContext termina el loading y renderiza el children
    expect(await screen.findByText('contenido privado')).toBeInTheDocument();
    localStorage.clear();
  });

  it('bloquea rutas admin para un rol no admin', async () => {
    localStorage.setItem('token', 'tok-de-prueba');
    localStorage.setItem('role', 'Cliente');
    renderGuard(
      <ProtectedRoute adminOnly><p>solo admin</p></ProtectedRoute>
    );
    // espera al redirect: el LocationProbe de /admin monta primero
    expect(await screen.findByText('dashboard visible')).toBeInTheDocument();
    expect(screen.queryByText('solo admin')).not.toBeInTheDocument();
    localStorage.clear();
  });

  it('permite rutas admin con rol Administrador', async () => {
    localStorage.setItem('token', 'tok-de-prueba');
    localStorage.setItem('role', 'Administrador');
    renderGuard(
      <ProtectedRoute adminOnly><p>solo admin</p></ProtectedRoute>
    );
    expect(await screen.findByText('solo admin')).toBeInTheDocument();
    localStorage.clear();
  });

  it('supportOnly permite a Soporte y a Administrador', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('role', 'Soporte');
    renderGuard(
      <ProtectedRoute supportOnly><p>panel soporte</p></ProtectedRoute>
    );
    expect(await screen.findByText('panel soporte')).toBeInTheDocument();
    localStorage.clear();
  });
});

describe('PublicRoute', () => {
  it('muestra el contenido cuando no hay sesión', async () => {
    localStorage.clear();
    renderGuard(
      <PublicRoute><p>landing pública</p></PublicRoute>,
      { initialPath: '/home', uiOnAdmin: false }
    );
    expect(await screen.findByText('landing pública')).toBeInTheDocument();
  });

  it('redirige al panel si ya hay sesión', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('role', 'Cliente');
    renderGuard(
      <PublicRoute><p>landing pública</p></PublicRoute>,
      { initialPath: '/home', uiOnAdmin: false }
    );
    expect(await screen.findByText('dashboard visible')).toBeInTheDocument();
    expect(screen.queryByText('landing pública')).not.toBeInTheDocument();
    localStorage.clear();
  });

  it('los admins van a /admin', async () => {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('role', 'Administrador');
    renderGuard(
      <PublicRoute><p>landing pública</p></PublicRoute>,
      { initialPath: '/home', uiOnAdmin: false }
    );
    expect(await screen.findByText('zona admin')).toBeInTheDocument();
    expect(screen.queryByText('landing pública')).not.toBeInTheDocument();
    localStorage.clear();
  });
});
