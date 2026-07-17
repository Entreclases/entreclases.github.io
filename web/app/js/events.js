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

/* ============ notificación diaria de cobros atrasados (una por día, por dispositivo) ============
   El aviso EN el tablero (vCobrosBanner) se recalcula en cada render, siempre al día; esto
   sólo gobierna la notificación del SISTEMA, que sí necesita un tope de una vez por día para
   no interrumpir en cada apertura de la app. */
function maybeNotifyCobros(){
  if(!getSes()) return;
  const rec = recordatoriosFor();
  if(!rec.activo || !rec.notificacionesOS) return;
  if(typeof Notification==="undefined" || Notification.permission!=="granted") return;
  if(localStorage.getItem(LAST_COBROS_NOTIFY_KEY)===today()) return;
  const sum = cobrosAtrasadosSummary(rec.diasAtraso);
  if(sum.count===0) return;
  try{
    new Notification("Cuaderno de seguimiento", {
      body: `Tenés ${sum.count} cobro${sum.count===1?"":"s"} atrasado${sum.count===1?"":"s"} por ${fmtMoney(sum.total)}.`,
    });
    localStorage.setItem(LAST_COBROS_NOTIFY_KEY, today());
  }catch(e){ /* silencioso: algún navegador/SO puntual puede bloquear la construcción */ }
}

function authMsgShow(t,ok){
  const el=document.getElementById("authMsg");
  if(el){ el.textContent=t; el.style.color = ok ? "var(--green)" : "var(--red)"; }
}

