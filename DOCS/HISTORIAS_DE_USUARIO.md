# Historias de Usuario — SignBridge

**Aplicación de traducción de Lengua de Señas Colombiana (LSC)**
Ficha 3228973 B · TG. Análisis y Desarrollo de Software · V Trimestre

---

## Convenciones

| Operación | Significado |
|---|---|
| CREATE | Crear / Registrar |
| READ | Consultar / Ver |
| UPDATE | Modificar / Actualizar |
| DELETE | Eliminar / Borrar |

| Estado | Significado |
|---|---|
| ✅ Terminada | Implementada y verificada |
| 🔄 En curso | En desarrollo dentro del sprint actual |
| 📋 Backlog | Planificada para un sprint posterior |

---

## Nota de reajuste de alcance

Durante el Sprint 6 se replanteó el enfoque de representación de las señas.
El diseño inicial (HU-04 y HU-14) contemplaba un **avatar animado 3D**, pero
el equipo grabó **videos reales de personas señantes**, que resultan más
fieles a la LSC y no dependen de modelado ni animación.

Las historias de avatar se reemplazaron por historias de **reproducción de
video**, que es lo que el producto usa hoy. El avatar queda documentado en el
backlog por si en un trimestre posterior se retoma.

También se incorporó **HU-25 (detección de manos con MediaPipe)**, que estaba
implícita en HU-03 pero no documentada como historia propia. Separarla permite
medir su avance de forma independiente.

---

## Alcance del V Trimestre — Sprints 1 a 7

### HU-01: Registro de usuario
**CRUD:** CREATE · **Prioridad:** ALTA · **Sprint 1** · ✅ Terminada

Como persona no oyente u oyente, quiero crear una cuenta ingresando mis datos
básicos, para acceder a las funciones de traducción de forma personalizada y
segura.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Completa el formulario con nombre, correo y contraseña | El sistema crea la cuenta, envía correo de bienvenida y redirige al panel | ✅ |
| 2 | Ingresa una contraseña que no cumple el formato | Muestra los requisitos incumplidos y no completa el registro | ✅ |
| 3 | Usa un correo ya registrado | Muestra "Este correo ya está registrado" y no duplica la cuenta | ✅ |
| 4 | Deja campos obligatorios vacíos | Resalta los campos y muestra el mensaje de validación | ✅ |

---

### HU-02: Inicio de sesión
**CRUD:** READ · **Prioridad:** ALTA · **Sprint 1** · ✅ Terminada

Como usuario registrado, quiero iniciar sesión con mi correo y contraseña,
para acceder a mi cuenta y retomar mi experiencia.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Ingresa credenciales correctas | Valida y entrega un token JWT; redirige según el rol | ✅ |
| 2 | Ingresa credenciales incorrectas | Muestra "Credenciales incorrectas" sin indicar cuál campo falló | ✅ |
| 3 | Presiona "Olvidé mi contraseña" | Redirige a la pantalla de recuperación | ✅ |

---

### HU-05: Cambio y recuperación de contraseña
**CRUD:** UPDATE · **Prioridad:** ALTA · **Sprint 1** · ✅ Terminada

Como usuario registrado, quiero cambiar mi contraseña o recuperarla si la
olvidé, para mantener la seguridad de mi cuenta sin perder el acceso.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Solicita recuperación con su correo registrado | El sistema envía un enlace con token de un solo uso | ✅ |
| 2 | La nueva contraseña no cumple los requisitos | Muestra los requisitos incumplidos y no realiza el cambio | ✅ |
| 3 | Usa un token vencido o ya utilizado | Muestra "El enlace no es válido o ya expiró" | ✅ |

---

### HU-18: Cierre de sesión
**CRUD:** UPDATE · **Prioridad:** MEDIA · **Sprint 1** · ✅ Terminada

