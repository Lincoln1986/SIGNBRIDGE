import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CookieBanner } from './CookieBanner';

const KEY = 'sb_cookie_consent';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

const renderBanner = () =>
  render(
    <MemoryRouter>
      <CookieBanner />
    </MemoryRouter>
  );

describe('CookieBanner', () => {
  it('no aparece inmediatamente, espera el delay', () => {
    renderBanner();
    expect(screen.queryByRole('dialog', { name: 'Aviso de cookies' })).not.toBeInTheDocument();
  });

  it('aparece después del delay y acepta todas', () => {
    renderBanner();
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByRole('dialog', { name: 'Aviso de cookies' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar todas' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('accepted');
  });

  it('permite quedarse solo con las esenciales', () => {
    renderBanner();
    act(() => vi.advanceTimersByTime(600));

    fireEvent.click(screen.getByRole('button', { name: 'Solo esenciales' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe('rejected');
  });

  it('no aparece si ya se dio una respuesta previa', () => {
    localStorage.setItem(KEY, 'accepted');
    renderBanner();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('enlaza a la política de privacidad', () => {
    renderBanner();
    act(() => vi.advanceTimersByTime(600));
    expect(screen.getByText('Ver política de privacidad')).toBeInTheDocument();
  });
});
