"use strict";
/* ============ configuración: claves, urls, versiones, metadatos de estados ============ */
const KEY = "tutoria-seguimiento-v1";
// Aislamiento por cuenta (paso 194): toda clave ligada al CONTENIDO del cuaderno (esta y las
// marcadas más abajo) se namespacea con el uid de la sesión activa vía nsKey() (helpers.js) —
// dos cuentas en el mismo navegador nunca comparten ni fusionan datos. LAST_UID_KEY es la única
// excepción: vive SIN namespacear a propósito, es el puntero de "qué uid fue el último en usar
// este dispositivo" que usa adoptOrDiscardLegacyCuaderno() (helpers.js) para decidir, en el
// próximo login, si un cuaderno viejo sin sufijo (de antes de este paso) le pertenece a quien
// está entrando o hay que descartarlo sin adoptarlo.
const LAST_UID_KEY = "tutoria-last-uid";
const SES_KEY = "tutoria-sync-ses";   // sesión iniciada (tokens): cookie de sesión en la web (se borra al cerrar el navegador), localStorage en apps nativas (Tauri/Capacitor)
const EMAILS_KEY = "tutoria-remembered-emails"; // emails con los que se inició sesión con éxito en este dispositivo — no se borra al cerrar sesión
const BACKUP_DATE_KEY = "tutoria-last-backup-date"; // fecha (YYYY-MM-DD) del último snapshot subido a cuaderno_respaldos, para hacer uno solo por día — namespaceada por uid (paso 194)
const MAX_BACKUPS = 15;
const DIRTY_KEY = "tutoria-sync-dirty"; // "1" mientras hay cambios locales sin confirmar por una escritura exitosa a la nube — namespaceada por uid (paso 194)
const LAST_REMOTE_KEY = "tutoria-last-remote-updated"; // último updated_at de la fila remota que ya vimos, para el chequeo liviano — namespaceada por uid (paso 194)
const VERSION_CHECK_KEY = "tutoria-last-version-check"; // timestamp del último chequeo de versión (apps nativas)
const VERSION_CHECK_INTERVAL_MS = 24*60*60*1000;
const SW_UPDATE_CHECK_INTERVAL_MS = 60*60*1000; // cada cuánto se pide al service worker que busque una versión nueva (además del chequeo al cargar y al volver a la pestaña)
const LAST_EXPORT_KEY = "tutoria-last-export"; // timestamp de la última descarga manual del .json — namespaceada por uid (paso 194)
const BACKUP_REMINDER_DISMISS_KEY = "tutoria-backup-reminder-dismissed-at"; // timestamp del último "descartar" del aviso de respaldo — namespaceada por uid (paso 194)
const BACKUP_REMINDER_DAYS = 30; // a partir de cuántos días sin exportar se sugiere hacerlo
const BACKUP_REMINDER_SNOOZE_DAYS = 7; // cada cuánto reaparece el aviso si se descarta
// Cierre de cuatrimestre (paso 163): mismo patrón de descartar/reaparecer que el aviso de
// respaldo — se sugiere en meses de recambio (jul/ago, nov-dic-feb, ver finCuatrimestreTemporada()
// en helpers.js) y, si se descarta, no vuelve a aparecer hasta FIN_CUATRIMESTRE_SNOOZE_DAYS después.
const FIN_CUATRIMESTRE_DISMISS_KEY = "tutoria-fin-cuatrimestre-dismissed-at"; // namespaceada por uid (paso 194)
const FIN_CUATRIMESTRE_SNOOZE_DAYS = 14;
const FIN_CUATRIMESTRE_DIAS_SIN_CLASE = 30; // umbral por defecto ("30/60 días" del paso 163)
const LOGIN_ATTEMPTS_KEY = "tutoria-login-attempts"; // {count, lockUntil} — freno local a intentos de login seguidos, aparte del rate-limit propio de Supabase
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 5*60*1000;
const PENDING_TERMS_KEY = "tutoria-pending-terms-accept"; // email pendiente de registrar perfiles.terminos_aceptados_at tras confirmar el mail (paso 144)
const LAST_COBROS_NOTIFY_KEY = "tutoria-last-cobros-notify-date"; // fecha (YYYY-MM-DD) del último aviso del sistema por cobros atrasados — uno por día, por dispositivo y namespaceada por uid (paso 194)
// Feedback y errores silenciosos (paso 147): FEEDBACK_BANNER_UNTIL_KEY guarda hasta cuándo se
// muestra el banner de bienvenida post-registro (se arranca al crear la cuenta, ver auth-signup
// en events.js); ERROR_LOG_COUNT_KEY es un contador en sessionStorage (no localStorage: el freno
// es "por sesión de pestaña", se reinicia solo al abrir una nueva) para no ametrallar `reportes`
// si algo entra en loop de errores.
const FEEDBACK_BANNER_UNTIL_KEY = "tutoria-feedback-banner-until"; // namespaceada por uid (paso 194)
const FEEDBACK_BANNER_DAYS = 4;
const ERROR_LOG_COUNT_KEY = "tutoria-error-log-count";
const ERROR_LOG_MAX_PER_SESSION = 5;
const FEEDBACK_TIPOS = [
  {id:"problema", label:"Problema"},
  {id:"idea", label:"Idea"},
  {id:"me_gusta", label:"Me gusta"},
];
// Tips periódicos (paso 205): sugerencias contextuales que invitan a usar algo que la cuenta
// todavía no aprovecha (ver TIP_BANK en helpers.js). Cadencia por TIEMPO ACTIVO (pestaña visible,
// no reloj de pared — se acumula en el tick de 1s ya existente, ver events.js), no por sesión ni
// por login. Todo namespaceado por uid (paso 194): son casi-datos de la cuenta (qué tip tocó,
// en qué orden), aunque vivan en localStorage y no en catalog — así no tocan el JSON sincronizado
// ni sync.js, y conviven sin romper nada si el usuario entra desde otro dispositivo (ahí arranca
// de cero, cosa aceptable para una cadencia de recordatorios).
const TIPS_INTERVAL_MS = 30*60*1000;
const TIPS_OFF_KEY = "tutoria-tips-off"; // namespaceada por uid
const TIPS_ACTIVE_MS_KEY = "tutoria-tips-active-ms"; // namespaceada por uid
const TIPS_ORDER_KEY = "tutoria-tips-order"; // namespaceada por uid
const TIPS_PENDING_KEY = "tutoria-tips-pending"; // namespaceada por uid
const TIPS_LAST_KEY = "tutoria-tips-last"; // namespaceada por uid
function tipsOff(){ const k=nsKey(TIPS_OFF_KEY); return !!k && localStorage.getItem(k)==="1"; }
function setTipsOff(off){ const k=nsKey(TIPS_OFF_KEY); if(k) localStorage.setItem(k, off?"1":"0"); }
// Programa Active Tester (paso 202): reusa la tabla `reportes` con tipo propio ("active_tester")
// en vez de sumar una tabla nueva — el panel admin (vReportes, views-admin.js) ya lista y filtra
// por tipo, así que sirve tal cual para que el cupo de 20 se administre a mano marcando cada
// solicitud. ACTIVE_TESTER_REQUESTED_KEY sólo evita mandar más de un pedido por cuenta desde este
// dispositivo (namespaceada por uid, paso 194) — no hay lectura de `reportes` para no-admin, así
// que no se puede confirmar server-side si ya se pidió antes desde otro dispositivo.
const ACTIVE_TESTER_REQUESTED_KEY = "tutoria-active-tester-requested";
const ACTIVE_TESTER_NOTE = "¿Querés ser Active Tester? Tras crear tu cuenta podrás solicitarlo desde Ajustes. Las primeras 20 plazas eligen: 50% permanente* o 3 meses gratis tras beta, a cambio de 3 reportes/mes.";
const ACTIVE_TESTER_FINE_PRINT = "* El 50% de descuento es permanente mientras el servicio se mantenga operativo. No constituye garantía de continuidad; si el proyecto se discontinúa, el descuento pierde su objeto conforme a la sección 7 de las Condiciones de la Beta.";
// Biblioteca del portal (state.catalog.subjects[].materiales[].compartido + portales.publicado.biblioteca):
// URLs firmadas de Storage con este vencimiento; se renuevan solas (ver maybeRenewPortalLibrary
// en sync.js) cuando les queda menos de PORTAL_LINK_TTL_DAYS-PORTAL_LINK_RENEW_AFTER_DAYS de vida.
const PORTAL_LINK_TTL_DAYS = 30;
const PORTAL_LINK_RENEW_AFTER_DAYS = 20;
// Deuda ESTIMADA (paso 196): ventana hacia atrás para buscar clases agendadas ya terminadas y sin
// registrar (ver clasesSinRegistrarFor en helpers.js) — acotada porque agendaRangeEvents proyecta
// horarios habituales sin fecha de inicio, así que ir más atrás generaría "clases" sintéticas de
// antes de que el horario existiera.
const CLASE_ESTIMADA_LOOKBACK_DIAS = 21;
const PORTAL_RENEW_CHECK_KEY = "tutoria-portal-renew-check-date"; // fecha (YYYY-MM-DD) del último chequeo de renovación — uno por día, por dispositivo y namespaceada por uid (paso 194)
// Sonidos discretos (paso 143): preferencia local del dispositivo, mismo criterio que THEME_KEY
// más abajo (no viaja en el catalog sincronizado — un dispositivo compartido/de aula puede querer
// mutearlos sin afectar a los demás). Activado por defecto (ausente en localStorage = "on").
const SOUNDS_KEY = "tutoria-sounds";
function soundsOn(){ return localStorage.getItem(SOUNDS_KEY)!=="off"; }
function setSoundsOn(on){ localStorage.setItem(SOUNDS_KEY, on?"on":"off"); }
// Animaciones (paso 175): mismo criterio que SOUNDS_KEY — preferencia local, por dispositivo.
// Apagarla desde acá se suma a (no reemplaza) prefers-reduced-motion del sistema: alcanza con
// cualquiera de las dos para que prefersReducedMotion() (events.js) salte las animaciones.
const ANIM_KEY = "tutoria-anim";
function animsOn(){ return localStorage.getItem(ANIM_KEY)!=="off"; }
function setAnimsOn(on){ localStorage.setItem(ANIM_KEY, on?"on":"off"); }
// Fondo decorativo (paso 178): mismo criterio que ANIM_KEY — preferencia local, por dispositivo,
// activado por defecto. Sólo alterna una clase en <body> (bg-off) que gatea la regla de
// background-image en styles.css (::before de .shell) — ver applyBg()/toggle-fondo (events.js).
const BG_KEY = "tutoria-bg";
function bgOn(){ return localStorage.getItem(BG_KEY)!=="off"; }
function applyBg(on){ document.body.classList.toggle("bg-off", !on); }
function setBgOn(on){ localStorage.setItem(BG_KEY, on?"on":"off"); applyBg(on); }
applyBg(bgOn()); // igual que el tema/densidad, aplicada de entrada para evitar parpadeo
// Primera reserva directa recibida desde el portal (paso 179): flag de una sola vez, por
// dispositivo y por cuenta (namespaceada por uid, paso 194) — gatea el festejo (confetti +
// soundReserva) de la PRIMERA reserva que llega alguna vez, no las siguientes. Ver el bloque
// agregado en refreshSolicitudesClase() en sync.js.
const FIRST_RESERVA_KEY = "tutoria-primera-reserva-festejada";
const THEME_KEY = "tutoria-theme"; // "light" | "dark" | "system" (default)
function getTheme(){ return localStorage.getItem(THEME_KEY) || "system"; }
function applyTheme(theme){
  const root = document.documentElement;
  root.classList.remove("theme-light","theme-dark");
  if(theme==="light") root.classList.add("theme-light");
  else if(theme==="dark") root.classList.add("theme-dark");
}
function isDarkEffective(theme){
  if(theme==="dark") return true;
  if(theme==="light") return false;
  return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}
