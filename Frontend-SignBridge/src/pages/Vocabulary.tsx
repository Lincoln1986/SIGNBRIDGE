import { useEffect, useState, useRef } from 'react';
import { dashboardApi, favoritesApi, statsApi } from '../api/client';
import type { LexicalUnit, FavoriteWord, WordRating } from '../api/client';
import { Card, Spinner, Alert, Badge } from '../components/UI';

// ─────────────────────────────────────────────────────────────────────────────
// Abecedario dactilologico LSC (A-Z)
// ─────────────────────────────────────────────────────────────────────────────

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getEmbedUrl(url: string): string {
  try {
    if (url.includes('youtube.com/embed/')) return url;
    const short = url.match(/youtu\.be\/([^?&]+)/);
    if (short) return `https://www.youtube.com/embed/${short[1]}`;
    const watch = url.match(/[?&]v=([^?&]+)/);
    if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
    return url;
  } catch {
    return url;
  }
}

function isYouTube(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Video Lightbox modal
// ─────────────────────────────────────────────────────────────────────────────

interface LightboxProps {
  unit: LexicalUnit & { id_lexicalunit?: string };
  onClose: () => void;
}

function VideoLightbox({ unit, onClose }: LightboxProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const youtube = unit.video_url ? isYouTube(unit.video_url) : false;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 4000,
        background: 'rgba(0,0,0,0.82)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: '#111', borderRadius: 16,
        width: '100%', maxWidth: 760,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Header del modal */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px',
          background: 'rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.4rem' }}>🤟</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                {unit.text}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{unit.language}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar video"
            style={{
              background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
              color: 'white', width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', fontFamily: 'var(--font-body)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Video */}
        <div style={{ aspectRatio: '16/9', background: '#000' }}>
          {youtube ? (
            <iframe
              src={`${getEmbedUrl(unit.video_url!)}?autoplay=1`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={unit.video_url}
              autoPlay
              controls
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            />
          )}
        </div>

        {/* Footer */}
        {!youtube && (
          <div style={{
            padding: '10px 18px',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex', alignItems: 'center',
          }}>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
              Esc para cerrar
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Word card — el botón "Ver seña" abre el VideoLightbox
// ─────────────────────────────────────────────────────────────────────────────

function WordCard({
  unit,
  isFavorite,
  onToggleFavorite,
  onOpenLightbox,
  wordRating,
}: {
  unit: LexicalUnit & { id_lexicalunit?: string };
  isFavorite: boolean;
  onToggleFavorite: (unit: LexicalUnit & { id_lexicalunit?: string }) => void;
  onOpenLightbox: (unit: LexicalUnit & { id_lexicalunit?: string }) => void;
  wordRating?: number | null;
}) {
  return (
    <div
      style={{
        background: 'var(--white)',
        border: `1.5px solid ${unit.video_url ? 'rgba(91,79,207,0.22)' : 'var(--gray-100)'}`,
        borderRadius: 'var(--radius)', overflow: 'hidden',
        transition: 'transform 0.15s, box-shadow 0.15s',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = '';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      {/* Thumbnail / placeholder */}
      {unit.video_url ? (
        <button
          onClick={() => onOpenLightbox(unit)}
          style={{
            display: 'block', width: '100%', aspectRatio: '16/9',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--violet)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 6px rgba(91,79,207,0.25)',
            transition: 'transform 0.15s',
          }}>
            <span style={{ fontSize: '1.1rem', marginLeft: 3 }}>&#9654;</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 600 }}>
            Ver seña
          </span>
        </button>
      ) : (
        <div style={{
          aspectRatio: '16/9', background: 'var(--violet-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: '2rem' }}>&#129335;</span>
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{
            fontSize: '1.05rem', fontWeight: 800,
            fontFamily: 'var(--font-display)', color: 'var(--violet)',
          }}>
            {unit.text ?? '—'}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {unit.video_url && (
              <span style={{
                background: 'var(--violet-light)', color: 'var(--violet)',
                fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: 8,
              }}>
                VIDEO
              </span>
            )}
            <button
              onClick={() => onToggleFavorite(unit)}
              title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.1rem', lineHeight: 1, padding: 2,
                color: isFavorite ? '#f59e0b' : '#d1d5db',
                transition: 'color 0.15s',
              }}
            >
              &#9733;
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.73rem', color: 'var(--gray-400)', fontWeight: 500 }}>
              {unit.language}
            </div>
            {wordRating !== null && wordRating !== undefined && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: '0.7rem', fontWeight: 700,
                color: wordRating >= 4 ? '#15803d' : wordRating >= 3 ? '#b45309' : '#dc2626',
                background: wordRating >= 4 ? '#f0fdf4' : wordRating >= 3 ? '#fef3c7' : '#fef2f2',
                padding: '2px 6px', borderRadius: 6,
              }}>
                ⭐ {wordRating.toFixed(1)}
              </div>
            )}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
            {formatDate(unit.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Vocabulary() {
  const [units, setUnits] = useState<(LexicalUnit & { id_lexicalunit?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [letterFilter, setLetterFilter] = useState<string | null>(null);
  const [filterVideo, setFilterVideo] = useState<'all' | 'with' | 'without'>('all');
  const [favorites, setFavorites] = useState<FavoriteWord[]>([]);
  const [toastMsg, setToastMsg] = useState('');
  const [wordRatings, setWordRatings] = useState<Record<string, number>>({});
  const [lightboxUnit, setLightboxUnit] = useState<(LexicalUnit & { id_lexicalunit?: string }) | null>(null);

  useEffect(() => {
    // Usar directamente el endpoint público que ya incluye id_lexicalunit.
    dashboardApi.lexicalUnits()
      .then(r => setUnits(r.data))
      .catch(() => setError('No se pudo cargar el vocabulario'))
      .finally(() => setLoading(false));

    // Carga favoritos del usuario (silencioso si falla)
    favoritesApi.list()
      .then(r => setFavorites(r.data))
      .catch(() => {});

    // Carga calificaciones por palabra (silencioso si falla)
    statsApi.wordRatings(200, 1)
      .then(r => {
        const map: Record<string, number> = {};
        r.data.forEach(wr => { if (wr.avg_rating !== null) map[wr.word.toLowerCase()] = wr.avg_rating; });
        setWordRatings(map);
      })
      .catch(() => {});
  }, []);

  // ── Filtros ──────────────────────────────────────────────────────────────

  const filtered = units.filter(u => {
    const text = (u.text ?? '').toLowerCase();
    if (search && !text.includes(search.toLowerCase())) return false;
    if (letterFilter && !text.startsWith(letterFilter.toLowerCase())) return false;
    if (filterVideo === 'with' && !u.video_url) return false;
    if (filterVideo === 'without' && u.video_url) return false;
    return true;
  });

  // ── Favoritos ─────────────────────────────────────────────────────────────

  // FavoriteWordOut del backend usa: id_lexicalunit, word_text (no text/lexical_unit_id)
  const favIdSet = new Set(favorites.map(f => f.id_lexicalunit));

  const isFav = (unit: LexicalUnit & { id_lexicalunit?: string }) =>
    !!unit.id_lexicalunit && favIdSet.has(unit.id_lexicalunit);

  const flash = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleToggleFavorite = async (unit: LexicalUnit & { id_lexicalunit?: string }) => {
    const unitId = unit.id_lexicalunit;
    if (!unitId) {
      flash('Esta palabra no tiene ID — no se puede marcar como favorita');
      return;
    }

    // Actualización optimista inmediata para que la estrella cambie al instante
    const alreadyFav = favIdSet.has(unitId);
    if (alreadyFav) {
      setFavorites(prev => prev.filter(f => f.id_lexicalunit !== unitId));
    } else {
      // Añadimos entrada temporal; se reemplaza con la real al recibir respuesta
      setFavorites(prev => [...prev, {
        id_favorite: `tmp-${unitId}`,
        id_lexicalunit: unitId,
        word_text: unit.text ?? '',
        times_used: 0,
        created_at: new Date().toISOString(),
      }]);
    }

    try {
      const { data } = await favoritesApi.toggle(unitId);
      if (data.action === 'added') {
        // Reemplazar entrada temporal con la real
        setFavorites(prev => prev.map(f =>
          f.id_lexicalunit === unitId
            ? { ...f, id_favorite: data.id_favorite ?? f.id_favorite }
            : f
        ));
        flash('¡Agregado a favoritos!');
      } else {
        // El toggle eliminó el favorito — asegurar que esté fuera del estado
        setFavorites(prev => prev.filter(f => f.id_lexicalunit !== unitId));
        flash('Eliminado de favoritos');
      }
    } catch {
      // Revertir optimismo si la petición falló
      if (alreadyFav) {
        setFavorites(prev => [...prev, {
          id_favorite: `tmp-${unitId}`,
          id_lexicalunit: unitId,
          word_text: unit.text ?? '',
          times_used: 0,
          created_at: new Date().toISOString(),
        }]);
      } else {
        setFavorites(prev => prev.filter(f => f.id_lexicalunit !== unitId));
      }
      flash('Error al actualizar favorito');
    }
  };

  return (
    <>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--gray-800)', color: 'white',
          padding: '10px 22px', borderRadius: 99,
          fontSize: '0.85rem', fontWeight: 600,
          zIndex: 3000, boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
        }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Vocabulario
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gray-800)', marginTop: 4 }}>
          Diccionario LSC
        </h1>
        <p style={{ color: 'var(--gray-400)', marginTop: 4, fontSize: '0.88rem', lineHeight: 1.6 }}>
          Vocabulario en Lengua de Senas Colombiana (LSC).
        </p>
      </div>


      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Spinner size={36} />
        </div>
      )}
      {error && <Alert type="error" message={error} />}

      {!loading && !error && (
        <>
          {/* Toolbar */}
          <Card style={{ padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              {/* Buscador */}
              <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--gray-400)', fontSize: '0.85rem', pointerEvents: 'none',
                }}>
                  &#128269;
                </span>
                <input
                  placeholder="Buscar palabra..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setLetterFilter(null); }}
                  style={{
                    width: '100%', padding: '9px 14px 9px 34px',
                    border: '1.5px solid var(--gray-200)', borderRadius: 8,
                    fontSize: '0.88rem', outline: 'none', fontFamily: 'var(--font-body)',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
                />
              </div>

              {/* Filtro video */}
              <div style={{ display: 'flex', background: 'var(--gray-50)', borderRadius: 8, padding: 3, gap: 3, border: '1px solid var(--gray-100)' }}>
                {(['all', 'with', 'without'] as const).map(v => (
                  <button key={v} onClick={() => setFilterVideo(v)} style={{
                    padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
                    background: filterVideo === v ? 'var(--white)' : 'transparent',
                    color: filterVideo === v ? 'var(--violet)' : 'var(--gray-400)',
                    boxShadow: filterVideo === v ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.12s',
                  }}>
                    {v === 'all' ? 'Todos' : v === 'with' ? 'Con video' : 'Sin video'}
                  </button>
                ))}
              </div>

              {/* Contadores */}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0, flexWrap: 'wrap' }}>
                <Badge label={`${filtered.length} palabras`} variant="default" />
                <Badge label={`${filtered.filter(u => u.video_url).length} con video`} variant="success" />
                {favorites.length > 0 && (
                  <Badge label={`${favorites.length} favoritos`} variant="amber" />
                )}
              </div>
            </div>

            {/* Abecedario dactilologico */}
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Abecedario dactilologico — filtrar por letra
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                <button
                  onClick={() => setLetterFilter(null)}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.78rem', fontFamily: 'var(--font-body)',
                    background: letterFilter === null ? 'var(--violet)' : 'var(--gray-100)',
                    color: letterFilter === null ? 'white' : 'var(--gray-600)',
                    transition: 'all 0.12s',
                  }}
                >
                  Todos
                </button>
                {ALPHABET.map(letter => (
                  <button
                    key={letter}
                    onClick={() => setLetterFilter(letterFilter === letter ? null : letter)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.82rem', fontFamily: 'var(--font-body)',
                      background: letterFilter === letter ? 'var(--violet)' : 'var(--gray-100)',
                      color: letterFilter === letter ? 'white' : 'var(--gray-600)',
                      transition: 'all 0.12s',
                    }}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Grid de palabras */}
          {filtered.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>&#129335;</div>
              <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>
                No se encontraron palabras con los filtros actuales.
              </p>
            </Card>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 14,
            }}>
              {filtered.map((u, i) => (
                <WordCard
                  key={i}
                  unit={u}
                  isFavorite={isFav(u)}
                  onToggleFavorite={handleToggleFavorite}
                  onOpenLightbox={setLightboxUnit}
                  wordRating={u.text ? wordRatings[u.text.toLowerCase()] ?? null : null}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Video Lightbox */}
      {lightboxUnit && (
        <VideoLightbox
          unit={lightboxUnit}
          onClose={() => setLightboxUnit(null)}
        />
      )}
    </>
  );
}