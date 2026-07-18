"use strict";
/* ============ helpers genéricos: texto, fechas, ids ============ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const today = () => new Date().toISOString().slice(0,10);
const esc = (s) => String(s??"").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

// applicationServerKey de PushManager.subscribe() quiere un Uint8Array, no el string base64url
// que da VAPID_PUBLIC_KEY (config.js) — conversión estándar (paso 108).
function urlBase64ToUint8Array(base64String){
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

// Selector estable para volver a encontrar un elemento después de un render() completo (que
// reconstruye todo el innerHTML de #app) — por id si tiene, si no por el primer atributo data-*
// que lo identifique dentro de la vista actual. Usado para no perder el foco de teclado (ver el
// listener "change" en events.js).
function focusSelectorFor(el){
  if(!el || el===document.body || el===document.documentElement) return null;
  if(el.id) return "#"+CSS.escape(el.id);
  for(const attr of ["data-f","data-cf","data-lf"]){
    const v=el.getAttribute && el.getAttribute(attr);
    if(v) return `[${attr}="${CSS.escape(v)}"]`;
  }
  return null;
}

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
// Número grande que cuenta desde 0 hasta su valor al entrar a la vista (paso 100), sin
// depender de JS para mostrar el valor correcto: el texto inicial ya es el valor final
// formateado (por si el conteo no llega a correr — reduced-motion, print, etc.), y
// animateCounters() (events.js) lo pisa temporalmente sólo si corresponde animar.
function countSpan(value, opts){
  opts = opts||{};
  const decimals = opts.decimals||0, suffix = opts.suffix||"";
  const display = decimals>0 ? Number(value).toFixed(decimals) : String(Math.round(value));
  return `<span class="cnt" data-count="${value}" data-decimals="${decimals}" data-suffix="${esc(suffix)}">${esc(display)}${esc(suffix)}</span>`;
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
              listDeuda:"todas", listSort:"examen", listTag:"todas",
              simTimer:null, simTimerLastMin:90, simPrefillNote:"",
              statsSubjectId:null, statsMode:"normal", compareA:null, compareB:null,
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
              swUpdateReady:false, swRegistration:null, swCheckStatus:"idle",
              pagosMonth:null,
              informePeriod:"3m", informeImgBusy:false,
              agendaWeekOffset:0, sessionPrefillDate:"",
              agendaViewMode:"semana", agendaMonthOffset:0, agendaSelectedDay:null, agendaQuickAddOpen:false,
              puntualCancelAskId:null, cobrosBannerOpen:false,
              portal:null, portalLoaded:false, portalError:"",
              portalSaving:false, portalSaveMsg:"", portalCopyMsg:"",
              portalGrupoBusy:null, portalGrupoError:"", portalGrupoCopyMsg:"",
              portalGrupoEditing:null, portalGrupoDraftAlumnos:[],
              avisoSaving:false, avisoError:"",
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
// Etiquetas libres por alumno (paso 103): catalog.tags es la lista global {id,label,color} —
// mismo patrón que subjects, así se autocompleta ("Verano" ya existente no se duplica al
// escribir "verano") y se filtra/busca por igual sin importar qué alumno la use. El color sale
// de la misma paleta accesible de SUBJECT_COLOR_KEYS (paso 73), repartido con el mismo criterio
// de "el menos usado primero" que nextSubjectColor().
function tagById(id){ return (state.catalog.tags||[]).find(t=>t.id===id) || null; }
function findTagByLabel(label){
  const n = String(label||"").trim().toLowerCase(); if(!n) return null;
  return (state.catalog.tags||[]).find(t=>t.label.toLowerCase()===n) || null;
}
function nextTagColor(){
  const counts = Object.fromEntries(SUBJECT_COLOR_KEYS.map(k=>[k,0]));
  (state.catalog.tags||[]).forEach(t=>{ if(SUBJECT_COLOR_KEYS.includes(t.color)) counts[t.color]++; });
  return SUBJECT_COLOR_KEYS.reduce((best,k)=>counts[k]<counts[best]?k:best, SUBJECT_COLOR_KEYS[0]);
}
// Devuelve la etiqueta existente (comparando sin importar mayúsculas) o crea una nueva en
// catalog.tags — no guarda ni renderiza sola, eso lo hace el caller (ver "tag-add" en events.js)
// junto con el patch al alumno, en un solo save().
function getOrCreateTag(label){
  const clean = String(label||"").trim(); if(!clean) return null;
  const existing = findTagByLabel(clean); if(existing) return existing;
  if(!Array.isArray(state.catalog.tags)) state.catalog.tags=[];
  const tag = {id:uid(), label:clean, color:nextTagColor()};
  state.catalog.tags.push(tag);
  return tag;
}
function studentTags(s){ return (s.tagIds||[]).map(tagById).filter(Boolean); }
// removableFor: id del alumno si el chip debe poder quitarse (ficha); omitido en la lista de
// alumnos, donde las etiquetas son sólo informativas.
function tagChip(tag, removableFor){
  const remove = removableFor
    ? `<button class="del" data-a="tag-remove" data-id="${esc(removableFor)}" data-tag="${esc(tag.id)}"
        title="Quitar etiqueta «${esc(tag.label)}»" aria-label="Quitar etiqueta «${esc(tag.label)}»"
        style="color:inherit;font-size:12px;margin-left:2px">×</button>`
    : "";
  return `<span class="subj-chip" style="background:var(--subj-${tag.color}-bg);color:var(--subj-${tag.color}-fg)">${esc(tag.label)}${remove}</span>`;
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
// action: {label, run} — botón alternativo al de "Deshacer", para ofrecer un paso siguiente
// opcional (ver recibo de pago, paso 81) en vez de revertir algo; nunca se usan los dos juntos.
function toast(text, tone, undo, action){
  const id = uid();
  state.toasts = [...state.toasts, {id, text, tone: tone||"ok", undo: undo||null, action: action||null}];
  render();
  setTimeout(()=>{
    state.toasts = state.toasts.filter(t=>t.id!==id);
    render();
  }, (undo||action) ? TOAST_UNDO_MS : TOAST_MS);
}
// packs: agrupan materias existentes para dar de alta un alumno en todas de una (ver events.js
// "create"). Catálogos guardados antes de este campo no tienen packs — se completa acá.
function packsContaining(subjectId){ return (state.catalog.packs||[]).filter(p=>p.subjectIds.includes(subjectId)); }

const alive = () => state.students.filter(s => !s.deleted);

function load(){
  if(IS_DEMO){
    const d=buildDemoData();
    state.students=d.students; state.catalog=d.catalog;
    state.portal=d.portal; state.portalLoaded=true; state.portalError="";
    return;
  }
  try{
    const raw = localStorage.getItem(KEY);
    if(raw){ const p = JSON.parse(raw);
      if(Array.isArray(p.students)) state.students = p.students;
      if(p.catalog && Array.isArray(p.catalog.careers) && Array.isArray(p.catalog.subjects))
        state.catalog = p.catalog; }
  }catch(e){}
  if(!Array.isArray(state.catalog.packs)) state.catalog.packs=[];
  if(!Array.isArray(state.catalog.trash)) state.catalog.trash=[];
  if(!Array.isArray(state.catalog.tags)) state.catalog.tags=[];
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
  if(IS_DEMO) return; // en modo demo nada se persiste — ni localStorage ni sync (ver IS_DEMO en config.js)
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
/* ============ ajuste de tarifas en lote (paso 112) ============
   Aumento % o monto fijo a varias tarifas de una — ver vAjustarTarifas() en views.js para la
   vista previa y quién queda incluido/excluido. Sólo toca s.tarifa hacia adelante: recibos ya
   emitidos guardan su monto propio (crearRecibo) y no se recalculan, así que una clase ya
   registrada y cobrada no cambia de precio con este ajuste. */
