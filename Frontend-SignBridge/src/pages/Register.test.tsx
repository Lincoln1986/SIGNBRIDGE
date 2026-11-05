// Página /register con React Testing Library.
// Autor: @javierperez14 · S3 (Front: página Register) — render, error visible y envío con user-event
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { authApi } from '../api/client';
import Register from './Register';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(authApi, 'getCities').mockResolvedValue({ data: [{ region_name: 'Cali' }, { region_name: 'Bogotá' }] } as never);
});

const pantalla = () => render(<MemoryRouter><Register /></MemoryRouter>);
const boton = () => screen.getByRole('button', { name: 'Crear cuenta' });

async function llenar({ telefono = '3001234567', clave = 'Clave123*', confirmar = 'Clave123*' } = {}) {
  await userEvent.type(screen.getByPlaceholderText('Juan'), 'ana');
  await userEvent.type(screen.getByPlaceholderText('Pérez'), 'paz');
  const tel = screen.getByPlaceholderText('3001234567');
  await userEvent.clear(tel);
  await userEvent.type(tel, telefono);
  await userEvent.selectOptions(screen.getByRole('combobox'), await screen.findByRole('option', { name: 'Cali' }));
  await userEvent.type(screen.getByPlaceholderText('Cra 10 # 20-30, Barrio Centro'), 'Cra 1');
  await userEvent.type(screen.getByPlaceholderText('tu@correo.com'), 'ana@example.com');
  await userEvent.type(screen.getByPlaceholderText('Mín. 8 caracteres'), clave);
  await userEvent.type(screen.getByPlaceholderText('Repite la contraseña'), confirmar);
}

describe('Register', () => {
  it('should render the form with the cities from the API', async () => {
    pantalla();

    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Cali' })).toBeInTheDocument();
    expect(boton()).toBeDisabled();
  });

  it('should send the cleaned data when the form is valid', async () => {
    const register = vi.spyOn(authApi, 'register').mockResolvedValue({ data: {} } as never);
    pantalla();

    await llenar();
    await userEvent.click(boton());

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).toMatchObject({ first_name: 'Ana', last_name: 'Paz', phone: '3001234567', city: 'Cali' });
    expect(await screen.findByText('¡Cuenta creada exitosamente! Redirigiendo...')).toBeInTheDocument();
  });

  // ── Casos no felices ──────────────────────────────────────────────────
  it('should warn and keep the button disabled when the passwords do not match', async () => {
    pantalla();

    await llenar({ confirmar: 'Otra123*' });

    expect(screen.getByText('No coinciden')).toBeInTheDocument();
    expect(boton()).toBeDisabled();
  });

  it('should keep the button disabled with a weak password', async () => {
    pantalla();

    await llenar({ clave: 'abc', confirmar: 'abc' });

    expect(boton()).toBeDisabled();
  });

  it('should explain that the phone needs 10 digits', async () => {
    pantalla();

    await llenar({ telefono: '300123' });

    expect(screen.getByText('Debe tener 10 dígitos')).toBeInTheDocument();
    expect(boton()).toBeDisabled();
  });

  it.each([
    ['un texto', 'El correo ya está registrado', 'El correo ya está registrado'],
    ['una lista 422', [{ loc: ['body', 'email'], msg: 'value is not a valid email' }], 'email: value is not a valid email'],
    ['nada', undefined, 'Error al registrar usuario. Intenta de nuevo.'],
  ])('should show the API error when it answers with %s', async (_caso, detail, mensaje) => {
    vi.spyOn(authApi, 'register').mockRejectedValue({ response: { data: { detail } } });
    pantalla();

    await llenar();
    await userEvent.click(boton());

    expect(await screen.findByText(mensaje)).toBeInTheDocument();
  });
});
