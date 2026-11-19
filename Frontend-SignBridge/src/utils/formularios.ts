// Helpers de formulario compartidos por Register (página) y AuthModal.

/** Capitaliza la primera letra de cada palabra. */
export const capitalize = (val: string) =>
  val.replace(/(^|\s)\S/g, c => c.toUpperCase());

/** Solo dígitos, máximo 10, y fuerza que empiece con 3. */
export const formatPhone = (val: string) => {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length > 0 && digits[0] !== '3') return '3' + digits.slice(1, 10);
  return digits;
};

/** Teléfono celular colombiano: 10 dígitos que empiezan en 3. */
export const telefonoValido = (phone: string) =>
  phone.length === 10 && phone.startsWith('3');
