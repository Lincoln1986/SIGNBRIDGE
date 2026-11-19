import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../api/client', () => ({
  authApi: {
    me: vi.fn().mockResolvedValue({
      data: { id_user: '1', full_name: 'Ana Torres', email: 'a@a.co', role: 'Cliente', phone: '300' },
    }),
  },
  notificationsApi: {
    list: vi.fn().mockResolvedValue({ data: [] }),
    unreadCount: vi.fn().mockResolvedValue({ data: { unread: 0 } }),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    remove: vi.fn(),
  },
  default: { get: vi.fn(), post: vi.fn() },
}));

import { AuthProvider } from '../context/AuthContext';
import { Navbar } from './Navbar';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const renderNavbar = (role: string | null) => {
  localStorage.clear();
  if (role) {
    localStorage.setItem('token', 'tok');
    localStorage.setItem('role', role);
  }
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <AuthProvider>
        <Routes>
          <Route path="/home" element={<><Navbar /><LocationProbe /></>} />
          <Route path="/" element={<LocationProbe />} />
          <Route path="/vocabulary" element={<><Navbar /><LocationProbe /></>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('Navbar', () => {
  it('un cliente ve su panel y no el de admin', async () => {
    renderNavbar('Cliente');
    expect(await screen.findByText('Ana Torres')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mi Panel/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Panel Admin/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Estadísticas/ })).not.toBeInTheDocument();
  });

  it('un admin ve panel admin y estadísticas', async () => {
    renderNavbar('Administrador');
    expect(await screen.findByText('Ana Torres')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Panel Admin/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Estadísticas/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mi Panel/ })).not.toBeInTheDocument();
  });

  it('soporte ve su panel', async () => {
    renderNavbar('Soporte');
    expect(await screen.findByText('Ana Torres')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Panel de Soporte/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Panel Admin/ })).not.toBeInTheDocument();
  });

  it('navega al hacer clic en un enlace del menú', async () => {
    renderNavbar('Cliente');
    await userEvent.click(await screen.findByRole('button', { name: /Vocabulario/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/vocabulary');
  });

  it('el botón Salir cierra sesión y lleva al inicio', async () => {
    renderNavbar('Cliente');
    await userEvent.click(await screen.findByRole('button', { name: 'Salir' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('muestra el rol debajo del nombre', async () => {
    renderNavbar('Cliente');
    expect(await screen.findByText('Ana Torres')).toBeInTheDocument();
    expect(screen.getByText('Cliente')).toBeInTheDocument();
  });
});
