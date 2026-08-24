import { useState, useEffect, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { translationApi, dashboardApi, feedbackApi, lastSession } from '../api/client';
import type { TextToSignResponse, VozToSignResponse, SignUnit, LexicalUnit } from '../api/client';
import { Btn, Card, Alert, Spinner } from '../components/UI';

// ── Tipos locales ──────────────────────────────────────────────────────────

type TranslationMode = 'text' | 'voice';

// Respuesta normalizada — unifica TextoTraduccionResponse y VozTraduccionResponse
interface NormalizedResult {
  id_session: string;
  signs: SignUnit[];
  untranslated_words?: string[];
  message?: string;
}

interface ConversationEntry {
  id: number;
  input: string;
  result: NormalizedResult;
  timestamp: Date;
}

// ── Reproductor de señas ───────────────────────────────────────────────────

function SignPlayer({
  result,
  isLoading,
  lexicon,
}: {
  result: NormalizedResult | null;
  isLoading: boolean;
  lexicon: LexicalUnit[];
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Busca el primer video disponible: primero en la respuesta del backend,
  // luego en el diccionario local por nombre de seña
  const findVideo = (signs: SignUnit[]): string | null => {
    for (const sign of signs) {
      if (sign.video_url) return sign.video_url;
    }
    for (const sign of signs) {
      const match = lexicon.find(
        u => u.text?.toLowerCase() === sign.word.toLowerCase() && u.video_url
      );
      if (match?.video_url) return match.video_url;
    }
    return null;
  };

  const videoUrl = result?.signs?.length ? findVideo(result.signs) : null;

  const isYouTube = videoUrl
    ? videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')
    : false;

  const getEmbed = (url: string) => {
    if (url.includes('youtube.com/embed/')) return url;
    const s = url.match(/youtu\.be\/([^?&]+)/);
    if (s) return `https://www.youtube.com/embed/${s[1]}`;
    const w = url.match(/[?&]v=([^?&]+)/);
    if (w) return `https://www.youtube.com/embed/${w[1]}`;
    return url;
  };

  useEffect(() => {
    if (videoUrl && !isYouTube && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => null);
    }
  }, [videoUrl, isYouTube]);

  const noVideoYet = result && !isLoading && !videoUrl;

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
            Buscando seña…
          </p>
        </div>
      )}

      {/* Video del diccionario o de la respuesta */}
      {!isLoading && videoUrl && (
        isYouTube ? (
          <iframe
            src={`${getEmbed(videoUrl)}?autoplay=1`}
            style={{ width: '100%', height: '100%', minHeight: 300, border: 'none', display: 'block' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            loop
            playsInline
            style={{ width: '100%', objectFit: 'contain' }}
          />
        )
      )}

      {/* Seña no disponible — mensaje claro, sin error técnico */}
      {noVideoYet && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', margin: '0 auto 16px',
          }}>
            🤟
          </div>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>
            Seña no disponible todavía
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', lineHeight: 1.6, maxWidth: 260, margin: '0 auto' }}>
            Esta seña aún no tiene video en el diccionario LSC.
            Puedes consultar el vocabulario disponible en la sección{' '}
            <a href="/vocabulary" style={{ color: 'var(--amber)', fontWeight: 600 }}>
              Vocabulario
            </a>.
          </p>
          {/* Chips de señas detectadas */}
          {result.signs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 14 }}>
              {result.signs.map((sign, i) => (
                <span key={i} style={{
                  background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)',
                  padding: '4px 12px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600,
                }}>
                  {sign.word}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estado vacío inicial */}
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
  const [result, setResult] = useState<NormalizedResult | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [showConversation, setShowConversation] = useState(false);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const [lexicon, setLexicon] = useState<LexicalUnit[]>([]);

  // ── Sesión activa — capturada de la respuesta del backend ──────────────
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // ── Estado del formulario de feedback ─────────────────────────────────
  const [showFeedback, setShowFeedback] = useState(false);
  const [fbRating, setFbRating] = useState(0);
  const [fbComment, setFbComment] = useState('');
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbMsg, setFbMsg] = useState('');

  useEffect(() => {
    dashboardApi.lexicalUnits()
      .then(r => setLexicon(r.data))
      .catch(() => {});
    // Al desmontar, limpiar sesión activa
    return () => { setActiveSessionId(null); };
  }, []);

  const {
    state: speechState,
    transcript,
    error: speechError,
    isSupported: speechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setTextInput(transcript);
  }, [transcript]);

  useEffect(() => {
    if (speechState === 'processing' && transcript.trim()) {
      handleTranslate(transcript.trim(), 'voice');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speechState]);

  const handleTranslate = useCallback(async (text?: string, inputMode: TranslationMode = 'text') => {
    const input = (text ?? textInput).trim();
    if (!input) return;

    setIsTranslating(true);
    setTranslationError(null);

    try {
      let normalized: NormalizedResult;

      if (inputMode === 'voice') {
        // Usar /api/traduccion/voz para dictado
        const res = await translationApi.vozToSign(input, activeSessionId ?? undefined, 'es-CO');
        const d: VozToSignResponse = res.data;
        normalized = {
          id_session: d.id_session,
          signs: d.signs,
          untranslated_words: d.untranslated_words,
          message: d.message,
        };
      } else {
        // Usar /api/traduccion/texto para texto libre
        const res = await translationApi.textToSign(input, activeSessionId ?? undefined);
        const d: TextToSignResponse = res.data;
        normalized = {
          id_session: d.id_session,
          signs: d.signs,
          untranslated_words: d.untranslated_words,
          message: d.message,
        };
      }

      // Guardar id_session real del backend
      setActiveSessionId(normalized.id_session);
      // Persistir como "última sesión" para que Mi Panel > Valoraciones pueda usarla
      lastSession.set(normalized.id_session);
      setResult(normalized);

      setConversation(prev => [...prev, {
        id: Date.now(),
        input,
        result: normalized,
        timestamp: new Date(),
      }]);
      setShowConversation(true);
      setTimeout(() => conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setTranslationError(
        axiosErr.response?.data?.detail ??
        'Error al traducir. Verifica que el backend esté activo.'
      );
    } finally {
      setIsTranslating(false);
    }
  }, [textInput, activeSessionId]);

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

  const handleClearConversation = useCallback(() => {
    setConversation([]);
    setResult(null);
    setShowConversation(false);
    setActiveSessionId(null);
  }, []);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSessionId || fbRating === 0) return;
    setFbSubmitting(true);
    try {
      await feedbackApi.create({
        id_session: activeSessionId,
        rating: fbRating,
        comment: fbComment.trim() || undefined,
      });
      setFbMsg('✅ ¡Gracias por tu valoración!');
      setFbRating(0);
      setFbComment('');
      setShowFeedback(false);
      setTimeout(() => setFbMsg(''), 3000);
    } catch {
      setFbMsg('❌ No se pudo enviar. Intenta de nuevo.');
    } finally {
      setFbSubmitting(false);
    }
  };

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
                        onClick={() => handleTranslate(undefined, 'voice')}
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
                <span>🤟</span> Seña LSC
                {isTranslating && <Spinner size={16} />}
              </h2>
            </div>
            <SignPlayer result={result} isLoading={isTranslating} lexicon={lexicon} />
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
                      background: sign.found ? 'var(--violet-light)' : 'var(--gray-100)',
                      color: sign.found ? 'var(--violet)' : 'var(--gray-400)',
                      padding: '5px 12px',
                      borderRadius: 20,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                    }}
                  >
                    {sign.word}{!sign.found && ' (sin seña)'}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Formulario de valoración de sesión */}
          {activeSessionId && (
            <Card style={{ border: showFeedback ? '1.5px solid var(--violet)' : '1.5px solid var(--gray-100)' }}>
              {fbMsg && (
                <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10,
                  color: fbMsg.startsWith('✅') ? '#15803D' : '#DC2626' }}>
                  {fbMsg}
                </p>
              )}
              {!showFeedback ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                    ¿Cómo fue esta sesión?
                  </p>
                  <Btn size="sm" onClick={() => setShowFeedback(true)}>
                    ⭐ Valorar sesión
                  </Btn>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-800)', marginBottom: 4 }}>
                    Valorar esta sesión
                  </h3>
                  {/* Estrellas */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4,5].map(n => (
                      <button
                        key={n} type="button" onClick={() => setFbRating(n)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: '1.6rem', padding: 0, lineHeight: 1,
                          color: n <= fbRating ? '#f59e0b' : '#e5e7eb',
                          transition: 'color 0.1s',
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={fbComment}
                    onChange={e => setFbComment(e.target.value)}
                    placeholder="Comentario opcional…"
                    rows={2}
                    style={{
                      padding: '8px 12px', border: '1.5px solid var(--gray-200)',
                      borderRadius: 8, fontSize: '0.88rem', fontFamily: 'var(--font-body)',
                      outline: 'none', resize: 'vertical',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--violet)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--gray-200)'; }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Btn variant="ghost" size="sm" type="button" onClick={() => setShowFeedback(false)}>
                      Cancelar
                    </Btn>
                    <Btn size="sm" type="submit" disabled={fbRating === 0 || fbSubmitting} loading={fbSubmitting}>
                      Enviar
                    </Btn>
                  </div>
                </form>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ── Historial de conversación ── */}
      {conversation.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Modo conversación
              </p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-800)' }}>
                Historial de traducciones ({conversation.length})
              </h2>
            </div>
            <button
              onClick={handleClearConversation}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--gray-400)', fontWeight: 600, fontFamily: 'var(--font-body)' }}
            >
              Limpiar historial
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {conversation.map(entry => (
              <Card key={entry.id} style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--violet-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                      🗣️
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--gray-800)' }}>
                      {entry.input}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', flexShrink: 0, marginLeft: 12 }}>
                    {entry.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {entry.result.signs.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', fontWeight: 600, alignSelf: 'center', marginRight: 4 }}>🤟</span>
                    {entry.result.signs.map((s, i) => (
                      <span key={i} style={{ background: 'var(--violet-light)', color: 'var(--violet)', padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600 }}>
                        {s.word}
                      </span>
                    ))}
                  </div>
                )}
                {entry.result.message && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                    {entry.result.message}
                  </p>
                )}
                <button
                  onClick={() => { setTextInput(entry.input); handleTranslate(entry.input, 'text'); }}
                  style={{ marginTop: 8, background: 'none', border: '1.5px solid var(--gray-200)', color: 'var(--gray-600)', padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  🔄 Repetir
                </button>
              </Card>
            ))}
            <div ref={conversationEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}