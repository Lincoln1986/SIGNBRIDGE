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

// Declaración de tipos para la Web Speech API (no incluida en lib.dom por defecto)
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

/**
 * Hook para reconocimiento de voz usando la Web Speech API del navegador.
 * Compatible con Chrome y Edge. Firefox requiere una flag experimental.
 */
export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognitionAPI;

  const [state, setState] = useState<SpeechState>(isSupported ? 'idle' : 'unsupported');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
        setTranscript(finalText.trim());
        setState('processing');
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
