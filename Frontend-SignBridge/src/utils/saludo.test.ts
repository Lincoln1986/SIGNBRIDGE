// Autor: @Sebas-p-s · S1 (unitarias con AAA y valores límite)
import { describe, expect, it } from 'vitest';
import { primerNombre, saludoPorHora } from './saludo';

describe('saludoPorHora', () => {
  it.each([
    [0, 'Buenos días'],
    [11, 'Buenos días'],    // último minuto de la mañana
    [12, 'Buenas tardes'],  // valor límite: mediodía
    [17, 'Buenas tardes'],
    [18, 'Buenas noches'],  // valor límite: 6 p. m.
    [23, 'Buenas noches'],
  ])('a las %i h dice "%s"', (hora, esperado) => {
    expect(saludoPorHora(hora)).toBe(esperado);
  });
});

describe('primerNombre', () => {
  it('should take only the first name', () => {
    // Arrange
    const nombre = 'Ana María Paz';
    // Act
    const resultado = primerNombre(nombre);
    // Assert
    expect(resultado).toBe('Ana');
  });

  it('should ignore extra spaces', () => {
    expect(primerNombre('   Luis   Pérez ')).toBe('Luis');
  });

  it.each([undefined, null, '', '   '])('should say "Usuario" when the name is %j', (valor) => {
    expect(primerNombre(valor)).toBe('Usuario');
  });
});
