"use strict";
/* ============ sincronización con Supabase (prioridad offline), merge ============ */
function mergeStudents(local,remote){
  const m=new Map();
  [...local,...remote].forEach(s=>{
    const prev=m.get(s.id);
    if(!prev || (s.updatedAt||0)>(prev.updatedAt||0)) m.set(s.id,s);
  });
  return [...m.values()];
}
// Serialización estable (arrays de estudiantes ordenados por id, objetos con claves ordenadas)
// para comparar contenido sin que un orden distinto dispare una escritura innecesaria.
function stableStringify(v){
  if(Array.isArray(v)) return "["+v.map(stableStringify).join(",")+"]";
  if(v && typeof v==="object")
    return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+stableStringify(v[k])).join(",")+"}";
  return JSON.stringify(v);
}
function sameStudents(a,b){
  const byId = arr => [...arr].sort((x,y)=> x.id<y.id?-1:x.id>y.id?1:0).map(stableStringify);
  const A=byId(a), B=byId(b);
  return A.length===B.length && A.every((x,i)=>x===B[i]);
}
function setStatus(st,msg){
  state.syncStatus=st; state.syncMsg=msg||"";
  const el=document.getElementById("syncStatus");
  if(el) el.innerHTML=syncStatusText();
}
let syncTimer=null, syncing=false;
function scheduleSync(){ clearTimeout(syncTimer); syncTimer=setTimeout(syncNow,4000); }

// syncNow(force): por defecto arranca con un chequeo liviano (solo updated_at) y evita bajar
// la data completa y escribir cuando no hace falta — es el caso ~95% del tiempo (pestaña
// abierta, sin cambios locales ni remotos). force=true (botón "Sincronizar ahora") se salta
// ese atajo y siempre baja la data completa, igual que antes.
async function syncNow(force){
  const ses=getSes();
  if(!ses){ setStatus("idle"); return; }
  // Paso 177: una cuenta pendiente/rechazada no tiene nada que sincronizar todavía (RLS de
  // cuaderno/portales/storage la bloquea igual, ver 027_cuentas_aprobadas.sql) — cortar acá
  // evita pegarle a la red para nada y ensuciar el estado de sync con errores 403 confusos.
  if(ses.estado==="pendiente"||ses.estado==="rechazado"){ setStatus("idle"); return; }
  if(!navigator.onLine){ setStatus("offline"); return; }
  if(syncing){ scheduleSync(); return; }
  syncing=true; setStatus("sync");
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
    maybeHeartbeat(uid_, s);
    const dirty=isDirty();

    if(!force && !dirty){
      const rc=await fetch(SUPA_URL+"/rest/v1/cuaderno?select=updated_at",{headers:h});
      if(!rc.ok) throw new Error("chequeo "+rc.status);
      const rows=await rc.json();
      if(rows.length){
        const remoteUpdatedAt=rows[0].updated_at;
        if(remoteUpdatedAt===localStorage.getItem(LAST_REMOTE_KEY)){
          // nada cambió ni acá ni en la nube: ni bajamos data ni escribimos nada
          state.lastSync=Date.now();
          setStatus("ok");
          pendingSyncs++;
          maybeSnapshotBackup(uid_, s);
          maybeRenewPortalLibrary(uid_, s);
          maybeSyncHuecosPortal(uid_, s);
          return;
        }
      }
      // la nube tiene una versión distinta a la última que vimos (u nunca sincronizamos
      // este dispositivo): cae al camino completo de abajo para bajar la data y mergear
    }

    const before=JSON.stringify({a:state.students,b:state.catalog});
    const r=await fetch(SUPA_URL+"/rest/v1/cuaderno?select=data,updated_at",{headers:h});
    if(!r.ok) throw new Error("lectura "+r.status);
    const rows=await r.json();
    const row=rows[0];
    const rd=(row&&row.data)?row.data:{};
    const remote=Array.isArray(rd.students)?rd.students:[];
    const merged=mergeStudents(state.students,remote);
    let catalog=state.catalog;
    if(rd.catalog && Array.isArray(rd.catalog.subjects) &&
       (rd.catalog.updatedAt||0) > (state.catalog.updatedAt||0))
      catalog=rd.catalog;
    if(!Array.isArray(catalog.packs)) catalog.packs=[];
    if(!Array.isArray(catalog.trash)) catalog.trash=[];
    normalizeCatalogUnits(catalog); // el catálogo remoto puede venir de un dispositivo con un cuaderno viejo (units como strings)
    normalizeCatalogCareers(catalog, merged); // idem para careers, ver el comentario en helpers.js

    let remoteUpdatedAt=row?row.updated_at:null;
    const needsWrite = dirty || !row || !sameStudents(merged,remote) ||
      stableStringify(catalog)!==stableStringify(rd.catalog||{});
    if(needsWrite){
      const up=await fetch(SUPA_URL+"/rest/v1/cuaderno?select=updated_at",{method:"POST",
        headers:{...h, Prefer:"resolution=merge-duplicates,return=representation"},
        body:JSON.stringify([{user_id:uid_, data:{students:merged, catalog:catalog}, updated_at:new Date().toISOString()}])});
      if(!up.ok) throw new Error("escritura "+up.status);
      const upRows=await up.json().catch(()=>[]);
      if(upRows[0] && upRows[0].updated_at) remoteUpdatedAt=upRows[0].updated_at;
      setDirty(false);
    }

    state.students=merged; state.catalog=catalog;
    try{ localStorage.setItem(KEY, JSON.stringify({students:merged, catalog:catalog})); }catch(e){}
    if(remoteUpdatedAt) localStorage.setItem(LAST_REMOTE_KEY, remoteUpdatedAt);
    state.lastSync=Date.now();
    setStatus("ok");
    pendingSyncs++;
    // re-dibujar solo si la nube trajo cambios (para no interrumpir si estás escribiendo)
    if(JSON.stringify({a:state.students,b:state.catalog})!==before && state.view!=="cuenta" && state.view!=="catalog") render();
    maybeSnapshotBackup(uid_, s);
    maybeRenewPortalLibrary(uid_, s);
    maybeSyncHuecosPortal(uid_, s);
  }catch(e){
    // offline se chequea primero: una falla de red (incluido el refresh del token) mientras
    // no hay internet nunca debe cerrar la sesión ni bloquear la app — solo degrada el estado.
    if(!navigator.onLine){ setStatus("offline"); }
    else if(String(e.message)==="no-session" || String(e.message).toLowerCase().includes("refresh")){
      setSes(null); render();
    }
    else setStatus("error", friendlyAuthError(e));
  }finally{ syncing=false; }
}
window.addEventListener("online", ()=>syncNow());
window.addEventListener("offline", ()=>setStatus("offline"));
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden && getSes()) syncNow(); });
setInterval(()=>{ if(getSes() && !document.hidden) syncNow(); }, 10*60*1000);

/* ============ heartbeat de presencia (tabla perfiles) + métricas de actividad ============ */
// Se cuelga del ciclo de sync existente (no arranca timers propios): se llama desde
// syncNow() en cada intento real de sync, que ya solo ocurre con la pestaña visible
// (arranque, volver a la pestaña, o el intervalo de 10min que también chequea
// document.hidden) o al recuperar conexión. Acá adentro nos aseguramos una vez más de
// la visibilidad (por si algún caller llega a cambiar) y de no mandar más de un PATCH/RPC
// cada 5 minutos.
let lastHeartbeat=0, aperturaRegistrada=false, pendingSyncs=0;
async function maybeHeartbeat(uid_, s){
  if(document.hidden) return;
  if(Date.now()-lastHeartbeat < 5*60*1000) return;
  lastHeartbeat=Date.now();
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
  try{
    await fetch(SUPA_URL+"/rest/v1/perfiles?user_id=eq."+encodeURIComponent(uid_), {method:"PATCH", headers:h,
      body:JSON.stringify({last_seen_at:new Date().toISOString(), plataforma:detectPlatform(), version:APP_VERSION})});
  }catch(e){ /* silencioso: offline o falla puntual, nunca interrumpe al usuario */ }

  // registrar_actividad(n_aperturas, n_syncs) suma sobre el día del usuario autenticado.
  // "1 apertura" se manda una sola vez por sesión de uso (primer heartbeat elegible, que en
  // la práctica coincide con el arranque de la app); los syncs se cuentan localmente
  // (pendingSyncs, incrementado en syncNow) y se despachan acumulados junto al heartbeat.
  const nAperturas = aperturaRegistrada ? 0 : 1;
  const nSyncs = pendingSyncs;
  if(nAperturas || nSyncs){
    aperturaRegistrada=true; pendingSyncs=0;
    try{
      await fetch(SUPA_URL+"/rest/v1/rpc/registrar_actividad", {method:"POST", headers:h,
        body:JSON.stringify({n_aperturas:nAperturas, n_syncs:nSyncs})});
    }catch(e){ /* silencioso */ }
  }
  refreshReportesBadge();
  refreshSolicitudesClase();
}

// Registra la aceptación de términos y privacidad (perfiles.terminos_aceptados_at — ver
// 021_terminos.sql en cuaderno-supabase, paso 144). Al crear la cuenta con confirmación de mail
// pendiente todavía no hay sesión con la que hacer el PATCH, así que se guarda el email en
// PENDING_TERMS_KEY y se reintenta acá mismo apenas hay un login exitoso de ese email (ver
// flushPendingTermsAccept(), llamado desde el handler de auth-login en events.js). Los usuarios
// que ya tenían cuenta antes de este paso nunca pasan por acá — se los considera aceptados.
async function registrarAceptacionTerminos(){
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
    await fetch(SUPA_URL+"/rest/v1/perfiles?user_id=eq."+encodeURIComponent(uid_), {method:"PATCH", headers:h,
      body:JSON.stringify({terminos_aceptados_at:new Date().toISOString()})});
  }catch(e){ /* silencioso: si falla, sigue pendiente y se reintenta en el próximo login */ return; }
  try{ localStorage.removeItem(PENDING_TERMS_KEY); }catch(e){}
}
function flushPendingTermsAccept(email){
  let pending=""; try{ pending=localStorage.getItem(PENDING_TERMS_KEY)||""; }catch(e){}
  if(pending && pending===email) registrarAceptacionTerminos();
}

// Opt-in del resumen semanal por mail (perfiles.resumen_semanal — ver 014_resumen_semanal.sql
// en cuaderno-supabase): arranca apagado por defecto; se guarda acá y lo respeta la función de
// cron del backend. Optimista (cambia el toggle al toque) con rollback si falla el PATCH.
async function setResumenSemanal(v){
  const ses=getSes(); if(!ses) return;
  setSes({...ses, resumenSemanal:v}); render();
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
    const r=await fetch(SUPA_URL+"/rest/v1/perfiles?user_id=eq."+encodeURIComponent(uid_), {method:"PATCH", headers:h,
      body:JSON.stringify({resumen_semanal:v})});
    if(!r.ok) throw new Error("error "+r.status);
  }catch(e){
    const cur=getSes(); if(cur) setSes({...cur, resumenSemanal:!v});
    toast("No se pudo guardar — probá de nuevo.", "error");
    render();
  }
}

// Config de "cuántas horas antes" del recordatorio por mail de clases (paso 161,
// perfiles.recordatorio_clases_horas_antes — ver 023_recordatorio_clases_mail.sql): una config por
// CUENTA (no por alumno — el opt-in en sí sí es por alumno, ver s.recordatorioMail en la ficha),
// mismo patrón optimista que setResumenSemanal.
async function setRecordatorioClasesHorasAntes(v){
  const ses=getSes(); if(!ses) return;
  const horas=Math.max(1, Math.min(48, Number(v)||14));
  const prev=ses.recordatorioClasesHorasAntes;
  setSes({...ses, recordatorioClasesHorasAntes:horas}); render();
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
    const r=await fetch(SUPA_URL+"/rest/v1/perfiles?user_id=eq."+encodeURIComponent(uid_), {method:"PATCH", headers:h,
      body:JSON.stringify({recordatorio_clases_horas_antes:horas})});
    if(!r.ok) throw new Error("error "+r.status);
  }catch(e){
    const cur=getSes(); if(cur) setSes({...cur, recordatorioClasesHorasAntes:prev});
    toast("No se pudo guardar — probá de nuevo.", "error");
    render();
  }
}

/* ============ push de recordatorio de las clases del día (paso 108) ============
   Opt-in en perfiles.notif_clases_dia (mismo patrón optimista que setResumenSemanal), más la
   suscripción real del navegador (PushManager) guardada en push_subscriptions — una fila por
   dispositivo, no por cuenta, porque cada dispositivo suscripto recibe el push por separado.
   El envío en sí (firmado VAPID, cron matutino) vive del lado del backend — ver
   018_push_clases.sql y supabase/functions/enviar-push en cuaderno-supabase. */
