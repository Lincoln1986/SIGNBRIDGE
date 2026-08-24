# HISTORIAS DE USUARIO
## SignBridge
### Aplicación de traducción de lengua de señas colombiana (LSC)

* **CREATE:** Crear/Registrar
* **READ:** Consultar/Ver
* **UPDATE:** Modificar/Actualizar
* **DELETE:** Eliminar/Borrar

---

### HU-01: Registro de usuario
* **Operación CRUD:** CREATE
* **Prioridad:** ALTA

**Historia de usuario:**
Como persona no oyente o persona oyente, quiero poder crear una cuenta en la aplicación ingresando mis datos básicos, para acceder a las funciones de traducción de forma personalizada y segura.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario completa el formulario de registro con nombre, correo electrónico y contraseña, y confirma la contraseña. | El sistema crea la cuenta en la base de datos, envía confirmación y redirige al usuario a la pantalla principal. |
| 2 | El usuario ingresa una contraseña que no cumple el formato mínimo (menos de 8 caracteres o sin números). | El sistema resalta el campo y muestra: 'La contraseña debe tener mínimo 8 caracteres e incluir al menos un número'. No completa el registro. |
| 3 | El usuario intenta registrarse con un correo electrónico ya existente en el sistema. | El sistema muestra: 'Este correo ya está registrado. ¿Deseas iniciar sesión?' y no crea una cuenta duplicada. |
| 4 | El usuario deja campos obligatorios vacíos e intenta continuar. | El sistema resalta los campos vacíos con borde rojo y muestra: 'Por favor completa todos los campos requeridos'. |

---

### HU-02: Inicio de sesión
* **Operación CRUD:** READ
* **Prioridad:** MEDIA

**Historia de usuario:**
Como usuario registrado, quiero iniciar sesión con mi correo electrónico y contraseña, para acceder a mi cuenta y retomar mi experiencia personalizada donde la dejó.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario ingresa correo y contraseña correctos y presiona 'Iniciar sesión'. | El sistema valida las credenciales y redirige al usuario a la pantalla principal con sesión activa. |
| 2 | El usuario ingresa credenciales incorrectas. | El sistema muestra: 'Correo o contraseña incorrectos' sin especificar cuál campo falló, por razones de seguridad. |
| 3 | El usuario presiona la opción 'Olvidé mi contraseña'. | El sistema redirige a la pantalla de recuperación donde el usuario puede ingresar su correo registrado para recibir instrucciones. |

---

### HU-03: Traducción de seña a texto
* **Operación CRUD:** CREATE READ
* **Prioridad:** ALTA

**Historia de usuario:**
Como persona no oyente, quiero que la app capture mis señas a través de la cámara y las convierta en texto en tiempo real, para comunicarme con personas oyentes que no conocen la lengua de señas colombiana (LSC).

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario activa la cámara y realiza una seña reconocida por el sistema. | La app traduce la seña y muestra el texto en pantalla con latencia máxima de 2 segundos, visible para ambos interlocutores. |
| 2 | El usuario realiza una seña que el sistema no reconoce. | El sistema muestra: 'Seña no reconocida. Por favor intente de nuevo' sin generar texto incorrecto. |
| 3 | El usuario intenta usar la cámara sin haber concedido el permiso. | El sistema solicita el permiso; si el usuario lo niega, muestra instrucciones para habilitarlo desde los ajustes del dispositivo. |
| 4 | La seña es reconocida y el texto traducido aparece en pantalla. | El texto se muestra con fuente de mínimo 18pt y contraste suficiente para lectura cómoda del interlocutor oyente. |

---

### HU-04: Personalización del avatar
* **Operación CRUD:** READ UPDATE
* **Prioridad:** MEDIA

**Historia de usuario:**
Como persona no oyente, quiero personalizar los atributos visuales de mi avatar (tono de piel, ropa, género) para sentirme representado durante las traducciones y tener una experiencia más inclusiva.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario accede a la sección de personalización y modifica el tono de piel del avatar. | El avatar se actualiza visualmente en tiempo real reflejando el atributo seleccionado. |
| 2 | El usuario guarda los cambios realizados. | El sistema almacena la configuración y muestra: 'Cambios guardados exitosamente'. |
| 3 | El usuario cierra sesión y vuelve a iniciarla. | El avatar mantiene la personalización guardada previamente, sin pérdida de datos. |
| 4 | Ocurre un error al guardar los cambios. | El sistema muestra: 'No fue posible guardar los cambios. Inténtalo de nuevo' e indica que reintente la action. |

