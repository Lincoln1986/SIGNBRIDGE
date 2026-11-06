import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from './Footer';

describe('Footer', () => {
  it('muestra la atribución del proyecto', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    expect(screen.getByText('SignBridge')).toBeInTheDocument();
    expect(screen.getByText(/Lengua de Señas Colombiana · SENA/)).toBeInTheDocument();
    expect(screen.getByText('✉️ signbridge@sena.edu.co')).toBeInTheDocument();
  });

  it('enlaza a la política de privacidad', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: 'Política de privacidad' });
    expect(link).toHaveAttribute('href', '/privacy');
  });
});
