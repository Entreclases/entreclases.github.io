"use strict";
/* ============ aviso de versión nueva (apps nativas) ============ */
// Compara por partes numéricas en vez de string-equality para no avisar de una "versión
// nueva" cuando el tag remoto es igual o más viejo que APP_VERSION (build local adelantado).
function versionIsNewer(remote, current){
  const a = String(remote||"").replace(/^v/i,"").split(".").map(n=>parseInt(n,10)||0);
  const b = String(current||"").replace(/^v/i,"").split(".").map(n=>parseInt(n,10)||0);
  for(let i=0;i<Math.max(a.length,b.length);i++){
    const x=a[i]||0, y=b[i]||0;
    if(x!==y) return x>y;
  }
  return false;
}
async function checkForNewVersion(){
  if(!window.Capacitor) return; // en Tauri el aviso lo reemplaza checkTauriUpdate(), que instala directo
  const last = parseInt(localStorage.getItem(VERSION_CHECK_KEY)||"0",10);
  if(Date.now()-last < VERSION_CHECK_INTERVAL_MS) return;
  try{
    const r = await fetch(RELEASES_API);
    localStorage.setItem(VERSION_CHECK_KEY, String(Date.now())); // se marca como hecho aunque r no sea ok (evita pegarle a la API si está caída/rate-limited)
    if(!r.ok) return;
    const j = await r.json();
    if(j.tag_name && versionIsNewer(j.tag_name, APP_VERSION)){
      state.newVersionTag = j.tag_name;
      render();
    }
  }catch(e){ /* silencioso: sin internet o falla puntual de la API; se reintenta al otro día */ }
}

/* ============ auto-update real (Windows / Tauri) ============
   Usa tauri-plugin-updater, expuesto como window.__TAURI__.updater porque
   app.withGlobalTauri está activo en tauri.conf.json (sin bundler ni import). */
async function checkTauriUpdate(){
  if(!window.__TAURI__) return;
  try{
    const update = await window.__TAURI__.updater.check();
    if(!update) return;
    const instalar = confirm(`Hay una actualización disponible (v${update.version}). ¿Instalar ahora?`);
    if(!instalar) return;
    await update.downloadAndInstall();
    await window.__TAURI__.process.relaunch();
  }catch(e){ /* silencioso: sin internet, sin release firmado todavía, o falla puntual del endpoint */ }
}

function authMsgShow(t,ok){
  const el=document.getElementById("authMsg");
  if(el){ el.textContent=t; el.style.color = ok ? "var(--green)" : "var(--red)"; }
}

