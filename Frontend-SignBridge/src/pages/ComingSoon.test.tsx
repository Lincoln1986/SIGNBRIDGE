import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../api/client', () => ({
  authApi: { me: vi.fn().mockResolvedValue({ data: { id_user: '1', full_name: 'Ana', email: 'a@a.co', role: 'Cliente', phone: '300' } }) },
  notificationsApi: { list: vi.fn(), unreadCount: vi.fn().mockResolvedValue({ data: { unread: 0 } }), markRead: vi.fn(), markAllRead: vi.fn(), remove: vi.fn() },
  default: { get: vi.fn(), post: vi.fn() },
}));

import { AuthProvider } from '../context/AuthContext';
import ComingSoon from './ComingSoon';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

const renderPage = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/voice-to-sign" element={<ComingSoon />} />
          <Route path="/sign-to-text" element={<ComingSoon />} />
          <Route path="/algo-mas" element={<ComingSoon />} />
          <Route path="/home" element={<LocationProbe />} />
          <Route path="/admin" element={<LocationProbe />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );

describe('ComingSoon', () => {
  it('muestra la ficha de voz a señas', () => {
    renderPage('/voice-to-sign');
    expect(screen.getByRole('heading', { name: 'Traducir voz a señas' })).toBeInTheDocument();
    expect(screen.getByText('En desarrollo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Volver a Inicio' })).toBeInTheDocument();
  });

  it('muestra la ficha de señas a texto', () => {
    renderPage('/sign-to-text');
    expect(screen.getByRole('heading', { name: 'Señas a texto' })).toBeInTheDocument();
  });

  it('una ruta sin ficha usa el texto por defecto', () => {
    renderPage('/algo-mas');
    expect(screen.getByRole('heading', { name: 'Función' })).toBeInTheDocument();
    expect(screen.getByText('Esta función está en desarrollo.')).toBeInTheDocument();
  });

  it('el botón de volver navega a inicio', async () => {
    renderPage('/voice-to-sign');
    await userEvent.click(screen.getByRole('button', { name: 'Volver a Inicio' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });
});
