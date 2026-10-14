import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Alert,
  Badge,
  Btn,
  Input,
  PasswordRequirements,
  StatCard,
} from './UI';
import { getPasswordStrength } from './passwordStrength';

describe('getPasswordStrength', () => {
  it('devuelve null con contraseña vacía', () => {
    expect(getPasswordStrength('')).toBeNull();
  });

  it('clasifica una contraseña débil', () => {
    expect(getPasswordStrength('abc')).toBe('weak');
    expect(getPasswordStrength('password')).toBe('weak');
  });

  it('clasifica una contraseña regular', () => {
    expect(getPasswordStrength('Password')).toBe('fair');
  });

  it('clasifica una contraseña fuerte y muy fuerte', () => {
    expect(getPasswordStrength('Password1')).toBe('strong');
    expect(getPasswordStrength('Password1!')).toBe('strong');
    expect(getPasswordStrength('Password1!xyz')).toBe('very-strong');
  });
});

describe('PasswordRequirements', () => {
  it('no renderiza nada con contraseña vacía', () => {
    const { container } = render(<PasswordRequirements password="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marca solo lo cumplido al empezar', () => {
    render(<PasswordRequirements password="Abc1" />);
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    // cumple mayúscula, minúscula y número; fallan largo y especial
    expect(screen.getAllByText('✓')).toHaveLength(3);
    expect(screen.getAllByText('○')).toHaveLength(2);
  });

  it('marca los 5 requisitos con contraseña completa', () => {
    render(<PasswordRequirements password="Password1!" />);
    expect(screen.getAllByText('✓')).toHaveLength(5);
    expect(screen.queryByText('○')).not.toBeInTheDocument();
  });
});

describe('Btn', () => {
  it('dispara onClick', async () => {
    const onClick = vi.fn();
    render(<Btn onClick={onClick}>Guardar</Btn>);
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('está deshabilitado con loading', () => {
    render(<Btn loading>Guardar</Btn>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('respeta disabled', () => {
    render(<Btn disabled>Guardar</Btn>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });
});

describe('Input', () => {
  it('renderiza label y escribe en el campo', async () => {
    const onChange = vi.fn();
    render(<Input label="Correo" placeholder="tu@correo.com" onChange={onChange} />);
    expect(screen.getByText('Correo')).toBeInTheDocument();
    const field = screen.getByPlaceholderText('tu@correo.com');
    await userEvent.type(field, 'a');
    expect(onChange).toHaveBeenCalled();
  });

  it('muestra el mensaje de error', () => {
    render(<Input label="Correo" error="Requerido" />);
    expect(screen.getByText('Requerido')).toBeInTheDocument();
  });
});

describe('Alert y Badge', () => {
  it('Alert muestra el mensaje', () => {
    render(<Alert type="error" message="Credenciales incorrectas" />);
    expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument();
  });

  it('Badge muestra la etiqueta', () => {
    render(<Badge label="Activo" variant="success" />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('muestra valor y etiqueta', () => {
    render(<StatCard label="Usuarios" value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
  });
});