/* ============ eventos ============ */
document.addEventListener("click", (e)=>{
  const el = e.target.closest("[data-a]"); if(!el) return;
  const a = el.dataset.a, s = sel();
  if(a==="nav-tablero"){ state.view="tablero"; state.selId=null; }
  else if(a==="nav-lista"){ state.view="lista"; state.selId=null; }
  else if(a==="nav-cuenta"){
    state.view="cuenta"; state.selId=null; state.confirmRestoreId=null;
    state.backupsLoaded=false; state.backupsError=""; loadBackups();
  }
  else if(a==="nav-catalog"){ state.view="catalog"; state.selId=null; state.editSubjectId=null; }
  else if(a==="nav-stats"){
    state.view="stats"; state.selId=null;
    if(!subjectsWithStudents().some(m=>m.id===state.statsSubjectId)) state.statsSubjectId=defaultStatsSubjectId();
  }
  else if(a==="nav-panel"){
    state.view="panel"; state.selId=null; state.panelTab="reportes";
    state.reportesLoaded=false; state.reportesError="";
    loadReportes();
  }
  else if(a==="panel-tab-reportes"){
    state.panelTab="reportes"; state.reportesLoaded=false; state.reportesError="";
    loadReportes();
  }
  else if(a==="panel-tab-usuarios"){
    state.panelTab="usuarios"; state.usersLoaded=false; state.usersError="";
    loadUsuarios();
  }
  else if(a==="panel-tab-actividad"){
    state.panelTab="actividad"; state.actividadLoaded=false; state.actividadError="";
    loadActividad();
  }
  else if(a==="panel-tab-recursos"){
    state.panelTab="recursos"; state.recursosLoaded=false; state.recursosError="";
    loadRecursos();
  }
  else if(a==="refresh-usuarios"){ state.usersLoaded=false; state.usersError=""; loadUsuarios(); }
  else if(a==="refresh-actividad"){ state.actividadLoaded=false; state.actividadError=""; loadActividad(); }
  else if(a==="refresh-recursos"){ state.recursosLoaded=false; state.recursosError=""; loadRecursos(); }
  else if(a==="reportes-filter"){ state.reportFilter=el.dataset.f; }
  else if(a==="toggle-reporte"){
    const r=(state.reportes||[]).find(x=>String(x.id)===el.dataset.id);
    if(r) toggleReporte(r.id, r.estado);
    return;
  }
  else if(a==="cat-add-career"){
    const v=(document.getElementById("new-career").value||"").trim(); if(!v) return;
    if(!state.catalog.careers.includes(v)) state.catalog.careers.push(v);
    touchCatalog(); return;
  }
  else if(a==="cat-del-career"){ state.catalog.careers.splice(+el.dataset.i,1); touchCatalog(); return; }
  else if(a==="cat-add-subject"){
    const v=(document.getElementById("new-subject").value||"").trim(); if(!v) return;
    const m={id:uid(), name:v, units:[]};
    state.catalog.subjects.push(m); state.editSubjectId=m.id;
    touchCatalog(); return;
  }
  else if(a==="cat-edit-subject"){ state.editSubjectId=el.dataset.id; }
  else if(a==="cat-del-subject"){
    state.catalog.subjects=state.catalog.subjects.filter(m=>m.id!==el.dataset.id);
    touchCatalog(); return;
  }
  else if(a==="cat-close-edit"){ state.editSubjectId=null; }
  else if(a==="cat-add-unit"){
    const v=(document.getElementById("new-unit").value||"").trim(); if(!v) return;
    const m=subjById(state.editSubjectId); if(!m) return;
    if(!m.units.includes(v)) m.units.push(v);
    touchCatalog(); return;
  }
  else if(a==="cat-del-unit"){
    const m=subjById(state.editSubjectId); if(!m) return;
    m.units.splice(+el.dataset.i,1); touchCatalog(); return;
  }
  else if(a==="auth-mode-login"){ state.authMode="login"; }
  else if(a==="auth-mode-signup"){ state.authMode="signup"; }
  else if(a==="auth-login"){
    const em=(document.getElementById("auth-email").value||"").trim();
    const pw=document.getElementById("auth-pass").value||"";
    state.authEmail=em;
    if(!em||!pw){ authMsgShow("Completá correo y contraseña."); return; }
    authMsgShow("Iniciando sesión…",true);
    doLogin(em,pw).then(()=>{ render(); syncNow(); })
      .catch(err=>{
        if(isEmailNotConfirmedError(err)){
          state.pendingConfirmEmail=em; state.confirmStatus="idle"; state.confirmError=""; render();
        }else{
          authMsgShow(friendlyAuthError(err));
        }
      });
    return;
  }
  else if(a==="auth-signup"){
    const em=(document.getElementById("auth-email").value||"").trim();
    const pw=document.getElementById("auth-pass").value||"";
    state.authEmail=em;
    if(!em){ authMsgShow("Ingresá tu correo."); return; }
    if(pw.length<6){ authMsgShow("La contraseña tiene que tener al menos 6 caracteres."); return; }
    authMsgShow("Creando cuenta…",true);
    doSignup(em,pw).then(ok=>{
      if(ok){ render(); syncNow(); }
      else{ state.pendingConfirmEmail=em; state.confirmStatus="idle"; state.confirmError=""; render(); }
    }).catch(err=>authMsgShow(friendlyAuthError(err)));
    return;
  }
  else if(a==="resend-confirm"){
    const email=state.pendingConfirmEmail; if(!email) return;
    state.confirmStatus="sending"; render();
    resendConfirmEmail(email).then(()=>{
      state.confirmStatus="ok"; render();
    }).catch(err=>{
      state.confirmStatus="error"; state.confirmError=friendlyAuthError(err); render();
    });
    return;
  }
  else if(a==="back-to-login"){
    state.pendingConfirmEmail=null; state.confirmStatus="idle"; state.confirmError=""; state.authMode="login";
    render(); return;
  }
  else if(a==="auth-forgot"){
    const em=(document.getElementById("auth-email").value||"").trim();
    if(!em){ authMsgShow("Escribí tu correo arriba y tocá de nuevo el enlace."); return; }
    authMsgShow("Enviando…",true);
    authFetch("/auth/v1/recover?redirect_to="+encodeURIComponent(location.origin+location.pathname),{email:em})
      .then(()=>authMsgShow("Si ese correo tiene una cuenta, te llegó un enlace para elegir una contraseña nueva.",true))
      .catch(err=>authMsgShow(friendlyAuthError(err)));
    return;
  }
  else if(a==="auth-set-password"){
    const p1=document.getElementById("newpass1").value||"";
    const p2=document.getElementById("newpass2").value||"";
    if(p1.length<6){ authMsgShow("La contraseña tiene que tener al menos 6 caracteres."); return; }
    if(p1!==p2){ authMsgShow("Las dos contraseñas no coinciden."); return; }
    authMsgShow("Guardando…",true);
    setNewPassword(p1).then(()=>{ state.recovery=null; render(); syncNow(); })
      .catch(err=>authMsgShow(friendlyAuthError(err)));
    return;
  }
  else if(a==="set-theme"){ setTheme(el.dataset.f); }
  else if(a==="sync-now"){ syncNow(true); return; }
  else if(a==="dismiss-update-banner"){ state.updateBannerDismissed=true; }
  else if(a==="restore-ask"){ state.confirmRestoreId=el.dataset.id; }
  else if(a==="restore-cancel"){ state.confirmRestoreId=null; }
  else if(a==="restore-confirm"){ restoreBackup(el.dataset.id); return; }
  else if(a==="send-report"){
    const msg=(document.getElementById("report-msg").value||"").trim();
    state.reportMsg=msg;
    if(!msg){ state.reportStatus="error"; state.reportError="Escribí un mensaje antes de enviar."; render(); return; }
    if(!navigator.onLine){ state.reportStatus="error"; state.reportError="Se necesita conexión a internet para enviar el reporte."; render(); return; }
    state.reportStatus="sending"; render();
    sendReport(msg).then(()=>{
      state.reportStatus="ok"; state.reportMsg=""; render();
    }).catch(()=>{
      state.reportStatus="error";
      state.reportError = !navigator.onLine ? "Se necesita conexión a internet para enviar el reporte." : "No se pudo enviar el reporte. Probá de nuevo.";
      render();
    });
    return;
  }
  else if(a==="auth-logout"){ setSes(null); state.view="tablero"; render(); return; }
  else if(a==="open"){ state.view="detalle"; state.selId=el.dataset.id; state.tab="temas"; state.confirmDel=false; }
  else if(a==="back"){ state.view="lista"; state.selId=null; }
  else if(a==="new"){ state.showNew=true; }
  else if(a==="cancel-new"){ state.showNew=false; }
  else if(a==="create"){
    const name=document.getElementById("n-name").value.trim();
    if(!name){ document.getElementById("n-name").focus(); return; }
    const st=emptyStudent();
    st.name=name;
    st.career=document.getElementById("n-career").value;
    const _m=subjById(document.getElementById("n-subject").value);
    st.subjectId=_m?_m.id:""; st.subject=_m?_m.name:"";
    st.topics=_m?Object.fromEntries(_m.units.map(u=>[u,"pendiente"])):{};
    st.examDate=document.getElementById("n-exam").value;
    st.notes=document.getElementById("n-notes").value;
    state.students.push(st); save();
    state.showNew=false; state.view="detalle"; state.selId=st.id; state.tab="temas";
  }
  else if(a.startsWith("tab-")){ state.tab=a.slice(4); state.confirmDel=false; }
  else if(a==="filter"){ state.filter=el.dataset.f; }
  else if(a==="cycle-topic" && s){
    const t=el.dataset.t, cur=s.topics[t]||"pendiente";
    const next=TOPIC_CYCLE[(TOPIC_CYCLE.indexOf(cur)+1)%TOPIC_CYCLE.length];
    update(s.id,{topics:{...s.topics,[t]:next}}); return;
  }
  else if(a==="cycle-sem" && s){
    const next=SEM_CYCLE[(SEM_CYCLE.indexOf(s.semaforo||"sd")+1)%SEM_CYCLE.length];
    update(s.id,{semaforo:next}); return;
  }
  else if(a==="save-session" && s){
    const date=document.getElementById("c-date").value; if(!date) return;
    update(s.id,{sessions:[...s.sessions,{id:uid(),date,
      topic:document.getElementById("c-topic").value,
      tarea:document.getElementById("c-tarea").value,
      note:document.getElementById("c-note").value}]}); return;
  }
  else if(a==="del-session" && s){
    update(s.id,{sessions:s.sessions.filter(x=>x.id!==el.dataset.id)}); return;
  }
  else if(a==="save-sim" && s){
    const date=document.getElementById("s-date").value; if(!date) return;
    update(s.id,{simulacros:[...s.simulacros,{id:uid(),date,
      grade:document.getElementById("s-grade").value,
      note:document.getElementById("s-note").value}]}); return;
  }
  else if(a==="del-sim" && s){
    update(s.id,{simulacros:s.simulacros.filter(x=>x.id!==el.dataset.id)}); return;
  }
  else if(a==="ask-del"){ state.confirmDel=true; }
  else if(a==="cancel-del"){ state.confirmDel=false; }
  else if(a==="confirm-del" && s){
    state.view="lista"; state.confirmDel=false;
    const id=s.id; state.selId=null;
    update(id,{deleted:true}); return;
  }
  else if(a==="export"){
    const blob=new Blob([JSON.stringify({students:state.students},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url; link.download=`seguimiento-estudiantes-${today()}.json`;
    link.click(); URL.revokeObjectURL(url); return;
  }
  else return;
  render();
});

document.addEventListener("change",(e)=>{
  const cf=e.target.closest("[data-cf]");
  if(cf && cf.dataset.cf==="subj-name"){
    const m=subjById(state.editSubjectId); if(!m) return;
    const v=cf.value.trim(); if(!v) return;
    m.name=v;
    state.students=state.students.map(x=>x.subjectId===m.id?{...x,subject:v}:x);
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf==="stats-subject"){ state.statsSubjectId=cf.value; render(); return; }
  const el=e.target.closest("[data-f]"); if(!el) return;
  const s=sel(); if(!s) return;
  if(el.dataset.f==="subjectId"){
    const m=subjById(el.value);
    update(s.id,{subjectId:el.value, subject:m?m.name:s.subject});
    return;
  }
  update(s.id,{[el.dataset.f]:el.value});
});

/* ============ arranque ============ */
const _recovery = parseRecoveryHash();
if(_recovery){ state.recovery=_recovery; history.replaceState(null,"",location.pathname+location.search); }
load(); render();
syncNow();
checkForNewVersion();
checkTauriUpdate();

/* PWA: registrar el service worker cuando la app está publicada (no en file://
   ni dentro de un contenedor nativo como Tauri o Capacitor, que ya resuelven
   los archivos locales sin necesidad de cache de service worker) */
if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !IS_NATIVE) {
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
