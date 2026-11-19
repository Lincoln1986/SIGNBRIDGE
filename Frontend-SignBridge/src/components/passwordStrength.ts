/**
 * Fuerza de contraseña (typo `PasswordStrength` + cálculo).
 *
 * Se mantiene fuera de `UI.tsx` porque ese archivo exporta componentes y
 * `react-refresh/only-export-components` exige que un archivo con componentes
 * no exporte funciones sueltas.
 */
export type PasswordStrength = 'weak' | 'fair' | 'strong' | 'very-strong';

export function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return 'weak';
  if (score === 3) return 'fair';
  if (score === 4 || score === 5) return 'strong';
  return 'very-strong';
}
