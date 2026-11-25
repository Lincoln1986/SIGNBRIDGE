// Autor: @Sebas-p-s · S2: componentes (Home según el rol)
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { authApi, dashboardApi } from '../api/client';
import { AuthProvider } from '../context/AuthContext';
import Home from './Home';

function Ubicacion() {
  return <p data-testid="ubicacion">{useLocation().pathname}</p>;
}

function pantalla() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/home']}>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="*" element={<Ubicacion />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

function sesion(rol: string, nombre = 'Ana María Paz') {
  localStorage.setItem('token', 'tok');
  localStorage.setItem('role', rol);
  vi.spyOn(authApi, 'me').mockResolvedValue({ data: { full_name: nombre } } as never);
  vi.spyOn(dashboardApi, 'user').mockResolvedValue({
    data: { full_name: nombre, email: 'ana@example.com', translations_made: 12, favorite_words: 3, average_rating: 4.25, support_requests: 1 },
  } as never);
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('Home', () => {
  it('should greet the person by first name', async () => {
    sesion('Cliente');
    pantalla();

    expect(await screen.findByRole('heading', { level: 1, name: /Ana, bienvenido a SignBridge/ })).toBeInTheDocument();
  });

  it('should show the activity summary with the rating rounded to one decimal', async () => {
    sesion('Cliente');
    pantalla();

    expect(await screen.findByText('4.3 / 5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('should still render when the dashboard API fails', async () => {
    sesion('Cliente');
    vi.spyOn(dashboardApi, 'user').mockRejectedValue(new Error('500'));
    pantalla();

    expect(await screen.findByRole('heading', { level: 1, name: /Ana, bienvenido/ })).toBeInTheDocument();
    expect(screen.queryByText(/\/ 5$/)).not.toBeInTheDocument();
  });

  it.each([
    ['Cliente', '/dashboard'],
    ['Soporte', '/support'],
    ['Administrador', '/admin'],
  ])('"Mi Panel" takes a %s to %s', async (rol, destino) => {
    sesion(rol);
    pantalla();

    await userEvent.click(await screen.findByRole('button', { name: /Mi Panel/ }));

    expect(screen.getByTestId('ubicacion')).toHaveTextContent(destino);
  });
});
