import { expect, test, type Page } from '@playwright/test';
import { PanelPorRolPage } from './paginas/PanelPorRolPage';

/**
 * Flujo crítico 2 (S6): login + panel según el rol.
 * Autor: @juan-soto350
 *
 * Los datos de cada rol se preparan simulando la API (page.route), no
 * llenando pantallas: el test solo recorre lo que hace la persona.
 */
type Rol = 'Cliente' | 'Administrador' | 'Soporte';

const CORREO: Record<Rol, string> = {
  Cliente: 'ana@example.com',
  Administrador: 'admin@example.com',
  Soporte: 'soporte@example.com',
};

const json = (body: unknown, status = 200) => ({
  status, contentType: 'application/json', body: JSON.stringify(body),
});

async function apiComo(page: Page, rol: Rol, { demoraPerfilMs = 0 } = {}) {
  await page.route('http://localhost:8000/**', route => route.fulfill(json([])));
  await page.route('**/auth/login', route => route.fulfill(json({
    access_token: `token-${rol}`, token_type: 'bearer', user_id: 'u1', role: rol, full_name: `Ana ${rol}`,
  })));
  await page.route('**/auth/me', async route => {
    // Red lenta en el perfil: la app debe esperar sin romperse
    await new Promise(r => setTimeout(r, demoraPerfilMs));
    await route.fulfill(json({ id_user: 'u1', full_name: `Ana ${rol}`, email: CORREO[rol], role: rol }));
  });
  await page.route('**/notifications/unread-count', route => route.fulfill(json({ unread: 0 })));
  await page.route('**/dashboard/user', route => route.fulfill(json({
    full_name: 'Ana Cliente', email: CORREO.Cliente, translations_made: 3,
    favorite_words: 1, average_rating: 4, support_requests: 0,
  })));
  await page.route('**/admin/users*', route => route.fulfill(json([
    { id_user: 'u1', full_name: 'Ana Administrador', email: CORREO.Administrador, role_name: 'Administrador', region: 'Bogotá', is_active: true },
    { id_user: 'u2', full_name: 'Luis Gómez', email: 'luis@example.com', role_name: 'Cliente', region: 'Cali', is_active: true },
  ])));
  await page.route('**/dashboard/stats', route => route.fulfill(json({
    total_users: 2, total_translations: 10, total_support_requests: 1, total_feedback: 1, average_rating: 4,
  })));
  await page.route('**/support/all', route => route.fulfill(json([
    { id_support: 't1', subject: 'No carga el video', message: 'La seña no aparece', status: 'pending',
      date: '2026-11-10T10:00:00Z', user_full_name: 'Luis Gómez', user_email: 'luis@example.com' },
  ])));
}

const casos: { rol: Rol; enlace: string; url: RegExp; titulo: string; detalle: string }[] = [
  { rol: 'Cliente', enlace: '📊 Mi Panel', url: /\/dashboard$/, titulo: 'Hola, Ana', detalle: 'Traducciones realizadas' },
  { rol: 'Administrador', enlace: '📊 Panel Admin', url: /\/admin$/, titulo: 'Administración', detalle: 'Luis Gómez' },
  { rol: 'Soporte', enlace: '🎧 Panel de Soporte', url: /\/support$/, titulo: 'Panel de Soporte', detalle: 'No carga el video' },
];

for (const { rol, enlace, url, titulo, detalle } of casos) {
  test(`${rol}: inicia sesión y su menú lo lleva a su panel`, async ({ page }) => {
    // Arrange
    await apiComo(page, rol, { demoraPerfilMs: 600 });
    const app = new PanelPorRolPage(page);

    // Act
    await app.iniciarSesion(CORREO[rol]);
    await app.irA(enlace);

    // Assert
    await expect(page).toHaveURL(url);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(titulo);
    await expect(page.getByText(detalle).first()).toBeVisible();
  });
}

test('el menú solo muestra el panel que corresponde a cada rol', async ({ page }) => {
  await apiComo(page, 'Soporte');
  const app = new PanelPorRolPage(page);

  await app.iniciarSesion(CORREO.Soporte);

  await expect(app.enlaceMenu('🎧 Panel de Soporte')).toBeVisible();
  await expect(app.enlaceMenu('📊 Panel Admin')).toHaveCount(0);
  await expect(app.enlaceMenu('📈 Estadísticas')).toHaveCount(0);
});

test('un Cliente que escribe /admin en la barra termina en su propio panel', async ({ page }) => {
  await apiComo(page, 'Cliente');
  await new PanelPorRolPage(page).iniciarSesion(CORREO.Cliente);

  await page.goto('/admin');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hola, Ana');
});
