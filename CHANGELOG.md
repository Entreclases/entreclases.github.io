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
- Rediseño de la landing (`web/index.html`): paleta azul marino/verde-azulado, tipografías Poppins/Inter alojadas localmente en `web/fonts/` (sin CDN), header sticky, hero a dos columnas con mock del dashboard, grilla de características con íconos SVG inline y estilo nuevo para "Usala donde quieras"; conserva el selector de tema claro/oscuro/automático con variantes coherentes para ambos temas.
- Sistema visual de la app (`web/app/styles.css`): design tokens de color (claro/oscuro), tipografía Poppins/Inter local (`web/app/fonts/`, sin CDN), tamaños, radios, sombras y espaciados con la misma identidad que la landing (marino + acento teal); nuevos componentes reutilizables `.btn`/`.badge`/`.ds-*` como base para rediseñar las vistas; logo (check en cuadradito con degradé marino) aplicado al favicon, `icon-192`/`icon-512` y el `theme_color`/`background_color` del manifest. Precache del service worker en `cuaderno-v57` (suma la carpeta de fuentes). No cambia el HTML de las vistas todavía.
- Rediseño de todas las vistas de la app sobre esa base: navegación persistente con íconos (sidebar en escritorio, barra inferior en mobile) con estado activo y acceso directo al toggle de tema, en reemplazo de las pestañas/chips sueltas; encabezado de sección (eyebrow + título + acción principal) en tablero, estudiantes, ficha, pagos/rentabilidad, agenda, materias, estadísticas, cuenta y panel; logo de marca en las pantallas de login/registro/recuperación y en `portal.html` (que ahora comparte paleta y tipografía local con el resto de la app). Los documentos para imprimir (informe, contrato) quedan fuera del nav a propósito y siguen imprimiendo igual. Precache del service worker en `cuaderno-v58`.
- Estados vacíos, feedback y microinteracciones: estados vacíos con ícono, frase y una acción clara (sin alumnos, sin clases de la semana, sin materiales, sin cobros del mes, portal apagado) en vez de espacio en blanco; toasts discretos y autodescartables tras guardar/borrar/copiar (clase, simulacro, pago, horario, resultado de examen, alta de alumno, exportar, copiar link) en reemplazo de los mensajes sueltos que quedaban pegados; chip de estado de datos (guardado/sincronizando/sin conexión/error) siempre visible en el nav, con el mismo `id="syncStatus"` que ya actualizaba `sync.js` en cada tick; skeletons con animación mientras cargan materiales, respaldos, portal y las pestañas del panel admin, en vez de un "Cargando…" seco; hover/active sutiles en tarjetas y botones, coherentes con la animación ya existente del cierre de objetivo de clase. Precache del service worker en `cuaderno-v59`.

## [2.0.3] - 2026-07-16
- Base del portal de invitados: tabla `portales` y RPC pública `portal_publico()` (migración 013), sección "Portal para tus alumnos" en Cuenta (activar/desactivar, copiar link, regenerar llave, publicar el nombre a mostrar) y página standalone `portal.html`/`js/portal.js` sin sesión y fuera del service worker.
- Biblioteca del portal: toggle "Compartir" por archivo en Materiales, "Publicar cambios" ahora firma URLs de Storage (30 días) y arma la biblioteca por materia, renovación automática silenciosa cuando quedan a 20+ días de vencer, republicado inmediato al dejar de compartir o borrar un archivo, y sección Biblioteca (agrupada, con buscador) como lo primero que ve el alumno en `portal.html`.
- Llave por alumno: card "Portal para este alumno" en la ficha (generar/copiar/regenerar/revocar su link individual) con checkboxes explícitos de qué ve (próxima clase, tarea de la última clase, avance por unidades) — nunca notas, pagos, señas ni comentarios privados; se actualiza solo al tildar o con "Publicar cambios"; en `portal.html` el alumno con llave propia ve primero su saludo y bloque personal, arriba de la biblioteca y links generales.

## [2.0.2] - 2026-07-16
- Generador de contratos de servicio: botón "Generar contrato" en la ficha del alumno, con un modelo precargado (docente, alumno, materia, tarifa y modalidad, horarios habituales, política de cancelación y señas) y campos editables (responsable, DNI opcional, fecha de inicio, cláusulas adicionales); datos del docente reutilizables cargados una sola vez en Cuenta; vista tipo documento con el mismo patrón que el informe (Descargar PDF / Copiar texto).
- Rentabilidad real: sub-pestaña dentro de Pagos con costos fijos mensuales y variables por clase (asignables a una materia o alumno puntual), $ neto por hora realmente dictada del mes (ingresos cobrados menos costos, sobre la duración cargada en cada clase), desglose por materia y por alumno, proyección del mes en curso y un histórico de 12 meses (ganancia neta y $/hora) con barras que admiten negativo y línea de tendencia, todo en CSS/SVG puro.
- Objetivos de clase: campo opcional al registrar una clase, mini-tarjeta de cierre con micro-animación al registrar la clase siguiente (o desde la ficha) para marcar si se cumplió, racha de objetivos cumplidos en la ficha, y tasa de cumplimiento en Estadísticas e informe compartible.
- Agenda con vista mensual (switch Semana/Mes, grilla del mes con mini-marcas por día, detalle de día con "Programar clase acá"); seña opcional por alumno (monto fijo o % de la tarifa) con estado por clase puntual (pendiente/cobrada/retenida/devuelta); política de cancelación configurable en Cuenta (horas mínimas de aviso, devolución o crédito a la próxima clase); avisos de seña sin cobrar al programar y al cancelar; señas como rubro propio en el resumen mensual de Pagos.
- Recordatorios de cobro: aviso desplegable en el tablero (clases sin cobrar + mensualidades vencidas + señas pendientes, con marcar-cobrada y WhatsApp por alumno), notificación del navegador opcional (permiso pedido recién al activarla) y configuración en Cuenta (sí/no, días de atraso mínimos).

## [2.0.1] - 2026-07-16
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
