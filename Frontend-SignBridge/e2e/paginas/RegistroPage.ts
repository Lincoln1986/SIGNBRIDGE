import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Objeto de página del registro (S6).
 * Autor: @Sebas-p-s
 *
 * Agrupa cómo se llega y se llena el formulario, para que el test hable
 * de lo que hace la persona ("se registra") y no de selectores.
 */
export class RegistroPage {
  readonly crearCuenta: Locator;

  constructor(private readonly page: Page) {
    this.crearCuenta = page.getByRole('button', { name: 'Crear cuenta' });
  }

  async abrir() {
    await this.page.goto('/register');
    await expect(this.crearCuenta).toBeVisible();
  }

  async llenar(datos: {
    nombres: string; apellidos: string; telefono: string; ciudad: string;
    direccion: string; correo: string; contrasena: string;
  }) {
    await this.page.getByLabel('Nombres *').fill(datos.nombres);
    await this.page.getByLabel('Apellidos *').fill(datos.apellidos);
    await this.page.getByLabel('Teléfono *').fill(datos.telefono);
    await this.page.getByRole('combobox').selectOption(datos.ciudad);
    await this.page.getByLabel('Dirección *').fill(datos.direccion);
    await this.page.getByLabel('Correo electrónico *').fill(datos.correo);
    await this.page.getByPlaceholder('Mín. 8 caracteres').fill(datos.contrasena);
    await this.page.getByPlaceholder('Repite la contraseña').fill(datos.contrasena);
  }
}

/** Modal de inicio de sesión que abre /login. */
export class LoginModal {
  readonly modal: Locator;

  constructor(private readonly page: Page) {
    this.modal = page.getByRole('dialog', { name: 'Bienvenido de nuevo' });
  }

  async iniciarSesion(correo: string, contrasena: string) {
    await expect(this.modal).toBeVisible();
    await this.page.getByPlaceholder('tu@correo.com').fill(correo);
    await this.page.getByPlaceholder('••••••••').fill(contrasena);
    await this.modal.locator('button[type="submit"]').click();
  }
}
