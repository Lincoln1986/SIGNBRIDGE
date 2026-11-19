import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Objeto de página del inicio de sesión y del menú (S6).
 * Autor: @juan-soto350
 */
export class PanelPorRolPage {
  readonly modalLogin: Locator;

  constructor(private readonly page: Page) {
    this.modalLogin = page.getByRole('dialog', { name: 'Bienvenido de nuevo' });
  }

  async iniciarSesion(correo: string) {
    await this.page.goto('/login');
    await expect(this.modalLogin).toBeVisible();
    await this.page.getByPlaceholder('tu@correo.com').fill(correo);
    await this.page.getByPlaceholder('••••••••').fill('Password1!');
    await this.modalLogin.locator('button[type="submit"]').click();
    await expect(this.page).toHaveURL(/\/home$/);
  }

  /** Enlace del menú superior (por ejemplo "📊 Panel Admin"). */
  enlaceMenu(nombre: string) {
    return this.page.getByRole('navigation').getByRole('button', { name: nombre, exact: true });
  }

  async irA(nombre: string) {
    await this.enlaceMenu(nombre).click();
  }
}
