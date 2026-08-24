import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/client';
import type { UserDashboardRow } from '../api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────

const features = [
  { icon: '📚', title: 'Vocabulario LSC',  desc: 'Consulta señas con videos reales del diccionario.', color: 'var(--violet)', to: '/vocabulary',   label: 'Explorar' },
  { icon: '🎙️', title: 'Voz a Señas',      desc: 'Convierte voz o texto a Lengua de Señas.',          color: 'var(--amber)',  to: '/voice-to-sign', label: 'Traducir' },
  { icon: '🤟', title: 'Señas a Texto',    desc: 'Interpreta señas en cámara y las transcribe.',       color: '#10b981',       to: '/sign-to-text',  label: 'Traducir' },
  { icon: '📊', title: 'Mi Panel',         desc: 'Tu actividad, favoritos y valoraciones.',            color: '#e05b8b',       to: '/dashboard',     label: 'Ver panel' },
];

const extraInfo = [
  {
    title: '¿Por qué SignBridge?',
    content: (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {[
          { icon: '🤝', title: 'Inclusión social',       desc: 'Conecta a personas sordas y oyentes en un mismo espacio.' },
          { icon: '♿', title: 'Accesibilidad',           desc: 'Herramientas diseñadas para todos, sin barreras.' },
          { icon: '🧠', title: 'Aprendizaje de LSC',     desc: 'Aprende y practica la Lengua de Señas Colombiana.' },
          { icon: '💬', title: 'Comunicación efectiva',  desc: 'Traducciones precisas en tiempo real.' },
        ].map(b => (
          <div key={b.title} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            background: 'var(--gray-50)', borderRadius: 10, padding: 16,
          }}>
            <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{b.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--gray-800)', marginBottom: 3 }}>{b.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Objetivo del proyecto',
    content: (
      <p style={{ color: 'var(--gray-600)', fontSize: '0.92rem', lineHeight: 1.7 }}>
        SignBridge busca reducir las barreras de comunicación mediante herramientas tecnológicas
        que permiten la traducción entre <strong>texto</strong>, <strong>voz</strong> y{' '}
        <strong>señas</strong> — facilitando la inclusión de la comunidad sorda colombiana.
      </p>
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const { user, isAdmin, isSupport } = useAuth();
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [stats, setStats] = useState<UserDashboardRow | null>(null);

  const firstName = user?.full_name?.split(' ')[0] ?? 'Usuario';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  // Ruta del panel según el rol: Admin -> /admin, Soporte -> /support, resto -> /dashboard
  const panelPath = isAdmin ? '/admin' : isSupport ? '/support' : '/dashboard';

  useEffect(() => {
    dashboardApi.user()
      .then(r => setStats(r.data))
      .catch(() => {}); // silencioso — el banner funciona sin stats
  }, []);

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Banner de bienvenida con mini-resumen ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--violet) 0%, #4338ca 60%, #3730a3 100%)',
        borderRadius: 'var(--radius)',
        padding: '36px 36px 32px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorativos */}
        <div style={{ position: 'absolute', top: -50, right: -50, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: '35%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(246,166,35,0.1)', pointerEvents: 'none' }} />

        {/* Fila superior: saludo + acceso rápido a panel */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
              {greeting} 👋
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 'clamp(1.4rem, 3.5vw, 2rem)',
              color: 'white', lineHeight: 1.2,
            }}>
              {firstName}, bienvenido a SignBridge
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.88rem', marginTop: 6, maxWidth: 480, lineHeight: 1.6 }}>
              Plataforma de traducción en{' '}
              <strong style={{ color: 'white' }}>Lengua de Señas Colombiana (LSC)</strong>.
              ¿Qué quieres hacer hoy?
            </p>
          </div>
          <button
            onClick={() => navigate(panelPath)}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: 'white', padding: '9px 18px',
              borderRadius: 'var(--radius-sm)', fontWeight: 600,
              fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
              backdropFilter: 'blur(4px)',
              transition: 'background 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.22)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}
          >
            Ver mi panel →
          </button>
        </div>

        {/* Mini stats — solo si cargaron */}
        {stats && (
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
          }}>
            {[
              { label: 'Traducciones',  value: stats.translations_made, icon: '🤟' },
              { label: 'Favoritos',     value: stats.favorite_words,    icon: '⭐' },
              { label: 'Valoración',    value: `${stats.average_rating.toFixed(1)} / 5`, icon: '★' },
            ].map(s => (
              <div key={s.label} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10, padding: '8px 16px',
                backdropFilter: 'blur(4px)',
              }}>
                <span style={{ fontSize: '1rem' }}>{s.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'white', lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)', marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}

            {/* Acceso rápido: última funcionalidad usada o vocabulario */}
            <button
              onClick={() => navigate('/vocabulary')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--amber)',
                border: 'none', borderRadius: 10, padding: '8px 16px',
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              <span style={{ fontSize: '1rem' }}>📚</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'white' }}>Vocabulario</div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.8)' }}>Ir ahora →</div>
              </div>
            </button>
          </div>
        )}

        {/* Si aún no cargaron stats, muestra accesos rápidos directos */}
        {!stats && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Vocabulario', to: '/vocabulary', icon: '📚' },
              { label: 'Voz a Señas', to: '/voice-to-sign', icon: '🎙️' },
              { label: 'Señas a Texto', to: '/sign-to-text', icon: '🤟' },
            ].map(q => (
              <button
                key={q.label}
                onClick={() => navigate(q.to)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white', padding: '8px 16px',
                  borderRadius: 10, fontWeight: 600, fontSize: '0.82rem',
                  cursor: 'pointer', fontFamily: 'var(--font-body)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
              >
                <span>{q.icon}</span>{q.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Funcionalidades ── */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          ¿Qué quieres hacer?
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-800)', marginBottom: 16 }}>
          Funcionalidades
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {features.map(f => (
            <button
              key={f.title}
              onClick={() => navigate(f.title === 'Mi Panel' ? panelPath : f.to)}
              style={{
                textAlign: 'left',
                border: `1.5px solid ${f.color}22`,
                borderRadius: 'var(--radius)',
                background: 'var(--white)',
                padding: 20, cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = 'translateY(-4px)';
                el.style.boxShadow = 'var(--shadow)';
                el.style.borderColor = f.color + '55';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.transform = '';
                el.style.boxShadow = 'var(--shadow-sm)';
                el.style.borderColor = f.color + '22';
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem' }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.93rem', color: 'var(--gray-800)', marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: f.color, marginTop: 'auto' }}>
                {f.label} →
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Acordeón ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {extraInfo.map((section, i) => (
          <div key={section.title} style={{ background: 'var(--white)', border: '1.5px solid var(--gray-100)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            <button
              onClick={() => setOpenSection(openSection === i ? null : i)}
              style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-body)' }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-800)' }}>{section.title}</span>
              <span style={{ fontSize: '1.1rem', color: 'var(--violet)', transition: 'transform 0.2s', transform: openSection === i ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>▾</span>
            </button>
            {openSection === i && (
              <div style={{ padding: '0 20px 20px' }}>{section.content}</div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}