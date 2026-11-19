// Autor: @Lincoln1986 · S6 (Front: Señas a Texto)
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translationApi } from '../api/client';
import SignToText from './SignToText';

// Doble de la cámara: el test decide el permiso y qué frame "captura".
const camara = vi.hoisted(() => ({
  permission: 'granted' as 'idle' | 'granted' | 'denied' | 'unavailable' | 'requesting',
  videoRef: { current: null },
  error: null as string | null,
  requestCamera: vi.fn(),
  stopCamera: vi.fn(),
  captureFrame: vi.fn(() => 'frame-base64'),
}));

vi.mock('../hooks/useCamera', () => ({ useCamera: () => camara }));

const lectura = (detected_sign: string | null, confidence = 0.9) =>
  ({ data: { detected_sign, confidence, message: '' } }) as never;

/** Avanza el reloj una lectura (el componente captura cada 400 ms). */
const unaLectura = () => act(async () => { await vi.advanceTimersByTimeAsync(400); });

beforeEach(() => {
  vi.useFakeTimers();
  vi.restoreAllMocks();
  Object.assign(camara, { permission: 'granted', error: null });
  camara.captureFrame.mockReturnValue('frame-base64');
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({}) },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('Señas a Texto · cámara', () => {
  it('should ask to turn on the camera', () => {
    camara.permission = 'idle';
    render(<SignToText />);

    fireEvent.click(screen.getByRole('button', { name: '📷 Activar cámara' }));

    expect(camara.requestCamera).toHaveBeenCalled();
    expect(screen.getByText('Activa la cámara para comenzar la traducción')).toBeInTheDocument();
  });

  it('should explain when the permission was denied and let retry', () => {
    camara.permission = 'denied';
    camara.error = 'Permiso de cámara denegado por el usuario';

    render(<SignToText />);

    expect(screen.getByText('Acceso denegado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🔄 Reintentar permiso' })).toBeInTheDocument();
    expect(screen.getAllByText('Permiso de cámara denegado por el usuario')).toHaveLength(2);
  });

  it('should say when there is no camera', () => {
    camara.permission = 'unavailable';

    render(<SignToText />);

    expect(screen.getByText('Cámara no disponible')).toBeInTheDocument();
  });

  it('should stop the camera', () => {
    render(<SignToText />);

    fireEvent.click(screen.getByRole('button', { name: '⏹ Detener cámara' }));

    expect(camara.stopCamera).toHaveBeenCalled();
  });
});

describe('Señas a Texto · deletreo', () => {
  it('should accept a letter only after 3 equal readings (normal speed)', async () => {
    // Arrange
    const enviar = vi.spyOn(translationApi, 'signToText').mockResolvedValue(lectura('A'));
    render(<SignToText />);

    // Act
    fireEvent.click(screen.getByRole('button', { name: '▶ Iniciar traducción' }));
    await unaLectura();
    await unaLectura();

    // Assert: 2 lecturas → todavía candidata
    expect(enviar).toHaveBeenCalledWith('frame-base64');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.queryByText('Conversación')).not.toBeInTheDocument();
    expect(screen.getByText('Confianza: 90%')).toBeInTheDocument();

    await unaLectura();
    expect(screen.getByText('Conversación')).toBeInTheDocument();
  });

  it('should show the rest message once while it waits for the next sign', async () => {
    vi.spyOn(translationApi, 'signToText').mockResolvedValue(lectura('B'));
    render(<SignToText />);
    fireEvent.click(screen.getByRole('button', { name: '▶ Iniciar traducción' }));

    for (let i = 0; i < 4; i++) await unaLectura();

    expect(screen.getAllByText(/Letra registrada/)).toHaveLength(1);
  });

  it('should need only 2 readings at fast speed and build the phrase', async () => {
    vi.spyOn(translationApi, 'signToText')
      .mockResolvedValueOnce(lectura('H')).mockResolvedValueOnce(lectura('H'))
      .mockResolvedValue(lectura('I'));
    render(<SignToText />);
    fireEvent.click(screen.getByRole('button', { name: 'Rápida' }));
    fireEvent.click(screen.getByRole('button', { name: '▶ Iniciar traducción' }));

    await unaLectura();
    await unaLectura();          // H aceptada → pausa de 600 ms
    for (let i = 0; i < 4; i++) await unaLectura();

    expect(screen.getByText('Frase construida')).toBeInTheDocument();
    expect(screen.getByText('H I')).toBeInTheDocument();
  });

  it('should discard readings without a hand or with low confidence', async () => {
    vi.spyOn(translationApi, 'signToText')
      .mockResolvedValueOnce(lectura('A'))
      .mockResolvedValueOnce(lectura(null))
      .mockResolvedValue(lectura('A', 0.4));
    render(<SignToText />);
    fireEvent.click(screen.getByRole('button', { name: '▶ Iniciar traducción' }));

    for (let i = 0; i < 4; i++) await unaLectura();

    expect(screen.queryByText(/\/ 3/)).not.toBeInTheDocument();
    expect(screen.queryByText('Conversación')).not.toBeInTheDocument();
  });

  it('should not send anything when there is no frame and ignore failed requests', async () => {
    const enviar = vi.spyOn(translationApi, 'signToText').mockRejectedValue(new Error('500'));
    camara.captureFrame.mockReturnValueOnce(null as never);
    render(<SignToText />);
    fireEvent.click(screen.getByRole('button', { name: '▶ Iniciar traducción' }));

    await unaLectura();
    expect(enviar).not.toHaveBeenCalled();
    await unaLectura();
    expect(enviar).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Realizando señas frente a la cámara…')).toBeInTheDocument();
  });

  it('should pause the translation and clear the conversation', async () => {
    const enviar = vi.spyOn(translationApi, 'signToText').mockResolvedValue(lectura('C'));
    render(<SignToText />);
    fireEvent.click(screen.getByRole('button', { name: 'Lenta' }));
    fireEvent.click(screen.getByRole('button', { name: '▶ Iniciar traducción' }));
    for (let i = 0; i < 5; i++) await unaLectura();
    expect(screen.getByText('Conversación')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '⏸ Pausar' }));
    await unaLectura();
    expect(enviar).toHaveBeenCalledTimes(5);

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(screen.queryByText('Conversación')).not.toBeInTheDocument();
    expect(screen.getByText('El texto traducido aparecerá aquí')).toBeInTheDocument();
  });

  it('should copy the built phrase', async () => {
    const copiar = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copiar } });
    vi.spyOn(translationApi, 'signToText')
      .mockResolvedValueOnce(lectura('O')).mockResolvedValueOnce(lectura('O'))
      .mockResolvedValue(lectura('K'));
    render(<SignToText />);
    fireEvent.click(screen.getByRole('button', { name: 'Rápida' }));
    fireEvent.click(screen.getByRole('button', { name: '▶ Iniciar traducción' }));
    for (let i = 0; i < 6; i++) await unaLectura();

    fireEvent.click(screen.getByRole('button', { name: '📋 Copiar frase' }));

    expect(copiar).toHaveBeenCalledWith('O K');
  });
});