---

### HU-05: Cambio de contraseña
* **Operación CRUD:** UPDATE
* **Prioridad:** ALTA

**Historia de usuario:**
Como usuario registrado, quiero poder cambiar mi contraseña desde la configuración de mi cuenta o mediante un método de verificación, para mantener la seguridad de mi cuenta sin riesgo de perder el acceso.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario ingresa su contraseña actual y una nueva contraseña válida, luego confirma el cambio. | El sistema valida la contraseña actual, actualiza la contraseña en la base de datos y muestra: 'Contraseña actualizada correctamente'. |
| 2 | La nueva contraseña no cumple los requisitos mínimos | El sistema muestra los requisitos incumplidos (mínimo 8 caracteres, al menos un número) у no realiza el cambio. |
| 3 | El usuario no recuerda su contraseña actual y solicita recuperación por correo o número de celular. | El sistema envía un código de verificación al medio registrado por el usuario y permite establecer una nueva contraseña tras validar el código. |
| 4 | El usuario intenta cambiar la contraseña sin completar la verificación de identidad. | El sistema bloquea el proceso y muestra: 'Debes verificar tu identidad para continuar'. |

---

### HU-06: Envío de feedback
* **Operación CRUD:** CREATE
* **Prioridad:** MEDIA

**Historia de usuario:**
Como usuario, quiero enviar mi opinión sobre la aplicación mediante una calificación de 1 a 5 estrellas y un comentario opcional, para que el equipo de desarrollo pueda identificar áreas de mejora.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario selecciona una calificación de 1 a 5 estrellas y presiona 'Enviar'. | El sistema registra la calificación con fecha y hora, y muestra: 'Gracias por tu opinión. Tu feedback fue enviado'. |
| 2 | El usuario intenta enviar el formulario sin seleccionar una calificación. | El sistema muestra: 'Por favor selecciona una calificación antes de continuar' y no procesa el envío. |
| 3 | El usuario escribe un comentario adicional de hasta 500 caracteres junto con la calificación. | El sistema guarda el comentario junto a la calificación y confirma el envío con el mensaje de confirmación. |
| 4 | El usuario supera el límite de 500 caracteres en el comentario. | El sistema limita el ingreso al límite establecido y muestra: 'Has alcanzado el máximo de 500 caracteres'. |

---

### HU-07: Envío de ticket de soporte
* **Operación CRUD:** CREATE READ
* **Prioridad:** MEDIA

**Historia de usuario:**
Como usuario, quiero enviar un ticket de soporte describiendo mi problema y adjuntando evidencia opcional, para recibir asistencia técnica con seguimiento del estado de mi solicitud.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario escribe una descripción del problema y opcionalmente adjunta una imagen o video, luego envía el ticket. | El sistema crea el ticket con número único, fecha y estado inicial 'Pendiente', y muestra confirmación: 'Tu ticket #[número] fue enviado'. |
| 2 | El usuario intenta enviar un ticket con descripción vacía. | El sistema muestra: 'Por favor describe tu problema antes de enviar el ticket' y no procesa el envío. |
| 3 | El usuario consulta el estado de un ticket previamente enviado. | El sistema muestra el ticket con su número, fecha, descripción y estado actual (Pendiente / En revisión / Resuelto). |
| 4 | El estado del ticket es actualizado por el equipo de soporte. | El usuario recibe una notificación indicando el cambio de estado de su ticket. |

---

### HU-08: Traducción de texto a seña
* **Operación CRUD:** CREATE READ
* **Prioridad:** ALTA

**Historia de usuario:**
Como persona oyente, quiero escribir un texto en la aplicación y ver cómo se representa en lengua de señas colombiana (LSC) mediante el avatar animado, para comunicarme con personas no oyentes sin necesidad de conocer previamente la LSC.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario escribe una frase en el campo de texto y presiona 'Traducir'. | El avatar ejecuta la animación de señas correspondiente en un tiempo máximo de 3 segundos. |
| 2 | El texto contiene una palabra sin seña registrada en el sistema. | El sistema deletrea la palabra letra por letra en dactilología LSC y muestra: 'La palabra X fue deletreada letra por letra'. |
| 3 | El usuario presiona el botón 'Repetir'. | El sistema reproduce la animación desde el inicio sin necesidad de volver a escribir el texto. |
| 4 | El usuario deja el campo de texto vacío e intenta traducir. | El sistema muestra: 'Por favor ingresa un texto para traducir' y no inicia ninguna animación. |

