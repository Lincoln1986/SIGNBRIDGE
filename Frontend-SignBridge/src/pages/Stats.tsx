import { useEffect, useState } from 'react';
import { dashboardApi, statsApi } from '../api/client';
import type { SystemStats, MostUsedPhrase, UserInteractionStats } from '../api/client';
import { StatCard, Card, Spinner, Alert, Badge } from '../components/UI';
import { MetricsBarChart, RatingGauge } from '../components/StatsCharts';

export default function Stats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [phrases, setPhrases] = useState<MostUsedPhrase[]>([]);
  const [interaction, setInteraction] = useState<UserInteractionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      dashboardApi.stats(),
      statsApi.mostUsedPhrases(10),
      statsApi.userInteraction(),
    ])
      .then(([s, p, u]) => {
        setStats(s.data);
        setPhrases(p.data);
        setInteraction(u.data);
      })
      .catch(() => setError('No se pudieron cargar las estadisticas'))
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
                Valoracion global de la plataforma
              </h2>
              <RatingGauge rating={stats.average_rating} />
              <p style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem', marginTop: -8 }}>
                Basado en {stats.total_feedback} valoraciones
              </p>
            </Card>
          )}

          {/* Frases mas usadas */}
          {phrases.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--gray-800)' }}>
                Frases mas usadas
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {phrases.map((p, i) => (
                  <div key={p.id_lexicalunit} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 8, background: i < 3 ? 'var(--violet-light)' : 'var(--gray-50)',
                  }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i < 3 ? 'var(--violet)' : 'var(--gray-200)',
                      color: i < 3 ? 'white' : 'var(--gray-600)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-800)' }}>
                        {p.phrase}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                        {p.language} {p.video_url && <Badge label="Video" variant="success" />}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--violet)' }}>{p.times_used}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)' }}>usos</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Interaccion de usuarios */}
          {interaction.length > 0 && (
            <Card style={{ marginTop: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--gray-800)' }}>
                Interaccion de usuarios
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)' }}>
                      {['Usuario', 'Sesiones', 'Voz->Senas', 'Senas->Texto', 'Favoritos', 'Feedback'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-100)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {interaction.map(u => (
                      <tr key={u.id_user} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-800)' }}>{u.full_name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--violet)' }}>{u.total_sessions}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{u.voice_to_sign_sessions}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{u.sign_to_text_sessions}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{u.favorites_count}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>{u.feedbacks_given}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}