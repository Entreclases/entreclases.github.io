"use strict";
/* ============ helpers genéricos: texto, fechas, ids ============ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const today = () => new Date().toISOString().slice(0,10);
const esc = (s) => String(s??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function daysTo(ds){ if(!ds) return null;
  const d=new Date(ds+"T12:00:00"), n=new Date(); n.setHours(12,0,0,0);
  return Math.round((d-n)/86400000); }
function fmtDate(ds){ if(!ds) return "—";
  return new Date(ds+"T12:00:00").toLocaleDateString("es-AR",{day:"numeric",month:"short"}); }
function fmtDateTime(ts){
  if(!ts) return "—";
  try{ return new Date(ts).toLocaleString("es-AR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}); }
  catch(e){ return "—"; }
}
function timeAgo(ts){
  if(!ts) return null;
  const ms=Date.now()-new Date(ts).getTime();
  if(ms<60000) return "recién";
  const min=Math.floor(ms/60000);
  if(min<60) return `hace ${min} minuto${min===1?"":"s"}`;
  const hr=Math.floor(min/60);
  if(hr<24) return `hace ${hr} hora${hr===1?"":"s"}`;
  const d=Math.floor(hr/24);
  return `hace ${d} día${d===1?"":"s"}`;
}
function fmtBytes(n){
  n=Number(n)||0;
  if(n<1024) return n+" B";
  if(n<1024*1024) return (n/1024).toFixed(1)+" KB";
  return (n/1024/1024).toFixed(1)+" MB";
}

/* ============ estado ============ */
let state = { students:[], catalog:defaultCatalog(), editSubjectId:null,
              view:"tablero", selId:null, filter:"activo", tab:"temas",
              listSearch:"", listSubject:"todas", listCareer:"todas", listSem:"todos",
              simTimer:null, simTimerLastMin:90, simPrefillNote:"",
              statsSubjectId:null,
              showNew:false, confirmDel:false, saveErr:false,
              syncStatus:"idle", syncMsg:"", lastSync:null,
              authMode:"login", authEmail:"", recovery:null,
              pendingConfirmEmail:null, confirmStatus:"idle", confirmError:"",
              reportMsg:"", reportStatus:"idle", reportError:"",
              reportes:[], reportFilter:"pendiente", reportesLoaded:false, reportesError:"",
              panelTab:"reportes", users:[], usersLoaded:false, usersError:"",
              metricas:[], altas:[], actividadLoaded:false, actividadError:"",
              recursos:null, recursosLoaded:false, recursosError:"",
              backups:[], backupsLoaded:false, backupsError:"",
              confirmRestoreId:null, restoreStatus:"idle", restoreError:"",
              newVersionTag:null, updateBannerDismissed:false };

const subjById = (id) => state.catalog.subjects.find(m=>m.id===id) || null;
function unitsFor(s){ const m=subjById(s.subjectId); return m ? m.units : Object.keys(s.topics||{}); }
function careerOptions(cur){ const l=[...state.catalog.careers]; if(cur && !l.includes(cur)) l.push(cur); return l; }
function touchCatalog(){ state.catalog.updatedAt=Date.now(); save(); render(); }

