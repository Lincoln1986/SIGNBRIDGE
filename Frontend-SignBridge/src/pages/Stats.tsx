import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/client';
import type { SystemStats } from '../api/client';
import { StatCard, Card, Spinner, Alert } from '../components/UI';
import { MetricsBarChart, RatingGauge } from '../components/StatsCharts';

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

          <Card>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--gray-800)' }}>
              Resumen de actividad
            </h2>
            <MetricsBarChart stats={stats} />
          </Card>

          {stats.average_rating != null && (
            <Card style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: 'var(--gray-800)' }}>
                Valoración global de la plataforma
              </h2>
              <RatingGauge rating={stats.average_rating} />
              <p style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: -8 }}>
                Basado en {stats.total_feedback} valoraciones
              </p>
            </Card>
          )}
        </>
      )}
    </>
  );
}