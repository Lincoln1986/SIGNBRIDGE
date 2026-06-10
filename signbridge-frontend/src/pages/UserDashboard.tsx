import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/client';
import type { UserDashboardRow } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { StatCard, Card, Spinner, Alert, Badge } from '../components/UI';

export default function UserDashboard() {
  const { user } = useAuth();
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <Navbar />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Mi Panel
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gray-800)', marginTop: 4 }}>
            Hola, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--gray-400)', marginTop: 4, fontSize: '0.9rem' }}>{user?.email}</p>
        </div>

        {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={36} /></div>}
        {error && <Alert type="error" message={error} />}

        {data && (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
              <StatCard
                label="Traducciones realizadas"
                value={data.translations_made}
                icon={<span>🤟</span>}
              />
              <StatCard
                label="Palabras favoritas"
                value={data.favorite_words}
                icon={<span>⭐</span>}
                accent
              />
              <StatCard
                label="Tickets de soporte"
                value={data.support_requests}
                icon={<span>🎫</span>}
              />
            </div>

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

            {/* Profile summary */}
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
      </main>
    </div>
  );
}
