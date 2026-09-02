# Estimación de Sprints — Proyecto SignBridge

Ficha 3228973 B · TG. Análisis y Desarrollo de Software · V Trimestre

> **Numeración unificada.** Las historias de este documento usan los mismos
> identificadores que `HISTORIAS_DE_USUARIO.md`, que es la fuente de verdad.
> En versiones anteriores ambos documentos numeraban distinto la misma
> historia (HU-09 aparecía como «texto a seña» acá y como «historial» en el
> otro, HU-20 como «cerrar sesión» y como «accesibilidad»), lo que rompía la
> trazabilidad entre documentos.

**Velocidad** = puntaje total del sprint ÷ cantidad de historias.
**Capacidad total** = integrantes × días dedicados × horas del día.

---

### **Sprint 1:** Autenticación y seguridad
**Semanas destinadas:** 2 · **Velocidad:** 5.25 · **Estado:** Cerrado

| HISTORIA DE USUARIO | PUNTAJE | INTEGRANTES | DÍAS DEDICADOS A LA HISTORIA | HORAS DEL DÍA | CAPACIDAD TOTAL (HORAS) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| HU-01 - Registro de usuario | 8 | 4 | 5 | 6 | 120 |
| HU-02 - Inicio de sesión | 5 | 4 | 3 | 6 | 72 |
| HU-05 - Cambio y recuperación de contraseña | 5 | 3 | 3 | 6 | 54 |
| HU-18 - Cierre de sesión | 3 | 2 | 2 | 6 | 24 |

---

### **Sprint 2:** Traducción principal
**Semanas destinadas:** 3 · **Velocidad:** 10.5 · **Estado:** Cerrado

| HISTORIA DE USUARIO | PUNTAJE | INTEGRANTES | DÍAS DEDICADOS A LA HISTORIA | HORAS DEL DÍA | CAPACIDAD TOTAL (HORAS) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| HU-08 - Traducción de texto a señas | 13 | 5 | 6 | 6 | 180 |
| HU-15 - Traducción por voz a señas | 13 | 5 | 5 | 6 | 150 |
| HU-26 - Traducción de frases completas | 8 | 4 | 4 | 6 | 96 |
| HU-04 - Reproducción secuencial de señas | 8 | 4 | 4 | 6 | 96 |

> **Reajuste de alcance.** HU-04 era originalmente «Personalización del
> avatar». Se reemplazó por reproducción de video real, que el equipo ya tenía
> grabado y resulta más fiel a la LSC. El avatar 3D pasó al backlog (HU-04b).

---

### **Sprint 3:** Captura por cámara
**Semanas destinadas:** 3 · **Velocidad:** 13 · **Estado:** Abierto

| HISTORIA DE USUARIO | PUNTAJE | INTEGRANTES | DÍAS DEDICADOS A LA HISTORIA | HORAS DEL DÍA | CAPACIDAD TOTAL (HORAS) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| HU-03 - Traducción de señas a texto | 13 | 5 | 7 | 6 | 210 |
| HU-25 - Detección de manos con MediaPipe | 13 | 4 | 6 | 6 | 144 |

> HU-25 se documentó como historia propia recién en el Sprint 6. Antes estaba
> implícita dentro de HU-03, lo que impedía medir su avance por separado y
> mantenía la historia completa bloqueada.
>
> El sprint quedó abierto por esa dependencia y se retomó al acotar el alcance
> al **abecedario dactilológico**: las letras son poses estáticas que se
> clasifican con reglas geométricas sobre los 21 puntos de la mano, sin
> entrenar un modelo. El reconocimiento de señas completas pasó al backlog
> como HU-28.

---

### **Sprint 4:** Diccionario, valoraciones y soporte
**Semanas destinadas:** 3 · **Velocidad:** 7.25 · **Estado:** Cerrado

| HISTORIA DE USUARIO | PUNTAJE | INTEGRANTES | DÍAS DEDICADOS A LA HISTORIA | HORAS DEL DÍA | CAPACIDAD TOTAL (HORAS) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| HU-12 - Buscador de señas (diccionario) | 8 | 4 | 6 | 6 | 144 |
| HU-06 - Valoraciones y opiniones | 8 | 4 | 5 | 6 | 120 |
| HU-24 - Dashboard de gestión de tickets (Soporte) | 8 | 4 | 5 | 6 | 120 |
| HU-07 - Tickets de soporte | 5 | 3 | 3 | 6 | 54 |

---

### **Sprint 5:** Historial y vocabulario
**Semanas destinadas:** 2 · **Velocidad:** 6.5 · **Estado:** Abierto

| HISTORIA DE USUARIO | PUNTAJE | INTEGRANTES | DÍAS DEDICADOS A LA HISTORIA | HORAS DEL DÍA | CAPACIDAD TOTAL (HORAS) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| HU-09 - Historial de traducciones | 8 | 4 | 4 | 6 | 96 |
| HU-22 - Carga de vocabulario con videos (Admin) | 5 | 3 | 3 | 6 | 54 |

> HU-09 quedó abierta: la consulta y el agrupamiento por fecha están
> terminados, faltan eliminar registros y buscar por palabra. Se cierra en el
> Sprint 7.

---

