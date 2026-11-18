import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Objetos de página de las dos traducciones (S6).
 * Autor: @Lincoln1986
 */
export class VozASenasPage {
  readonly cuadroTexto: Locator;
  readonly traducir: Locator;

  constructor(private readonly page: Page) {
    this.cuadroTexto = page.getByPlaceholder('Escribe una palabra, frase o expresión en español…');
    this.traducir = page.getByRole('button', { name: 'Traducir a señas' });
  }

  async abrir() {
    await this.page.goto('/voice-to-sign');
    await expect(this.page.getByRole('heading', { name: '🎙️ Voz a Señas' })).toBeVisible();
  }

  /** Chips de "Señas en la traducción" (las que no tienen seña dicen "(sin seña)"). */
  senas() {
    return this.page.getByRole('heading', { name: 'Señas en la traducción' }).locator('..').locator('span');
  }
}

export class SenasATextoPage {
  constructor(private readonly page: Page) {}

  async abrirConCamara() {
    await this.page.goto('/sign-to-text');
    await this.page.getByRole('button', { name: '📷 Activar cámara' }).click();
    await expect(this.page.getByRole('button', { name: '▶ Iniciar traducción' })).toBeEnabled();
  }

  async iniciar() {
    await this.page.getByRole('button', { name: '▶ Iniciar traducción' }).click();
  }

  conversacion() {
    return this.page.getByRole('heading', { name: 'Conversación' }).locator('../..');
  }
}
