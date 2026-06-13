import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/client';
import type { LexicalUnit } from '../api/client';
import { Navbar } from '../components/Navbar';
import { Card, Spinner, Alert, Badge } from '../components/UI';

export default function Vocabulary() {
  const [units, setUnits] = useState<LexicalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    dashboardApi.lexicalUnits()
      .then(r => setUnits(r.data))
      .catch(() => setError('No se pudo cargar el vocabulario'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = units.filter(u => u.text?.toLowerCase().includes(search.toLowerCase()));

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)' }}>
      <Navbar />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Vocabulario
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gray-800)', marginTop: 4 }}>
            Unidades léxicas
          </h1>
          <p style={{ color: 'var(--gray-400)', marginTop: 4, fontSize: '0.9rem' }}>
            Vocabulario disponible en el sistema SignBridge
          </p>
        </div>

        {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={36} /></div>}
        {error && <Alert type="error" message={error} />}

        {!loading && !error && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>
                  {filtered.length} palabras
                </h2>
                <Badge label="LSC — es_Co" variant="amber" />
              </div>
              <input
                placeholder="Buscar palabra..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '8px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 8,
                  fontSize: '0.85rem', width: 220, outline: 'none', fontFamily: 'var(--font-body)',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--violet)'}
                onBlur={e => e.target.style.borderColor = 'var(--gray-200)'}
              />
            </div>

            {/* Grid of word cards */}
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {filtered.length === 0 ? (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                  No se encontraron palabras
                </div>
              ) : (
                filtered.map((u, i) => (
                  <div key={i} style={{
                    background: 'var(--violet-light)', border: '1px solid var(--gray-200)',
                    borderRadius: 'var(--radius-sm)', padding: '18px 16px',
                    transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'default',
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
                  >
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--violet)', marginBottom: 8 }}>
                      {u.text ?? '—'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>
                        🌐 {u.language}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                        Agregado {formatDate(u.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