Como usuario, quiero cerrar mi sesión, para evitar que mi cuenta quede activa
en dispositivos ajenos.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Presiona "Salir" | Invalida el token local y redirige al inicio de sesión | ✅ |
| 2 | Intenta acceder a una sección protegida sin sesión | Redirige al inicio de sesión | ✅ |
| 3 | Un usuario con rol distinto entra a una ruta ajena | Redirige a su propio panel según el rol | ✅ |

---

### HU-08: Traducción de texto a señas
**CRUD:** CREATE READ · **Prioridad:** ALTA · **Sprint 2** · ✅ Terminada

Como persona oyente, quiero escribir un texto y ver su representación en LSC,
para comunicarme con personas no oyentes sin conocer previamente la lengua.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Escribe una frase y presiona "Traducir a señas" | Muestra la secuencia de videos correspondiente | ✅ |
| 2 | El texto contiene una palabra sin seña registrada | La reporta como "sin seña" e intenta deletrearla | ✅ |
| 3 | Presiona "Repetir" en el historial de la sesión | Vuelve a reproducir sin reescribir el texto | ✅ |
| 4 | Deja el campo vacío e intenta traducir | Muestra el mensaje de validación y no traduce | ✅ |

---

### HU-15: Traducción por voz a señas
**CRUD:** CREATE READ · **Prioridad:** ALTA · **Sprint 2** · ✅ Terminada

Como persona oyente, quiero dictar por voz lo que quiero decir para que se
traduzca a señas, sin necesidad de escribir.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Presiona el micrófono y habla | Transcribe la voz a texto en tiempo real en el campo de entrada | ✅ |
| 2 | Presiona "Detener" | Muestra el texto capturado y permite revisarlo antes de traducir | ✅ |
| 3 | No se detecta voz | Muestra "No se detectó audio" sin generar texto vacío | ✅ |
| 4 | La transcripción se completa | Reproduce la secuencia de señas del texto transcrito | ✅ |

---

### HU-26: Traducción de frases completas
**CRUD:** READ · **Prioridad:** ALTA · **Sprint 2** · ✅ Terminada

Como usuario, quiero traducir frases completas y no solo palabras sueltas,
para comunicarme de forma más natural.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Ingresa una frase de varias palabras | Genera la secuencia de señas de cada palabra, en orden | ✅ |
| 2 | La frase contiene una entrada de varias palabras ("buenas noches") | La reconoce como **una sola seña**, no como dos palabras sueltas | ✅ |
| 3 | La frase contiene palabras no reconocidas | Traduce las reconocidas e indica cuáles no pudo traducir | ✅ |
| 4 | Ingresa una sola palabra | Mantiene compatibilidad y la traduce correctamente | ✅ |

> El criterio 2 se resolvió cambiando el algoritmo: antes recorría palabra por
> palabra, por lo que una entrada de dos palabras del diccionario era
> imposible de encontrar. Ahora prueba primero el grupo más largo.

---

### HU-04: Reproducción secuencial de señas *(reemplaza «Personalización del avatar»)*
**CRUD:** READ · **Prioridad:** ALTA · **Sprint 2** · ✅ Terminada

Como usuario, quiero que los videos de todas las señas de una frase se
reproduzcan uno tras otro automáticamente, para leer la frase completa sin
tener que iniciar cada video a mano.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Traduce una frase con varias señas | Los videos se reproducen en secuencia sin intervención | ✅ |
| 2 | Está viendo la secuencia | Un contador indica en qué seña va (ej. "2 / 3") | ✅ |
| 3 | Quiere volver a una seña puntual | Puede tocar el nombre de cualquier seña para saltar a ella | ✅ |
| 4 | Termina la secuencia | Puede reproducir todo de nuevo con un botón | ✅ |

---

### HU-14: Controles de reproducción de video *(reemplaza «Velocidad del avatar»)*
**CRUD:** READ UPDATE · **Prioridad:** MEDIA · **Sprint 7** · 🔄 En curso

