import { expect, test } from '@playwright/test';

/**
 * E2E del flujo de login (Sprint S1).
 *
 * La API se intercepta con page.route en lugar de depender de un backend
 * levantado: mantiene el test estable (sin flakiness por red) y valida el
 * contrato frontend↔API que consume el modal de autenticación.
 */
test.beforeEach(async ({ page }) => {
  // Comodín: cualquier otra llamada de la app responde vacío.
  // Se registra primero, así que las rutas específicas de abajo ganan.
  await page.route('http://localhost:8000/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );

  await page.route('**/auth/login', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'e2e-token',
        token_type: 'bearer',
        user_id: 'user-1',
        role: 'Cliente',
        full_name: 'Ana Torres',
      }),
    })
  );

  await page.route('**/auth/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id_user: 'user-1',
        full_name: 'Ana Torres',
        email: 'ana@example.com',
        role: 'Cliente',
        phone: '3001234567',
        city: 'Bogotá',
      }),
    })
  );

  await page.route('**/notifications/unread-count', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ unread: 0 }),
    })
  );
});

test('el login con credenciales válidas abre el modal y llega al home', async ({ page }) => {
  await page.goto('/login');

  // /login redirige a Landing con el modal abierto
  const modal = page.getByRole('dialog', { name: 'Bienvenido de nuevo' });
  await expect(modal).toBeVisible();

  await page.getByPlaceholder('tu@correo.com').fill('ana@example.com');
  await page.getByPlaceholder('••••••••').fill('Password1!');
  await modal.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(/\/home$/);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('e2e-token');
  expect(await page.evaluate(() => localStorage.getItem('role'))).toBe('Cliente');
});

test('un 401 del backend limpia la sesión y vuelve al inicio', async ({ page }) => {
  // Sesión vencida: el token ya no sirve y /auth/me responde 401. El 401 del
  // login no cierra la sesión (lo cubre login-incorrecto.spec.ts).
  await page.route('**/auth/me', route =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Token inválido o expirado' }),
    })
  );

  await page.goto('/login');
  const modal = page.getByRole('dialog', { name: 'Bienvenido de nuevo' });
  await expect(modal).toBeVisible();

  await page.getByPlaceholder('tu@correo.com').fill('ana@example.com');
  await page.getByPlaceholder('••••••••').fill('Password1!');
  await modal.locator('button[type="submit"]').click();

  // El interceptor de axios limpia la sesión ante cualquier 401 de sesión y
  // redirige al inicio: la app nunca queda autenticada con un 401.
  await expect(page).toHaveURL(/\/$/);

  // La recarga de la navegación puede estar en curso: se reintenta el
  // evaluate mientras hay contexto, sin aflojar la condición (token null).
  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(() => localStorage.getItem('token'));
        } catch {
          return 'navegando'; // contexto destruido: la recarga sigue
        }
      },
      { timeout: 5000 }
    )
    .toBeNull();
});
