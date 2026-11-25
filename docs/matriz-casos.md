
# Matriz de casos de prueba — SignBridge

Ficha 3228973 B · Se ejecuta a mano el **24 de noviembre** sobre el stack levantado
con `docker compose up -d --build` (base recién creada por Alembic).
Alcance y criterios: [`docs/plan-pruebas.md`](plan-pruebas.md).

**Cómo llenarla:** en *Resultado* escribe ✅ Pasa, ❌ Falla o ⏸ Bloqueado. Si falla,
crea un issue con la etiqueta `defecto` y su severidad, y pon el número en *Issue*.

**Datos de prueba:**

| Usuario | Correo | Contraseña | Rol |
|---|---|---|---|
| Cliente | `cliente.prueba@example.com` | `Password1!` | Cliente (se crea en CP-01) |
| Soporte | `soporte.prueba@example.com` | `Password1!` | Soporte (registrar y cambiar el rol desde el panel admin) |
| Admin | `admin.prueba@example.com` | `Password1!` | Administrador (registrar y asignar el rol como dice el README) |

---

## Casos

| ID | HU | Caso | Precondición | Pasos | Resultado esperado | Prioridad | Resultado | Issue |
|---|---|---|---|---|---|---|---|---|
| CP-01 | HU-01 | Registro exitoso | Correo no registrado | 1. Abrir `/register` 2. Llenar nombre, apellido, teléfono, ciudad, correo y contraseña válida 3. Registrarse | Cuenta creada, mensaje de éxito y redirección | Alta | ✅ Pasa | |
| CP-02 | HU-01 | Correo ya registrado | CP-01 hecho | Registrarse otra vez con el mismo correo | "Este correo ya está registrado"; no se crea otra cuenta | Alta | ✅ Pasa | |
| CP-03 | HU-01 | Contraseña débil | — | Registrarse con contraseña `abc` | Muestra los requisitos incumplidos y no registra | Media | ✅ Pasa | |
| CP-04 | HU-01 | Campos vacíos | — | Enviar el formulario de registro vacío | Campos resaltados y mensaje de validación | Media | ✅ Pasa | |
| CP-05 | HU-02 | Login correcto como Cliente | CP-01 hecho | Iniciar sesión con el Cliente | Entra a su panel (`/dashboard`) | Alta | ✅ Pasa | |
| CP-06 | HU-02 | Contraseña incorrecta | CP-01 hecho | Iniciar sesión con `Otra1234!` | Mensaje de credenciales incorrectas; la página **no** se recarga | Alta | ✅ Pasa | |
| CP-07 | HU-02 | Panel según el rol | Usuarios Soporte y Admin creados | Iniciar sesión con cada rol | Soporte → `/support`, Admin → `/admin` | Alta | ✅ Pasa | |
| CP-08 | Seguridad | Cliente intenta entrar a `/admin` | Sesión de Cliente | Escribir `/admin` en la barra de direcciones | Vuelve a su propio panel | Alta | ✅ Pasa | |
| CP-09 | HU-18 | Cerrar sesión | Sesión abierta | Clic en cerrar sesión y luego ir a `/dashboard` | Lleva al inicio de sesión | Media | ✅ Pasa | |
| CP-10 | HU-05 | Recuperar contraseña | Cliente creado | 1. "Olvidé mi contraseña" 2. Escribir el correo | Mensaje de que se envió el correo (en Mailtrap si está configurado) | Media | ✅ Pasa | |
| CP-11 | HU-08 | Traducir texto a señas | Sesión de Cliente | Escribir "hola" y traducir | Se reproduce el video de la seña | Alta | ✅ Pasa | |
| CP-12 | HU-08 | Texto vacío | Sesión de Cliente | Traducir un texto solo con espacios | No traduce y muestra el error | Media | ✅ Pasa | |
| CP-13 | HU-26 | Frase de varias palabras | Sesión de Cliente | Traducir "buenos días" | Se reconoce como una sola seña | Media | ✅ Pasa | |
| CP-14 | HU-15 | Voz a señas | Sesión de Cliente, micrófono permitido | Dictar "hola" | Aparece el texto y se reproduce la seña | Media | ✅ Pasa | |
| CP-15 | HU-04 | Reproducción secuencial | Sesión de Cliente | Traducir "hola amigo" | Los videos se reproducen uno después del otro | Media | ✅ Pasa | |
| CP-16 | HU-12 | Buscar en el vocabulario | Sesión de Cliente | Buscar "agua" en Vocabulario | Muestra la seña con su video | Media | ✅ Pasa | |
| CP-17 | HU-06 | Valorar una traducción | CP-11 hecho | Dar 5 estrellas con un comentario | Valoración guardada y aparece en "Mis valoraciones" | Media | ✅ Pasa | |
| CP-18 | HU-06 | Votar la misma palabra dos veces | CP-17 hecho | Volver a calificar la misma palabra | Debe quedar **un solo voto** por usuario y palabra (issue #45) | Alta | ✅ Pasa | |
| CP-19 | HU-07 | Crear ticket de soporte | Sesión de Cliente | Escribir asunto y mensaje, enviar | Ticket en "Pendiente" y aparece en mis tickets | Alta | ✅ Pasa | |
| CP-20 | HU-07 | Editar ticket ya tomado | CP-19 hecho y Soporte lo pasó a "En proceso" | El Cliente intenta editarlo | No deja editar (409) | Media | ✅ Pasa | |
| CP-21 | HU-24 | Soporte resuelve un ticket | CP-19 hecho, sesión de Soporte | Cambiar a "Resuelto" sin escribir solución | Rechaza: la solución es obligatoria | Alta | ✅ Pasa | |
| CP-22 | HU-24 | Notificación al resolver | CP-21 con solución escrita | Iniciar sesión como el Cliente | Le llega la notificación con la solución | Media | ✅ Pasa | |
| CP-23 | HU-22 | Admin carga una seña con video | Sesión de Admin | Agregar palabra con URL de video válida | Aparece en el vocabulario | Media | ✅ Pasa | |
| CP-24 | HU-22 | URL de video inválida | Sesión de Admin | Agregar palabra con URL `no-es-url` | Rechaza la URL | Baja | ✅ Pasa | |
| CP-25 | HU-23 | Estadísticas del admin | Datos de CP-11 a CP-19 | Abrir el panel admin | Las gráficas muestran las traducciones y los tickets | Media | ✅ Pasa | |
| CP-26 | HU-20 | Accesibilidad con teclado | — | Recorrer el login solo con Tab | Se llega a todos los campos y al botón de ver contraseña | Media | ✅ Pasa | |

**Total: 26 casos** · Alta: 10 · Media: 15 · Baja: 1

---

## Resumen de la ejecución (24 de noviembre)

| Resultado | Cantidad | % |
|---|---:|---:|
| ✅ Pasa | 26 | 100 % |
| ❌ Falla | 0 | 0 % |
| ⏸ Bloqueado | 0 | 0 % |
| **Total** | **26** | **100 %** |

Criterio de salida del plan: **≥ 90 % de casos aprobados** y ningún defecto alto abierto.

**Estado: CUMPLIDO.**
