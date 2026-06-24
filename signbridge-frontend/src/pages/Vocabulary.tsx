import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/client';
import type { LexicalUnit } from '../api/client';
import { Card, Spinner, Alert, Badge } from '../components/UI';

export default function Vocabulary() {
  const [units, setUnits] = useState<LexicalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  // Converts any YouTube URL to embed format
  const getEmbedUrl = (url: string): string => {
    try {
      // Already an embed URL
      if (url.includes('youtube.com/embed/')) return url;
      // youtu.be/ID short link
      const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
      if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
      // youtube.com/watch?v=ID
      const watchMatch = url.match(/[?&]v=([^?&]+)/);
      if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
      // Not YouTube — return as-is for regular video files
      return url;
    } catch {
      return url;
    }
  };

  const isYouTube = (url: string) =>
    url.includes('youtube.com') || url.includes('youtu.be');

  useEffect(() => {
    dashboardApi.lexicalUnits()
      .then(r => setUnits(r.data))
      .catch(() => setError('No se pudo cargar el vocabulario'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = units.filter(u => u.text?.toLowerCase().includes(search.toLowerCase()));

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Vocabulario
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gray-800)', marginTop: 4 }}>
          Unidades léxicas
        </h1>
        <p style={{ color: 'var(--gray-400)', marginTop: 4, fontSize: '0.9rem' }}>
          Vocabulario disponible en SignBridge · Las tarjetas con video incluyen la seña grabada
        </p>
      </div>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spinner size={36} /></div>}
      {error && <Alert type="error" message={error} />}

      {!loading && !error && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '20px 24px', borderBottom: '1px solid var(--gray-100)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)' }}>
                {filtered.length} palabras
              </h2>
              <Badge label="LSC — es_CO" variant="amber" />
              <Badge label={`${filtered.filter(u => u.video_url).length} con video 🎬`} variant="success" />
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
          <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 16 }}>
            {filtered.length === 0 ? (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>
                No se encontraron palabras
              </div>
            ) : (
              filtered.map((u, i) => (
                <div key={i} style={{
                  background: 'var(--white)', border: `1.5px solid ${u.video_url ? 'rgba(91,79,207,0.25)' : 'var(--gray-100)'}`,
                  borderRadius: 'var(--radius)', overflow: 'hidden',
                  transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'default',
                  boxShadow: 'var(--shadow-sm)',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'; }}
                >
                  {/* Video area */}
                  {u.video_url && (
                    <div style={{ position: 'relative', background: '#0f0f0f', aspectRatio: '16/9' }}>
                      {playingVideo === u.text ? (
                        isYouTube(u.video_url) ? (
                          <iframe
                            src={`${getEmbedUrl(u.video_url)}?autoplay=1`}
                            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={u.video_url}
                            autoPlay
                            controls
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            onEnded={() => setPlayingVideo(null)}
                          />
                        )
                      ) : (
                        <button
                          onClick={() => setPlayingVideo(u.text)}
                          style={{
                            width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                            border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: 6,
                          }}
                        >
                          <div style={{
                            width: 42, height: 42, borderRadius: '50%',
                            background: 'var(--violet)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 0 0 6px rgba(91,79,207,0.25)',
                          }}>
                            <span style={{ fontSize: '1.1rem', marginLeft: 3 }}>▶</span>
                          </div>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: 500 }}>
                            Ver seña
                          </span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* No video placeholder */}
                  {!u.video_url && (
                    <div style={{
                      aspectRatio: '16/9', background: 'var(--violet-light)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '2rem' }}>🤟</span>
                    </div>
                  )}

                  {/* Card body */}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--violet)' }}>
                        {u.text ?? '—'}
                      </div>
                      {u.video_url && (
                        <span style={{
                          background: 'var(--violet-light)', color: 'var(--violet)',
                          fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                        }}>
                          🎬 VIDEO
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', fontWeight: 500 }}>
                        🌐 {u.language}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                        Agregado {formatDate(u.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </>
  );
}