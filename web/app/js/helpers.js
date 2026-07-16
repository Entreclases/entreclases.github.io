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
function addDays(ds, n){ const d=new Date(ds+"T12:00:00"); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
// lunes de la semana que contiene ds (0=Lunes..6=Domingo, igual que DIAS_SEMANA)
function mondayOfWeek(ds){
  const d=new Date(ds+"T12:00:00"), dow=d.getDay(); // getDay(): 0=domingo..6=sábado
  return addDays(ds, dow===0 ? -6 : 1-dow);
}
function weekdayIdx(ds){ return (new Date(ds+"T12:00:00").getDay()+6)%7; } // 0=Lunes..6=Domingo
function addMinutesToTime(time, minutes){
  const [h,m]=time.split(":").map(Number);
  const total=((h*60+m+minutes)%1440+1440)%1440;
  return String(Math.floor(total/60)).padStart(2,"0")+":"+String(total%60).padStart(2,"0");
}
function fmtBytes(n){
  n=Number(n)||0;
  if(n<1024) return n+" B";
  if(n<1024*1024) return (n/1024).toFixed(1)+" KB";
  return (n/1024/1024).toFixed(1)+" MB";
}
function fmtMoney(n){ return "$"+Math.round(n||0).toLocaleString("es-AR"); }
async function copyToClipboard(text){
  if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(text); return; }
  const ta=document.createElement("textarea");
  ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.focus(); ta.select();
  try{ if(!document.execCommand("copy")) throw new Error("copy failed"); }
  finally{ document.body.removeChild(ta); }
}

/* ============ estado ============ */
let state = { students:[], catalog:defaultCatalog(), editSubjectId:null, editPackId:null,
              newPackName:"", newPackSubjects:[], newPackError:"",
              view:"tablero", selId:null, filter:"activo", tab:"temas",
              listSearch:"", listSubject:"todas", listCareer:"todas", listSem:"todos",
              simTimer:null, simTimerLastMin:90, simPrefillNote:"",
              statsSubjectId:null,
              showNew:false, newStudentError:"", confirmDel:false, fichaError:"", saveErr:false,
              syncStatus:"idle", syncMsg:"", lastSync:null,
              authMode:"login", authEmail:"", recovery:null,
              pendingConfirmEmail:null, confirmStatus:"idle", confirmError:"",
              reportMsg:"", reportStatus:"idle", reportError:"",
              reportes:[], reportFilter:"pendiente", reportesLoaded:false, reportesError:"",
              panelTab:"reportes", users:[], usersLoaded:false, usersError:"",
              metricas:[], altas:[], actividadLoaded:false, actividadError:"", actividadMode:"dia",
              metricasHorarias:[], metricasHorariasLoaded:false, metricasHorariasError:"",
              recursos:null, recursosLoaded:false, recursosError:"",
              backups:[], backupsLoaded:false, backupsError:"",
              confirmRestoreId:null, restoreStatus:"idle", restoreError:"",
              materialesSubjectId:null, materialesList:[], materialesLoaded:false, materialesError:"",
              materialesUploading:false, materialesUploadError:"",
              materialesConfirmDelName:null, materialesDeleteStatus:"idle",
              newVersionTag:null, updateBannerDismissed:false,
              pagosMonth:null,
              informePeriod:"3m", informeCopyMsg:"",
              agendaWeekOffset:0, sessionPrefillDate:"" };

const subjById = (id) => state.catalog.subjects.find(m=>m.id===id) || null;
function unitsFor(s){ const m=subjById(s.subjectId); return m ? m.units : Object.keys(s.topics||{}); }
function careerOptions(cur){ const l=[...state.catalog.careers]; if(cur && !l.includes(cur)) l.push(cur); return l; }
function touchCatalog(){ state.catalog.updatedAt=Date.now(); save(); render(); }
// packs: agrupan materias existentes para dar de alta un alumno en todas de una (ver events.js
// "create"). Catálogos guardados antes de este campo no tienen packs — se completa acá.
function packsContaining(subjectId){ return (state.catalog.packs||[]).filter(p=>p.subjectIds.includes(subjectId)); }

const alive = () => state.students.filter(s => !s.deleted);

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(raw){ const p = JSON.parse(raw);
      if(Array.isArray(p.students)) state.students = p.students;
      if(p.catalog && Array.isArray(p.catalog.careers) && Array.isArray(p.catalog.subjects))
        state.catalog = p.catalog; }
  }catch(e){}
  if(!Array.isArray(state.catalog.packs)) state.catalog.packs=[];
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
    updatedAt:Date.now(), topics:{}, sessions:[], simulacros:[],
    tarifa:"", modalidad:"", pagos:[], informeComment:"", phone:"", examResults:[],
    horarios:[], clasesPuntuales:[] };
}

/* ============ regla: una ficha = un alumno en una materia ============
   El mismo nombre en materias distintas es válido (un alumno que cursa varias
   materias tiene una ficha por cada una); lo que no se permite es dos fichas
   vivas con el mismo nombre en la misma materia (incluye "sin materia", subjectId=""). */
