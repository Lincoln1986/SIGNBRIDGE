import { useState, useRef, useCallback, useEffect } from 'react';

export type SpeechState = 'idle' | 'listening' | 'processing' | 'unsupported';

interface UseSpeechRecognitionReturn {
  state: SpeechState;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

interface UseSpeechRecognitionOptions {
  /**
   * Se invoca con el texto final dictado en el mismo instante en que el hook
   * pasa a estado `processing`. Es el punto natural para reaccionar al
   * dictado: al ser una llamada desde un callback del evento `onresult` (una
   * suscripción a un sistema externo), el consumidor no necesita un effect
   * que haga setState síncrono.
   */
  onFinalText?: (text: string) => void;
}

// Declaración de tipos para la Web Speech API (no incluida en lib.dom por defecto)
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  // lib.dom de TypeScript no declara la interfaz SpeechRecognition
  // (API de reconocimiento de voz, aún no estándar), sólo sus eventos.
  interface SpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    maxAlternatives: number;
    onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
    onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };
}

/**
 * Hook para reconocimiento de voz usando la Web Speech API del navegador.
 * Compatible con Chrome y Edge. Firefox requiere una flag experimental.
 */
export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionAPI;

  const [state, setState] = useState<SpeechState>(isSupported ? 'idle' : 'unsupported');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // El callback se guarda en un ref para que `startListening` (useCallback de
  // dependencias fijas) siempre invoque la última versión sin recrearse.
  const onFinalTextRef = useRef<((text: string) => void) | null>(null);
  useEffect(() => {
    onFinalTextRef.current = options.onFinalText ?? null;
  }, [options.onFinalText]);

  useEffect(() => {
    return () => {
      // Limpiar al desmontar el componente
      recognitionRef.current?.stop();
    };
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
      return;
    }

    setError(null);

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'es-CO';          // Español de Colombia
    recognition.interimResults = true;    // Resultados en tiempo real
    recognition.continuous = false;       // Para cuando detecte silencio
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      // Actualizar transcript con texto final o interim
      setTranscript(prev => {
        const base = finalText || prev;
        return finalText ? base : base + interimText;
      });

      if (finalText) {
        const texto = finalText.trim();
        setTranscript(texto);
        setState('processing');
        onFinalTextRef.current?.(texto);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed') {
        setError('Permiso de micrófono denegado. Habilítalo en tu navegador.');
      } else if (event.error === 'no-speech') {
        setError('No se detectó voz. Intenta hablar más cerca del micrófono.');
      } else if (event.error === 'network') {
        setError('Error de red en el reconocimiento de voz.');
      } else {
        setError('Error en el reconocimiento de voz: ' + event.error);
      }
      setState('idle');
    };

    recognition.onend = () => {
      setState(prev => prev === 'listening' ? 'idle' : prev);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [SpeechRecognitionAPI]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setState('idle');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
    setState('idle');
  }, []);

  return { state, transcript, error, isSupported, startListening, stopListening, resetTranscript };
}