async function saveSubscription(sub){
  const s=await ensureToken();
  const uid_=jwtSub(s.access);
  const json=sub.toJSON();
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"resolution=merge-duplicates,return=minimal"};
  const r=await fetch(SUPA_URL+"/rest/v1/push_subscriptions?on_conflict=endpoint", {method:"POST", headers:h,
    body:JSON.stringify([{user_id:uid_, endpoint:json.endpoint, p256dh:json.keys.p256dh, auth:json.keys.auth}])});
  if(!r.ok) throw new Error("error "+r.status);
}
async function deletePushSubscriptionRow(endpoint){
  const s=await ensureToken();
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
  await fetch(SUPA_URL+"/rest/v1/push_subscriptions?endpoint=eq."+encodeURIComponent(endpoint), {method:"DELETE", headers:h});
}
async function setNotifClasesDia(v){
  const ses=getSes(); if(!ses) return;
  if(v){
    try{
      if(typeof Notification==="undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)){
        toast("Este dispositivo no soporta notificaciones push.", "error"); return;
      }
      let perm=Notification.permission;
      if(perm==="default") perm=await Notification.requestPermission();
      if(perm!=="granted"){ toast("Necesitás permitir las notificaciones para activar esto.", "error"); return; }
      const reg=await navigator.serviceWorker.ready;
      let sub=await reg.pushManager.getSubscription();
      if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:urlBase64ToUint8Array(VAPID_PUBLIC_KEY)});
      await saveSubscription(sub);
    }catch(e){ toast("No se pudo activar la notificación — probá de nuevo.", "error"); return; }
  }else{
    try{
      const reg=await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(sub){ await deletePushSubscriptionRow(sub.endpoint); await sub.unsubscribe(); }
    }catch(e){ /* silencioso: si falla el borrado local/remoto, apagar el opt-in ya corta el envío del lado del servidor */ }
  }
  setSes({...ses, notifClasesDia:v}); render();
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
    const r=await fetch(SUPA_URL+"/rest/v1/perfiles?user_id=eq."+encodeURIComponent(uid_), {method:"PATCH", headers:h,
      body:JSON.stringify({notif_clases_dia:v})});
    if(!r.ok) throw new Error("error "+r.status);
  }catch(e){
    const cur=getSes(); if(cur) setSes({...cur, notifClasesDia:!v});
    toast("No se pudo guardar — probá de nuevo.", "error");
    render();
  }
}

/* ============ respaldos automáticos con historial ============ */
// Un snapshot completo por día (primera sync exitosa del día), silencioso; se guardan hasta
// MAX_BACKUPS y se recortan los más viejos. Vive aparte de la exportación manual (.json).
async function maybeSnapshotBackup(uid_, s){
  if(localStorage.getItem(BACKUP_DATE_KEY) === today()) return;
  try{
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
    const r=await fetch(SUPA_URL+"/rest/v1/cuaderno_respaldos", {method:"POST", headers:h,
      body:JSON.stringify([{user_id:uid_, data:{students:state.students, catalog:state.catalog}}])});
    if(!r.ok) return; // se reintenta en la próxima sync, sin avisar al usuario
    localStorage.setItem(BACKUP_DATE_KEY, today());
    await trimBackups(uid_, s);
  }catch(e){ /* silencioso */ }
}
async function trimBackups(uid_, s){
  try{
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(SUPA_URL+"/rest/v1/cuaderno_respaldos?select=id&order=created_at.desc", {headers:h});
    if(!r.ok) return;
    const rows=await r.json();
    const toDelete=rows.slice(MAX_BACKUPS).map(x=>x.id);
    if(!toDelete.length) return;
    await fetch(SUPA_URL+"/rest/v1/cuaderno_respaldos?id=in.("+toDelete.map(id=>encodeURIComponent(id)).join(",")+")",
      {method:"DELETE", headers:h});
  }catch(e){ /* silencioso */ }
}
// Lista liviana: solo id/created_at/n_alumnos (columna generada, migración 009) — nada de
// "data". Bajar los N respaldos completos (uno puede ser el cuaderno entero) solo para
// listarlos era el costo que había que eliminar; la data de uno solo se pide al restaurar.
async function loadBackups(){
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(SUPA_URL+"/rest/v1/cuaderno_respaldos?select=id,created_at,n_alumnos&order=created_at.desc", {headers:h});
    if(!r.ok) throw new Error("error "+r.status);
    state.backups=await r.json();
    state.backupsLoaded=true; state.backupsError="";
  }catch(e){
    state.backupsError = !navigator.onLine ? "Sin conexión a internet." : "No se pudieron cargar los respaldos.";
  }
  render();
}
async function restoreBackup(id){
  const entry=(state.backups||[]).find(x=>String(x.id)===String(id));
  if(!entry) return;
  state.restoreStatus="restoring"; state.restoreError=""; render();
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    // la data completa de este respaldo puntual recién se baja acá, al confirmar
    const dr=await fetch(SUPA_URL+"/rest/v1/cuaderno_respaldos?id=eq."+encodeURIComponent(id)+"&select=data", {headers:h});
    if(!dr.ok) throw new Error("no se pudo leer el respaldo");
    const rows=await dr.json();
    const b=rows[0];
    if(!b || !b.data) throw new Error("respaldo vacío");
    const hw={...h, "Content-Type":"application/json", Prefer:"return=minimal"};
    // respaldo extra del estado actual antes de pisarlo
    const safety=await fetch(SUPA_URL+"/rest/v1/cuaderno_respaldos", {method:"POST", headers:hw,
      body:JSON.stringify([{user_id:uid_, data:{students:state.students, catalog:state.catalog}}])});
    if(!safety.ok) throw new Error("no se pudo guardar el respaldo de seguridad");
    await trimBackups(uid_, s);
    // updatedAt fresco: es el campo que decide el merge en syncNow, así el restore
    // gana la próxima sincronización en vez de que el estado remoto (más reciente) lo pise.
    const now=Date.now();
    state.students=(b.data.students||[]).map(x=>({...x, updatedAt:now}));
    state.catalog=normalizeCatalogUnits({packs:[], trash:[], ...(b.data.catalog||defaultCatalog()), updatedAt:now});
    normalizeCatalogCareers(state.catalog, state.students);
    state.confirmRestoreId=null; state.restoreStatus="idle";
    save(); syncNow(); render();
    loadBackups();
  }catch(e){
    state.restoreStatus="error";
    state.restoreError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo restaurar. Probá de nuevo.";
    render();
  }
}

/* ============ reportar un problema / panel admin (reportes y usuarios) ============
   tipo (paso 147): "problema"/"idea"/"me_gusta" (feedback del docente, ver vFeedbackOverlay en
   views.js) o "error_js" (capturado solo por logClientError() más abajo, nunca a mano). vista es
   el state.view en el momento de mandar el reporte — auto-adjunta, sin que el docente tenga que
   escribir dónde estaba. Columnas nuevas en `reportes`, ver migración 021 en cuaderno-supabase. */
async function sendReport(msg, tipo, vista){
  const ses=getSes(); if(!ses) throw new Error("no-session");
  const s=await ensureToken();
  const uid_=jwtSub(s.access);
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
  const r=await fetch(SUPA_URL+"/rest/v1/reportes",{method:"POST", headers:h,
    body:JSON.stringify([{user_id:uid_, email:ses.email, mensaje:msg, tipo:tipo||"problema", vista:vista||"", plataforma:detectPlatform(), version:APP_VERSION}])});
  if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.message||j.msg||("error "+r.status)); }
}
// Errores silenciosos (paso 147): window.onerror/unhandledrejection (enganchados en events.js)
// llaman acá — nunca al revés, para que toda la lógica de rate-limit/sesión/demo viva en un solo
// lugar. Jamás manda datos del cuaderno: sólo mensaje, un stack corto, la vista actual, la
// versión de la app y el user agent (ya via detectPlatform()/APP_VERSION en sendReport). Se frena
// solo a ERROR_LOG_MAX_PER_SESSION por sesión de pestaña (sessionStorage, no localStorage) y todo
// el cuerpo va en un try/catch — este logger jamás puede tirar abajo la app que intenta vigilar.
function errorLogCount(){ try{ return Number(sessionStorage.getItem(ERROR_LOG_COUNT_KEY))||0; }catch(e){ return 0; } }
function bumpErrorLogCount(){ try{ sessionStorage.setItem(ERROR_LOG_COUNT_KEY, String(errorLogCount()+1)); }catch(e){} }
function logClientError(message, stack){
  try{
    if(IS_DEMO) return;
    if(!getSes()) return;
    if(errorLogCount()>=ERROR_LOG_MAX_PER_SESSION) return;
    bumpErrorLogCount();
    const mensaje = String(message||"error").slice(0,300) + (stack?("\n"+String(stack).slice(0,300)):"");
    sendReport(mensaje, "error_js", (typeof state!=="undefined"&&state.view)||"").catch(()=>{});
  }catch(e){ /* el logger nunca puede romper nada, ni siquiera si sendReport tira sincrónico */ }
}
async function loadReportes(){
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(SUPA_URL+"/rest/v1/reportes?select=*&order=created_at.desc",{headers:h});
    if(!r.ok) throw new Error("error "+r.status);
    state.reportes=await r.json();
    state.reportesLoaded=true; state.reportesError="";
    state.reportesPendingCount = state.reportes.filter(x=>x.estado!=="resuelto").length;
  }catch(e){
    state.reportesError = !navigator.onLine ? "Sin conexión a internet." : "No se pudieron cargar los reportes.";
  }
  render();
}
async function loadUsuarios(){
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(SUPA_URL+"/rest/v1/perfiles?select=*&order=last_seen_at.desc.nullslast",{headers:h});
    if(!r.ok) throw new Error("error "+r.status);
    state.users=await r.json();
    state.usersLoaded=true; state.usersError="";
  }catch(e){
    state.usersError = !navigator.onLine ? "Sin conexión a internet." : "No se pudieron cargar los usuarios.";
  }
  render();
}
// Cambia el plan de una cuenta a mano (paso 164) — planes de regalo, corregir una carga,
// etc. Mismo patrón que deleteUsuario: RPC porque perfiles.plan no es actualizable por el
// propio usuario vía PostgREST (ver 024_planes.sql en cuaderno-supabase).
async function setUsuarioPlan(id, plan){
  state.usersPlanStatus=state.usersPlanStatus||{}; state.usersPlanStatus[id]="saving"; state.usersPlanError=""; render();
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
    const r=await fetch(SUPA_URL+"/rest/v1/rpc/admin_set_plan",{method:"POST", headers:h, body:JSON.stringify({objetivo:id, nuevo_plan:plan})});
    if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.message||j.msg||("error "+r.status)); }
    const u=(state.users||[]).find(x=>x.user_id===id); if(u) u.plan=plan;
    delete state.usersPlanStatus[id];
  }catch(e){
    delete state.usersPlanStatus[id];
    state.usersPlanError = !navigator.onLine ? "Sin conexión a internet." : (e.message||"No se pudo cambiar el plan.");
  }
  render();
}
// Aprueba o rechaza una cuenta pendiente (paso 177) — mismo patrón que setUsuarioPlan: RPC
// porque perfiles.estado no es actualizable por el propio usuario vía PostgREST (ver
// 027_cuentas_aprobadas.sql en cuaderno-supabase). Aprobar dispara el mail de bienvenida
// server-side, dentro de la misma función SQL.
async function setUsuarioEstado(id, estado){
  state.usersEstadoStatus=state.usersEstadoStatus||{};
  state.usersEstadoStatus[id]=(estado==="aprobado"?"aprobando":"rechazando");
  state.usersEstadoError=""; render();
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
    const r=await fetch(SUPA_URL+"/rest/v1/rpc/admin_set_estado",{method:"POST", headers:h, body:JSON.stringify({objetivo:id, nuevo_estado:estado})});
    if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.message||j.msg||("error "+r.status)); }
    const u=(state.users||[]).find(x=>x.user_id===id); if(u) u.estado=estado;
    delete state.usersEstadoStatus[id];
  }catch(e){
    delete state.usersEstadoStatus[id];
    state.usersEstadoError = !navigator.onLine ? "Sin conexión a internet." : (e.message||"No se pudo actualizar la cuenta.");
  }
  render();
}
// Listado crudo de una "carpeta" del bucket materiales (mismo endpoint que loadMateriales,
// generalizado a cualquier prefijo). Entradas sin "id" son subcarpetas, no archivos.
async function listStorageFolder(prefix){
  const s=await ensureToken();
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
  const r=await fetch(SUPA_URL+"/storage/v1/object/list/"+MATERIALES_BUCKET,{method:"POST", headers:h,
    body:JSON.stringify({prefix, limit:1000, sortBy:{column:"name",order:"asc"}})});
  if(!r.ok) throw new Error("error "+r.status);
  const list=await r.json();
  return Array.isArray(list) ? list : [];
}
// Borrado en lote por Storage API (no DELETE directo sobre storage.objects, ver
// 015_borrado_storage_api.sql en cuaderno-supabase) — mismo endpoint que usa
// supabase-js .remove(), a pesar del nombre "prefixes" son rutas completas, no prefijos.
async function removeStorageObjects(paths){
  if(!paths.length) return;
  const s=await ensureToken();
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
  const r=await fetch(SUPA_URL+"/storage/v1/object/"+MATERIALES_BUCKET,{method:"DELETE", headers:h,
    body:JSON.stringify({prefixes:paths})});
  if(!r.ok) throw new Error("error "+r.status);
}
// Rutas completas de todos los archivos dentro de materiales/{uid}/... — dos niveles
// (materiales/{uid}/{subjectId}/{archivo}, ver materialPath), así que hay que listar la
// carpeta del usuario para encontrar sus materias y después cada materia para sus archivos.
async function listUserMaterialPaths(uid_){
  const top = await listStorageFolder(uid_);
  const paths=[];
  for(const entry of top){
    if(entry.id){ paths.push(`${uid_}/${entry.name}`); continue; }
    const files = await listStorageFolder(`${uid_}/${entry.name}`);
    for(const f of files){ if(f.id) paths.push(`${uid_}/${entry.name}/${f.name}`); }
  }
  return paths;
}
async function deleteUsuario(id){
  state.usersDeleteStatus="deleting"; state.usersDeleteError=""; render();
  try{
    // QA/regresión: si falla el borrado de materiales no bloqueamos el borrado de la cuenta —
    // los archivos quedan huérfanos y "Limpiar archivos huérfanos" los levanta después — pero
    // antes quedaba en absoluto silencio; ahora el admin se entera al toque en el mensaje final.
    let storageWarning=false;
    try{
      await removeStorageObjects(await listUserMaterialPaths(id));
    }catch(e){
      storageWarning=true;
    }
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
    const r=await fetch(SUPA_URL+"/rest/v1/rpc/admin_eliminar_usuario",{method:"POST", headers:h, body:JSON.stringify({objetivo:id})});
    if(!r.ok){
      const j=await r.json().catch(()=>({}));
      throw new Error(j.message||j.msg||("error "+r.status));
    }
    state.usersConfirmDelId=null; state.usersConfirmDelInput=""; state.usersDeleteStatus="idle";
    state.usersDeleteWarning=storageWarning;
    state.usersDeleteMsg = storageWarning
      ? "Cuenta eliminada. Algunos materiales no se pudieron borrar de Storage — corré \"Limpiar archivos huérfanos\" para terminar."
      : "Cuenta eliminada.";
    state.usersLoaded=false;
    await loadUsuarios();
  }catch(e){
    state.usersDeleteStatus="idle";
    state.usersDeleteError = !navigator.onLine ? "Sin conexión a internet." : (e.message||"No se pudo eliminar la cuenta.");
    render();
  }
}
// Cierres por inactividad (revisar_inactivos, cuaderno-supabase 012/015) borran sólo las
// tablas y dejan la carpeta del usuario huérfana en el bucket — este botón la limpia:
// compara las carpetas de materiales contra las cuentas vivas en perfiles y borra el resto.
async function limpiarHuerfanos(){
  state.orphanCleanStatus="cleaning"; state.orphanCleanError=""; state.orphanCleanMsg=""; render();
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const ur=await fetch(SUPA_URL+"/rest/v1/perfiles?select=user_id",{headers:h});
    if(!ur.ok) throw new Error("error "+ur.status);
    const activos=new Set((await ur.json()).map(u=>u.user_id));
    const top=await listStorageFolder("");
    const huerfanas=top.filter(e=>!e.id && !activos.has(e.name));
    let nCarpetas=0, nArchivos=0;
    for(const carpeta of huerfanas){
      const paths=await listUserMaterialPaths(carpeta.name);
      if(!paths.length) continue;
      await removeStorageObjects(paths);
      nCarpetas++; nArchivos+=paths.length;
    }
    state.orphanCleanStatus="idle";
    state.orphanCleanMsg = nCarpetas ? `Se borraron ${nArchivos} archivo(s) de ${nCarpetas} cuenta(s) ya eliminada(s).` : "No había archivos huérfanos.";
  }catch(e){
    state.orphanCleanStatus="idle";
    state.orphanCleanError = !navigator.onLine ? "Sin conexión a internet." : "No se pudieron limpiar los archivos huérfanos.";
  }
  render();
}
async function loadInactividad(){
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const [rn,rc]=await Promise.all([
      fetch(SUPA_URL+"/rest/v1/notificaciones_inactividad?select=*&order=enviada_at.desc&limit=200",{headers:h}),
      fetch(SUPA_URL+"/rest/v1/cuentas_cerradas?select=*&order=cerrada_at.desc&limit=200",{headers:h})
    ]);
    if(!rn.ok || !rc.ok) throw new Error("error "+(rn.ok?rc.status:rn.status));
    state.notificacionesInactividad=await rn.json();
    state.cuentasCerradas=await rc.json();
    state.inactividadLoaded=true; state.inactividadError="";
  }catch(e){
    state.inactividadError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo cargar el registro de inactividad.";
  }
  render();
}
async function loadActividad(){
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const desde=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
    const [rm,rp]=await Promise.all([
      fetch(SUPA_URL+"/rest/v1/metricas_diarias?select=user_id,dia,aperturas,syncs&dia=gte."+desde+"&order=dia.asc", {headers:h}),
      fetch(SUPA_URL+"/rest/v1/perfiles?select=created_at", {headers:h})
    ]);
    if(!rm.ok) throw new Error("error "+rm.status);
    if(!rp.ok) throw new Error("error "+rp.status);
    state.metricas=await rm.json();
    state.altas=(await rp.json()).map(x=>x.created_at);
    state.actividadLoaded=true; state.actividadError="";
  }catch(e){
    state.actividadError = !navigator.onLine ? "Sin conexión a internet." : "No se pudieron cargar las métricas.";
  }
  render();
}
// metricas_horarias (migración 008): mismo shape que metricas_diarias pero por hora, con
// retención de 14 días del lado del servidor. Usada por el modo "Por hora" de la sub-pestaña
// Actividad del panel admin (ver vActividadHora en views.js).
async function loadMetricasHorarias(){
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(SUPA_URL+"/rest/v1/metricas_horarias?select=user_id,hora,aperturas,syncs&order=hora.asc", {headers:h});
    if(!r.ok) throw new Error("error "+r.status);
    state.metricasHorarias=await r.json();
    state.metricasHorariasLoaded=true; state.metricasHorariasError="";
  }catch(e){
    state.metricasHorariasError = !navigator.onLine ? "Sin conexión a internet." : "No se pudieron cargar las métricas horarias.";
  }
  render();
}
async function loadRecursos(){
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
    const r=await fetch(SUPA_URL+"/rest/v1/rpc/admin_stats", {method:"POST", headers:h, body:"{}"});
    if(!r.ok) throw new Error("error "+r.status);
    state.recursos=await r.json();
    state.recursosLoaded=true; state.recursosError="";
  }catch(e){
    state.recursosError = !navigator.onLine ? "Sin conexión a internet." : "No se pudieron cargar los recursos.";
  }
  render();
}
async function toggleReporte(id,current){
  const next = current==="resuelto" ? "pendiente" : "resuelto";
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
    const r=await fetch(SUPA_URL+"/rest/v1/reportes?id=eq."+encodeURIComponent(id),{method:"PATCH", headers:h, body:JSON.stringify({estado:next})});
    if(!r.ok) throw new Error("error "+r.status);
    state.reportes=state.reportes.map(x=>x.id===id?{...x,estado:next}:x);
    render();
  }catch(e){ /* se puede reintentar tocando el botón de nuevo */ }
  refreshReportesBadge();
}
// Contador de "nuevos" en el ítem "Panel" del nav (paso 147) — liviano (un solo count, sin traer
// las filas) para no tener que abrir el panel para saber si hay algo pendiente. Llamado al
// arrancar, junto al heartbeat (maybeHeartbeat, cada ~5min con la pestaña visible) y al resolver
// un reporte a mano; sesIsAdmin() ya devuelve false en modo demo, así que ahí nunca pega a la red.
async function refreshReportesBadge(){
  if(!sesIsAdmin(getSes())) return;
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, Prefer:"count=exact"};
    const r=await fetch(SUPA_URL+"/rest/v1/reportes?select=id&estado=eq.pendiente&limit=1",{headers:h});
    if(!r.ok) return;
    const total = Number((r.headers.get("content-range")||"").split("/")[1])||0;
    state.reportesPendingCount = total;
    render();
  }catch(e){ /* silencioso, se reintenta en el próximo heartbeat */ }
}