Como aprendiz de LSC, quiero controlar la reproducción de los videos de señas
(velocidad, sonido, repetición), para entender mejor los movimientos complejos.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Activa o silencia el sonido | El video responde de inmediato | ✅ |
| 2 | Avanza a la siguiente seña o reinicia la secuencia | Los controles responden sin recargar la página | ✅ |
| 3 | Ajusta la velocidad a 0.5x o 1.5x | El video se reproduce a esa velocidad manteniendo la fluidez | 🔄 |

---

### HU-03: Traducción de señas a texto
**CRUD:** CREATE READ · **Prioridad:** ALTA · **Sprint 3** · 🔄 En curso

Como persona no oyente, quiero que la app capture mis señas por la cámara y
las convierta en texto, para comunicarme con personas oyentes.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Activa la cámara y concede permisos | La app muestra el video en vivo y el estado de la detección | ✅ |
| 2 | Niega el permiso de cámara | Muestra instrucciones para habilitarlo desde el navegador | ✅ |
| 3 | Realiza una seña reconocida | Muestra el texto correspondiente | 🔄 Depende de HU-25 |
| 4 | Realiza una seña no reconocida | Muestra "Seña no reconocida" sin generar texto incorrecto | 🔄 Depende de HU-25 |

---

### HU-25: Detección de manos con MediaPipe *(historia nueva)*
**CRUD:** CREATE · **Prioridad:** ALTA · **Sprint 3** · 🔄 En curso

Como sistema, necesito detectar la posición de las manos en el video de la
cámara mediante MediaPipe, para poder interpretar las señas en lugar de
devolver una respuesta simulada.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | MediaPipe está instalado en el contenedor | El backend arranca sin el aviso "MediaPipe no instalado" | 📋 |
| 2 | Se envía un frame con una mano visible | Devuelve los 21 puntos de referencia de la mano | 📋 |
| 3 | Se envía un frame sin manos | Responde "No se detectó ninguna mano" sin error | 📋 |
| 4 | El reconocimiento falla o la librería no está | El sistema degrada a modo simulado y lo informa en la respuesta | ✅ |

> **Nota técnica.** MediaPipe requiere las librerías del sistema `libgl1` y
> `libglib2.0-0` dentro del contenedor. El alcance de esta historia se acotó
> al **abecedario dactilológico** (letras estáticas), que se puede clasificar
> con reglas geométricas sobre los puntos de la mano y no necesita entrenar un
> modelo. El reconocimiento de señas completas exige un dataset etiquetado que
> el equipo no tiene, y queda en el backlog como HU-28.

---

### HU-12: Buscador de señas (diccionario)
**CRUD:** READ · **Prioridad:** ALTA · **Sprint 4** · ✅ Terminada

Como estudiante de LSC, quiero buscar palabras en un diccionario de señas,
para aprender cómo se realiza cada una.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Escribe una palabra en el buscador | Filtra los resultados en tiempo real | ✅ |
| 2 | Selecciona una palabra | Muestra el video de la seña correspondiente | ✅ |
| 3 | Filtra por letra del abecedario dactilológico | Muestra solo las señas que empiezan por esa letra | ✅ |
| 4 | Consulta la confiabilidad de una traducción | Ve el promedio de estrellas y la cantidad de votos de esa seña | ✅ |

---

### HU-06: Valoraciones y opiniones
**CRUD:** CREATE READ UPDATE DELETE · **Prioridad:** MEDIA · **Sprint 4** · ✅ Terminada

Como usuario, quiero calificar la aplicación y la traducción de cada palabra,
para que el equipo identifique áreas de mejora y otros usuarios sepan qué
señas son confiables.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Selecciona de 1 a 5 estrellas y envía | Registra la calificación con fecha y confirma el envío | ✅ |
| 2 | Intenta enviar sin seleccionar calificación | Muestra el mensaje de validación y no procesa | ✅ |
| 3 | Califica una palabra puntual del diccionario | El promedio de esa palabra queda visible para todos los usuarios | ✅ |
| 4 | Vuelve a calificar la misma palabra | **Actualiza su voto anterior**, no suma uno nuevo | ✅ |
| 5 | Soporte revisa una valoración | Debe responder (manual o con plantilla rápida) para marcarla revisada | ✅ |

