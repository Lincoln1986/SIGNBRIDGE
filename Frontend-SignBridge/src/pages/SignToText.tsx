import { useEffect, useRef, useState, useCallback } from 'react';
import { useCamera } from '../hooks/useCamera';
import { translationApi } from '../api/client';
import type { SignToTextResponse } from '../api/client';
import { Btn, Card, Alert, Spinner } from '../components/UI';

// ── Constantes ─────────────────────────────────────────────────────────────

const CAPTURE_INTERVAL_MS = 1500; // Capturar un frame cada 1.5 segundos

// ── Componente principal ───────────────────────────────────────────────────

export default function SignToText() {
  const { permission, videoRef, error: cameraError, requestCamera, stopCamera, captureFrame } =
    useCamera();

  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [lastResult, setLastResult] = useState<SignToTextResponse | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Conectar el stream al <video> cuando se habilite la cámara
  const handleVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
      if (node && permission === 'granted') {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then(s => { node.srcObject = s; })
          .catch(() => null);
      }
    },
    [permission, videoRef]
  );

  // Enviar frame al backend
  const sendFrame = useCallback(async () => {
    const frame = captureFrame();
    if (!frame) return;

    try {
      // El backend espera "frame_base64", no "frame" — translationApi.signToText lo maneja
      const res = await translationApi.signToText(frame);
      const data = res.data;
      setLastResult(data);

      if (data.detected_sign && data.detected_sign.trim()) {
        setTranslatedText(data.detected_sign);
        setHistory(prev => {
          const last = prev[prev.length - 1];
          return last === data.detected_sign ? prev : [...prev, data.detected_sign!];
        });
        setTranslationError(null);
      }
    } catch {
      // No mostrar error por cada frame fallido; solo si persiste
    }
  }, [captureFrame]);

  // Iniciar/detener el bucle de captura
  const startTranslation = useCallback(() => {
    setIsTranslating(true);
    setTranslationError(null);
    intervalRef.current = setInterval(sendFrame, CAPTURE_INTERVAL_MS);
  }, [sendFrame]);

  const stopTranslation = useCallback(() => {
    setIsTranslating(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleStop = useCallback(() => {
    stopTranslation();
    stopCamera();
  }, [stopTranslation, stopCamera]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setTranslatedText('');
    setLastResult(null);
  }, []);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopTranslation();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{
          fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>
          Traducción en tiempo real
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', color: 'var(--gray-800)',
        }}>
          🤟 Señas a Texto
        </h1>
        <p style={{ color: 'var(--gray-400)', marginTop: 6, fontSize: '0.9rem', lineHeight: 1.6 }}>
          Activa tu cámara y realiza señas en LSC. El sistema las traducirá a texto en tiempo real.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 0.8fr)',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* ── Panel izquierdo: cámara ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Cámara */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              background: 'var(--gray-800)',
              borderRadius: 'var(--radius)',
              minHeight: 360,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Video element — siempre presente, visible solo con stream activo */}
              <video
                ref={handleVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: permission === 'granted' ? 'block' : 'none',
                  transform: 'scaleX(-1)', // Efecto espejo para mayor naturalidad
                }}
              />

              {/* Estado: idle o requesting */}
              {(permission === 'idle' || permission === 'requesting') && (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '2.2rem', margin: '0 auto 20px',
                  }}>
                    📷
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {permission === 'requesting'
                      ? 'Solicitando acceso a la cámara…'
                      : 'Activa la cámara para comenzar la traducción'}
                  </p>
                  {permission === 'requesting' && (
                    <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                      <Spinner color="white" />
                    </div>
                  )}
                </div>
              )}

              {/* Estado: denegado o no disponible */}
              {(permission === 'denied' || permission === 'unavailable') && (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>
                    {permission === 'denied' ? '🚫' : '📵'}
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>
                    {permission === 'denied' ? 'Acceso denegado' : 'Cámara no disponible'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                    {cameraError}
                  </p>
                </div>
              )}

              {/* Indicador de grabación */}
              {isTranslating && (
                <div style={{
                  position: 'absolute', top: 14, left: 14,
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'rgba(0,0,0,0.55)', borderRadius: 20,
                  padding: '5px 12px',
                }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: '#ef4444',
                    animation: 'pulse-dot 1s ease-in-out infinite',
                  }} />
                  <span style={{ color: 'white', fontSize: '0.78rem', fontWeight: 600 }}>
                    Traduciendo…
                  </span>
                  <style>{`
                    @keyframes pulse-dot {
                      0%, 100% { opacity: 1; transform: scale(1); }
                      50% { opacity: 0.4; transform: scale(0.8); }
                    }
                  `}</style>
                </div>
              )}

              {/* Confianza de la última detección */}
              {lastResult?.confidence !== undefined && permission === 'granted' && (
                <div style={{
                  position: 'absolute', top: 14, right: 14,
                  background: 'rgba(0,0,0,0.55)', borderRadius: 20,
                  padding: '5px 12px',
                }}>
                  <span style={{ color: 'white', fontSize: '0.78rem', fontWeight: 600 }}>
                    Confianza: {Math.round(lastResult.confidence * 100)}%
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Controles de cámara */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {permission === 'idle' || permission === 'denied' || permission === 'unavailable' ? (
              <Btn
                onClick={requestCamera}
                disabled={permission === 'requesting'}
                style={{ flex: 1 }}
              >
                {permission === 'denied' ? '🔄 Reintentar permiso' : '📷 Activar cámara'}
              </Btn>
            ) : (
              <>
                {!isTranslating ? (
                  <Btn
                    onClick={startTranslation}
                    disabled={permission !== 'granted'}
                    style={{ flex: 1 }}
                  >
                    ▶ Iniciar traducción
                  </Btn>
                ) : (
                  <Btn
                    variant="secondary"
                    onClick={stopTranslation}
                    style={{ flex: 1 }}
                  >
                    ⏸ Pausar
                  </Btn>
                )}
                <Btn variant="danger" onClick={handleStop}>
                  ⏹ Detener cámara
                </Btn>
              </>
            )}
          </div>

          {/* Mensaje de error de cámara */}
          {cameraError && permission !== 'idle' && (
            <Alert type="error" message={cameraError} />
          )}
        </div>

        {/* ── Panel derecho: traducción ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Texto traducido actual */}
          <Card>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 12,
            }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.95rem', color: 'var(--gray-800)',
              }}>
                Traducción actual
              </h2>
              {lastResult?.detected_sign && (
                <span style={{
                  fontSize: '0.72rem', fontWeight: 600,
                  background: 'var(--violet-light)', color: 'var(--violet)',
                  padding: '3px 10px', borderRadius: 20,
                }}>
                  {lastResult.detected_sign}
                </span>
              )}
            </div>

            <div style={{
              minHeight: 100,
              background: 'var(--gray-50)',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--gray-100)',
              padding: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: translatedText ? 'flex-start' : 'center',
            }}>
              {translatedText ? (
                <p style={{
                  fontSize: '1.4rem', fontWeight: 700,
                  color: 'var(--gray-800)', lineHeight: 1.4,
                  fontFamily: 'var(--font-display)',
                }}>
                  {translatedText}
                </p>
              ) : (
                <p style={{ color: 'var(--gray-400)', fontSize: '0.88rem', textAlign: 'center' }}>
                  {isTranslating
                    ? 'Realizando señas frente a la cámara…'
                    : 'El texto traducido aparecerá aquí'}
                </p>
              )}
            </div>
          </Card>

          {/* Historial de traducciones */}
          {history.length > 0 && (
            <Card>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 12,
              }}>
                <h2 style={{
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  fontSize: '0.95rem', color: 'var(--gray-800)',
                }}>
                  Conversación
                </h2>
                <button
                  onClick={clearHistory}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.78rem', color: 'var(--gray-400)', fontWeight: 600,
                  }}
                >
                  Limpiar
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {history.slice().reverse().map((text, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '8px 12px',
                      background: i === 0 ? 'var(--violet-light)' : 'var(--gray-50)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.88rem',
                      color: i === 0 ? 'var(--violet)' : 'var(--gray-600)',
                      fontWeight: i === 0 ? 600 : 400,
                      border: `1px solid ${i === 0 ? 'transparent' : 'var(--gray-100)'}`,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <span style={{ fontSize: '0.8rem' }}>{i === 0 ? '🟣' : '⚫'}</span>
                    {text}
                  </div>
                ))}
              </div>

              {/* Frase completa formada */}
              {history.length > 1 && (
                <div style={{
                  marginTop: 14,
                  padding: 14,
                  background: 'linear-gradient(135deg, var(--violet), #4338ca)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <p style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    color: 'rgba(255,255,255,0.7)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
                  }}>
                    Frase construida
                  </p>
                  <p style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {history.join(' ')}
                  </p>
                  <button
                    onClick={() => navigator.clipboard?.writeText(history.join(' '))}
                    style={{ marginTop: 8, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '5px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                  >
                    📋 Copiar frase
                  </button>
                </div>
              )}
            </Card>
          )}

          {/* Error de traducción */}
          {translationError && <Alert type="error" message={translationError} />}

          {/* Instrucciones */}
          <Card style={{ background: 'var(--violet-light)', border: 'none' }}>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.88rem', color: 'var(--violet)', marginBottom: 10,
            }}>
              💡 Cómo usar
            </h3>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Activa la cámara y concede el permiso cuando el navegador lo solicite.',
                'Posiciona tu mano(s) en el centro del encuadre.',
                'Presiona "Iniciar traducción" y realiza señas en LSC.',
                'El texto traducido aparecerá automáticamente en pantalla.',
              ].map((step, i) => (
                <li key={i} style={{ fontSize: '0.82rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>
                  {step}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