function normName(s){ return (s||"").trim().toLowerCase().replace(/\s+/g," "); }
function findDuplicateStudent(name, subjectId, excludeId){
  const n = normName(name); if(!n) return null;
  return alive().find(x => x.id!==excludeId && normName(x.name)===n && (x.subjectId||"")===(subjectId||"")) || null;
}

/* ============ alumno de ejemplo (onboarding) ============ */
// Muestra todos los estados de tema, una clase con tarea hecha y otra sin hacer,
// un simulacro con diagnóstico, semáforo amarillo y examen próximo — todo lo que
// la app sabe hacer, para que una cuenta nueva sin datos vea de entrada qué se puede hacer.
function daysFromToday(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function sampleStudent(){
  const m = subjById("materia-ejemplo") || state.catalog.subjects[0] || null;
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
// cada alerta trae "wa": qué mensaje pre-armado de WhatsApp corresponde si el
// profesor quiere escribirle al alumno directo desde acá (ver waMsgForAlert en views.js).
function studentAlerts(s){
  const out=[]; if(s.status!=="activo") return out;
  const d=daysTo(s.examDate);
  if(d!==null && d>=0 && d<=14 && s.simulacros.length===0)
    out.push({text:`Examen en ${d} día${d===1?"":"s"} y todavía no hizo ningún simulacro`, wa:"examen"});
  if(d!==null && d>=0 && d<10 && !hasScheduledBeforeExam(s))
    out.push({text:`Rinde en ${d} día${d===1?"":"s"} y no tiene ninguna clase agendada hasta el examen — ¿reforzamos?`, wa:"clase"});
  const last2=[...s.sessions].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,2);
  if(last2.length===2 && last2.every(x=>x.tarea==="no"))
    out.push({text:"Dos clases seguidas sin tarea hecha — momento de la charla", wa:"tarea"});
  const lastDate = s.sessions.length ? [...s.sessions].sort((a,b)=>b.date.localeCompare(a.date))[0].date : s.startDate;
  const gap = lastDate ? -daysTo(lastDate) : null;
  if(gap!==null && gap>=10) out.push({text:`Sin clases hace ${gap} días — ¿sigue o pasarlo a pausado?`, wa:"clase"});
  return out;
}

/* ============ resultado de examen: pregunta desde el tablero, alimenta estado y estadísticas ============
   Se identifica por (alumno, examDate exacta) — si el profesor carga una fecha
   de examen nueva más adelante (recuperatorio, próximo parcial), vuelve a
   preguntar porque esa fecha todavía no tiene resultado registrado. */
function hasCurrentExamResult(s){ return !!(s.examDate && (s.examResults||[]).some(r=>r.date===s.examDate)); }
function pendingExamResults(){
  return alive().filter(s => s.status==="activo" && s.examDate
    && daysTo(s.examDate)!==null && daysTo(s.examDate)<=0 && !hasCurrentExamResult(s));
}
// aprobo/desaprobo cuentan para la tasa; "no rindió" no cuenta como examen rendido.
function examResultCounts(students){
  let aprobo=0, desaprobo=0;
  students.forEach(s=>(s.examResults||[]).forEach(r=>{
    if(r.result==="aprobo") aprobo++;
    else if(r.result==="desaprobo") desaprobo++;
  }));
  return { aprobo, desaprobo, total:aprobo+desaprobo };
}

/* ============ pagos: opcional por alumno (tarifa + modalidad) ============
   Sin tarifa cargada, la función de pagos no existe para ese alumno — ni en su
   ficha, ni en clases, ni en la vista "Pagos". Todo se calcula por mes (YYYY-MM):
   modalidad "clase" cobra por clase dada ese mes; "mensual" cobra una tarifa fija
   por mes, contra los pagos registrados en ese mes (sin arrastre entre meses). */
function hasPagos(s){ return !!(Number(s.tarifa)>0 && (s.modalidad==="clase"||s.modalidad==="mensual")); }
function monthKeyOf(ds){ return (ds||"").slice(0,7); }
function currentMonthKey(){ return monthKeyOf(today()); }
function monthLabel(mk){
  if(!mk) return "—";
  const d=new Date(mk+"-01T12:00:00");
  const l=d.toLocaleDateString("es-AR",{month:"long",year:"numeric"});
  return l.charAt(0).toUpperCase()+l.slice(1);
}
function recentMonthKeys(n){
  const out=[]; const d=new Date(); d.setDate(1);
  for(let i=0;i<n;i++){ out.push(d.toISOString().slice(0,7)); d.setMonth(d.getMonth()-1); }
  return out;
}
function pagoResumen(s, mk){
  if(!hasPagos(s)) return null;
  const tarifa=Number(s.tarifa)||0;
  const clasesMes=(s.sessions||[]).filter(c=>monthKeyOf(c.date)===mk);
  if(s.modalidad==="clase"){
    const cobradas=clasesMes.filter(c=>c.cobrada).length;
    const pendientes=clasesMes.length-cobradas;
    return { clases:clasesMes.length, total:tarifa*clasesMes.length, cobrado:tarifa*cobradas, pendiente:tarifa*pendientes };
  }
  const cobrado=Math.min(tarifa, (s.pagos||[]).filter(p=>monthKeyOf(p.date)===mk).reduce((a,p)=>a+(Number(p.amount)||0),0));
  return { clases:clasesMes.length, total:tarifa, cobrado, pendiente:Math.max(0, tarifa-cobrado) };
}

/* ============ informe de progreso: período elegido para filtrar clases/simulacros ============ */
const INFORME_PERIODS = {
  "1m":{label:"Último mes",days:30}, "3m":{label:"Últimos 3 meses",days:90},
  "6m":{label:"Últimos 6 meses",days:180}, "all":{label:"Todo el historial",days:null},
};
function informePeriodFrom(key){
  const p = INFORME_PERIODS[key]||INFORME_PERIODS["3m"];
  return p.days ? daysFromToday(-p.days) : null;
}
function periodRangeLabel(key, fromDate){
  const p = INFORME_PERIODS[key]||INFORME_PERIODS["3m"];
  return fromDate ? `${p.label} (${fmtDate(fromDate)} – ${fmtDate(today())})` : p.label;
}

/* ============ WhatsApp: solo links wa.me, sin API ============
   wa.me para Argentina necesita 54 9 + código de área + número, sin el 0 inicial
   del área ni el 15 del celular. No hay forma confiable de aislar el "15" de en
   medio del número sin una lista de códigos de área, así que se le pide al
   profesor que lo cargue ya sin 0 ni 15 (ver el hint junto al campo en la ficha). */
function normalizeArPhone(raw){
  let d = String(raw||"").replace(/\D/g,""); if(!d) return "";
  if(d.startsWith("0")) d = d.slice(1);
  if(d.startsWith("54")){ d = d.slice(2); if(d.startsWith("0")) d = d.slice(1); }
  if(!d.startsWith("9")) d = "9"+d;
  return "54"+d;
}
function hasPhone(s){ return !!(s.phone && s.phone.replace(/\D/g,"").length>=8); }
function waLink(s, text){ return `https://wa.me/${normalizeArPhone(s.phone)}?text=${encodeURIComponent(text)}`; }
function studentFirstName(s){ return (s.name||"").trim().split(/\s+/)[0] || s.name || ""; }

/* ============ agenda: horarios habituales + clases puntuales ============
   Los horarios habituales (s.horarios) son recurrentes por día de semana; las
   clases puntuales (s.clasesPuntuales) son sueltas, con fecha propia. Ambos son
   "clases previstas", distintas de s.sessions (clases ya dadas y registradas). */
function studentHasSessionOnDate(studentId, date){
  const s = state.students.find(x=>x.id===studentId);
  return !!(s && (s.sessions||[]).some(x=>x.date===date));
}
// ¿tiene alguna clase (habitual o puntual) prevista entre hoy y la fecha de examen, inclusive?
function hasScheduledBeforeExam(s){
  if(!s.examDate) return true;
  const from = today(), to = s.examDate;
  if(from>to) return true;
  if((s.clasesPuntuales||[]).some(p=>p.date>=from && p.date<=to)) return true;
  if((s.horarios||[]).length===0) return false;
  const days = new Set((s.horarios||[]).map(h=>h.day));
  for(let d=from; d<=to; d=addDays(d,1)) if(days.has(weekdayIdx(d))) return true;
  return false;
}
// eventos de una semana (weekStart = lunes) para todos los alumnos activos: horarios
// habituales expandidos a esa semana + clases puntuales que caen en ella.
function agendaWeekEvents(weekStart){
  const weekEnd = addDays(weekStart,6);
  const events = [];
  alive().filter(s=>s.status==="activo").forEach(s=>{
    (s.horarios||[]).forEach(h=>events.push({
      studentId:s.id, studentName:s.name, subject:s.subject,
      date:addDays(weekStart,h.day), time:h.time, duration:Number(h.duration)||60,
      kind:"horario", sourceId:h.id }));
    (s.clasesPuntuales||[]).forEach(p=>{
      if(p.date>=weekStart && p.date<=weekEnd) events.push({
        studentId:s.id, studentName:s.name, subject:s.subject,
        date:p.date, time:p.time, duration:Number(p.duration)||60,
        kind:"puntual", sourceId:p.id });
    });
  });
  return events;
}
// marca overlap:true en cada evento que se superpone en horario con otro el mismo día
// (distinto alumno u horario doble cargado sin querer).
function markOverlaps(events){
  const toMin = t => { const [h,m]=t.split(":").map(Number); return h*60+(m||0); };
  events.forEach(e=>{ e.startMin=toMin(e.time); e.endMin=e.startMin+e.duration; e.overlap=false; });
  for(let i=0;i<events.length;i++) for(let j=i+1;j<events.length;j++){
    const a=events[i], b=events[j];
    if(a.date===b.date && a.startMin<b.endMin && b.startMin<a.endMin){ a.overlap=true; b.overlap=true; }
  }
  return events;
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
