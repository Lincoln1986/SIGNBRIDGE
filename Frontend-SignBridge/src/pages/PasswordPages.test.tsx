// Autor: @Sebas-p-s · S3 (Front: ResetPassword y ForgotPassword) — misma regla de contraseña que el registro
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { authApi } from '../api/client';
import { ForgotPassword, ResetPassword } from './PasswordPages';

beforeEach(() => vi.restoreAllMocks());

describe('ResetPassword', () => {
  const pantalla = () => render(<MemoryRouter initialEntries={['/reset-password?token=abc']}><ResetPassword /></MemoryRouter>);
  const boton = () => screen.getByRole('button', { name: 'Restablecer contraseña' });

  async function escribir(clave: string, confirmar: string) {
    await userEvent.type(screen.getByPlaceholderText('Mín. 8 caracteres'), clave);
    await userEvent.type(screen.getByPlaceholderText('Repite la contraseña'), confirmar);
  }

  it('should keep the button disabled with a weak password', async () => {
    pantalla();
    await escribir('abc', 'abc');
    expect(boton()).toBeDisabled();
  });

  it('should warn when the passwords do not match', async () => {
    pantalla();
    await escribir('Clave123*', 'Clave123#');
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(boton()).toBeDisabled();
  });

  it('should send the token from the link and the new password', async () => {
    const reset = vi.spyOn(authApi, 'resetPassword').mockResolvedValue({ data: {} } as never);
    pantalla();

    await escribir('Clave123*', 'Clave123*');
    await userEvent.click(boton());

    await waitFor(() => expect(reset).toHaveBeenCalledWith('abc', 'Clave123*'));
    expect(screen.queryByRole('button', { name: 'Restablecer contraseña' })).not.toBeInTheDocument();
  });

  it.each([
    [{ response: { data: { detail: 'El enlace ya fue usado' } } }, 'El enlace ya fue usado'],
    [new Error('sin red'), 'Token inválido o expirado'],
  ])('should show why the reset failed', async (error, mensaje) => {
    vi.spyOn(authApi, 'resetPassword').mockRejectedValue(error);
    pantalla();

    await escribir('Clave123*', 'Clave123*');
    await userEvent.click(boton());

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
  });
});

describe('ForgotPassword', () => {
  it('should show a generic error when the request fails', async () => {
    vi.spyOn(authApi, 'forgotPassword').mockRejectedValue(new Error('500'));
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    await userEvent.type(screen.getByPlaceholderText('tu@correo.com'), 'ana@example.com');
    await userEvent.click(screen.getByRole('button'));

    expect(await screen.findByText('No se pudo procesar la solicitud')).toBeInTheDocument();
  });
});
