// Autor: @juan-soto350 · Capa S2: Front — lógica pura de teléfono y nombres.
import { describe, expect, it } from 'vitest';
import { capitalize, formatPhone, telefonoValido } from './formularios';

describe('telefonoValido', () => {
  // Borde de longitud (10) y de prefijo (3), con un inválido a cada lado.
  it.each([
    ['3001234567', true,  '10 dígitos que empiezan en 3'],
    ['300123456',  false, '9 dígitos (justo debajo del borde)'],
    ['30012345678', false, '11 dígitos (justo encima del borde)'],
    ['2001234567', false, '10 dígitos que empiezan en 2'],
    ['4001234567', false, '10 dígitos que empiezan en 4'],
    ['',           false, 'vacío'],
  ])('"%s" → %s (%s)', (phone, esperado) => {
    expect(telefonoValido(phone)).toBe(esperado);
  });
});

describe('formatPhone', () => {
  it.each([
    ['300 123 4567', '3001234567', 'quita los espacios'],
    ['300-123-4567', '3001234567', 'quita los guiones'],
    ['30012345678',  '3001234567', 'recorta a 10 dígitos'],
    ['2001234567',   '3001234567', 'fuerza el 3 inicial'],
    ['abc',          '',           'sin dígitos devuelve vacío'],
  ])('formatPhone("%s") → "%s" (%s)', (entrada, esperado) => {
    expect(formatPhone(entrada)).toBe(esperado);
  });

  it('el resultado siempre pasa telefonoValido cuando está completo', () => {
    expect(telefonoValido(formatPhone('200 123 4567'))).toBe(true);
  });
});

describe('capitalize', () => {
  it.each([
    ['juan',       'Juan',       'una palabra'],
    ['juan carlos', 'Juan Carlos', 'cada palabra se capitaliza'],
    ['JUAN',       'JUAN',       'no toca lo ya en mayúsculas'],
  ])('capitalize("%s") → "%s" (%s)', (entrada, esperado) => {
    expect(capitalize(entrada)).toBe(esperado);
  });
});
