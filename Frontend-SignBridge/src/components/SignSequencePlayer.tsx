import { useState, useEffect, useRef, useCallback } from 'react';
import { Spinner } from './UI';

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface SignVideo {
  word: string;
  video_url?: string | null;
  found: boolean;
}

interface SignSequencePlayerProps {
  signs: SignVideo[];
  isLoading: boolean;
}

// ── Helper: detectar YouTube ───────────────────────────────────────────────

function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function extractYouTubeId(url: string): string | null {
  const match1 = url.match(/youtu\.be\/([^?&]+)/);
  if (match1) return match1[1];
  const match2 = url.match(/[?&]v=([^?&]+)/);
  if (match2) return match2[1];
  const match3 = url.match(/youtube\.com\/embed\/([^?&]+)/);
  if (match3) return match3[1];
  return null;
}

// ── Componente principal ───────────────────────────────────────────────────

export default function SignSequencePlayer({
  signs,
  isLoading,
}: SignSequencePlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ytPlayer, setYtPlayer] = useState<YT.Player | null>(null);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerReadyRef = useRef(false);

  // Solo señas con video encontrado
  const playableSigns = signs.filter(s => s.found && s.video_url);
  const total = playableSigns.length;
  const current = playableSigns[currentIndex] ?? null;

  // ── Cargar YouTube IFrame API una sola vez ────────────────────────────────
  useEffect(() => {
    if (window.YT && window.YT.Player) return;
    if (document.getElementById('yt-iframe-api')) return;

    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }, []);

  // ── Crear / actualizar el player de YouTube ───────────────────────────────
  const createYtPlayer = useCallback((videoId: string) => {
    if (!ytContainerRef.current) return;

    // Destruir player anterior si existe
    if (ytPlayer) {
      try { ytPlayer.destroy(); } catch { /* ok */ }
      setYtPlayer(null);
      ytPlayerReadyRef.current = false;
    }

    // Limpiar el contenedor y recrear el div del player
    const container = ytContainerRef.current;
    container.innerHTML = '';
    const playerDiv = document.createElement('div');
    playerDiv.id = `yt-player-${Date.now()}`;
    container.appendChild(playerDiv);

    // Esperar a que la API de YouTube esté lista
    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 100);
        return;
      }
      try {
        const player = new window.YT.Player(playerDiv.id, {
          videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              ytPlayerReadyRef.current = true;
              event.target.playVideo();
            },
            onStateChange: (event) => {
              // YT.PlayerState.ENDED = 0
              if (event.data === 0) {
                // Video terminó → siguiente
                setCurrentIndex(prev => {
                  if (prev < total - 1) return prev + 1;
                  return 0; // loop al inicio
                });
              }
            },
          },
        });
        setYtPlayer(player);
      } catch { /* player init failed */ }
    };
    initPlayer();
  }, [total, ytPlayer]);

  // ── Cuando cambia currentIndex, reproducir el video correspondiente ──────
  useEffect(() => {
    if (!current || !current.video_url) return;

    if (isYouTubeUrl(current.video_url)) {
      const videoId = extractYouTubeId(current.video_url);
      if (videoId) createYtPlayer(videoId);
    } else {
      // Video HTML5
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch(() => null);
      }
    }
  }, [currentIndex, current, createYtPlayer]);

  // ── Resetear al inicio cuando cambian las señas ──────────────────────────
  useEffect(() => {
    setCurrentIndex(0);
  }, [signs]);

  // ── Handlers de navegación ───────────────────────────────────────────────
  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : total - 1));
  }, [total]);

  // ── Detectar si el video actual es YouTube ────────────────────────────────
  const isYt = current?.video_url ? isYouTubeUrl(current.video_url) : false;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--gray-800)',
      borderRadius: 'var(--radius)',
      minHeight: 300,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Cargando */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spinner size={40} color="white" />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: 16 }}>
            Buscando señas…
          </p>
        </div>
      )}

      {/* Video en curso */}
      {!isLoading && current && (
        <>
          {isYt ? (
            <div
              ref={ytContainerRef}
              style={{ width: '100%', minHeight: 300 }}
            />
          ) : (
            <video
              ref={videoRef}
              src={current.video_url!}
              controls
              autoPlay
              playsInline
              onEnded={goNext}
              style={{ width: '100%', objectFit: 'contain' }}
            />
          )}

          {/* Barra de progreso: indicador de seña actual */}
          {total > 1 && (
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <button
                onClick={goPrev}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: 'white',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                title="Seña anterior"
              >
                ◀
              </button>

              {/* Dots de progreso */}
              <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                gap: 6,
                alignItems: 'center',
              }}>
                {playableSigns.map((s, i) => (
                  <div
                    key={i}
                    title={s.word}
                    style={{
                      width: i === currentIndex ? 12 : 8,
                      height: i === currentIndex ? 12 : 8,
                      borderRadius: '50%',
                      background: i === currentIndex
                        ? 'var(--amber)'
                        : i < currentIndex
                          ? 'rgba(255,255,255,0.5)'
                          : 'rgba(255,255,255,0.2)',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onClick={() => setCurrentIndex(i)}
                  />
                ))}
              </div>

              <span style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '0.78rem',
                fontWeight: 700,
                minWidth: 50,
                textAlign: 'center',
              }}>
                {currentIndex + 1} / {total}
              </span>

              <button
                onClick={goNext}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: 'white',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                title="Seña siguiente"
              >
                ▶
              </button>
            </div>
          )}
        </>
      )}

      {/* No hay video disponible */}
      {!isLoading && !current && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.2rem', margin: '0 auto 20px',
          }}>
            🤟
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Escribe texto o usa tu voz<br />para ver la traducción a señas
          </p>
        </div>
      )}
    </div>
  );
}