### **Sprint 6:** Reportes y accesibilidad
**Semanas destinadas:** 2 · **Velocidad:** 8 · **Estado:** Cerrado

| HISTORIA DE USUARIO | PUNTAJE | INTEGRANTES | DÍAS DEDICADOS A LA HISTORIA | HORAS DEL DÍA | CAPACIDAD TOTAL (HORAS) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| HU-23 - Reportes y estadísticas de uso (Admin) | 8 | 4 | 5 | 6 | 120 |
| HU-20 - Accesibilidad y personalización visual | 8 | 4 | 5 | 6 | 120 |

---

### **Sprint 7:** Cierre y ajustes finales
**Semanas destinadas:** 0.6 (3 días) · **Velocidad:** 4.33 · **Estado:** En curso

Sprint corto de cierre. Las historias se ordenaron por relación
**esfuerzo / valor**: todas parten de código existente, por eso el puntaje es
bajo pese a cerrar seis historias.

| HISTORIA DE USUARIO | PUNTAJE | INTEGRANTES | DÍAS DEDICADOS A LA HISTORIA | HORAS DEL DÍA | CAPACIDAD TOTAL (HORAS) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| HU-09 - Eliminar y buscar en el historial | 5 | 1 | 1 | 3 | 3 |
| HU-14 - Controles de reproducción de video | 5 | 1 | 1 | 2 | 2 |
| HU-21 - Autoeliminación de cuenta | 5 | 1 | 1 | 2 | 2 |
| HU-17 - Exportar historial en PDF | 5 | 1 | 1 | 3 | 3 |
| HU-11 - Guía rápida de uso de la cámara | 3 | 1 | 1 | 1 | 1 |
| HU-19 - Modo oscuro / modo claro | 3 | 1 | 1 | 2 | 2 |

**Distribución por día**

| Día | Tareas | Responsables |
| :---: | :--- | :--- |
| 1 | HU-09 (eliminar y buscar), HU-14 (velocidad), HU-21 (autoeliminación) | Juan, Sebastián, Lincoln |
| 2 | HU-25 y HU-03 — MediaPipe acotado al abecedario | Javier, Juan, Sebastián |
| 3 | HU-11, HU-19, HU-17, tablero y pruebas de regresión | Todos |

---

## Backlog planificado — Sprints 8 y 9

Historias estimadas y priorizadas, **fuera del alcance comprometido para el
V Trimestre** por depender de contenido o infraestructura no disponible.

### **Sprint 8:** Contenido regional y uso sin conexión
**Semanas destinadas:** 3 · **Velocidad:** 8 · **Estado:** Backlog

| HISTORIA DE USUARIO | PUNTAJE | INTEGRANTES | DÍAS DEDICADOS A LA HISTORIA | HORAS DEL DÍA | CAPACIDAD TOTAL (HORAS) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| HU-13 - Variantes regionales de señas | 8 | 4 | 6 | 6 | 144 |
| HU-10 - Modo sin conexión | 8 | 4 | 5 | 6 | 120 |

> **Bloqueante.** Los videos se sirven hoy desde YouTube mediante enlaces
> embebidos. Ambas historias requieren alojarlos primero como archivos
> propios, y HU-13 además necesita grabar el material regional.

### **Sprint 9:** Comunidad y reconocimiento avanzado
**Semanas destinadas:** 4 · **Velocidad:** 8.5 · **Estado:** Backlog

| HISTORIA DE USUARIO | PUNTAJE | INTEGRANTES | DÍAS DEDICADOS A LA HISTORIA | HORAS DEL DÍA | CAPACIDAD TOTAL (HORAS) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| HU-28 - Reconocimiento de señas completas | 13 | 5 | 10 | 6 | 300 |
| HU-04b - Avatar animado 3D | 8 | 4 | 8 | 6 | 192 |
| HU-27 - Traducción de archivo de audio a señas | 8 | 4 | 5 | 6 | 120 |
| HU-16 - Foro comunitario de dudas | 5 | 3 | 4 | 6 | 72 |

> **Bloqueante de HU-28.** Requiere un dataset etiquetado con 15 a 20
> repeticiones por seña, grabadas por distintas personas. Con una sola muestra
> por seña, un clasificador aprende a reconocer ese video puntual y no la seña.

---

## Resumen

| Sprint | Historias | Puntaje | Velocidad | Estado |
| :--- | :---: | :---: | :---: | :--- |
| 1 - Autenticación y seguridad | 4 | 21 | 5.25 | Cerrado |
| 2 - Traducción principal | 4 | 42 | 10.5 | Cerrado |
| 3 - Captura por cámara | 2 | 26 | 13 | Abierto |
| 4 - Diccionario, valoraciones y soporte | 4 | 29 | 7.25 | Cerrado |
| 5 - Historial y vocabulario | 2 | 13 | 6.5 | Abierto |
| 6 - Reportes y accesibilidad | 2 | 16 | 8 | Cerrado |
| 7 - Cierre y ajustes finales | 6 | 26 | 4.33 | En curso |
| **Total V Trimestre** | **19** | **173** | **9.1** | **15 de 19 terminadas (79 %)** |
| 8 - Contenido regional y sin conexión | 2 | 16 | 8 | Backlog |
| 9 - Comunidad y reconocimiento avanzado | 4 | 34 | 8.5 | Backlog |