/* ============ portal de invitados (tabla portales, migración 013) ============
   Fila propia por docente: token general (portal completo) + tokens_alumnos (mapa
   token→studentId, una llave recortada por alumno), habilitado, y el JSON "publicado" que ve
   el portal público (portal.html, sin sesión, vía la RPC portal_publico) — nombre del docente,
   biblioteca (ver signMaterialUrl/publicarPortal más abajo) y alumnos (ver buildAlumnoBlock). */
// Llaves cortas (paso 93): 10 caracteres de un alfabeto sin los que se confunden a mano o al
// dictarlas (0/O, 1/l/I) — más fáciles de escribir/leer que el hex de 48 que se usaba antes. Las
// llaves largas ya repartidas siguen funcionando igual (portal.js sólo valida un largo mínimo,
// no un formato exacto; portal_publico() en el backend compara la llave tal cual, sin parsear su
// forma) — esto sólo cambia lo que se genera de acá en adelante, nunca lo ya emitido.
const PORTAL_TOKEN_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const PORTAL_TOKEN_LEN = 10;
function genPortalToken(){
  const n = PORTAL_TOKEN_ALPHABET.length;
  const max = 256 - (256 % n); // rechaza bytes que sesgarían la distribución hacia el resto
  const buf = new Uint8Array(1);
  let out = "";
  while(out.length < PORTAL_TOKEN_LEN){
    crypto.getRandomValues(buf);
    if(buf[0] < max) out += PORTAL_TOKEN_ALPHABET[buf[0] % n];
  }
  return out;
}
function portalUrl(token){ return new URL("portal.html?k="+encodeURIComponent(token), location.href).href; }
// Lee la fila propia de portales (columnas a elección), con su token de sesión/uid ya resueltos —
// evita repetir ensureToken()/jwtSub()/headers en cada acción de esta sección.
// En modo demo (IS_DEMO), ambas funciones se saltean la red por completo: fetchPortalRow()
// devuelve una fila sintética armada a partir del state.portal ya simulado (ver buildDemoData()
// más abajo) y patchPortalRow() no hace nada — cada llamador ya actualiza state.portal por su
// cuenta con el resultado, así que el "guardado" simplemente no persiste en ningún lado, igual
// que el resto del modo demo (ver save() más arriba).
async function fetchPortalRow(select){
  if(IS_DEMO){
    const p=state.portal||{};
    return {s:null, uid_:"demo", h:null, row:{token:p.token||"", habilitado:!!p.habilitado,
      publicado:p.publicado||{}, tokens_alumnos:p.tokensAlumnos||{}, tokens_grupos:p.tokensGrupos||{}}};
  }
  const s=await ensureToken();
  const uid_=jwtSub(s.access);
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
  const r=await fetch(SUPA_URL+"/rest/v1/portales?select="+select, {headers:h});
  if(!r.ok) throw new Error("error "+r.status);
  const row=(await r.json())[0];
  return {s, uid_, h, row: row||{}};
}
async function patchPortalRow(uid_, h, patch){
  if(IS_DEMO) return;
  const r=await fetch(SUPA_URL+"/rest/v1/portales?user_id=eq."+encodeURIComponent(uid_), {method:"PATCH",
    headers:{...h, Prefer:"return=minimal"}, body:JSON.stringify({...patch, updated_at:new Date().toISOString()})});
  if(!r.ok) throw new Error("error "+r.status);
}
function tokenForStudent(studentId){
  const map=(state.portal&&state.portal.tokensAlumnos)||{};
  return Object.keys(map).find(k=>map[k]===studentId) || null;
}
async function loadPortal(){
  // El portal de la demo ya viene armado en memoria desde buildDemoData() (ver load() en
  // helpers.js) — nav-cuenta llama a loadPortal() sin condición cada vez que se abre esa pestaña,
  // así que acá sólo se restaura lo que ese llamador pisó (portalLoaded/portalError) sin tocar
  // state.portal ni pegarle a la red.
  if(IS_DEMO){ state.portalLoaded=true; state.portalError=""; render(); return; }
  state.portalLoaded=false; state.portalError=""; render();
  try{
    const {s, uid_, h, row: existing}=await fetchPortalRow("token,habilitado,publicado,tokens_alumnos,tokens_grupos");
    let row=existing;
    if(!row || !row.token){
      const token=genPortalToken();
      const up=await fetch(SUPA_URL+"/rest/v1/portales", {method:"POST",
        headers:{...h, Prefer:"return=representation"},
        body:JSON.stringify([{user_id:uid_, token, habilitado:false, publicado:{}}])});
      if(!up.ok) throw new Error("no se pudo crear el portal");
      row=(await up.json())[0];
    }
    state.portal={token:row.token, habilitado:row.habilitado, publicado:row.publicado||{},
      tokensAlumnos:row.tokens_alumnos||{}, tokensGrupos:row.tokens_grupos||{}, draftNombre:(row.publicado&&row.publicado.nombre)||""};
    state.portalLoaded=true;
  }catch(e){
    state.portalError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo cargar el portal.";
    state.portalLoaded=true;
  }
  render();
}
async function togglePortalHabilitado(next){
  if(!state.portal || state.portal.habilitado===next) return;
  const prev=state.portal.habilitado;
  state.portal.habilitado=next; render();
  try{
    const {uid_, h}=await fetchPortalRow("habilitado");
    await patchPortalRow(uid_, h, {habilitado:next});
  }catch(e){
    state.portal.habilitado=prev;
    state.portalError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo actualizar. Probá de nuevo.";
    render();
  }
}
// "Cómo reservan tus alumnos" (paso 173): reemplaza al on/off de "Pedir una clase" (paso 160,
// togglePedirClase) por un selector de tres modos — instantáneo (mismo patrón optimista de
// siempre) y con el mismo efecto secundario sobre huecos: al pasar a "confirmar" o "directa"
// recalcula y publica los huecos ya mismo (no hace falta esperar al próximo "Publicar cambios");
// al apagar, los vacía para que el portal deje de ofrecerlos al toque. pedirClaseHabilitado se
// sigue escribiendo en paralelo por compatibilidad (ver resolveReservaModo() en helpers.js).
async function setReservaModo(modo){
  if(!state.portal || reservaModoFor()===modo) return;
  const prevPublicado=state.portal.publicado;
  const huecos=modo==="apagado"?[]:huecosLibresProximos14Dias();
  const publicado={...state.portal.publicado, reservaModo:modo, pedirClaseHabilitado:modo==="confirmar", huecos};
  state.portal.publicado=publicado; render();
  if(IS_DEMO) return;
  try{
    const {uid_, h}=await fetchPortalRow("publicado");
    await patchPortalRow(uid_, h, {publicado});
  }catch(e){
    state.portal.publicado=prevPublicado;
    state.portalError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo actualizar. Probá de nuevo.";
    render();
  }
}
// "Permitir cancelar desde el portal" (paso 172): mismo patrón optimista que togglePedirClase,
// pero sin efecto secundario sobre huecos — a diferencia de "Pedir una clase", arranca ENCENDIDO
// (ver permitirCancelarPortalFor() en helpers.js, la ausencia del campo cuenta como activado).
async function toggleCancelarClase(next){
  if(!state.portal) return;
  const prevPublicado=state.portal.publicado;
  const publicado={...state.portal.publicado, permitirCancelarPortal:next};
  state.portal.publicado=publicado; render();
  if(IS_DEMO) return;
  try{
    const {uid_, h}=await fetchPortalRow("publicado");
    await patchPortalRow(uid_, h, {publicado});
  }catch(e){
    state.portal.publicado=prevPublicado;
    state.portalError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo actualizar. Probá de nuevo.";
    render();
  }
}
// Recalcula publicado.huecos en cada sync real (colgado del mismo ciclo que
// maybeRenewPortalLibrary, ver syncNow()) — la disponibilidad libre cambia todo el tiempo (clases
// que se agendan/cancelan), así que a diferencia de la biblioteca (que sólo vence una vez cada
// tantos días) conviene recalcularla seguido; sólo escribe si de verdad cambió, para no gastar
// PATCH de más. Trabaja sobre la fila igual que maybeRenewPortalLibrary (no depende de que Cuenta
// haya estado abierta ni de state.portal).
async function maybeSyncHuecosPortal(uid_, s){
  if(IS_DEMO) return;
  try{
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
    const r=await fetch(SUPA_URL+"/rest/v1/portales?select=habilitado,publicado", {headers:h});
    if(!r.ok) return;
    const row=(await r.json())[0];
    if(!row || !row.habilitado) return;
    const habilitado=resolveReservaModo(row.publicado)!=="apagado";
    const huecos=habilitado?huecosLibresProximos14Dias():[];
    const prevHuecos=(row.publicado&&row.publicado.huecos)||[];
    if(stableStringify(huecos)===stableStringify(prevHuecos)) return;
    const publicado={...row.publicado, huecos};
    await patchPortalRow(uid_, h, {publicado});
    if(state.portal) state.portal.publicado=publicado;
  }catch(e){ /* silencioso: se reintenta en el próximo sync */ }
}
// Solicitudes de clase pedidas o de cancelación avisadas desde el portal (tabla
// solicitudes_clase, migración 022, con tipo/kind/source_id sumados en el paso 172 para las
// cancelaciones): cada docente ve sólo las propias (RLS por user_id) — se refresca en cada
// heartbeat (~5min con la pestaña visible, ver maybeHeartbeat) y al resolver una a mano, mismo
// criterio que refreshReportesBadge() pero acá sí trae las filas enteras (no sólo un conteo)
// porque el Tablero necesita mostrarlas, no sólo avisar que hay algo pendiente.
async function refreshSolicitudesClase(){
  if(IS_DEMO || !getSes()) return;
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(SUPA_URL+"/rest/v1/solicitudes_clase?select=id,student_id,fecha,hora,nota,tipo,kind,source_id,created_at&estado=eq.pedida&order=created_at.asc", {headers:h});
    if(!r.ok) return;
    const rows=await r.json();
    state.solicitudesClase=rows.map(x=>({id:x.id, studentId:x.student_id, fecha:x.fecha, hora:x.hora, nota:x.nota||"",
      tipo:x.tipo||"pedido", kind:x.kind||null, sourceId:x.source_id||null, createdAt:x.created_at}));
  }catch(e){ /* silencioso, se reintenta en el próximo heartbeat */ }
  // Reservas directas (paso 173): ya están aplicadas (estado="confirmada" desde que se insertan,
  // ver reservar_clase_portal() en 026_reserva_directa.sql), así que no comparten lista con las de
  // arriba (que necesitan aceptar/rechazar) — acá se trae nada más que las que el docente todavía
  // no descartó ("vista"=false), como aviso simple en el Tablero.
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(SUPA_URL+"/rest/v1/solicitudes_clase?select=id,student_id,fecha,hora,created_at&tipo=eq.directa&vista=eq.false&order=created_at.desc", {headers:h});
    if(r.ok){
      const rows=await r.json();
      state.reservasDirectas=rows.map(x=>({id:x.id, studentId:x.student_id, fecha:x.fecha, hora:x.hora, createdAt:x.created_at}));
    }
  }catch(e){ /* silencioso, se reintenta en el próximo heartbeat */ }
  render();
}
// Descarta un aviso de reserva directa del Tablero (paso 173) — no hay "aceptar/rechazar", la
// clase ya está agendada; esto sólo apaga el aviso (vista=true), mismo patrón optimista que
// rechazarSolicitudClase.
async function descartarReservaDirecta(id){
  state.reservasDirectas=(state.reservasDirectas||[]).filter(x=>String(x.id)!==String(id));
  render();
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
    await fetch(SUPA_URL+"/rest/v1/solicitudes_clase?id=eq."+encodeURIComponent(id), {method:"PATCH", headers:h, body:JSON.stringify({vista:true})});
  }catch(e){ /* silencioso: se puede reintentar, y de última vuelve a aparecer en el próximo refresh */ }
}
async function patchSolicitudClase(id, patch){
  const s=await ensureToken();
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
  await fetch(SUPA_URL+"/rest/v1/solicitudes_clase?id=eq."+encodeURIComponent(id), {method:"PATCH", headers:h,
    body:JSON.stringify({...patch, resuelta_at:new Date().toISOString()})});
}
// Aceptar: si es un pedido de clase, agenda una clasePuntual de siempre (addPuntualClase, 60 min
// por defecto — editable después en la ficha, el pedido del portal no incluye duración); si es
// una cancelación (paso 172), aplica exactamente lo mismo que cancelar esa ocurrencia a mano
// desde la Agenda — applyCancelacion() (clase puntual, respeta la política de señas) o
// cancelHorarioOccurrence() (ocurrencia de horario recurrente, sólo esa fecha vía exceptions). El
// hueco de "pedir clase" queda ocupado solo en el próximo recálculo (maybeSyncHuecosPortal en el
// siguiente sync, o al tocar "Publicar cambios") — una cancelación no toca huecos.
async function aceptarSolicitudClase(id){
  const sol=(state.solicitudesClase||[]).find(x=>String(x.id)===String(id)); if(!sol) return;
  const s=state.students.find(x=>x.id===sol.studentId);
  if(!s){ toast("Ese alumno ya no existe.", "error"); return; }
  let msg;
  if(sol.tipo==="cancelacion"){
    if(sol.kind==="puntual") applyCancelacion(s.id, sol.sourceId);
    else if(sol.kind==="horario") cancelHorarioOccurrence(s.id, sol.sourceId, sol.fecha);
    msg = "Clase cancelada — avisale a "+s.name+" si hace falta.";
  }else{
    const {warning}=addPuntualClase(s.id, sol.fecha, sol.hora, 60, "", sol.nota||"");
    msg = warning?"Clase agendada — "+warning:"Clase agendada con "+s.name+".";
  }
  state.solicitudesClase=(state.solicitudesClase||[]).filter(x=>String(x.id)!==String(id));
  render();
  toast(msg, "ok");
  try{
    await patchSolicitudClase(id, {estado:"confirmada"});
    if(sol.tipo!=="cancelacion"){
      const sess=await ensureToken();
      maybeSyncHuecosPortal(jwtSub(sess.access), sess);
    }
  }catch(e){ /* silencioso: el cambio ya quedó aplicado localmente y sincroniza igual */ }
}
async function rechazarSolicitudClase(id){
  const sol=(state.solicitudesClase||[]).find(x=>String(x.id)===String(id)); if(!sol) return;
  const motivo=(prompt("Motivo (opcional):")||"").trim();
  state.solicitudesClase=(state.solicitudesClase||[]).filter(x=>String(x.id)!==String(id));
  render();
  try{ await patchSolicitudClase(id, {estado:"rechazada", motivo}); }catch(e){ /* silencioso */ }
}
// Avisos del portal (paso 105): mensajes cortos con fecha y destino ("todos"/una materia/un
// alumno puntual) que el docente publica desde Cuenta → Portal, guardados en
// publicado.avisos (mismo objeto jsonb "publicado" que biblioteca/alumnos/grupos) — no hace
// falta ningún campo nuevo en la tabla. Filtrar qué avisos ve cada llave (individual = los
// "todos" + los de su materia + los suyos puntuales; grupal = los "todos" + los de su materia;
// general = sólo los "todos") lo tiene que hacer portal_publico() del lado del backend, porque
// es la única forma segura de no exponerle a un alumno un aviso dirigido a otro — ver la
// migración aparte que acompaña este paso. Mismo patrón optimista que togglePortalHabilitado():
// se actualiza state.portal ya mismo, se guarda en segundo plano, y si falla se revierte.
async function saveAvisos(newAvisos){
  if(!state.portal) return;
  const prevAvisos = (state.portal.publicado && state.portal.publicado.avisos) || [];
  state.portal.publicado = {...state.portal.publicado, avisos:newAvisos};
  state.avisoSaving=true; state.avisoError=""; render();
  if(IS_DEMO){ state.avisoSaving=false; render(); return; }
  try{
    const {uid_, h} = await fetchPortalRow("publicado");
    await patchPortalRow(uid_, h, {publicado: state.portal.publicado});
  }catch(e){
    state.portal.publicado = {...state.portal.publicado, avisos:prevAvisos};
    state.avisoError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo guardar el aviso. Probá de nuevo.";
  }
  state.avisoSaving=false; render();
}
async function regenerarPortalToken(){
  if(!state.portal) return;
  if(!confirm("La llave anterior deja de funcionar de inmediato: cualquier alumno que la tenga guardada pierde el acceso. ¿Regenerar?")) return;
  const token=genPortalToken();
  try{
    const {uid_, h}=await fetchPortalRow("token");
    await patchPortalRow(uid_, h, {token});
    state.portal.token=token; state.portalCopyMsg=""; render();
  }catch(e){
    state.portalError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo regenerar la llave. Probá de nuevo.";
    render();
  }
}
// Devuelve una URL firmada de Storage (válida expiresInSec) para un material propio. Requiere
// solamente la policy de SELECT ya existente para la carpeta del usuario (007_materiales_storage_
// policies.sql) — firmar un objeto pasa por la misma RLS que descargarlo directo.
async function signMaterialUrl(s, path, expiresInSec){
  if(IS_DEMO) return "#demo-material";
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
  const r=await fetch(SUPA_URL+"/storage/v1/object/sign/"+MATERIALES_BUCKET+"/"+path.split("/").map(encodeURIComponent).join("/"),
    {method:"POST", headers:h, body:JSON.stringify({expiresIn:expiresInSec})});
  if(!r.ok) throw new Error("no se pudo firmar "+path);
  const j=await r.json();
  return SUPA_URL+"/storage/v1"+j.signedURL;
}
// Arma lo que ve UN alumno puntual en su portal individual, a partir de lo que el docente tildó
// en su ficha (s.portalShare, ver portalShareFor() en helpers.js) — proximaClase/tareas/avance,
// cada uno opt-in por checkbox. ÚNICA función que lee datos de un alumno para el portal — sigue
// sin haber forma de compartir notas, señas ni comentarios privados desde acá. "pendiente" (y su
// desglose/historial, paso 171) es la única excepción a "opt-in por checkbox" (paso 141, decisión
// explícita del docente al pedirlo): siempre va, es sólo SU propia deuda (nunca la de otro
// alumno) y sólo llega a quien entra con SU llave individual — nunca a la llave grupal/general
// (ver buildGrupoBlock, sin estos campos, y la migración de portal_publico() que tiene que
// exponer "pendiente"/"cobros" nada más que ahí). Si se suma un dato nuevo compartible aparte de
// éste, tiene que sumarse como checkbox explícito en la ficha (vPortalAlumnoCard, views.js).
function buildAlumnoBlock(s, reservaModo){
  const share=portalShareFor(s);
  const block={
    nombre:s.name, subjectId:s.subjectId||null,
    pendiente:pendienteTotalFor(s), pendienteDesglose:pendienteDesgloseFor(s),
    historialClases:historialClasesPortal(s),
  };
  // subjectId (paso 105): no se muestra en el portal — sólo la usa portal_publico() del lado del
  // backend para filtrar qué avisos dirigidos "a una materia" le corresponden a este alumno. Se
  // saca del JSON de vuelta antes de responder (ver la función), así que nunca llega al navegador.
  if(share.proximaClase){
    const n=nextClaseForStudent(s);
    block.proximaClase = n ? {date:n.date, time:n.time, duration:n.duration, link:n.link||""} : null;
    // proximasClases (paso 172): lista completa, no sólo la más próxima — el portal la necesita
    // para "No puedo ir" por clase, cuelga del mismo opt-in que proximaClase (misma info, más
    // completa) en vez de sumar un checkbox nuevo en la ficha.
    block.proximasClases = proximasClasesFor(s);
  }
  if(share.tareas){
    const last=[...(s.sessions||[])].filter(c=>!isAusente(c)).sort((a,b)=>b.date.localeCompare(a.date))[0];
    block.tarea = last ? {date:last.date, nota:last.note||""} : null;
  }
  if(share.avance){
    block.avance = unitsFor(s).map(u=>({unidad:u.nombre, estado:(s.topics||{})[u.nombre]||"pendiente"}));
  }
  // misClases (paso 173, "reserva directa"): a diferencia de proximasClases de arriba, NO es
  // opt-in por checkbox — es parte funcional de la agenda semanal del portal (el alumno necesita
  // ver sus propias clases junto a los huecos libres para que esa agenda sea "su semana completa",
  // no sólo huecos), así que se publica siempre que el docente tenga la reserva directa activada,
  // sin depender de "Compartir con el portal" en la ficha. reservar_clase_portal() (RPC atómica)
  // también la actualiza directo en publicado, para que una reserva nueva aparezca sin esperar a
  // que el docente vuelva a tocar "Publicar cambios".
  if(reservaModo==="directa") block.misClases = proximasClasesFor(s);
  return block;
}
// Arma lo que ve quien entra con la llave GRUPAL de una materia (paso 94): biblioteca de esa
// materia (subconjunto de biblioteca, ya firmada) + próximas clases/exámenes del GRUPO — fechas
// sueltas de nextClaseForStudent()/examDate de los alumnos incluidos, nunca atadas a un nombre.
// A propósito no toca notas, pagos, señas ni avance por unidades: eso es lo que distingue a esta
// llave de la individual (buildAlumnoBlock) — para eso siguen estando las llaves por alumno.
// Devuelve null si la materia ya no existe (borrada del catálogo) para que no se publique nada.
function buildGrupoBlock(materiaId, alumnoIds, bibliotecaMateria){
  const m=subjById(materiaId);
  if(!m) return null;
  const ids=new Set(alumnoIds||[]);
  const alumnos=state.students.filter(x=>!x.deleted && ids.has(x.id));
  const proximasClases=[];
  const vistos=new Set();
  alumnos.forEach(st=>{
    const n=nextClaseForStudent(st); if(!n) return;
    const key=n.date+" "+n.time+" "+n.duration;
    if(vistos.has(key)) return;
    vistos.add(key); proximasClases.push({date:n.date, time:n.time, duration:n.duration});
  });
  proximasClases.sort((a,b)=>(a.date+" "+a.time).localeCompare(b.date+" "+b.time));
  const proximosExamenes=[...new Set(alumnos.map(st=>st.examDate)
    .filter(d=>d && daysTo(d)!==null && daysTo(d)>=0))].sort();
  return {materia:m.name, color:subjectColorKey(materiaId), biblioteca:bibliotecaMateria||[], proximasClases, proximosExamenes};
}
// Publicar cambios: nombre a mostrar + biblioteca (firma un link por cada material con
// compartido:true) + un bloque por cada alumno que tenga llave individual generada + un bloque
// por cada materia que tenga llave grupal generada. Si falla la firma de algún archivo, no se
// publica nada (todo o nada, para no dejar el portal a medio actualizar) — se puede reintentar
// tocando de nuevo.
async function publicarPortal(){
  if(!state.portal) return;
  state.portalSaving=true; state.portalSaveMsg=""; render();
  if(IS_DEMO){
    state.portal.publicado={...state.portal.publicado, nombre:(state.portal.draftNombre||"").trim()};
    state.portalSaveMsg="Publicado — ya se ve en el portal.";
    state.portalSaving=false; render();
    return;
  }
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const compartidos=[];
    (state.catalog.subjects||[]).forEach(m=>{
      materialesIndexFor(m.id).forEach(f=>{ if(f.compartido) compartidos.push({subjectId:m.id, subject:m.name, ...f}); });
    });
    const biblioteca=await Promise.all(compartidos.map(async f=>{
      const path=materialPath(uid_, f.subjectId, f.name);
      const url=await signMaterialUrl(s, path, PORTAL_LINK_TTL_DAYS*86400);
      // unitNombre/unitOrden: mismo criterio que republishGrupoBlock más abajo — denormalizado
      // al publicar, para que el portal (standalone, sin catalog.subjects) pueda agrupar por
      // unidad sin pedir nada nuevo al backend (ver bibliotecaHtml en portal.js).
      const subj=subjById(f.subjectId);
      const unit=(f.unitId && subj) ? (subj.units||[]).find(u=>u.id===f.unitId) : null;
      return {subjectId:f.subjectId, materia:f.subject, color:subjectColorKey(f.subjectId), nombre:materialDisplayName(f.name),
        path, url, bytes:f.bytes||0, at:f.at||null, firmadoAt:Date.now(),
        unitNombre:unit?unit.nombre:"", unitOrden:unit?unit.orden:null};
    }));
    const reservaModo=resolveReservaModo(state.portal.publicado);
    const alumnoIds=[...new Set(Object.values(state.portal.tokensAlumnos||{}))];
    const alumnos={};
    alumnoIds.forEach(id=>{
      const st=state.students.find(x=>x.id===id);
      if(st) alumnos[id]=buildAlumnoBlock(st, reservaModo);
    });
    const tokensGrupos=state.portal.tokensGrupos||{};
    const materiaIds=[...new Set(Object.values(tokensGrupos).map(g=>g.materiaId))];
    const grupos={};
    materiaIds.forEach(mid=>{
      const entry=Object.values(tokensGrupos).find(g=>g.materiaId===mid);
      const bibMateria=biblioteca.filter(it=>it.subjectId===mid);
      const bloque=buildGrupoBlock(mid, entry?entry.alumnos:[], bibMateria);
      if(bloque) grupos[mid]=bloque;
    });
    // Foto del docente (paso 137): mismo criterio que la biblioteca — se firma acá (mientras hay
    // sesión) y el portal público sólo consume la URL ya firmada, nunca pide nada al bucket
    // privado por su cuenta. Si el docente no cargó foto, fotoDocente queda null y el portal cae
    // en su propio fallback (iniciales), sin pedir nada a Storage.
    const doc=docenteFor();
    const fotoDocente = doc.foto
      ? {url:await signMaterialUrl(s, doc.foto.path, PORTAL_LINK_TTL_DAYS*86400), firmadoAt:Date.now()}
      : null;
    // Cobros del docente (paso 141): un solo bloque a nivel de "publicado" (como fotoDocente), no
    // uno por alumno — portal_publico() lo expone nada más que al resolver una llave individual
    // (nunca grupal/general, ver la migración que acompaña este paso), así que del lado del
    // cliente basta con firmar el QR una sola vez acá en vez de una vez por alumno.
    const cobrosCfg=cobrosDocenteFor();
    const cobros = (cobrosCfg.alias||cobrosCfg.linkMP||cobrosCfg.linkOtro||cobrosCfg.qr) ? {
      alias: cobrosCfg.alias||"", linkMP: cobrosCfg.linkMP||"", linkOtro: cobrosCfg.linkOtro||"",
      qr: cobrosCfg.qr ? {url:await signMaterialUrl(s, cobrosCfg.qr.path, PORTAL_LINK_TTL_DAYS*86400), firmadoAt:Date.now()} : null,
    } : null;
    // Huecos para "Pedir una clase"/"Reserva directa" (pasos 160/173): sólo si el modo no está
    // apagado (reservaModo, ver setReservaModo() más arriba) — si está apagado se publica una
    // lista vacía para no dejar colgado un hueco viejo si lo desactivó justo después de publicar.
    // pedirClaseHabilitado (paso 160) se sigue escribiendo por compatibilidad con un portal.js
    // viejo en caché (ver resolveReservaModo() en helpers.js) — reservaModo (paso 173) ya es la
    // fuente de verdad.
    const pedirClaseHabilitado=reservaModo==="confirmar";
    const huecos=reservaModo!=="apagado"?huecosLibresProximos14Dias():[];
    // Texto de la política de cancelación (paso 172): un solo campo a nivel de "publicado", mismo
    // criterio que cobros/fotoDocente — el portal (standalone) no tiene acceso a state.catalog,
    // así que necesita esto ya resuelto en el JSON público.
    const cancelPolicyTexto=cancelPolicyTextoPublico();
    // Promos (paso 176): packs de catálogo marcados "Mostrar en el portal" — un campo más a nivel
    // de "publicado" (como cancelPolicyTexto), visible en los tres tipos de llave (portal_publico()
    // no lo excluye en ninguna rama, ver cuaderno-supabase) porque es info general de la cuenta,
    // no de un alumno puntual.
    const promos=packsCatalogoFor().filter(p=>p.mostrarPortal).map(p=>
      ({nombre:p.nombre||"Pack", cantidad:Number(p.cantidad)||0, precio:Number(p.precio)||0, vigenciaTexto:p.vigenciaTexto||""}));
    const publicado={...state.portal.publicado, nombre:(state.portal.draftNombre||"").trim(), biblioteca, alumnos, grupos, fotoDocente, cobros, pedirClaseHabilitado, huecos, cancelPolicyTexto, reservaModo, promos};
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
    await patchPortalRow(uid_, h, {publicado});
    state.portal.publicado=publicado;
    state.portalSaveMsg="Publicado — ya se ve en el portal.";
  }catch(e){
    state.portalSaveMsg = !navigator.onLine ? "Sin conexión a internet." : "No se pudo publicar. Probá de nuevo.";
  }
  state.portalSaving=false; render();
}
// Renovación silenciosa de los links firmados de la biblioteca (una vez por día por dispositivo,
// ver PORTAL_RENEW_CHECK_KEY), colgada del ciclo de sync existente igual que maybeSnapshotBackup.
// No depende de que Cuenta esté abierta ni de state.portal: lee/escribe la fila directo, así
// también funciona si el docente nunca entra a esa pantalla en el día. Sólo re-firma los ítems que
// están a PORTAL_LINK_RENEW_AFTER_DAYS o más de su firma — el resto de la biblioteca no se toca.
// Un mismo archivo puede aparecer tanto en publicado.biblioteca (llave general/individual) como
// en publicado.grupos[materiaId].biblioteca (llave grupal, firmada aparte por republishGrupoBlock)
// — se junta por path antes de firmar para no pedirle a Storage dos URLs del mismo archivo.
async function maybeRenewPortalLibrary(uid_, s){
  if(localStorage.getItem(PORTAL_RENEW_CHECK_KEY) === today()) return;
  localStorage.setItem(PORTAL_RENEW_CHECK_KEY, today());
  try{
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
    const r=await fetch(SUPA_URL+"/rest/v1/portales?select=habilitado,publicado", {headers:h});
    if(!r.ok) return;
    const row=(await r.json())[0];
    if(!row || !row.habilitado) return;
    const biblioteca=(row.publicado&&row.publicado.biblioteca)||[];
    const grupos=(row.publicado&&row.publicado.grupos)||{};
    const staleCutoff=Date.now()-PORTAL_LINK_RENEW_AFTER_DAYS*86400000;
    const stale=new Map();
    const markStale=(it)=>{ if((!it.firmadoAt || it.firmadoAt<staleCutoff) && !stale.has(it.path)) stale.set(it.path, it); };
    biblioteca.forEach(markStale);
    Object.values(grupos).forEach(g=>(g.biblioteca||[]).forEach(markStale));
    // Foto del docente (paso 137): mismo chequeo de vencimiento, sobre su propio path — no
    // comparte "stale" con la biblioteca (no es un material), así que si sólo ella venció no hay
    // que frenar acá por `!stale.size`.
    const fotoDocenteActual=(row.publicado&&row.publicado.fotoDocente)||null;
    const docFoto=docenteFor().foto;
    const fotoDocenteStale = docFoto && (!fotoDocenteActual || !fotoDocenteActual.firmadoAt || fotoDocenteActual.firmadoAt<staleCutoff);
    // QR de cobros (paso 141): mismo chequeo de vencimiento que la foto del docente, sobre su
    // propio path — sólo si el docente tiene un QR cargado hoy (si lo sacó, no hay nada para
    // renovar; "Publicar cambios" es lo que saca el bloque entero del portal).
    const cobrosActual=(row.publicado&&row.publicado.cobros)||null;
    const cobrosCfg=cobrosDocenteFor();
    const cobrosQrStale = cobrosCfg.qr && (!cobrosActual || !cobrosActual.qr || !cobrosActual.qr.firmadoAt || cobrosActual.qr.firmadoAt<staleCutoff);
    if(!stale.size && !fotoDocenteStale && !cobrosQrStale) return;
    let fotoDocente=fotoDocenteActual;
    if(fotoDocenteStale){
      try{ fotoDocente={url:await signMaterialUrl(s, docFoto.path, PORTAL_LINK_TTL_DAYS*86400), firmadoAt:Date.now()}; }
      catch(e){ /* best-effort, igual que el resto de la biblioteca */ }
    }
    let cobros=cobrosActual;
    if(cobrosQrStale){
      try{
        cobros={...(cobrosActual||{}), alias:cobrosCfg.alias||"", linkMP:cobrosCfg.linkMP||"", linkOtro:cobrosCfg.linkOtro||"",
          qr:{url:await signMaterialUrl(s, cobrosCfg.qr.path, PORTAL_LINK_TTL_DAYS*86400), firmadoAt:Date.now()}};
      }catch(e){ /* best-effort, igual que el resto de la biblioteca */ }
    }
    const renewed=await Promise.all([...stale.values()].map(async it=>{
      try{ return [it.path, {url:await signMaterialUrl(s, it.path, PORTAL_LINK_TTL_DAYS*86400), firmadoAt:Date.now()}]; }
      catch(e){ return [it.path, null]; } // best-effort: un archivo puntual borrado/renombrado no frena a los demás
    }));
    const fresh=new Map(renewed.filter(([,v])=>v));
    const mergeItem=(it)=>fresh.has(it.path) ? {...it, ...fresh.get(it.path)} : it;
    const mergedBiblioteca=biblioteca.map(mergeItem);
    const mergedGrupos={};
    Object.entries(grupos).forEach(([mid,g])=>{ mergedGrupos[mid]={...g, biblioteca:(g.biblioteca||[]).map(mergeItem)}; });
    const publicado={...row.publicado, biblioteca:mergedBiblioteca, grupos:mergedGrupos, fotoDocente, cobros};
    await patchPortalRow(uid_, h, {publicado});
    if(state.portal){ state.portal.publicado=publicado; render(); }
  }catch(e){ /* silencioso: se reintenta al otro día */ }
}
// Al dejar de compartir un archivo o borrarlo, sacarlo del portal enseguida en vez de esperar a
// que el docente toque "Publicar cambios" — no vuelve a firmar nada, sólo saca el ítem de
// publicado.biblioteca y (si la materia tiene llave grupal) de publicado.grupos[subjectId].biblioteca,
// que republishGrupoBlock firma aparte. Lee/escribe la fila directo (no depende de que
// state.portal esté cargado, ya que esto se dispara desde el editor de Materiales, no desde Cuenta).
async function removeFromPortalBiblioteca(subjectId, fileName){
  try{
    const {s, uid_, h, row}=await fetchPortalRow("publicado");
    if(!row.publicado) return;
    const path=materialPath(uid_, subjectId, fileName);
    const biblioteca=row.publicado.biblioteca||[];
    const grupoBloque=row.publicado.grupos&&row.publicado.grupos[subjectId];
    const enGrupo=grupoBloque&&(grupoBloque.biblioteca||[]).some(it=>it.path===path);
    if(!biblioteca.some(it=>it.path===path) && !enGrupo) return;
    const publicado={...row.publicado, biblioteca:biblioteca.filter(it=>it.path!==path)};
    if(enGrupo){
      publicado.grupos={...row.publicado.grupos, [subjectId]:{...grupoBloque, biblioteca:grupoBloque.biblioteca.filter(it=>it.path!==path)}};
    }
    await patchPortalRow(uid_, h, {publicado});
    if(state.portal){ state.portal.publicado=publicado; render(); }
  }catch(e){ /* silencioso: se corrige solo en la próxima publicación manual */ }
}
/* ============ llave individual por alumno (portales.tokens_alumnos) ============
   Un alumno con llave propia ve, además de biblioteca/links (igual que con la llave general),
   su propio bloque (buildAlumnoBlock más arriba) — nunca el de otro alumno: la RPC portal_publico
   sólo devuelve publicado.alumnos[<su studentId>], nunca el mapa completo. */
