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
              editUnitId:null, editSubunitId:null, editCareerId:null, catMateriasGroupBy:"todas",
              newPackName:"", newPackSubjects:[], newPackError:"",
              view:"tablero", selId:null, filter:"activo", tab:"temas",
              listSearch:"", listSubject:"todas", listCareer:"todas", listSem:"todos",
              listDeuda:"todas", listSort:"examen", listTag:"todas",
              simTimer:null, simTimerLastMin:90, simPrefillNote:"",
              statsSubjectId:null, statsMode:"normal", compareA:null, compareB:null,
              showNew:false, newStudentError:"", newStudentAdvancedOpen:false, newStudentSeniaActiva:false,
              confirmDel:false, catConfirmDelId:null, trashPurgeConfirmKey:null, fichaError:"", saveErr:false,
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
              agendaGridQuick:null,
              puntualCancelAskId:null, cobrosBannerOpen:false, registrarClaseTipo:null,
              portal:null, portalLoaded:false, portalError:"",
              portalSaving:false, portalSaveMsg:"", portalCopyMsg:"",
              portalGrupoBusy:null, portalGrupoError:"", portalGrupoCopyMsg:"",
              portalGrupoEditing:null, portalGrupoDraftAlumnos:[],
              shareOverlay:null, envioOverlay:null,
              cobrosLinkMPError:"", cobrosLinkOtroError:"", cobrosQrUploading:false, cobrosQrError:"", cobrosQrDeleteConfirm:false,
              cuentaGroupsClosed:{},
              avisoSaving:false, avisoError:"",
              toasts:[],
              fabOpen:false, fabPick:null,
              searchOpen:false, searchQuery:"", searchSel:0,
              helpOpen:null, faqOpenIdx:null, alertMsgFor:null };

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
/* ============ fotos de perfil opcionales (paso 137): docente y alumnos ============
   s.foto / docente.foto = {path, bytes, updatedAt} | null|undefined. La miniatura (WebP, ver
   resizeImageToAvatar) vive en el bucket privado "materiales" — como cualquier objeto privado de
   Storage, mostrarla requiere pedirla con el token de sesión (no un <img src> directo a la URL de
   Supabase), así que se resuelve una sola vez a una data: URL y se cachea en memoria (nunca en
   state: no hace falta persistirla, y una data: URL no sobrevive un JSON.stringify legible). Sin
   foto (o en modo demo, donde jamás se inventa una imagen) cae en iniciales con color estable por
   id, misma idea que subjectColorKey() pero contra el id del alumno/"docente" en vez de la materia. */
const _avatarDataUrlCache = new Map(); // "path|updatedAt" -> data: URL ya resuelta
const _avatarLoading = new Set();
function avatarColorKey(id){
  let h=0; const s=id||""; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0;
  return SUBJECT_COLOR_KEYS[Math.abs(h)%SUBJECT_COLOR_KEYS.length];
}
function initialsFor(name){
  const parts=(name||"").trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return "?";
  return (parts[0][0]+(parts[1]?parts[1][0]:"")).toUpperCase();
}
// Devuelve la data: URL ya resuelta, o null mientras se resuelve (dispara loadAvatarDataUrl en
// sync.js, que al terminar cachea y llama a render() para que el próximo avatarUrlFor la encuentre).
function avatarUrlFor(foto){
  if(!foto || !foto.path || IS_DEMO) return null;
  const cacheKey=foto.path+"|"+(foto.updatedAt||0);
  if(_avatarDataUrlCache.has(cacheKey)) return _avatarDataUrlCache.get(cacheKey);
  loadAvatarDataUrl(foto);
  return null;
}
function avatarHtml(id, name, foto, sizePx, extraStyle){
  const url=avatarUrlFor(foto);
  const style=`width:${sizePx}px;height:${sizePx}px;${extraStyle||""}`;
  if(url) return `<img class="avatar" style="${style}" src="${url}" alt="">`;
  const k=avatarColorKey(id);
  return `<div class="avatar avatar-fallback" style="${style}font-size:${Math.round(sizePx*0.4)}px;background:var(--subj-${k}-bg);color:var(--subj-${k}-fg)">${esc(initialsFor(name))}</div>`;
}
// Recorte cuadrado centrado + resize a AVATAR_SIZE_PX + WebP, bajando la calidad de a pasos hasta
// entrar en AVATAR_TARGET_BYTES (o hasta 0.5, lo que pase primero — igual se sube, sólo pesará un
// poco más del objetivo) — nunca se sube el archivo original. Se lee con FileReader (data: URL) en
// vez de URL.createObjectURL para no necesitar blob: en la CSP, sólo data: (ya permitido para
// mostrar avatares, ver el <meta> de CSP en index.html/portal.html).
async function resizeImageToAvatar(file){
  const dataUrl = await new Promise((resolve,reject)=>{
    const fr=new FileReader(); fr.onload=()=>resolve(fr.result); fr.onerror=reject; fr.readAsDataURL(file);
  });
  const img = await new Promise((resolve,reject)=>{
    const im=new Image(); im.onload=()=>resolve(im); im.onerror=reject; im.src=dataUrl;
  });
  const side=Math.min(img.width, img.height);
  const sx=(img.width-side)/2, sy=(img.height-side)/2;
  const canvas=document.createElement("canvas");
  canvas.width=AVATAR_SIZE_PX; canvas.height=AVATAR_SIZE_PX;
  canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);
  let quality=0.8, blob=null;
  for(let i=0;i<4;i++){
    blob = await new Promise(res=>canvas.toBlob(res, "image/webp", quality));
    if(!blob || blob.size<=AVATAR_TARGET_BYTES || quality<=0.5) break;
    quality -= 0.1;
  }
  return blob;
}
// QR de cobros (paso 141): a diferencia de resizeImageToAvatar, sin recorte cuadrado — sólo achica
// si excede QR_SIZE_PX de lado, manteniendo la proporción original (un QR recortado mal puede
// dejar de leerse).
async function resizeImageToQr(file){
  const dataUrl = await new Promise((resolve,reject)=>{
    const fr=new FileReader(); fr.onload=()=>resolve(fr.result); fr.onerror=reject; fr.readAsDataURL(file);
  });
  const img = await new Promise((resolve,reject)=>{
    const im=new Image(); im.onload=()=>resolve(im); im.onerror=reject; im.src=dataUrl;
  });
  const scale = Math.min(1, QR_SIZE_PX/Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width*scale)), h = Math.max(1, Math.round(img.height*scale));
  const canvas=document.createElement("canvas");
  canvas.width=w; canvas.height=h;
  canvas.getContext("2d").drawImage(img, 0, 0, w, h);
  let quality=0.9, blob=null;
  for(let i=0;i<4;i++){
    blob = await new Promise(res=>canvas.toBlob(res, "image/webp", quality));
    if(!blob || blob.size<=QR_TARGET_BYTES || quality<=0.5) break;
    quality -= 0.1;
  }
  return blob;
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
/* ============ unidades de una materia (paso 127): unidad = {id, nombre, orden, subunidades:
   [{id,nombre}]} — un nivel de subunidades, sin nietos. Los cuadernos viejos guardaban cada
   unidad como un string suelto; normalizeUnits() es la ÚNICA función que lee ese campo crudo y
   acepta ambos formatos, siempre devuelve objetos. Se llama en los bordes donde catalog.subjects
   puede traer datos sin normalizar — load() (localStorage), el merge de catálogo remoto y la
   restauración de un respaldo (syncNow()/restoreBackup() en sync.js) y buildDemoData() — nunca en
   cada lectura: de ahí en más el catálogo en memoria ya son objetos, y cualquier código que
   agregue/duplique/restaure una unidad construye el objeto completo con makeUnit()/makeSubunit(),
   así que no hace falta volver a normalizar. El avance (s.topics) sigue clave por el NOMBRE de la
   unidad, no por su id — igual que antes de este paso — así que renombrar una unidad no rompe
   nada (topics vive del lado del alumno) pero tampoco "seguía" el avance viejo bajo el nombre
   nuevo, mismo criterio que ya tenía borrar una unidad (ver el hint en vCatalog). */
