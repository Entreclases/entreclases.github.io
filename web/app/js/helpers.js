"use strict";
/* ============ helpers genéricos: texto, fechas, ids ============ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const today = () => new Date().toISOString().slice(0,10);
const esc = (s) => String(s??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function daysTo(ds){ if(!ds) return null;
  const d=new Date(ds+"T12:00:00"), n=new Date(); n.setHours(12,0,0,0);
  return Math.round((d-n)/86400000); }
function daysSince(ds){ const d=daysTo(ds); return d===null ? null : -d; }
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
// como fmtMoney pero con el signo antes del "$" (fmtMoney(-500) da "$-500"; esto da "-$500") —
// para ganancias que pueden dar negativas (rentabilidad).
function fmtMoneySigned(n){ return (n||0)<0 ? "-"+fmtMoney(-n) : fmtMoney(n); }
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
              listDeuda:"todas", listSort:"examen",
              simTimer:null, simTimerLastMin:90, simPrefillNote:"",
              statsSubjectId:null,
              showNew:false, newStudentError:"", confirmDel:false, catConfirmDelId:null, trashPurgeConfirmKey:null, fichaError:"", saveErr:false,
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
              informePeriod:"3m",
              agendaWeekOffset:0, sessionPrefillDate:"",
              agendaViewMode:"semana", agendaMonthOffset:0, agendaSelectedDay:null, agendaQuickAddOpen:false,
              puntualCancelAskId:null, cobrosBannerOpen:false,
              portal:null, portalLoaded:false, portalError:"",
              portalSaving:false, portalSaveMsg:"", portalCopyMsg:"",
              toasts:[],
              fabOpen:false, fabPick:null,
              searchOpen:false, searchQuery:"", searchSel:0,
              helpOpen:null, faqOpenIdx:null };

const subjById = (id) => state.catalog.subjects.find(m=>m.id===id) || null;
// Color por materia (paso 73): key estable de SUBJECT_COLOR_KEYS. Si la materia ya tiene
// m.color usa esa; si no (catálogos viejos, o llamado con sólo el id) cae en un hash simple
// del id para que la asignación sea siempre la misma sin tener que migrar nada a mano —
// mismo patrón que cancelPolicyFor()/recordatoriosFor() en config.js.
function subjectColorKey(subjectOrId){
  const m = (subjectOrId && typeof subjectOrId==="object") ? subjectOrId : subjById(subjectOrId);
  if(m && m.color && SUBJECT_COLOR_KEYS.includes(m.color)) return m.color;
  const id = (m ? m.id : subjectOrId) || "";
  let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))|0;
  return SUBJECT_COLOR_KEYS[Math.abs(h)%SUBJECT_COLOR_KEYS.length];
}
// Color por defecto para una materia nueva: el key menos usado entre las materias existentes
// (empatando, el primero de la paleta) — así materias creadas seguidas no repiten color.
function nextSubjectColor(){
  const counts = Object.fromEntries(SUBJECT_COLOR_KEYS.map(k=>[k,0]));
  state.catalog.subjects.forEach(m=>{ const k=subjectColorKey(m); counts[k]=(counts[k]||0)+1; });
  return SUBJECT_COLOR_KEYS.reduce((best,k)=>counts[k]<counts[best]?k:best, SUBJECT_COLOR_KEYS[0]);
}
function subjectDot(subjectOrId){
  const k = subjectColorKey(subjectOrId);
  return `<span class="subj-dot" style="background:var(--subj-${k}-fg)"></span>`;
}
function unitsFor(s){ const m=subjById(s.subjectId); return m ? m.units : Object.keys(s.topics||{}); }
function careerOptions(cur){ const l=[...state.catalog.careers]; if(cur && !l.includes(cur)) l.push(cur); return l; }
function touchCatalog(){ state.catalog.updatedAt=Date.now(); save(); render(); }
// Feedback breve y no intrusivo tras una acción (ver .toast-wrap en styles.css) — se apila en
// state.toasts y se autodescarta solo pasado TOAST_MS (TOAST_UNDO_MS si tiene botón "Deshacer",
// para dar más tiempo a reaccionar), sin bloquear ni pedir click. Patrón único de borrado (paso
// 76): toda acción que borra algo llama a toast() con un tercer argumento "undo" — una función
// sin argumentos que revierte el borrado — y el toast muestra el botón; ver data-a="toast-undo".
const TOAST_MS = 2600, TOAST_UNDO_MS = 6000;
function toast(text, tone, undo){
  const id = uid();
  state.toasts = [...state.toasts, {id, text, tone: tone||"ok", undo: undo||null}];
  render();
  setTimeout(()=>{
    state.toasts = state.toasts.filter(t=>t.id!==id);
    render();
  }, undo ? TOAST_UNDO_MS : TOAST_MS);
}
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
  if(!Array.isArray(state.catalog.trash)) state.catalog.trash=[];
  // papelera (paso 76): alumnos y materias borrados quedan restaurables 7 días y se purgan solos
  // pasado ese plazo — students usa el mismo flag "deleted" que antes (ahora con ventana de 7
  // días en vez de 90), catalog.trash guarda materias enteras sacadas de catalog.subjects.
  state.students = state.students.filter(s => !(s.deleted && (Date.now()-(s.deletedAt||s.updatedAt||0)) > TRASH_DAYS*86400000));
  state.catalog.trash = state.catalog.trash.filter(t => (Date.now()-(t.deletedAt||0)) <= TRASH_DAYS*86400000);
}
const TRASH_DAYS = 7;
// días restantes antes de que la papelera purgue algo sola, a partir de un ts en ms (deletedAt)
function trashDaysLeft(deletedAt){ return Math.max(0, TRASH_DAYS - Math.floor((Date.now()-(deletedAt||0))/86400000)); }
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
    horarios:[], clasesPuntuales:[],
    seniaActiva:false, seniaTipo:"monto", seniaValor:"",
    contratoResponsable:"", contratoDni:"", contratoFechaInicio:"", contratoClausulas:"" };
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

/* ============ objetivo de clase: cierre, racha y estadísticas ============
   s.sessions[].objetivo (string, opcional) se carga al registrar la clase; s.sessions[].objetivoResult
   ({estado:"si"|"medias"|"no", pct}) se completa después, desde la mini-tarjeta de cierre que aparece
   al registrar la clase siguiente o al entrar a la ficha (ver vGoalClosure en views.js). Se identifica
   el objetivo pendiente más antiguo sin resolver para no acumular varias tarjetas a la vez. */
