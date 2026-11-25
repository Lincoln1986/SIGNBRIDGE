import { expect, test } from '@playwright/test';
import { LoginModal, RegistroPage } from '../paginas/RegistroPage';

/**
 * E2E real (S7): sin page.route.
 * Autor: @javierperez14
 *
 * A diferencia de los demás E2E, aquí no se simula nada: el navegador habla
 * con el backend de verdad (FastAPI + PostgreSQL migrado con Alembic). Si el
 * contrato entre frontend y backend se rompe, este test falla aunque los
 * simulados sigan en verde.
 *
 * Se corre con: pnpm exec playwright test -c playwright.real.config.ts
 * (necesita el backend en http://localhost:8000).
 */
const API = 'http://localhost:8000';

function personaNueva() {
  const marca = Date.now();
  return {
    nombres: 'valentina', apellidos: 'real', telefono: '3209876543', ciudad: 'Bogotá',
    direccion: 'Carrera 7 #72-41', correo: `e2e_real_${marca}@example.com`, contrasena: 'Segura123!',
  };
}

test('una persona se registra y entra con el backend real', async ({ page, request }) => {
  // Arrange
  const persona = personaNueva();
  const registro = new RegistroPage(page);
  await registro.abrir();

  // Act: registro real
  await registro.llenar(persona);
  await registro.crearCuenta.click();

  // Assert: el backend la creó y deja entrar con esos datos
  await expect(page.getByText('¡Cuenta creada exitosamente! Redirigiendo...')).toBeVisible();
  await new LoginModal(page).iniciarSesion(persona.correo, persona.contrasena);
  await expect(page).toHaveURL(/\/home$/);

  // El token es un JWT real emitido por el backend, y sirve para pedir el perfil
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token?.split('.')).toHaveLength(3);
  const perfil = await request.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  expect(perfil.status()).toBe(200);
  expect(await perfil.json()).toMatchObject({ email: persona.correo, role: 'Cliente' });
});

test('el backend real rechaza un correo que ya existe', async ({ page }) => {
  // Arrange: la persona ya está registrada en la base
  const persona = personaNueva();
  const registro = new RegistroPage(page);
  await registro.abrir();
  await registro.llenar(persona);
  await registro.crearCuenta.click();
  await expect(page.getByText('¡Cuenta creada exitosamente! Redirigiendo...')).toBeVisible();

  // Act: intenta registrarse otra vez con el mismo correo
  await registro.abrir();
  await registro.llenar(persona);
  await registro.crearCuenta.click();

  // Assert: el aviso viene del backend (409) y no sale de la página de registro
  await expect(page.getByText(/ya está registrado/)).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
});
