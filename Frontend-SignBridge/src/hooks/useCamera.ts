import { useState, useRef, useCallback } from 'react';

export type CameraPermission = 'idle' | 'granted' | 'denied' | 'unavailable' | 'requesting';

interface UseCameraReturn {
  permission: CameraPermission;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  error: string | null;
  requestCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => string | null;
}

/**
 * Hook para gestionar acceso a la cámara del dispositivo.
 * Maneja solicitud de permiso, activación del stream y captura de frames.
 */
export function useCamera(): UseCameraReturn {
  const [permission, setPermission] = useState<CameraPermission>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const requestCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission('unavailable');
      setError('Tu navegador no soporta acceso a la cámara.');
      return;
    }

    setPermission('requesting');
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      setStream(mediaStream);
      setPermission('granted');

      // Conectar el stream al elemento <video> si ya existe
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      const domError = err as DOMException;
      if (domError.name === 'NotAllowedError' || domError.name === 'PermissionDeniedError') {
        setPermission('denied');
        setError('Permiso de cámara denegado. Por favor, habilítalo en la configuración de tu navegador.');
      } else if (domError.name === 'NotFoundError' || domError.name === 'DevicesNotFoundError') {
        setPermission('unavailable');
        setError('No se encontró una cámara en tu dispositivo.');
      } else if (domError.name === 'NotReadableError') {
        setPermission('unavailable');
        setError('La cámara está siendo usada por otra aplicación.');
      } else {
        setPermission('denied');
        setError('No se pudo acceder a la cámara: ' + domError.message);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setPermission('idle');
    setError(null);
  }, [stream]);

  /**
   * Captura un frame del video actual y lo retorna como base64 JPEG.
   * Retorna null si el video no está disponible.
   */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    // Retorna solo la parte base64 sin el prefijo data:image/jpeg;base64,
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  }, []);

  return { permission, stream, videoRef, error, requestCamera, stopCamera, captureFrame };
}