const alive = () => state.students.filter(s => !s.deleted);

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw){ const p = JSON.parse(raw);
      if(Array.isArray(p.students)) state.students = p.students;
      if(p.catalog && Array.isArray(p.catalog.careers) && Array.isArray(p.catalog.subjects))
        state.catalog = p.catalog; }
  }catch(e){}
  // limpiar marcas de borrado con más de 90 días (ya viajaron a todos los dispositivos)
  state.students = state.students.filter(s => !(s.deleted && (Date.now()-(s.updatedAt||0)) > 90*86400000));
}
function setDirty(v){ try{ v ? localStorage.setItem(DIRTY_KEY,"1") : localStorage.removeItem(DIRTY_KEY); }catch(e){} }
function isDirty(){ return localStorage.getItem(DIRTY_KEY)==="1"; }
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify({students:state.students, catalog:state.catalog})); state.saveErr=false; }
  catch(e){ state.saveErr=true; }
  setDirty(true);
  scheduleSync();
}
const sel = () => state.students.find(s=>s.id===state.selId) || null;
function update(id, patch){
  patch = {...patch, updatedAt: Date.now()};
  state.students = state.students.map(s => s.id===id ? {...s,...patch} : s);
  save(); render();
}
function emptyStudent(){
  return { id:uid(), name:"", career:(state.catalog.careers[0]||"Ingeniería"), subject:"", subjectId:"",
    chair:"", status:"activo", semaforo:"sd", examDate:"", startDate:today(), notes:"",
    updatedAt:Date.now(), topics:{}, sessions:[], simulacros:[] };
}