async function generarLlaveAlumno(studentId){
  state.portalAlumnoBusy=studentId; state.portalAlumnoError=""; render();
  try{
    const {uid_, h, row}=await fetchPortalRow("tokens_alumnos,publicado");
    const tokensAlumnos={...(row.tokens_alumnos||{})};
    const yaExiste = Object.keys(tokensAlumnos).some(k=>tokensAlumnos[k]===studentId);
    if(!yaExiste) tokensAlumnos[genPortalToken()]=studentId;
    const llavesAt={...((row.publicado&&row.publicado.llavesAt)||{})};
    if(!yaExiste) llavesAt[studentId]=Date.now();
    const publicado={...(row.publicado||{}), llavesAt};
    await patchPortalRow(uid_, h, {tokens_alumnos:tokensAlumnos, publicado});
    if(state.portal){ state.portal.tokensAlumnos=tokensAlumnos; state.portal.publicado=publicado; }
    await republishAlumnoBlock(studentId);
  }catch(e){
    state.portalAlumnoError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo generar la llave. Probá de nuevo.";
  }
  state.portalAlumnoBusy=null; render();
}
async function regenerarLlaveAlumno(studentId){
  if(!confirm("La llave anterior de este alumno deja de funcionar de inmediato. ¿Regenerar?")) return;
  state.portalAlumnoBusy=studentId; state.portalAlumnoError=""; render();
  try{
    const {uid_, h, row}=await fetchPortalRow("tokens_alumnos,publicado");
    const tokensAlumnos={...(row.tokens_alumnos||{})};
    Object.keys(tokensAlumnos).forEach(k=>{ if(tokensAlumnos[k]===studentId) delete tokensAlumnos[k]; });
    tokensAlumnos[genPortalToken()]=studentId;
    const llavesAt={...((row.publicado&&row.publicado.llavesAt)||{}), [studentId]:Date.now()};
    const publicado={...(row.publicado||{}), llavesAt};
    await patchPortalRow(uid_, h, {tokens_alumnos:tokensAlumnos, publicado});
    if(state.portal){ state.portal.tokensAlumnos=tokensAlumnos; state.portal.publicado=publicado; state.portalAlumnoCopyMsg=""; }
  }catch(e){
    state.portalAlumnoError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo regenerar la llave. Probá de nuevo.";
  }
  state.portalAlumnoBusy=null; render();
}
async function revocarLlaveAlumno(studentId){
  if(!confirm("El alumno deja de poder entrar a su portal con este link. ¿Revocar?")) return;
  state.portalAlumnoBusy=studentId; state.portalAlumnoError=""; render();
  try{
    const {uid_, h, row}=await fetchPortalRow("tokens_alumnos,publicado");
    const tokensAlumnos={...(row.tokens_alumnos||{})};
    Object.keys(tokensAlumnos).forEach(k=>{ if(tokensAlumnos[k]===studentId) delete tokensAlumnos[k]; });
    const alumnos={...((row.publicado&&row.publicado.alumnos)||{})};
    delete alumnos[studentId];
    const llavesAt={...((row.publicado&&row.publicado.llavesAt)||{})};
    delete llavesAt[studentId];
    const publicado={...(row.publicado||{}), alumnos, llavesAt};
    await patchPortalRow(uid_, h, {tokens_alumnos:tokensAlumnos, publicado});
    if(state.portal){ state.portal.tokensAlumnos=tokensAlumnos; state.portal.publicado=publicado; }
  }catch(e){
    state.portalAlumnoError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo revocar la llave. Probá de nuevo.";
  }
  state.portalAlumnoBusy=null; render();
}
// Llaves a mano (paso 139): abre el mini-modal de "Compartir acceso" desde la ficha, una materia
// o la lista, sin pasar por Cuenta → Portal. Si el portal general todavía no está activado, lo
// activa solo (mismo criterio que activarlo desde Cuenta) — si no, la llave que se genera acá no
// serviría de nada. Guarda contra que el docente haya cerrado el mini-modal mientras esto corría.
async function openShareOverlay(kind, id){
  state.shareOverlay={kind, id, busy:true}; render();
  if(!state.portalLoaded) await loadPortal();
  if(!state.shareOverlay || state.shareOverlay.id!==id) return;
  if(state.portalError && !state.portal){ state.shareOverlay.busy=false; render(); return; }
  if(state.portal && !state.portal.habilitado) await togglePortalHabilitado(true);
  if(!state.shareOverlay || state.shareOverlay.id!==id) return;
  if(state.portal && !state.portal.habilitado){ state.shareOverlay.busy=false; render(); return; } // no se pudo activar el portal (offline/error) — nada para generar todavía
  if(kind==="alumno"){
    if(!tokenForStudent(id)) await generarLlaveAlumno(id);
  }else{
    if(!tokenForGrupo(id)){
      const alumnoIds = alive().filter(x=>x.subjectId===id).map(x=>x.id);
      await generarLlaveGrupo(id, alumnoIds);
    }
  }
  if(!state.shareOverlay || state.shareOverlay.id!==id) return;
  state.shareOverlay.busy=false; render();
}
// Re-arma y guarda sólo el bloque de un alumno puntual (sin tocar biblioteca ni el de otros
// alumnos) — no firma nada, así que es liviano y se puede disparar seguido. Lee/escribe la fila
// directo, no depende de que state.portal esté cargado.
async function republishAlumnoBlock(studentId){
  const st=state.students.find(x=>x.id===studentId); if(!st) return;
  try{
    const {uid_, h, row}=await fetchPortalRow("publicado");
    const alumnos={...((row.publicado&&row.publicado.alumnos)||{})};
    alumnos[studentId]=buildAlumnoBlock(st);
    const publicado={...(row.publicado||{}), alumnos};
    await patchPortalRow(uid_, h, {publicado});
    if(state.portal) state.portal.publicado=publicado;
  }catch(e){ /* silencioso: se corrige con el próximo "Publicar cambios" */ }
}
// Se dispara al tocar un checkbox de "qué ve este alumno" en su ficha — sólo si ya tiene llave
// generada (si no, no hay nada publicado que actualizar todavía).
async function maybeAutoRepublishAlumno(studentId){
  if(!tokenForStudent(studentId)) return;
  await republishAlumnoBlock(studentId);
  render();
}

