import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

/**
 * Reproductor en secuencia de las señas de una traducción.
 *
 * Antes se mostraba solo el primer video encontrado: si escribías
 * "hola amigo buenas noches" veías únicamente "hola". Ahora se arma una lista
 * con todas las señas que tienen video y se reproducen una tras otra.
 *
 * Un iframe común de YouTube no avisa cuándo terminó el video, así que no hay
 * forma de encadenar. Por eso se usa la IFrame Player API, que sí emite el
 * evento ENDED. La librería se carga una sola vez para toda la aplicación.
 *
 * Los videos arrancan silenciados a propósito: los navegadores bloquean el
 * autoplay con sonido, y una seña es visual, no necesita audio. Igual hay un
 * botón para activarlo.
 */

export interface SignClip {
  word: string;
  url: string;
}

// ── URL base del backend, para armar rutas completas de videos locales ──────
// Los videos locales llegan del backend como ruta relativa (/media/videos/xxx.mp4).
// Sin esto, el navegador la busca en el origen del FRONTEND en vez del backend.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function urlCompleta(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
}

// ── Carga única de la IFrame Player API ─────────────────────────────────────

type YTPlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, opts: Record<string, unknown>) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

function cargarYouTubeAPI(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>(resolve => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return apiPromise;
}

/** Saca el id del video de cualquier formato de URL de YouTube. */
export function idDeYouTube(url: string): string | null {
  if (!url) return null;
  const embed = url.match(/youtube\.com\/embed\/([^?&/]+)/);
  if (embed) return embed[1];
  const corto = url.match(/youtu\.be\/([^?&/]+)/);
  if (corto) return corto[1];
  const largo = url.match(/[?&]v=([^?&]+)/);
  if (largo) return largo[1];
  return null;
}

export function esYouTube(url: string): boolean {
  return !!url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

// ── Componente ──────────────────────────────────────────────────────────────

export function SignSequencePlayer({ clips }: { clips: SignClip[] }) {
  const [indice, setIndice]       = useState(0);
  const [reproduciendo, setRepro] = useState(true);
  const [silenciado, setSilenciado] = useState(true);
  const [listo, setListo]         = useState(false);

  const contenedorRef = useRef<HTMLDivElement>(null);
  const playerRef     = useRef<YTPlayer | null>(null);
  const videoRef      = useRef<HTMLVideoElement | null>(null);
  // El callback de YouTube se registra una sola vez, así que necesita leer el
  // índice actual sin quedar congelado en el valor del primer render.
  const indiceRef     = useRef(0);
  const clipsRef      = useRef(clips);

  useEffect(() => { indiceRef.current = indice; }, [indice]);
  useEffect(() => { clipsRef.current = clips; }, [clips]);

  const actual = clips[indice];
  const esUltimo = indice >= clips.length - 1;

  // Clave estable basada en el CONTENIDO de la lista. Si el componente padre
  // vuelve a crear el array en cada render (algo muy fácil de que pase), la
  // identidad cambia pero la clave no, y el reproductor no se reinicia.
  const clave = useMemo(() => clips.map(c => c.url).join('|'), [clips]);

  const siguiente = useCallback(() => {
    setIndice(i => (i < clipsRef.current.length - 1 ? i + 1 : i));
  }, []);

  const alTerminar = useCallback(() => {
    if (indiceRef.current < clipsRef.current.length - 1) {
      setIndice(i => i + 1);
    } else {
      setRepro(false);   // fin de la secuencia
    }
  }, []);

  // Al cambiar la traducción se vuelve al principio
  useEffect(() => {
    setIndice(0);
    setRepro(true);
  }, [clave]);

  // ── Reproductor de YouTube ────────────────────────────────────────────────
  useEffect(() => {
    if (!clips.length || !esYouTube(clips[0].url)) return;
    let cancelado = false;

    cargarYouTubeAPI().then(() => {
      if (cancelado || !contenedorRef.current || !window.YT) return;
      if (playerRef.current) return;

      const primerId = idDeYouTube(clips[0].url);
      if (!primerId) return;

      playerRef.current = new window.YT.Player(contenedorRef.current, {
        videoId: primerId,
        playerVars: {
          autoplay: 1, controls: 1, rel: 0,
          modestbranding: 1, playsinline: 1, mute: 1,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            setListo(true);
            e.target.mute();
            e.target.playVideo();
          },
          onStateChange: (e: { data: number }) => {
            if (e.data === window.YT?.PlayerState.ENDED) alTerminar();
          },
        },
      });
    });

    return () => {
      cancelado = true;
      try { playerRef.current?.destroy(); } catch { /* ignorar */ }
      playerRef.current = null;
      setListo(false);
    };
    // Depende de la CLAVE, no del array: así el player sobrevive a los
    // renders del padre y solo se recrea si cambian los videos de verdad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, alTerminar]);

  // Cargar el video que corresponde al índice actual
  useEffect(() => {
    if (!listo || !playerRef.current || !actual) return;
    if (!esYouTube(actual.url)) return;
    const id = idDeYouTube(actual.url);
    if (id) playerRef.current.loadVideoById(id);
  }, [indice, listo, actual]);

  // ── Reproductor nativo (videos que no son de YouTube) ─────────────────────
  useEffect(() => {
    if (!actual || esYouTube(actual.url) || !videoRef.current) return;
    videoRef.current.load();
    if (reproduciendo) videoRef.current.play().catch(() => null);
  }, [indice, actual, reproduciendo]);

  const alternarSonido = () => {
    const p = playerRef.current;
    if (p) {
      if (silenciado) { p.unMute(); } else { p.mute(); }
    }
    if (videoRef.current) videoRef.current.muted = !silenciado;
    setSilenciado(s => !s);
  };

  const reiniciar = () => { setIndice(0); setRepro(true); };

  if (!clips.length) return null;

  const usaYouTube = esYouTube(clips[0].url);

  return (
    <div>
      <div style={{
        position: 'relative', background: '#000',
        borderRadius: 'var(--radius)', overflow: 'hidden',
        aspectRatio: '16 / 9', minHeight: 240,
      }}>
        {usaYouTube ? (
          <div ref={contenedorRef} style={{ width: '100%', height: '100%' }} />
        ) : (
          <video
            ref={videoRef}
            src={urlCompleta(actual?.url ?? '')}
            controls
            muted={silenciado}
            playsInline
            onEnded={alTerminar}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        )}

        {/* Contador de posición en la secuencia */}
        {clips.length > 1 && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(0,0,0,0.7)', color: 'white',
            padding: '3px 10px', borderRadius: 20,
            fontSize: '0.75rem', fontWeight: 700, pointerEvents: 'none',
          }}>
            {indice + 1} / {clips.length}
          </span>
        )}
      </div>

      {/* Lista de señas: la que se está reproduciendo va resaltada y se puede
          hacer clic para saltar a cualquiera */}
      {clips.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {clips.map((c, i) => (
            <button
              key={`${c.word}-${i}`}
              onClick={() => { setIndice(i); setRepro(true); }}
              title={`Reproducir "${c.word}"`}
              style={{
                padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                fontSize: '0.8rem', fontWeight: i === indice ? 700 : 500,
                fontFamily: 'var(--font-body)',
                border: `1.5px solid ${i === indice ? 'var(--violet)' : 'var(--gray-200)'}`,
                background: i === indice ? 'var(--violet)' : 'var(--white)',
                color: i === indice ? 'white' : 'var(--gray-800)',
              }}
            >
              {i + 1}. {c.word}
            </button>
          ))}
        </div>
      )}

      {/* Controles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
        <button
          onClick={reiniciar}
          style={botonControl}
        >
          ↻ Reproducir todo
        </button>

        {!esUltimo && (
          <button onClick={siguiente} style={botonControl}>
            ⏭ Siguiente seña
          </button>
        )}

        <button onClick={alternarSonido} style={botonControl}>
          {silenciado ? '🔇 Activar sonido' : '🔊 Silenciar'}
        </button>

        <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginLeft: 'auto' }}>
          {clips.length > 1
            ? (reproduciendo ? 'Reproduciendo en secuencia' : 'Secuencia terminada')
            : ''}
        </span>
      </div>
    </div>
  );
}

const botonControl: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
  border: '1.5px solid var(--gray-200)', background: 'var(--white)',
  color: 'var(--gray-800)', fontSize: '0.8rem', fontWeight: 600,
  fontFamily: 'var(--font-body)',
};