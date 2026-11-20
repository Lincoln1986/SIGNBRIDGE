# Visión de cierre — SignBridge, V Trimestre

Ficha 3228973 B · TG. Análisis y Desarrollo de Software
Corte: 19 de noviembre de 2026 · Fuente: `DOCS/HISTORIAS_DE_USUARIO.md`

Este documento dice qué queda terminado al cerrar el trimestre, qué no, y qué
sigue en el VI trimestre (T7). Los números salen de contar los criterios de
aceptación de cada historia, no de una estimación.

---

## 1. Avance de las historias de usuario

**Alcance del V Trimestre (Sprints 1 a 7): 23 historias.**

| Estado | Historias | % |
|---|---|---|
| ✅ Terminadas | 15 | 65 % |
| 🔄 En curso | 5 | 22 % |
| 📋 Sin empezar (planeadas para el Sprint 7) | 3 | 13 % |

**Criterios de aceptación:** 74 de 93 cumplidos (**80 %**). 7 están en curso y 12 sin empezar.

> El resumen al final de `HISTORIAS_DE_USUARIO.md` dice "19 historias, 15
> terminadas, 79 %". Esa tabla quedó desactualizada: el documento tiene 23
> historias dentro del alcance. Se corrige en la actualización de la
> documentación de la próxima semana.

### Terminadas (15)

| Historia | Sprint |
|---|---|
| HU-01 Registro de usuario | 1 |
| HU-02 Inicio de sesión | 1 |
| HU-05 Cambio y recuperación de contraseña | 1 |
| HU-18 Cierre de sesión | 1 |
| HU-08 Traducción de texto a señas | 2 |
| HU-15 Traducción por voz a señas | 2 |
| HU-26 Traducción de frases completas | 2 |
| HU-04 Reproducción secuencial de señas | 2 |
| HU-12 Buscador de señas | 4 |
| HU-06 Valoraciones y opiniones | 4 |
| HU-07 Tickets de soporte | 4 |
| HU-24 Dashboard de tickets (Soporte) | 4 |
| HU-22 Carga de vocabulario con videos (Admin) | 5 |
| HU-23 Reportes y estadísticas (Admin) | 6 |
| HU-20 Accesibilidad y personalización visual | 6 |

### En curso (5)

| Historia | Criterios cumplidos | Qué falta |
|---|---|---|
| HU-03 Traducción de señas a texto | 2 de 4 | Reconocer la seña y avisar cuando no se reconoce (depende de HU-25) |
| HU-25 Detección de manos con MediaPipe | 1 de 4 | MediaPipe en el contenedor y devolver los 21 puntos de la mano |
| HU-09 Historial de traducciones | 3 de 5 | Eliminar y buscar en el historial |
| HU-14 Controles de reproducción de video | 2 de 3 | Control de velocidad |
| HU-21 Eliminación de cuenta | 2 de 4 | Eliminación autogestionada por el usuario |

### Sin empezar (3)

HU-11 Guía rápida de la cámara · HU-19 Modo oscuro · HU-17 Exportar historial.
Pasan al backlog del VI trimestre.

---

## 2. Qué se entrega al cerrar

- **Pruebas:** backend con cobertura sobre el 80 % y umbral en `pyproject.toml`;
  frontend con umbrales en `vite.config.ts`; 3 flujos E2E críticos (registro,
  login por rol, traducción); integración contra PostgreSQL.
- **CI:** 7 checks obligatorios antes de fusionar a `main` (tests, integración,
  E2E, auditoría de dependencias, calidad de código, evidencia individual).
- **Defectos:** registrados como issues con severidad y el commit que los
  corrigió.
- **Release:** `develop → main` el 25 de noviembre con la etiqueta `v1.0-t6`.

## 3. Qué no se alcanza en el V Trimestre

- Reconocimiento real de señas (HU-03 y HU-25): hoy el sistema degrada a modo
  simulado cuando MediaPipe no está. Las señas completas (no solo letras)
  necesitan un dataset etiquetado; quedan como HU-28 en el backlog.
- Las 3 historias sin empezar y lo pendiente de las 5 en curso.

---

## 4. Lo que sigue en el VI trimestre (T7)

| Frente | Qué se hace | Cómo se sabe que quedó |
|---|---|---|
| **Despliegue** | Publicar backend, frontend y base de datos en un servidor con Docker Compose y HTTPS | La app responde en una URL pública y el CI despliega cuando `main` cambia |
| **Capacitación** | Guía de uso por rol (Cliente, Soporte, Administrador) y una sesión con usuarios de prueba | Cada rol completa sus tareas principales sin ayuda |
| **Aceptación** | Pruebas de aceptación con usuarios reales sobre los criterios de cada historia | Acta firmada con los criterios aprobados y los defectos encontrados |
| **Backlog** | Terminar las 5 historias en curso, las 3 sin empezar y HU-28 | Criterios de aceptación en ✅ en `HISTORIAS_DE_USUARIO.md` |

---

## 5. Cómo se calcularon los números

1. Se tomaron las historias de la sección "Alcance del V Trimestre — Sprints 1 a 7".
2. Una historia cuenta como terminada si su encabezado dice ✅ Terminada.
3. Para los criterios se contó cada fila de las tablas de aceptación según su
   estado (✅, 🔄 o 📋).
