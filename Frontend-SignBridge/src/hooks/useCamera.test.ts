import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCamera } from './useCamera';

const track = { stop: vi.fn() };
const fakeStream = { getTracks: () => [track] } as unknown as MediaStream;

const getUserMedia = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'mediaDevices');
});

describe('useCamera', () => {
  it('arranca en idle', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.permission).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('marca unavailable si el navegador no soporta getUserMedia', async () => {
    Reflect.deleteProperty(navigator, 'mediaDevices');
    const { result } = renderHook(() => useCamera());
    await act(() => result.current.requestCamera());
    expect(result.current.permission).toBe('unavailable');
    expect(result.current.error).toMatch(/no soporta acceso a la cámara/);
  });

  it('concede permiso y guarda el stream', async () => {
    getUserMedia.mockResolvedValue(fakeStream);
    const { result } = renderHook(() => useCamera());
    await act(() => result.current.requestCamera());
    expect(getUserMedia).toHaveBeenCalledWith({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });
    expect(result.current.permission).toBe('granted');
    expect(result.current.stream).toBe(fakeStream);
  });

  it('permiso denegado → denied con mensaje', async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }));
    const { result } = renderHook(() => useCamera());
    await act(() => result.current.requestCamera());
    expect(result.current.permission).toBe('denied');
    expect(result.current.error).toMatch(/Permiso de cámara denegado/);
  });

  it('sin cámara → unavailable', async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotFoundError' }));
    const { result } = renderHook(() => useCamera());
    await act(() => result.current.requestCamera());
    expect(result.current.permission).toBe('unavailable');
    expect(result.current.error).toMatch(/No se encontró una cámara/);
  });

  it('cámara ocupada → unavailable', async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error('x'), { name: 'NotReadableError' }));
    const { result } = renderHook(() => useCamera());
    await act(() => result.current.requestCamera());
    expect(result.current.permission).toBe('unavailable');
    expect(result.current.error).toMatch(/siendo usada por otra aplicación/);
  });

  it('error desconocido → denied con el detalle', async () => {
    getUserMedia.mockRejectedValue(Object.assign(new Error('algo raro'), { name: 'TypeError' }));
    const { result } = renderHook(() => useCamera());
    await act(() => result.current.requestCamera());
    expect(result.current.permission).toBe('denied');
    expect(result.current.error).toMatch(/algo raro/);
  });

  it('stopCamera detiene los tracks y vuelve a idle', async () => {
    getUserMedia.mockResolvedValue(fakeStream);
    const { result } = renderHook(() => useCamera());
    await act(() => result.current.requestCamera());
    act(() => result.current.stopCamera());
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.permission).toBe('idle');
    expect(result.current.stream).toBeNull();
  });

  it('captureFrame devuelve null sin video disponible', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.captureFrame()).toBeNull();
  });
});
