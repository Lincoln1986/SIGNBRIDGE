import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/UI';

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    { icon: '🤟', title: 'Traducción LSC', desc: 'Traduce texto e imágenes a Lengua de Señas Colombiana en tiempo real.' },
    { icon: '📚', title: 'Vocabulario', desc: 'Accede a un diccionario visual con señas grabadas por personas reales.' },
    { icon: '📊', title: 'Seguimiento', desc: 'Registra tu progreso, palabras favoritas y estadísticas de uso.' },
    { icon: '🤝', title: 'Inclusión', desc: 'Construido para derribar barreras de comunicación en Colombia.' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <nav style={{
        background: 'var(--white)', borderBottom: '1px solid var(--gray-100)',
        padding: '0 40px', height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', boxShadow: 'var(--shadow-sm)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Logo size="md" />
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'none', border: '1.5px solid var(--violet)', color: 'var(--violet)',
            padding: '8px 22px', borderRadius: 'var(--radius-sm)', fontWeight: 600,
            fontSize: '0.88rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--violet)'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--violet)'; }}
        >
          Iniciar sesión
        </button>
      </nav>

      {/* Hero */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--violet-light)', color: 'var(--violet)',
          padding: '6px 16px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600,
          marginBottom: 24, border: '1px solid rgba(91,79,207,0.15)',
        }}>
          🇨🇴 Lengua de Señas Colombiana · LSC
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
          color: 'var(--gray-800)', lineHeight: 1.15, maxWidth: 700, marginBottom: 20,
        }}>
          Comunicación sin barreras en{' '}
          <span style={{ color: 'var(--violet)' }}>Lengua de Señas</span>
        </h1>

        <p style={{
          fontSize: '1.1rem', color: 'var(--gray-400)', maxWidth: 560,
          lineHeight: 1.7, marginBottom: 40,
        }}>
          SignBridge es una plataforma educativa y de traducción que conecta el lenguaje hablado
          con la Lengua de Señas Colombiana, facilitando la inclusión y comunicación para todos.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/register')}
            style={{
              background: 'var(--violet)', color: 'white',
              padding: '14px 36px', borderRadius: 'var(--radius-sm)',
              fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', boxShadow: '0 4px 14px rgba(91,79,207,0.35)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(91,79,207,0.45)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(91,79,207,0.35)'; }}
          >
            🚀 Iniciar ahora
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'var(--white)', color: 'var(--gray-800)',
              padding: '14px 36px', borderRadius: 'var(--radius-sm)',
              fontWeight: 600, fontSize: '1rem', border: '1.5px solid var(--gray-200)',
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--violet)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--violet)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--gray-200)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--gray-800)'; }}
          >
            Iniciar sesión
          </button>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 24px 80px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <p style={{ textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          ¿Qué puedes hacer?
        </p>
        <h2 style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gray-800)', marginBottom: 40 }}>
          Todo lo que SignBridge ofrece
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {features.map((f, i) => (
            <div key={i} style={{
              background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-100)',
              padding: '28px 24px', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)', marginBottom: 8 }}>
                {f.title}
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', lineHeight: 1.6, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--gray-100)', background: 'var(--white)', padding: '24px 40px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', margin: 0 }}>
          © 2026 SignBridge · Proyecto educativo · Lengua de Señas Colombiana
        </p>
      </footer>
    </div>
  );
}
