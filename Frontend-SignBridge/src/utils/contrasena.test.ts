// Autor: @juan-soto350 · Capa S2: Front — lógica pura de la regla de contraseña.
import { describe, expect, it } from 'vitest';
import { contrasenaValida, requisitosContrasena } from './contrasena';

describe('contrasenaValida', () => {
  // Partición equivalente: un caso válido en el borde y uno inválido por
  // cada requisito que falta.
  it.each([
    ['Abcdef1*', true,  'cumple todo con 8 caracteres (borde)'],
    ['Abcde1*',  false, '7 caracteres (justo debajo del borde)'],
    ['abcdef1*', false, 'sin mayúscula'],
    ['ABCDEF1*', false, 'sin minúscula'],
    ['Abcdefg*', false, 'sin número'],
    ['Abcdefg1', false, 'sin carácter especial'],
    ['',         false, 'vacía'],
  ])('"%s" → %s (%s)', (password, esperado) => {
    expect(contrasenaValida(password)).toBe(esperado);
  });
});

describe('requisitosContrasena', () => {
  it('reporta exactamente los requisitos que faltan', () => {
    const faltan = requisitosContrasena('abc')
      .filter(r => !r.met)
      .map(r => r.label);

    expect(faltan).toEqual([
      'Mínimo 8 caracteres',
      'Al menos una mayúscula',
      'Al menos un número',
      'Al menos un carácter especial',
    ]);
  });

  it('ninguno falta con una contraseña completa', () => {
    expect(requisitosContrasena('Abcdef1*').every(r => r.met)).toBe(true);
  });
});
