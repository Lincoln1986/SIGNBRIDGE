import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'sb_cookie_consent';

type ConsentState = 'accepted' | 'rejected' | null;

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentState;
    if (!stored) {
      // Pequeño delay para no aparecer antes que la página cargue
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(STORAGE_KEY, 'rejected');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Overlay suave */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
          padding: '16px',
          pointerEvents: 'none',
          display: 'flex', justifyContent: 'center',
        }}
      >
        <div
          role="dialog"
          aria-label="Aviso de cookies"
          aria-live="polite"
          style={{
            background: 'var(--white)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            border: '1px solid var(--gray-100)',
            padding: '20px 24px',
            maxWidth: 700,
            width: '100%',
            pointerEvents: 'all',
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          {/* Icono */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'var(--violet-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem',
          }}>
            🍪
          </div>

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-800)', marginBottom: 4 }}>
              Usamos cookies para mejorar tu experiencia
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', lineHeight: 1.5, margin: 0 }}>
              Utilizamos cookies esenciales para el funcionamiento de la plataforma y cookies analíticas
              para mejorarla. Puedes aceptar todas o solo las esenciales.{' '}
              <Link
                to="/privacy"
                style={{ color: 'var(--violet)', fontWeight: 600, textDecoration: 'none' }}
              >
                Ver política de privacidad
              </Link>
              .
            </p>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <button
              onClick={reject}
              style={{
                background: 'none',
                border: '1.5px solid var(--gray-200)',
                color: 'var(--gray-600)',
                padding: '8px 18px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gray-400)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--gray-200)')}
            >
              Solo esenciales
            </button>
            <button
              onClick={accept}
              style={{
                background: 'var(--violet)',
                border: 'none',
                color: 'white',
                padding: '8px 20px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                boxShadow: '0 2px 8px rgba(91,79,207,0.3)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Aceptar todas
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