> El criterio 4 corrige un defecto detectado en pruebas: hacer clic repetido en
> las estrellas insertaba una fila por cada clic, lo que permitía inflar el
> promedio sin límite. Se resolvió con actualización del voto y un índice único
> en base de datos.

---

### HU-07: Tickets de soporte
**CRUD:** CREATE READ UPDATE DELETE · **Prioridad:** MEDIA · **Sprint 4** · ✅ Terminada

Como usuario, quiero enviar un ticket describiendo mi problema y hacer
seguimiento de su estado, para recibir asistencia técnica.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Escribe una descripción y envía el ticket | Crea el ticket con estado inicial "Pendiente" y confirma | ✅ |
| 2 | Intenta enviar con la descripción vacía | Muestra el mensaje de validación y no procesa | ✅ |
| 3 | Consulta el estado de un ticket enviado | Ve fecha, descripción y estado actual | ✅ |
| 4 | Soporte cambia el estado a "Resuelto" | **Recibe una notificación** en la app y por correo, con la solución | ✅ |
| 5 | Quiere corregir o retirar su ticket | Puede editarlo mientras siga pendiente, o eliminarlo | ✅ |

---

### HU-24: Dashboard de gestión de tickets (Soporte)
**CRUD:** READ UPDATE · **Prioridad:** ALTA · **Sprint 4** · ✅ Terminada

Como usuario con rol Soporte, quiero un panel propio para ver y gestionar los
tickets, sin depender del panel de administrador.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Inicia sesión con rol Soporte | Es redirigido a su propio dashboard con la lista de tickets | ✅ |
| 2 | Cambia el estado de un ticket a "Resuelto" | **Debe escribir la solución**; sin ella el sistema rechaza el cambio | ✅ |
| 3 | Un rol distinto intenta acceder al panel | El sistema bloquea el acceso | ✅ |
| 4 | El Administrador entra al panel de tickets | Puede **verlos pero no modificarlos** (solo lectura) | ✅ |
| 5 | Filtra los tickets por estado | Muestra únicamente los que coinciden con el filtro | ✅ |

---

### HU-09: Historial de traducciones
**CRUD:** READ DELETE · **Prioridad:** MEDIA · **Sprint 5** · 🔄 En curso

Como usuario registrado, quiero ver mis traducciones anteriores ordenadas
cronológicamente, para revisar conversaciones pasadas sin repetirlas.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Accede a la sección Historial | Lista las traducciones agrupadas por día, de la más reciente a la más antigua | ✅ |
| 2 | Consulta una traducción | Ve la fecha, la hora, el canal de entrada y las señas en orden | ✅ |
| 3 | Filtra por período | Puede ver los últimos 7, 30, 90 días o el último año | ✅ |
| 4 | Elimina un registro individual | Elimina solo ese registro y actualiza la lista | 🔄 |
| 5 | Busca por palabra clave | Filtra las traducciones que contienen esa seña | 🔄 |

---

### HU-22: Carga de vocabulario con videos propios (Admin)
**CRUD:** CREATE UPDATE DELETE · **Prioridad:** MEDIA · **Sprint 5** · ✅ Terminada

Como Administrador, quiero cargar palabras de vocabulario con sus videos, para
enriquecer el contenido educativo.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Selecciona "Nueva palabra" | Muestra el formulario con la palabra y la URL del video | ✅ |
| 2 | Ingresa una URL válida y guarda | Valida el enlace, lo asocia a la palabra y la guarda | ✅ |
| 3 | Ingresa una URL inválida | Muestra "Enlace de video no válido" | ✅ |
| 4 | Un usuario visualiza la palabra cargada | El video se reproduce dentro de la plataforma | ✅ |
| 5 | Edita o elimina una palabra existente | Actualiza el video o retira la palabra del diccionario | ✅ |

---

### HU-23: Reportes y estadísticas de uso (Admin)
**CRUD:** READ · **Prioridad:** MEDIA · **Sprint 6** · ✅ Terminada

