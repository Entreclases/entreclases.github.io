<!--
  REGLA PERMANENTE: cada commit que cambie funcionalidad agrega UNA línea
  concisa bajo "[Sin publicar]". En cada checkpoint de versión, esas líneas
  se mueven a una nueva sección con el número de versión y la fecha.
-->

# Changelog

Contexto técnico para quien no conoce el proyecto: "Cuaderno de seguimiento"
es una app para que un profesor particular de matemática lleve el registro
de sus alumnos (exámenes, avance por tema, clases dictadas, resultados de
simulacros). El frontend (`web/app/`) es vanilla JS sin build ni bundler —
seis `<script>` clásicos cargados en orden fijo — empaquetado como PWA con
service worker (`sw.js`). El backend es un único proyecto Supabase
compartido (multi-tenant vía RLS), consumido con `fetch` crudo contra
Auth/PostgREST, sin SDK de `supabase-js`. El deploy es automático a GitHub
Pages en cada push a `main` que toque `web/**`. Las migraciones SQL del
backend viven versionadas aparte, en el repo privado `cuaderno-supabase`.
Los wrappers nativos (Tauri para escritorio, Capacitor para Android) también
viven en repos propios (`cuaderno-desktop`, `cuaderno-android`), ambos en
pausa.

Formato basado en [Keep a Changelog](https://keepachangelog.com/), adaptado
a una sola sección de viñetas por versión (sin subcategorías Added/Fixed/etc.).

## [Sin publicar]
- Eliminado GoatCounter de la landing (métricas propias en `metricas_diarias`/`metricas_horarias` no se tocan).
- Límite total de materiales (20 MB por usuario entre todas sus materias), con índice liviano en el catálogo, reconciliación contra Storage y barra de uso en la sección Materiales.
- Tema elegible (automático/claro/oscuro) en la landing, con botón sol/luna en el header y la misma clave de localStorage que usa la app.
- Panel admin → Usuarios: última conexión reforzada server-side (`registrar_actividad`), orden por última conexión y botón para eliminar cuentas (con doble confirmación escribiendo el email) que usa la nueva RPC `admin_eliminar_usuario`.
- Panel admin → Actividad: valor de cada barra siempre visible (rotado en los gráficos de 30/48 puntos), etiquetas de eje abreviadas sin superponerse y total del período junto al título de cada gráfico.
- Cierre automático de cuentas inactivas (mail recordatorio a los 30 días, aviso final a los 5 meses, borrado a los 6, con modo simulacro que sólo registra en el log): cron diario `revisar_inactivos()` en el backend, mails transaccionales por Brevo, y en el Panel admin → Usuarios un chip "inactivo hace X" por fila más una nueva pestaña "Inactividad" con el log de notificaciones y cierres.

## [2.0.0] - 2026-07-16
- Registro de pagos por alumno.
- Informe de progreso compartible.
- Botones de contacto por WhatsApp.
- Carga de resultados de examen.
- Plantillas de materias para altas rápidas.
- Agenda semanal de clases.
- Landing actualizada con las características al día.

## [1.8.0] - 2026-07-15
- Login: envío con Enter y límite de intentos fallidos.
- Catálogo directo con materia de ejemplo al crear cuenta.
- Una ficha por alumno por materia (en vez de una ficha global por alumno).
- Packs de materias para altas rápidas de catálogo.
- Materiales adjuntos por materia.
- Fetch de métricas horarias para el panel de estadísticas.
- Actividad detallada por día y por hora en el panel.
- Lista de respaldos aligerada (menos payload por entrada).

## [1.7.0] - 2026-07-15
- Modo oscuro.
- Onboarding con alumno de ejemplo para cuentas nuevas.
- Buscador y filtros en la lista de alumnos.
- Cronómetro de clase y recordatorio de respaldo.

## [1.6.0] - 2026-07-15
- Estadísticas del profesor (panel agregado).
- "El aula": mapa visual de alumnos agrupados por materia.
- Vista de estadísticas por materia.

## [1.5.0] - 2026-07-15
- Panel de recursos.
- Integración de GoatCounter en la landing.
- Métricas de actividad y panel correspondiente.
- Panel admin de usuarios y presencia.
- Heartbeat de presencia de usuarios conectados.

## [1.4.0] - 2026-07-15
- Frontend separado en archivos (de script único a los seis `js/*.js` actuales).
- SQL de Supabase movido a repo propio versionado (`cuaderno-supabase`).
- Empaquetado de escritorio movido a `cuaderno-desktop` (en pausa).
- Empaquetado de Android movido a `cuaderno-android` (en pausa).
- Repo web limpiado y documentado.

## [1.3.0] - 2026-07-14
- Auditoría de seguridad.
- Roles profesor/administrador.
- Fix de ancla muerta en el aviso de nueva versión.
- Sync eficiente: solo se escribe cuando hay cambios reales.
- Landing simplificada a versión solo web.
- Auto-update de la app de escritorio (Tauri).
- Aviso de versión nueva en las apps nativas.
- Respaldos automáticos con historial.
- Techo de 24hs a la sesión web restaurada por el navegador.
- Sesión web por navegador, emails recordados y confirmación de cuenta.

## Antes de v1.3.0
- Firma de release de Android y versión 1.2.0.
- Cierre de versión 1.2.0.
- Reportes de problemas y branding genérico.
- Landing v2 y limpieza general.
- Fix de link a la app en la landing bajo `file://`.
- Referencias actualizadas al repo renombrado (`manugandini53-design.github.io`).
- Sitio del producto: landing separada de la app, app movida a `/app/`.
- Bump de versión a 1.1.0.
- Workflow de deploy automático a GitHub Pages.
- Login bloqueante y backend Supabase embebido (producto multi-tenant).
- Setup de Capacitor y proyecto Android nativo.
- Setup de Tauri: primer build de escritorio funcional (.exe/.msi).
- Versión estable de la PWA, previa a la migración a nativo.
- Carga inicial de archivos del proyecto.
