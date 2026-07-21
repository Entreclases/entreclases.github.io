# ARQUITECTURA.md

Mapa de módulos de `web/app/js/` — consultar esto (y Grep) antes de abrir un archivo entero.
Orden de carga real, ver `<script>` en `web/app/index.html`.

## Los siete no-view

- **`config.js`** — sólo constantes: storage keys, URLs, `APP_VERSION`, `IS_NATIVE`/`detectPlatform()`, metadata estática (`TOPIC_META`, `STATUS_META`, `SEM_META`, `TAREA_META`, `defaultCatalog()`).
- **`helpers.js`** — utilidades genéricas (`esc()`, fechas, `uid()`), el objeto `state` y sus mutadores (`load`/`save`/`update`/`touchCatalog`), y sesión (cookies, `getSes`/`setSes`).
- **`auth.js`** — login, signup, recuperación, confirmación de email, refresh de token.
- **`sync.js`** — ciclo de sync con Supabase (`syncNow`), backups automáticos, reportes/admin API.
- *(nueve `views-*.js`, ver abajo)*
- **`tour.js`** (paso 204) — el tour guiado de 9 pasos para cuentas nuevas: `TOUR_STEPS`, arranque/avance/salida (`checkTourAutoStart`/`enterTourStep`/`tourAdvance`/`tourFinish`/`tourSkipAll`/`tourRestart`) y el overlay de spotlight (`renderTourOverlay`, llamado al final de `render()`). Apunta directo a los `data-a`/`data-f` reales de cada vista (nunca un atributo `data-tour` aparte).
- **`events.js`** — chequeo de versión al arrancar, los dos listeners delegados (`click`/`change`), y el bootstrap final (`load(); render(); syncNow(); ...`).

## Los nueve `views-*.js` (paso 180)

Cada uno cubre una pestaña/dominio; una función usada por más de un dominio vive en `views-core.js`.

| Archivo | Qué tiene |
|---|---|
| `views-core.js` | nav/sidebar, iconos SVG, FAB, overlays genéricos (compartir, QR, feedback, búsqueda, modal alta), toasts, skeletons, estados vacíos, mensajes de WhatsApp (`waMsg*`/`vWhatsApp`), helpers de canvas (`buildInformeImageBlob` y hermanos), `syncStatusText`, y **`render()`** — el loop principal. |
| `views-tablero.js` | `vTablero` y sus tarjetas: tips, recordatorio de backup, cumpleaños, "Tu día", "Hoy" (clases/cobrar/próximo), banner de cobros. |
| `views-alumnos.js` | `vLista`/`vAlumnoRow` (Estudiantes), `vInteresados`, papelera (`vPapeleraCard`/`vTrashRow`, aunque se invoque desde Cuenta), banner+overlay de fin de cuatrimestre, "Resumen del período". |
| `views-ficha.js` | `vDetalle` completa: resumen, formularios de clase (individual/grupal), packs, pagos, objetivos, materiales, llave/portal del alumno, informe/contrato/recibo. |
| `views-agenda.js` | `vAgenda` semanal/mensual, grilla, overlays de edición, exportar `.ics`. |
| `views-materias.js` | `vCatalog` (materias/unidades/subunidades) y `vMateriales` (archivos por unidad). |
| `views-stats.js` | `vEstadisticas` (+ comparar), Pagos/tarifas/rentabilidad/costos (`vPagos*`, `vAjustarTarifas`, `vRentabilidad`, `vCostosConfig`), "Aula" y "Tu actividad". |
| `views-cuenta.js` | `vCuenta` completa: perfil, preferencias, mensajes/plantillas, sección Portal, grupos de clase, respaldos, centro de ayuda (`vCentroAyuda`), y las vistas de auth previas a la sesión (`vAuth`, `vSetPassword`, `vConfirmEmail`). |
| `views-admin.js` | `vPanel` (sólo admin): usuarios, actividad global (`vActividad*`, distinto de "Tu actividad"), recursos/uso de Supabase, inactividad, reportes. |

## Cómo ubicar una función

`Grep -rn "function nombreDeLaFuncion" web/app/js/` es más rápido que adivinar el archivo por esta tabla. Si una vista llama a algo de otro dominio (p. ej. `views-alumnos.js` usando `vResumenPeriodo`), es normal — el scope es global entre los 15 scripts.