function tarifaAjusteRedondeada(n, step){ return step ? Math.round(n/step)*step : Math.round(n); }
function tarifaAjusteNueva(actual, modo, valor, step){
  const v = Number(valor)||0;
  const nueva = modo==="monto" ? actual+v : actual*(1+v/100);
  return Math.max(0, tarifaAjusteRedondeada(nueva, step));
}
// Un solo save()/render() para todos los cambios (a diferencia de update(), pensado para un
// alumno a la vez) — evita N renders innecesarios al aplicar el aumento a varios de golpe.
function applyTarifaAjuste(cambios){
  const byId = new Map(cambios.map(c=>[c.id,c]));
  state.students = state.students.map(s=>{
    const c = byId.get(s.id); if(!c) return s;
    return {...s, tarifa:c.nueva, tarifaHistorial:[...(s.tarifaHistorial||[]), {fecha:today(), de:c.actual, a:c.nueva}], updatedAt:Date.now()};
  });
  save(); render();
}
function emptyStudent(){
  return { id:uid(), name:"", career:(state.catalog.careers[0]||"Ingeniería"), subject:"", subjectId:"",
    chair:"", status:"activo", semaforo:"sd", examDate:"", startDate:today(), notes:"",
    updatedAt:Date.now(), topics:{}, sessions:[], simulacros:[],
    tarifa:"", modalidad:"", pagos:[], recibos:[], informeComment:"", phone:"", examResults:[],
    horarios:[], clasesPuntuales:[],
    seniaActiva:false, seniaTipo:"monto", seniaValor:"",
    contratoResponsable:"", contratoDni:"", contratoFechaInicio:"", contratoClausulas:"",
    tagIds:[] };
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
  const dadas = s.sessions.filter(c=>!isAusente(c));
  const last2=[...dadas].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,2);
  if(last2.length===2 && last2.every(x=>x.tarea==="no"))
    out.push({text:"Dos clases seguidas sin tarea hecha — momento de la charla", wa:"tarea"});
  const lastDate = dadas.length ? [...dadas].sort((a,b)=>b.date.localeCompare(a.date))[0].date : s.startDate;
  const gap = lastDate ? -daysTo(lastDate) : null;
  if(gap!==null && gap>=10) out.push({text:`Sin clases hace ${gap} días — ¿sigue o pasarlo a pausado?`, wa:"clase"});
  const ausenciasMes = asistenciaStats(s, currentMonthKey()+"-01", today()).ausencias;
  if(ausenciasMes>=3) out.push({text:`${ausenciasMes} ausencias este mes`, wa:"clase"});
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
// Escala con la que se cierra el objetivo de clase (paso 91, configurable en Cuenta): "simple"
// (Sí/A medias/No, default) o "porcentaje" (un solo número 0-100). Cualquiera sea la elegida al
// momento de cerrar, el resultado se guarda siempre igual — {estado, pct} — así que todo lo que
// ya lee objetivoResult (streak, stats, informes, portal) funciona igual con datos históricos de
// ambos formatos, sin migrar nada.
function escalaObjetivoFor(){ return state.catalog.escalaObjetivo || "simple"; }
// Deriva un estado categórico (si/medias/no) desde el % continuo de la escala "Porcentaje", con
// los mismos umbrales que separarían a un valor de cuál de los tres anclas de la escala Simple
// (0/50/100) tiene más cerca: <25 no, 25-74 medias, >=75 sí.
function estadoFromPct(pct){
  if(pct>=75) return "si";
  if(pct>=25) return "medias";
  return "no";
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
// Igual que goalCounts() pero acotado a los objetivos cerrados en clases de un mes puntual —
// para "Comparar períodos" en Estadísticas (paso 104).
function goalCountsInMonth(mk){
  let si=0, medias=0, no=0;
  alive().forEach(s=>(s.sessions||[]).forEach(c=>{
    if(!c.objetivo || !c.objetivoResult || monthKeyOf(c.date)!==mk) return;
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
/* ============ ausencias (paso 113): sessions[].ausente = {motivo, cobra} ============
   Una ausencia queda en el mismo s.sessions que una clase dada (misma fecha, mismo flujo de
   "Registrar clase") pero no cuenta como clase dictada — se excluye de pagoResumen() y
   classesInMonth() más abajo para no inflar cobros ni horas dictadas con clases que no pasaron. */
/* ============ cumpleaños (paso 115) ============ */
// Compara sólo mes-día (los últimos 5 caracteres de YYYY-MM-DD) — el año de nacimiento no
// importa acá, sólo si la fecha "cae" hoy o mañana.
function isBirthday(s, dateStr){ return !!(s.birthDate && s.birthDate.slice(5)===dateStr.slice(5)); }
function cumpleaneros(dateStr){ return alive().filter(s=>s.status==="activo" && isBirthday(s,dateStr)); }
function isAusente(c){ return !!(c && c.ausente); }
function ausenciaCobraSugerida(motivo){ return motivo!=="aviso_tiempo"; }
// Asistencia de un alumno en un rango de fechas inclusive — para la ficha y Estadísticas.
function asistenciaStats(s, from, to){
  const sesiones=(s.sessions||[]).filter(c=>c.date>=from && c.date<=to);
  const ausencias=sesiones.filter(isAusente).length;
  const dadas=sesiones.length-ausencias;
  return { dadas, ausencias, total:sesiones.length, pct: sesiones.length? Math.round(dadas/sesiones.length*100) : null };
}
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
  const clasesMes=(s.sessions||[]).filter(c=>monthKeyOf(c.date)===mk && !isAusente(c));
  if(s.modalidad==="clase"){
    const cobradas=clasesMes.filter(c=>c.cobrada).length;
    const pendientes=clasesMes.length-cobradas;
    return { clases:clasesMes.length, total:tarifa*clasesMes.length, cobrado:tarifa*cobradas, pendiente:tarifa*pendientes };
  }
  const cobrado=Math.min(tarifa, (s.pagos||[]).filter(p=>monthKeyOf(p.date)===mk).reduce((a,p)=>a+(Number(p.amount)||0),0));
  return { clases:clasesMes.length, total:tarifa, cobrado, pendiente:Math.max(0, tarifa-cobrado) };
}

/* ============ recibos de pago: numeración simple por año (2026-001, 2026-002…), guardada en
   catalog.reciboSeq — un contador por año, sin migrar nada para catálogos viejos que no lo
   tienen todavía. Cada recibo emitido queda además en s.recibos (paso 81), para poder volver a
   verlo/reimprimirlo desde la ficha sin depender de que WhatsApp lo conserve. ============ */
function nextReciboNumero(){
  const year = today().slice(0,4);
  const seq = {...(state.catalog.reciboSeq||{})};
  seq[year] = (seq[year]||0)+1;
  state.catalog.reciboSeq = seq;
  state.catalog.updatedAt = Date.now();
  return `${year}-${String(seq[year]).padStart(3,"0")}`;
}
// tipo: "clase" | "mensual" | "senia". saldo = lo que le queda pendiente a este alumno después
// de este cobro (mensualidades) — en "clase"/"senia" no aplica arrastre de saldo, así que 0.
function crearRecibo(s, {tipo, concepto, monto, date, saldo}){
  return { id: uid(), numero: nextReciboNumero(), date: date||today(), tipo, concepto,
    monto: Number(monto)||0, saldo: Number(saldo)||0 };
}
function reciboFor(s, id){ return (s.recibos||[]).find(r=>r.id===id); }
function reciboTipoLabel(tipo){
  if(tipo==="mensual") return "Mensualidad";
  if(tipo==="senia") return "Seña";
  return "Clase";
}
function buildReciboText(s, r){
  const doc = docenteFor();
  return fillTemplateLines(mensajesFor().recibo, {
    numero:r.numero, fecha:fmtDate(r.date), concepto:r.concepto, monto:fmtMoney(r.monto),
    saldo: r.saldo>0 ? `Saldo restante: ${fmtMoney(r.saldo)}` : "",
    alumno:s.name,
    docente: doc.nombre ? `Docente: ${doc.nombre}` : "",
  });
}

/* ============ export contable (paso 83): CSV local (Blob + download, sin backend) de los
   movimientos de un rango de meses — una fila por clase cobrada/pendiente, pago mensual
   registrado o seña, más un resumen por mes al final. BOM UTF-8 + separador ";" para que Excel
   en español lo abra bien de entrada (ver buildPagosCsv() más abajo). ============ */
function monthKeysEndingAt(mk, n){
  const out=[]; const d=new Date(mk+"-01T12:00:00");
  for(let i=0;i<n;i++){ out.push(d.toISOString().slice(0,7)); d.setMonth(d.getMonth()-1); }
  return out.reverse();
}
function pagosCsvRows(monthKeys){
  const mkSet = new Set(monthKeys);
  const rows = [];
  alive().forEach(s=>{
    if(hasPagos(s) && s.modalidad==="clase"){
      (s.sessions||[]).forEach(c=>{
        if(isAusente(c) || !mkSet.has(monthKeyOf(c.date))) return;
        rows.push({date:c.date, alumno:s.name, materia:s.subject||"", concepto:"Clase",
          monto:Number(s.tarifa)||0, estado:c.cobrada?"Cobrada":"Pendiente"});
      });
    }
    if(hasPagos(s) && s.modalidad==="mensual"){
      (s.pagos||[]).forEach(p=>{
        if(!mkSet.has(monthKeyOf(p.date))) return;
        rows.push({date:p.date, alumno:s.name, materia:s.subject||"", concepto:"Mensualidad",
          monto:Number(p.amount)||0, estado:"Cobrado"});
      });
    }
    (s.clasesPuntuales||[]).forEach(p=>{
      if(!hasSenia(s) || (p.seniaEstado!=="pendiente" && p.seniaEstado!=="cobrada" && p.seniaEstado!=="retenida")) return;
      if(!mkSet.has(monthKeyOf(p.date))) return;
      rows.push({date:p.date, alumno:s.name, materia:s.subject||"", concepto:"Seña",
        monto:Number(p.seniaMonto)||0, estado:SENIA_ESTADO_META[p.seniaEstado].label});
    });
  });
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  return rows;
}
function pagosCsvMonthlySummary(rows, monthKeys){
  const byMonth = {};
  monthKeys.forEach(mk=>byMonth[mk]={mk, cobrado:0, pendiente:0});
  rows.forEach(r=>{
    const mk = monthKeyOf(r.date);
    if(!byMonth[mk]) return;
    if(r.estado==="Pendiente") byMonth[mk].pendiente += r.monto;
    else byMonth[mk].cobrado += r.monto;
  });
  return monthKeys.map(mk=>byMonth[mk]);
}
function csvField(v){
  const s = String(v??"");
  return /[;"\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
function buildPagosCsv(monthKeys){
  const rows = pagosCsvRows(monthKeys);
  const lines = [["Fecha","Alumno","Materia","Concepto","Monto","Estado"].map(csvField).join(";")];
  rows.forEach(r=>lines.push([fmtDate(r.date), r.alumno, r.materia, r.concepto, r.monto, r.estado].map(csvField).join(";")));
  lines.push("");
  lines.push("Resumen por mes");
  lines.push(["Mes","Cobrado","Pendiente"].map(csvField).join(";"));
  pagosCsvMonthlySummary(rows, monthKeys).forEach(m=>
    lines.push([monthLabel(m.mk), m.cobrado, m.pendiente].map(csvField).join(";")));
  return lines.join("\r\n");
}

/* ============ recordatorios de cobro: clases sin cobrar + mensualidades vencidas + señas
   pendientes, todo junto, para el aviso diario del tablero (ver events.js: maybeNotifyCobros) ============ */
function recordatoriosFor(){ return state.catalog.recordatorios || defaultRecordatorios(); }
function costosFor(){ return state.catalog.costos || defaultCostos(); }
function docenteFor(){ return state.catalog.docente || defaultDocente(); }
/* ============ interesados (paso 119): mini lista de espera, aparte de state.students ============ */
function interesadosFor(){ return state.catalog.interesados||[]; }
// Crea un alumno de verdad a partir de un interesado y lo saca de la lista — un solo
// save()/render() para las dos cosas (mismo criterio que applyTarifaAjuste: evita un mutation
// a medio camino si algo falla entre medio). El alumno arranca con lo que ya se sabía de él
// (nombre, contacto, materia de interés como texto libre, nota) — el resto se completa después
// en su ficha, como con cualquier alta manual.
// QA/regresión: antes no pasaba por findDuplicateStudent como cualquier otra alta manual —
// podía crear una ficha duplicada en silencio si el interesado ya era alumno (ej. de otra
// materia, anotado de nuevo por error). st.subjectId queda vacío (la materia de interés es
// texto libre, no un id del catálogo), así que el chequeo de duplicado es contra esa misma
// falta de materia — mismo criterio que un alta manual "sin materia por ahora".
function convertirInteresado(id){
  const it = interesadosFor().find(x=>x.id===id); if(!it) return {error:null, student:null};
  const dup = findDuplicateStudent(it.nombre, "", null);
  if(dup) return {error:`Ya tenés a ${dup.name} sin materia asignada — revisá si es la misma persona antes de convertirlo.`, student:null};
  const st = emptyStudent();
  st.name = it.nombre; st.phone = it.contacto||""; st.subject = it.materia||""; st.notes = it.nota||"";
  state.students = [...state.students, st];
  state.catalog.interesados = interesadosFor().filter(x=>x.id!==id);
  touchCatalog();
  return {error:null, student:st};
}
/* ============ plantillas de mensajes (paso 117) ============
   mensajesFor() mezcla defaults (config.js) con lo guardado; legacyRecordatorio sostiene la
   plantilla de recordatorio de clase del paso 111 (state.catalog.waRecordatorioClase, guardada
   antes de unificar todo acá) para que un catálogo que ya la tenía personalizada no la pierda —
   se puede seguir editando desde la misma "Mensajes" de siempre, ahora en un solo lugar. */
function mensajesFor(){
  const legacy = state.catalog.waRecordatorioClase;
  return { ...defaultMensajes(), ...(legacy?{recordatorioClase:legacy}:{}), ...(state.catalog.mensajes||{}) };
}
// Sustitución simple {llave}->valor, sin tocar lo que no matchea (para no romper si algún
// texto libre trae llaves sueltas que no son variables reconocidas).
function fillTemplate(str, vars){
  return String(str||"").replace(/\{(\w+)\}/g, (m,k)=> (k in vars) ? vars[k] : m);
}
// Igual que fillTemplate pero además borra cualquier línea que sea EXACTAMENTE un solo token
// (nada más alrededor) cuando ese valor viene vacío — usado sólo por el recibo, para que
// "Saldo restante"/"Docente" no dejen un renglón suelto cuando no aplican (ver plantilla
// "recibo" en config.js).
function fillTemplateLines(str, vars){
  return String(str||"").split("\n").map(line=>{
    const solo = /^\{(\w+)\}$/.exec(line.trim());
    if(solo && !vars[solo[1]]) return null;
    return fillTemplate(line, vars);
  }).filter(l=>l!==null).join("\n");
}
function mensajeTexto(key, vars){ return fillTemplate(mensajesFor()[key], vars); }
// Qué de este alumno se comparte en su portal individual (ver s.portalShare, ficha → "Portal
// para este alumno"). Por diseño sólo puede llevar estos tres booleanos — nunca notas, pagos,
// señas ni comentarios privados (ver buildAlumnoBlock() en sync.js, que es lo único que lee esto
// para armar el JSON público).
function portalShareFor(s){ return s.portalShare || {proximaClase:false, tareas:false, avance:false}; }
// Próxima clase de un alumno puntual (no importa el estado del alumno, a diferencia de
// agendaRangeEvents que sólo mira activos): la más próxima entre sus clases puntuales futuras
// no canceladas y la próxima ocurrencia de cada horario habitual dentro de los próximos 7 días.
// Link de videollamada (paso 116) de un evento puntual/horario: el propio si lo cargó, si no el
// del alumno (default por alumno, ficha → Clases). Nunca ambos combinados.
function linkVideollamadaFor(s, ownLink){ return ownLink || s.videollamadaLink || ""; }
function nextClaseForStudent(s){
  const from=today();
  let best=null;
  (s.clasesPuntuales||[]).forEach(p=>{
    if(p.cancelada || p.date<from) return;
    const key=p.date+" "+p.time;
    if(!best || key<best.key) best={key, date:p.date, time:p.time, duration:Number(p.duration)||60, link:linkVideollamadaFor(s,p.link)};
  });
  (s.horarios||[]).forEach(hr=>{
    for(let i=0;i<7;i++){
      const d=addDays(from,i);
      if(weekdayIdx(d)===hr.day){
        const key=d+" "+hr.time;
        if(!best || key<best.key) best={key, date:d, time:hr.time, duration:Number(hr.duration)||60, link:linkVideollamadaFor(s,hr.link)};
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
// Destino de un aviso del portal (paso 105) — mismo prefijo "m:"/"s:" que parseScopeValue()
// arriba, sin valor = todos los alumnos. Ver vPortalAvisosCard()/avisoTargetOptionsHtml() en
// views.js y saveAvisos() en sync.js.
function parseAvisoTarget(v){
  if(v && v.startsWith("m:")) return {tipo:"materia", subjectId:v.slice(2)};
  if(v && v.startsWith("s:")) return {tipo:"alumno", studentId:v.slice(2)};
  return {tipo:"todos"};
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
        if(!isAusente(c) && !c.cobrada && daysSince(c.date)>=dias)
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
            date:d, time:h.time, duration:Number(h.duration)||60, kind:"horario", sourceId:h.id,
            link:linkVideollamadaFor(s,h.link)});
        });
      }
    }
    (s.clasesPuntuales||[]).forEach(p=>{
      if(p.cancelada) return;
      if(p.date>=fromDate && p.date<=toDate) events.push({
        studentId:s.id, studentName:s.name, subject:s.subject, subjectId:s.subjectId,
        date:p.date, time:p.time, duration:Number(p.duration)||60,
        kind:"puntual", sourceId:p.id, seniaEstado:p.seniaEstado,
        link:linkVideollamadaFor(s,p.link) });
    });
  });
  return events;
}
function agendaWeekEvents(weekStart){ return agendaRangeEvents(weekStart, addDays(weekStart,6)); }
// Qué exportar a .ics (paso 110): el mismo período que se está viendo en Agenda — la semana
// actual (con su offset) o la grilla completa del mes elegido — para que el botón "Exportar a
// mi calendario" siempre coincida con lo que hay en pantalla. label sirve para el nombre del
// archivo descargado.
function agendaIcsRangeForView(){
  if((state.agendaViewMode||"semana")==="mes"){
    const mk = monthKeyOffset(state.agendaMonthOffset||0);
    const days = monthGridDays(mk);
    return {events: agendaRangeEvents(days[0], days[days.length-1]), label: mk};
  }
  const weekStart = addDays(mondayOfWeek(today()), (state.agendaWeekOffset||0)*7);
  return {events: agendaWeekEvents(weekStart), label: weekStart};
}
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
function addPuntualClase(studentId, date, time, duration, link){
  const s = state.students.find(x=>x.id===studentId); if(!s) return {warning:null};
  const nueva = {id:uid(), date, time, duration, link:link||""};
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
  alive().forEach(s=>(s.sessions||[]).forEach(c=>{ if(monthKeyOf(c.date)===mk && !isAusente(c)) out.push({s,c}); }));
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
// Resumen de un mes puntual para "Comparar períodos" en Estadísticas (paso 104) — todo salido
// del historial local (sesiones, pagos, objetivos), sin ningún campo nuevo en el JSON. "Alumnos
// con clase" es la mejor aproximación a "alumnos activos" de un mes pasado que se puede sacar del
// historial: el estado actual (s.status) es un valor presente, no algo que quede registrado mes
// a mes, así que no hay forma de saber quién estaba "activo" en un mes anterior salvo por si
// tuvo clase ese mes.
function statsPeriodSummary(mk){
  const r = rentabilidadMes(mk);
  const clases = classesInMonth(mk);
  const alumnosConClase = new Set(clases.map(({s})=>s.id)).size;
  const goals = goalCountsInMonth(mk);
  return {
    mk, ingresos:r.ingresos, clases:r.clasesCount, horas:r.horas,
    alumnosConClase,
    objetivosPct: goals.total>0 ? (goals.si/goals.total*100) : null,
    objetivosTotal: goals.total,
  };
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
  // paso 103: además del nombre, matchea por etiqueta (ej. buscar "verano" encuentra a los
  // alumnos con esa etiqueta) — el "sub" muestra la etiqueta que matcheó cuando no matcheó el
  // nombre, para que quede claro por qué apareció.
  const students = alive().filter(s=>{
    if(s.name.toLowerCase().includes(q)) return true;
    return studentTags(s).some(t=>t.label.toLowerCase().includes(q));
  }).slice(0,6).map(s=>{
    if(s.name.toLowerCase().includes(q)) return {id:s.id, label:s.name, sub:s.subject||"Sin materia"};
    const matchedTag = studentTags(s).find(t=>t.label.toLowerCase().includes(q));
    return {id:s.id, label:s.name, sub:`Etiqueta: ${matchedTag.label}`};
  });
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

/* ============ modo demo (paso 95, sobre el paso 82): ?demo=1 carga este cuaderno ficticio en
   memoria — nunca toca localStorage ni el backend (ver IS_DEMO en config.js, el guard de save()
   acá abajo, el de ensureToken() en auth.js y los guards IS_DEMO de loadPortal()/loadMateriales()
   y compañía en sync.js). Se reconstruye entera en CADA carga de la página (load() llama a esto
   de nuevo siempre) y todas las fechas son relativas a hoy (addDays/today/Date.now) para que se
   vea siempre vigente, nunca vieja, sin importar cuándo se abra. Pensada para que quien la
   recorra vea al toque casi todo lo que la app sabe hacer: variedad de materias/alumnos/estados,
   agenda de la semana con clases superpuestas, pagos/señas/mensualidades con deuda real, costos
   cargados (rentabilidad con números), contratos y recibos, materiales y portal (llaves
   individuales y grupal) ya activados, un ítem en la papelera, y varios meses de historial para
   que Estadísticas y Retención no se vean vacías. Los materiales son sólo la entrada liviana que
   ya vive en catalog.subjects[].materiales — nunca se sube ni se lista nada de Storage real (ver
   materialesIndexFor() en sync.js: lee ese mismo array local). ============ */
function buildDemoData(){
  const unitsOf = id => (SUBJECT_TEMPLATES.find(t=>t.id===id)||{units:[]}).units;
  const atDaysAgo = n => new Date(Date.now()-n*86400000).toISOString();
  const catalog = defaultCatalog();
  catalog.careers = ["Ingeniería","Licenciatura","Arquitectura"];
  catalog.subjects = [
    { id:"demo-am1", name:"Análisis Matemático I", units:unitsOf("tpl-analisis-1"), color:"teal",
      materiales:[
        {name:"guia3-Guía de ejercicios — Unidad 3.pdf", bytes:842000, compartido:true, at:atDaysAgo(30)},
        {name:"resder-Resumen de derivadas.pdf", bytes:210000, compartido:true, at:atDaysAgo(12)},
      ] },
    { id:"demo-alg", name:"Álgebra y Geometría Analítica", units:unitsOf("tpl-algebra"), color:"indigo",
      materiales:[
        {name:"guiamat-Guía de matrices y determinantes.pdf", bytes:530000, compartido:true, at:atDaysAgo(18)},
      ] },
    { id:"demo-ing", name:"Matemática básica / ingreso", units:unitsOf("tpl-matematica-ingreso"), color:"slate", materiales:[] },
    { id:"demo-fis1", name:"Física I", units:unitsOf("tpl-fisica-1"), color:"blue",
      materiales:[
        {name:"formcin-Fórmulas de cinemática.pdf", bytes:96000, compartido:false, at:atDaysAgo(5)},
      ] },
    { id:"demo-qui", name:"Química General", units:unitsOf("tpl-quimica-general"), color:"amber", materiales:[] },
  ];
  catalog.docente = {nombre:"Prof. Demo", telefono:"11-5555-0100", dni:"30111222"};
  catalog.costos = {
    fijos:[
      {id:uid(), name:"Alquiler del aula", monto:25000},
      {id:uid(), name:"Internet y plataformas", monto:9000},
    ],
    variables:[
      {id:uid(), name:"Fotocopias y guías", monto:4000, subjectId:"demo-fis1"},
      {id:uid(), name:"Materiales de laboratorio", monto:6000, subjectId:"demo-qui"},
    ],
  };
  // papelera (paso 76): una materia vieja ya borrada, restaurable durante TRASH_DAYS igual que en
  // una cuenta real — para que la demo muestre también esa pantalla con algo adentro.
  catalog.trash = [{
    type:"subject",
    subject:{ id:"demo-trig", name:"Trigonometría (discontinuada)", color:"purple",
      units:["Razones trigonométricas","Identidades","Ecuaciones trigonométricas"], materiales:[] },
    packIds:[],
    deletedAt: Date.now()-2*86400000,
  }];

  const students = [];
  const mk = (over) => ({
    id: uid(), career:"Ingeniería", chair:"", notes:"", informeComment:"", phone:"",
    tarifa:"", modalidad:"", pagos:[], recibos:[], examResults:[],
    horarios:[], clasesPuntuales:[], seniaActiva:false, seniaTipo:"monto", seniaValor:"",
    contratoResponsable:"", contratoDni:"", contratoFechaInicio:"", contratoClausulas:"",
    startDate: addDays(today(),-60), status:"activo", semaforo:"sd", examDate:"",
    topics:{}, sessions:[], simulacros:[], portalShare:null, updatedAt:Date.now(),
    ...over,
  });
  const sess = (daysAgo, topic, tarea, cobrada, objetivo, objetivoResult) => ({
    id:uid(), date:addDays(today(),-daysAgo), topic, tarea:tarea||"sd", note:"",
    duration:60, cobrada:!!cobrada,
    objetivo: objetivo||"", objetivoResult: objetivoResult||null,
  });
  // clases semanales espaciadas cada 7 días desde hace `startAt` días — para dar varios meses de
  // historial real (Estadísticas, Rentabilidad histórica, Retención) sin escribir docenas de
  // clases a mano; una de cada cinco queda sin cobrar, para que también haya algo pendiente.
  const weekly = (count, topic, startAt) => Array.from({length:count}, (_,i) =>
    sess(startAt+i*7, topic, i%4===3?"intentada":"hecha", i%5!==4));
  const simu = (daysAgo, grade, note) => ({id:uid(), date:addDays(today(),-daysAgo), grade, note:note||""});
  let reciboSeq=0;
  const anio = today().slice(0,4);
  const recibo = (tipo, concepto, monto, daysAgo, saldo) => {
    reciboSeq++;
    return {id:uid(), numero:`${anio}-${String(reciboSeq).padStart(3,"0")}`, date:addDays(today(),-daysAgo), tipo, concepto, monto:Number(monto)||0, saldo:Number(saldo)||0};
  };

  // 1) Lucía — al día, examen próximo, buen avance, contrato firmado, recibo emitido
  const lucia = mk({
    name:"Lucía Fernández", subject:"Análisis Matemático I", subjectId:"demo-am1",
    semaforo:"verde", examDate:addDays(today(),10), tarifa:8000, modalidad:"clase",
    contratoResponsable:"Marisa Fernández", contratoDni:"28900111", contratoFechaInicio:addDays(today(),-60),
    topics:{[unitsOf("tpl-analisis-1")[0]]:"parcial",[unitsOf("tpl-analisis-1")[1]]:"parcial",
      [unitsOf("tpl-analisis-1")[2]]:"practica",[unitsOf("tpl-analisis-1")[3]]:"visto"},
    clasesPuntuales:[
      {id:uid(), date:addDays(today(),-2), time:"18:00", duration:60, cancelada:false},
    ],
    sessions:[
      sess(21,"Límites y continuidad","hecha",true,"Resolver límites por sustitución",{estado:"si",pct:100}),
      sess(14,"Derivadas","hecha",true,"Reglas de derivación básicas",{estado:"si",pct:100}),
      sess(7,"Aplicaciones de la derivada","intentada",true,"Optimización con derivadas",{estado:"medias",pct:60}),
      sess(1,"Aplicaciones de la derivada","hecha",true,"Repasar la regla de la cadena"),
    ],
  });
  lucia.recibos=[recibo("clase","Clase del "+fmtDate(addDays(today(),-14)),8000,14)];
  lucia.portalShare={proximaClase:true, tareas:true, avance:true};
  students.push(lucia);

  // 2) Martín — debe la mensualidad, en riesgo, con dos meses de historial de pagos
  const martin = mk({
    name:"Martín Gómez", subject:"Física I", subjectId:"demo-fis1",
    semaforo:"amarillo", examDate:addDays(today(),20), tarifa:35000, modalidad:"mensual",
    pagos:[
      {id:uid(), date:addDays(today(),-65), amount:35000},
      {id:uid(), date:addDays(today(),-35), amount:35000},
      {id:uid(), date:addDays(today(),-5), amount:15000},
    ],
    topics:{[unitsOf("tpl-fisica-1")[0]]:"visto",[unitsOf("tpl-fisica-1")[1]]:"pendiente"},
    sessions:[
      ...weekly(6,"Cinemática",70),
      sess(18,"Cinemática","hecha",false),
      sess(11,"Leyes de Newton","intentada",false,"Resolver problemas de fuerzas",{estado:"medias",pct:50}),
      sess(4,"Leyes de Newton","no",false,"Repasar diagramas de cuerpo libre",{estado:"no",pct:0}),
    ],
  });
  martin.recibos=[recibo("mensual","Mensualidad "+monthLabel(monthKeyOf(addDays(today(),-65))),35000,65),
    recibo("mensual","Mensualidad "+monthLabel(monthKeyOf(addDays(today(),-35))),35000,35)];
  students.push(martin);

  // 3) Sofía — cobra seña, clase puntual con seña pendiente esta semana (misma hora que Ezequiel)
  const sofia = mk({
    name:"Sofía Ibarra", subject:"Química General", subjectId:"demo-qui",
    semaforo:"rojo", tarifa:9000, modalidad:"clase", seniaActiva:true, seniaTipo:"monto", seniaValor:"3000",
    topics:{[unitsOf("tpl-quimica-general")[0]]:"pendiente"},
    clasesPuntuales:[
      {id:uid(), date:addDays(today(),3), time:"17:00", duration:60, cancelada:false, seniaEstado:"pendiente", seniaMonto:3000},
    ],
    sessions:[ sess(9,"Estructura atómica","no",true) ],
  });
  sofia.recibos=[recibo("senia","Seña — clase puntual del "+fmtDate(addDays(today(),-11)),3000,11)];
  students.push(sofia);

  // 4) Nicolás — pausado, sin actividad reciente
  students.push(mk({
    name:"Nicolás Paz", subject:"Análisis Matemático I", subjectId:"demo-am1",
    status:"pausado", semaforo:"sd",
    sessions:[ sess(75,"Números reales y funciones","hecha",true) ],
  }));

  // 5) Valentina — mensual, al día, horario habitual hoy a las 18:30 (se superpone con Camila)
  const valentina = mk({
    name:"Valentina Ruiz", subject:"Física I", subjectId:"demo-fis1",
    semaforo:"verde", tarifa:32000, modalidad:"mensual",
    pagos:[
      {id:uid(), date:addDays(today(),-62), amount:32000},
      {id:uid(), date:addDays(today(),-32), amount:32000},
      {id:uid(), date:addDays(today(),-2), amount:32000},
    ],
    horarios:[{id:uid(), day:weekdayIdx(today()), time:"18:30", duration:60}],
    topics:{[unitsOf("tpl-fisica-1")[0]]:"parcial",[unitsOf("tpl-fisica-1")[1]]:"practica"},
    sessions:[
      ...weekly(5,"Trabajo y energía",60),
      sess(10,"Trabajo y energía","hecha",true,"Ejercicios de energía cinética",{estado:"si",pct:100}),
      sess(3,"Trabajo y energía","hecha",true),
    ],
  });
  valentina.portalShare={proximaClase:true, tareas:false, avance:true};
  students.push(valentina);

  // 6) Tomás — no aprobó el último examen, a recuperar
  students.push(mk({
    name:"Tomás Herrera", subject:"Química General", subjectId:"demo-qui",
    status:"desaprobo", semaforo:"rojo", examDate:addDays(today(),-6),
    examResults:[{id:uid(), date:addDays(today(),-6), result:"desaprobo", grade:"3/10"}],
    sessions:[ sess(20,"Enlace químico","intentada",true) ],
  }));

  // 7) Camila — buena racha de objetivos, horario habitual hoy 18:30 (agenda con superposición),
  //    y un objetivo recién cargado todavía sin cerrar (tarjeta de cierre en su ficha)
  students.push(mk({
    name:"Camila Torres", subject:"Análisis Matemático I", subjectId:"demo-am1",
    semaforo:"amarillo", examDate:addDays(today(),30), tarifa:8000, modalidad:"clase",
    horarios:[{id:uid(), day:weekdayIdx(today()), time:"18:30", duration:60}],
    topics:{[unitsOf("tpl-analisis-1")[0]]:"parcial"},
    sessions:[
      sess(15,"Integrales indefinidas","hecha",true,"Resolver integrales por sustitución",{estado:"si",pct:100}),
      sess(8,"Integrales definidas y aplicaciones","hecha",true,"Calcular áreas entre curvas",{estado:"si",pct:100}),
      sess(0,"Aplicaciones de integrales","hecha",true,"Repasar áreas entre curvas para el parcial"),
    ],
  }));

  // 8) Agustín — dejó hace más de un mes, para altas/bajas de Retención
  students.push({...mk({
    name:"Agustín Molina", subject:"Física I", subjectId:"demo-fis1",
    status:"dejo", semaforo:"sd", startDate:addDays(today(),-150),
    sessions:[ sess(95,"Cinemática","hecha",true) ],
  }), updatedAt: Date.now()-45*86400000});

  // 9) Bruno — Álgebra, tres meses de clases semanales, dos simulacros, recibo al día
  const bruno = mk({
    name:"Bruno Sosa", subject:"Álgebra y Geometría Analítica", subjectId:"demo-alg",
    semaforo:"verde", examDate:addDays(today(),45), tarifa:8500, modalidad:"clase",
    horarios:[{id:uid(), day:weekdayIdx(addDays(today(),1)), time:"17:00", duration:60}],
    topics:{[unitsOf("tpl-algebra")[0]]:"parcial",[unitsOf("tpl-algebra")[1]]:"parcial",[unitsOf("tpl-algebra")[2]]:"practica"},
    sessions: weekly(13,"Matrices y determinantes",5),
    simulacros:[ simu(40,"6/10","Le costaron los sistemas de ecuaciones"), simu(12,"8/10","Mucho mejor con matrices") ],
  });
  bruno.recibos=[recibo("clase","Clase del "+fmtDate(addDays(today(),-5)),8500,5)];
  students.push(bruno);

  // 10) Julieta — ingreso, mensual, avance parejo, sin examen todavía
  students.push(mk({
    name:"Julieta Díaz", subject:"Matemática básica / ingreso", subjectId:"demo-ing",
    semaforo:"verde", tarifa:30000, modalidad:"mensual",
    pagos:[
      {id:uid(), date:addDays(today(),-58), amount:30000},
      {id:uid(), date:addDays(today(),-28), amount:30000},
    ],
    horarios:[{id:uid(), day:weekdayIdx(addDays(today(),3)), time:"19:00", duration:90}],
    topics:{[unitsOf("tpl-matematica-ingreso")[0]]:"parcial",[unitsOf("tpl-matematica-ingreso")[1]]:"visto"},
    sessions: weekly(6,"Expresiones algebraicas",50),
  }));

  // 11) Ezequiel — Álgebra, en riesgo, clase puntual esta semana a la misma hora que Sofía
  //     (para que la Agenda muestre el aviso de superposición)
  students.push(mk({
    name:"Ezequiel Paz", subject:"Álgebra y Geometría Analítica", subjectId:"demo-alg",
    semaforo:"rojo", examDate:addDays(today(),6), tarifa:8500, modalidad:"clase",
    clasesPuntuales:[
      {id:uid(), date:addDays(today(),3), time:"17:00", duration:60, cancelada:false},
    ],
    topics:{[unitsOf("tpl-algebra")[0]]:"pendiente"},
    sessions:[ sess(6,"Vectores en el plano y el espacio","intentada",true) ],
  }));

  // 12) Renata — ingreso, mensual con cuatro meses de historial, racha de objetivos, contrato
  const renata = mk({
    name:"Renata Acosta", subject:"Matemática básica / ingreso", subjectId:"demo-ing",
    semaforo:"verde", tarifa:30000, modalidad:"mensual",
    contratoResponsable:"Renata Acosta", contratoDni:"41222333", contratoFechaInicio:addDays(today(),-110),
    horarios:[{id:uid(), day:weekdayIdx(addDays(today(),4)), time:"16:00", duration:60}],
    startDate:addDays(today(),-110),
    pagos:[
      {id:uid(), date:addDays(today(),-95), amount:30000},
      {id:uid(), date:addDays(today(),-65), amount:30000},
      {id:uid(), date:addDays(today(),-35), amount:30000},
      {id:uid(), date:addDays(today(),-3), amount:30000},
    ],
    topics:{[unitsOf("tpl-matematica-ingreso")[0]]:"parcial",[unitsOf("tpl-matematica-ingreso")[1]]:"parcial",[unitsOf("tpl-matematica-ingreso")[2]]:"practica"},
    sessions:[
      ...weekly(10,"Ecuaciones e inecuaciones",25),
      sess(11,"Funciones","hecha",true,"Graficar funciones lineales",{estado:"si",pct:100}),
      sess(4,"Funciones","hecha",true,"Dominio e imagen",{estado:"si",pct:100}),
    ],
  });
  students.push(renata);

  // 13) Mariano — rindió ayer y todavía no cargaste el resultado (dispara la pregunta del tablero)
  const mariano = mk({
    name:"Mariano Luna", subject:"Química General", subjectId:"demo-qui",
    semaforo:"rojo", examDate:addDays(today(),-1), tarifa:9000, modalidad:"clase",
    topics:{[unitsOf("tpl-quimica-general")[0]]:"visto",[unitsOf("tpl-quimica-general")[1]]:"pendiente"},
    sessions:[
      sess(16,"Tabla periódica y propiedades","hecha",true),
      sess(9,"Enlace químico","intentada",false),
      sess(2,"Enlace químico","hecha",false),
    ],
  });
  mariano.recibos=[recibo("clase","Clase del "+fmtDate(addDays(today(),-16)),9000,16)];
  students.push(mariano);

  // 14) papelera: un alumno de ejemplo ya borrado, restaurable como en una cuenta real
  students.push({...mk({
    name:"Alumno de prueba", subject:"Análisis Matemático I", subjectId:"demo-am1",
    sessions:[ sess(40,"Números reales y funciones","hecha",true) ],
  }), deleted:true, deletedAt: Date.now()-3*86400000});

  // Portal ya activado (paso 95): llave general habilitada, llave individual para Lucía y
  // Valentina (ver portalShare de cada una más arriba) y una llave grupal para Análisis
  // Matemático I con Lucía, Camila y Nicolás — todo simulado en memoria, sin fila real en
  // Supabase (ver los guards IS_DEMO de fetchPortalRow()/loadPortal()/publicarPortal() en
  // sync.js, que hacen que esto se lea y "edite" sin pegarle nunca a la red).
  const portal = {
    token:"DEMOPORTAL1", habilitado:true, draftNombre:"Prof. Demo",
    publicado:{nombre:"Prof. Demo"},
    tokensAlumnos:{ "DEMOALUM001":lucia.id, "DEMOALUM002":valentina.id },
    tokensGrupos:{ "DEMOGRUPO01":{materiaId:"demo-am1", alumnos:students.filter(s=>s.subjectId==="demo-am1" && !s.deleted).map(s=>s.id)} },
  };

  return { students, catalog, portal };
}