Como Administrador, quiero visualizar estadísticas de uso mediante gráficos,
para entender el comportamiento de los usuarios en la plataforma.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Accede a la sección de Estadísticas | Muestra gráficos de barras, líneas y distribución | ✅ |
| 2 | Consulta las señas más traducidas | Ve el ranking con la calificación promedio de cada una | ✅ |
| 3 | Selecciona un rango de fechas | Los gráficos se actualizan al período seleccionado | ✅ |
| 4 | No hay datos para el período | Muestra "Sin actividad en el período seleccionado" | ✅ |
| 5 | Toca una barra o una tarjeta | Abre el detalle con el desglose de esa métrica | ✅ |
| 6 | Consulta su propio uso como usuario | Ve sus señas más usadas y su actividad diaria | ✅ |

---

### HU-20: Accesibilidad y personalización visual
**CRUD:** READ UPDATE · **Prioridad:** ALTA · **Sprint 6** · ✅ Terminada

Como usuario, quiero personalizar el tamaño de texto, contraste e interfaz,
para una experiencia inclusiva y adaptable a mis necesidades.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Ajusta el tamaño del texto | Se aplica en toda la interfaz sin recargar | ✅ |
| 2 | Activa alto contraste o contraste oscuro | Se aplica el esquema en toda la interfaz | ✅ |
| 3 | Activa la fuente apta para dislexia | Cambia la tipografía de toda la aplicación | ✅ |
| 4 | Usa el lector de página | El sistema lee el contenido en voz alta | ✅ |
| 5 | Cierra y vuelve a abrir la aplicación | Mantiene las preferencias seleccionadas | ✅ |

---

### HU-11: Guía rápida de uso de la cámara
**CRUD:** READ · **Prioridad:** MEDIA · **Sprint 7** · 📋 Backlog

Como usuario nuevo, quiero ver una guía al abrir la cámara por primera vez,
para saber cómo posicionarme y realizar las señas correctamente.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Abre la cámara por primera vez | Muestra una guía con posición de manos, distancia e iluminación | 📋 |
| 2 | Presiona "Omitir" | Cierra la guía y no vuelve a mostrarla automáticamente | 📋 |
| 3 | Quiere volver a verla | Puede abrirla desde el menú de ayuda | 📋 |

---

### HU-19: Modo oscuro / Modo claro
**CRUD:** UPDATE · **Prioridad:** BAJA · **Sprint 7** · 📋 Backlog

Como usuario, quiero alternar entre modo oscuro y claro, para adaptar la
interfaz a mis condiciones visuales o de iluminación.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Activa el modo oscuro | La interfaz cambia al tema oscuro de inmediato | 📋 |
| 2 | Activa el modo claro | La interfaz cambia al tema claro con contraste adecuado | 📋 |
| 3 | Cierra y reabre la aplicación | Mantiene el tema seleccionado | 📋 |

---

### HU-21: Eliminación de cuenta de usuario
**CRUD:** DELETE · **Prioridad:** ALTA · **Sprint 7** · 🔄 En curso

Como usuario registrado, quiero eliminar mi cuenta, para asegurarme de que mis
datos dejen de estar disponibles cuando ya no use el servicio.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | El Administrador elimina un usuario | Desactiva la cuenta con borrado lógico, preservando el historial | ✅ |
| 2 | El Administrador intenta eliminarse a sí mismo | El sistema lo impide para no dejar la plataforma sin administrador | ✅ |
| 3 | El usuario elimina su propia cuenta | Solicita confirmación e identidad antes de proceder | 🔄 |
| 4 | Intenta iniciar sesión con una cuenta eliminada | Muestra "Credenciales incorrectas" sin revelar que fue eliminada | 🔄 |

---

### HU-17: Exportar historial de traducciones
**CRUD:** READ · **Prioridad:** MEDIA · **Sprint 7** · 📋 Backlog

Como usuario registrado, quiero exportar mis traducciones en PDF, para
usarlas como respaldo en trámites administrativos o médicos.