/* ============ llave grupal por materia (portales.tokens_grupos, paso 94) ============
   Un grupo con llave propia ve, además de biblioteca/links igual que con la llave general, un
   bloque de SU materia (buildGrupoBlock más arriba) — biblioteca de esa materia y próximas
   clases/exámenes del grupo, nunca de otra materia ni datos de un alumno en particular. Una sola
   llave activa por materia (mismo criterio que tokenForStudent/regenerarLlaveAlumno). */
function tokenForGrupo(materiaId){
  const map=(state.portal&&state.portal.tokensGrupos)||{};
  return Object.keys(map).find(k=>map[k].materiaId===materiaId) || null;
}
async function generarLlaveGrupo(materiaId, alumnoIds){
  state.portalGrupoBusy=materiaId; state.portalGrupoError=""; render();
  try{
    const {uid_, h, row}=await fetchPortalRow("tokens_grupos");
    const tokensGrupos={...(row.tokens_grupos||{})};
    Object.keys(tokensGrupos).forEach(k=>{ if(tokensGrupos[k].materiaId===materiaId) delete tokensGrupos[k]; });
    tokensGrupos[genPortalToken()]={materiaId, alumnos:[...(alumnoIds||[])]};
    await patchPortalRow(uid_, h, {tokens_grupos:tokensGrupos});
    if(state.portal) state.portal.tokensGrupos=tokensGrupos;
    state.portalGrupoEditing=null; state.portalGrupoDraftAlumnos=[];
    await republishGrupoBlock(materiaId);
  }catch(e){
    state.portalGrupoError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo generar la llave. Probá de nuevo.";
  }
  state.portalGrupoBusy=null; render();
}
async function regenerarLlaveGrupo(materiaId){
  if(!confirm("La llave anterior de este grupo deja de funcionar de inmediato. ¿Regenerar?")) return;
  state.portalGrupoBusy=materiaId; state.portalGrupoError=""; render();
  try{
    const {uid_, h, row}=await fetchPortalRow("tokens_grupos");
    const tokensGrupos={...(row.tokens_grupos||{})};
    let alumnos=[];
    Object.keys(tokensGrupos).forEach(k=>{
      if(tokensGrupos[k].materiaId===materiaId){ alumnos=tokensGrupos[k].alumnos||[]; delete tokensGrupos[k]; }
    });
    tokensGrupos[genPortalToken()]={materiaId, alumnos};
    await patchPortalRow(uid_, h, {tokens_grupos:tokensGrupos});
    if(state.portal){ state.portal.tokensGrupos=tokensGrupos; state.portalGrupoCopyMsg=""; }
  }catch(e){
    state.portalGrupoError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo regenerar la llave. Probá de nuevo.";
  }
  state.portalGrupoBusy=null; render();
}
async function revocarLlaveGrupo(materiaId){
  if(!confirm("Los alumnos incluidos dejan de poder entrar al portal grupal con este link. ¿Borrar la llave?")) return;
  state.portalGrupoBusy=materiaId; state.portalGrupoError=""; render();
  try{
    const {uid_, h, row}=await fetchPortalRow("tokens_grupos,publicado");
    const tokensGrupos={...(row.tokens_grupos||{})};
    Object.keys(tokensGrupos).forEach(k=>{ if(tokensGrupos[k].materiaId===materiaId) delete tokensGrupos[k]; });
    const grupos={...((row.publicado&&row.publicado.grupos)||{})};
    delete grupos[materiaId];
    const publicado={...(row.publicado||{}), grupos};
    await patchPortalRow(uid_, h, {tokens_grupos:tokensGrupos, publicado});
    if(state.portal){ state.portal.tokensGrupos=tokensGrupos; state.portal.publicado=publicado; }
  }catch(e){
    state.portalGrupoError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo borrar la llave. Probá de nuevo.";
  }
  state.portalGrupoBusy=null; render();
}
// Cambia a quiénes incluye una llave grupal ya generada (misma llave, otra lista de alumnos) —
// separado de generarLlaveGrupo porque acá no hay que tocar el token, sólo tokens_grupos[tok].alumnos.
async function actualizarAlumnosGrupo(materiaId, alumnoIds){
  state.portalGrupoBusy=materiaId; state.portalGrupoError=""; render();
  try{
    const {uid_, h, row}=await fetchPortalRow("tokens_grupos");
    const tokensGrupos={...(row.tokens_grupos||{})};
    const tok=Object.keys(tokensGrupos).find(k=>tokensGrupos[k].materiaId===materiaId);
    if(!tok){ state.portalGrupoBusy=null; render(); return; }
    tokensGrupos[tok]={...tokensGrupos[tok], alumnos:[...(alumnoIds||[])]};
    await patchPortalRow(uid_, h, {tokens_grupos:tokensGrupos});
    if(state.portal) state.portal.tokensGrupos=tokensGrupos;
    state.portalGrupoEditing=null; state.portalGrupoDraftAlumnos=[];
    await republishGrupoBlock(materiaId);
  }catch(e){
    state.portalGrupoError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo guardar. Probá de nuevo.";
  }
  state.portalGrupoBusy=null; render();
}
// Enviar la llave grupal a varios (paso 140): marca/desmarca "enviado" para un alumno de la
// llave, guardado en tokens_grupos[tok].enviados (studentId -> timestamp) — mismo jsonb que ya
// tiene alumnos/materiaId, sin columna nueva. Optimista (como togglePortalHabilitado): se pinta
// ya mismo y se revierte sólo si falla el guardado.
async function toggleEnvioGrupo(materiaId, studentId){
  const tok=tokenForGrupo(materiaId); if(!tok || !state.portal) return;
  const entry=state.portal.tokensGrupos[tok];
  const prevEnviados=entry.enviados||{};
  const enviados={...prevEnviados};
  if(enviados[studentId]) delete enviados[studentId]; else enviados[studentId]=Date.now();
  const tokensGrupos={...state.portal.tokensGrupos, [tok]:{...entry, enviados}};
  state.portal.tokensGrupos=tokensGrupos; render();
  try{
    const {uid_, h}=await fetchPortalRow("tokens_grupos");
    await patchPortalRow(uid_, h, {tokens_grupos:tokensGrupos});
  }catch(e){
    state.portal.tokensGrupos={...tokensGrupos, [tok]:entry};
    state.portalGrupoError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo guardar. Probá de nuevo.";
    render();
  }
}
// Re-arma y guarda sólo el bloque de una materia puntual. A diferencia de republishAlumnoBlock,
// SÍ firma de nuevo los materiales compartidos de esta materia (materialesIndexFor) en vez de
// reusar publicado.biblioteca: esta última sólo se arma al tocar "Publicar cambios" general, así
// que si la llave grupal se crea o edita antes de tocarlo (o antes de compartir un material
// nuevo), reusar la biblioteca vieja dejaría el grupo sin ver nada — firmando acá directo, la
// llave grupal siempre refleja lo que hoy está marcado "Compartido" en Materias.
async function republishGrupoBlock(materiaId){
  try{
    const {s, uid_, h, row}=await fetchPortalRow("publicado,tokens_grupos");
    const tokensGrupos=row.tokens_grupos||{};
    const entry=Object.values(tokensGrupos).find(g=>g.materiaId===materiaId);
    const m=subjById(materiaId);
    const compartidos=materialesIndexFor(materiaId).filter(f=>f.compartido);
    const bibMateria=await Promise.all(compartidos.map(async f=>{
      const path=materialPath(uid_, materiaId, f.name);
      const url=await signMaterialUrl(s, path, PORTAL_LINK_TTL_DAYS*86400);
      // unitNombre/unitOrden: nombre y orden de la unidad denormalizados AL PUBLICAR (paso 128),
      // no un id vivo — el portal no tiene acceso a catalog.subjects, así que agrupar por unidad
      // ahí (ver bibliotecaHtml en portal.js) necesita esta etiqueta ya resuelta.
      const unit=(f.unitId && m) ? (m.units||[]).find(u=>u.id===f.unitId) : null;
      return {subjectId:materiaId, materia:m?m.name:"", color:subjectColorKey(materiaId), nombre:materialDisplayName(f.name),
        path, url, bytes:f.bytes||0, at:f.at||null, firmadoAt:Date.now(),
        unitNombre:unit?unit.nombre:"", unitOrden:unit?unit.orden:null};
    }));
    const bloque=buildGrupoBlock(materiaId, entry?entry.alumnos:[], bibMateria);
    const grupos={...((row.publicado&&row.publicado.grupos)||{})};
    if(bloque) grupos[materiaId]=bloque; else delete grupos[materiaId];
    const publicado={...(row.publicado||{}), grupos};
    await patchPortalRow(uid_, h, {publicado});
    if(state.portal) state.portal.publicado=publicado;
  }catch(e){ /* silencioso: se corrige con el próximo intento (editar alumnos, regenerar, o "Publicar cambios") */ }
}