function setTheme(theme){ localStorage.setItem(THEME_KEY, theme); applyTheme(theme); applyAccent(getAccent()); }
applyTheme(getTheme()); // se aplica de entrada, antes del primer render, para evitar parpadeo
// Color de acento (paso 106): 6 colores predefinidos, cada uno con su propio par claro/oscuro
// (mismo criterio de contraste que el teal original — texto bien oscuro sobre el acento, no
// blanco, porque ninguno de estos tonos llega a 4.5:1 con blanco en ninguno de los dos temas,
// ver el comentario de --on-accent en styles.css) — el portal y la landing no lo leen, se quedan
// con el acento de marca fijo (archivos aparte, sin este JS). Preferencia local, mismo criterio
// que THEME_KEY/DENSITY_KEY: no viaja en el JSON del cuaderno, es por dispositivo.
const ACCENT_KEY = "tutoria-accent";
const ACCENT_DEFAULT = "teal";
const ACCENT_PALETTE = {
  teal:   {label:"Verde azulado", light:{accent:"#14B8A6",accentDark:"#0E9488",accentSoft:"#CFF7F0",onAccent:"#062824",shadow:"rgba(20,184,166,.45)"},
                                    dark:{accent:"#2DD4C0",accentDark:"#14B8A6",accentSoft:"#123C38",onAccent:"#062824",shadow:"rgba(45,212,192,.4)"}},
  blue:   {label:"Azul",          light:{accent:"#3B82F6",accentDark:"#2563EB",accentSoft:"#DBEAFE",onAccent:"#0B1E3D",shadow:"rgba(59,130,246,.45)"},
                                    dark:{accent:"#60A5FA",accentDark:"#3B82F6",accentSoft:"#1B2340",onAccent:"#0B1E3D",shadow:"rgba(96,165,250,.4)"}},
  violeta:{label:"Violeta",       light:{accent:"#8B5CF6",accentDark:"#7C3AED",accentSoft:"#EDE9FE",onAccent:"#1E1033",shadow:"rgba(139,92,246,.45)"},
                                    dark:{accent:"#A78BFA",accentDark:"#8B5CF6",accentSoft:"#2E1F5E",onAccent:"#1E1033",shadow:"rgba(167,139,250,.4)"}},
  verde:  {label:"Verde",         light:{accent:"#22C55E",accentDark:"#16A34A",accentSoft:"#DCFCE7",onAccent:"#0B2E17",shadow:"rgba(34,197,94,.45)"},
                                    dark:{accent:"#4ADE80",accentDark:"#22C55E",accentSoft:"#173324",onAccent:"#0B2E17",shadow:"rgba(74,222,128,.4)"}},
  naranja:{label:"Naranja",       light:{accent:"#F59E0B",accentDark:"#D97706",accentSoft:"#FEF3C7",onAccent:"#3D2B04",shadow:"rgba(245,158,11,.45)"},
                                    dark:{accent:"#FBBF24",accentDark:"#F59E0B",accentSoft:"#3A2E10",onAccent:"#3D2B04",shadow:"rgba(251,191,36,.4)"}},
  rosa:   {label:"Rosa",          light:{accent:"#F43F5E",accentDark:"#E11D48",accentSoft:"#FFE4E6",onAccent:"#3D0A1A",shadow:"rgba(244,63,94,.45)"},
                                    dark:{accent:"#FB7185",accentDark:"#F43F5E",accentSoft:"#4C1424",onAccent:"#3D0A1A",shadow:"rgba(251,113,133,.4)"}},
};
function getAccent(){ const v=localStorage.getItem(ACCENT_KEY); return (v && ACCENT_PALETTE[v]) ? v : ACCENT_DEFAULT; }
// Variables inline en <html>: pisan cualquier valor de las reglas de styles.css (base, media
// prefers-color-scheme, .theme-dark) sin importar el tema — por eso hay que recalcularlas cada
// vez que el tema efectivo puede haber cambiado (setTheme() de arriba, y el listener de más
// abajo para cuando el sistema cambia solo estando en tema "Automático").
function applyAccent(key){
  const pal = ACCENT_PALETTE[key] || ACCENT_PALETTE[ACCENT_DEFAULT];
  const vars = isDarkEffective(getTheme()) ? pal.dark : pal.light;
  const root = document.documentElement.style;
  root.setProperty("--accent", vars.accent);
  root.setProperty("--accent-dark", vars.accentDark);
  root.setProperty("--accent-soft", vars.accentSoft);
  root.setProperty("--on-accent", vars.onAccent);
  root.setProperty("--shadow-accent", "0 8px 20px -6px "+vars.shadow);
}
function setAccent(key){ localStorage.setItem(ACCENT_KEY, key); applyAccent(key); }
applyAccent(getAccent()); // igual que el tema, aplicada de entrada para evitar parpadeo
if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ()=>{
    if(getTheme()==="system") applyAccent(getAccent());
  });
}
// Densidad (paso 102): "comoda" (default) | "compacta" — preferencia local, mismo criterio que
// THEME_KEY (no viaja en el JSON del cuaderno, es por dispositivo). Sólo achica paddings/alto de
// fila/margen vía variables CSS (ver body.density-compact en styles.css); el texto no se achica.
const DENSITY_KEY = "tutoria-density";
function getDensity(){ return localStorage.getItem(DENSITY_KEY) || "comoda"; }
function applyDensity(d){ document.body.classList.toggle("density-compact", d==="compacta"); }
function setDensity(d){ localStorage.setItem(DENSITY_KEY, d); applyDensity(d); }
applyDensity(getDensity()); // igual que el tema, aplicada de entrada para evitar parpadeo
const RELEASES_API = "https://api.github.com/repos/entreclases/entreclases.github.io/releases/latest";
const DOWNLOADS_URL = "https://entreclases.github.io/#usala";
// Mail de contacto institucional (paso 183) — único lugar del que lo lee el app; la landing, el
// portal y terminos.html no comparten este archivo, así que repiten el mismo string literal.
const CONTACT_EMAIL = "contacto.entreclases@gmail.com";
// Backend de sincronización: un único proyecto Supabase por entorno (paso 193). En producción
// (cualquier hostname que no sea localhost/127.0.0.1) siempre se usa el proyecto de producción de
// abajo. En localhost se usa por defecto el proyecto de desarrollo (entreclases-dev) para no tocar
// nunca datos reales durante pruebas — salvo que se pida explícitamente ?backend=prod (con
// confirmación, para que no pase por accidente). La anon key es pública por diseño en ambos casos —
// la seguridad la dan las políticas RLS de la tabla `cuaderno` (cada cuenta solo puede leer/escribir
// su propia fila; ver el repo cuaderno-supabase).
const SUPA_PROD = {
  url: "https://iwxsntxkqfqucxhwlfdv.supabase.co",
  anonKey: "sb_publishable_S0zs9qmIRB5RWNZceO5gCg_vI7Hxx1D",
};
const SUPA_DEV = {
  url: "https://anubpgvuptyxnbagnkxa.supabase.co",
  anonKey: "sb_publishable_RkC2wsv0m5mYBHX2soHDpw_nx-clEvq",
};
const IS_LOCALHOST = (location.hostname==="localhost" || location.hostname==="127.0.0.1");
function usaBackendDev(){
  if(!IS_LOCALHOST) return false;
  if(new URLSearchParams(location.search).get("backend")==="prod"){
    return !confirm("¿Usar el backend de PRODUCCIÓN desde localhost? Vas a leer y escribir datos reales. Cancelar para seguir en el backend de desarrollo.");
  }
  return true;
}
const IS_BACKEND_DEV = usaBackendDev();
const SUPA_URL = IS_BACKEND_DEV ? SUPA_DEV.url : SUPA_PROD.url;
const SUPA_ANON_KEY = IS_BACKEND_DEV ? SUPA_DEV.anonKey : SUPA_PROD.anonKey;
// Cartelito de backend de desarrollo: inyectado directo al DOM (no depende de render()) para que
// se vea en CUALQUIER pantalla, incluida la de login/registro — que es justo donde más hace falta
// para no confundirse de backend si algo falla ahí.
if(IS_BACKEND_DEV && document.body){
  const badge = document.createElement("div");
  badge.textContent = "⚙ backend de desarrollo";
  badge.style.cssText = "position:fixed;bottom:10px;right:10px;z-index:9999;background:#F59E0B;color:#3D2B04;border-radius:8px;padding:4px 8px;font-size:11px;font-family:sans-serif;pointer-events:none";
  document.body.appendChild(badge);
}
// Aviso de cookies (paso 203): inyectado directo al DOM, fuera de #app, para que sobreviva a
// cada render() (que reconstruye #app entero) sin volver a montarse en cada refresco. Por
// dispositivo (localStorage, sin namespacear por uid: es una aceptación del navegador, no del
// cuaderno) — no aparece en modo demo (nada que "recordar" en una sesión descartable) ni dentro
// de un iframe (la vista previa del portal en Cuenta, ver views-cuenta.js).
const COOKIES_OK_KEY = "tutoria-cookies-ok";
function initCookieBar(){
  if(IS_DEMO || window.self!==window.top) return;
  if(localStorage.getItem(COOKIES_OK_KEY)==="1") return;
  if(!document.body) return;
  const bar = document.createElement("div");
  bar.className = "cookiebar";
  bar.innerHTML = `<div class="cookiebar-inner">
    <div class="cookiebar-text">Usamos cookies propias y almacenamiento local solo para que Entreclases funcione (tu sesión y tus datos). Sin publicidad ni rastreo de terceros. <a href="../terminos.html#cookies" target="_blank" rel="noopener">Más info</a></div>
    <div class="cookiebar-actions"><button type="button" class="cookiebar-ok">Entendido</button></div>
  </div>`;
  bar.querySelector(".cookiebar-ok").addEventListener("click", ()=>{
    localStorage.setItem(COOKIES_OK_KEY, "1");
    bar.remove();
  });
  document.body.appendChild(bar);
}
// Materiales por materia: bucket privado de Storage, carpetas materiales/{uid}/{subjectId}/{archivo}.
// El aislamiento entre usuarios lo dan las políticas RLS del bucket (ver cuaderno-supabase),
// no el código de acá — el cliente nunca arma una ruta con un uid que no sea el propio.
const MATERIALES_BUCKET = "materiales";
const MATERIAL_MAX_BYTES = 10*1024*1024;
const MATERIAL_MAX_COUNT = 100;
const MATERIAL_MAX_TOTAL_BYTES = 50*1024*1024; // por usuario, sumando materiales de todas sus materias
// Fotos de perfil opcionales (paso 137): docente y alumnos, mismo bucket privado "materiales" que
// ya usan los archivos por materia — bajo la carpeta propia del usuario ({uid}/avatars/...) para
// reusar la misma política RLS existente (scoped a {uid}/...) sin necesitar una migración nueva.
// Cuentan contra el mismo MATERIAL_MAX_TOTAL_BYTES de arriba (ver materialesTotalBytes en sync.js).
const AVATAR_SIZE_PX = 256;
const AVATAR_TARGET_BYTES = 60*1024; // objetivo tras el resize — no un tope duro, ver resizeImageToAvatar
// QR de cobros (paso 141): mismo patrón que las fotos de perfil, pero sin recorte cuadrado (un QR
// ya viene cuadrado tal cual lo exporta la billetera/banco; recortarlo podría comerse el borde) —
// sólo se lo achica si excede QR_SIZE_PX de lado, ver resizeImageToQr en helpers.js.
const QR_SIZE_PX = 512;
const QR_TARGET_BYTES = 150*1024;
// Recordatorio push de las clases del día (paso 108): clave pública VAPID, apta para exponerse
// en el cliente por diseño (no es secreta) — el par se generó una sola vez con
// `npx web-push generate-vapid-keys`; la privada vive sólo como secreto de la Edge Function
// enviar-push (cuaderno-supabase), nunca en este repo. Ver setNotifClasesDia() en sync.js.
const VAPID_PUBLIC_KEY = "BGj8qOBjAkuPuXXqILsyhFC8sfSc1eJHCZi9-WcVbHlaM98LGPdPBnKdOZ0shIWjnLzvIvrpo1NlMBrz8ZDxsEE";
// Planes futuros (paso 164, perfiles.plan — ver 024_planes.sql en cuaderno-supabase):
// terreno preparado sin ningún límite todavía. Mientras dure la beta, TODAS las cuentas
// ven todo sea cual sea su plan — nada de precios ni menciones de planes de cara al
// usuario. PLAN_FEATURES es el único lugar donde, cuando llegue el momento, se declara
// qué planes desbloquean cada feature (p.ej. featureX:["individual","equipo","academia"]);
// hoy está vacío porque tienePlan() siempre devuelve true sin mirarlo.
const PLANES = ["beta","individual","equipo","academia"];
const PLAN_META = {
  beta:{label:"Beta"}, individual:{label:"Individual"}, equipo:{label:"Equipo"}, academia:{label:"Academia"},
};
const PLAN_FEATURES = {};
function tienePlan(feature){ return true; }
const APP_VERSION = "2.6.0";
// Modo demo (paso 82): ?demo=1 carga un cuaderno ficticio en memoria (ver buildDemoData() en
// helpers.js), sin cuenta, sin sync y sin tocar localStorage ni el backend — ver el guard de
// save() en helpers.js y el de ensureToken() en auth.js, y el gate de render() en views-core.js.
const IS_DEMO = new URLSearchParams(location.search).get("demo")==="1";
// Fix de regresión (paso 204): initCookieBar() se llamaba antes en el archivo (justo después de
// definirse), pero su primera línea lee IS_DEMO — que recién se declara acá abajo. Al ser ambas
// un `const` del mismo script, eso tiraba "Cannot access 'IS_DEMO' before initialization" en
// TODA carga de la app (rompía config.js entero, así que ni helpers.js ni el resto llegaban a
// correr) desde el commit del paso 203. Se detectó al probar el tour guiado en un cuaderno
// recién cargado — la llamada se corre a este punto, ya con IS_DEMO inicializada.
initCookieBar();
// Empaquetado nativo: Tauri inyecta window.__TAURI__, Capacitor inyecta window.Capacitor
const IS_NATIVE = !!(window.__TAURI__ || window.Capacitor);
function detectPlatform(){
  if(window.__TAURI__) return "Windows";
  if(window.Capacitor) return "Android";
  return "Web";
}
// Temas genéricos siempre disponibles al registrar/editar el "tema principal" de una clase (paso
// 131, ver topicOptionsHtml en helpers.js), además de las unidades/subunidades de la materia —
// independientes de s.topics (avance por unidad, ver TOPIC_CYCLE abajo): loguear una clase con
// cualquiera de estos strings no toca el avance de ninguna unidad, nunca se derivó de acá.
// Campos de "datos" de la ficha (Resumen/Pagos) que pasan por confirmación explícita en vez de
// autosave al tocarlos (paso 136) — ver applyFichaDraftField/draftFor en helpers.js y la barra
// fija "Tenés cambios sin guardar" en vDetalle (views-ficha.js). Todo lo demás (acciones como registrar
// clase/cobrar, y el resto de data-f/data-cf de la app) sigue guardando al instante como siempre.
const FICHA_DRAFT_FIELDS = new Set(["name","career","subjectId","chair","phone","email","status","examDate","startDate","birthDate","notes","tarifa","modalidad","seniaTipo","seniaValor"]);
const GENERIC_TOPICS = ["Ejercicios","Teoría","Nivelación","Repaso / parciales viejos"];
const TOPIC_CYCLE = ["pendiente","visto","practica","parcial","noentra"];
const TOPIC_META = {
  pendiente:{label:"Pendiente",bg:"var(--topic-pendiente-bg)",fg:"var(--topic-pendiente-fg)",bd:"var(--topic-pendiente-bd)"},
  visto:{label:"Visto",bg:"var(--topic-visto-bg)",fg:"var(--topic-visto-fg)",bd:"var(--topic-visto-bd)"},
  practica:{label:"Práctica",bg:"var(--topic-practica-bg)",fg:"var(--topic-practica-fg)",bd:"var(--topic-practica-bd)"},
  parcial:{label:"Nivel parcial",bg:"var(--topic-parcial-bg)",fg:"var(--topic-parcial-fg)",bd:"var(--topic-parcial-bd)"},
  noentra:{label:"No entra",bg:"var(--topic-noentra-bg)",fg:"var(--topic-noentra-fg)",bd:"var(--topic-noentra-bd)"},
};
const STATUS_META = {
  activo:{label:"Activo",fg:"var(--status-activo-fg)",bg:"var(--status-activo-bg)"},
  pausado:{label:"Pausado",fg:"var(--status-pausado-fg)",bg:"var(--status-pausado-bg)"},
  aprobo:{label:"Aprobó",fg:"var(--status-aprobo-fg)",bg:"var(--status-aprobo-bg)"},
  desaprobo:{label:"A recuperar",fg:"var(--status-desaprobo-fg)",bg:"var(--status-desaprobo-bg)"},
  dejo:{label:"Dejó",fg:"var(--status-dejo-fg)",bg:"var(--status-dejo-bg)"},
};
// Interesados (paso 119, state.catalog.interesados): mini lista de espera, independiente de
// state.students — nunca se cruzan hasta que "Convertir en alumno" crea un alumno de verdad
// (ver convertirInteresado() en helpers.js) y saca al interesado de esta lista. Estado con
// ciclo fijo (se avanza tocando el chip, mismo criterio que TOPIC_CYCLE/SEM_CYCLE).
const INTERESADO_ESTADO_CYCLE = ["consulto","en_charla","arranca","no_arranca"];
const INTERESADO_ESTADO_META = {
  consulto:{label:"Consultó",fg:"var(--muted)"},
  en_charla:{label:"En charla",fg:"var(--status-pausado-fg)"},
  arranca:{label:"Arranca",fg:"var(--status-activo-fg)"},
  no_arranca:{label:"No arranca",fg:"var(--status-dejo-fg)"},
};
const SEM_CYCLE = ["sd","verde","amarillo","rojo"];
const SEM_META = {
  sd:{color:"var(--sem-sd)",label:"Sin evaluar"},
  verde:{color:"var(--sem-verde)",label:"Encaminado: llega bien a su objetivo"},
  amarillo:{color:"var(--sem-amarillo)",label:"En riesgo: llega ajustado, priorizar temas"},
  rojo:{color:"var(--sem-rojo)",label:"Complicado: difícilmente llegue así"},
};
// Color por materia (paso 73): paleta accesible fija de 8 colores con nombre — cada materia
// guarda la key elegida en m.color; el token CSS de cada key (--subj-{key}-bg/-fg/-bd) ya
// tiene el contraste resuelto para ambos temas (ver :root/.theme-dark en styles.css), así que
// el color de una materia se ve igual en la lista, la agenda, las estadísticas, materiales y
// el portal sin volver a calcular nada acá. Ver subjectColorKey() en helpers.js.
const SUBJECT_COLOR_KEYS = ["teal","blue","purple","amber","rose","green","indigo","slate"];
const SUBJECT_COLOR_LABELS = {
  teal:"Verde azulado", blue:"Azul", purple:"Violeta", amber:"Ámbar",
  rose:"Rosa", green:"Verde", indigo:"Índigo", slate:"Gris",
};
// Ayuda contextual (paso 74): textos cortos para el popover de los iconitos "?" junto a las
// funciones menos obvias — ver helpTip() en views-core.js. Mismo criterio que TOPIC_META/STATUS_META:
// contenido acá, presentación en views-core.js.
const HELP_TEXTS = {
  senia: "Un adelanto que el alumno paga para reservar una clase puntual. Si cancela a tiempo (según tu política) se le devuelve; si no, se la queda el profesor.",
  cancelPolicy: "Define cuántas horas antes puede cancelar un alumno una clase puntual sin perder la seña. Se aplica sola al marcar una clase como cancelada.",
  portal: "Un link propio, sin login, para que tus alumnos vean materiales compartidos y (si tienen llave individual) su próxima clase y avance — nunca notas, pagos ni comentarios privados.",
  portalGrupal: "Una llave por materia: el grupo que elijas ve la biblioteca de esa materia y las próximas clases/exámenes del grupo (fechas sueltas, sin nombres) — nunca notas, pagos ni avance de un alumno en particular.",
  rentabilidad: "Cuánto te queda de cada materia o alumno después de restar los costos que le asignaste (fijos y variables). Los costos sin materia ni alumno sólo entran en el total del mes.",
};
// Mini centro de ayuda (Cuenta, paso 74): preguntas frecuentes en español claro — qué hace
// cada sección, sin tecnicismos. Ver vCentroAyuda() en views-cuenta.js.
const FAQ_ITEMS = [
  {q:"¿Cómo cargo un alumno nuevo?", a:"Desde Estudiantes tocá «+ Nuevo estudiante», o elegí una materia primero en Materias si todavía no la creaste. Podés cargar la fecha de examen y notas iniciales, o dejarlo para después."},
  {q:"¿Qué es el semáforo (verde/amarillo/rojo)?", a:"Tu evaluación de cómo llega el alumno a su objetivo: verde (encaminado), amarillo (en riesgo, hay que priorizar temas) o rojo (difícilmente llegue así). Se cambia tocando el círculo de color en la ficha o la lista."},
  {q:"¿Qué es una seña y cómo funciona?", a:"Un adelanto que el alumno paga para reservar una clase puntual. Se activa por alumno desde su ficha (pestaña «Pagos»). Si cancela con el aviso mínimo que definas en la política de cancelación, se le devuelve; si no, la retenés."},
  {q:"¿Para qué sirve el Portal?", a:"Le da a tus alumnos un link propio, sin necesidad de crear cuenta, donde ven los materiales que compartiste y (si generás su llave individual) su próxima clase y avance por unidades — nunca notas, pagos ni comentarios privados. También podés generar una llave grupal por materia, para compartirle a todo un grupo la biblioteca y las próximas clases/exámenes sin datos de ningún alumno en particular."},
  {q:"¿Cómo veo si estoy ganando plata de verdad?", a:"En Pagos → Rentabilidad: descontando los costos que le asignaste a cada materia o alumno (fijos y variables), te muestra cuánto te queda neto por hora dictada, por mes."},
  {q:"¿Mis datos están a salvo si se me rompe la compu?", a:"Sí — con sesión iniciada se sincronizan solos a la nube y podés entrar desde cualquier dispositivo. Además se guarda un respaldo automático diario (ver «Respaldos automáticos» acá abajo) y podés descargar una copia .json manual cuando quieras."},
  {q:"A veces veo una versión vieja de la app, ¿qué hago?", a:"La app se actualiza sola, pero a veces tarda un rato en avisar. Si arriba de todo aparece «Hay una versión nueva de Entreclases», tocá «Actualizar» — no perdés nada, ni tus datos ni la sesión. Si no ves el aviso y sospechás que algo está desactualizado, andá a Cuenta → Versión y tocá «Buscar actualización». Como último recurso, recargá con Ctrl+Shift+R (o Cmd+Shift+R en Mac) o cerrá la app del todo y volvela a abrir."},
];
const CAREERS = ["Ingeniería","Licenciatura","Arquitectura","Ingresante"];
function defaultCatalog(){
  return { careers:[...CAREERS],
    subjects:[{ id:"materia-ejemplo", name:"Materia de ejemplo (tocala para verla)",
      units:["Unidad 1: introducción","Unidad 2: desarrollo","Unidad 3: aplicaciones","Unidad 4: repaso final"] }],
    packs:[],
    trash:[],
    tags:[], // etiquetas libres por alumno (paso 103) — {id,label,color}, ver getOrCreateTag() en helpers.js
    gruposClase:[], // roster de clases grupales (paso 157) — {id,nombre,subjectId,studentIds,createdAt}, ver helpers.js
    cancelPolicy: defaultCancelPolicy(),
    recordatorios: defaultRecordatorios(),
    costos: defaultCostos(),
    docente: defaultDocente(),
    reciboSeq: {},
    tourStep:null, tourDismissed:false, // paso 204: progreso del tour guiado, ver tour.js
    updatedAt:0 };
}
const TAREA_META = {hecha:{label:"hecha",fg:"var(--tarea-hecha-fg)"},intentada:{label:"intentada",fg:"var(--tarea-intentada-fg)"},no:{label:"no hecha",fg:"var(--tarea-no-fg)"}};
// Motivo de una ausencia (paso 113, s.sessions[].ausente = {motivo, cobra}) — "aviso_tiempo"
// sugiere no cobrar, "aviso_tarde"/"no_aviso" sugieren cobrar (mismo criterio de fondo que la
// política de cancelación de señas: avisar con tiempo no tiene costo, avisar tarde o no avisar
// sí), aunque siempre modificable a mano al registrar. Ver ausenciaCobraSugerida() en helpers.js.
// Resultado de examen (paso 162, s.examResults[] = {id,date,result,grade}) — "aprobo"/"desaprobo"
// cuentan para la tasa de aprobación (ver examResultCounts en helpers.js); "norindio" no cuenta
// como examen rendido, sólo queda en el historial de la ficha.
const EXAM_RESULT_META = {
  aprobo:{label:"Aprobó",fg:"var(--status-activo-fg)"},
  desaprobo:{label:"No aprobó",fg:"var(--status-desaprobo-fg)"},
  norindio:{label:"No rindió",fg:"var(--muted)"},
};
const AUSENCIA_MOTIVO_META = {
  aviso_tiempo:{label:"Avisó con tiempo"},
  aviso_tarde:{label:"Avisó tarde"},
  no_aviso:{label:"No avisó"},
};
// Resultado del cierre de objetivo de clase (ver s.sessions[].objetivoResult en helpers.js).
// pctDefault es el valor que toma el slider si el profesor no lo tocó antes de tocar el botón.
// El ícono de cada uno (ICON_CHECK/ICON_HALF/ICON_X) vive en views-core.js — OBJETIVO_ICONS ahí — porque
// config.js carga antes que los SVG inline del set unificado (ver paso 73 en CHANGELOG.md).
const OBJETIVO_META = {
  si:{label:"Sí",fg:"var(--tarea-hecha-fg)",bg:"var(--greenbg)",pctDefault:100},
  medias:{label:"A medias",fg:"var(--tarea-intentada-fg)",bg:"var(--amberbg)",pctDefault:50},
  no:{label:"No",fg:"var(--tarea-no-fg)",bg:"var(--redbg)",pctDefault:0},
};
// Estado de la seña de una clase puntual (ver s.clasesPuntuales[].seniaEstado en helpers.js).
// "retenida"/"devuelta" son terminales (las pone applyCancelacion, no se tocan a mano); sólo
// "pendiente"↔"cobrada" se alternan con un toque (ver toggle-senia-estado en events.js).
// Reusan los mismos tokens -fg de TAREA_META (ya pensados para leerse como texto, con buen
// contraste en ambos temas) en vez de los colores planos --amber/--green/--red, que sobre el
// fondo por defecto de un chip no llegan a 4.5:1 (paso 75).
const SENIA_ESTADO_META = {
  pendiente:{label:"Pendiente",fg:"var(--tarea-intentada-fg)"},
  cobrada:{label:"Cobrada",fg:"var(--tarea-hecha-fg)"},
  retenida:{label:"Retenida",fg:"var(--tarea-no-fg)"},
  devuelta:{label:"Devuelta",fg:"var(--muted)"},
};
// Política de cancelación por defecto (state.catalog.cancelPolicy) — catálogos sincronizados
// antes de este campo no lo tienen; se completa con esto en cada lectura (ver cancelPolicyFor()
// en helpers.js), sin migrar nada a mano.
function defaultCancelPolicy(){ return {horasMinimas:24, siATiempo:"devuelve", texto:""}; }
// Recordatorios de cobro (state.catalog.recordatorios) — mismo patrón que cancelPolicy: sincroniza
// vía catalog, con este default para catálogos viejos que todavía no lo tienen (ver
// recordatoriosFor() en helpers.js). notificacionesOS es la intención guardada; el permiso real
// del navegador (Notification.permission) es local a cada dispositivo y no viaja en el JSON.
function defaultRecordatorios(){ return {activo:true, diasAtraso:1, notificacionesOS:false}; }
// Racha "días al día" (paso 155, state.catalog.racha) — mismo patrón que cancelPolicy/recordatorios:
// sincroniza vía catalog, con este default para catálogos viejos que todavía no lo tienen (ver
// rachaFor() en helpers.js). ultimoCheck (YYYY-MM-DD) es el último día que ya se evaluó — evita
// recalcular más de una vez por día y evita romper la racha la primera vez que se usa el feature
// (sin ultimoCheck previo no hay "ayer" con el que comparar). hitos guarda qué festejos (7/30/100
// días) ya se mostraron, para no repetirlos si la racha se queda pisando ese número.
// historial guarda los últimos RACHA_HISTORIAL_DIAS {date,alDia} — lo único que necesitaría un
// futuro resumen semanal por mail (cuaderno-supabase) para armar "estuviste al día X de Y días".
function defaultRacha(){ return {actual:0, mejor:0, ultimoCheck:null, hitos:[], historial:[]}; }
const RACHA_HISTORIAL_DIAS = 7;
// Disponibilidad declarada del docente (paso 159, state.catalog.disponibilidad) — mismo patrón que
// racha: sincroniza vía catalog, ausente en catálogos viejos (ver disponibilidadFor() en helpers.js)
// sin que eso rompa nada ni dispare ningún aviso — "sin disponibilidad declarada" es simplemente el
// estado inicial, no un error. Cada entrada es una celda horaria suelta {day (0=Lunes..6=Domingo,
// igual que DIAS_SEMANA), hour ("HH:00", mismo bucket horario que usa la grilla semanal de paso 134
// — ver vAgendaWeekGrid)} pintada como disponible; no son rangos con start/end porque el pintado es
// celda por celda (un click = una hora) y una lista plana de celdas alcanza para saber "esta celda
// está pintada sí/no" sin tener que fusionar o partir rangos cuando se toca una celda en el medio de
// un bloque ya pintado.
function defaultDisponibilidad(){ return []; }
// Costos del negocio (state.catalog.costos) — mismo patrón que cancelPolicy/recordatorios: sincroniza
// vía catalog, con este default para catálogos viejos que todavía no lo tienen (ver costosFor() en
// helpers.js). Cada costo tiene subjectId/studentId opcionales (nunca ambos) para asignarlo a una
// materia o alumno puntual; sin ninguno de los dos, es un costo general del negocio (ver
// rentabilidadPorMateria/rentabilidadPorAlumno en helpers.js — los generales no se reparten ahí,
// sólo entran en el total del mes).
function defaultCostos(){ return {fijos:[], variables:[]}; }
// Datos del docente (state.catalog.docente) — mismo patrón que cancelPolicy/recordatorios/costos:
// se cargan una sola vez en Cuenta y se reutilizan donde haga falta (por ahora, el generador de
// contratos — ver docenteFor() en helpers.js y vContrato() en views-ficha.js).
function defaultDocente(){ return {nombre:"", telefono:"", dni:""}; }
// Cobros del docente (paso 141, state.catalog.cobrosDocente): alias/CVU + links de pago propios,
// mostrados en el portal individual de cada alumno (nunca en la llave grupal/general — ver
// buildAlumnoBlock en sync.js) como "Formas de pagarle a {docente}". El docente sigue marcando
// los pagos a mano como siempre: esto es sólo mostrarle al alumno cómo pagar, nunca procesa nada.
function defaultCobrosDocente(){ return {alias:"", linkMP:"", linkOtro:"", qr:null}; }
// Plantillas de mensajes (paso 117, state.catalog.mensajes): centraliza TODOS los textos que la
// app arma para WhatsApp (y el recibo, que se comparte igual por ahí) en un solo lugar editable
// — Cuenta → "Mensajes" (ver vMensajesCard() en views-cuenta.js). Cada entrada es la plantilla por
// defecto; el docente puede pisarla (mensajesFor() en helpers.js) y "Restaurar" vuelve sólo esa
// plantilla puntual a este valor, sin tocar las demás. Variables con {llave}, reemplazadas al
// armar el mensaje real (mensajeTexto() en helpers.js) — nunca HTML, siempre texto plano.
// La firma del recordatorio de clase ("Nos vemos — nombre") y las líneas condicionales del
// recibo (saldo/docente, ver fillTemplateLines en helpers.js) son la única lógica que queda
// fuera del texto editable, a propósito: evita que una plantilla rota deje al recibo con datos
// mal armados o duplique el nombre del docente como variable.
const MENSAJES_META = [
  { key:"proximaClase", label:"Próxima clase (mensaje rápido)", vars:"{alumno}, {materia}, {mail}",
    default:"Hola {alumno}! Te escribo para coordinar/recordar nuestra próxima clase de {materia}. ¡Cualquier cosa avisame!" },
  { key:"recordatorioClase", label:"Recordatorio de clase (hoy/mañana, paso 111)", vars:"{alumno}, {materia}, {dia}, {hora}, {mail}",
    default:"¡Hola {alumno}! Te recuerdo la clase de {materia} de {dia} {hora}." },
  { key:"tarea", label:"Tarea de la última clase", vars:"{alumno}, {fecha}, {tarea}, {mail}",
    default:"Hola {alumno}! Te recuerdo la tarea de la clase del {fecha}: {tarea}" },
  { key:"examen", label:"Recordatorio de examen", vars:"{alumno}, {materia}, {dias}, {fecha}, {mail}",
    default:"Hola {alumno}! Faltan {dias} para tu examen de {materia}{fecha}. ¡Vamos con todo!" },
  { key:"cumpleanos", label:"Saludo de cumpleaños", vars:"{alumno}, {mail}",
    default:"¡Feliz cumpleaños, {alumno}! Espero que la pases muy bien." },
  { key:"cobro", label:"Coordinar pago (sin deuda pendiente)", vars:"{alumno}, {mail}, {link_pago}, {alias}",
    default:"Hola {alumno}! Te escribo para coordinar el pago de las clases." },
  { key:"avisoDeuda", label:"Aviso de pago pendiente", vars:"{alumno}, {monto}, {mail}, {link_pago}, {alias}",
    default:"Hola {alumno}! Te escribo por el pago pendiente de {monto}.\n{link_pago_linea}\n¡Avisame cuando lo puedas hacer, gracias!" },
  { key:"recibo", label:"Texto del recibo", vars:"{numero}, {fecha}, {concepto}, {monto}, {saldo}, {alumno}, {docente}, {mediosPago}, {link_pago}, {alias}",
    default:"*Recibo Nº {numero}*\nFecha: {fecha}\nConcepto: {concepto}\nMonto: {monto}\n{saldo}\nAlumno/a: {alumno}\n{docente}\n{mediosPago}\n\n_Generado con Entreclases_" },
  { key:"compartirLlave", label:"Compartir acceso al portal (paso 139)", vars:"{alumno}, {link}, {mail}",
    default:"¡Hola {alumno}! Te paso tu acceso al portal, donde vas a poder ver tu próxima clase y avance: {link}" },
  { key:"compartirLlaveGrupal", label:"Compartir llave grupal (paso 140)", vars:"{alumno}, {materia}, {link}, {mail}",
    default:"¡Hola {alumno}! Te paso el acceso grupal de {materia}, donde vas a encontrar material y las próximas clases: {link}" },
  { key:"packAgotado", label:"Pack de clases terminado (paso 158)", vars:"{alumno}, {clases}, {mail}",
    default:"¡Hola {alumno}! Se terminó tu pack de {clases} clases — ¿te armo uno nuevo para seguir?" },
  { key:"felicitarAprobo", label:"Felicitar por aprobar un examen (paso 162)", vars:"{alumno}, {materia}, {nota}, {mail}",
    default:"¡Felicitaciones {alumno}! 🎉 Aprobaste{materia}{nota}. ¡Muy bien merecido, seguimos así!" },
  { key:"despedida", label:"Despedida de fin de cuatrimestre (paso 163)", vars:"{alumno}, {mail}",
    default:"¡Éxitos con la cursada, {alumno}! Fue un gusto acompañarte. Cualquier cosa, acá estoy." },
];
function defaultMensajes(){ const o={}; MENSAJES_META.forEach(m=>{ o[m.key]=m.default; }); return o; }
// Grupos acordeón de Cuenta → Mensajes (paso 175): sólo agrupan visualmente las MENSAJES_META de
// arriba por contexto — no cambian storage ni claves. Cada plantilla arranca colapsada (sólo el
// nombre) y se abre de a una para editar, ver vMensajesCard()/vMensajePlantillaRow() en views-cuenta.js.
const MENSAJES_GRUPOS = [
  { id:"cobros", label:"Cobros", keys:["cobro","avisoDeuda","recibo"] },
  { id:"clases", label:"Clases y recordatorios", keys:["proximaClase","recordatorioClase","tarea","examen"] },
  { id:"llaves", label:"Llaves y portal", keys:["compartirLlave","compartirLlaveGrupal"] },
  { id:"celebraciones", label:"Celebraciones", keys:["cumpleanos","felicitarAprobo","despedida"] },
  { id:"otros", label:"Otros", keys:["packAgotado"] },
];
// Plantillas propias (paso 175, state.catalog.mensajesPropios): además de las MENSAJES_META fijas
// de arriba, el docente puede crear las suyas con nombre + texto libre (mismas variables genéricas
// que ya usan las plantillas de cobros/llaves — ver PLANTILLA_PROPIA_VARS). Aparecen junto a las
// generales en todos los selectores de "mandar mensaje" (ficha, alertas, aviso de cobros) — ver
// vPlantillasPropiasChips()/waMsgPropia() en views-core.js. Retrocompatible: un cuaderno sin ninguna
// plantilla propia simplemente no tiene la clave (mensajesPropiasFor() en helpers.js devuelve []).
const PLANTILLA_PROPIA_VARS = "{alumno}, {materia}, {monto}, {link_pago}, {alias}, {mail}";
// 0=Lunes .. 6=Domingo — usado por los horarios habituales y la vista Agenda.
const DIAS_SEMANA = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
// Duración de una clase, en minutos (paso 169): presets en horas para el selector de todos los
// formularios de clase (durationFieldHtml() en helpers.js) — "Otra…" revela un campo libre para
// minutos finos. El dato guardado sigue siendo minutos, sin cambios de formato.
const DURATION_PRESETS = [60,90,120,150,180,240];
// Alto fijo (px) de un bloque de una hora en la grilla semanal y en la vista día (paso 169) — antes
// crecía con el contenido; ahora es constante y las clases ocupan su alto proporcional a la
// duración dentro de él (ver vAgendaDayEvents en views-agenda.js). Debe coincidir con el período del
// repeating-linear-gradient de fondo en styles.css (.agenda-hour-bg).
const AGENDA_ROW_H = 52;
// Máximo de clases superpuestas que se muestran lado a lado en la agenda antes de comprimirlas en
// chips mínimos con popover de detalle (paso 169, ver clusterAgendaOverlaps en helpers.js).
const AGENDA_MAX_COLS = 2;
// Plantillas de materias: temarios típicos de primer año universitario para no arrancar
// una materia nueva desde cero. Elegir una precarga estas unidades tal cual — 100% editables
// después desde el editor de la materia, igual que si las hubiera cargado a mano.
const SUBJECT_TEMPLATES = [
  { id:"tpl-analisis-1", name:"Análisis Matemático I", units:[
    "Números reales y funciones", "Límites y continuidad", "Derivadas",
    "Aplicaciones de la derivada", "Integrales indefinidas", "Integrales definidas y aplicaciones",
  ]},
  { id:"tpl-algebra", name:"Álgebra y Geometría Analítica", units:[
    "Vectores en el plano y el espacio", "Rectas y planos", "Matrices y determinantes",
    "Sistemas de ecuaciones lineales", "Espacios vectoriales", "Transformaciones lineales", "Cónicas",
  ]},
  { id:"tpl-matematica-ingreso", name:"Matemática básica / ingreso", units:[
    "Conjuntos numéricos", "Expresiones algebraicas", "Ecuaciones e inecuaciones",
    "Funciones", "Trigonometría", "Exponencial y logaritmo",
  ]},
  { id:"tpl-fisica-1", name:"Física I", units:[
    "Cinemática", "Leyes de Newton", "Trabajo y energía",
    "Impulso y cantidad de movimiento", "Dinámica de rotación", "Fluidos",
  ]},
  { id:"tpl-quimica-general", name:"Química General", units:[
    "Estructura atómica", "Tabla periódica y propiedades", "Enlace químico",
    "Estequiometría", "Gases", "Soluciones", "Reacciones y equilibrio químico",
  ]},
];
