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
const APP_VERSION = "1.6.0";
// Empaquetado nativo: Tauri inyecta window.__TAURI__, Capacitor inyecta window.Capacitor
const IS_NATIVE = !!(window.__TAURI__ || window.Capacitor);
function detectPlatform(){
  if(window.__TAURI__) return "Windows";
  if(window.Capacitor) return "Android";
  return "Web";
}
const TOPICS = ["Trigonometría","Funciones","Matrices","Determinantes","Vectores","Límites","Derivadas","Integrales"];
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
const CAREERS = ["Ingeniería","Licenciatura","Arquitectura","Ingresante"];
function defaultCatalog(){
  return { careers:[...CAREERS],
    subjects:[{ id:"matbasica", name:"Matemática básica", units:[...TOPICS] }],
    updatedAt:0 };
}
const TAREA_META = {hecha:{label:"hecha",fg:"var(--tarea-hecha-fg)"},intentada:{label:"intentada",fg:"var(--tarea-intentada-fg)"},no:{label:"no hecha",fg:"var(--tarea-no-fg)"}};
