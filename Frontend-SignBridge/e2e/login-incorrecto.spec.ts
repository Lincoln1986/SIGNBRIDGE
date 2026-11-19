import { expect, test } from '@playwright/test';

/**
 * Semana 1 · capa E2E · autor @juan-soto350 (PR #9).
 *
 * Flujo crítico: con la contraseña equivocada la persona debe ver por qué no
 * entra. Este test encontró el defecto del PR #8: el interceptor de axios
 * recargaba la página ante cualquier 401 y el mensaje nunca se veía.
 */
test.beforeEach(async ({ page }) => {
  // Comodín: cualquier otra llamada de la app responde vacío.
  await page.route('http://localhost:8000/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  await page.route('**/auth/login', route =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Credenciales incorrectas' }),
    })
  );
});

test('la contraseña equivocada muestra el alert y no sale del formulario', async ({ page }) => {
  // Arrange: correo real con una contraseña que no es la suya
  await page.goto('/login');
  const modal = page.getByRole('dialog', { name: 'Bienvenido de nuevo' });
  await expect(modal).toBeVisible();
  await page.getByPlaceholder('tu@correo.com').fill('ana@example.com');
  await page.getByPlaceholder('••••••••').fill('NoEsLaClave123*');

  // Act
  await modal.locator('button[type="submit"]').click();

  // Assert: el error se ve en el modal, el formulario sigue abierto y no hay sesión
  await expect(modal.getByText('Credenciales incorrectas')).toBeVisible();
  await expect(modal).toBeVisible();
  await expect(page).not.toHaveURL(/\/home/);
  await expect(page.getByPlaceholder('tu@correo.com')).toHaveValue('ana@example.com');
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});