function pendingGoalClosure(s){
  const withGoal=(s.sessions||[]).filter(c=>c.objetivo && !c.objetivoResult);
  if(withGoal.length===0) return null;
  return [...withGoal].sort((a,b)=>a.date.localeCompare(b.date))[0];
}
// racha de objetivos cumplidos ("si") seguidos, contando desde el más reciente evaluado hacia atrás;
// "medias" y "no" cortan la racha.
function goalStreak(s){
  const resolved=(s.sessions||[]).filter(c=>c.objetivo && c.objetivoResult)
    .sort((a,b)=>b.date.localeCompare(a.date));
  let n=0;
  for(const c of resolved){ if(c.objetivoResult.estado==="si") n++; else break; }
  return n;
}
function goalCounts(students){
  let si=0, medias=0, no=0;
  students.forEach(s=>(s.sessions||[]).forEach(c=>{
    if(!c.objetivo || !c.objetivoResult) return;
    if(c.objetivoResult.estado==="si") si++;
    else if(c.objetivoResult.estado==="medias") medias++;
    else if(c.objetivoResult.estado==="no") no++;
  }));
  return { si, medias, no, total: si+medias+no };
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
function monthLabelShort(mk){
  const d=new Date(mk+"-01T12:00:00");
  const l=d.toLocaleDateString("es-AR",{month:"short"}).replace(/\.$/,"");
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

/* ============ recordatorios de cobro: clases sin cobrar + mensualidades vencidas + señas
   pendientes, todo junto, para el aviso diario del tablero (ver events.js: maybeNotifyCobros) ============ */
function recordatoriosFor(){ return state.catalog.recordatorios || defaultRecordatorios(); }
function costosFor(){ return state.catalog.costos || defaultCostos(); }
function docenteFor(){ return state.catalog.docente || defaultDocente(); }
// Qué de este alumno se comparte en su portal individual (ver s.portalShare, ficha → "Portal
// para este alumno"). Por diseño sólo puede llevar estos tres booleanos — nunca notas, pagos,
// señas ni comentarios privados (ver buildAlumnoBlock() en sync.js, que es lo único que lee esto
// para armar el JSON público).
function portalShareFor(s){ return s.portalShare || {proximaClase:false, tareas:false, avance:false}; }
// Próxima clase de un alumno puntual (no importa el estado del alumno, a diferencia de
// agendaRangeEvents que sólo mira activos): la más próxima entre sus clases puntuales futuras
// no canceladas y la próxima ocurrencia de cada horario habitual dentro de los próximos 7 días.
function nextClaseForStudent(s){
  const from=today();
  let best=null;
  (s.clasesPuntuales||[]).forEach(p=>{
    if(p.cancelada || p.date<from) return;
    const key=p.date+" "+p.time;
    if(!best || key<best.key) best={key, date:p.date, time:p.time, duration:Number(p.duration)||60};
  });
  (s.horarios||[]).forEach(hr=>{
    for(let i=0;i<7;i++){
      const d=addDays(from,i);
      if(weekdayIdx(d)===hr.day){
        const key=d+" "+hr.time;
        if(!best || key<best.key) best={key, date:d, time:hr.time, duration:Number(hr.duration)||60};
        break;
      }
    }
  });
  return best;
}
// "m:<id>" / "s:<id>" (valor del <select> de alcance en Rentabilidad) → {subjectId,studentId}
// (nunca ambos con valor); "" o cualquier otra cosa → costo general, sin alcance.
function parseScopeValue(v){
  if(v && v.startsWith("m:")) return {subjectId:v.slice(2), studentId:""};
  if(v && v.startsWith("s:")) return {subjectId:"", studentId:v.slice(2)};
  return {subjectId:"", studentId:""};
}
// todo lo pendiente de un alumno (mes actual + señas), sin filtrar por días de atraso — lo usa
// el mensaje de WhatsApp de recordatorio de pago, que tiene sentido mandar apenas hay algo
// pendiente y no recién cuando ya se hizo tarde.
function pendienteTotalFor(s){
  let total=0;
  if(hasPagos(s)){ const r=pagoResumen(s,currentMonthKey()); if(r) total+=r.pendiente; }
  (s.clasesPuntuales||[]).forEach(p=>{ if(!p.cancelada && p.seniaEstado==="pendiente") total+=Number(p.seniaMonto)||0; });
  return total;
}
// items atrasados (clase sin cobrar / mensualidad vencida / seña pendiente) de todos los alumnos
// activos, con al menos diasAtraso días de atraso cada uno — para el aviso del tablero.
function cobrosAtrasadosSummary(diasAtraso){
  const dias = diasAtraso==null ? 1 : diasAtraso;
  const items = [];
  const mk = currentMonthKey();
  alive().filter(s=>s.status==="activo").forEach(s=>{
    if(hasPagos(s) && s.modalidad==="clase"){
      (s.sessions||[]).forEach(c=>{
        if(!c.cobrada && daysSince(c.date)>=dias)
          items.push({studentId:s.id, kind:"clase", monto:Number(s.tarifa)||0, date:c.date, sessionId:c.id});
      });
    }
    if(hasPagos(s) && s.modalidad==="mensual" && daysSince(mk+"-01")>=dias){
      const r=pagoResumen(s,mk);
      if(r && r.pendiente>0) items.push({studentId:s.id, kind:"mensual", monto:r.pendiente, date:mk+"-01"});
    }
    (s.clasesPuntuales||[]).forEach(p=>{
      if(!p.cancelada && p.seniaEstado==="pendiente" && daysSince(p.date)>=dias)
        items.push({studentId:s.id, kind:"senia", monto:Number(p.seniaMonto)||0, date:p.date, puntualId:p.id});
    });
  });
  const total = items.reduce((a,i)=>a+i.monto,0);
  const byStudent = {};
  items.forEach(i=>{ (byStudent[i.studentId]=byStudent[i.studentId]||[]).push(i); });
  Object.values(byStudent).forEach(list=>list.sort((a,b)=>a.date.localeCompare(b.date)));
  return {items, total, count:items.length, byStudent};
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
// eventos de un rango de fechas (inclusive) para todos los alumnos activos: horarios
// habituales expandidos día a día dentro del rango + clases puntuales no canceladas que
// caen en él. Generaliza lo que antes hacía agendaWeekEvents (semana = rango de 7 días) para
// que la vista mensual pueda pedir el mismo tipo de evento sobre varias semanas de una.
function agendaRangeEvents(fromDate, toDate){
  const events = [];
  alive().filter(s=>s.status==="activo").forEach(s=>{
    if((s.horarios||[]).length){
      for(let d=fromDate; d<=toDate; d=addDays(d,1)){
        const dow=weekdayIdx(d);
        (s.horarios||[]).filter(h=>h.day===dow).forEach(h=>{
          events.push({studentId:s.id, studentName:s.name, subject:s.subject, subjectId:s.subjectId,
            date:d, time:h.time, duration:Number(h.duration)||60, kind:"horario", sourceId:h.id});
        });
      }
    }
    (s.clasesPuntuales||[]).forEach(p=>{
      if(p.cancelada) return;
      if(p.date>=fromDate && p.date<=toDate) events.push({
        studentId:s.id, studentName:s.name, subject:s.subject, subjectId:s.subjectId,
        date:p.date, time:p.time, duration:Number(p.duration)||60,
        kind:"puntual", sourceId:p.id, seniaEstado:p.seniaEstado });
    });
  });
  return events;
}
function agendaWeekEvents(weekStart){ return agendaRangeEvents(weekStart, addDays(weekStart,6)); }
// grilla de un mes (YYYY-MM) en semanas completas de lunes a domingo, con los días de los
// meses vecinos que completan la primera y última semana (se muestran atenuados en la UI).
function monthKeyOffset(n){ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+n); return d.toISOString().slice(0,7); }
function lastDayOfMonth(mk){ const d=new Date(mk+"-01T12:00:00"); d.setMonth(d.getMonth()+1); d.setDate(0); return d.toISOString().slice(0,10); }
function monthGridDays(mk){
  const start = mondayOfWeek(mk+"-01");
  const end = addDays(mondayOfWeek(lastDayOfMonth(mk)),6);
  const days=[]; for(let d=start; d<=end; d=addDays(d,1)) days.push(d);
  return days;
}

/* ============ señas y política de cancelación (dentro de clasesPuntuales, opcional por alumno) ============
   Seña: opt-in por alumno (s.seniaActiva). Cada clase puntual creada mientras está activa guarda
   una foto del monto (s.seniaValor/tarifa al momento de crearla, ver seniaMontoFor) y arranca en
   "pendiente". Sólo pendiente↔cobrada se alternan a mano (toggle-senia-estado); retenida/devuelta
   las pone applyCancelacion() al cancelar la clase, según la política y la anticipación. */
function hasSenia(s){ return !!s.seniaActiva; }
function seniaMontoFor(s){
  if(s.seniaTipo==="porcentaje") return (Number(s.tarifa)||0) * (Number(s.seniaValor)||0) / 100;
  return Number(s.seniaValor)||0;
}
function cancelPolicyFor(){ return state.catalog.cancelPolicy || defaultCancelPolicy(); }
// horas entre ahora y el momento exacto de la clase (puede dar negativo si ya pasó — eso
// hace que la anticipación quede por debajo del mínimo y la seña se retenga, sin caso especial).
function hoursUntilClase(p){ return (new Date(p.date+"T"+(p.time||"00:00")+":00") - new Date())/3600000; }
// clase puntual anterior (no cancelada) con seña todavía pendiente — para el aviso de "no le
// cobraste la seña de la clase del [fecha]" al programar una nueva.
function previousPendingSenia(s, beforeDate){
  return (s.clasesPuntuales||[])
    .filter(x=>!x.cancelada && x.seniaEstado==="pendiente" && x.date<beforeDate)
    .sort((a,b)=>b.date.localeCompare(a.date))[0] || null;
}
// próxima clase puntual (no cancelada) con seña pendiente, estrictamente después de afterDate —
// la usa applyCancelacion() para "acreditar a la próxima" cuando la política lo pide.
function nextPendingPuntual(s, afterDate){
  return (s.clasesPuntuales||[])
    .filter(x=>!x.cancelada && x.seniaEstado==="pendiente" && x.date>afterDate)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time))[0] || null;
}
// crea una clase puntual para studentId (usado tanto desde la ficha como desde "Programar clase
// acá" en la agenda mensual) — snapshotea la seña si el alumno la tiene activa y devuelve un
// aviso (o null) si la clase anterior de ese alumno todavía tiene la seña sin cobrar.
function addPuntualClase(studentId, date, time, duration){
  const s = state.students.find(x=>x.id===studentId); if(!s) return {warning:null};
  const nueva = {id:uid(), date, time, duration};
  let warning = null;
  if(hasSenia(s)){
    nueva.seniaEstado="pendiente"; nueva.seniaMonto=seniaMontoFor(s);
    const prev = previousPendingSenia(s, date);
    if(prev) warning = `No le cobraste la seña de la clase del ${fmtDate(prev.date)}.`;
  }
  update(studentId, {clasesPuntuales:[...(s.clasesPuntuales||[]), nueva]});
  return {warning};
}
// cancela una clase puntual y aplica la política de cancelación según la anticipación —
// sólo tiene efecto sobre la seña si ya estaba cobrada (si seguía pendiente, no hay nada
// que retener ni devolver). "Se acredita a la próxima" busca la siguiente clase puntual con
// seña pendiente de ese alumno y la marca cobrada directo, sin volver a pedirla.
function applyCancelacion(studentId, puntualId){
  const s = state.students.find(x=>x.id===studentId); if(!s) return null;
  const p = (s.clasesPuntuales||[]).find(x=>x.id===puntualId); if(!p || p.cancelada) return null;
  const horas = hoursUntilClase(p);
  const pol = cancelPolicyFor();
  let nuevoEstado = p.seniaEstado, creditId = null;
  if(p.seniaEstado==="cobrada"){
    if(horas < pol.horasMinimas){
      nuevoEstado = "retenida";
    }else{
      nuevoEstado = "devuelta";
      if(pol.siATiempo==="acredita"){
        const next = nextPendingPuntual(s, p.date);
        if(next) creditId = next.id;
      }
    }
  }
  const clasesPuntuales = (s.clasesPuntuales||[]).map(x=>{
    if(x.id===puntualId) return {...x, cancelada:true, canceladaAt:Date.now(), canceladaAnticipacionHoras:Math.round(horas), seniaEstado:nuevoEstado};
    if(creditId && x.id===creditId) return {...x, seniaEstado:"cobrada", seniaCreditadaDe:puntualId};
    return x;
  });
  update(studentId, {clasesPuntuales});
  return {horas, nuevoEstado, credited:!!creditId};
}
// señas cobradas de este mes en cualquier alumno, sin cruzarse con clases/mensualidades
// (ver hasPagos/pagoResumen más arriba) — rubro propio en la vista "Pagos".
function pagosSeniaResumen(mk){
  const rows=[]; let cobrado=0, retenida=0;
  alive().forEach(s=>{
    (s.clasesPuntuales||[]).forEach(p=>{
      if(monthKeyOf(p.date)!==mk) return;
      if(p.seniaEstado==="cobrada"){ cobrado+=Number(p.seniaMonto)||0; rows.push({s,p}); }
      else if(p.seniaEstado==="retenida"){ retenida+=Number(p.seniaMonto)||0; rows.push({s,p}); }
    });
  });
  rows.sort((a,b)=>a.p.date.localeCompare(b.p.date));
  return {cobrado, retenida, rows};
}

