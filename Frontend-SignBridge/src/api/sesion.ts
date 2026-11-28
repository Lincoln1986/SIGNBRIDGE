/**
 * Marcas de sesión que el frontend guarda en localStorage.
 *
 * Ninguna sirve para entrar: el token vive en una cookie HttpOnly que pone el
 * backend (OWASP A02). "sesion" dice si vale la pena preguntar /auth/me al
 * abrir la página, y "role" pinta el menú mientras llega la respuesta.
 */
export const CLAVES_SESION = ['sesion', 'role'] as const;

export function olvidarSesion() {
  CLAVES_SESION.forEach(k => localStorage.removeItem(k));
  // Versiones anteriores guardaban aquí el token: se borra si quedó.
  localStorage.removeItem('token');
}
