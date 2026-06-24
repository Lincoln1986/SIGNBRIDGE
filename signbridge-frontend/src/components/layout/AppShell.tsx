import type { ReactNode } from 'react';
import { Navbar } from '../Navbar';
import { Footer } from '../Footer';

/**
 * AppShell — layout wrapper para páginas protegidas.
 * Provee Navbar (sticky top) + contenido + Footer (sticky bottom).
 * Cada página solo necesita importar AppShell y definir su <main>.
 */
export function AppShell({ children, maxWidth = 1100 }: {
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ maxWidth, margin: '0 auto', padding: '32px 24px', flex: 1, width: '100%', boxSizing: 'border-box' }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
