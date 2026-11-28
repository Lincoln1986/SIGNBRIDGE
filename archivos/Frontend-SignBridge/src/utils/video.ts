/**
 * Ayudas para mostrar los videos de las señas.
 *
 * Un video puede ser:
 * - local, guardado en el backend: llega como ruta relativa
 *   (/media/videos/hola.mp4 o /media/subidos/<uuid>.mp4);
 * - de YouTube (watch, youtu.be, embed o shorts);
 * - un enlace directo a un archivo de video (https://...).
 */

// Misma URL del backend que usa api/client.ts. Se lee aquí también para que
// este archivo no dependa del cliente HTTP (y las pruebas que lo simulan).
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** URL que se pone en el src del <video>. */
export function urlDeVideo(url: string): string {
  // Un video local llega como ruta del backend: sin esto el navegador lo
  // buscaría en el servidor del frontend y daría 404.
  if (url.startsWith('/media/')) return `${API_BASE}${url}`;
  if (/^https?:\/\//i.test(url)) return url;
  return '';   // cualquier otra cosa (javascript:, data:...) no se reproduce
}

export function esYouTube(url: string): boolean {
  return /(^|\/\/)(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(url);
}

/** El id de un video de YouTube, o null. */
export function idDeYouTube(url: string): string | null {
  const patrones = [
    /youtu\.be\/([\w-]+)/,
    /[?&]v=([\w-]+)/,
    /youtube\.com\/embed\/([\w-]+)/,
    /youtube\.com\/shorts\/([\w-]+)/,
  ];
  for (const patron of patrones) {
    const m = url.match(patron);
    if (m) return m[1];
  }
  return null;
}

/** URL para un <iframe> de YouTube, o '' si no se reconoce el id. */
export function urlEmbebida(url: string): string {
  const id = idDeYouTube(url);
  return id ? `https://www.youtube.com/embed/${id}` : '';
}
