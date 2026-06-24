import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { translationApi } from '../api/client';
import type { TextToSignResponse } from '../api/client';
import { Btn, Card, Alert, Spinner, Input } from '../components/UI';

// ── Tipos locales ──────────────────────────────────────────────────────────

type TranslationMode = 'text' | 'voice';

// ── Componente de avatar / reproductor de señas ────────────────────────────

function SignPlayer({
  result,
  isLoading,
}: {
  result: TextToSignResponse | null;
  isLoading: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (result?.video_url && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => null);
    }
  }, [result?.video_url]);

  return (
    <div style={{
      background: 'var(--gray-800)',
      borderRadius: 'var(--radius)',
      minHeight: 340,
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
            Generando señas…
          </p>
        </div>
      )}

      {/* Video de señas */}
      {!isLoading && result?.video_url && (
        <video
          ref={videoRef}
          src={result.video_url}
          controls
          autoPlay
          loop
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      )}

      {/* Lista de señas (fallback si no hay video) */}
      {!isLoading && result && !result.video_url && result.signs.length > 0 && (
        <div style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🤟</div>
          <p style={{
            color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
          }}>
            Señas detectadas
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {result.signs.map((sign, i) => (
              <span
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: 'white',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                {sign}
              </span>
            ))}
          </div>
          {result.message && (
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginTop: 14, lineHeight: 1.5 }}>
              {result.message}
            </p>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {!isLoading && !result && (
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

// ── Componente principal ───────────────────────────────────────────────────

export default function VoiceToSign() {
  const [mode, setMode] = useState<TranslationMode>('text');
  const [textInput, setTextInput] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [result, setResult] = useState<TextToSignResponse | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const {
    state: speechState,
    transcript,
    error: speechError,
    isSupported: speechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Cuando el reconocimiento de voz obtiene un resultado, sincronizarlo al input
  useEffect(() => {
    if (transcript) {
      setTextInput(transcript);
    }
  }, [transcript]);

  // Cuando el speech processing termina, ejecutar la traducción automáticamente
  useEffect(() => {
    if (speechState === 'processing' && transcript.trim()) {
      handleTranslate(transcript.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechState]);

  const handleTranslate = useCallback(async (text?: string) => {
    const input = (text ?? textInput).trim();
    if (!input) return;

    setIsTranslating(true);
    setTranslationError(null);

    try {
      const res = await translationApi.textToSign(input);
      setResult(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setTranslationError(
        axiosErr.response?.data?.detail ??
        'Error al traducir. Verifica que el backend esté activo.'
      );
    } finally {
      setIsTranslating(false);
    }
  }, [textInput]);

  const handleVoiceToggle = useCallback(() => {
    if (speechState === 'listening') {
      stopListening();
    } else {
      resetTranscript();
      setTextInput('');
      setResult(null);
      startListening();
    }
  }, [speechState, startListening, stopListening, resetTranscript]);

  const handleClear = useCallback(() => {
    setTextInput('');
    setResult(null);
    setTranslationError(null);
    resetTranscript();
  }, [resetTranscript]);

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{
          fontSize: '0.75rem', fontWeight: 700, color: 'var(--amber)',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
        }}>
          Traducción LSC
        </p>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', color: 'var(--gray-800)',
        }}>
          🎙️ Voz a Señas
        </h1>
        <p style={{ color: 'var(--gray-400)', marginTop: 6, fontSize: '0.9rem', lineHeight: 1.6 }}>
          Escribe texto o habla directamente para obtener su representación en Lengua de Señas Colombiana.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 24,
        alignItems: 'start',
      }}>

        {/* ── Panel izquierdo: entrada ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Selector de modo */}
          <div style={{
            display: 'flex',
            background: 'var(--gray-100)',
            borderRadius: 'var(--radius-sm)',
            padding: 4,
            gap: 4,
          }}>
            {(['text', 'voice'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); handleClear(); }}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  borderRadius: 6,
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  background: mode === m ? 'var(--white)' : 'transparent',
                  color: mode === m ? 'var(--violet)' : 'var(--gray-400)',
                  boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {m === 'text' ? '⌨️ Texto libre' : '🎙️ Dictado por voz'}
              </button>
            ))}
          </div>

          {/* ── Modo texto ── */}
          {mode === 'text' && (
            <Card>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.95rem', color: 'var(--gray-800)', marginBottom: 14,
              }}>
                Escribe el texto a traducir
              </h2>

              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleTranslate();
                  }
                }}
                placeholder="Escribe una palabra, frase o expresión en español…"
                rows={5}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--gray-200)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.95rem',
                  background: 'var(--white)',
                  color: 'var(--gray-800)',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  fontFamily: 'var(--font-body)',
                  lineHeight: 1.6,
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  Ctrl + Enter para traducir
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  {textInput.length} caracteres
                </span>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <Btn
                  onClick={() => handleTranslate()}
                  loading={isTranslating}
                  disabled={!textInput.trim() || isTranslating}
                  style={{ flex: 1 }}
                >
                  Traducir a señas
                </Btn>
                {(textInput || result) && (
                  <Btn variant="ghost" onClick={handleClear}>
                    Limpiar
                  </Btn>
                )}
              </div>
            </Card>
          )}

          {/* ── Modo voz ── */}
          {mode === 'voice' && (
            <Card>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.95rem', color: 'var(--gray-800)', marginBottom: 14,
              }}>
                Dictado por voz
              </h2>

              {!speechSupported ? (
                <Alert
                  type="error"
                  message="Tu navegador no soporta reconocimiento de voz. Usa Google Chrome o Microsoft Edge."
                />
              ) : (
                <>
                  {/* Botón de micrófono */}
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 16, padding: '20px 0',
                  }}>
                    <button
                      onClick={handleVoiceToggle}
                      disabled={speechState === 'processing'}
                      style={{
                        width: 90, height: 90,
                        borderRadius: '50%',
                        border: 'none',
                        cursor: speechState === 'processing' ? 'not-allowed' : 'pointer',
                        background: speechState === 'listening'
                          ? '#ef4444'
                          : 'linear-gradient(135deg, var(--violet), #4338ca)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.2rem',
                        boxShadow: speechState === 'listening'
                          ? '0 0 0 8px rgba(239,68,68,0.2), var(--shadow-lg)'
                          : 'var(--shadow-lg)',
                        transition: 'all 0.2s ease',
                        transform: speechState === 'listening' ? 'scale(1.05)' : 'scale(1)',
                        animation: speechState === 'listening' ? 'mic-pulse 1.5s ease-in-out infinite' : 'none',
                      }}
                    >
                      {speechState === 'processing' ? <Spinner size={32} color="white" /> : '🎙️'}
                    </button>

                    <style>{`
                      @keyframes mic-pulse {
                        0%, 100% { box-shadow: 0 0 0 8px rgba(239,68,68,0.2), var(--shadow-lg); }
                        50% { box-shadow: 0 0 0 18px rgba(239,68,68,0.08), var(--shadow-lg); }
                      }
                    `}</style>

                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        fontWeight: 700, fontSize: '0.9rem',
                        color: speechState === 'listening' ? '#ef4444' : 'var(--gray-800)',
                      }}>
                        {speechState === 'idle' && 'Presiona el micrófono para hablar'}
                        {speechState === 'listening' && 'Escuchando… habla ahora'}
                        {speechState === 'processing' && 'Procesando…'}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 4 }}>
                        Idioma: Español (Colombia)
                      </p>
                    </div>
                  </div>

                  {/* Transcripción en tiempo real */}
                  {textInput && (
                    <div style={{
                      background: 'var(--gray-50)',
                      border: '1.5px solid var(--gray-100)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      marginTop: 4,
                    }}>
                      <p style={{
                        fontSize: '0.75rem', fontWeight: 700,
                        color: 'var(--gray-400)', marginBottom: 6,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        Texto reconocido
                      </p>
                      <p style={{ fontSize: '1rem', color: 'var(--gray-800)', lineHeight: 1.5 }}>
                        {textInput}
                      </p>
                    </div>
                  )}

                  {/* Acciones post-dictado */}
                  {textInput && speechState !== 'listening' && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                      <Btn
                        onClick={() => handleTranslate()}
                        loading={isTranslating}
                        disabled={isTranslating}
                        style={{ flex: 1 }}
                      >
                        Traducir a señas
                      </Btn>
                      <Btn variant="ghost" onClick={handleClear}>
                        Limpiar
                      </Btn>
                    </div>
                  )}
                </>
              )}
            </Card>
          )}

          {/* Errores */}
          {(speechError || translationError) && (
            <Alert type="error" message={speechError ?? translationError ?? ''} />
          )}

          {/* Instrucciones */}
          <Card style={{ background: 'var(--violet-light)', border: 'none' }}>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.88rem', color: 'var(--violet)', marginBottom: 10,
            }}>
              💡 Cómo usar
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet)', marginBottom: 4 }}>
                  ⌨️ Modo texto
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>
                  Escribe cualquier palabra o frase en español y presiona "Traducir a señas" para ver su equivalente en LSC.
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--violet)', marginBottom: 4 }}>
                  🎙️ Modo voz
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--gray-600)', lineHeight: 1.5 }}>
                  Presiona el micrófono, habla claramente en español y el sistema reconocerá tu voz y generará las señas automáticamente.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Panel derecho: avatar/video ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--gray-100)' }}>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.95rem', color: 'var(--gray-800)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>🤟</span> Avatar LSC
                {isTranslating && <Spinner size={16} />}
              </h2>
            </div>
            <SignPlayer result={result} isLoading={isTranslating} />
          </Card>

          {/* Señas detectadas como chips */}
          {result?.signs && result.signs.length > 0 && (
            <Card>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: '0.88rem', color: 'var(--gray-800)', marginBottom: 12,
              }}>
                Señas en la traducción
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.signs.map((sign, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'var(--violet-light)',
                      color: 'var(--violet)',
                      padding: '5px 12px',
                      borderRadius: 20,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    {sign}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