/* ============ materiales por materia (Supabase Storage, bucket privado "materiales") ============
   Ruta de cada archivo: materiales/{uid}/{subjectId}/{nombre-saneado}. El uid siempre sale del
   JWT de la sesión propia (jwtSub), nunca de un valor manejado por el usuario — el aislamiento
   entre cuentas lo terminan de garantizar las políticas RLS del bucket (repo cuaderno-supabase).
   Esta sección no tiene sentido offline: cada acción chequea navigator.onLine antes de tocar la red. */
function sanitizeFileName(name){
  const dot=name.lastIndexOf(".");
  const base=dot>0?name.slice(0,dot):name;
  const ext=dot>0?name.slice(dot+1):"";
  const clean=(s)=>s.normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"_");
  const cleanBase=(clean(base)||"archivo").slice(0,60);
  const cleanExt=clean(ext).slice(0,10);
  return cleanExt ? `${cleanBase}.${cleanExt}` : cleanBase;
}
// Prefijo corto para que dos subidas con el mismo nombre de archivo no choquen en la misma ruta.
function materialDisplayName(storedName){ return storedName.replace(/^[0-9a-z]{6}-/,""); }
function materialPath(uid_, subjectId, fileName){ return `${uid_}/${subjectId}/${fileName}`; }
function materialObjectUrl(path){
  return SUPA_URL+"/storage/v1/object/"+MATERIALES_BUCKET+"/"+path.split("/").map(encodeURIComponent).join("/");
}