---

### HU-09: Historial de traducciones
* **Operación CRUD:** READ DELETE
* **Prioridad:** MEDIA

**Historia de usuario:**
Como usuario registrado, quiero ver un historial de mis traducciones anteriores ordenado cronológicamente, para revisar conversaciones pasadas sin tener que repetirlas, especialmente en contextos médicos o legales.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario accede a la sección de historial. | El sistema lista las traducciones de la más reciente a la más antigua, mostrando fecha, hora y tipo de traducción (seña a texto / texto a seña). |
| 2 | El usuario busca una traducción por palabra clave o por fecha. | El sistema filtra y muestra únicamente las traducciones que coinciden con el criterio de búsqueda ingresado. |
| 3 | El usuario elimina un registro individual del historial. | El sistema elimina únicamente ese registro, actualiza la lista inmediatamente y muestra: 'Registro eliminado'. |
| 4 | El usuario elige limpiar todo el historial. | El sistema muestra: '¿Estás seguro? Esta acción no se puede deshacer'. Al confirmar, elimina todos los registros y muestra el historial vacío. |

---

### HU-10: Modo sin conexión
* **Operación CRUD:** CREATE READ
* **Prioridad:** ALTA

**Historia de usuario:**
Como usuario, quiero que la aplicación realice traducciones básicas sin conexión a internet, para usarla en zonas rurales o con señal limitada sin perder su funcionalidad esencial.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario descarga el paquete de señas básicas desde Configuración con conexión activa. | El sistema descarga y almacena el paquete localmente, y muestra: 'Paquete descargado. Ya puedes usar la app sin conexión'. |
| 2 | El dispositivo pierde la conexión a internet durante el uso de la app. | El sistema detecta la desconexión y activa el modo sin conexión mostrando el indicador: 'Modo sin conexión activado'. |
| 3 | El usuario intenta traducir una seña no incluida en el paquete básico mientras está sin conexión. | El sistema muestra: 'Esta seña no está disponible sin conexión' sin generar un error crítico. |
| 4 | El dispositivo recupera la conexión a internet. | El sistema detecta la reconexión, desactiva el modo sin conexión automáticamente y muestra: 'Conexión restaurada'. |

---

### HU-11: Guía rápida de uso de cámara
* **Operación CRUD:** READ
* **Prioridad:** MEDIA

**Historia de usuario:**
Como usuario nuevo, quiero ver una guía rápida al abrir la función de cámara por primera vez, para entender cómo posicionarme y realizar correctamente las señas ante la cámara.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario abre la función de cámara por primera vez. | El sistema muestra automáticamente una ventana emergente con la guía de uso (ilustraciones de posición de manos, distancia recomendada e iluminación). |
| 2 | El usuario presiona el botón 'Omitir' o cierra la guía. | La ventana emergente se cierra y el usuario accede directamente a la pantalla de cámara. La guía no vuelve a mostrarse automáticamente. |
| 3 | El usuario desea volver a ver la guía desde la configuración. | El sistema permite acceder a la guía nuevamente desde el menú de Ayuda sin necesidad de reinstalar la app. |

---

### HU-12: Buscador de señas (herramienta educativa)
* **Operación CRUD:** READ
* **Prioridad:** ALTA

**Historia de usuario:**
Como estudiante de lengua de señas, quiero buscar palabras específicas en un diccionario de señas, para aprender cómo se realiza cada seña de forma individual con una imagen o animación clara.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario escribe una palabra en el buscador. | El sistema filtra los resultados en tiempo real mostrando las palabras que coinciden con el texto ingresado. |
| 2 | El usuario selecciona una palabra de los resultados. | El sistema muestra una imagen o animación clara de la seña correspondiente junto con la descripción del movimiento. |
| 3 | El usuario busca una palabra que no existe en el diccionario. | El sistema muestra: 'No se encontró una seña para esta palabra. Puedes sugerirla a la comunidad'. |

---

### HU-13: Variantes regionales de señas
* **Operación CRUD:** READ
* **Prioridad:** MEDIA

**Historia de usuario:**
Como usuario, quiero consultar las variantes regionales de una seña según mi departamento en Colombia, para comunicarme de forma más natural respetando el contexto cultural local.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario selecciona su región o departamento desde un menú desplegable. | El sistema muestra las variantes de señas correspondientes a la región seleccionada para las palabras consultadas. |
| 2 | Una palabra tiene variantes en varias regiones. | El sistema muestra las variantes disponibles con la etiqueta de la región correspondiente (ej. 'Bogotá', 'Costa Atlántica'). |
| 3 | El sistema incluye ejemplos de uso en frases cotidianas para cada variante. | El usuario puede ver al menos un ejemplo de frase en LSC que contenga la seña regional seleccionada. |

