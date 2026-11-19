import { expect, test, type Page } from '@playwright/test';
import { LoginModal, RegistroPage } from './paginas/RegistroPage';

/**
 * Flujo crítico 1 (S6): registro + verificación de la cuenta.
 * Autor: @Sebas-p-s
 *
 * La API se simula con page.route: el "backend" falso guarda a la persona
 * registrada y el login solo la deja entrar con ese mismo correo y
 * contraseña. Así se verifica que lo que se envió al registrar es lo que
 * después permite entrar.
 */
const PERSONA = {
  nombres: 'laura', apellidos: 'rojas', telefono: '3101234567', ciudad: 'Bogotá',
  direccion: 'Calle 145 #91-19', correo: 'laura@example.com', contrasena: 'Segura123!',
};

const json = (body: unknown, status = 200) => ({
  status, contentType: 'application/json', body: JSON.stringify(body),
});

/** Backend falso con memoria: registra y luego valida el login. */
async function backendFalso(page: Page, { demoraRegistroMs = 0 } = {}) {
  const registrados: Record<string, string>[] = [];

  await page.route('http://localhost:8000/**', route => route.fulfill(json([])));
  await page.route('**/regions', route => route.fulfill(json([
    { id_region: 'r1', region_name: 'Bogotá' }, { id_region: 'r2', region_name: 'Medellín' },
  ])));
  await page.route('**/auth/register', async route => {
    // Red lenta: da tiempo a que la persona intente un doble clic
    await new Promise(r => setTimeout(r, demoraRegistroMs));
    const datos = route.request().postDataJSON();
    if (registrados.some(p => p.email === datos.email)) {
      return route.fulfill(json({ detail: 'El correo ya está registrado' }, 409));
    }
    registrados.push(datos);
    return route.fulfill(json({ message: 'Usuario registrado exitosamente', user_id: 'nuevo' }, 201));
  });
  await page.route('**/auth/login', route => {
    const { email, password } = route.request().postDataJSON();
    const persona = registrados.find(p => p.email === email && p.password === password);
    if (!persona) return route.fulfill(json({ detail: 'Credenciales incorrectas' }, 401));
    return route.fulfill(json({
      access_token: 'token-laura', token_type: 'bearer', user_id: 'nuevo',
      role: 'Cliente', full_name: `${persona.first_name} ${persona.last_name}`,
    }));
  });
  await page.route('**/auth/me', route => route.fulfill(json({
    id_user: 'nuevo', full_name: 'Laura Rojas', email: PERSONA.correo, role: 'Cliente',
  })));
  await page.route('**/notifications/unread-count', route => route.fulfill(json({ unread: 0 })));

  return registrados;
}

test('se registra, el doble clic no duplica la cuenta y luego entra con esos datos', async ({ page }) => {
  // Arrange
  const registrados = await backendFalso(page, { demoraRegistroMs: 800 });
  const registro = new RegistroPage(page);
  await registro.abrir();

  // Act: llena el formulario y hace doble clic con la red lenta
  await registro.llenar(PERSONA);
  await registro.crearCuenta.dblclick();

  // Assert: un solo registro, con los nombres capitalizados
  await expect(page.getByText('¡Cuenta creada exitosamente! Redirigiendo...')).toBeVisible();
  expect(registrados).toHaveLength(1);
  expect(registrados[0]).toMatchObject({
    first_name: 'Laura', last_name: 'Rojas', phone: '3101234567', city: 'Bogotá',
  });

  // Verificación: lo llevan al login y entra con la cuenta recién creada
  await expect(page).toHaveURL(/\/$/); // /login abre el modal sobre la portada
  await new LoginModal(page).iniciarSesion(PERSONA.correo, PERSONA.contrasena);
  await expect(page).toHaveURL(/\/home$/);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('token-laura');
});

test('no deja crear la cuenta si las contraseñas no coinciden', async ({ page }) => {
  await backendFalso(page);
  const registro = new RegistroPage(page);
  await registro.abrir();

  await registro.llenar(PERSONA);
  await page.getByPlaceholder('Repite la contraseña').fill('Otra123!');

  await expect(registro.crearCuenta).toBeDisabled();
});

test('un correo ya registrado muestra el mensaje del backend', async ({ page }) => {
  // Arrange: la persona ya existe en el backend falso
  const registrados = await backendFalso(page);
  registrados.push({ email: PERSONA.correo, password: 'x' });
  const registro = new RegistroPage(page);
  await registro.abrir();

  // Act
  await registro.llenar(PERSONA);
  await registro.crearCuenta.click();

  // Assert: se queda en el registro con el aviso
  await expect(page.getByText('El correo ya está registrado')).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
});
