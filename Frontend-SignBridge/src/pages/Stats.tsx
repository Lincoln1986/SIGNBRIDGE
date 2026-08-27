import { useEffect, useState } from 'react';
import { dashboardApi, statsApi } from '../api/client';
import type { SystemStats, MostUsedPhrase, WordRating } from '../api/client';
import { StatCard, Card, Spinner, Alert } from '../components/UI';
import { MetricsBarChart, RatingGauge } from '../components/StatsCharts';

export default function Stats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Most used phrases
  const [mostUsed, setMostUsed] = useState<MostUsedPhrase[]>([]);
  const [mostUsedLoading, setMostUsedLoading] = useState(true);

  // Word ratings
  const [wordRatings, setWordRatings] = useState<WordRating[]>([]);
  const [wordRatingsLoading, setWordRatingsLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats()
      .then(r => setStats(r.data))
      .catch(() => setError('No se pudieron cargar las estadísticas'))
      .finally(() => setLoading(false));

    statsApi.mostUsed(20)
      .then(r => setMostUsed(r.data))
      .catch(() => {})
      .finally(() => setMostUsedLoading(false));

    statsApi.wordRatings(30, 1)
      .then(r => setWordRatings(r.data))
      .catch(() => {})
      .finally(() => setWordRatingsLoading(false));
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

          {/* ── Frases más usadas ── */}
          <Card style={{ marginTop: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 6, color: 'var(--gray-800)' }}>
              📊 Frases más usadas
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginBottom: 16 }}>
              Ranking de palabras/frases más traducidas por los usuarios de la plataforma.
            </p>

            {mostUsedLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size={24} /></div>
            ) : mostUsed.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', textAlign: 'center', padding: 20 }}>
                Aún no hay datos de uso. Las estadísticas aparecerán cuando los usuarios empiecen a traducir.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)' }}>
                      {['#', 'Palabra/Frase', 'Traducciones', 'Usuarios únicos'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-100)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mostUsed.map((p, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--gray-400)', fontSize: '0.82rem' }}>{i + 1}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--gray-800)', fontSize: '0.9rem' }}>{p.word}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--violet)', fontSize: '0.9rem' }}>{p.times_translated}</span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--gray-600)' }}>{p.unique_users}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ── Calificación por palabra ── */}
          <Card style={{ marginTop: 16 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 6, color: 'var(--gray-800)' }}>
              ⭐ Calificación promedio por palabra
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginBottom: 16 }}>
              Rating promedio de cada palabra. Visible a todos los usuarios para saber si una traducción es confiable.
            </p>

            {wordRatingsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spinner size={24} /></div>
            ) : wordRatings.length === 0 ? (
              <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', textAlign: 'center', padding: 20 }}>
                Aún no hay calificaciones por palabra.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)' }}>
                      {['Palabra', 'Rating promedio', 'Calificaciones', 'Mín', 'Máx'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid var(--gray-100)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wordRatings.map((wr, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--gray-100)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--gray-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--gray-800)', fontSize: '0.9rem' }}>{wr.word}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: '0.78rem', fontWeight: 700,
                            color: (wr.avg_rating ?? 0) >= 4 ? '#15803d' : (wr.avg_rating ?? 0) >= 3 ? '#b45309' : '#dc2626',
                          }}>
                            {'⭐'.repeat(Math.round(wr.avg_rating ?? 0))} {(wr.avg_rating ?? 0).toFixed(1)}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 700, color: 'var(--gray-600)' }}>{wr.total_ratings}</span>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--gray-400)' }}>
                          {wr.min_rating ?? '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--gray-400)' }}>
                          {wr.max_rating ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}