/* ============ alumno de ejemplo (onboarding) ============ */
// Muestra todos los estados de tema, una clase con tarea hecha y otra sin hacer,
// un simulacro con diagnóstico, semáforo amarillo y examen próximo — todo lo que
// la app sabe hacer, para que una cuenta nueva sin datos vea de entrada qué se puede hacer.
function daysFromToday(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function sampleStudent(){
  const m = subjById("matbasica") || state.catalog.subjects[0] || null;
  const units = m ? m.units : [];
  const topics = {};
  const cycle = ["parcial","visto","practica","pendiente","noentra"];
  units.forEach((t,i)=>{ topics[t] = cycle[i % cycle.length]; });
  return {
    id: uid(), name:"Alumno de ejemplo", sample:true,
    career: state.catalog.careers[0]||"Ingeniería", subject: m?m.name:"", subjectId: m?m.id:"",
    chair:"", status:"activo", semaforo:"amarillo",
    examDate: daysFromToday(6), startDate: daysFromToday(-20),
    notes:"Este alumno es un ejemplo para que veas cómo se usa la app — podés borrarlo cuando quieras desde su ficha.",
    updatedAt: Date.now(), topics,
    sessions:[
      {id:uid(), date:daysFromToday(-6), topic:units[1]||"", tarea:"hecha", note:"Bien encaminada, resolvió todo sin ayuda."},
      {id:uid(), date:daysFromToday(-2), topic:units[2]||"", tarea:"intentada", note:"Le costó determinantes 3x3 — repasar la regla de Sarrus."}
    ],
    simulacros:[
      {id:uid(), date:daysFromToday(-3), grade:"6/10", note:"2 errores conceptuales en límites, 1 de cuenta en derivadas, bien en integrales."}
    ]
  };
}

/* ============ guía de primeros pasos ============ */
function tipsDismissed(){ return localStorage.getItem(ONBOARDING_TIPS_KEY)==="1"; }
function dismissTips(){ localStorage.setItem(ONBOARDING_TIPS_KEY,"1"); }

/* ============ recordatorio de copia manual (.json) ============ */
function getLastExport(){ const v=localStorage.getItem(LAST_EXPORT_KEY); return v?parseInt(v,10):null; }
function markExported(){ localStorage.setItem(LAST_EXPORT_KEY, String(Date.now())); }
function dismissBackupReminder(){ localStorage.setItem(BACKUP_REMINDER_DISMISS_KEY, String(Date.now())); }
function shouldShowBackupReminder(){
  if(alive().length===0) return false;
  const last = getLastExport();
  const daysSince = last ? (Date.now()-last)/86400000 : Infinity;
  if(daysSince < BACKUP_REMINDER_DAYS) return false;
  const dismissedAt = parseInt(localStorage.getItem(BACKUP_REMINDER_DISMISS_KEY)||"0",10);
  if(dismissedAt && (Date.now()-dismissedAt)/86400000 < BACKUP_REMINDER_SNOOZE_DAYS) return false;
  return true;
}

/* ============ alertas ============ */
function studentAlerts(s){
  const out=[]; if(s.status!=="activo") return out;
  const d=daysTo(s.examDate);
  if(d!==null && d>=0 && d<=14 && s.simulacros.length===0)
    out.push(`Examen en ${d} día${d===1?"":"s"} y todavía no hizo ningún simulacro`);
  const last2=[...s.sessions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,2);
  if(last2.length===2 && last2.every(x=>x.tarea==="no"))
    out.push("Dos clases seguidas sin tarea hecha — momento de la charla");
  const lastDate = s.sessions.length ? [...s.sessions].sort((a,b)=>b.date.localeCompare(a.date))[0].date : s.startDate;
  const gap = lastDate ? -daysTo(lastDate) : null;
  if(gap!==null && gap>=10) out.push(`Sin clases hace ${gap} días — ¿sigue o pasarlo a pausado?`);
  return out;
}

/* ============ sesión: cookies (web) / localStorage (nativo) ============ */
// Cookies de sesión (solo web): sin Expires/Max-Age quedan como "cookie de sesión" del
// navegador — sobreviven a cerrar la pestaña pero se borran al cerrar el navegador entero.
function setCookie(name,value){
  const secure = location.protocol==="https:" ? "; Secure" : "";
  document.cookie = name+"="+encodeURIComponent(value)+"; path=/; SameSite=Lax"+secure;
}
function getCookie(name){
  const m = document.cookie.match(new RegExp("(?:^|; )"+name+"=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}
function delCookie(name){
  document.cookie = name+"=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
}
// Techo a la sesión web: algunos navegadores (Chrome/Edge con "continuar donde lo dejé")
// preservan las cookies de sesión al reabrir aunque se haya cerrado el navegador entero.
// Como eso escapa a lo que la página puede controlar, la propia app invalida la sesión
// si pasó más de este tiempo desde el login, sin cambiar el resto del comportamiento.
const SES_MAX_AGE_MS = 24*60*60*1000; // 24hs
function getSes(){
  try{
    if(IS_NATIVE) return JSON.parse(localStorage.getItem(SES_KEY))||null;
    let raw = getCookie(SES_KEY);
    if(!raw){
      // migración: versiones previas de la web guardaban la sesión en localStorage
      const legacy = localStorage.getItem(SES_KEY);
      if(legacy){ setCookie(SES_KEY, legacy); localStorage.removeItem(SES_KEY); raw = legacy; }
    }
    if(!raw) return null;
    const ses = JSON.parse(raw);
    if(ses.loginAt && (Date.now()-ses.loginAt) > SES_MAX_AGE_MS){ delCookie(SES_KEY); return null; }
    return ses;
  }catch(e){ return null; }
}
function setSes(v){
  if(IS_NATIVE){
    v ? localStorage.setItem(SES_KEY,JSON.stringify(v)) : localStorage.removeItem(SES_KEY);
  }else{
    v ? setCookie(SES_KEY,JSON.stringify(v)) : delCookie(SES_KEY);
  }
}
// rol cacheado en la propia sesión (ver storeSession/loadRole) para que ande offline;
// sin rol conocido todavía se degrada a "profesor" — nunca admin por defecto.
function sesIsAdmin(ses){ return !!(ses && ses.role==="admin"); }
function getRememberedEmails(){
  try{ const a=JSON.parse(localStorage.getItem(EMAILS_KEY)); return Array.isArray(a)?a:[]; }
  catch(e){ return []; }
}
function rememberEmail(email){
  if(!email) return;
  try{
    const list=[email, ...getRememberedEmails().filter(e=>e!==email)].slice(0,8);
    localStorage.setItem(EMAILS_KEY, JSON.stringify(list));
  }catch(e){}
}

function jwtSub(tok){
  try{ return JSON.parse(atob(tok.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).sub; }
  catch(e){ return null; }
}