/* ============ eventos ============ */
document.addEventListener("click", (e)=>{
  // Ayuda contextual (paso 74): un click afuera del popover abierto lo cierra, sin esperar
  // a que el click caiga en algo con data-a (que es lo único que dispara render() más abajo).
  if(state.helpOpen && !e.target.closest(".help-tip-wrap")){ state.helpOpen=null; render(); }
  if(state.fabOpen && !e.target.closest(".fab-wrap")){ state.fabOpen=false; render(); }
  const el = e.target.closest("[data-a]"); if(!el) return;
  const a = el.dataset.a, s = sel();
  if(a==="nav-tablero"){ state.view="tablero"; state.selId=null; }
  else if(a==="nav-lista"){ state.view="lista"; state.selId=null; }
  else if(a==="nav-cuenta"){
    state.view="cuenta"; state.selId=null; state.confirmRestoreId=null;
    state.backupsLoaded=false; state.backupsError=""; loadBackups();
    state.portalLoaded=false; state.portalError=""; state.portalCopyMsg=""; loadPortal();
  }
  else if(a==="nav-catalog"){ state.view="catalog"; state.selId=null; state.editSubjectId=null; state.editPackId=null; state.catConfirmDelId=null; }
  else if(a==="nav-pagos"){ state.view="pagos"; state.selId=null; if(!state.pagosMonth) state.pagosMonth=currentMonthKey(); }
  else if(a==="nav-agenda"){ state.view="agenda"; state.selId=null; }
  else if(a==="nav-logout"){
    if(!confirm("¿Cerrar sesión?")) return;
    setSes(null); state.view="tablero"; render(); return;
  }
  else if(a==="agenda-view-semana"){ state.agendaViewMode="semana"; }
  else if(a==="agenda-view-mes"){ state.agendaViewMode="mes"; }
  else if(a==="agenda-prev"){ state.agendaWeekOffset=(state.agendaWeekOffset||0)-1; }
  else if(a==="agenda-next"){ state.agendaWeekOffset=(state.agendaWeekOffset||0)+1; }
  else if(a==="agenda-today"){ state.agendaWeekOffset=0; }
  else if(a==="agenda-month-prev"){ state.agendaMonthOffset=(state.agendaMonthOffset||0)-1; state.agendaSelectedDay=null; state.agendaQuickAddOpen=false; }
  else if(a==="agenda-month-next"){ state.agendaMonthOffset=(state.agendaMonthOffset||0)+1; state.agendaSelectedDay=null; state.agendaQuickAddOpen=false; }
  else if(a==="agenda-month-today"){ state.agendaMonthOffset=0; state.agendaSelectedDay=null; state.agendaQuickAddOpen=false; }
  else if(a==="agenda-day-select"){
    const d=el.dataset.date;
    state.agendaSelectedDay = state.agendaSelectedDay===d ? null : d;
    state.agendaQuickAddOpen=false;
  }
  else if(a==="agenda-quick-open"){ state.agendaQuickAddOpen=true; }
  else if(a==="agenda-quick-add"){
    const studentEl=document.getElementById("aq-student"); if(!studentEl) return;
    const date=state.agendaSelectedDay; if(!date) return;
    const time=document.getElementById("aq-time").value; if(!time) return;
    const duration=parseInt(document.getElementById("aq-duration").value,10)||60;
    state.agendaQuickAddOpen=false;
    const {warning}=addPuntualClase(studentEl.value, date, time, duration);
    if(warning) alert(warning);
    return;
  }
  else if(a==="agenda-log"){
    state.selId=el.dataset.id; state.view="detalle"; state.tab="clases";
    state.sessionPrefillDate=el.dataset.date; state.confirmDel=false; state.fichaError="";
  }
  else if(a==="export-agenda-ics"){
    const blob=new Blob([buildAgendaIcs()],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url; link.download=`agenda-${today()}.ics`;
    link.click(); URL.revokeObjectURL(url);
  }
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
    state.panelTab="actividad"; state.actividadMode="dia"; state.actividadLoaded=false; state.actividadError="";
    loadActividad();
  }
  else if(a==="panel-tab-recursos"){
    state.panelTab="recursos"; state.recursosLoaded=false; state.recursosError="";
    loadRecursos();
  }
  else if(a==="panel-tab-inactividad"){
    state.panelTab="inactividad"; state.inactividadLoaded=false; state.inactividadError="";
    loadInactividad();
  }
  else if(a==="refresh-inactividad"){ state.inactividadLoaded=false; state.inactividadError=""; loadInactividad(); }
  else if(a==="refresh-usuarios"){ state.usersLoaded=false; state.usersError=""; loadUsuarios(); }
  else if(a==="limpiar-huerfanos"){
    if(state.orphanCleanStatus==="cleaning") return;
    limpiarHuerfanos(); return;
  }
  else if(a==="usuarios-sort-lastseen"){ state.usersSortDir = state.usersSortDir==="desc" ? "asc" : "desc"; }
  else if(a==="users-del-ask"){
    state.usersConfirmDelId=el.dataset.id; state.usersConfirmDelInput=""; state.usersDeleteError=""; state.usersDeleteMsg="";
  }
  else if(a==="users-del-cancel"){
    state.usersConfirmDelId=null; state.usersConfirmDelInput=""; state.usersDeleteError="";
  }
  else if(a==="users-del-confirm"){
    const u=(state.users||[]).find(x=>x.user_id===el.dataset.id); if(!u) return;
    if((state.usersConfirmDelInput||"")!==u.email) return;
    deleteUsuario(u.user_id); return;
  }
  else if(a==="actividad-mode-dia"){
    state.actividadMode="dia";
    if(!state.actividadLoaded){ state.actividadError=""; loadActividad(); }
  }
  else if(a==="actividad-mode-hora"){
    state.actividadMode="hora";
    if(!state.metricasHorariasLoaded){ state.metricasHorariasError=""; loadMetricasHorarias(); }
  }
  else if(a==="refresh-actividad"){
    if(state.actividadMode==="hora"){ state.metricasHorariasLoaded=false; state.metricasHorariasError=""; loadMetricasHorarias(); }
    else{ state.actividadLoaded=false; state.actividadError=""; loadActividad(); }
  }
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
    const m={id:uid(), name:v, units:[], color:nextSubjectColor()};
    state.catalog.subjects.push(m); state.editSubjectId=m.id;
    loadMateriales(m.id);
    touchCatalog(); return;
  }
  else if(a==="cat-add-from-template"){
    const t=SUBJECT_TEMPLATES.find(x=>x.id===el.dataset.id); if(!t) return;
    const m={id:uid(), name:t.name, units:[...t.units], color:nextSubjectColor()};
    state.catalog.subjects.push(m); state.editSubjectId=m.id;
    loadMateriales(m.id);
    touchCatalog(); return;
  }
  else if(a==="cat-set-subject-color"){
    const m=subjById(state.editSubjectId); if(!m) return;
    m.color=el.dataset.color; touchCatalog(); return;
  }
  else if(a==="cat-edit-subject"){
    state.editSubjectId=el.dataset.id; state.editPackId=null;
    loadMateriales(el.dataset.id); return;
  }
  else if(a==="cat-duplicate-subject"){ duplicateSubject(el.dataset.id); return; }
  else if(a==="cat-ask-del-subject"){ state.catConfirmDelId={type:"subject", id:el.dataset.id}; }
  else if(a==="cat-cancel-del"){ state.catConfirmDelId=null; }
  else if(a==="cat-confirm-del-subject"){
    state.catConfirmDelId=null;
    deleteSubjectAndMaybeMaterials(el.dataset.id); return;
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
  else if(a==="cat-edit-pack"){ state.editPackId=el.dataset.id; state.editSubjectId=null; }
  else if(a==="cat-ask-del-pack"){ state.catConfirmDelId={type:"pack", id:el.dataset.id}; }
  else if(a==="cat-confirm-del-pack"){
    state.catConfirmDelId=null;
    const removed=(state.catalog.packs||[]).find(p=>p.id===el.dataset.id); if(!removed) return;
    state.catalog.packs=(state.catalog.packs||[]).filter(p=>p.id!==el.dataset.id);
    touchCatalog();
    toast("Pack eliminado", "ok", ()=>{
      state.catalog.packs=[...(state.catalog.packs||[]), removed];
      touchCatalog();
      toast("Pack restaurado");
    }); return;
  }
  else if(a==="cat-close-pack-edit"){ state.editPackId=null; }
  else if(a==="pack-toggle-subject"){
    const p=(state.catalog.packs||[]).find(x=>x.id===state.editPackId); if(!p) return;
    const id=el.dataset.id;
    p.subjectIds = p.subjectIds.includes(id) ? p.subjectIds.filter(x=>x!==id) : [...p.subjectIds, id];
    touchCatalog(); return;
  }
  else if(a==="toggle-newpack-subject"){
    const id=el.dataset.id;
    const set=new Set(state.newPackSubjects||[]);
    set.has(id) ? set.delete(id) : set.add(id);
    state.newPackSubjects=[...set]; state.newPackError="";
  }
  else if(a==="cat-add-pack"){
    const name=(document.getElementById("new-pack-name").value||"").trim();
    const ids=state.newPackSubjects||[];
    if(!name){ state.newPackError="Ponele un nombre al pack."; render(); return; }
    if(ids.length<2){ state.newPackError="Elegí al menos 2 materias."; render(); return; }
    state.catalog.packs=[...(state.catalog.packs||[]), {id:uid(), name, subjectIds:ids}];
    state.newPackName=""; state.newPackSubjects=[]; state.newPackError="";
    touchCatalog(); return;
  }
  else if(a==="mat-reload"){ loadMateriales(el.dataset.id); return; }
  else if(a==="mat-upload"){
    const input=document.getElementById("mat-file");
    const file=input && input.files && input.files[0];
    if(!file) return;
    uploadMaterial(el.dataset.id, file); return;
  }
  else if(a==="mat-toggle-share"){
    const entry=materialIndexEntry(el.dataset.id, el.dataset.name); if(!entry) return;
    const next=!entry.compartido;
    entry.compartido=next;
    touchCatalog();
    if(!next) removeFromPortalBiblioteca(el.dataset.id, el.dataset.name);
    return;
  }
  else if(a==="mat-download"){ downloadMaterial(el.dataset.id, el.dataset.name); return; }
  else if(a==="mat-del-ask"){ state.materialesConfirmDelName=el.dataset.name; }
  else if(a==="mat-del-cancel"){ state.materialesConfirmDelName=null; }
  else if(a==="mat-del-confirm"){ deleteMaterial(el.dataset.id, el.dataset.name); return; }
  else if(a==="auth-mode-login"){ state.authMode="login"; }
  else if(a==="auth-mode-signup"){ state.authMode="signup"; }
  else if(a==="auth-login"){
    const lockMs=loginLockRemainingMs();
    if(lockMs>0){ authMsgShow("Demasiados intentos. Probá de nuevo en "+fmtLockRemaining(lockMs)+"."); return; }
    const em=(document.getElementById("auth-email").value||"").trim();
    const pw=document.getElementById("auth-pass").value||"";
    state.authEmail=em;
    if(!em||!pw){ authMsgShow("Completá correo y contraseña."); return; }
    authMsgShow("Iniciando sesión…",true);
    doLogin(em,pw).then(()=>{ resetLoginAttempts(); render(); syncNow(); })
      .catch(err=>{
        if(isEmailNotConfirmedError(err)){
          state.pendingConfirmEmail=em; state.confirmStatus="idle"; state.confirmError=""; render();
        }else{
          recordFailedLogin();
          const lockMs2=loginLockRemainingMs();
          if(lockMs2>0){ render(); }
          else authMsgShow(friendlyAuthError(err));
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
  else if(a==="portal-reload"){ loadPortal(); return; }
  else if(a==="portal-toggle"){ togglePortalHabilitado(el.dataset.f==="si"); return; }
  else if(a==="portal-regen"){ regenerarPortalToken(); return; }
  else if(a==="portal-copy"){
    copyToClipboard(portalUrl(state.portal.token))
      .then(()=>toast("Link copiado"))
      .catch(()=>toast("No se pudo copiar — seleccioná el texto manualmente.","error"));
    return;
  }
  else if(a==="portal-publicar"){ publicarPortal(); return; }
  else if(a==="portal-alumno-generar" && s){ generarLlaveAlumno(s.id); return; }
  else if(a==="portal-alumno-regen" && s){ regenerarLlaveAlumno(s.id); return; }
  else if(a==="portal-alumno-revoke" && s){ revocarLlaveAlumno(s.id); return; }
  else if(a==="portal-alumno-copy" && s){
    const token=tokenForStudent(s.id); if(!token) return;
    copyToClipboard(portalUrl(token))
      .then(()=>toast("Link copiado"))
      .catch(()=>toast("No se pudo copiar — seleccioná el texto manualmente.","error"));
    return;
  }
  else if(a==="portal-alumno-share-toggle" && s){
    const key=el.dataset.key, cur=portalShareFor(s);
    update(s.id,{portalShare:{...cur, [key]: !cur[key]}});
    maybeAutoRepublishAlumno(s.id);
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
  else if(a==="open"){
    state.view="detalle"; state.selId=el.dataset.id; state.tab="resumen"; state.confirmDel=false;
    state.simTimer=null; state.simPrefillNote=""; state.fichaError=""; state.sessionPrefillDate="";
  }
  else if(a==="back"){ state.view="lista"; state.selId=null; state.simTimer=null; state.simPrefillNote=""; }
  else if(a==="new"){ state.showNew=true; state.newStudentError=""; }
  else if(a==="load-sample"){
    const st=sampleStudent();
    state.students.push(st); save();
    state.view="detalle"; state.selId=st.id; state.tab="resumen";
  }
  else if(a==="dismiss-tips"){ dismissTips(); }
  // FAB de acciones rápidas (paso 77): siempre visible, con las 3 acciones más repetitivas.
  // Precarga lo que puede según el contexto — si ya estás en la ficha de un alumno, "nueva
  // clase"/"registrar pago" van directo a su pestaña; si no, primero piden elegir a quién.
  else if(a==="fab-toggle"){ state.fabOpen=!state.fabOpen; }
  else if(a==="fab-new-student"){ state.fabOpen=false; state.showNew=true; state.newStudentError=""; }
  else if(a==="fab-new-clase"){
    state.fabOpen=false;
    if(sel()){ state.tab="clases"; state.sessionPrefillDate=today(); state.confirmDel=false; state.fichaError=""; }
    else state.fabPick={target:"clases"};
  }
  else if(a==="fab-new-pago"){
    state.fabOpen=false;
    if(sel()){ state.tab="pagos"; state.confirmDel=false; state.fichaError=""; }
    else state.fabPick={target:"pagos"};
  }
  else if(a==="fab-pick-close"){ state.fabPick=null; }
  else if(a==="qr-open"){ state.qrOverlay={url:el.dataset.url, title:el.dataset.title||""}; }
  else if(a==="close-qr"){ state.qrOverlay=null; }
  else if(a==="qr-modal-noop"){ return; }
  else if(a==="fab-pick-student"){
    const target=(state.fabPick&&state.fabPick.target)||"resumen";
    state.fabPick=null;
    state.view="detalle"; state.selId=el.dataset.id; state.tab=target; state.confirmDel=false; state.fichaError="";
    if(target==="clases") state.sessionPrefillDate=today();
  }
  else if(a==="cancel-new"){ state.showNew=false; state.newStudentError=""; }
  else if(a==="create"){
    const name=document.getElementById("n-name").value.trim();
    if(!name){ document.getElementById("n-name").focus(); return; }
    const subjectVal=document.getElementById("n-subject").value;
    const career=document.getElementById("n-career").value;
    const examDate=document.getElementById("n-exam").value;
    const notes=document.getElementById("n-notes").value;
    const makeStudent=(m)=>{
      const st=emptyStudent();
      st.name=name; st.career=career;
      st.subjectId=m?m.id:""; st.subject=m?m.name:"";
      st.topics=m?Object.fromEntries(m.units.map(u=>[u,"pendiente"])):{};
      st.examDate=examDate; st.notes=notes;
      return st;
    };
    if(subjectVal.startsWith("pack:")){
      const pack=(state.catalog.packs||[]).find(p=>p.id===subjectVal.slice(5));
      const subjectIds=pack?pack.subjectIds:[];
      const created=[], skipped=[];
      subjectIds.forEach(sid=>{
        const m=subjById(sid); if(!m) return;
        const dup=findDuplicateStudent(name,sid,null);
        if(dup){ skipped.push(m.name); return; }
        const st=makeStudent(m);
        state.students.push(st); created.push(st);
      });
      if(created.length===0){
        state.newStudentError=`Ya tenés a ${name} en todas las materias de ese pack.`; render(); return;
      }
      save();
      state.newStudentError=""; state.showNew=false; state.view="detalle"; state.selId=created[0].id; state.tab="resumen";
      if(skipped.length) alert(`Se creó la ficha en ${created.length} materia${created.length===1?"":"s"} del pack. Se salteó ${skipped.join(", ")} porque ya tenías una ficha ahí.`);
      toast(created.length===1?"Estudiante creado":`${created.length} fichas creadas`); return;
    }else{
      const dup=findDuplicateStudent(name,subjectVal,null);
      if(dup){ state.newStudentError=`Ya tenés a ${dup.name} en esta materia.`; render(); return; }
      const st=makeStudent(subjById(subjectVal));
      state.students.push(st); save();
      state.newStudentError=""; state.showNew=false; state.view="detalle"; state.selId=st.id; state.tab="resumen";
      toast("Estudiante creado"); return;
    }
  }
  else if(a.startsWith("tab-")){
    state.tab=a.slice(4); state.confirmDel=false; state.fichaError=""; state.sessionPrefillDate="";
    if(state.tab==="portal" && !state.portalLoaded){ state.portalError=""; loadPortal(); }
  }
  else if(a==="goto-subject-materials"){
    state.view="catalog"; state.selId=null; state.editSubjectId=el.dataset.id; state.editPackId=null; state.catConfirmDelId=null;
    loadMateriales(el.dataset.id); return;
  }
  else if(a==="exam-result"){
    const id=el.dataset.id, result=el.dataset.r;
    const st=state.students.find(x=>x.id===id); if(!st) return;
    const gradeEl=document.getElementById("examgrade-"+id);
    const grade=gradeEl ? gradeEl.value.trim() : "";
    const entry={id:uid(), date:st.examDate, result, grade};
    const newStatus = result==="aprobo" ? "aprobo" : result==="desaprobo" ? "desaprobo" : st.status;
    update(id,{examResults:[...(st.examResults||[]), entry], status:newStatus});
    toast("Resultado guardado");
    return;
  }
  else if(a==="wa-free-send" && s){
    const text=(document.getElementById("wa-free-text").value||"").trim();
    if(!text) return;
    window.open(waLink(s,text),"_blank","noopener");
    return;
  }
  else if(a==="open-informe" && s){ state.view="informe"; }
  else if(a==="close-informe"){ state.view="detalle"; }
  else if(a==="informe-print"){ window.print(); return; }
  else if(a==="informe-copy" && s){
    copyToClipboard(buildInformeText(s))
      .then(()=>toast("Copiado — pegalo en WhatsApp"))
      .catch(()=>toast("No se pudo copiar — seleccioná el texto manualmente.","error"));
    return;
  }
  else if(a==="open-contrato" && s){ state.view="contrato"; }
  else if(a==="close-contrato"){ state.view="detalle"; state.tab="resumen"; }
  else if(a==="contrato-print"){ window.print(); return; }
  else if(a==="open-recibo" && s){ state.reciboId=el.dataset.id; state.view="recibo"; }
  else if(a==="close-recibo"){ state.view="detalle"; state.tab="pagos"; }
  else if(a==="recibo-print"){ window.print(); return; }
  else if(a==="recibo-copy" && s){
    const r=reciboFor(s,state.reciboId); if(!r) return;
    copyToClipboard(buildReciboText(s,r))
      .then(()=>toast("Copiado — pegalo en WhatsApp"))
      .catch(()=>toast("No se pudo copiar — seleccioná el texto manualmente.","error"));
    return;
  }
  else if(a==="toast-action"){
    const t=state.toasts.find(x=>x.id===el.dataset.id);
    state.toasts=state.toasts.filter(x=>x.id!==el.dataset.id);
    if(t && t.action && t.action.run) t.action.run();
    render(); return;
  }
  else if(a==="contrato-copy" && s){
    copyToClipboard(buildContratoText(s))
      .then(()=>toast("Copiado al portapapeles"))
      .catch(()=>toast("No se pudo copiar — seleccioná el texto manualmente.","error"));
    return;
  }
  else if(a==="filter"){ state.filter=el.dataset.f; }
  else if(a==="clear-filters"){
    state.filter="activo"; state.listSearch=""; state.listSubject="todas"; state.listCareer="todas"; state.listSem="todos";
    state.listDeuda="todas"; state.listSort="examen";
  }
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
    state.sessionPrefillDate="";
    const goal=document.getElementById("c-goal").value.trim();
    const durationRaw=document.getElementById("c-duration").value;
    const duration=durationRaw==="" ? null : (parseInt(durationRaw,10)||60);
    update(s.id,{sessions:[...s.sessions,{id:uid(),date,
      topic:document.getElementById("c-topic").value,
      tarea:document.getElementById("c-tarea").value,
      note:document.getElementById("c-note").value,
      duration,
      objetivo:goal, objetivoResult:null,
      cobrada:false}]});
    toast("Clase registrada"); return;
  }
  else if(a==="goal-resultado"){
    const sid=el.dataset.sid, st=state.students.find(x=>x.id===sid); if(!st) return;
    const cid=el.dataset.id, r=el.dataset.r;
    const sliderEl=document.getElementById("goal-pct-"+cid);
    const pct = sliderEl ? parseInt(sliderEl.value,10) : OBJETIVO_META[r].pctDefault;
    update(sid,{sessions:st.sessions.map(x=>x.id===cid?{...x,objetivoResult:{estado:r,pct}}:x)});
    state.goalCelebrate={sid,estado:r};
    render();
    setTimeout(()=>{
      if(state.goalCelebrate && state.goalCelebrate.sid===sid){ state.goalCelebrate=null; render(); }
    }, 1600);
    return;
  }
  else if(a==="del-session" && s){
    const removed=s.sessions.find(x=>x.id===el.dataset.id);
    update(s.id,{sessions:s.sessions.filter(x=>x.id!==el.dataset.id)});
    toast("Clase eliminada", "ok", ()=>{
      const st=state.students.find(x=>x.id===s.id); if(!st || !removed) return;
      update(s.id,{sessions:[...st.sessions, removed]});
      toast("Clase restaurada");
    }); return;
  }
  else if(a==="add-horario" && s){
    const day=parseInt(document.getElementById("h-day").value,10);
    const time=document.getElementById("h-time").value; if(!time) return;
    const duration=parseInt(document.getElementById("h-duration").value,10)||60;
    update(s.id,{horarios:[...(s.horarios||[]), {id:uid(), day, time, duration}]});
    toast("Horario agregado"); return;
  }
  else if(a==="del-horario" && s){
    const removed=(s.horarios||[]).find(x=>x.id===el.dataset.id);
    update(s.id,{horarios:(s.horarios||[]).filter(x=>x.id!==el.dataset.id)});
    toast("Horario eliminado", "ok", ()=>{
      const st=state.students.find(x=>x.id===s.id); if(!st || !removed) return;
      update(s.id,{horarios:[...(st.horarios||[]), removed]});
      toast("Horario restaurado");
    }); return;
  }
  else if(a==="add-puntual" && s){
    const date=document.getElementById("p-date").value; if(!date) return;
    const time=document.getElementById("p-time").value; if(!time) return;
    const duration=parseInt(document.getElementById("p-duration").value,10)||60;
    const {warning}=addPuntualClase(s.id, date, time, duration);
    if(warning) alert(warning);
    else toast("Clase puntual agregada");
    return;
  }
  else if(a==="del-puntual" && s){
    const removed=(s.clasesPuntuales||[]).find(x=>x.id===el.dataset.id);
    update(s.id,{clasesPuntuales:(s.clasesPuntuales||[]).filter(x=>x.id!==el.dataset.id)});
    toast("Clase puntual eliminada", "ok", ()=>{
      const st=state.students.find(x=>x.id===s.id); if(!st || !removed) return;
      update(s.id,{clasesPuntuales:[...(st.clasesPuntuales||[]), removed]});
      toast("Clase puntual restaurada");
    }); return;
  }
  else if(a==="toggle-senia" && s){
    update(s.id,{seniaActiva:el.dataset.f==="si", seniaTipo:s.seniaTipo||"monto"}); return;
  }
  else if(a==="toggle-senia-estado"){
    const sid = el.dataset.sid || (s&&s.id); if(!sid) return;
    const st = state.students.find(x=>x.id===sid); if(!st) return;
    const p=(st.clasesPuntuales||[]).find(x=>x.id===el.dataset.id); if(!p || p.cancelada) return;
    if(p.seniaEstado!=="pendiente" && p.seniaEstado!=="cobrada") return;
    const next = p.seniaEstado==="pendiente" ? "cobrada" : "pendiente";
    const clasesPuntuales = st.clasesPuntuales.map(x=>x.id===p.id?{...x,seniaEstado:next}:x);
    if(next==="cobrada"){
      const r = crearRecibo(st,{tipo:"senia", concepto:`Seña — clase puntual del ${fmtDate(p.date)}`, monto:Number(p.seniaMonto)||0});
      update(sid,{clasesPuntuales, recibos:[...(st.recibos||[]), r]});
      toast("Seña marcada como cobrada", "ok", null, {label:"Ver recibo", run:()=>{ state.selId=sid; state.reciboId=r.id; state.view="recibo"; }});
    }else{
      update(sid,{clasesPuntuales});
      toast("Seña marcada como pendiente");
    }
    return;
  }
  else if(a==="cobros-toggle"){ state.cobrosBannerOpen = !state.cobrosBannerOpen; }
  else if(a==="cobro-marcar-clase"){
    const sid=el.dataset.sid, st=state.students.find(x=>x.id===sid); if(!st) return;
    const sessionEl = st.sessions.find(x=>x.id===el.dataset.id);
    const sessions = st.sessions.map(x=>x.id===el.dataset.id?{...x,cobrada:true}:x);
    const r = crearRecibo(st,{tipo:"clase", concepto:`Clase del ${fmtDate(sessionEl?sessionEl.date:today())}`, monto:Number(st.tarifa)||0});
    update(sid,{sessions, recibos:[...(st.recibos||[]), r]});
    toast("Clase marcada como cobrada", "ok", null, {label:"Ver recibo", run:()=>{ state.selId=sid; state.reciboId=r.id; state.view="recibo"; }});
    return;
  }
  else if(a==="toggle-resumen-semanal"){ setResumenSemanal(el.dataset.f==="si"); return; }
  else if(a==="toggle-recordatorios"){
    state.catalog.recordatorios = {...recordatoriosFor(), activo: el.dataset.f==="si"};
    touchCatalog(); return;
  }
  else if(a==="toggle-notif-os"){
    const rec = recordatoriosFor();
    if(rec.notificacionesOS){
      state.catalog.recordatorios = {...rec, notificacionesOS:false};
      touchCatalog(); return;
    }
    if(typeof Notification==="undefined" || Notification.permission==="denied") return;
    if(Notification.permission==="granted"){
      state.catalog.recordatorios = {...rec, notificacionesOS:true};
      touchCatalog(); return;
    }
    Notification.requestPermission().then(perm=>{
      if(perm==="granted"){
        state.catalog.recordatorios = {...recordatoriosFor(), notificacionesOS:true};
        touchCatalog();
      }
    });
    return;
  }
  else if(a==="puntual-cancel-ask"){ state.puntualCancelAskId=el.dataset.id; }
  else if(a==="puntual-cancel-cancel"){ state.puntualCancelAskId=null; }
  else if(a==="puntual-cancel-confirm" && s){
    state.puntualCancelAskId=null;
    applyCancelacion(s.id, el.dataset.id);
    toast("Clase cancelada");
    return;
  }
  else if(a==="toggle-cobrada" && s){
    const sessionEl = s.sessions.find(x=>x.id===el.dataset.id);
    const wasCobrada = sessionEl && sessionEl.cobrada;
    const sessions = s.sessions.map(x=>x.id===el.dataset.id?{...x,cobrada:!x.cobrada}:x);
    if(!wasCobrada && sessionEl){
      const r = crearRecibo(s,{tipo:"clase", concepto:`Clase del ${fmtDate(sessionEl.date)}`, monto:Number(s.tarifa)||0});
      update(s.id,{sessions, recibos:[...(s.recibos||[]), r]});
      toast("Clase marcada como cobrada", "ok", null, {label:"Ver recibo", run:()=>{ state.reciboId=r.id; state.view="recibo"; }});
    }else{
      update(s.id,{sessions});
      toast("Clase marcada como pendiente");
    }
    return;
  }
  else if(a==="save-pago" && s){
    const date=document.getElementById("pago-date").value; if(!date) return;
    const amount=parseFloat(document.getElementById("pago-amount").value); if(!amount) return;
    const pagos=[...(s.pagos||[]),{id:uid(),date,amount}];
    const mk = monthKeyOf(date);
    const pendiente = pagoResumen({...s,pagos}, mk).pendiente;
    const r = crearRecibo(s,{tipo:"mensual", concepto:`Mensualidad ${monthLabel(mk)}`, monto:amount, date, saldo:pendiente});
    update(s.id,{pagos, recibos:[...(s.recibos||[]), r]});
    toast("Pago registrado", "ok", null, {label:"Ver recibo", run:()=>{ state.reciboId=r.id; state.view="recibo"; }});
    return;
  }
  else if(a==="del-pago" && s){
    const removed=(s.pagos||[]).find(x=>x.id===el.dataset.id);
    update(s.id,{pagos:(s.pagos||[]).filter(x=>x.id!==el.dataset.id)});
    toast("Pago eliminado", "ok", ()=>{
      const st=state.students.find(x=>x.id===s.id); if(!st || !removed) return;
      update(s.id,{pagos:[...(st.pagos||[]), removed]});
      toast("Pago restaurado");
    }); return;
  }
  else if(a==="pagos-tab"){ state.pagosTab=el.dataset.t; }
  else if(a==="add-costo-fijo"){
    const name=document.getElementById("costo-fijo-name").value.trim(); if(!name) return;
    const monto=Number(document.getElementById("costo-fijo-monto").value)||0;
    const {subjectId,studentId}=parseScopeValue(document.getElementById("costo-fijo-scope").value);
    const costos=costosFor();
    state.catalog.costos={...costos, fijos:[...costos.fijos,{id:uid(),name,monto,subjectId,studentId}]};
    touchCatalog(); return;
  }
  else if(a==="del-costo-fijo"){
    const costos=costosFor();
    const removed=costos.fijos.find(c=>c.id===el.dataset.id);
    state.catalog.costos={...costos, fijos:costos.fijos.filter(c=>c.id!==el.dataset.id)};
    touchCatalog();
    toast("Costo fijo eliminado", "ok", ()=>{
      const cur=costosFor();
      state.catalog.costos={...cur, fijos:[...cur.fijos, removed]};
      touchCatalog();
      toast("Costo restaurado");
    }); return;
  }
  else if(a==="add-costo-variable"){
    const name=document.getElementById("costo-var-name").value.trim(); if(!name) return;
    const monto=Number(document.getElementById("costo-var-monto").value)||0;
    const {subjectId,studentId}=parseScopeValue(document.getElementById("costo-var-scope").value);
    const costos=costosFor();
    state.catalog.costos={...costos, variables:[...costos.variables,{id:uid(),name,monto,subjectId,studentId}]};
    touchCatalog(); return;
  }
  else if(a==="del-costo-variable"){
    const costos=costosFor();
    const removed=costos.variables.find(c=>c.id===el.dataset.id);
    state.catalog.costos={...costos, variables:costos.variables.filter(c=>c.id!==el.dataset.id)};
    touchCatalog();
    toast("Costo variable eliminado", "ok", ()=>{
      const cur=costosFor();
      state.catalog.costos={...cur, variables:[...cur.variables, removed]};
      touchCatalog();
      toast("Costo restaurado");
    }); return;
  }
  else if(a==="save-sim" && s){
    const date=document.getElementById("s-date").value; if(!date) return;
    update(s.id,{simulacros:[...s.simulacros,{id:uid(),date,
      grade:document.getElementById("s-grade").value,
      note:document.getElementById("s-note").value}]});
    state.simPrefillNote="";
    toast("Simulacro registrado"); return;
  }
  else if(a==="del-sim" && s){
    const removed=s.simulacros.find(x=>x.id===el.dataset.id);
    update(s.id,{simulacros:s.simulacros.filter(x=>x.id!==el.dataset.id)});
    toast("Simulacro eliminado", "ok", ()=>{
      const st=state.students.find(x=>x.id===s.id); if(!st || !removed) return;
      update(s.id,{simulacros:[...st.simulacros, removed]});
      toast("Simulacro restaurado");
    }); return;
  }
  else if(a==="sim-timer-start"){
    const min=Math.max(1, parseInt(document.getElementById("sim-timer-min").value,10)||90);
    state.simTimerLastMin=min;
    state.simTimer={durationMin:min, remainingSec:min*60, paused:false, alerted:false};
  }
  else if(a==="sim-timer-toggle" && state.simTimer){
    state.simTimer.paused=!state.simTimer.paused;
  }
  else if(a==="sim-timer-finish" && state.simTimer){
    const usedMin=Math.round((state.simTimer.durationMin*60-state.simTimer.remainingSec)/60);
    state.simPrefillNote=`Tiempo usado: ${usedMin} min. `;
    state.simTimer=null;
  }
  else if(a==="dismiss-backup-reminder"){ dismissBackupReminder(); }
  else if(a==="ask-del"){ state.confirmDel=true; }
  else if(a==="cancel-del"){ state.confirmDel=false; }
  else if(a==="confirm-del" && s){
    state.view="lista"; state.confirmDel=false;
    const id=s.id; state.selId=null;
    update(id,{deleted:true, deletedAt:Date.now()});
    toast(s.sample?"Ejemplo eliminado":"Estudiante eliminado — va a la papelera por 7 días", "ok", ()=>{
      const st=state.students.find(x=>x.id===id); if(!st) return;
      update(id,{deleted:false, deletedAt:null});
      toast("Estudiante restaurado");
    }); return;
  }
  else if(a==="toggle-help"){ state.helpOpen = state.helpOpen===el.dataset.id ? null : el.dataset.id; }
  else if(a==="toggle-faq"){
    const i=+el.dataset.i; state.faqOpenIdx = state.faqOpenIdx===i ? null : i;
  }
  else if(a==="open-search"){ state.searchOpen=true; state.searchQuery=""; state.searchSel=0; }
  else if(a==="close-search" || a==="close-search-bg"){ state.searchOpen=false; }
  else if(a==="search-modal-noop"){ return; }
  else if(a==="search-select"){
    openSearchResult({type:el.dataset.type, id:el.dataset.id});
  }
  else if(a==="trash-restore-student"){
    const id=el.dataset.id;
    update(id,{deleted:false, deletedAt:null});
    toast("Estudiante restaurado"); return;
  }
  else if(a==="trash-restore-subject"){ restoreSubjectFromTrash(el.dataset.id); return; }
  else if(a==="trash-purge-ask"){ state.trashPurgeConfirmKey=el.dataset.key; }
  else if(a==="trash-purge-cancel"){ state.trashPurgeConfirmKey=null; }
  else if(a==="trash-purge-confirm"){
    state.trashPurgeConfirmKey=null;
    const [kind,id]=el.dataset.key.split(":");
    if(kind==="student"){
      state.students=state.students.filter(x=>x.id!==id); save(); render();
    } else if(kind==="subject"){
      purgeSubjectFromTrash(id);
    }
    toast("Eliminado definitivamente"); return;
  }
  else if(a==="toast-undo"){
    const t=state.toasts.find(x=>x.id===el.dataset.id);
    state.toasts=state.toasts.filter(x=>x.id!==el.dataset.id);
    if(t && t.undo) t.undo();
    return;
  }
  else if(a==="export"){
    const blob=new Blob([JSON.stringify({students:state.students},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url; link.download=`seguimiento-estudiantes-${today()}.json`;
    link.click(); URL.revokeObjectURL(url);
    markExported();
    toast("Copia descargada"); return;
  }
  else if(a==="export-pagos-csv"){
    const mk = state.pagosMonth || currentMonthKey();
    const n = parseInt(state.pagosExportPeriod||"3",10);
    const monthKeys = monthKeysEndingAt(mk, n);
    const csv = buildPagosCsv(monthKeys);
    const bom = String.fromCharCode(0xFEFF);
    const blob=new Blob([bom+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url; link.download=`pagos-${monthKeys[0]}_a_${monthKeys[monthKeys.length-1]}.csv`;
    link.click(); URL.revokeObjectURL(url);
    toast("CSV descargado"); return;
  }
  else return;
  render();
});

// Enter en un campo de las pantallas de login/signup/recuperar/nueva contraseña dispara
// la acción principal de esa pantalla (data-enter en el input apunta al data-a del botón).
document.addEventListener("keydown",(e)=>{
  if(e.key!=="Enter") return;
  const el=e.target.closest("[data-enter]"); if(!el) return;
  e.preventDefault();
  const btn=document.querySelector(`[data-a="${el.dataset.enter}"]`);
  if(btn) btn.click();
});

// Trampa de foco (paso 75): mientras haya un diálogo abierto (overlay .modal/.search-modal),
// Tab/Shift+Tab quedan dando vueltas dentro de él en vez de escaparse hacia la página de atrás.
function trapFocus(e){
  const overlay = document.querySelector(".overlay");
  if(!overlay) return;
  const focusables = [...overlay.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')]
    .filter(el=>!el.disabled && el.offsetParent!==null);
  if(!focusables.length) return;
  const first=focusables[0], last=focusables[focusables.length-1];
  if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
}
document.addEventListener("keydown",(e)=>{
  if(e.key==="Tab" && (state.searchOpen || state.showNew)) trapFocus(e);
});

// Atajos de teclado en escritorio (paso 75): "/" busca, "n" nuevo alumno, "c" nueva clase
// (dentro de la ficha de un alumno, va a la pestaña "Clases"), Esc cierra diálogos/popovers.
// Listados en el centro de ayuda (ver vCentroAyuda en views.js). Ninguno dispara si ya se está
// escribiendo en un campo, para no pisar lo que el profesor esté tipeando.
document.addEventListener("keydown",(e)=>{
  const typing = /^(input|textarea|select)$/i.test(e.target.tagName);
  if(!state.searchOpen && e.key==="/" && !typing && getSes() && !state.recovery){
    e.preventDefault(); state.searchOpen=true; state.searchQuery=""; state.searchSel=0; render(); return;
  }
  if(!state.searchOpen && !state.showNew && !typing && getSes() && !state.recovery && !e.ctrlKey && !e.metaKey && !e.altKey){
    if(e.key==="n"){ e.preventDefault(); state.showNew=true; state.newStudentError=""; render(); return; }
    if(e.key==="c" && state.view==="detalle" && sel()){ e.preventDefault(); state.tab="clases"; render(); return; }
  }
  if(!state.searchOpen){
    if(e.key==="Escape" && state.showNew){ state.showNew=false; state.newStudentError=""; render(); return; }
    if(e.key==="Escape" && state.fabPick){ state.fabPick=null; render(); return; }
    if(e.key==="Escape" && state.fabOpen){ state.fabOpen=false; render(); return; }
    if(e.key==="Escape" && state.helpOpen){ state.helpOpen=null; render(); }
    return;
  }
  if(e.key==="Escape"){ e.preventDefault(); state.searchOpen=false; render(); return; }
  if(e.key==="ArrowDown" || e.key==="ArrowUp"){
    e.preventDefault();
    const res = globalSearchResults(state.searchQuery);
    const n = res.total; if(n===0) return;
    const dir = e.key==="ArrowDown" ? 1 : -1;
    state.searchSel = ((state.searchSel||0)+dir+n)%n;
    render(); return;
  }
  if(e.key==="Enter" && e.target.id==="global-search-input"){
    e.preventDefault();
    const flat = globalSearchFlat(state.searchQuery);
    if(!flat.length) return;
    openSearchResult(flat[Math.min(state.searchSel||0, flat.length-1)]);
    render();
  }
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
  if(cf && cf.dataset.cf==="pack-name"){
    const p=(state.catalog.packs||[]).find(x=>x.id===state.editPackId); if(!p) return;
    const v=cf.value.trim(); if(!v) return;
    p.name=v; touchCatalog(); return;
  }
  if(cf && cf.dataset.cf==="new-pack-name"){ state.newPackName=cf.value; return; }
  if(cf && cf.dataset.cf==="policy-horas"){
    state.catalog.cancelPolicy = {...cancelPolicyFor(), horasMinimas:Math.max(0, parseInt(cf.value,10)||0)};
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf==="policy-atiempo"){
    state.catalog.cancelPolicy = {...cancelPolicyFor(), siATiempo:cf.value};
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf==="policy-texto"){
    state.catalog.cancelPolicy = {...cancelPolicyFor(), texto:cf.value};
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf==="docente-nombre"){ state.catalog.docente={...docenteFor(), nombre:cf.value}; touchCatalog(); return; }
  if(cf && cf.dataset.cf==="docente-telefono"){ state.catalog.docente={...docenteFor(), telefono:cf.value}; touchCatalog(); return; }
  if(cf && cf.dataset.cf==="docente-dni"){ state.catalog.docente={...docenteFor(), dni:cf.value}; touchCatalog(); return; }
  if(cf && cf.dataset.cf==="portal-nombre"){ if(state.portal) state.portal.draftNombre=cf.value; return; }
  if(cf && cf.dataset.cf==="rec-dias"){
    state.catalog.recordatorios = {...recordatoriosFor(), diasAtraso:Math.max(0, parseInt(cf.value,10)||0)};
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf==="stats-subject"){ state.statsSubjectId=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="pagos-month"){ state.pagosMonth=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="pagos-export-period"){ state.pagosExportPeriod=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="renta-month"){ state.rentaMonth=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="informe-period"){ state.informePeriod=cf.value; render(); return; }
  const lf=e.target.closest("[data-lf]");
  if(lf){
    if(lf.dataset.lf==="subject") state.listSubject=lf.value;
    else if(lf.dataset.lf==="career") state.listCareer=lf.value;
    else if(lf.dataset.lf==="sem") state.listSem=lf.value;
    else if(lf.dataset.lf==="deuda") state.listDeuda=lf.value;
    else if(lf.dataset.lf==="sort") state.listSort=lf.value;
    render(); return;
  }
  const el=e.target.closest("[data-f]"); if(!el) return;
  const s=sel(); if(!s) return;
  if(el.dataset.f==="subjectId"){
    const dup=findDuplicateStudent(s.name,el.value,s.id);
    if(dup){ state.fichaError=`Ya tenés a ${dup.name} en esta materia.`; render(); return; }
    const m=subjById(el.value);
    state.fichaError="";
    update(s.id,{subjectId:el.value, subject:m?m.name:s.subject});
    return;
  }
  if(el.dataset.f==="name"){
    const dup=findDuplicateStudent(el.value,s.subjectId,s.id);
    if(dup){ state.fichaError=`Ya tenés a ${dup.name} en esta materia.`; render(); return; }
    state.fichaError="";
  }
  update(s.id,{[el.dataset.f]:el.value});
});

// render() rehace todo el innerHTML de #app, así que un input en vivo (buscador de
// la lista) perdería foco y cursor en cada tecla si no se restauran a mano acá.
document.addEventListener("input", (e)=>{
  const el=e.target.closest("[data-live]"); if(!el) return;
  if(el.dataset.live==="lista-search"){
    const pos=el.selectionStart;
    state.listSearch=el.value;
    render();
    const ne=document.getElementById("lista-search");
    if(ne){ ne.focus(); ne.setSelectionRange(pos,pos); }
  }
  if(el.dataset.live==="global-search"){
    const pos=el.selectionStart;
    state.searchQuery=el.value; state.searchSel=0;
    render();
    const ne=document.getElementById("global-search-input");
    if(ne){ ne.focus(); ne.setSelectionRange(pos,pos); }
  }
  if(el.dataset.live==="users-del-email"){
    const pos=el.selectionStart;
    state.usersConfirmDelInput=el.value;
    render();
    const ne=document.querySelector('[data-live="users-del-email"]');
    if(ne){ ne.focus(); ne.setSelectionRange(pos,pos); }
  }
});

/* ============ cronómetro de simulacro: tick de 1s ============
   No hace nada (ni re-renderiza) salvo que haya un cronómetro corriendo,
   así que no cuesta nada en el resto de la app. */
setInterval(()=>{
  const t = state.simTimer;
  if(t && !t.paused && t.remainingSec>0){
    t.remainingSec--;
    if(t.remainingSec<=0 && !t.alerted){
      t.alerted=true;
      render();
      alert("¡Se acabó el tiempo del simulacro!");
      return;
    }
    render();
    return;
  }
  // cuenta regresiva del freno de intentos de login, mientras se ve la pantalla de login
  if(!getSes() && !state.recovery){
    const locked = loginLockRemainingMs()>0;
    if(locked || state._authWasLocked){ state._authWasLocked=locked; render(); }
  }
},1000);

/* ============ arranque ============ */
const _recovery = parseRecoveryHash();
if(_recovery){ state.recovery=_recovery; history.replaceState(null,"",location.pathname+location.search); }
load(); render();
syncNow();
checkForNewVersion();
checkTauriUpdate();
maybeNotifyCobros();

/* PWA: registrar el service worker cuando la app está publicada (no en file://
   ni dentro de un contenedor nativo como Tauri o Capacitor, que ya resuelven
   los archivos locales sin necesidad de cache de service worker) */
if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !IS_NATIVE) {
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}
