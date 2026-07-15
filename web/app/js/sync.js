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
  if(!getSes()){ setStatus("idle"); return; }
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
async function loadBackups(){
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(SUPA_URL+"/rest/v1/cuaderno_respaldos?select=id,created_at,data&order=created_at.desc", {headers:h});
    if(!r.ok) throw new Error("error "+r.status);
    state.backups=await r.json();
    state.backupsLoaded=true; state.backupsError="";
  }catch(e){
    state.backupsError = !navigator.onLine ? "Sin conexión a internet." : "No se pudieron cargar los respaldos.";
  }
  render();
}
async function restoreBackup(id){
  const b=(state.backups||[]).find(x=>String(x.id)===String(id));
  if(!b) return;
  state.restoreStatus="restoring"; state.restoreError=""; render();
  try{
    const s=await ensureToken();
    const uid_=jwtSub(s.access);
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
    // respaldo extra del estado actual antes de pisarlo
    const safety=await fetch(SUPA_URL+"/rest/v1/cuaderno_respaldos", {method:"POST", headers:h,
      body:JSON.stringify([{user_id:uid_, data:{students:state.students, catalog:state.catalog}}])});
    if(!safety.ok) throw new Error("no se pudo guardar el respaldo de seguridad");
    await trimBackups(uid_, s);
    // updatedAt fresco: es el campo que decide el merge en syncNow, así el restore
    // gana la próxima sincronización en vez de que el estado remoto (más reciente) lo pise.
    const now=Date.now();
    state.students=(b.data.students||[]).map(x=>({...x, updatedAt:now}));
    state.catalog={packs:[], ...(b.data.catalog||defaultCatalog()), updatedAt:now};
    state.confirmRestoreId=null; state.restoreStatus="idle";
    save(); syncNow(); render();
    loadBackups();
  }catch(e){
    state.restoreStatus="error";
    state.restoreError = !navigator.onLine ? "Sin conexión a internet." : "No se pudo restaurar. Probá de nuevo.";
    render();
  }
}

/* ============ reportar un problema / panel admin (reportes y usuarios) ============ */
async function sendReport(msg){
  const ses=getSes(); if(!ses) throw new Error("no-session");
  const s=await ensureToken();
  const uid_=jwtSub(s.access);
  const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access, "Content-Type":"application/json", Prefer:"return=minimal"};
  const r=await fetch(SUPA_URL+"/rest/v1/reportes",{method:"POST", headers:h,
    body:JSON.stringify([{user_id:uid_, email:ses.email, mensaje:msg, plataforma:detectPlatform(), version:APP_VERSION}])});
  if(!r.ok){ const j=await r.json().catch(()=>({})); throw new Error(j.message||j.msg||("error "+r.status)); }
}
async function loadReportes(){
  try{
    const s=await ensureToken();
    const h={apikey:SUPA_ANON_KEY, Authorization:"Bearer "+s.access};
    const r=await fetch(SUPA_URL+"/rest/v1/reportes?select=*&order=created_at.desc",{headers:h});
    if(!r.ok) throw new Error("error "+r.status);
    state.reportes=await r.json();
    state.reportesLoaded=true; state.reportesError="";
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
}
