import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/client';
import type { SystemStats } from '../api/client';
import { StatCard, Card, Spinner, Alert } from '../components/UI';

export default function Stats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.stats()
      .then(r => setStats(r.data))
      .catch(() => setError('No se pudieron cargar las estadísticas'))
      .finally(() => setLoading(false));
  }, []);

  const bar = (value: number, max: number, color: string) => (
    <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ height: '100%', width: `${Math.min((value / max) * 100, 100)}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease' }} />
    </div>
  );

  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Administración
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gray-800)', marginTop: 4 }}>
          Estadísticas del sistema
        </h1>
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={36} /></div>}
      {error && <Alert type="error" message={error} />}

      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard label="Usuarios registrados" value={stats.total_users} icon={<span>👥</span>} />
            <StatCard label="Traducciones totales" value={stats.total_translations} icon={<span>🤟</span>} accent />
            <StatCard label="Tickets de soporte" value={stats.total_support_requests} icon={<span>🎫</span>} />
            <StatCard label="Feedbacks recibidos" value={stats.total_feedback} icon={<span>💬</span>} accent />
          </div>

          {/* Detailed breakdown */}
          <Card>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 24, color: 'var(--gray-800)' }}>
              Resumen de actividad
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Usuarios', value: stats.total_users, max: Math.max(stats.total_users, 1), color: 'var(--violet)' },
                { label: 'Traducciones', value: stats.total_translations, max: Math.max(stats.total_translations, 1), color: 'var(--amber)' },
                { label: 'Soporte', value: stats.total_support_requests, max: Math.max(stats.total_translations, 1), color: '#E5534B' },
                { label: 'Feedbacks', value: stats.total_feedback, max: Math.max(stats.total_translations, 1), color: '#27A85F' },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--gray-600)' }}>{item.label}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--gray-800)' }}>{item.value}</span>
                  </div>
                  {bar(item.value, item.max, item.color)}
                </div>
              ))}
            </div>
          </Card>

          {/* Rating card */}
          {stats.average_rating != null && (
            <Card style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--gray-800)' }}>
                Valoración global de la plataforma
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--gray-800)', lineHeight: 1 }}>
                  {stats.average_rating.toFixed(2)}
                </div>
                <div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} style={{ fontSize: 22, color: i < Math.round(stats.average_rating!) ? 'var(--amber)' : 'var(--gray-200)' }}>★</span>
                    ))}
                  </div>
                  <span style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>Basado en {stats.total_feedback} valoraciones</span>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}