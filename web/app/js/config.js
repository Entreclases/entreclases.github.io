"use strict";
/* ============ configuración: claves, urls, versiones, metadatos de estados ============ */
const KEY = "tutoria-seguimiento-v1";
const SES_KEY = "tutoria-sync-ses";   // sesión iniciada (tokens): cookie de sesión en la web (se borra al cerrar el navegador), localStorage en apps nativas (Tauri/Capacitor)
const EMAILS_KEY = "tutoria-remembered-emails"; // emails con los que se inició sesión con éxito en este dispositivo — no se borra al cerrar sesión
const BACKUP_DATE_KEY = "tutoria-last-backup-date"; // fecha (YYYY-MM-DD) del último snapshot subido a cuaderno_respaldos, para hacer uno solo por día
const MAX_BACKUPS = 15;
const DIRTY_KEY = "tutoria-sync-dirty"; // "1" mientras hay cambios locales sin confirmar por una escritura exitosa a la nube
const LAST_REMOTE_KEY = "tutoria-last-remote-updated"; // último updated_at de la fila remota que ya vimos, para el chequeo liviano
const VERSION_CHECK_KEY = "tutoria-last-version-check"; // timestamp del último chequeo de versión (apps nativas)
const VERSION_CHECK_INTERVAL_MS = 24*60*60*1000;
const ONBOARDING_TIPS_KEY = "tutoria-onboarding-tips-dismissed"; // "1" una vez que el usuario descarta la guía de primeros pasos
const LAST_EXPORT_KEY = "tutoria-last-export"; // timestamp de la última descarga manual del .json
const BACKUP_REMINDER_DISMISS_KEY = "tutoria-backup-reminder-dismissed-at"; // timestamp del último "descartar" del aviso de respaldo
const BACKUP_REMINDER_DAYS = 30; // a partir de cuántos días sin exportar se sugiere hacerlo
const BACKUP_REMINDER_SNOOZE_DAYS = 7; // cada cuánto reaparece el aviso si se descarta
const LOGIN_ATTEMPTS_KEY = "tutoria-login-attempts"; // {count, lockUntil} — freno local a intentos de login seguidos, aparte del rate-limit propio de Supabase
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 5*60*1000;
const LAST_COBROS_NOTIFY_KEY = "tutoria-last-cobros-notify-date"; // fecha (YYYY-MM-DD) del último aviso del sistema por cobros atrasados — uno por día, por dispositivo
// Biblioteca del portal (state.catalog.subjects[].materiales[].compartido + portales.publicado.biblioteca):
// URLs firmadas de Storage con este vencimiento; se renuevan solas (ver maybeRenewPortalLibrary
// en sync.js) cuando les queda menos de PORTAL_LINK_TTL_DAYS-PORTAL_LINK_RENEW_AFTER_DAYS de vida.
const PORTAL_LINK_TTL_DAYS = 30;
const PORTAL_LINK_RENEW_AFTER_DAYS = 20;
const PORTAL_RENEW_CHECK_KEY = "tutoria-portal-renew-check-date"; // fecha (YYYY-MM-DD) del último chequeo de renovación — uno por día, por dispositivo
const THEME_KEY = "tutoria-theme"; // "light" | "dark" | "system" (default)
function getTheme(){ return localStorage.getItem(THEME_KEY) || "system"; }
function applyTheme(theme){
  const root = document.documentElement;
  root.classList.remove("theme-light","theme-dark");
  if(theme==="light") root.classList.add("theme-light");
  else if(theme==="dark") root.classList.add("theme-dark");
}
function setTheme(theme){ localStorage.setItem(THEME_KEY, theme); applyTheme(theme); }
applyTheme(getTheme()); // se aplica de entrada, antes del primer render, para evitar parpadeo
const RELEASES_API = "https://api.github.com/repos/manugandini53-design/manugandini53-design.github.io/releases/latest";
const DOWNLOADS_URL = "https://manugandini53-design.github.io/#usala";
// Backend de sincronización: un único proyecto Supabase para todos los usuarios de la app.
// La anon key es pública por diseño — la seguridad la dan las políticas RLS de la tabla
// `cuaderno` (cada cuenta solo puede leer/escribir su propia fila; ver el repo cuaderno-supabase).
const SUPA_URL = "https://iwxsntxkqfqucxhwlfdv.supabase.co";
const SUPA_ANON_KEY = "sb_publishable_S0zs9qmIRB5RWNZceO5gCg_vI7Hxx1D";
// Materiales por materia: bucket privado de Storage, carpetas materiales/{uid}/{subjectId}/{archivo}.
// El aislamiento entre usuarios lo dan las políticas RLS del bucket (ver cuaderno-supabase),
// no el código de acá — el cliente nunca arma una ruta con un uid que no sea el propio.
const MATERIALES_BUCKET = "materiales";
const MATERIAL_MAX_BYTES = 10*1024*1024;
const MATERIAL_MAX_COUNT = 20;
const MATERIAL_MAX_TOTAL_BYTES = 20*1024*1024; // por usuario, sumando materiales de todas sus materias
const APP_VERSION = "2.0.5";
// Empaquetado nativo: Tauri inyecta window.__TAURI__, Capacitor inyecta window.Capacitor
const IS_NATIVE = !!(window.__TAURI__ || window.Capacitor);
function detectPlatform(){
  if(window.__TAURI__) return "Windows";
  if(window.Capacitor) return "Android";
  return "Web";
}
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
// funciones menos obvias — ver helpTip() en views.js. Mismo criterio que TOPIC_META/STATUS_META:
// contenido acá, presentación en views.js.
const HELP_TEXTS = {
  senia: "Un adelanto que el alumno paga para reservar una clase puntual. Si cancela a tiempo (según tu política) se le devuelve; si no, se la queda el profesor.",
  cancelPolicy: "Define cuántas horas antes puede cancelar un alumno una clase puntual sin perder la seña. Se aplica sola al marcar una clase como cancelada.",
  portal: "Un link propio, sin login, para que tus alumnos vean materiales compartidos y (si tienen llave individual) su próxima clase y avance — nunca notas, pagos ni comentarios privados.",
  rentabilidad: "Cuánto te queda de cada materia o alumno después de restar los costos que le asignaste (fijos y variables). Los costos sin materia ni alumno sólo entran en el total del mes.",
};
// Mini centro de ayuda (Cuenta, paso 74): preguntas frecuentes en español claro — qué hace
// cada sección, sin tecnicismos. Ver vCentroAyuda() en views.js.
const FAQ_ITEMS = [
  {q:"¿Cómo cargo un alumno nuevo?", a:"Desde Estudiantes tocá «+ Nuevo estudiante», o elegí una materia primero en Materias si todavía no la creaste. Podés cargar la fecha de examen y notas iniciales, o dejarlo para después."},
  {q:"¿Qué es el semáforo (verde/amarillo/rojo)?", a:"Tu evaluación de cómo llega el alumno a su objetivo: verde (encaminado), amarillo (en riesgo, hay que priorizar temas) o rojo (difícilmente llegue así). Se cambia tocando el círculo de color en la ficha o la lista."},
  {q:"¿Qué es una seña y cómo funciona?", a:"Un adelanto que el alumno paga para reservar una clase puntual. Se activa por alumno desde su ficha (pestaña «Pagos»). Si cancela con el aviso mínimo que definas en la política de cancelación, se le devuelve; si no, la retenés."},
  {q:"¿Para qué sirve el Portal?", a:"Le da a tus alumnos un link propio, sin necesidad de crear cuenta, donde ven los materiales que compartiste y (si generás su llave individual) su próxima clase y avance por unidades — nunca notas, pagos ni comentarios privados."},
  {q:"¿Cómo veo si estoy ganando plata de verdad?", a:"En Pagos → Rentabilidad: descontando los costos que le asignaste a cada materia o alumno (fijos y variables), te muestra cuánto te queda neto por hora dictada, por mes."},
  {q:"¿Mis datos están a salvo si se me rompe la compu?", a:"Sí — con sesión iniciada se sincronizan solos a la nube y podés entrar desde cualquier dispositivo. Además se guarda un respaldo automático diario (ver «Respaldos automáticos» acá abajo) y podés descargar una copia .json manual cuando quieras."},
];
const CAREERS = ["Ingeniería","Licenciatura","Arquitectura","Ingresante"];
function defaultCatalog(){
  return { careers:[...CAREERS],
    subjects:[{ id:"materia-ejemplo", name:"Materia de ejemplo (tocala para verla)",
      units:["Unidad 1: introducción","Unidad 2: desarrollo","Unidad 3: aplicaciones","Unidad 4: repaso final"] }],
    packs:[],
    trash:[],
    cancelPolicy: defaultCancelPolicy(),
    recordatorios: defaultRecordatorios(),
    costos: defaultCostos(),
    docente: defaultDocente(),
    updatedAt:0 };
}
const TAREA_META = {hecha:{label:"hecha",fg:"var(--tarea-hecha-fg)"},intentada:{label:"intentada",fg:"var(--tarea-intentada-fg)"},no:{label:"no hecha",fg:"var(--tarea-no-fg)"}};
// Resultado del cierre de objetivo de clase (ver s.sessions[].objetivoResult en helpers.js).
// pctDefault es el valor que toma el slider si el profesor no lo tocó antes de tocar el botón.
// El ícono de cada uno (ICON_CHECK/ICON_HALF/ICON_X) vive en views.js — OBJETIVO_ICONS ahí — porque
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
// Costos del negocio (state.catalog.costos) — mismo patrón que cancelPolicy/recordatorios: sincroniza
// vía catalog, con este default para catálogos viejos que todavía no lo tienen (ver costosFor() en
// helpers.js). Cada costo tiene subjectId/studentId opcionales (nunca ambos) para asignarlo a una
// materia o alumno puntual; sin ninguno de los dos, es un costo general del negocio (ver
// rentabilidadPorMateria/rentabilidadPorAlumno en helpers.js — los generales no se reparten ahí,
// sólo entran en el total del mes).
function defaultCostos(){ return {fijos:[], variables:[]}; }
// Datos del docente (state.catalog.docente) — mismo patrón que cancelPolicy/recordatorios/costos:
// se cargan una sola vez en Cuenta y se reutilizan donde haga falta (por ahora, el generador de
// contratos — ver docenteFor() en helpers.js y vContrato() en views.js).
function defaultDocente(){ return {nombre:"", telefono:"", dni:""}; }
// 0=Lunes .. 6=Domingo — usado por los horarios habituales y la vista Agenda.
const DIAS_SEMANA = ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
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
