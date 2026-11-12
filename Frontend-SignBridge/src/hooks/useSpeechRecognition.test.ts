import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpeechRecognition } from './useSpeechRecognition';

// Doble del reconocedor: expone los callbacks para que el test los dispare
// como lo haría el navegador.
class FakeRecognition {
  constructor() {
    instances.push(this);
  }
  lang = '';
  interimResults = false;
  continuous = false;
  maxAlternatives = 0;
  onstart: (() => void) | null = null;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}

let instances: FakeRecognition[] = [];

beforeEach(() => {
  instances = [];
  window.SpeechRecognition = FakeRecognition as never;
});

afterEach(() => {
  delete (window as { SpeechRecognition?: unknown }).SpeechRecognition;
  delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
});

const startAndGet = () => {
  const hook = renderHook(() => useSpeechRecognition());
  act(() => hook.result.current.startListening());
  return { hook, rec: instances[instances.length - 1] };
};

describe('useSpeechRecognition', () => {
  it('arranca en idle cuando el navegador soporta la API', () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
    expect(result.current.state).toBe('idle');
  });

  it('marca unsupported si no hay SpeechRecognition', () => {
    delete (window as { SpeechRecognition?: unknown }).SpeechRecognition;
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(false);
    expect(result.current.state).toBe('unsupported');
  });

  it('startListening configura el reconocedor en español y pasa a listening', () => {
    const { hook, rec } = startAndGet();
    expect(rec.start).toHaveBeenCalled();
    expect(rec.lang).toBe('es-CO');
    expect(rec.interimResults).toBe(true);

    act(() => rec.onstart?.());
    expect(hook.result.current.state).toBe('listening');
  });

  it('acumula resultados intermedios y reemplaza con el final', () => {
    const { hook, rec } = startAndGet();

    act(() => rec.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: false, 0: { transcript: 'buenas ' } }],
    }));
    expect(hook.result.current.transcript).toBe('buenas ');

    act(() => rec.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'buenas noches' } }],
    }));
    expect(hook.result.current.transcript).toBe('buenas noches');
    expect(hook.result.current.state).toBe('processing');
  });

  it('sin soporta muestra error al intentar escuchar', () => {
    delete (window as { SpeechRecognition?: unknown }).SpeechRecognition;
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.startListening());
    expect(result.current.error).toMatch(/no soporta reconocimiento de voz/);
  });

  it('mapea los errores del navegador a mensajes en español', () => {
    const { hook, rec } = startAndGet();

    act(() => rec.onerror?.({ error: 'not-allowed' }));
    expect(hook.result.current.error).toMatch(/Permiso de micrófono denegado/);
    expect(hook.result.current.state).toBe('idle');

    act(() => rec.onerror?.({ error: 'no-speech' }));
    expect(hook.result.current.error).toMatch(/No se detectó voz/);

    act(() => rec.onerror?.({ error: 'network' }));
    expect(hook.result.current.error).toMatch(/Error de red/);

    act(() => rec.onerror?.({ error: 'otro' }));
    expect(hook.result.current.error).toMatch(/Error en el reconocimiento de voz: otro/);
  });

  it('onend devuelve a idle y limpia la referencia', () => {
    const { hook, rec } = startAndGet();
    act(() => rec.onstart?.());
    act(() => rec.onend?.());
    expect(hook.result.current.state).toBe('idle');
  });

  it('stopListening detiene y vuelve a idle', () => {
    const { hook, rec } = startAndGet();
    act(() => rec.onstart?.());
    act(() => hook.result.current.stopListening());
    expect(rec.stop).toHaveBeenCalled();
    expect(hook.result.current.state).toBe('idle');
  });

  it('resetTranscript limpia texto y error', () => {
    const { hook, rec } = startAndGet();
    act(() => rec.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'hola' } }],
    }));
    act(() => hook.result.current.resetTranscript());
    expect(hook.result.current.transcript).toBe('');
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.state).toBe('idle');
  });
});
