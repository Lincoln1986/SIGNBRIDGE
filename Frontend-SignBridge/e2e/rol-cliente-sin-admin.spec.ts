import { expect, test } from '@playwright/test';

/**
 * E2E: un Cliente no puede entrar al panel de administración.
 * Autor: @Sebas-p-s · S2 (capa E2E)
 *
 * Igual que login.spec.ts, la API se simula con page.route: la sesión se
 * prepara sin pasar por la UI (más rápido y sin flakiness).
 */
test.beforeEach(async ({ page }) => {
  await page.route('http://localhost:8000/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route('**/auth/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id_user: 'user-1', full_name: 'Ana Torres', email: 'ana@example.com', role: 'Cliente' }),
    })
  );
  await page.route('**/notifications/unread-count', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ unread: 0 }) })
  );

  // Sesión de Cliente ya iniciada (sin pasar por el formulario)
  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('role', 'Cliente');
  });
});

test('un Cliente que escribe /admin termina en su propio panel', async ({ page }) => {
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /usuarios/i })).toHaveCount(0);
});

test('sin sesión, /admin manda a iniciar sesión', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/admin');

  await expect(page.getByRole('dialog', { name: 'Bienvenido de nuevo' })).toBeVisible();
});
