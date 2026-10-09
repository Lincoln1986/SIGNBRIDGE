import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AccessibilityWidget from './AccessibilityWidget';

const abrir = async () => {
  await userEvent.click(screen.getByLabelText('Abrir menú de accesibilidad'));
  return screen.getByRole('dialog', { name: 'Menú de accesibilidad' });
};

beforeEach(() => {
  localStorage.clear();
  document.getElementById('a11y-widget-styles')?.remove();
});

describe('AccessibilityWidget', () => {
  it('arranca cerrado y anuncia el estado de lectura', () => {
    render(<AccessibilityWidget />);
    expect(screen.getByLabelText('Abrir menú de accesibilidad')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Lectura de página detenida')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre y cierra el panel con Escape', async () => {
    render(<AccessibilityWidget />);
    await abrir();
    expect(screen.getByText('Menú de accesibilidad')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Menú de accesibilidad' })).not.toBeInTheDocument()
    );
  });

  it('cierra con el botón ✕', async () => {
    render(<AccessibilityWidget />);
    await abrir();
    await userEvent.click(screen.getByLabelText('Cerrar menú de accesibilidad'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('alterna un ajuste, lo persiste en localStorage y marca el botón', async () => {
    render(<AccessibilityWidget />);
    await abrir();
    const btn = screen.getByRole('button', { name: /Texto grande/ });
    expect(btn).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('signbridge-a11y-settings')!)).toMatchObject({ bigText: true })
    );

    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('los ajustes opuestos se excluyen entre sí', async () => {
    render(<AccessibilityWidget />);
    await abrir();
    await userEvent.click(screen.getByRole('button', { name: /Texto grande/ }));
    await userEvent.click(screen.getByRole('button', { name: /Texto muy grande/ }));

    const stored = JSON.parse(localStorage.getItem('signbridge-a11y-settings')!);
    expect(stored.hugeText).toBe(true);
    expect(stored.bigText).toBe(false);
  });

  it('restablece todos los ajustes', async () => {
    render(<AccessibilityWidget />);
    await abrir();
    await userEvent.click(screen.getByRole('button', { name: /Escala de grises/ }));
    expect(JSON.parse(localStorage.getItem('signbridge-a11y-settings')!).grayscale).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: /Restablecer todo/ }));
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('signbridge-a11y-settings')!).grayscale).toBe(false)
    );
  });

  it('recupera ajustes guardados previamente', async () => {
    localStorage.setItem('signbridge-a11y-settings', JSON.stringify({ dyslexiaFont: true }));
    render(<AccessibilityWidget />);
    await abrir();
    expect(screen.getByRole('button', { name: /Apto para dislexia/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sobrevive a localStorage corrupto', async () => {
    localStorage.setItem('signbridge-a11y-settings', '{no-es-json');
    render(<AccessibilityWidget />);
    expect(screen.getByLabelText('Abrir menú de accesibilidad')).toBeInTheDocument();
  });

  it('lee la página en voz alta con la Web Speech API', async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    window.speechSynthesis = { speak, cancel, getVoices: () => [] } as never;
    window.SpeechSynthesisUtterance = function (text: string) {
      this.text = text;
    } as never;

    render(<AccessibilityWidget />);
    await abrir();
    await userEvent.click(screen.getByRole('button', { name: /Leer página/ }));

    expect(speak).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Lectura de página iniciada')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Detener lectura/ }));
    expect(cancel).toHaveBeenCalled();
    expect(screen.getByText('Lectura de página detenida')).toBeInTheDocument();
  });
});