/* ============ rentabilidad real: ingresos cobrados menos costos, por hora realmente dictada ============
   "Clases dictadas" = s.sessions de todos los alumnos vivos (no sólo los que tienen tarifa cargada:
   un costo variable como viáticos se paga igual aunque esa clase no se cobre). Cada sesión puede
   traer duration en minutos (cargado al registrar la clase); si falta, se asume 60' y se cuenta en
   sinDuracion para que la UI lo aclare. Costos fijos: se descuentan completos cada mes que existan,
   sin prorratear por cantidad de clases. Costos variables: monto × cantidad de clases dictadas dentro
   de su alcance ese mes. Sin alcance (subjectId y studentId vacíos) = costo general: entra en el total
   del mes pero no se reparte en los desgloses por materia/alumno (ver rentabilidadPorMateria/Alumno). */
function classesInMonth(mk){
  const out=[];
  alive().forEach(s=>(s.sessions||[]).forEach(c=>{ if(monthKeyOf(c.date)===mk) out.push({s,c}); }));
  return out;
}
function classDurationHours(c){ return (Number(c.duration)||60)/60; }
function costoAppliesTo(costo, s){
  if(costo.subjectId) return s.subjectId===costo.subjectId;
  if(costo.studentId) return s.id===costo.studentId;
  return true;
}
function rentabilidadMes(mk){
  const costos = costosFor();
  const clases = classesInMonth(mk);

  let ingresos = 0;
  alive().forEach(s=>{ if(hasPagos(s)){ const r=pagoResumen(s,mk); if(r) ingresos+=r.cobrado; } });
  ingresos += pagosSeniaResumen(mk).retenida;

  const costoFijoTotal = costos.fijos.reduce((a,c)=>a+(Number(c.monto)||0),0);
  let costoVarTotal = 0;
  costos.variables.forEach(cv=>{
    const n = clases.filter(({s})=>costoAppliesTo(cv,s)).length;
    costoVarTotal += (Number(cv.monto)||0)*n;
  });
  const costosTotal = costoFijoTotal+costoVarTotal;
  const ganancia = ingresos-costosTotal;

  let horas=0, sinDuracion=0;
  clases.forEach(({c})=>{ if(c.duration==null || c.duration==="") sinDuracion++; horas+=classDurationHours(c); });
  const netoPorHora = horas>0 ? ganancia/horas : null;

  return { mk, ingresos, costoFijoTotal, costoVarTotal, costosTotal, ganancia, horas, clasesCount:clases.length, sinDuracion, netoPorHora };
}
// desglose por materia: ingresos/costos/horas atribuibles a cada una — los costos generales
// (sin materia ni alumno asignado) no entran acá, sólo los que se asignaron a esa materia puntual.
function rentabilidadPorMateria(mk){
  const groups={};
  const ensure=(key,label)=>{ if(!groups[key]) groups[key]={label,ingresos:0,costos:0,horas:0,clases:0}; return groups[key]; };
  const labelFor = key => key ? (subjById(key)?subjById(key).name:"Materia") : "Sin materia";
  alive().forEach(s=>{
    const key=s.subjectId||"";
    const g=ensure(key,labelFor(key));
    if(hasPagos(s)){ const r=pagoResumen(s,mk); if(r) g.ingresos+=r.cobrado; }
    (s.clasesPuntuales||[]).forEach(p=>{ if(monthKeyOf(p.date)===mk && p.seniaEstado==="retenida") g.ingresos+=Number(p.seniaMonto)||0; });
  });
  const clases = classesInMonth(mk);
  clases.forEach(({s,c})=>{ const key=s.subjectId||""; const g=ensure(key,labelFor(key)); g.horas+=classDurationHours(c); g.clases++; });
  const costos=costosFor();
  costos.fijos.forEach(cf=>{ if(cf.subjectId && groups[cf.subjectId]) groups[cf.subjectId].costos+=Number(cf.monto)||0; });
  costos.variables.forEach(cv=>{
    if(!cv.subjectId) return;
    const n=clases.filter(({s})=>s.subjectId===cv.subjectId).length;
    if(groups[cv.subjectId]) groups[cv.subjectId].costos+=(Number(cv.monto)||0)*n;
  });
  return Object.values(groups).filter(g=>g.ingresos>0||g.clases>0||g.costos>0)
    .map(g=>({...g, neto:g.ingresos-g.costos, netoPorHora:g.horas>0?(g.ingresos-g.costos)/g.horas:null}))
    .sort((a,b)=>b.neto-a.neto);
}
// desglose por alumno — mismo criterio que por materia, pero atribuyendo también el nombre de
// materia (para distinguir alumnos con el mismo nombre en materias distintas, como en el resto de la app).
function rentabilidadPorAlumno(mk){
  const groups={};
  alive().forEach(s=>{
    groups[s.id]={label:s.name, subject:s.subject, ingresos:0, costos:0, horas:0, clases:0};
    if(hasPagos(s)){ const r=pagoResumen(s,mk); if(r) groups[s.id].ingresos+=r.cobrado; }
    (s.clasesPuntuales||[]).forEach(p=>{ if(monthKeyOf(p.date)===mk && p.seniaEstado==="retenida") groups[s.id].ingresos+=Number(p.seniaMonto)||0; });
  });
  const clases = classesInMonth(mk);
  clases.forEach(({s,c})=>{ const g=groups[s.id]; if(g){ g.horas+=classDurationHours(c); g.clases++; } });
  const costos=costosFor();
  costos.fijos.forEach(cf=>{ if(cf.studentId && groups[cf.studentId]) groups[cf.studentId].costos+=Number(cf.monto)||0; });
  costos.variables.forEach(cv=>{
    if(!cv.studentId) return;
    const n=clases.filter(({s})=>s.id===cv.studentId).length;
    if(groups[cv.studentId]) groups[cv.studentId].costos+=(Number(cv.monto)||0)*n;
  });
  return Object.values(groups).filter(g=>g.ingresos>0||g.clases>0||g.costos>0)
    .map(g=>({...g, neto:g.ingresos-g.costos, netoPorHora:g.horas>0?(g.ingresos-g.costos)/g.horas:null}))
    .sort((a,b)=>b.neto-a.neto);
}
// proyección del mes en curso al ritmo actual (regla de tres simple sobre los días ya
// transcurridos) — no aplica a meses cerrados, que ya tienen su resultado real y completo.
function rentabilidadProyeccion(mk){
  if(mk!==currentMonthKey()) return null;
  const r = rentabilidadMes(mk);
  const now = new Date();
  const diasTranscurridos = now.getDate();
  const diasEnMes = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  if(diasTranscurridos<=0) return null;
  const factor = diasEnMes/diasTranscurridos;
  return { ganancia:r.ganancia*factor, ingresos:r.ingresos*factor, costos:r.costosTotal*factor,
    horas:r.horas*factor, diasTranscurridos, diasEnMes };
}
// últimos 12 meses, del más viejo al más nuevo (para que el histórico se lea de izquierda a derecha).
function rentabilidadHistorico(){
  return recentMonthKeys(12).reverse().map(mk=>{
    const r=rentabilidadMes(mk);
    return { mk, label:monthLabelShort(mk), neto:r.ganancia, netoPorHora:r.netoPorHora };
  });
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

/* ============ búsqueda global (paso 72): alumnos, materias y materiales por nombre, todo
   local sobre state (sin backend nuevo). Devuelve grupos ya recortados y con la acción de
   navegación lista para data-a/data-id en el click delegado — ver vSearchOverlay en views.js. */
function globalSearchResults(query){
  const q = (query||"").trim().toLowerCase();
  if(!q) return {students:[], subjects:[], materiales:[], total:0};
  const students = alive().filter(s=>s.name.toLowerCase().includes(q))
    .slice(0,6).map(s=>({id:s.id, label:s.name, sub:s.subject||"Sin materia"}));
  const subjects = state.catalog.subjects.filter(m=>m.name.toLowerCase().includes(q))
    .slice(0,6).map(m=>({id:m.id, label:m.name, sub:`${(m.units||[]).length} unidades`}));
  const materiales = [];
  state.catalog.subjects.forEach(m=>{
    (m.materiales||[]).forEach(f=>{
      if(f.name.toLowerCase().includes(q)) materiales.push({id:m.id, name:f.name, label:f.name, sub:m.name});
    });
  });
  const materialesTrimmed = materiales.slice(0,6);
  return {students, subjects, materiales:materialesTrimmed,
    total: students.length+subjects.length+materialesTrimmed.length};
}
function globalSearchFlat(query){
  const res = globalSearchResults(query);
  return [...res.students.map(r=>({...r,type:"student"})),
          ...res.subjects.map(r=>({...r,type:"subject"})),
          ...res.materiales.map(r=>({...r,type:"material"}))];
}
// Navega al resultado elegido (alumno o materia/material) y cierra el overlay — compartido
// entre el click delegado (search-select) y Enter dentro del buscador (ver events.js).
function openSearchResult(item){
  if(!item) return;
  state.searchOpen=false;
  if(item.type==="student"){
    state.view="detalle"; state.selId=item.id; state.tab="resumen"; state.confirmDel=false;
    state.simTimer=null; state.simPrefillNote=""; state.fichaError=""; state.sessionPrefillDate="";
  }else{
    state.view="catalog"; state.selId=null; state.editSubjectId=item.id; state.editPackId=null;
    loadMateriales(item.id);
  }
}
