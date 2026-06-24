import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/client';
import type { UserDashboardRow } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card, Spinner, Alert, Badge } from '../components/UI';

export default function UserDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<UserDashboardRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.user()
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el panel'))
      .finally(() => setLoading(false));
  }, []);

  const stars = (rating: number) => {
    const rounded = Math.round(rating);
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < rounded ? 'var(--amber)' : 'var(--gray-200)', fontSize: 18 }}>★</span>
    ));
  };

  // Progress towards a simple engagement goal (illustrative, based on existing data)
  const goal = 10;
  const progress = data ? Math.min(100, Math.round((data.translations_made / goal) * 100)) : 0;

  const quickActions = [
    {
      title: 'Ver vocabulario',
      desc: 'Explora las señas disponibles en LSC',
      icon: '📖',
      color: 'var(--violet)',
      action: () => navigate('/vocabulary'),
    },
    {
      title: 'Traducir voz a señas',
      desc: 'Convierte audio en lengua de señas',
      icon: '🎙️',
      color: 'var(--amber)',
      action: () => navigate('/voice-to-sign'),
    },
    {
      title: 'Señas a texto',
      desc: 'Traduce señas capturadas a texto',
      icon: '✋',
      color: '#10b981',
      action: () => navigate('/sign-to-text'),
    },
  ];

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Mi Panel
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gray-800)', marginTop: 4 }}>
          Hola, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--gray-400)', marginTop: 4, fontSize: '0.9rem' }}>{user?.email}</p>
      </div>

      {/* Welcome / context banner */}
      <Card style={{
        marginBottom: 28, background: 'linear-gradient(135deg, var(--violet) 0%, #4338ca 100%)',
        border: 'none', padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '2.2rem' }}>🤟</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h2 style={{ color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', marginBottom: 4 }}>
              Bienvenido a SignBridge
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Traduce entre lengua de señas colombiana (LSC) y texto/voz en tiempo real.
              Explora el vocabulario disponible y lleva el registro de tu actividad aquí.
            </p>
          </div>
        </div>
      </Card>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={36} /></div>}
      {error && <Alert type="error" message={error} />}

      {data && (
        <>
          {/* Quick actions */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 14, color: 'var(--gray-800)' }}>
              Accesos rápidos
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              {quickActions.map(qa => (
                <button
                  key={qa.title}
                  onClick={qa.action}
                  style={{
                    textAlign: 'left', border: '1.5px solid var(--gray-100)', borderRadius: 'var(--radius)',
                    background: 'var(--white)', padding: 18, cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)', transition: 'transform 0.15s, box-shadow 0.15s',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-sm)'; }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: `${qa.color}1A`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                  }}>
                    {qa.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--gray-800)' }}>{qa.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>{qa.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard label="Traducciones realizadas" value={data.translations_made} icon={<span>🤟</span>} />
            <StatCard label="Palabras favoritas" value={data.favorite_words} icon={<span>⭐</span>} accent />
            <StatCard label="Tickets de soporte" value={data.support_requests} icon={<span>🎫</span>} />
          </div>

          {/* Progress bar — engagement towards a usage goal */}
          <Card style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>
                Progreso de traducciones
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600 }}>
                {data.translations_made} / {goal}
              </span>
            </div>
            <div style={{ width: '100%', height: 10, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                width: `${progress}%`, height: '100%', borderRadius: 99,
                background: 'linear-gradient(90deg, var(--violet), var(--amber))',
                transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 8 }}>
              {progress >= 100 ? '¡Meta alcanzada! 🎉' : `Te faltan ${goal - data.translations_made} traducciones para tu próxima meta`}
            </p>
          </Card>

          {/* Rating */}
          <Card style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--gray-800)' }}>
              Tu valoración promedio
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>{stars(data.average_rating)}</div>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--gray-800)' }}>
                {data.average_rating.toFixed(1)}
              </span>
              <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>de 5.0</span>
            </div>
          </Card>

          {/* Profile info */}
          <Card>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--gray-800)' }}>
              Información de perfil
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Nombre completo', value: user?.full_name },
                { label: 'Correo', value: user?.email },
                { label: 'Teléfono', value: user?.phone },
                { label: 'Ciudad', value: user?.city ?? '—' },
                { label: 'Región', value: user?.region ?? '—' },
                { label: 'Rol', value: <Badge label={user?.role ?? ''} /> },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{row.label}</div>
                  <div style={{ fontSize: '0.92rem', color: 'var(--gray-800)', fontWeight: 500 }}>{row.value}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </>
  );
}