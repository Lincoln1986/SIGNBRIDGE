import { expect, test } from '@playwright/test';

/**
 * E2E: una persona con sesión busca una palabra en el Diccionario LSC
 * y abre el video de la seña.
 * Autor: @javierperez14 · S1 (primer E2E por integrante)
 *
 * Igual que login.spec.ts, la API se simula con page.route y la sesión se
 * prepara sin pasar por la UI: el test no depende del backend ni de la red.
 */
const PALABRAS = [
  { id_lexicalunit: 'u1', text: 'Hola', language: 'es_Co', created_at: '2026-10-01', updated_at: '2026-10-01', video_url: 'https://youtu.be/abc123' },
  { id_lexicalunit: 'u2', text: 'Gracias', language: 'es_Co', created_at: '2026-10-01', updated_at: '2026-10-01', video_url: 'https://youtu.be/def456' },
  { id_lexicalunit: 'u3', text: 'Familia', language: 'es_Co', created_at: '2026-10-01', updated_at: '2026-10-01' },
];

test.beforeEach(async ({ page }) => {
  // Arrange: cualquier otra llamada responde vacío; las específicas ganan
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
  await page.route('**/dashboard/lexical-units', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PALABRAS) })
  );
  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('role', 'Cliente');
  });
});

test('busca una palabra y abre el video de su seña', async ({ page }) => {
  await page.goto('/vocabulary');
  await expect(page.getByRole('heading', { name: 'Diccionario LSC' })).toBeVisible();
  await expect(page.getByText('3 palabras')).toBeVisible();

  // Act: escribe en el buscador (sin importar mayúsculas)
  await page.getByPlaceholder('Buscar palabra...').fill('GRA');

  // Assert: solo queda "Gracias"
  await expect(page.getByText('1 palabras')).toBeVisible();
  await expect(page.getByText('Hola', { exact: true })).toHaveCount(0);

  // Act: abre el video
  await page.getByRole('button', { name: /Ver seña/ }).click();

  // Assert: el enlace youtu.be se reproduce en formato embed y se cierra con Escape
  await expect(page.locator('iframe')).toHaveAttribute('src', 'https://www.youtube.com/embed/def456?autoplay=1');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Cerrar video' })).toHaveCount(0);
});

test('si la búsqueda no encuentra nada, lo dice', async ({ page }) => {
  await page.goto('/vocabulary');
  await expect(page.getByText('3 palabras')).toBeVisible();

  await page.getByPlaceholder('Buscar palabra...').fill('zzz');

  await expect(page.getByText('No se encontraron palabras con los filtros actuales.')).toBeVisible();
});