| # | Criterio | Resultado esperado | Estado |
|---|---|---|---|
| 1 | Presiona "Exportar" en el historial | Genera un PDF con fecha, hora, tipo y contenido de cada registro | 📋 |
| 2 | Selecciona un rango de fechas | El PDF contiene solo las traducciones de ese rango | 📋 |
| 3 | No hay registros para exportar | Muestra el mensaje y no genera el archivo | 📋 |

> El patrón ya existe: la exportación de usuarios a CSV desde el panel de
> administración usa el mismo mecanismo de descarga.

---

## Backlog planificado — Sprints 8 y 9 (posteriores al V Trimestre)

Estas historias están documentadas y estimadas, pero **fuera del alcance
comprometido para este trimestre**. Requieren contenido o infraestructura que
el equipo aún no tiene disponible.

### HU-10: Modo sin conexión
**CRUD:** CREATE READ · **Prioridad:** ALTA · **Sprint 8** · 📋 Backlog

Traducciones básicas sin internet, para zonas rurales o con señal limitada.

> **Bloqueante.** Los videos hoy se sirven desde YouTube mediante enlaces
> embebidos. Para almacenarlos localmente hay que alojarlos primero como
> archivos propios, lo que implica un cambio de infraestructura de contenido.

### HU-13: Variantes regionales de señas
**CRUD:** READ · **Prioridad:** MEDIA · **Sprint 8** · 📋 Backlog

Consultar variantes de una seña según el departamento de Colombia.

> **Bloqueante.** El diccionario admite hoy una seña por palabra. Requiere
> extender el modelo de datos y, sobre todo, grabar el material regional, que
> no está disponible.

### HU-16: Foro comunitario de dudas
**CRUD:** CREATE READ · **Prioridad:** BAJA · **Sprint 9** · 📋 Backlog

Publicar dudas sobre señas para que la comunidad las resuelva.

> La mensajería entre usuarios ya está implementada en el backend y sirve de
> base para esta historia.

### HU-27: Traducción de archivo de audio a señas
**CRUD:** READ · **Prioridad:** MEDIA · **Sprint 9** · 📋 Backlog

Convertir un archivo de audio cargado en secuencia de señas.

> El dictado por voz en vivo ya funciona (HU-15). Falta admitir la carga de un
> archivo de audio, que requiere transcripción del lado del servidor.

### HU-28: Reconocimiento de señas completas *(historia nueva)*
**CRUD:** CREATE READ · **Prioridad:** ALTA · **Sprint 9** · 📋 Backlog

Reconocer señas completas —no solo letras— a partir del video de la cámara.

> **Bloqueante.** Requiere un dataset etiquetado con varias repeticiones por
> seña, grabadas por distintas personas. Con una sola muestra por seña, un
> clasificador aprende a reconocer ese video puntual, no la seña. Se estima en
> 15–20 grabaciones por palabra como mínimo.

### HU-04b: Avatar animado 3D
**CRUD:** READ UPDATE · **Prioridad:** BAJA · **Sprint 9** · 📋 Backlog

Representar las señas mediante un avatar animado personalizable en lugar de
video grabado.

> Reemplazado en el Sprint 2 por la reproducción de video real (HU-04), que
> resulta más fiel a la LSC. Se conserva en el backlog como alternativa futura.

---

## Resumen de cobertura

| Alcance | Historias | Terminadas | En curso | Backlog |
|---|---|---|---|---|
| **V Trimestre (Sprints 1-7)** | 19 | 15 | 4 | — |
| Backlog planificado (Sprints 8-9) | 6 | — | — | 6 |
| **Total documentado** | **25** | **15** | **4** | **6** |

**Cobertura del alcance comprometido para el V Trimestre: 79 %**
(15 terminadas de 19; al cerrar las 4 en curso llega al 100 %).

Las 4 historias en curso son HU-03 y HU-25 (detección con MediaPipe), HU-09
(eliminar y buscar en el historial), HU-14 (control de velocidad) y HU-21
(eliminación de cuenta autogestionada).