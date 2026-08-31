import { useState, useEffect } from 'react';
import { historyApi, type TranslationHistoryEntry } from '../api/history';
import { Card, Spinner, Alert } from './UI';

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

type GroupedHistory = Record<string, TranslationHistoryEntry[]>;

function groupByDay(entries: TranslationHistoryEntry[]): GroupedHistory {
  const grouped: GroupedHistory = {};
  for (const entry of entries) {
    const day = new Date(entry.date_time).toISOString().split('T')[0]; // YYYY-MM-DD
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(entry);
  }
  return grouped;
}

// ── Componente ─────────────────────────────────────────────────────────────

export default function TranslationHistory() {
  const [entries, setEntries] = useState<TranslationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    historyApi
      .list()
      .then(r => setEntries(r.data))
      .catch(() => setError('No se pudo cargar el historial de traducciones'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
        <Spinner size={36} />
      </div>
    );
  }

  if (error) return <Alert type="error" message={error} />;

  const grouped = groupByDay(entries);
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (days.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📝</div>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700,
          fontSize: '1rem', color: 'var(--gray-800)', marginBottom: 8,
        }}>
          Aún no tienes traducciones
        </h3>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', lineHeight: 1.6 }}>
          Usa "Voz a Señas" o "Señas a Texto" para ver tu historial aquí.
        </p>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Resumen */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--violet-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.3rem', flexShrink: 0,
        }}>
          📊
        </div>
        <div>
          <div style={{
            fontWeight: 800, fontSize: '1.2rem',
            fontFamily: 'var(--font-display)', color: 'var(--gray-800)',
          }}>
            {entries.length} traducción{entries.length !== 1 ? 'es' : ''}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
            en {days.length} día{days.length !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>

      {/* Historial agrupado por día */}
      {days.map(day => (
        <div key={day}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: '0.92rem', color: 'var(--gray-800)',
            marginBottom: 10, paddingBottom: 6,
            borderBottom: '1.5px solid var(--gray-100)',
          }}>
            📅 {formatDate(day)}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grouped[day].map(entry => (
              <Card key={entry.id_session} style={{ padding: '12px 16px' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: entry.translation_type === 'voz' ? 'var(--amber-light)' : 'var(--violet-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.85rem', flexShrink: 0,
                    }}>
                      {entry.translation_type === 'voz' ? '🎙️' : '⌨️'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--gray-800)' }}>
                        Traducción {entry.translation_type === 'voz' ? 'por voz' : 'de texto'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>
                        {entry.signs_count} seña{entry.signs_count !== 1 ? 's' : ''} encontrada{entry.signs_count !== 1 ? 's' : ''}
                        {entry.original_text && (
                          <> — "{entry.original_text.length > 40 ? entry.original_text.slice(0, 40) + '…' : entry.original_text}"</>
                        )}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem', color: 'var(--gray-400)', flexShrink: 0,
                  }}>
                    {formatTime(entry.date_time)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
