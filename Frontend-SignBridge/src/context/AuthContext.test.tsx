import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/client';
import { AuthProvider } from './AuthContext';
import { useAuth } from './auth-context';

function Sonda() {
  const { user, role, loading, login, logout } = useAuth();
  return (
    <div>
      <p data-testid="estado">{loading ? 'cargando' : user ? `${user.full_name} · ${role}` : 'sin sesión'}</p>
      <button onClick={() => login({ access_token: 'jwt', token_type: 'bearer', role: 'Cliente', user_id: 'u1', full_name: 'Ana' })}>entrar</button>
      <button onClick={logout}>salir</button>
    </div>
  );
}

const estado = () => screen.getByTestId('estado');
const perfil = (role = 'Cliente') => ({ data: { id_user: 'u1', full_name: 'Ana', email: 'a@a.co', role } }) as never;

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('AuthProvider · sesión en cookie HttpOnly', () => {
  it('should not ask the backend when there is no session mark', () => {
    const me = vi.spyOn(authApi, 'me');

    render(<AuthProvider><Sonda /></AuthProvider>);

    expect(estado()).toHaveTextContent('sin sesión');
    expect(me).not.toHaveBeenCalled();
  });

  it('should restore the session from the cookie and trust the role the backend sends', async () => {
    localStorage.setItem('sesion', '1');
    localStorage.setItem('role', 'Administrador');   // alguien lo cambió a mano
    vi.spyOn(authApi, 'me').mockResolvedValue(perfil('Cliente'));

    render(<AuthProvider><Sonda /></AuthProvider>);

    expect(estado()).toHaveTextContent('cargando');
    expect(await screen.findByText('Ana · Cliente')).toBeInTheDocument();
  });

  it('should forget the session when the cookie is no longer valid', async () => {
    localStorage.setItem('sesion', '1');
    localStorage.setItem('role', 'Cliente');
    vi.spyOn(authApi, 'me').mockRejectedValue(new Error('401'));

    render(<AuthProvider><Sonda /></AuthProvider>);

    expect(await screen.findByText('sin sesión')).toBeInTheDocument();
    expect(localStorage.getItem('sesion')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
  });

  it('should delete a token left by the old version', () => {
    localStorage.setItem('token', 'jwt-viejo');

    render(<AuthProvider><Sonda /></AuthProvider>);

    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should never store the token when logging in', async () => {
    vi.spyOn(authApi, 'me').mockResolvedValue(perfil());
    render(<AuthProvider><Sonda /></AuthProvider>);

    await act(async () => { screen.getByText('entrar').click(); });

    expect(await screen.findByText('Ana · Cliente')).toBeInTheDocument();
    expect(localStorage.getItem('sesion')).toBe('1');
    expect(Object.values({ ...localStorage })).not.toContain('jwt');
  });

  it('should ask the backend to delete the cookie on logout, even if that call fails', async () => {
    localStorage.setItem('sesion', '1');
    vi.spyOn(authApi, 'me').mockResolvedValue(perfil());
    const salir = vi.spyOn(authApi, 'logout').mockRejectedValue(new Error('red caída'));
    render(<AuthProvider><Sonda /></AuthProvider>);
    await screen.findByText('Ana · Cliente');

    await act(async () => { screen.getByText('salir').click(); });

    expect(salir).toHaveBeenCalled();
    await waitFor(() => expect(estado()).toHaveTextContent('sin sesión'));
    expect(localStorage.getItem('sesion')).toBeNull();
  });
});