---

### HU-14: Control de velocidad del avatar
* **Operación CRUD:** READ UPDATE
* **Prioridad:** ALTA

**Historia de usuario:**
Como aprendiz de LSC, quiero poder ajustar la velocidad de las animaciones del avatar (0.5x, 1x, 1.5x), para entender mejor los movimientos complejos durante el aprendizaje.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario mueve el control deslizante de velocidad a 0.5x. | La animación del avatar se reproduce a la mitad de la velocidad normal, manteniéndose fluida y sincronizada. |
| 2 | El usuario mueve el control deslizante de velocidad a 1.5x. | La animación se reproduce a mayor velocidad sin perder la sincronización ni la fluidez del movimiento. |
| 3 | El usuario cierra la sesión y vuelve a iniciarla. | El sistema recuerda la última velocidad elegida por el usuario y la aplica automáticamente al reiniciar la app. |

---

### HU-15: Traducción por voz a señas
* **Operación CRUD:** CREATE READ
* **Prioridad:** ALTA

**Historia de usuario:**
Como persona oyente, quiero dictar por voz lo que quiero decir para que el avatar lo traduzca a lengua de señas, sin necesidad de escribir, para agilizar la comunicación con personas no oyentes.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario presiona el icono de micrófono y comienza a hablar. | El sistema transcribe la voz a texto en tiempo real y lo muestra en el campo de entrada antes de iniciar la traducción. |
| 2 | El usuario presiona el botón 'Detener' durante la captura de audio. | El sistema detiene la escucha, muestra el texto capturado hasta ese momento y permite al usuario revisar o editar antes de traducir. |
| 3 | El sistema no detecta voz o el audio es muy bajo. | El sistema muestra: 'No se detectó audio. Verifica el micrófono e inténtalo de nuevo' sin generar texto vacío. |
| 4 | La transcripción de voz a texto es completada. | El avatar ejecuta la animación de señas correspondiente al texto transcrito en un máximo de 3 segundos. |

---

### HU 16: Foro comunitario de dudas sobre señas
* **Operación CRUD:** CREATE READ
* **Prioridad:** BAJA

**Historia de usuario:**
Como usuario interesado en aprender LSC, quiero publicar dudas sobre señas específicas con texto o video, para que expertos o la comunidad me ayuden a resolverlas.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario publica una pregunta con texto o adjunta un video de la seña sobre la que tiene duda. | El sistema crea la publicación en la sección del foro con fecha, nombre de usuario y tipo de contenido adjunto. |
| 2 | Otro usuario responde a la pregunta publicada. | El sistema registra la respuesta vinculada a la pregunta original y notifica al autor de la duda. |
| 3 | Los usuarios votan la utilidad de una respuesta. | El sistema registra los votos y ordena las respuestas de mayor a menor utilidad dentro de la publicación. |
| 4 | El autor de la pregunta recibe una respuesta. | El sistema envía una notificación push o en la app indicando: 'Alguien respondió tu pregunta sobre [seña]'. |

---

### HU 17: Exportar historial de traducciones
* **Operación CRUD:** READ
* **Prioridad:** MEDIA

**Historia de usuario:**
Como usuario registrado, quiero exportar mis traducciones guardadas en formato PDF, para compartirlas con terceros o usarlas como respaldo en trámites administrativos o médicos.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario presiona el botón 'Exportar' dentro del historial de traducciones. | El sistema genera un PDF que incluye fecha, hora, texto traducido y tipo de traducción de cada registro seleccionado. |
| 2 | El usuario selecciona un rango de fechas específico antes de exportar. | El PDF contiene únicamente las traducciones comprendidas en el rango de fechas indicado. |
| 3 | No hay registros en el historial para exportar. | El sistema muestra: 'No hay traducciones para exportar en el rango seleccionado' y no genera el archivo. |

---

### HU 18: Cierre de sesión
* **Operación CRUD:** UPDATE
* **Prioridad:** MEDIA