/* ============ fotos de perfil: subida/borrado (paso 137) ============
   Misma ruta con "x-upsert" (en vez de un nombre único como los materiales, ver materialPath):
   la foto de un mismo alumno/docente siempre pisa el mismo objeto, así que no hay que borrar la
   vieja antes de subir la nueva ni acumular basura en el bucket. "key" es "docente" o
   "alumno-{studentId}" — AVATAR_KEY_DOCENTE/avatarKeyForStudent más abajo son las únicas dos
   formas de construirla, para no repetir el string a mano en cada lugar que la usa. */
const AVATAR_KEY_DOCENTE = "docente";
function avatarKeyForStudent(studentId){ return "alumno-"+studentId; }
function avatarPath(uid_, key){ return `${uid_}/avatars/${key}.webp`; }
function avatarBytesFor(key){
  if(key===AVATAR_KEY_DOCENTE) return Number(docenteFor().foto && docenteFor().foto.bytes)||0;
  const st=state.students.find(x=>x.id===key.slice("alumno-".length));
  return Number(st && st.foto && st.foto.bytes)||0;
}
function setAvatarField(key, foto){
  if(key===AVATAR_KEY_DOCENTE){ state.catalog.docente={...docenteFor(), foto}; touchCatalog(); return; }
  update(key.slice("alumno-".length), {foto});
}
async function loadAvatarDataUrl(foto){
  if(!foto || !foto.path) return;
  const cacheKey=foto.path+"|"+(foto.updatedAt||0);
  if(_avatarDataUrlCache.has(cacheKey) || _avatarLoading.has(cacheKey)) return;
  _avatarLoading.add(cacheKey);
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(materialObjectUrl(foto.path), {headers:h});
    if(!r.ok) throw new Error("error "+r.status);
    const blob=await r.blob();
    const dataUrl=await new Promise((resolve,reject)=>{
      const fr=new FileReader(); fr.onload=()=>resolve(fr.result); fr.onerror=reject; fr.readAsDataURL(blob);
    });
    _avatarDataUrlCache.set(cacheKey, dataUrl);
    render();
  }catch(e){ /* se reintenta solo en el próximo render (no queda cacheado el fallo) */ }
  finally{ _avatarLoading.delete(cacheKey); }
}
async function uploadAvatar(key, file){
  if(!navigator.onLine){ state.avatarUploadError="offline"; render(); return; }
  state.avatarUploading=true; state.avatarUploadError=""; render();
  try{
    const blob=await resizeImageToAvatar(file);
    if(!blob) throw new Error("no se pudo procesar la imagen");
    const usedBytes=materialesTotalBytes()-avatarBytesFor(key); // sin contar la foto vieja de esta misma key
    if(usedBytes+blob.size > MATERIAL_MAX_TOTAL_BYTES){
      state.avatarUploading=false;
      state.avatarUploadError="No entra en tu espacio de materiales (50 MB en total, entre archivos y fotos).";
      render(); return;
    }
    if(IS_DEMO){
      state.avatarUploading=false;
      state.avatarUploadError="En modo demostración no se pueden subir fotos — quedan las iniciales.";
      render(); return;
    }
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const path=avatarPath(uid_, key);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"image/webp", "x-upsert":"true"};
    const r=await fetch(materialObjectUrl(path), {method:"POST", headers:h, body:blob});
    if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.message||j.error||("error "+r.status)); }
    setAvatarField(key, {path, bytes:blob.size, updatedAt:Date.now()});
    state.avatarUploading=false;
    toast("Foto actualizada");
  }catch(e){
    state.avatarUploading=false;
    state.avatarUploadError = !navigator.onLine ? "offline" : "No se pudo subir la foto.";
    render();
  }
}
async function deleteAvatar(key){
  if(!navigator.onLine){ state.avatarUploadError="offline"; render(); return; }
  if(!IS_DEMO){
    try{
      const s=await ensureToken();
      const uid_=jwtSub(s.access);
      const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
      await fetch(materialObjectUrl(avatarPath(uid_, key)), {method:"DELETE", headers:h});
    }catch(e){ /* si falla el borrado en Storage, igual se saca de la ficha/cuenta — no bloquea al profesor */ }
  }
  setAvatarField(key, null);
  toast("Foto eliminada");
}
// QR de cobros (paso 141): mismo bucket/patrón que las fotos de perfil (misma ruta con
// "x-upsert", sin nombre único) — objeto propio "cobros-qr" en vez de "docente"/"alumno-{id}"
// para no pisar la foto de perfil del docente.
function cobrosQrPath(uid_){ return `${uid_}/avatars/cobros-qr.webp`; }
async function uploadCobrosQr(file){
  if(!navigator.onLine){ state.cobrosQrError="offline"; render(); return; }
  state.cobrosQrUploading=true; state.cobrosQrError=""; render();
  try{
    const blob=await resizeImageToQr(file);
    if(!blob) throw new Error("no se pudo procesar la imagen");
    const usedBytes=materialesTotalBytes()-(Number(cobrosDocenteFor().qr && cobrosDocenteFor().qr.bytes)||0);
    if(usedBytes+blob.size > MATERIAL_MAX_TOTAL_BYTES){
      state.cobrosQrUploading=false;
      state.cobrosQrError="No entra en tu espacio de materiales (50 MB en total, entre archivos y fotos).";
      render(); return;
    }
    if(IS_DEMO){
      state.cobrosQrUploading=false;
      state.cobrosQrError="En modo demostración no se pueden subir imágenes.";
      render(); return;
    }
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const path=cobrosQrPath(uid_);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"image/webp", "x-upsert":"true"};
    const r=await fetch(materialObjectUrl(path), {method:"POST", headers:h, body:blob});
    if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.message||j.error||("error "+r.status)); }
    state.catalog.cobrosDocente={...cobrosDocenteFor(), qr:{path, bytes:blob.size, updatedAt:Date.now()}};
    touchCatalog();
    state.cobrosQrUploading=false;
    toast("QR actualizado");
  }catch(e){
    state.cobrosQrUploading=false;
    state.cobrosQrError = !navigator.onLine ? "offline" : "No se pudo subir el QR.";
    render();
  }
}
async function deleteCobrosQr(){
  if(!navigator.onLine){ state.cobrosQrError="offline"; render(); return; }
  if(!IS_DEMO){
    try{
      const s=await ensureToken();
      const uid_=jwtSub(s.access);
      const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
      await fetch(materialObjectUrl(cobrosQrPath(uid_)), {method:"DELETE", headers:h});
    }catch(e){ /* si falla el borrado en Storage, igual se saca de Cuenta — no bloquea al docente */ }
  }
  state.catalog.cobrosDocente={...cobrosDocenteFor(), qr:null};
  touchCatalog();
  toast("QR eliminado");
}

// Índice liviano de materiales (nombre, bytes, fecha) guardado dentro de state.catalog, por
// materia — así uploadMaterial puede chequear el total de MATERIAL_MAX_TOTAL_BYTES sin listar Storage en cada
// subida. Es un espejo del list() real de Storage, así que puede desincronizarse (borrados desde
// otro dispositivo, subidas a mitad de camino): loadMateriales lo reconcilia contra Storage cada
// vez que se abre la sección Materiales de una materia.
function materialesIndexFor(subjectId){
  const s=subjById(subjectId);
  return (s && Array.isArray(s.materiales)) ? s.materiales : [];
}
function materialIndexEntry(subjectId, name){
  return materialesIndexFor(subjectId).find(m=>m.name===name) || null;
}
function materialesTotalBytes(){
  let total=(state.catalog.subjects||[]).reduce((sum,s)=>
    sum+((s.materiales||[]).reduce((a,m)=>a+(Number(m.bytes)||0),0)), 0);
  // Fotos de perfil (paso 137): cuentan contra el mismo total de 50 MB, aunque a ~60 KB cada una
  // sean despreciables frente a los materiales.
  total += Number(docenteFor().foto && docenteFor().foto.bytes)||0;
  total += (state.students||[]).reduce((a,s)=>a+(Number(s.foto&&s.foto.bytes)||0),0);
  // QR de cobros (paso 141): mismo bucket/cuota que fotos de perfil y materiales.
  total += Number(cobrosDocenteFor().qr && cobrosDocenteFor().qr.bytes)||0;
  return total;
}
function materialesIndexMatches(subjectId, storageList){
  const idx=materialesIndexFor(subjectId);
  if(idx.length!==storageList.length) return false;
  const key=(name,bytes)=>name+"|"+bytes;
  const idxKeys=new Set(idx.map(m=>key(m.name,m.bytes)));
  return storageList.every(f=>idxKeys.has(key(f.name,(f.metadata&&f.metadata.size)||0)));
}
// Preserva "compartido" y "unitId" (matcheando por nombre+bytes, misma clave que
// materialesIndexMatches) para que reconciliar contra Storage no borre sin querer lo que ya
// está compartido en el portal ni el enlace a unidad de un material (paso 128).
function reconcileMaterialesIndex(subjectId, storageList){
  if(materialesIndexMatches(subjectId, storageList)) return;
  const s=subjById(subjectId);
  if(!s) return;
  const prev=new Map((s.materiales||[]).map(m=>[m.name+"|"+m.bytes, m]));
  s.materiales=storageList.map(f=>{
    const bytes=(f.metadata&&f.metadata.size)||0;
    const old=prev.get(f.name+"|"+bytes);
    return {name:f.name, bytes, at:f.updated_at||f.created_at||null, compartido:!!(old&&old.compartido), unitId:(old&&old.unitId)||""};
  });
  touchCatalog();
}
// Cambia a qué unidad de la materia está enlazado un material (paso 128) — unitId vacío/""
// significa "General" (sin unidad). No toca el portal: si el archivo ya estaba compartido, el
// cambio se ve ahí recién con la próxima "Publicar cambios" (mismo criterio que ya tenía
// mat-toggle-share antes de este paso, salvo el caso especial de dejar de compartir/borrar, que
// sí saca el archivo al toque vía removeFromPortalBiblioteca).
function setMaterialUnit(subjectId, fileName, unitId){
  const entry=materialIndexEntry(subjectId, fileName); if(!entry) return;
  entry.unitId=unitId||"";
  touchCatalog();
}