function normalizeUnits(raw){
  return (raw||[]).map((u,i)=> typeof u==="string"
    ? {id:uid(), nombre:u, orden:i, subunidades:[]}
    : {id:u.id||uid(), nombre:u.nombre||"", orden:i,
       subunidades:(u.subunidades||[]).map(sub=> typeof sub==="string"
         ? {id:uid(), nombre:sub} : {id:sub.id||uid(), nombre:sub.nombre||""})});
}
function normalizeCatalogUnits(catalog){
  (catalog.subjects||[]).forEach(m=>{
    m.units=normalizeUnits(m.units);
    if(!Array.isArray(m.careerIds)) m.careerIds=[];
  });
  (catalog.trash||[]).forEach(t=>{ if(t.type==="subject" && t.subject) t.subject.units=normalizeUnits(t.subject.units); });
  return catalog;
}
/* ============ carreras (paso 129): catalog.careers pasó de string[] a {id,nombre,color?}[] para
   poder vincularlas a materias (subject.careerIds) sin perder el link si se renombran — mismo
   motivo que id en subjects/tags. normalizeCareers() es la ÚNICA función que lee el formato
   crudo (string suelto = cuaderno viejo) y siempre devuelve objetos, mismo patrón que
   normalizeUnits(). s.career (por alumno) NO cambia de formato: sigue siendo el nombre en texto
   plano de siempre, así que los filtros existentes (state.listCareer, careerOptions()) no se
   tocan — sólo el catálogo global gana identidad propia. */
function normalizeCareers(raw){
  return (raw||[]).map(c => typeof c==="string"
    ? {id:uid(), nombre:c}
    : {id:c.id||uid(), nombre:c.nombre||"", ...(c.color?{color:c.color}:{})});
}
// Además de normalizar el formato, recupera cualquier texto de carrera que ya esté cargado en
// s.career de algún alumno y todavía no exista en el catálogo (comparando sin mayúsculas/espacios
// de más, como normName()) — así ningún cuaderno viejo pierde una carrera sólo porque nunca se
// había agregado a la lista, sólo escrita a mano en una ficha.
function normalizeCatalogCareers(catalog, students){
  catalog.careers = normalizeCareers(catalog.careers);
  (students||[]).forEach(s=>{
    const name=(s.career||"").trim(); if(!name) return;
    const n=normName(name);
    if(!catalog.careers.some(c=>normName(c.nombre)===n)) catalog.careers.push({id:uid(), nombre:name});
  });
  return catalog;
}
function makeUnit(nombre, orden){ return {id:uid(), nombre, orden:orden||0, subunidades:[]}; }
function makeSubunit(nombre){ return {id:uid(), nombre}; }
function reindexUnits(units){ units.forEach((u,i)=>{ u.orden=i; }); return units; }
// Todas las unidades "planas" de una materia, en orden, con la subunidad indicando de qué unidad
// es (para selectores como el tema de clase, ver vFichaClases) — ver flattenUnits() en views.js
// para la versión con etiqueta de texto lista para mostrar.
function unitsFor(s){
  const m=subjById(s.subjectId);
  if(m) return m.units||[];
  // materia borrada del catálogo pero el alumno conserva avance viejo (ver el fallback previo a
  // este paso): se arman unidades "fantasma" de sólo lectura a partir de las claves de topics,
  // para que informe/resumen sigan mostrando algo en vez de nada.
  return Object.keys(s.topics||{}).map((nombre,i)=>({id:"legacy-"+i, nombre, orden:i, subunidades:[]}));
}
// Unidades + subunidades en un solo listado de texto, en orden (paso 127, ej. selector de
// "tema principal" al registrar una clase, ver vFichaClases en views.js) — la subunidad no tiene
// avance propio, así que acá es sólo una etiqueta más para elegir, con el nombre de su unidad
// adelante para que no se confunda con otra materia.
function flattenUnitLabels(units){
  const out=[];
  (units||[]).forEach(u=>{
    out.push(u.nombre);
    (u.subunidades||[]).forEach(sub=>out.push(`${u.nombre} — ${sub.nombre}`));
  });
  return out;
}
// Opciones del <select> de "tema principal" al registrar una clase o editar una ya guardada
// (paso 131, ver vFichaClases en views.js) — unidades/subunidades de la materia agrupadas en un
// optgroup, más los genéricos de GENERIC_TOPICS (config.js) siempre disponibles en otro optgroup:
// agrupar con <optgroup> es la única forma confiable entre navegadores de que se note que un tema
// genérico no es una unidad real del catálogo (los estilos por <option> no son controlables).
// Si el valor actual no matchea ninguna opción listada (tema viejo de texto libre, o una unidad
// borrada del catálogo desde entonces) se inyecta como opción extra al final para no perderlo —
// mismo truco que careerOptions() usa para una carrera huérfana.
function topicOptionsHtml(s, cur){
  const units = flattenUnitLabels(unitsFor(s));
  const known = new Set([...units, ...GENERIC_TOPICS]);
  const opt=(t)=>`<option ${t===cur?"selected":""}>${esc(t)}</option>`;
  return `<option value="" ${!cur?"selected":""}>—</option>`
    + (units.length ? `<optgroup label="Unidades">${units.map(opt).join("")}</optgroup>` : "")
    + `<optgroup label="General">${GENERIC_TOPICS.map(opt).join("")}</optgroup>`
    + (cur && !known.has(cur) ? opt(cur) : "");
}
// Unidades de nivel superior en un formato {id,label} listo para un <select> (paso 128, ver el
// selector de unidad de vMaterialRow en views.js) — a propósito sólo el nivel de unidad, sin
// subunidades: un material se enlaza a la unidad entera, no hace falta la granularidad de
// subunidad que sí tiene el avance por temas (unitsFor/flattenUnitLabels más arriba).
function flattenUnitOptions(units){
  return (units||[]).map(u=>({id:u.id, label:u.nombre}));
}
// Materiales de una materia enlazados a una unidad puntual (chip de conteo en la lista de
// unidades, ver vUnitRow en views.js) — materialesIndexFor vive en sync.js pero esto se llama
// siempre después de que los seis scripts ya cargaron, así que el orden no importa (ver el
// comentario de carga en CLAUDE.md).
function materialesCountFor(subjectId, unitId){
  return materialesIndexFor(subjectId).filter(m=>m.unitId===unitId).length;
}
function moveUnit(subjectId, unitId, dir){
  const m=subjById(subjectId); if(!m) return;
  const i=m.units.findIndex(u=>u.id===unitId), j=i+dir;
  if(i<0||j<0||j>=m.units.length) return;
  [m.units[i],m.units[j]]=[m.units[j],m.units[i]];
  reindexUnits(m.units);
  touchCatalog();
}
function moveSubunit(subjectId, unitId, subId, dir){
  const m=subjById(subjectId); const u=m&&m.units.find(x=>x.id===unitId); if(!u) return;
  const subs=u.subunidades||(u.subunidades=[]);
  const i=subs.findIndex(x=>x.id===subId), j=i+dir;
  if(i<0||j<0||j>=subs.length) return;
  [subs[i],subs[j]]=[subs[j],subs[i]];
  touchCatalog();
}
// ¿Algún alumno vivo de esta materia tiene avance real registrado en esta unidad (por nombre, ver
// el comentario de normalizeUnits())? Usado para pedir confirmación al borrar una unidad — si
// nadie la tocó todavía, se borra directo con el mismo undo-toast que cualquier otro borrado
// de bajo riesgo (ver cat-ask-del-unit en events.js).
function unitHasAvance(subjectId, nombre){
  return alive().some(s=>s.subjectId===subjectId && s.topics && s.topics[nombre] && s.topics[nombre]!=="pendiente");
}
// Borra una unidad (por id) de una materia, con undo — el avance de los alumnos (s.topics, clave
// por nombre) nunca se toca acá, así que si se deshace o se vuelve a cargar una unidad con el
// mismo nombre más tarde, ese avance viejo reaparece solo.
function deleteUnitWithUndo(subjectId, unitId){
  const m=subjById(subjectId); if(!m) return;
  const idx=m.units.findIndex(u=>u.id===unitId); if(idx<0) return;
  const removed=m.units[idx];
  m.units=m.units.filter(u=>u.id!==unitId);
  reindexUnits(m.units);
  touchCatalog();
  toast(`Unidad «${removed.nombre}» eliminada`, "ok", ()=>{
    const m2=subjById(subjectId); if(!m2) return;
    m2.units=[...m2.units];
    m2.units.splice(Math.min(idx,m2.units.length),0,removed);
    reindexUnits(m2.units);
    touchCatalog();
    toast("Unidad restaurada");
  });
}
const careerById = (id) => (state.catalog.careers||[]).find(c=>c.id===id) || null;
// Nombres de carreras para el <datalist>/<select> de la ficha (s.career sigue siendo texto
// plano) — si el alumno tiene una carrera que ya no está en el catálogo (borrada, o texto libre
// que nunca se agregó), se incluye igual para no perderla del selector actual.
function careerOptions(cur){
  const l=(state.catalog.careers||[]).map(c=>c.nombre);
  if(cur && !l.includes(cur)) l.push(cur);
  return l;
}
// Chip toggle para vincular/desvincular una carrera a una materia (editor de materia, ver
// vCatalog) — mismo patrón visual que los chips de pack-toggle-subject, sin botón de borrado
// propio: tocar el chip alterna el link.
function careerChip(career, on){
  return `<button class="chip ${on?"on":""}" data-a="cat-toggle-career" data-id="${esc(career.id)}">${esc(career.nombre)}</button>`;
}
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
  normalizeCatalogUnits(state.catalog);
  normalizeCatalogCareers(state.catalog, state.students);
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
/* ============ borrador de la ficha (paso 136) ============
   Los campos de "datos" de Resumen/Pagos (ver FICHA_DRAFT_FIELDS en config.js) no llaman a
   update() al tocarlos: quedan acumulados en state.fichaDraft={id,patch}, fuera de
   state.students, así que save()/scheduleSync() nunca los ven hasta confirmarlos con "Guardar
   cambios" (ver ficha-draft-save en events.js, que sí hace update(s.id,patch) una sola vez).
   draftFor(s) es lo que leen vFichaResumen/vFichaPagos para mostrar el valor tocado todavía sin
   guardar en vez del valor viejo de state.students. */