**Historia de usuario:**
Como usuario, quiero cerrar mi sesión desde la aplicación, para evitar que mi cuenta quede activa en dispositivos ajenos y proteger mi información personal.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario presiona el botón 'Cerrar sesión' desde el menú de perfil. | El sistema invalida la sesión activa, redirige al usuario a la pantalla de inicio de sesión y elimina los datos de sesión del dispositivo. |
| 2 | Otro usuario intenta usar la app en el mismo dispositivo después del cierre de sesión. | El sistema muestra la pantalla de inicio de sesión y requiere ingresar credenciales válidas para continuar. |
| 3 | El usuario intenta acceder a una sección protegida sin sesión activa. | El sistema redirige automáticamente a la pantalla de inicio de sesión con el mensaje: 'Debes iniciar sesión para continuar'. |

---

### HU 19: Modo oscuro / Modo claro
* **Operación CRUD:** UPDATE
* **Prioridad:** BAJA

**Historia de usuario:**
Como usuario, quiero poder alternar entre modo oscuro y modo claro desde la configuración de la aplicación, para adaptar la interfaz a mis condiciones visuales o de iluminación del entorno.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario activa el modo oscuro desde la configuración. | Toda la interfaz cambia al tema oscuro (fondos oscuros, texto claro) de forma inmediata sin reiniciar la app. |
| 2 | El usuario activa el modo claro desde la configuración. | Toda la interfaz cambia al tema claro (fondos blancos, texto oscuro) de forma inmediata y con contraste adecuado para facilitar la lectura. |
| 3 | El usuario cierra y vuelve a abrir la aplicación. | El sistema mantiene el tema seleccionado (oscuro o claro) sin regresar al valor predeterminado. |

---

### HU 20: Accesibilidad: subtítulos y personalización visual
* **Operación CRUD:** READ UPDATE
* **Prioridad:** ALTA

**Historia de usuario:**
Como usuario, quiero activar subtítulos en tiempo real y personalizar el tamaño de texto, contraste e interfaz visual, para garantizar una experiencia inclusiva y adaptable a mis necesidades de accesibilidad.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario activa los subtítulos mediante el botón visible en la barra de controles. | Los subtítulos aparecen en pantalla con un retraso máximo de 2 segundos respecto al audio o la seña capturada. |
| 2 | Los subtítulos se muestran sobre cualquier tipo de fondo. | El texto de los subtítulos usa un sombreado o caja de fondo que garantiza legibilidad sobre fondos claros y oscuros. |
| 3 | El usuario ajusta el tamaño del texto desde la configuración de accesibilidad. | El sistema aplica el tamaño seleccionado en toda la interfaz de forma inmediata, sin necesidad de reiniciar la app. |
| 4 | El usuario activa alto contraste desde la configuración de accesibilidad. | El sistema aplica un esquema de alto contraste (fondo negro, texto blanco o amarillo) en toda la interfaz. |

---

### HU 21: Eliminación de cuenta de usuario
* **Operación CRUD:** DELETE
* **Prioridad:** ALTA

**Historia de usuario:**
Como usuario registrado, quiero poder eliminar permanentemente mi cuenta de la aplicación, para asegurarme de que mis datos personales sean borrados del sistema cuando ya no desee utilizar el servicio.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario accede a la configuración de su cuenta y selecciona la opción ‘Eliminar cuenta’. | El sistema muestra un mensaje de confirmación: ‘¿Estás seguro? Esta acción es irreversible y eliminará todos tus datos’. El usuario debe confirmar para continuar. |
| 2 | El usuario confirma la eliminación e ingresa su contraseña actual como verificación de identidad. | El sistema valida la contraseña, elimina la cuenta y todos los datos asociados, y muestra: ‘Tu cuenta ha sido eliminada exitosamente’. El usuario es redirigido a la pantalla de inicio. |
| 3 | El usuario intenta eliminar la cuenta sin completar la verificación de identidad. | El sistema bloquea el proceso y muestra: ‘Debes verificar tu identidad para continuar’. La cuenta no es eliminada. |
| 4 | Otro usuario intenta acceder a la cuenta eliminada usando las mismas credenciales. | El sistema muestra: ‘Correo o contraseña incorrectos’ sin revelar que la cuenta fue eliminada, por razones de seguridad y privacidad. |

# Historias de usuario nuevas

### HU-22: Carga de vocabulario con videos propios (Admin)
* **Operación CRUD:** CREATE
* **Prioridad:** MEDIA

