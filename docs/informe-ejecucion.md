# Informe de ejecución de pruebas — SignBridge

Ficha 3228973 B · Release `v1.0-t6`
Plan: [`docs/plan-pruebas.md`](plan-pruebas.md) · Casos: [`docs/matriz-casos.md`](matriz-casos.md)

---

## 1. Resumen

| Dato | Valor |
|---|---|
| Fechas de ejecución | 24 de noviembre (26 casos) · 25 de noviembre (re-ejecución del CP-18) |
| Ejecutado por | @Sebas-p-s |
| Casos ejecutados | 26 |
| ✅ Aprobados | 26 |
| ❌ Fallidos | 0 |
| ⏸ Bloqueados | 0 |
| **% de aprobación** | 100 % |
| **Criterio de salida del plan** | ≥ 90 % aprobados y ningún defecto alto abierto → **cumple** |

## 2. Ambiente

| Elemento | Valor |
|---|---|
| Cómo se levantó | `docker compose up -d --build` desde `develop` |
| Versión probada | `04ef4289` |
| Base de datos | PostgreSQL 17, creada por Alembic |
| Navegador | Google Chrome |
| Sistema operativo | Windows 11 |

## 3. Resultado por historia

| Historia | Casos | Resultado |
|---|---|---|
| HU-01 Registro | CP-01 a CP-04 | ✅ |
| HU-02 Inicio de sesión | CP-05 a CP-07 | ✅ |
| Acceso por rol | CP-08 | ✅ |
| HU-18 Cierre de sesión | CP-09 | ✅ |
| HU-05 Recuperar contraseña | CP-10 | ✅ |
| HU-08 Texto a señas | CP-11, CP-12 | ✅ |
| HU-26 Frases completas | CP-13 | ✅ |
| HU-15 Voz a señas | CP-14 | ✅ |
| HU-04 Reproducción secuencial | CP-15 | ✅ |
| HU-12 Buscador | CP-16 | ✅ |
| HU-06 Valoraciones | CP-17, CP-18 | ✅ |
| HU-07 Tickets | CP-19, CP-20 | ✅ |
| HU-24 Dashboard de Soporte | CP-21, CP-22 | ✅ |
| HU-22 Vocabulario (Admin) | CP-23, CP-24 | ✅ |
| HU-23 Estadísticas | CP-25 | ✅ |
| HU-20 Accesibilidad | CP-26 | ✅ |

## 4. Defectos

| Issue | Caso | Severidad | Estado |
|---|---|---|---|
| #45 Voto repetido infla el promedio | CP-18 | Alta | Corregido en `fix/voto-unico-palabra`; se cierra con el release |

## 5. Observaciones

- El CP-18 se ejecutó primero el 24 de noviembre, antes de que se fusionara el arreglo del #45, y se volvió a ejecutar el 25 con el arreglo ya en `develop`. Vale el resultado del 25.
- En la instalación desde cero del 25 de noviembre (`docs/instalacion-desde-cero.md`) se vio que el **historial de traducciones** del panel del usuario no carga: el frontend llama a `/dashboard/history` y `/dashboard/goal-progress`, que no existen en el backend. No está en la matriz porque HU-09 sigue en curso; se corrige después del release.

## 6. Conclusión

Los 26 casos de la matriz pasan (100 %), por encima del 90 % exigido por el plan, y el único defecto alto (#45) ya está corregido y fusionado. La versión cumple el criterio de salida y puede pasar a `main` como `v1.0-t6`.
