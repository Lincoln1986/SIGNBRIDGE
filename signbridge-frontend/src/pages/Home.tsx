import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/UI';

const features = [
  {
    icon: '📚',
    title: 'Vocabulario LSC',
    desc: 'Consulta palabras y expresiones en Lengua de Señas Colombiana.',
    color: 'var(--violet)',
    to: '/vocabulary',
  },
  {
    icon: '🎙️',
    title: 'Voz a Señas',
    desc: 'Convierte voz o texto en representaciones de señas.',
    color: 'var(--amber)',
    to: '/voice-to-sign',
  },
  {
    icon: '🤟',
    title: 'Señas a Texto',
    desc: 'Interpreta señas y las transforma en texto.',
    color: '#10b981',
    to: '/sign-to-text',
  },
  {
    icon: '📊',
    title: 'Mi Panel',
    desc: 'Visualiza tu actividad, progreso y estadísticas personales.',
    color: '#e05b8b',
    to: '/dashboard',
  },
];

const benefits = [
  { icon: '🤝', title: 'Inclusión social', desc: 'Conecta a personas sordas y oyentes en un mismo espacio.' },
  { icon: '♿', title: 'Accesibilidad', desc: 'Herramientas diseñadas para todos, sin barreras.' },
  { icon: '🧠', title: 'Aprendizaje de LSC', desc: 'Aprende y practica la Lengua de Señas Colombiana.' },
  { icon: '💬', title: 'Comunicación efectiva', desc: 'Traducciones precisas en tiempo real.' },
];

const quickActions = [
  { label: 'Explorar vocabulario', to: '/vocabulary', icon: '📚', primary: true },
  { label: 'Traducir voz a señas', to: '/voice-to-sign', icon: '🎙️', primary: false },
  { label: 'Traducir señas a texto', to: '/sign-to-text', icon: '🤟', primary: false },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.full_name?.split(' ')[0] ?? 'Usuario';

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Sección 1: Bienvenida ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--violet) 0%, #4338ca 60%, var(--violet-mid) 100%)',
        borderRadius: 'var(--radius)',
        padding: '48px 40px',
        marginBottom: 40,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 220, height: 220, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: '40%',
          width: 180, height: 180, borderRadius: '50%',
          background: 'rgba(246,166,35,0.12)',
          pointerEvents: 'none',
        }} />

        <p style={{
          fontSize: '0.8rem', fontWeight: 700, color: 'var(--amber)',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
        }}>
          Plataforma de comunicación inclusiva
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          color: 'white', marginBottom: 12, lineHeight: 1.2,
        }}>
          Bienvenido a SignBridge{firstName ? `, ${firstName}` : ''} 🤟
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.82)', fontSize: '1rem',
          lineHeight: 1.7, maxWidth: 580,
        }}>
          SignBridge es una plataforma diseñada para facilitar la comunicación entre personas
          sordas y oyentes mediante la <strong style={{ color: 'white' }}>Lengua de Señas Colombiana (LSC)</strong>.
        </p>
      </div>

      {/* ── Sección 2: Objetivo del proyecto ── */}
      <Card style={{
        marginBottom: 40,
        borderLeft: '4px solid var(--violet)',
        background: 'var(--violet-light)',
        border: 'none',
        borderRadius: 'var(--radius)',
        padding: '24px 28px',
        display: 'flex',
        gap: 16,
        alignItems: 'flex-start',
      }}>
        <div style={{ fontSize: '2rem', flexShrink: 0, marginTop: 2 }}>🎯</div>
        <div>
          <p style={{
            fontSize: '0.75rem', fontWeight: 700, color: 'var(--violet)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
          }}>
            Objetivo del proyecto
          </p>
          <p style={{ color: 'var(--gray-800)', fontSize: '0.95rem', lineHeight: 1.7, fontWeight: 500 }}>
            SignBridge busca reducir las barreras de comunicación a través de herramientas
            tecnológicas que permiten la traducción entre <strong>texto</strong>, <strong>voz</strong> y <strong>señas</strong>.
          </p>
        </div>
      </Card>

      {/* ── Sección 3: Funcionalidades principales ── */}
      <div style={{ marginBottom: 40 }}>
        <p style={{
          fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>
          Módulos disponibles
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.3rem', color: 'var(--gray-800)', marginBottom: 20,
        }}>
          Funcionalidades principales
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 16,
        }}>
          {features.map(f => (
            <button
              key={f.title}
              onClick={() => navigate(f.to)}
              style={{
                textAlign: 'left', border: '1.5px solid var(--gray-100)',
                borderRadius: 'var(--radius)', background: 'var(--white)',
                padding: 22, cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: `${f.color}1A`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.4rem',
              }}>
                {f.icon}
              </div>
              <div>
                <div style={{
                  fontWeight: 700, fontSize: '0.95rem',
                  color: 'var(--gray-800)', marginBottom: 4,
                }}>
                  {f.title}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>
                  {f.desc}
                </div>
              </div>
              <div style={{
                fontSize: '0.75rem', fontWeight: 600,
                color: f.color, marginTop: 'auto',
              }}>
                Ir al módulo →
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sección 4: Beneficios ── */}
      <div style={{ marginBottom: 40 }}>
        <p style={{
          fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>
          ¿Por qué SignBridge?
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.3rem', color: 'var(--gray-800)', marginBottom: 20,
        }}>
          Beneficios
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
        }}>
          {benefits.map(b => (
            <Card key={b.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: 20 }}>
              <div style={{
                fontSize: '1.5rem', flexShrink: 0,
                width: 42, height: 42, borderRadius: 10,
                background: 'var(--violet-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {b.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--gray-800)', marginBottom: 4 }}>
                  {b.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>
                  {b.desc}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* ── Sección 5: Accesos rápidos ── */}
      <div style={{
        background: 'var(--white)',
        border: '1.5px solid var(--gray-100)',
        borderRadius: 'var(--radius)',
        padding: '32px 28px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <p style={{
          fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>
          Empieza ahora
        </p>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.3rem', color: 'var(--gray-800)', marginBottom: 20,
        }}>
          Accesos rápidos
        </h2>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 14,
        }}>
          {quickActions.map((qa, i) => (
            <button
              key={qa.label}
              onClick={() => navigate(qa.to)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 24px',
                borderRadius: 'var(--radius)',
                border: i === 0 ? 'none' : '1.5px solid var(--gray-200)',
                background: i === 0
                  ? 'linear-gradient(135deg, var(--violet), #4338ca)'
                  : 'var(--white)',
                color: i === 0 ? 'white' : 'var(--gray-800)',
                fontWeight: 700, fontSize: '0.92rem',
                cursor: 'pointer',
                boxShadow: i === 0 ? 'var(--shadow)' : 'var(--shadow-sm)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                fontFamily: 'var(--font-body)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = '';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = i === 0 ? 'var(--shadow)' : 'var(--shadow-sm)';
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{qa.icon}</span>
              {qa.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}