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
const RELEASES_API = "https://api.github.com/repos/manugandini53-design/manugandini53-design.github.io/releases/latest";
const DOWNLOADS_URL = "https://manugandini53-design.github.io/#usala";
// Backend de sincronización: un único proyecto Supabase para todos los usuarios de la app.
// La anon key es pública por diseño — la seguridad la dan las políticas RLS de la tabla
// `cuaderno` (cada cuenta solo puede leer/escribir su propia fila; ver el repo cuaderno-supabase).
const SUPA_URL = "https://iwxsntxkqfqucxhwlfdv.supabase.co";
const SUPA_ANON_KEY = "sb_publishable_S0zs9qmIRB5RWNZceO5gCg_vI7Hxx1D";
const APP_VERSION = "1.5.0";
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
  pendiente:{label:"Pendiente",bg:"#FFFFFF",fg:"#8B90A0",bd:"#D8DAE3"},
  visto:{label:"Visto",bg:"#EEF1F8",fg:"#3D4A6B",bd:"#B9C2D8"},
  practica:{label:"Práctica",bg:"#FBF3DC",fg:"#8A6410",bd:"#E3C878"},
  parcial:{label:"Nivel parcial",bg:"#E4F1E9",fg:"#1F6B44",bd:"#8FC4A6"},
  noentra:{label:"No entra",bg:"#F4F4F2",fg:"#B4B6BE",bd:"#E4E4E0"},
};
const STATUS_META = {
  activo:{label:"Activo",fg:"#1F6B44",bg:"#E4F1E9"},
  pausado:{label:"Pausado",fg:"#8A6410",bg:"#FBF3DC"},
  aprobo:{label:"Aprobó",fg:"#2C4A9A",bg:"#E8EDFB"},
  desaprobo:{label:"A recuperar",fg:"#A23A2A",bg:"#FAE9E4"},
  dejo:{label:"Dejó",fg:"#8B90A0",bg:"#F0F0EE"},
};
const SEM_CYCLE = ["sd","verde","amarillo","rojo"];
const SEM_META = {
  sd:{color:"#C9CCD6",label:"Sin evaluar"},
  verde:{color:"#2E9958",label:"Encaminado: llega bien a su objetivo"},
  amarillo:{color:"#E0A422",label:"En riesgo: llega ajustado, priorizar temas"},
  rojo:{color:"#C43C2B",label:"Complicado: difícilmente llegue así"},
};
const CAREERS = ["Ingeniería","Licenciatura","Arquitectura","Ingresante"];
function defaultCatalog(){
  return { careers:[...CAREERS],
    subjects:[{ id:"matbasica", name:"Matemática básica", units:[...TOPICS] }],
    updatedAt:0 };
}
const TAREA_META = {hecha:{label:"hecha",fg:"#1F6B44"},intentada:{label:"intentada",fg:"#8A6410"},no:{label:"no hecha",fg:"#A23A2A"}};
