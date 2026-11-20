// Lógica del saludo de Home, sacada del componente para poder probarla.
// La hora entra como parámetro (no se lee el reloj aquí adentro): así el test
// da lo mismo a las 8 a. m. que a las 11 p. m. (principio FIRST: Repeatable).

export function saludoPorHora(hora: number): string {
  if (hora < 12) return 'Buenos días';
  if (hora < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

/** "Ana María Paz" → "Ana". Sin nombre (o solo espacios) → "Usuario". */
export function primerNombre(nombreCompleto?: string | null): string {
  return nombreCompleto?.trim().split(/\s+/)[0] || 'Usuario';
}
