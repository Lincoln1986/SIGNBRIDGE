import { useEffect, useState } from 'react';
import { dashboardApi, statsApi } from '../api/client';
import type {
  SystemStats, TopWordRow, TranslationTypeRow, ActivityRow, InteractionSummary,
} from '../api/client';
import { StatCard, Card, Spinner, Alert } from '../components/UI';
import { StatDetailModal } from '../components/StatDetailModal';
import type { DetalleMetrica } from '../components/StatDetailModal';
import {
  MetricsBarChart, RatingGauge,
  TopWordsChart, ChannelUsageChart, ActivityChart,
} from '../components/StatsCharts';

const tituloCard: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
  marginBottom: 4, color: 'var(--gray-800)',
};
const subtituloCard: React.CSSProperties = {
  fontSize: '0.83rem', color: 'var(--gray-400)', marginBottom: 16, marginTop: 0,
};

export default function Stats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Estadísticas de interacción con el software ──────────────────────────
  const [resumen, setResumen]   = useState<InteractionSummary | null>(null);
  const [palabras, setPalabras] = useState<TopWordRow[]>([]);
  const [canales, setCanales]   = useState<TranslationTypeRow[]>([]);
  const [actividad, setActividad] = useState<ActivityRow[]>([]);
  const [dias, setDias] = useState(30);
  const [detalle, setDetalle] = useState<DetalleMetrica | null>(null);

  useEffect(() => {
    dashboardApi.stats()
      .then(r => setStats(r.data))
      .catch(() => setError('No se pudieron cargar las estadísticas'))
      .finally(() => setLoading(false));

    // Si alguna de estas falla se deja su sección vacía en lugar de tumbar
    // toda la pantalla: son datos complementarios.
    statsApi.resumenInteraccion().then(r => setResumen(r.data)).catch(() => {});
    statsApi.palabrasGlobales(10).then(r => setPalabras(r.data)).catch(() => {});
    statsApi.canalesGlobales().then(r => setCanales(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    statsApi.actividadGlobal(dias).then(r => setActividad(r.data)).catch(() => {});
  }, [dias]);

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
            {/* Solo "Traducciones" tiene desglose por palabra; las demás son
                informativas y no se hacen clicables a propósito. */}
            <StatCard label="Usuarios registrados" value={stats.total_users} icon={<span>👥</span>} />
            <div role="button" tabIndex={0} title="Ver el detalle" style={{ cursor: 'pointer' }}
                 onClick={() => setDetalle({ tipo: 'traducciones' })}
                 onKeyDown={e => { if (e.key === 'Enter') setDetalle({ tipo: 'traducciones' }); }}>
              <StatCard label="Traducciones totales" value={stats.total_translations} icon={<span>🤟</span>} accent />
            </div>
            <div role="button" tabIndex={0} title="Ver el estado del soporte" style={{ cursor: 'pointer' }}
                 onClick={() => setDetalle({ tipo: 'soporte' })}
                 onKeyDown={e => { if (e.key === 'Enter') setDetalle({ tipo: 'soporte' }); }}>
              <StatCard label="Tickets de soporte" value={stats.total_support_requests} icon={<span>🎫</span>} />
            </div>
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

          {/* ── Cómo interactúa la gente con el software ─────────────────── */}
          <div style={{ marginTop: 36, marginBottom: 20 }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--violet)',
                        textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Uso de la plataforma
            </p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800,
                         fontSize: '1.35rem', color: 'var(--gray-800)', marginTop: 4 }}>
              Cómo se está usando SignBridge
            </h2>
          </div>

          {resumen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                          gap: 16, marginBottom: 20 }}>
              {([
                ['traducidas',  'Palabras traducidas',        resumen.total_words_translated, '📖', true],
                ['vocabulario', 'Vocabulario distinto usado', resumen.distinct_words_used,    '🔤', false],
                ['sin-usar',    'Señas que nadie usó',        resumen.words_not_found,        '💤', false],
                ['promedio',    'Palabras por sesión',        resumen.avg_words_per_session,  '📊', true],
              ] as const).map(([tipo, etiqueta, valor, icono, acento]) => (
                <div
                  key={tipo}
                  onClick={() => setDetalle({ tipo } as DetalleMetrica)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') setDetalle({ tipo } as DetalleMetrica); }}
                  title="Ver el detalle"
                  style={{ cursor: 'pointer' }}
                >
                  <StatCard label={etiqueta} value={valor} icon={<span>{icono}</span>} accent={acento} />
                </div>
              ))}
            </div>
          )}

          {/* Dos columnas: el ranking ocupa la altura de las otras dos juntas,
              así no hay que bajar para ver todas las gráficas. */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 16, alignItems: 'start',
          }}>
            <Card style={{ gridRow: 'span 2' }}>
              <h2 style={tituloCard}>Señas más traducidas</h2>
              <p style={subtituloCard}>
                El color indica la calificación promedio. Una barra larga y roja
                es una palabra muy usada que la gente califica mal.
              </p>
              <TopWordsChart rows={palabras} onSelect={p => setDetalle({ tipo: 'palabra', palabra: p })} />
            </Card>

            <Card>
              <h2 style={tituloCard}>Cómo traduce la gente</h2>
              <p style={subtituloCard}>Reparto de traducciones por canal de entrada.</p>
              <ChannelUsageChart rows={canales} onSelect={c => setDetalle({ tipo: 'canal', canal: c })} />
            </Card>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                            alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <h2 style={tituloCard}>Actividad diaria</h2>
                  <p style={subtituloCard}>Traducciones realizadas por día.</p>
                </div>
                <select
                  value={dias}
                  onChange={e => setDias(Number(e.target.value))}
                  style={{ fontSize: '0.82rem', padding: '5px 8px', borderRadius: 6,
                           border: '1px solid var(--gray-200)', color: 'var(--gray-800)' }}
                >
                  <option value={7}>7 días</option>
                  <option value={30}>30 días</option>
                  <option value={90}>90 días</option>
                </select>
              </div>
              <ActivityChart rows={actividad} />
            </Card>
          </div>
        </>
      )}

      {detalle && <StatDetailModal detalle={detalle} onClose={() => setDetalle(null)} />}
    </>
  );
}
