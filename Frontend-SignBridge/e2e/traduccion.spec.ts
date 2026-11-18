import { expect, test, type Page } from '@playwright/test';
import { SenasATextoPage, VozASenasPage } from './paginas/TraduccionPage';

/**
 * Flujo crítico 3 (S6): traducción texto → seña y seña → texto.
 * Autor: @Lincoln1986
 *
 * La sesión se prepara sin pasar por el login (localStorage + API simulada)
 * y la cámara es la falsa de Chromium: el test no necesita backend, modelo
 * de MediaPipe ni una cámara real.
 */
test.use({
  permissions: ['camera'],
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
});

const json = (body: unknown, status = 200) => ({
  status, contentType: 'application/json', body: JSON.stringify(body),
});

async function sesionDeCliente(page: Page) {
  await page.route('http://localhost:8000/**', route => route.fulfill(json([])));
  await page.route('**/auth/me', route => route.fulfill(json({
    id_user: 'u1', full_name: 'Ana Torres', email: 'ana@example.com', role: 'Cliente',
  })));
  await page.route('**/notifications/unread-count', route => route.fulfill(json({ unread: 0 })));
  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('role', 'Cliente');
  });
}

test('texto → seña: traduce, marca las palabras sin seña y no duplica con doble clic', async ({ page }) => {
  // Arrange: red lenta en la traducción
  await sesionDeCliente(page);
  const pedidos: string[] = [];
  await page.route('**/api/traduccion/texto', async route => {
    pedidos.push(route.request().postDataJSON().texto);
    await new Promise(r => setTimeout(r, 800));
    await route.fulfill(json({
      original_text: 'hola amigo', id_session: 'ses-1',
      signs: [
        { word: 'hola', found: true, video_url: 'https://cdn.example.com/hola.mp4', id_lexicalunit: 'l1' },
        { word: 'amigo', found: false, video_url: null, id_lexicalunit: null },
      ],
      untranslated_words: ['amigo'],
      message: 'Traducción parcial: 1/2 señas encontradas. Palabras sin traducción: amigo.',
    }));
  });
  const voz = new VozASenasPage(page);
  await voz.abrir();

  // Act
  await voz.cuadroTexto.fill('hola amigo');
  await voz.traducir.dblclick();

  // Assert
  await expect(voz.senas()).toHaveText(['hola', 'amigo (sin seña)']);
  expect(pedidos).toEqual(['hola amigo']);
  await expect(page.getByText('Historial de traducciones (1)')).toBeVisible();
  await expect(page.getByText(/Traducción parcial: 1\/2/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('lastSessionId'))).toBe('ses-1');
});

test('texto → seña: si el backend falla, lo dice y deja reintentar', async ({ page }) => {
  await sesionDeCliente(page);
  await page.route('**/api/traduccion/texto', route =>
    route.fulfill(json({ detail: 'No se encontraron palabras válidas en el texto.' }, 422)));
  const voz = new VozASenasPage(page);
  await voz.abrir();

  await voz.cuadroTexto.fill('123');
  await voz.traducir.click();

  await expect(page.getByText('No se encontraron palabras válidas en el texto.')).toBeVisible();
  await expect(voz.traducir).toBeEnabled();
});

test('seña → texto: con la cámara, una letra estable entra a la conversación', async ({ page }) => {
  // Arrange: el "modelo" responde siempre la L con 90 % de confianza
  await sesionDeCliente(page);
  let frames = 0;
  await page.route('**/api/traduccion/frame', route => {
    frames += 1;
    return route.fulfill(json({ detected_sign: 'L', confidence: 0.9, message: "Seña detectada: 'L'." }));
  });
  const senas = new SenasATextoPage(page);
  await senas.abrirConCamara();

  // Act
  await senas.iniciar();

  // Assert: con ritmo normal hacen falta 3 lecturas iguales
  await expect(senas.conversacion()).toContainText('L', { timeout: 5000 });
  await expect(page.getByText('Confianza: 90%')).toBeVisible();
  expect(frames).toBeGreaterThanOrEqual(3);

  await page.getByRole('button', { name: '⏸ Pausar' }).click();
  const despuesDePausar = frames;
  await page.waitForTimeout(1000);
  expect(frames).toBeLessThanOrEqual(despuesDePausar + 1); // a lo sumo una en vuelo
});
