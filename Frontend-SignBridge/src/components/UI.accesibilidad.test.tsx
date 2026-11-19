import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { InputHTMLAttributes, ReactElement } from 'react';
import { Input, PasswordInput } from './UI';

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

// Cada campo trae su propio label: "Contraseña" en PasswordInput, no "Correo".
const campos: { nombre: string; label: string; render: (props: CampoProps) => ReactElement }[] = [
  {
    nombre: 'Input',
    label: 'Correo',
    render: (props) => <Input {...props} />,
  },
  {
    nombre: 'PasswordInput',
    label: 'Contraseña',
    render: (props) => <PasswordInput {...props} />,
  },
];

describe.each(campos)('$nombre · accesibilidad', ({ label, render: renderCampo }) => {
  it('should anunciar el mensaje de error con role="alert"', () => {
    // Arrange
    render(renderCampo({ label, error: 'Campo obligatorio' }));

    // Act
    const alerta = screen.getByRole('alert');

    // Assert
    expect(alerta).toHaveTextContent('Campo obligatorio');
  });

  it('should combinar el aria-describedby externo con el del error', () => {
    // Arrange
    render(renderCampo({ label, error: 'Campo obligatorio', 'aria-describedby': 'ayuda-externa' }));
    const campo = screen.getByLabelText(label);
    const error = screen.getByText('Campo obligatorio');

    // Act
    const descritoPor = campo.getAttribute('aria-describedby');

    // Assert
    expect(descritoPor).toBe(`${error.id} ayuda-externa`);
  });

  it('should conservar solo el aria-describedby externo cuando no hay error', () => {
    // Arrange
    render(renderCampo({ label, 'aria-describedby': 'ayuda-externa' }));

    // Act
    const campo = screen.getByLabelText(label);

    // Assert
    expect(campo).toHaveAttribute('aria-describedby', 'ayuda-externa');
  });

  it('should no definir aria-describedby sin error ni valor externo', () => {
    // Arrange
    render(renderCampo({ label }));

    // Act
    const campo = screen.getByLabelText(label);

    // Assert
    expect(campo).not.toHaveAttribute('aria-describedby');
  });
});

describe('PasswordInput · botón de mostrar contraseña', () => {
  it('should ser alcanzable con teclado', async () => {
    // Arrange
    render(<PasswordInput label="Contraseña" />);
    const boton = screen.getByRole('button', { name: 'Mostrar contraseña' });

    // Assert: no queda fuera del orden de tabulación
    expect(boton).not.toHaveAttribute('tabindex', '-1');

    // Act: tabular desde el campo hasta el botón
    screen.getByLabelText('Contraseña').focus();
    await userEvent.tab();

    // Assert
    expect(boton).toHaveFocus();
  });
});