**Historia de usuario:**
Como usuario con rol Admin, quiero poder cargar palabras de vocabulario junto con sus propios videos de YouTube, para enriquecer el contenido educativo sin depender únicamente de videos predefinidos.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El Admin accede a la sección de Vocabulario y selecciona "Agregar nueva palabra". | El sistema muestra un formulario con campo para el nombre de la palabra y un campo para la URL del video de YouTube. |
| 2 | El Admin ingresa una URL válida de YouTube y guarda. | El sistema valida el enlace, lo asocia a la palabra y la guarda en el vocabulario. |
| 3 | El Admin ingresa una URL inválida o de otro origen. | El sistema muestra el mensaje: "Enlace de video no válido". |
| 4 | Un usuario visualiza la palabra cargada en la sección de Vocabulario. | El video embebido se reproduce correctamente dentro de la plataforma. |

---

### HU-23: Visualización de reportes y estadísticas con gráficos (Admin)
* **Operación CRUD:** READ
* **Prioridad:** MEDIA

**Historia de usuario:**
Como usuario con rol Admin, quiero visualizar reportes y estadísticas de uso mediante gráficos, para tener una vista clara del comportamiento de los usuarios en la plataforma.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El Admin accede a la sección de Reportes. | El sistema muestra gráficos (barras/líneas) con estadísticas de uso de la plataforma. |
| 2 | El Admin selecciona un rango de fechas. | Los gráficos se actualizan mostrando únicamente los datos del período seleccionado. |
| 3 | No existen datos suficientes para el período consultado. | El sistema muestra el mensaje: "No hay datos disponibles para este período". |

---

### HU-24: Dashboard de gestión de tickets (Soporte)
* **Operación CRUD:** READ UPDATE
* **Prioridad:** ALTA

**Historia de usuario:**
Como usuario con rol Soporte, quiero contar con un panel propio donde pueda ver y gestionar los tickets enviados por los usuarios, para dar seguimiento y actualizar su estado sin depender del panel de administrador.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario con rol Soporte inicia sesión. | El sistema lo redirige a su propio dashboard, donde puede ver la lista de tickets pendientes, en revisión y resueltos. |
| 2 | El usuario de Soporte selecciona un ticket y cambia su estado. | El sistema actualiza el estado del ticket, registra la fecha del cambio y notifica al usuario que lo creó. |
| 3 | Un usuario con rol distinto a Soporte intenta acceder al dashboard de tickets. | El sistema bloquea el acceso y muestra: 'No tienes permisos para ver esta sección'. |
| 4 | El usuario de Soporte filtra los tickets por estado (Pendiente / En revisión / Resuelto). | El sistema muestra únicamente los tickets que coinciden con el filtro seleccionado. |

---

### HU-26: Traducción de frases completas (texto ↔ lengua de señas)
* **Operación CRUD:** READ
* **Prioridad:** ALTA

**Historia de usuario:**
Como usuario, quiero traducir frases completas (no solo palabras sueltas) tanto de texto a lengua de señas como de lengua de señas a texto, para comunicarme de forma más natural y fluida.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario ingresa una frase completa en texto (ej. "Hola familia"). | El sistema genera la secuencia de señas correspondiente a cada palabra de la frase, en orden. |
| 2 | El usuario realiza una secuencia de señas correspondiente a una frase. | El sistema reconoce la secuencia y muestra el texto completo de la frase. |
| 3 | El usuario ingresa una frase que contiene palabras no reconocidas por el sistema. | El sistema traduce las palabras reconocidas e indica cuáles no pudo traducir. |
| 4 | El usuario ingresa una sola palabra (ej. "Hola"), como en el uso anterior. | El sistema mantiene compatibilidad y la traduce correctamente (no rompe la funcionalidad existente). |

---

### HU-27: Traducción de audio a lengua de señas
* **Operación CRUD:** READ
* **Prioridad:** ALTA

**Historia de usuario:**
Como usuario, quiero convertir audio hablado en lengua de señas, para que las personas sordas puedan comprender mensajes hablados sin necesidad de un texto intermedio.

#### CRITERIOS DE ACEPTACIÓN
| # | Criterio (condición / acción) | Resultado esperado |
|---|-------------------------------|--------------------|
| 1 | El usuario graba o carga un archivo de audio. | El sistema transcribe el audio a texto y luego genera la secuencia de señas correspondiente. |
| 2 | El audio no es claro o el sistema no logra reconocerlo. | El sistema muestra el mensaje: "No se pudo procesar el audio". |
| 3 | El usuario reproduce el audio dentro de la plataforma. | Las señas se muestran sincronizadas con el contenido hablado. |
