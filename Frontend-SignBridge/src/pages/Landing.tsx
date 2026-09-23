import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';

const C = {
  bg: '#0E0F24',
  surface: '#FFFFFF',
  line: 'rgba(255,255,255,0.10)',
  text: '#F3F6FB',
  muted: '#A8B0C9',
  indigo: '#2823BC',
  indigoSoft: '#4B47D6',
  mint: '#2ED9A3',
  terracotta: '#D66A35',
};

type IconProps = { size?: number };

const IconMic = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v1a7 7 0 0 0 14 0v-1" /><line x1="12" y1="18" x2="12" y2="22" />
  </svg>
);
const IconCamera = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
  </svg>
);
const IconBook = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
const IconPanel = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);
const IconArrowRight = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const IconArrowDown = ({ size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" />
  </svg>
);
const IconCheck = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const FEATURES = [
  { Icon: IconMic,    title: 'Voz a Señas',     desc: 'Mira el mensaje representado en señas.',      bg: 'linear-gradient(150deg, #2E2B8F 0%, #211F63 100%)' },
  { Icon: IconCamera, title: 'Señas a Texto',   desc: 'Interpreta señas desde la cámara.',           bg: 'linear-gradient(150deg, #24C08F 0%, #128A66 100%)' },
  { Icon: IconBook,   title: 'Vocabulario LSC', desc: 'Explora y aprende nuevas señas.',             bg: 'linear-gradient(150deg, #D66A35 0%, #A8541F 100%)' },
  { Icon: IconPanel,  title: 'Mi Panel',        desc: 'Consulta tu actividad en un solo lugar.',     bg: 'linear-gradient(150deg, #26284A 0%, #1B1D3A 100%)' },
];

const PASOS = [
  {
    numero: '1',
    title: 'Elige el sentido',
    desc: 'Escribe o dicta un texto en español para verlo en señas, o activa la cámara para traducir tus señas a texto.',
  },
  {
    numero: '2',
    title: 'SignBridge traduce',
    desc: 'El sistema interpreta el mensaje en tiempo real y muestra su representación en Lengua de Señas Colombiana o en texto.',
  },
  {
    numero: '3',
    title: 'Comunícate sin barreras',
    desc: 'Guarda tu historial, marca palabras favoritas y sigue la conversación desde cualquier dispositivo.',
  },
];

export default function Landing() {
  const location = useLocation();
  const [modalTab, setModalTab] = useState<'login' | 'register' | 'forgot' | null>(null);

  useEffect(() => {
    const state = location.state as { openModal?: string } | null;
    if (state?.openModal === 'login')    setModalTab('login');
    if (state?.openModal === 'register') setModalTab('register');
    if (state?.openModal === 'forgot')   setModalTab('forgot');
  }, [location.state]);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, overflowX: 'hidden' }}>

      <style>{`
        .lp-nav-link { color: ${C.muted}; font-size: 0.88rem; font-weight: 600; transition: color .15s; }
        .lp-nav-link:hover { color: ${C.text}; }
        .lp-btn { transition: transform .15s, box-shadow .15s, background .15s, border-color .15s; }
        .lp-btn:hover { transform: translateY(-2px); }
        .lp-card { transition: transform .18s, box-shadow .18s; }
        .lp-card:hover { transform: translateY(-4px); }
        .lp-gradient-text {
          background: linear-gradient(100deg, #8F8BFF 0%, ${C.mint} 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; color: transparent;
        }
        .lp-hero { display: grid; grid-template-columns: 0.95fr 1.05fr; gap: 64px; align-items: center; }
        .lp-features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
        .lp-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .lp-navlinks { display: flex; }
        @media (max-width: 1024px) {
          .lp-hero { grid-template-columns: 1fr; gap: 40px; text-align: center; }
          .lp-hero-cta { justify-content: center !important; }
          .lp-hero-meta { justify-content: center !important; }
          .lp-features { grid-template-columns: repeat(2, 1fr); }
          .lp-steps { grid-template-columns: 1fr; }
          .lp-navlinks { display: none; }
        }
        @media (max-width: 640px) {
          .lp-features { grid-template-columns: 1fr; }
        }
      `}</style>

      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: `1px solid ${C.line}`,
        background: 'rgba(14,15,36,0.75)', backdropFilter: 'blur(14px)',
      }}>
        <nav style={{
          maxWidth: 1280, margin: '0 auto', height: 80, display: 'flex',
          alignItems: 'center', gap: 16, padding: '0 24px',
        }}>
          <a href="#inicio" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} aria-label="SignBridge, ir al inicio">
            <img
              src="/signbridge-logo.png"
              alt="SignBridge — Un lugar para comunicarse"
              style={{ height: 46, width: 'auto', display: 'block' }}
            />
          </a>

          <div className="lp-navlinks" style={{ margin: '0 auto', gap: 32 }}>
            <a href="#funcionalidades" className="lp-nav-link">Funcionalidades</a>
            <a href="#como-funciona" className="lp-nav-link">Cómo funciona</a>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="lp-btn"
              onClick={() => setModalTab('login')}
              style={{
                background: 'rgba(255,255,255,0.06)', color: C.text,
                border: `1px solid ${C.line}`, padding: '9px 18px', borderRadius: 10,
                fontWeight: 600, fontSize: '0.85rem', fontFamily: 'var(--font-body)', cursor: 'pointer',
              }}
            >
              Iniciar sesión
            </button>
            <button
              className="lp-btn"
              onClick={() => setModalTab('register')}
              style={{
                background: C.indigo, color: '#fff', border: 'none',
                padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(40,35,188,0.45)',
              }}
            >
              Registrarse
            </button>
          </div>
        </nav>
      </header>

      <main id="inicio" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '56px 24px 64px' }}>
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(680px 420px at 18% 28%, rgba(40,35,188,0.55), transparent 70%), radial-gradient(520px 360px at 85% 18%, rgba(46,217,163,0.10), transparent 70%)',
        }} />

        <div className="lp-hero" style={{ position: 'relative' }}>
          <section>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: '1px solid rgba(46,217,163,0.25)', background: 'rgba(46,217,163,0.10)',
              color: C.mint, padding: '8px 14px', borderRadius: 999,
              fontSize: '0.76rem', fontWeight: 700, marginBottom: 20,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.mint }} />
              Hecho en Colombia para conectar
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 'clamp(2.3rem, 5vw, 3.9rem)', lineHeight: 1.06, margin: 0,
            }}>
              Una conversación.{' '}
              <span className="lp-gradient-text">Dos formas de sentirla.</span>
            </h1>

            <p style={{
              marginTop: 20, maxWidth: 560, fontSize: '1.05rem',
              lineHeight: 1.7, color: C.muted,
            }}>
              Traduce voz y texto en español a LSC, e interpreta señas a texto en tiempo real.
              Comunicación más accesible para todos.
            </p>

            <div className="lp-hero-cta" style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                className="lp-btn"
                onClick={() => setModalTab('register')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: C.indigo, color: '#fff', border: 'none',
                  padding: '15px 28px', borderRadius: 12, fontWeight: 700, fontSize: '0.98rem',
                  fontFamily: 'var(--font-body)', cursor: 'pointer',
                  boxShadow: '0 10px 28px rgba(40,35,188,0.5)',
                }}
              >
                Crear cuenta gratis <IconArrowRight />
              </button>
              <a
                href="#como-funciona"
                className="lp-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,255,255,0.06)', color: C.text,
                  border: `1px solid ${C.line}`, padding: '15px 26px', borderRadius: 12,
                  fontWeight: 600, fontSize: '0.98rem', fontFamily: 'var(--font-body)',
                }}
              >
                Ver cómo funciona <IconArrowDown />
              </a>
            </div>

            <p className="lp-hero-meta" style={{
              marginTop: 24, display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.85rem', fontWeight: 600, color: C.muted,
            }}>
              <span style={{ color: C.mint, display: 'inline-flex' }}><IconCheck /></span>
              Proyecto de formación SENA · ADSO 2026
            </p>
          </section>

          <section aria-label="Demostración de SignBridge">
            <div style={{
              background: C.surface, borderRadius: 20, padding: 10,
              boxShadow: '0 40px 90px -30px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.08)',
            }}>
              <img
                src="/signbridge-app-screenshot.png"
                alt="SignBridge — Voz a Señas: escribe o habla en español y obtén la representación en Lengua de Señas Colombiana."
                style={{ width: '100%', display: 'block', borderRadius: 14 }}
                loading="lazy"
              />
            </div>
          </section>
        </div>

        <section id="funcionalidades" className="lp-features" style={{ position: 'relative', marginTop: 56, scrollMarginTop: 96 }}>
          {FEATURES.map(({ Icon, title, desc, bg }) => (
            <article key={title} className="lp-card" style={{
              background: bg, borderRadius: 16, padding: '22px 20px',
              display: 'flex', alignItems: 'center', gap: 16, minHeight: 128,
              border: '1px solid rgba(255,255,255,0.08)', color: '#fff',
            }}>
              <span style={{
                display: 'grid', placeItems: 'center', flexShrink: 0,
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.16)',
              }}>
                <Icon />
              </span>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', margin: 0 }}>{title}</h2>
                <p style={{ margin: '5px 0 0', fontSize: '0.84rem', lineHeight: 1.45, color: 'rgba(255,255,255,0.78)' }}>{desc}</p>
              </div>
            </article>
          ))}
        </section>

        <section id="como-funciona" style={{ position: 'relative', marginTop: 88, scrollMarginTop: 96 }}>
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <p style={{
              fontSize: '0.76rem', fontWeight: 700, color: C.mint,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            }}>
              Paso a paso
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)', margin: 0,
            }}>
              Cómo funciona SignBridge
            </h2>
          </div>

          <div className="lp-steps">
            {PASOS.map(p => (
              <div key={p.numero} className="lp-card" style={{
                background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.line}`,
                borderRadius: 16, padding: '26px 22px',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: C.indigo, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem',
                  marginBottom: 16,
                }}>
                  {p.numero}
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', margin: '0 0 8px' }}>
                  {p.title}
                </h3>
                <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.6, color: C.muted }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer style={{ borderTop: `1px solid ${C.line}`, padding: '24px' }}>
        <p style={{ maxWidth: 1280, margin: '0 auto', fontSize: '0.8rem', color: C.muted, textAlign: 'center' }}>
          © 2026 SignBridge · Lengua de Señas Colombiana · SENA
        </p>
      </footer>

      {modalTab && <AuthModal initialTab={modalTab} onClose={() => setModalTab(null)} />}
    </div>
  );
}