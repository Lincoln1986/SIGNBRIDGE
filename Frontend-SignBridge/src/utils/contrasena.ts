// Regla de contraseña segura. Estaba copiada en 4 sitios (AuthModal,
// Register, PasswordPages y PasswordRequirements): si cambiaba en uno,
// los otros quedaban desactualizados.
export const LONGITUD_MINIMA = 8;

export interface Requisito {
  label: string;
  met: boolean;
}

export function requisitosContrasena(password: string): Requisito[] {
  return [
    { label: `Mínimo ${LONGITUD_MINIMA} caracteres`, met: password.length >= LONGITUD_MINIMA },
    { label: 'Al menos una mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Al menos una minúscula', met: /[a-z]/.test(password) },
    { label: 'Al menos un número', met: /[0-9]/.test(password) },
    { label: 'Al menos un carácter especial', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function contrasenaValida(password: string): boolean {
  return requisitosContrasena(password).every(r => r.met);
}
