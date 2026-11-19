import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/client', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn().mockResolvedValue({ data: { id_user: '1', full_name: 'Ana Torres', email: 'ana@example.com', role: 'Cliente', phone: '3001234567' } }),
    getCities: vi.fn().mockRejectedValue(new Error('sin red')),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
  default: { post: vi.fn(), get: vi.fn() },
}));

import { authApi } from '../api/client';
import { AuthProvider } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

const renderModal = (onClose = vi.fn(), initialTab: 'login' | 'register' | 'forgot' = 'login') =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <AuthModal initialTab={initialTab} onClose={onClose} />
      </AuthProvider>
    </MemoryRouter>
  );

/** Botón de envío del formulario activo (el nombre "Iniciar sesión"
 *  lo comparte con la pestaña, así que se desambigua por type=submit). */
const submitButton = () => {
  const btn = document.querySelector('button[type="submit"]');
  if (!btn) throw new Error('No hay botón de submit visible');
  return btn as HTMLButtonElement;
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('AuthModal', () => {
  it('renderiza el título del login', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeInTheDocument();
  });

  it('cierra con Escape', async () => {
    const onClose = vi.fn();
    renderModal(onClose);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cambia a la pestaña de registro', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Registrarse' }));
    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('muestra el detalle del backend cuando el login falla', async () => {
    (authApi.login as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { detail: 'Credenciales incorrectas' } },
    });
    renderModal();

    await userEvent.type(screen.getByPlaceholderText('tu@correo.com'), 'ana@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password1!');
    await userEvent.click(submitButton());

    expect(await screen.findByText('Credenciales incorrectas')).toBeInTheDocument();
  });

  it('muestra mensaje genérico si el error no trae detail string', async () => {
    (authApi.login as ReturnType<typeof vi.fn>).mockRejectedValue({});
    renderModal();

    await userEvent.type(screen.getByPlaceholderText('tu@correo.com'), 'ana@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password1!');
    await userEvent.click(submitButton());

    expect(await screen.findByText('Correo o contraseña incorrectos')).toBeInTheDocument();
  });

  it('login exitoso cierra el modal', async () => {
    (authApi.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { access_token: 'tok', token_type: 'bearer', user_id: '1', role: 'Cliente', full_name: 'Ana Torres' },
    });
    const onClose = vi.fn();
    renderModal(onClose);

    await userEvent.type(screen.getByPlaceholderText('tu@correo.com'), 'ana@example.com');
    await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password1!');
    await userEvent.click(submitButton());

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(localStorage.getItem('token')).toBe('tok');
  });

  it('el botón de registro está deshabilitado con contraseña débil', async () => {
    renderModal(vi.fn(), 'register');
    await userEvent.type(screen.getByPlaceholderText('Juan'), 'Ana');
    await userEvent.type(screen.getByPlaceholderText('Pérez'), 'Torres');
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
  });

  it('registra una cuenta válida con datos saneados', async () => {
    (authApi.register as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    const onClose = vi.fn();
    renderModal(onClose, 'register');

    await userEvent.type(screen.getByPlaceholderText('Juan'), 'ana maría');
    await userEvent.type(screen.getByPlaceholderText('Pérez'), 'torres ruiz');
    const phone = screen.getByPlaceholderText('3001234567');
    await userEvent.clear(phone);
    await userEvent.type(phone, '3001234567');
    const city = document.querySelector('select');
    await userEvent.selectOptions(city!, 'Bogotá');
    await userEvent.type(screen.getByPlaceholderText('Cra 10 # 20-30, Barrio Centro'), 'Cra 1 # 20-30');
    await userEvent.type(screen.getByPlaceholderText('tu@correo.com'), 'ana@example.com');
    await userEvent.type(screen.getByPlaceholderText('Mín. 8 caracteres'), 'Password1!');
    await userEvent.type(screen.getByPlaceholderText('Repite la contraseña'), 'Password1!');

    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => expect(authApi.register).toHaveBeenCalled());
    const payload = (authApi.register as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.first_name).toBe('Ana María');
    expect(payload.last_name).toBe('Torres Ruiz');
    expect(payload.phone).toBe('3001234567');
    expect(payload.email).toBe('ana@example.com');
    expect(await screen.findByText(/¡Cuenta creada!/)).toBeInTheDocument();
  });

  it('muestra error cuando las contraseñas no coinciden', async () => {
    // Forzar el submit aunque el botón esté deshabilitado no es válido;
    // con todo completo pero contraseñas distintas el botón queda deshabilitado,
    // así que verificamos el estado visual de no coincidencia.
    renderModal(vi.fn(), 'register');
    await userEvent.type(screen.getByPlaceholderText('Mín. 8 caracteres'), 'Password1!');
    await userEvent.type(screen.getByPlaceholderText('Repite la contraseña'), 'OtraClave1!');
    expect(screen.getByText('No coinciden')).toBeInTheDocument();
  });

  it('flujo forgot: confirma el envío sin revelar si el correo existe', async () => {
    (authApi.forgotPassword as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });
    renderModal(vi.fn(), 'forgot');

    await userEvent.type(screen.getByPlaceholderText('tu@correo.com'), 'ana@example.com');
    await userEvent.click(submitButton());

    expect(await screen.findByText('¡Enlace enviado!')).toBeInTheDocument();
    expect(authApi.forgotPassword).toHaveBeenCalledWith('ana@example.com');
  });

  it('forgot muestra error si la petición falla', async () => {
    (authApi.forgotPassword as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('red caída'));
    renderModal(vi.fn(), 'forgot');

    await userEvent.type(screen.getByPlaceholderText('tu@correo.com'), 'ana@example.com');
    await userEvent.click(submitButton());

    expect(await screen.findByText('No se pudo procesar la solicitud')).toBeInTheDocument();
  });
});