function draftFor(s){
  return (state.fichaDraft && state.fichaDraft.id===s.id) ? {...s, ...state.fichaDraft.patch} : s;
}
function fichaDraftFieldCount(){ return state.fichaDraft ? Object.keys(state.fichaDraft.patch).length : 0; }
function applyFichaDraftField(s, field, value){
  if(!state.fichaDraft || state.fichaDraft.id!==s.id) state.fichaDraft={id:s.id, patch:{}};
  const patch=state.fichaDraft.patch;
  const cur=draftFor(s);
  if(field==="subjectId"){
    const dup=findDuplicateStudent(cur.name,value,s.id);
    if(dup){ state.fichaError=`Ya tenés a ${dup.name} en esta materia.`; render(); return; }
    const m=subjById(value);
    state.fichaError="";
    patch.subjectId=value; patch.subject=m?m.name:s.subject;
    // Sugerencia de carrera (paso 129): igual que en el alta de alumno, sólo si el borrador
    // todavía no tiene una carrera propia cargada.
    if(!(cur.career||"").trim() && m && m.careerIds && m.careerIds.length){
      const c=careerById(m.careerIds[0]);
      if(c) patch.career=c.nombre;
    }
    render(); return;
  }
  if(field==="name"){
    const dup=findDuplicateStudent(value,cur.subjectId,s.id);
    state.fichaError = dup ? `Ya tenés a ${dup.name} en esta materia.` : "";
  }
  // Cambiar el estado a mano (en vez de Pausar/Reanudar, paso 114) también limpia pausaHasta si
  // ya no queda en "pausado", igual que hacía update() antes de este paso.
  if(field==="status" && value!=="pausado"){
    patch.status=value; patch.pausaHasta="";
    render(); return;
  }
  patch[field]=value;
  render();
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
  return { id:uid(), name:"", career:((state.catalog.careers[0]&&state.catalog.careers[0].nombre)||"Ingeniería"), subject:"", subjectId:"",
    chair:"", status:"activo", semaforo:"sd", examDate:"", startDate:today(), notes:"",
    updatedAt:Date.now(), topics:{}, sessions:[], simulacros:[],
    tarifa:"", modalidad:"", pagos:[], recibos:[], informeComment:"", phone:"", email:"", examResults:[],
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
  units.forEach((u,i)=>{ topics[u.nombre] = cycle[i % cycle.length]; });
  return {
    id: uid(), name:"Alumno de ejemplo", sample:true,
    career: (state.catalog.careers[0]&&state.catalog.careers[0].nombre)||"Ingeniería", subject: m?m.name:"", subjectId: m?m.id:"",
    chair:"", status:"activo", semaforo:"amarillo",
    examDate: daysFromToday(6), startDate: daysFromToday(-20),
    notes:"Este alumno es un ejemplo para que veas cómo se usa la app — podés borrarlo cuando quieras desde su ficha.",
    updatedAt: Date.now(), topics,
    sessions:[
      {id:uid(), date:daysFromToday(-6), topic:(units[1]&&units[1].nombre)||"", tarea:"hecha", note:"Bien encaminada, resolvió todo sin ayuda."},
      {id:uid(), date:daysFromToday(-2), topic:(units[2]&&units[2].nombre)||"", tarea:"intentada", note:"Le costó determinantes 3x3 — repasar la regla de Sarrus."}
    ],
    simulacros:[
      {id:uid(), date:daysFromToday(-3), grade:"6/10", note:"2 errores conceptuales en límites, 1 de cuenta en derivadas, bien en integrales."}
    ]
  };
}

/* ============ guía de primeros pasos (paso 125, sobre el paso 74) ============
   El descarte vivía en localStorage (ONBOARDING_TIPS_KEY, ya sin uso) — reaparecía en cada
   dispositivo/navegador nuevo porque localStorage no sincroniza. Ahora es un campo más de
   catalog (state.catalog.onboardingDismissed), así que viaja con el resto del cuaderno. */
function tipsDismissed(){ return !!state.catalog.onboardingDismissed; }
function dismissTips(){ state.catalog.onboardingDismissed=true; touchCatalog(); }
function reactivateTips(){ state.catalog.onboardingDismissed=false; touchCatalog(); }
// Se llama desde render(), antes de armar el HTML (nunca desde vTips(): tocar toast()/render()
// ahí adentro reentraría en el render() que ya está corriendo). Al completarse los 4 pasos se
// descarta sola — no "se recalcula en cada render" como antes, así que aunque después se
// desactive el portal o se borre el único alumno, la tarjeta ya no vuelve a aparecer (salvo
// reactivarla a mano desde Ayuda, ver reactivateTips()).
function checkOnboardingComplete(){
  if(state.catalog.onboardingDismissed) return;
  if(!ONBOARDING_STEPS.every(s=>s.done())) return;
  state.catalog.onboardingDismissed=true;
  state.catalog.updatedAt=Date.now();
  save();
  const id=uid();
  state.toasts=[...state.toasts, {id, text:"¡Listo! Ya diste los primeros pasos.", tone:"ok", undo:null, action:null}];
  setTimeout(()=>{ state.toasts=state.toasts.filter(t=>t.id!==id); render(); }, TOAST_MS);
}

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
function hasPagos(s){ return !!(Number(s.tarifa)>0 && (s.modalidad==="clase"||s.modalidad==="mensual"||s.modalidad==="hora")); }
// Monto de una clase puntual para modalidad "clase"/"hora" (paso 130): en "clase" es la tarifa
// fija de siempre; en "hora" es tarifa × horas dictadas (ver classDurationHours más abajo),
// redondeado al peso — salvo que esa clase puntual tenga su propio monto cargado (c.monto,
// override manual desde "Registrar clase", para cuando una clase puntual vale distinto).
function montoSesion(s, c){
  if(s.modalidad!=="hora") return Number(s.tarifa)||0;
  return (c.monto!=null && c.monto!=="") ? Number(c.monto) : Math.round((Number(s.tarifa)||0)*classDurationHours(c));
}
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
  if(s.modalidad==="clase"||s.modalidad==="hora"){
    const cobradas=clasesMes.filter(c=>c.cobrada);
    const pendientes=clasesMes.filter(c=>!c.cobrada);
    const total=clasesMes.reduce((a,c)=>a+montoSesion(s,c),0);
    const cobrado=cobradas.reduce((a,c)=>a+montoSesion(s,c),0);
    const pendiente=pendientes.reduce((a,c)=>a+montoSesion(s,c),0);
    return { clases:clasesMes.length, total, cobrado, pendiente };
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
// Medios de pago del docente (paso 141) en el pie del recibo — sólo si hay algo cargado en
// Cuenta → Cobros (ver cobrosDocenteFor); mismo criterio de línea condicional que saldo/docente.
function buildReciboText(s, r){
  const doc = docenteFor();
  const cobros = cobrosDocenteFor();
  const medios = [];
  if(cobros.alias) medios.push(`Alias/CVU: ${cobros.alias}`);
  if(cobros.linkMP) medios.push(`Mercado Pago: ${cobros.linkMP}`);
  if(cobros.linkOtro) medios.push(`Otro medio: ${cobros.linkOtro}`);
  return fillTemplateLines(mensajesFor().recibo, {
    numero:r.numero, fecha:fmtDate(r.date), concepto:r.concepto, monto:fmtMoney(r.monto),
    saldo: r.saldo>0 ? `Saldo restante: ${fmtMoney(r.saldo)}` : "",
    alumno:s.name,
    docente: doc.nombre ? `Docente: ${doc.nombre}` : "",
    mediosPago: medios.length ? `Formas de pago:\n${medios.join("\n")}` : "",
    link_pago: cobros.linkMP || cobros.linkOtro || "",
    alias: cobros.alias || "",
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
    if(hasPagos(s) && (s.modalidad==="clase"||s.modalidad==="hora")){
      (s.sessions||[]).forEach(c=>{
        if(isAusente(c) || !mkSet.has(monthKeyOf(c.date))) return;
        rows.push({date:c.date, alumno:s.name, materia:s.subject||"", concepto:"Clase",
          monto:montoSesion(s,c), estado:c.cobrada?"Cobrada":"Pendiente"});
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
function cobrosDocenteFor(){ return state.catalog.cobrosDocente || defaultCobrosDocente(); }
// Sólo https (paso 141): valida los links de pago al cargarlos en Cuenta, para no dejar guardado
// un link http/mal tipeado que después aparezca roto en el portal del alumno.
function isHttpsUrl(v){ if(!v) return true; try{ return new URL(v).protocol==="https:"; }catch(e){ return false; } }
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
// fillTemplateLines (no fillTemplate a secas): así una plantilla que use una variable "sola en su
// línea" (como {link_pago_linea} de "avisoDeuda", paso 141) desaparece del todo cuando esa
// variable viene vacía, en vez de dejar un renglón en blanco — mismo criterio que ya usaba sólo
// el recibo (saldo/docente) desde antes de este paso.
function mensajeTexto(key, vars){ return fillTemplateLines(mensajesFor()[key], vars); }
// Qué de este alumno se comparte en su portal individual (ver s.portalShare, ficha → "Portal
// para este alumno"). Por diseño sólo puede llevar estos tres booleanos — nunca notas, pagos,
// señas ni comentarios privados (ver buildAlumnoBlock() en sync.js, que es lo único que lee esto
// para armar el JSON público).
function portalShareFor(s){ return s.portalShare || {proximaClase:false, tareas:false, avance:false}; }
// Llave a mano (paso 139): fecha de creación/renovación de la llave individual de un alumno,
// guardada en publicado.llavesAt (studentId -> timestamp) — vive dentro del mismo jsonb
// "publicado" que ya viaja en cada "Publicar cambios" (ver publicarPortal en sync.js, que
// preserva esta llave al partir de {...state.portal.publicado}), así que no hace falta ninguna
// columna nueva. Es un vencimiento sólo informativo/de higiene (no lo hace cumplir el backend:
// portal_publico() sigue resolviendo por token, no por fecha) — "Renovar" es simplemente
// regenerar la llave, que ya de por sí corta el link anterior.
function llaveAlumnoCreatedAt(studentId){
  return (state.portal && state.portal.publicado && state.portal.publicado.llavesAt && state.portal.publicado.llavesAt[studentId]) || null;
}
function llaveAlumnoVenceDias(studentId){
  const at = llaveAlumnoCreatedAt(studentId); if(!at) return null;
  return Math.ceil((at + PORTAL_LINK_TTL_DAYS*86400000 - Date.now()) / 86400000);
}
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
    if(hasPagos(s) && (s.modalidad==="clase"||s.modalidad==="hora")){
      (s.sessions||[]).forEach(c=>{
        if(!isAusente(c) && !c.cobrada && daysSince(c.date)>=dias)
          items.push({studentId:s.id, kind:"clase", monto:montoSesion(s,c), date:c.date, sessionId:c.id});
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
// Foto de un alumno a partir de su id (paso 137) — los eventos de agenda (agendaRangeEvents) son
// objetos sintéticos sin s.foto propio, así que el mini-avatar de vAgendaEvent lo busca acá.
function studentFotoFor(studentId){
  const s = state.students.find(x=>x.id===studentId);
  return s ? s.foto : null;
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
// Excepciones por ocurrencia (paso 135): h.exceptions es un objeto {fechaOriginal: override},
// donde fechaOriginal es la fecha que le hubiera tocado por su día de semana habitual. override
// es {cancelled:true} (se saltea esa clase) o {date,time,duration,link,topic} (esa ocurrencia
// puntual quedó movida/editada — date puede ser la misma fecha original u otra distinta, si se
// cambió de día "sólo para esta clase"). Se procesan en dos pasadas: la primera arma las
// ocurrencias "normales" saltando cualquier fecha con excepción (para no duplicarla), la segunda
// agrega cada excepción no cancelada en su fecha final (que puede caer dentro del rango pedido
// aunque su fecha original no, o viceversa).
function agendaRangeEvents(fromDate, toDate){
  const events = [];
  alive().filter(s=>s.status==="activo").forEach(s=>{
    (s.horarios||[]).forEach(h=>{
      const exceptions = h.exceptions || {};
      for(let d=fromDate; d<=toDate; d=addDays(d,1)){
        if(h.day!==weekdayIdx(d)) continue;
        if(Object.prototype.hasOwnProperty.call(exceptions,d)) continue; // lo cubre la 2da pasada (o está cancelada)
        events.push({studentId:s.id, studentName:s.name, subject:s.subject, subjectId:s.subjectId,
          date:d, time:h.time, duration:Number(h.duration)||60, kind:"horario", sourceId:h.id,
          origDate:d, link:linkVideollamadaFor(s,h.link)});
      }
      Object.keys(exceptions).forEach(origDate=>{
        const ex=exceptions[origDate]; if(!ex || ex.cancelled) return;
        const date=ex.date||origDate;
        if(date<fromDate || date>toDate) return;
        events.push({studentId:s.id, studentName:s.name, subject:s.subject, subjectId:s.subjectId,
          date, time:ex.time||h.time, duration:Number(ex.duration||h.duration)||60,
          kind:"horario", sourceId:h.id, origDate, moved:date!==origDate, topic:ex.topic||"",
          link:linkVideollamadaFor(s, ex.link!=null?ex.link:h.link)});
      });
    });
    (s.clasesPuntuales||[]).forEach(p=>{
      if(p.cancelada) return;
      if(p.date>=fromDate && p.date<=toDate) events.push({
        studentId:s.id, studentName:s.name, subject:s.subject, subjectId:s.subjectId,
        date:p.date, time:p.time, duration:Number(p.duration)||60,
        kind:"puntual", sourceId:p.id, seniaEstado:p.seniaEstado, topic:p.topic||"",
        link:linkVideollamadaFor(s,p.link) });
    });
  });
  return events;
}
// resuelve la ocurrencia que está editando el popover de la agenda (paso 135) con sus valores
// vigentes ahora mismo (aplicando la excepción de ese horario si la hay) — separado de los
// eventos ya expandidos de agendaRangeEvents porque edit.origDate puede no caer en ningún rango
// que se esté mostrando en pantalla (p.ej. si ya se editó "sólo esta clase" y se movió lejos).
function findAgendaEditEvent(edit){
  if(!edit) return null;
  const s = state.students.find(x=>x.id===edit.studentId); if(!s) return null;
  if(edit.kind==="puntual"){
    const p=(s.clasesPuntuales||[]).find(x=>x.id===edit.sourceId); if(!p || p.cancelada) return null;
    return {studentId:s.id, studentName:s.name, subject:s.subject, subjectId:s.subjectId, s,
      kind:"puntual", sourceId:p.id, date:p.date, time:p.time, duration:Number(p.duration)||60,
      link:p.link||"", topic:p.topic||"", seniaEstado:p.seniaEstado};
  }
  const h=(s.horarios||[]).find(x=>x.id===edit.sourceId); if(!h) return null;
  const ex=(h.exceptions||{})[edit.origDate];
  if(ex && ex.cancelled) return null;
  return {studentId:s.id, studentName:s.name, subject:s.subject, subjectId:s.subjectId, s, horario:h,
    kind:"horario", sourceId:h.id, origDate:edit.origDate,
    date: ex ? (ex.date||edit.origDate) : edit.origDate,
    time: ex ? (ex.time||h.time) : h.time,
    duration: Number(ex ? (ex.duration||h.duration) : h.duration)||60,
    link: ex && ex.link!=null ? ex.link : (h.link||""),
    topic: ex ? (ex.topic||"") : ""};
}
// ¿esta ocurrencia (studentId+kind+sourceId+date) se superpone con otra clase el mismo día? —
// mismo criterio que markOverlaps(), recalculado sólo para la fecha de la ocurrencia que se está
// editando en el popover.
function agendaEditOverlap(ev){
  if(!ev) return false;
  const events = markOverlaps(agendaRangeEvents(ev.date, ev.date));
  const match = events.find(e=>e.kind===ev.kind && e.sourceId===ev.sourceId && e.date===ev.date);
  return match ? match.overlap : false;
}
// aplica un cambio de día/hora/duración/link a una ocurrencia de horario habitual: "todas" cambia
// el horario recurrente entero (patch.date, si vino, sólo se usa para derivar el nuevo día de la
// semana — no se guarda una fecha puntual en un horario recurrente); "solo" en cambio genera/edita
// la excepción de esa fecha puntual, dejando el resto de la recurrencia intacta.
function applyHorarioEdit(studentId, horarioId, origDate, patch, scope){
  const s = state.students.find(x=>x.id===studentId); if(!s) return;
  if(scope==="todas"){
    const horarios = (s.horarios||[]).map(h=>{
      if(h.id!==horarioId) return h;
      const next = {...h};
      if(patch.time!=null) next.time=patch.time;
      if(patch.duration!=null) next.duration=Number(patch.duration)||60;
      if(patch.link!=null) next.link=patch.link;
      if(patch.date!=null) next.day=weekdayIdx(patch.date);
      return next;
    });
    update(studentId,{horarios});
  }else{
    const h=(s.horarios||[]).find(x=>x.id===horarioId); if(!h) return;
    const prevEx=(h.exceptions||{})[origDate]||{};
    const merged={
      date: patch.date!=null?patch.date:(prevEx.date||origDate),
      time: patch.time!=null?patch.time:(prevEx.time||h.time),
      duration: patch.duration!=null?(Number(patch.duration)||60):(prevEx.duration||h.duration),
      link: patch.link!=null?patch.link:(prevEx.link!=null?prevEx.link:h.link),
      topic: patch.topic!=null?patch.topic:(prevEx.topic||""),
    };
    const exceptions={...(h.exceptions||{}), [origDate]:merged};
    const horarios=s.horarios.map(x=>x.id===horarioId?{...x,exceptions}:x);
    update(studentId,{horarios});
  }
}
// cancela (ausencia) una única ocurrencia de un horario recurrente sin tocar el resto — deja una
// excepción {cancelled:true} en esa fecha puntual.
function cancelHorarioOccurrence(studentId, horarioId, origDate){
  const s = state.students.find(x=>x.id===studentId); if(!s) return;
  const h=(s.horarios||[]).find(x=>x.id===horarioId); if(!h) return;
  const exceptions={...(h.exceptions||{}), [origDate]:{cancelled:true}};
  const horarios=s.horarios.map(x=>x.id===horarioId?{...x,exceptions}:x);
  update(studentId,{horarios});
}
// edita una clase puntual en el lugar (fecha/hora/duración/link/tema) — a diferencia de un
// horario habitual, una clase puntual siempre es una única ocurrencia, así que no hace falta
// preguntar alcance.
function editPuntualClase(studentId, puntualId, patch){
  const s = state.students.find(x=>x.id===studentId); if(!s) return;
  const clasesPuntuales=(s.clasesPuntuales||[]).map(x=>x.id===puntualId?{...x,...patch}:x);
  update(studentId,{clasesPuntuales});
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
// crea una próxima clase (agendado suelto, s.clasesPuntuales) para studentId — usado desde
// "Registrar clase" → "Próxima clase" en la ficha y desde "Programar clase acá" en la agenda
// mensual — snapshotea la seña si el alumno la tiene activa y devuelve un aviso (o null) si la
// clase anterior de ese alumno todavía tiene la seña sin cobrar.
function addPuntualClase(studentId, date, time, duration, link, topic){
  const s = state.students.find(x=>x.id===studentId); if(!s) return {warning:null};
  const nueva = {id:uid(), date, time, duration, link:link||"", topic:topic||""};
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
// sin rol conocido todavía se degrada a "profesor" — nunca admin por defecto. En modo demo
// (IS_DEMO) esto siempre da false, aunque el visitante tenga una sesión de admin real guardada
// en el mismo navegador (getSes() lee la cookie tal cual): el modo demo manda siempre, nunca
// muestra el panel admin ni el rótulo de administrador (paso 145).
function sesIsAdmin(ses){ return !IS_DEMO && !!(ses && ses.role==="admin"); }
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
    state.editUnitId=null; state.editSubunitId=null;
    loadMateriales(item.id);
  }
}

/* ============ modo demo (paso 95, sobre el paso 82; ampliado a vidriera total en el paso 145):
   ?demo=1 carga este cuaderno ficticio en memoria — nunca toca localStorage ni el backend (ver
   IS_DEMO en config.js, el guard de save() acá abajo, el de ensureToken() en auth.js y los guards
   IS_DEMO de loadPortal()/loadMateriales() y compañía en sync.js). Se reconstruye entera en CADA
   carga de la página (load() llama a esto de nuevo siempre) y todas las fechas son relativas a
   hoy (addDays/today/Date.now) para que se vea siempre vigente, nunca vieja, sin importar cuándo
   se abra. Pensada para que quien la recorra vea al toque casi todo lo que la app sabe hacer:
   ~32 alumnos repartidos desigual entre 5 materias (Análisis Matemático I como la más numerosa,
   para que "El aula" del paso 138 se vea bien poblada), carreras vinculadas a materias (paso
   129), unidades con subunidades y material por unidad (paso 128), alumnos por hora/clase/
   mensuales (paso 130), señas y deudas variadas, dos pausados, ausencias con motivo (paso 113),
   un cumpleaños hoy, exámenes próximos, objetivos con racha, etiquetas (paso 103), interesados
   (paso 119), agenda de la semana con clases superpuestas y una próxima clase agendada, medios
   de cobro del docente (paso 141), papelera con dos entradas (un alumno y una materia) y varios
   meses de historial para que Estadísticas y Retención no se vean vacías. Los materiales son
   sólo la entrada liviana que ya vive en catalog.subjects[].materiales — nunca se sube ni se
   lista nada de Storage real (ver materialesIndexFor() en sync.js: lee ese mismo array local).
   La sesión demo nunca muestra el panel admin, sea cual sea la sesión real guardada en el mismo
   navegador — ver sesIsAdmin() en este archivo, que siempre da false con IS_DEMO activo. ============ */
function buildDemoData(){
  // Strings sin normalizar todavía (mismo formato que un cuaderno viejo) — normalizeUnits() más
  // abajo, en cada materia, es la única que las convierte a objetos {id,nombre,orden,subunidades}.
  // Los topics siguen clave por el texto del nombre, así que usar el string crudo acá (en vez del
  // objeto ya normalizado) es intencional, no un descuido.
  const unitsOf = id => (SUBJECT_TEMPLATES.find(t=>t.id===id)||{units:[]}).units;
  const atDaysAgo = n => new Date(Date.now()-n*86400000).toISOString();
  const catalog = defaultCatalog();

  // Carreras (paso 129): con id propio para poder vincularlas a materias (subject.careerIds) sin
  // depender de que normalizeCatalogCareers() les invente uno más abajo.
  const careerIng = {id:uid(), nombre:"Ingeniería"};
  const careerLic = {id:uid(), nombre:"Licenciatura"};
  const careerArq = {id:uid(), nombre:"Arquitectura"};
  const careerIngresante = {id:uid(), nombre:"Ingresante"};
  catalog.careers = [careerIng, careerLic, careerArq, careerIngresante];

  // Unidades por materia, con id propio para poder sumarles subunidades (paso 127/128) y
  // etiquetar materiales por unidad antes de armar catalog.subjects.
  const am1Units = normalizeUnits(unitsOf("tpl-analisis-1"));
  am1Units[2].subunidades = [{id:uid(),nombre:"Derivada de funciones básicas"},{id:uid(),nombre:"Regla de la cadena"}];
  const algUnits = normalizeUnits(unitsOf("tpl-algebra"));
  const ingUnits = normalizeUnits(unitsOf("tpl-matematica-ingreso"));
  const fis1Units = normalizeUnits(unitsOf("tpl-fisica-1"));
  fis1Units[0].subunidades = [{id:uid(),nombre:"MRU y MRUV"},{id:uid(),nombre:"Tiro oblicuo"}];
  const quiUnits = normalizeUnits(unitsOf("tpl-quimica-general"));

  catalog.subjects = [
    { id:"demo-am1", name:"Análisis Matemático I", units:am1Units, color:"teal", careerIds:[careerIng.id,careerLic.id],
      materiales:[
        {name:"guia3-Guía de ejercicios — Unidad 3.pdf", bytes:842000, compartido:true, at:atDaysAgo(30), unitId:am1Units[2].id},
        {name:"resder-Resumen de derivadas.pdf", bytes:210000, compartido:true, at:atDaysAgo(12), unitId:am1Units[2].id},
        {name:"guiaint-Guía de integrales.pdf", bytes:390000, compartido:true, at:atDaysAgo(6)},
      ] },
    { id:"demo-alg", name:"Álgebra y Geometría Analítica", units:algUnits, color:"indigo", careerIds:[careerIng.id],
      materiales:[
        {name:"guiamat-Guía de matrices y determinantes.pdf", bytes:530000, compartido:true, at:atDaysAgo(18), unitId:algUnits[2].id},
      ] },
    { id:"demo-ing", name:"Matemática básica / ingreso", units:ingUnits, color:"slate", careerIds:[careerIngresante.id], materiales:[] },
    { id:"demo-fis1", name:"Física I", units:fis1Units, color:"blue", careerIds:[careerIng.id,careerArq.id],
      materiales:[
        {name:"formcin-Fórmulas de cinemática.pdf", bytes:96000, compartido:false, at:atDaysAgo(5), unitId:fis1Units[0].id},
      ] },
    { id:"demo-qui", name:"Química General", units:quiUnits, color:"amber", careerIds:[careerIng.id], materiales:[] },
  ];
  catalog.docente = {nombre:"Prof. Demo", telefono:"11-5555-0100", dni:"30111222"};
  // Cobros (paso 141): con alias y link cargados para que se vea armado en Cuenta y en el portal
  // individual de Lucía/Valentina (las dos con llave individual, ver el portal más abajo).
  catalog.cobrosDocente = {alias:"prof.demo.mp", linkMP:"https://link.mercadopago.com.ar/profdemo", linkOtro:"", qr:null};
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

  // Etiquetas libres (paso 103) — asignadas más abajo a algunos alumnos vía tagIds.
  const tagBuenRitmo = {id:uid(), label:"Buen ritmo", color:"green"};
  const tagRefuerzo = {id:uid(), label:"Requiere refuerzo", color:"rose"};
  const tagRecomendado = {id:uid(), label:"Recomendado por otro alumno", color:"blue"};
  catalog.tags = [tagBuenRitmo, tagRefuerzo, tagRecomendado];

  // Interesados (paso 119): lista de espera aparte de state.students, con los cuatro estados del
  // ciclo representados.
  catalog.interesados = [
    {id:uid(), nombre:"Camila Suárez", contacto:"11-4444-2201", materia:"Análisis Matemático I", nota:"Preguntó por videollamada, todavía no arrancó.", estado:"en_charla"},
    {id:uid(), nombre:"Lautaro Ibáñez", contacto:"11-4444-2202", materia:"Física I", nota:"Recomendado por Valentina Ruiz.", estado:"consulto"},
    {id:uid(), nombre:"Zoe Fernández", contacto:"11-4444-2203", materia:"Química General", nota:"Arranca la semana que viene.", estado:"arranca"},
    {id:uid(), nombre:"Marcos Villa", contacto:"11-4444-2204", materia:"Álgebra y Geometría Analítica", nota:"Consultó precio, no volvió a escribir.", estado:"no_arranca"},
  ];

  const students = [];
  const mk = (over) => ({
    id: uid(), career:"Ingeniería", chair:"", notes:"", informeComment:"", phone:"",
    tarifa:"", modalidad:"", pagos:[], recibos:[], examResults:[],
    horarios:[], clasesPuntuales:[], seniaActiva:false, seniaTipo:"monto", seniaValor:"",
    contratoResponsable:"", contratoDni:"", contratoFechaInicio:"", contratoClausulas:"",
    startDate: addDays(today(),-60), status:"activo", semaforo:"sd", examDate:"", birthDate:"",
    topics:{}, sessions:[], simulacros:[], portalShare:null, tagIds:[], updatedAt:Date.now(),
    ...over,
  });
  const sess = (daysAgo, topic, tarea, cobrada, objetivo, objetivoResult) => ({
    id:uid(), date:addDays(today(),-daysAgo), topic, tarea:tarea||"sd", note:"",
    duration:60, cobrada:!!cobrada,
    objetivo: objetivo||"", objetivoResult: objetivoResult||null,
  });
  // Marca una clase ya creada como ausencia con motivo (paso 113) — se aplica sobre el objeto que
  // devuelve sess(), no lo reemplaza, para no tener que repetir sus demás campos.
  const ausente = (session, motivo, cobra) => { session.ausente={motivo,cobra}; return session; };
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
    name:"Lucía Fernández", subject:"Análisis Matemático I", subjectId:"demo-am1", career:"Ingeniería",
    semaforo:"verde", examDate:addDays(today(),10), tarifa:8000, modalidad:"clase", tagIds:[tagBuenRitmo.id],
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
    name:"Martín Gómez", subject:"Física I", subjectId:"demo-fis1", career:"Ingeniería",
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

  // 13) Ignacio — modalidad "por hora" (paso 130): tarifa por hora, clases de duración variable
  //     (45', 60', 90'), una ya cobrada, otra pendiente y una con monto manual distinto al
  //     calculado (clase de repaso más cara) — para ver el cálculo tarifa × horas en la demo.
  const ignacio = mk({
    name:"Ignacio Vega", subject:"Análisis Matemático I", subjectId:"demo-am1",
    semaforo:"amarillo", examDate:addDays(today(),25), tarifa:10000, modalidad:"hora",
    topics:{[unitsOf("tpl-analisis-1")[0]]:"visto",[unitsOf("tpl-analisis-1")[1]]:"practica"},
    sessions:[
      {id:uid(), date:addDays(today(),-18), topic:"Límites y continuidad", tarea:"hecha", note:"", duration:60, monto:null, cobrada:true},
      {id:uid(), date:addDays(today(),-11), topic:"Derivadas", tarea:"intentada", note:"", duration:45, monto:null, cobrada:true},
      {id:uid(), date:addDays(today(),-4), topic:"Derivadas", tarea:"hecha", note:"Repaso extra antes del parcial, clase más larga.", duration:90, monto:20000, cobrada:false},
    ],
  });
  ignacio.recibos=[recibo("clase","Clase del "+fmtDate(addDays(today(),-18)),10000,18)];
  students.push(ignacio);

  // 14) Delfina — también "por hora", tarifa más baja, sólo clases cortas de 30' de repaso puntual
  students.push(mk({
    name:"Delfina Aguirre", subject:"Química General", subjectId:"demo-qui",
    semaforo:"verde", tarifa:6000, modalidad:"hora",
    topics:{[unitsOf("tpl-quimica-general")[0]]:"visto"},
    sessions:[
      {id:uid(), date:addDays(today(),-9), topic:"Tabla periódica y propiedades", tarea:"hecha", note:"", duration:30, monto:null, cobrada:true},
      {id:uid(), date:addDays(today(),-2), topic:"Enlace químico", tarea:"hecha", note:"", duration:30, monto:null, cobrada:false},
    ],
  }));

  // 15) Mariano — rindió ayer y todavía no cargaste el resultado (dispara la pregunta del tablero)
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

  // 16) papelera: un alumno de ejemplo ya borrado, restaurable como en una cuenta real
  students.push({...mk({
    name:"Alumno de prueba", subject:"Análisis Matemático I", subjectId:"demo-am1",
    sessions:[ sess(40,"Números reales y funciones","hecha",true) ],
  }), deleted:true, deletedAt: Date.now()-3*86400000});

  // ============ paso 145: vidriera total — alumnos nuevos para llegar a ~32 y cubrir todo lo
  // que todavía no tenía ejemplo (ausencias con motivo, cumpleaños hoy, segundo pausado, segunda
  // papelera, más etiquetas, más historial y una agenda más poblada). ============

  // 17) Milagros — Análisis I, faltó avisando con tiempo (no corresponde cobrarle)
  students.push(mk({
    name:"Milagros Funes", subject:"Análisis Matemático I", subjectId:"demo-am1", career:"Ingeniería",
    semaforo:"amarillo", examDate:addDays(today(),18), tarifa:8000, modalidad:"clase", tagIds:[tagRefuerzo.id],
    topics:{[unitsOf("tpl-analisis-1")[0]]:"parcial",[unitsOf("tpl-analisis-1")[1]]:"pendiente"},
    sessions:[
      sess(17,"Límites y continuidad","hecha",true),
      ausente(sess(10,"Derivadas","sd",false),"aviso_tiempo",false),
      sess(3,"Derivadas","intentada",true,"Repasar reglas de derivación",{estado:"medias",pct:50}),
    ],
  }));

  // 18) Franco — Análisis I, cumple hoy (para el efecto "wow" del tablero)
  students.push(mk({
    name:"Franco Benítez", subject:"Análisis Matemático I", subjectId:"demo-am1", career:"Licenciatura",
    semaforo:"verde", examDate:addDays(today(),22), tarifa:8000, modalidad:"clase", birthDate:"2003-"+today().slice(5),
    topics:{[unitsOf("tpl-analisis-1")[0]]:"visto"},
    sessions:[ sess(6,"Números reales y funciones","hecha",true), sess(0,"Límites y continuidad","hecha",true) ],
  }));

  // 19) Rocío — Análisis I, en riesgo, horario habitual mañana a la tarde
  students.push(mk({
    name:"Rocío Cabrera", subject:"Análisis Matemático I", subjectId:"demo-am1", career:"Ingeniería",
    semaforo:"amarillo", examDate:addDays(today(),15), tarifa:8000, modalidad:"clase",
    horarios:[{id:uid(), day:weekdayIdx(addDays(today(),1)), time:"16:00", duration:60}],
    topics:{[unitsOf("tpl-analisis-1")[0]]:"parcial",[unitsOf("tpl-analisis-1")[1]]:"pendiente"},
    sessions: weekly(8,"Límites y continuidad",15),
  }));

  // 20) Santiago — Análisis I, complicado y con deuda de dos clases
  students.push(mk({
    name:"Santiago Ojeda", subject:"Análisis Matemático I", subjectId:"demo-am1", career:"Ingeniería",
    semaforo:"rojo", examDate:addDays(today(),8), tarifa:8000, modalidad:"clase",
    sessions:[
      sess(19,"Números reales y funciones","intentada",false),
      sess(12,"Límites y continuidad","no",false),
    ],
  }));

  // 21) Abril — Análisis I, mensual, buena racha de objetivos
  students.push(mk({
    name:"Abril Medina", subject:"Análisis Matemático I", subjectId:"demo-am1", career:"Licenciatura",
    semaforo:"verde", tarifa:34000, modalidad:"mensual",
    pagos:[
      {id:uid(), date:addDays(today(),-63), amount:34000},
      {id:uid(), date:addDays(today(),-33), amount:34000},
      {id:uid(), date:addDays(today(),-3), amount:34000},
    ],
    topics:{[unitsOf("tpl-analisis-1")[0]]:"parcial",[unitsOf("tpl-analisis-1")[1]]:"parcial"},
    sessions:[
      ...weekly(4,"Límites y continuidad",45),
      sess(9,"Derivadas","hecha",true,"Reglas básicas de derivación",{estado:"si",pct:100}),
      sess(2,"Derivadas","hecha",true,"Derivada de un producto",{estado:"si",pct:100}),
    ],
  }));

  // 22) Federico — Análisis I, recomendado por otro alumno, al día
  students.push(mk({
    name:"Federico Alonso", subject:"Análisis Matemático I", subjectId:"demo-am1", career:"Ingeniería",
    semaforo:"verde", examDate:addDays(today(),35), tarifa:8000, modalidad:"clase", tagIds:[tagRecomendado.id],
    topics:{[unitsOf("tpl-analisis-1")[0]]:"visto"},
    sessions: weekly(5,"Números reales y funciones",30),
  }));

  // 23) Pilar — Física I, pausada (segundo pausado de la demo)
  students.push(mk({
    name:"Pilar Duarte", subject:"Física I", subjectId:"demo-fis1", career:"Arquitectura",
    status:"pausado", semaforo:"sd",
    sessions:[ sess(50,"Cinemática","hecha",true) ],
  }));

  // 24) Joaquín — Física I, faltó sin avisar (corresponde cobrarle) y debe la última clase
  students.push(mk({
    name:"Joaquín Silva", subject:"Física I", subjectId:"demo-fis1", career:"Ingeniería",
    semaforo:"rojo", examDate:addDays(today(),12), tarifa:9500, modalidad:"clase",
    sessions:[
      sess(14,"Cinemática","hecha",true),
      ausente(sess(7,"Leyes de Newton","sd",true),"no_aviso",true),
      sess(1,"Leyes de Newton","intentada",false),
    ],
  }));

  // 25) Catalina — Física I, examen próximo, buena racha
  students.push(mk({
    name:"Catalina Rey", subject:"Física I", subjectId:"demo-fis1", career:"Arquitectura",
    semaforo:"verde", examDate:addDays(today(),9), tarifa:9500, modalidad:"clase",
    horarios:[{id:uid(), day:weekdayIdx(addDays(today(),2)), time:"18:30", duration:60}],
    topics:{[unitsOf("tpl-fisica-1")[0]]:"parcial",[unitsOf("tpl-fisica-1")[1]]:"practica"},
    sessions:[
      sess(13,"Cinemática","hecha",true,"Repasar tiro oblicuo",{estado:"si",pct:100}),
      sess(6,"Leyes de Newton","hecha",true,"Diagramas de cuerpo libre",{estado:"si",pct:100}),
    ],
  }));

  // 26) Bautista — Química General, segunda entrada de la papelera
  students.push({...mk({
    name:"Bautista Correa", subject:"Química General", subjectId:"demo-qui", career:"Ingeniería",
    sessions:[ sess(28,"Estructura atómica","hecha",true) ],
  }), deleted:true, deletedAt: Date.now()-86400000});

  // 27) Antonella — Química General, al día, sin sobresaltos
  students.push(mk({
    name:"Antonella Vega", subject:"Química General", subjectId:"demo-qui", career:"Ingeniería",
    semaforo:"verde", examDate:addDays(today(),28), tarifa:9200, modalidad:"clase",
    topics:{[unitsOf("tpl-quimica-general")[0]]:"visto",[unitsOf("tpl-quimica-general")[1]]:"parcial"},
    sessions: weekly(6,"Tabla periódica y propiedades",40),
  }));

  // 28) Guadalupe — Álgebra, avance parejo
  students.push(mk({
    name:"Guadalupe Ríos", subject:"Álgebra y Geometría Analítica", subjectId:"demo-alg", career:"Ingeniería",
    semaforo:"verde", examDate:addDays(today(),33), tarifa:8500, modalidad:"clase",
    topics:{[unitsOf("tpl-algebra")[0]]:"visto",[unitsOf("tpl-algebra")[1]]:"parcial"},
    sessions: weekly(7,"Vectores en el plano y el espacio",20),
  }));

  // 29) Thiago — Álgebra, atrasado con el cobro de dos clases
  students.push(mk({
    name:"Thiago Navarro", subject:"Álgebra y Geometría Analítica", subjectId:"demo-alg", career:"Ingeniería",
    semaforo:"amarillo", tarifa:8500, modalidad:"clase",
    sessions:[
      sess(23,"Vectores en el plano y el espacio","hecha",false),
      sess(16,"Rectas y planos","hecha",false),
      sess(9,"Rectas y planos","intentada",true),
    ],
  }));

  // 30) Constanza — Álgebra, avisó tarde una falta (corresponde cobrarle) y examen próximo
  students.push(mk({
    name:"Constanza Herrera", subject:"Álgebra y Geometría Analítica", subjectId:"demo-alg", career:"Ingeniería",
    semaforo:"rojo", examDate:addDays(today(),7), tarifa:8500, modalidad:"clase",
    sessions:[
      sess(15,"Vectores en el plano y el espacio","hecha",true),
      ausente(sess(8,"Rectas y planos","sd",true),"aviso_tarde",true),
      sess(1,"Rectas y planos","intentada",true),
    ],
  }));

  // 31) Benicio — ingreso, mensual, recién arrancando
  students.push(mk({
    name:"Benicio Torres", subject:"Matemática básica / ingreso", subjectId:"demo-ing", career:"Ingresante",
    semaforo:"verde", tarifa:31000, modalidad:"mensual",
    pagos:[ {id:uid(), date:addDays(today(),-25), amount:31000} ],
    horarios:[{id:uid(), day:weekdayIdx(addDays(today(),5)), time:"19:00", duration:60}],
    topics:{[unitsOf("tpl-matematica-ingreso")[0]]:"visto"},
    sessions: weekly(4,"Conjuntos numéricos",20),
  }));

  // 32) Emilia — ingreso, faltó avisando con tiempo, no corresponde cobrarle
  students.push(mk({
    name:"Emilia Castro", subject:"Matemática básica / ingreso", subjectId:"demo-ing", career:"Ingresante",
    semaforo:"amarillo", tarifa:30000, modalidad:"mensual",
    pagos:[ {id:uid(), date:addDays(today(),-40), amount:30000} ],
    topics:{[unitsOf("tpl-matematica-ingreso")[0]]:"parcial"},
    sessions:[
      sess(18,"Expresiones algebraicas","hecha",true),
      ausente(sess(11,"Ecuaciones e inecuaciones","sd",false),"aviso_tiempo",false),
      sess(4,"Ecuaciones e inecuaciones","hecha",true),
    ],
  }));

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

  normalizeCatalogUnits(catalog); // por si algo (ej. la materia de la papelera, arriba) quedó con units sin normalizar
  normalizeCatalogCareers(catalog, students);
  return { students, catalog, portal };
}