async function loadMateriales(subjectId){
  state.materialesSubjectId=subjectId; state.materialesLoaded=false; state.materialesError="";
  state.materialesConfirmDelName=null; state.materialesUnitOpenId=null;
  // Demo: no hay Storage real — la lista sale directo de catalog.subjects[].materiales, que ya
  // trae todo lo que necesita esta vista (name/bytes/at), sin pegarle a la red.
  if(IS_DEMO){
    state.materialesList=materialesIndexFor(subjectId).map(m=>({id:m.name, name:m.name, metadata:{size:m.bytes}, updated_at:m.at}));
    state.materialesLoaded=true; render(); return;
  }
  if(!navigator.onLine){ state.materialesError="offline"; state.materialesLoaded=true; render(); return; }
  render();
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
    const r=await fetch(SUPA_URL+"/storage/v1/object/list/"+MATERIALES_BUCKET,{method:"POST", headers:h,
      body:JSON.stringify({prefix:`${uid_}/${subjectId}`, limit:100, sortBy:{column:"name",order:"asc"}})});
    if(!r.ok) throw new Error("error "+r.status);
    const list=await r.json();
    state.materialesList=(Array.isArray(list)?list:[]).filter(x=>x.id);
    state.materialesLoaded=true; state.materialesError="";
    reconcileMaterialesIndex(subjectId, state.materialesList);
  }catch(e){
    state.materialesLoaded=true;
    state.materialesError = !navigator.onLine ? "offline" : "No se pudieron cargar los materiales.";
  }
  render();
}
async function uploadMaterial(subjectId, file, unitId){
  if(!navigator.onLine){ state.materialesUploadError="offline"; render(); return; }
  if(file.size > MATERIAL_MAX_BYTES){
    state.materialesUploadError=`«${file.name}» pesa ${fmtBytes(file.size)} — el máximo por archivo es ${fmtBytes(MATERIAL_MAX_BYTES)}.`;
    render(); return;
  }
  if((state.materialesList||[]).length >= MATERIAL_MAX_COUNT){
    state.materialesUploadError=`Ya hay ${MATERIAL_MAX_COUNT} materiales en esta materia — borrá alguno para subir otro.`;
    render(); return;
  }
  const usedBytes=materialesTotalBytes();
  if(usedBytes+file.size > MATERIAL_MAX_TOTAL_BYTES){
    const free=Math.max(0, MATERIAL_MAX_TOTAL_BYTES-usedBytes);
    state.materialesUploadError=`No entra: quedan ${fmtBytes(free)} libres de los ${fmtBytes(MATERIAL_MAX_TOTAL_BYTES)} totales entre todas tus materias.`;
    render(); return;
  }
  state.materialesUploading=true; state.materialesUploadError=""; render();
  if(IS_DEMO){
    const subj=subjById(subjectId);
    if(subj) subj.materiales=[...(subj.materiales||[]), {name:uid().slice(-6)+"-"+file.name, bytes:file.size, at:new Date().toISOString(), compartido:false, unitId:unitId||""}];
    touchCatalog();
    state.materialesUploading=false;
    await loadMateriales(subjectId);
    return;
  }
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const fileName = uid().slice(-6)+"-"+sanitizeFileName(file.name);
    const path=materialPath(uid_, subjectId, fileName);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type": file.type||"application/octet-stream"};
    const r=await fetch(materialObjectUrl(path), {method:"POST", headers:h, body:file});
    if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.message||j.error||("error "+r.status)); }
    state.materialesUploading=false;
    await loadMateriales(subjectId);
    // El índice recién se crea al reconciliar contra Storage (loadMateriales de arriba), así que
    // el unitId elegido en el selector de "subir" se pega después, no en el objeto pusheado acá.
    if(unitId){
      const entry=materialIndexEntry(subjectId, fileName);
      if(entry){ entry.unitId=unitId; touchCatalog(); }
    }
  }catch(e){
    state.materialesUploading=false;
    state.materialesUploadError = !navigator.onLine ? "offline" : "No se pudo subir el archivo.";
    render();
  }
}
async function deleteMaterial(subjectId, fileName){
  if(!navigator.onLine){ state.materialesError="offline"; render(); return; }
  state.materialesDeleteStatus="deleting"; render();
  if(IS_DEMO){
    const subj=subjById(subjectId);
    if(subj) subj.materiales=(subj.materiales||[]).filter(m=>m.name!==fileName);
    touchCatalog();
    state.materialesDeleteStatus="idle"; state.materialesConfirmDelName=null;
    await loadMateriales(subjectId);
    return;
  }
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(materialObjectUrl(materialPath(uid_, subjectId, fileName)), {method:"DELETE", headers:h});
    if(!r.ok) throw new Error("error "+r.status);
    state.materialesDeleteStatus="idle";
    removeFromPortalBiblioteca(subjectId, fileName);
    await loadMateriales(subjectId);
  }catch(e){
    state.materialesDeleteStatus="idle";
    state.materialesError = !navigator.onLine ? "offline" : "No se pudo borrar el archivo.";
    render();
  }
}
async function downloadMaterial(subjectId, fileName){
  if(IS_DEMO){ toast("Es un archivo de muestra — no hay nada real para descargar."); return; }
  if(!navigator.onLine){ state.materialesError="offline"; render(); return; }
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(materialObjectUrl(materialPath(uid_, subjectId, fileName)), {headers:h});
    if(!r.ok) throw new Error("error "+r.status);
    const blob=await r.blob();
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url; link.download=materialDisplayName(fileName);
    link.click(); URL.revokeObjectURL(url);
  }catch(e){
    state.materialesError = !navigator.onLine ? "offline" : "No se pudo descargar el archivo.";
    render();
  }
}
// Borra del bucket todos los materiales de una materia (se usa al eliminarla del catálogo,
// solo si el usuario elige explícitamente borrarlos también). No bloquea el borrado de la
// materia si alguna falla: es una limpieza best-effort.
async function deleteAllMaterialsForSubject(uid_, s, subjectId, files){
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
  for(const f of files){
    try{ await fetch(materialObjectUrl(materialPath(uid_, subjectId, f.name)), {method:"DELETE", headers:h}); }
    catch(e){ /* best-effort: seguimos con los demás */ }
  }
}
async function listMaterialsForSubject(subjectId){
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
    const r=await fetch(SUPA_URL+"/storage/v1/object/list/"+MATERIALES_BUCKET,{method:"POST", headers:h,
      body:JSON.stringify({prefix:`${uid_}/${subjectId}`, limit:100})});
    if(!r.ok) throw new Error("error "+r.status);
    const list=await r.json();
    return {uid_, s, files:(Array.isArray(list)?list:[]).filter(x=>x.id)};
  }catch(e){ return {uid_:null, s:null, files:[]}; }
}
// Al borrar una materia del catálogo (paso 76): en vez de sacarla del todo, se manda a la
// papelera (catalog.trash) con fecha de borrado — se puede restaurar completa (unidades, color,
// packs a los que pertenecía) durante 7 días, después se purga sola (ver trashDaysLeft() en
// helpers.js). Los materiales en Storage son aparte: si tiene guardados, avisa y ofrece
// borrarlos también (dos confirm() nativos, igual que antes) — eso sí es irreversible y no
// forma parte de la papelera. Offline no intenta comprobar nada de materiales.
async function deleteSubjectAndMaybeMaterials(subjectId){
  const subj=subjById(subjectId); if(!subj) return;
  // Materiales compartidos de esta materia: se sacan de la biblioteca del portal al borrar la
  // materia entera, se elija o no borrarlos también de Storage (ya dejaron de existir para el
  // catálogo, así que no tiene sentido que sigan visibles ahí).
  const compartidos=materialesIndexFor(subjectId).filter(f=>f.compartido);
  const packIds=packsContaining(subjectId).map(p=>p.id);
  const moveToTrash=()=>{
    state.catalog.subjects=state.catalog.subjects.filter(m=>m.id!==subjectId);
    state.catalog.packs=(state.catalog.packs||[]).map(p=>({...p, subjectIds:p.subjectIds.filter(id=>id!==subjectId)}));
    state.catalog.trash=[...(state.catalog.trash||[]), {type:"subject", subject:subj, packIds, deletedAt:Date.now()}];
    touchCatalog();
    compartidos.forEach(f=>removeFromPortalBiblioteca(subjectId, f.name));
    toast(`Materia eliminada — va a la papelera por 7 días`, "ok", ()=>restoreSubjectFromTrash(subjectId));
  };
  if(!navigator.onLine){ moveToTrash(); return; }
  const {uid_, s, files} = await listMaterialsForSubject(subjectId);
  if(files.length===0){ moveToTrash(); return; }
  const n=files.length;
  if(!confirm(`Esta materia tiene ${n} material${n===1?"":"es"} guardado${n===1?"":"s"}. ¿Eliminar la materia igualmente?`)) return;
  moveToTrash();
  if(uid_ && confirm(`¿Borrar también ${n===1?"ese material":"esos "+n+" materiales"} del almacenamiento? Si elegís que no, quedan guardados pero ya no vas a poder verlos ni borrarlos desde la app.`)){
    await deleteAllMaterialsForSubject(uid_, s, subjectId, files);
  }
}
// Restaura una materia de la papelera: la vuelve a catalog.subjects y, si los packs que la
// tenían siguen existiendo, se la vuelve a agregar (los que ya no existen se ignoran).
function restoreSubjectFromTrash(subjectId){
  const entry=(state.catalog.trash||[]).find(t=>t.type==="subject" && t.subject.id===subjectId); if(!entry) return;
  state.catalog.trash=state.catalog.trash.filter(t=>t!==entry);
  state.catalog.subjects=[...state.catalog.subjects, entry.subject];
  state.catalog.packs=(state.catalog.packs||[]).map(p=>
    entry.packIds.includes(p.id) && !p.subjectIds.includes(subjectId)
      ? {...p, subjectIds:[...p.subjectIds, subjectId]} : p);
  touchCatalog();
  toast("Materia restaurada");
}
// Elimina definitivamente una materia de la papelera (botón "Eliminar definitivo" en Cuenta) —
// ya no se puede deshacer.
function purgeSubjectFromTrash(subjectId){
  state.catalog.trash=(state.catalog.trash||[]).filter(t=>!(t.type==="subject" && t.subject.id===subjectId));
  touchCatalog();
}

/* ============ duplicar materia (paso 77) ============ */
// Copia una materia con su estructura (unidades, color, materiales de referencia) a una nueva —
// sin alumnos ni historial, para armar rápido una materia parecida a otra. La copia queda con
// "(copia)" en el nombre y se abre su editor directo, igual que al crear una materia nueva. Los
// materiales se copian en Storage en segundo plano (best-effort, requiere conexión) — la materia
// nueva queda usable de inmediato aunque la copia de archivos todavía esté en curso.
async function duplicateSubject(subjectId){
  const src=subjById(subjectId); if(!src) return;
  const nm={id:uid(), name:src.name+" (copia)", units:normalizeUnits(src.units), color:nextSubjectColor(), materiales:[], careerIds:[...(src.careerIds||[])]};
  state.catalog.subjects.push(nm);
  state.editSubjectId=nm.id; state.editPackId=null; state.catConfirmDelId=null;
  loadMateriales(nm.id);
  touchCatalog();
  toast("Materia duplicada");
  if(!navigator.onLine) return;
  const {uid_, s, files} = await listMaterialsForSubject(subjectId);
  if(!files.length) return;
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json"};
  for(const f of files){
    try{
      await fetch(SUPA_URL+"/storage/v1/object/copy", {method:"POST", headers:h,
        body:JSON.stringify({bucketId:MATERIALES_BUCKET,
          sourceKey:materialPath(uid_, subjectId, f.name), destinationKey:materialPath(uid_, nm.id, f.name)})});
    }catch(e){ /* best-effort: seguimos con los demás */ }
  }
  if(state.materialesSubjectId===nm.id) loadMateriales(nm.id);
}
