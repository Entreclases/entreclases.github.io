"use strict";
/* ============ animaciones (paso 100) ============
   render() reconstruye todo el innerHTML de #app, así que estas dos funciones se llaman de
   nuevo en cada render — cada elemento .cnt/.grow-h/.grow-v es siempre un nodo nuevo, nunca
   uno que ya haya animado. Ambas respetan prefers-reduced-motion mostrando el valor/tamaño
   final directo, sin animar. */
function prefersReducedMotion(){
  return !animsOn() || !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}
// Números que cuentan hasta su valor (tablero Hoy / Estadísticas) — el texto ya arranca en el
// valor final (ver countSpan() en helpers.js), así que si esto no corre el número visible
// siempre es igual el correcto.
// Montos (paso 179, moneySpan() en helpers.js): a diferencia de los demás .cnt (que siempre
// arrancan en 0 y suben), un monto recuerda el último valor mostrado por su data-money-key
// (_prevMoneyByKey) y anima DESDE ahí — así "pendiente" cuenta hacia abajo de verdad al bajar
// tras un cobro, en vez de reiniciar en $0 y subir hasta el nuevo total (que es lo que hacía
// antes de este fix, sea cual sea la dirección del cambio).
let _prevMoneyByKey = {};
function animateCounters(){
  const els = document.querySelectorAll(".cnt");
  const dur = 650; // paso 143: un toque más lenta que antes (era 600ms)
  const reduced = prefersReducedMotion();
  els.forEach(el=>{
    const target = parseFloat(el.dataset.count);
    if(isNaN(target)) return;
    const decimals = parseInt(el.dataset.decimals||"0",10);
    const suffix = el.dataset.suffix||"";
    const isMoney = el.dataset.money==="1";
    const moneyKey = el.dataset.moneyKey||"default";
    const from = isMoney && _prevMoneyByKey[moneyKey]!=null ? _prevMoneyByKey[moneyKey] : (isMoney ? target : 0);
    if(isMoney) _prevMoneyByKey[moneyKey]=target;
    if(reduced || from===target) return;
    const start = performance.now();
    function step(now){
      const p = Math.min(1, (now-start)/dur);
      const eased = 1-Math.pow(1-p,3);
      const val = from+(target-from)*eased;
      el.textContent = isMoney ? fmtMoney(val) : (decimals>0 ? val.toFixed(decimals) : Math.round(val)) + suffix;
      if(p<1) requestAnimationFrame(step);
      else el.textContent = isMoney ? fmtMoney(target) : (decimals>0 ? target.toFixed(decimals) : Math.round(target)) + suffix;
    }
    requestAnimationFrame(step);
  });
}
// Barras/gráficos que crecen al entrar en pantalla, una sola vez por elemento (se desconectan
// del observer apenas animan) — ver .grow-h/.grow-v/.grow-v-down en styles.css.
let _growBarObserver = null;
function observeGrowBars(){
  const bars = document.querySelectorAll(".grow-h:not(.in),.grow-v:not(.in),.grow-v-down:not(.in)");
  if(prefersReducedMotion()){
    bars.forEach(el=>el.classList.add("in"));
    return;
  }
  if(!_growBarObserver){
    _growBarObserver = new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        if(en.isIntersecting){ en.target.classList.add("in"); _growBarObserver.unobserve(en.target); }
      });
    }, {threshold:.15});
  }
  bars.forEach(el=>_growBarObserver.observe(el));
}

/* ============ festejo + sonidos discretos (pasos 143 y 179) ============
   Lista cerrada de MOMENTOS puntuales (ver CHANGELOG paso 179 para la lista completa) — nunca en
   carga de página ni en navegación (la única excepción sonora a eso es soundWhoosh(), pensado
   para el cambio de vista y con su propio gate, ver más abajo). Ambos respetan reduced-motion/
   apagado por separado: el confetti se salta directo con prefersReducedMotion() (mismo criterio
   que el resto de las animaciones de este archivo); el sonido además depende de soundsOn() (toggle
   de Cuenta → Preferencias, config.js). Uno no depende del otro — con reduced-motion activado pero
   sonidos encendidos, sigue sonando el "tin"/"ding"/acorde sin el confetti visual.
   fireConfetti(opts) acepta un objeto opcional {colors,n,duration} (paso 179) para que cada
   momento tenga su propia paleta/duración sin duplicar el canvas/física de partículas — las
   paletas de cada momento nuevo están declaradas junto a sus sonidos, más abajo. */
function fireConfetti(opts){
  if(prefersReducedMotion()) return;
  opts = opts || {};
  const canvas=document.createElement("canvas");
  canvas.style.cssText="position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999";
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  document.body.appendChild(canvas);
  const ctx=canvas.getContext("2d");
  const colors=opts.colors || ["#ff6b6b","#4dabf7","#69db7c","#ffd43b","#da77f2"];
  const N=opts.n || 54;
  const originY=canvas.height*0.3;
  const particles=Array.from({length:N},()=>({
    x:canvas.width/2+(Math.random()-0.5)*140,
    y:originY,
    vx:(Math.random()-0.5)*9,
    vy:-Math.random()*7-5,
    size:4+Math.random()*4,
    color:colors[Math.floor(Math.random()*colors.length)],
    rot:Math.random()*Math.PI*2,
    vrot:(Math.random()-0.5)*0.35,
  }));
  const gravity=0.25;
  const start=performance.now();
  const DURATION=opts.duration || 1000;
  function step(now){
    const t=now-start;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const fade=Math.max(0, 1-t/DURATION);
    particles.forEach(p=>{
      p.vy+=gravity; p.x+=p.vx; p.y+=p.vy; p.rot+=p.vrot;
      ctx.save();
      ctx.globalAlpha=fade;
      ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle=p.color;
      ctx.fillRect(-p.size/2,-p.size*0.3,p.size,p.size*0.6);
      ctx.restore();
    });
    if(t<DURATION) requestAnimationFrame(step);
    else canvas.remove();
  }
  requestAnimationFrame(step);
}
// Paletas por momento (paso 179) — mismo confetti/física de arriba, sólo cambian colores/cantidad/
// duración para que cada festejo se sienta un poco distinto sin duplicar código.
const PACK_CONFETTI = ["#22C55E","#84CC16","#FDE047","#4ADE80","#facc15"]; // venta de pack: verde/dorado ("plata")
const RESERVA_CONFETTI = ["#3B82F6","#60A5FA","#93C5FD","#38BDF8","#A78BFA"]; // reserva del portal: azules fríos
const TUDIA_CONFETTI = ["#F59E0B","#FBBF24","#FDE68A","#FCA5A5","#FDBA74"]; // "Tu día" en cero: cálido, sol
const CUATRI_CONFETTI = ["#8B5CF6","#F43F5E","#3B82F6","#22C55E","#F59E0B"]; // cierre de cuatrimestre: multicolor, el más "finale"
let _audioCtx=null;
function getAudioCtx(){
  if(_audioCtx) return _audioCtx;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return null;
  _audioCtx=new AC();
  return _audioCtx;
}
// freqs+dur cortos y volumen bajo a propósito (paso 143: "discretos, <200ms" salvo los acordes de
// varias notas, un pelín más largos). Nunca se llama desde carga de página/nav — sólo desde los
// triggers puntuales de más abajo (soundWhoosh() es la única excepción, con su propio volumen aún
// más bajo y su propio gate de "sólo escritorio").
function playTone(freqs, dur, type){
  if(prefersReducedMotion() || !soundsOn()) return;
  const ctx=getAudioCtx(); if(!ctx) return;
  if(ctx.state==="suspended") ctx.resume().catch(()=>{});
  const now=ctx.currentTime;
  freqs.forEach(f=>{
    const osc=ctx.createOscillator(), gain=ctx.createGain();
    osc.type=type||"sine"; osc.frequency.value=f;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now+0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now+dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now+dur+0.02);
  });
}
function soundClase(){ playTone([660], 0.14, "sine"); }
function soundCobro(){ playTone([880], 0.16, "triangle"); }
function soundObjetivo(){ playTone([523.25,659.25,783.99], 0.32, "sine"); }
// Hito de racha (paso 155) — reutilizado también para "Tu día" en cero (paso 179, ver
// pendingTasksToday()/vTuDia() en helpers.js/views-tablero.js): ambos son "cerraste bien el día", un
// timbre nuevo aparte se sentía redundante — ver razonamiento completo en el reporte del paso 179.
function soundHito(){ playTone([523.25,659.25,783.99,1046.5], 0.36, "sine"); }
function soundPack(){ playTone([587.33,880], 0.2, "triangle"); } // venta de pack (paso 179): dos notas triangle, distinto de soundCobro (una sola nota)
function soundReserva(){ playTone([1174.66], 0.1, "square"); } // reserva nueva del portal (paso 179): "pop" bien corto y brillante
function soundCuatrimestre(){ playTone([392,523.25,659.25,783.99,987.77], 0.42, "sine"); } // cierre de cuatrimestre (paso 179): el acorde más largo, a propósito ("finale")
// Tono de error (paso 179): intervalo descendente y grave, sine — a propósito lo más distinto
// posible de los festejos de arriba (que suben en frecuencia) para que se aprenda a distinguir un
// error de un logro sin mirar la pantalla. Enganchado en toast() (helpers.js) para toda tono="error".
function soundError(){ playTone([392,349.23], 0.18, "sine"); }
// Heurística "escritorio" para el whoosh de cambio de vista (paso 179, "MUY sutil y sólo en
// desktop"): puntero preciso (mouse/trackpad), no táctil — así un tablet/celular con mouse
// conectado entra igual, que es lo que importa (el whoosh molesta más en pantallas táctiles chicas
// donde se navega todo el tiempo con el dedo, no por marca/tipo de dispositivo). IS_NATIVE queda
// afuera aparte: Capacitor (Android) siempre es táctil, y Tauri, aunque es de escritorio, no pidió
// este agregado — se prefiere no sumarle sonido nuevo sin pedido explícito ahí.
function isDesktopLike(){
  return !IS_NATIVE && !!(window.matchMedia && window.matchMedia("(pointer:fine)").matches);
}
// Whoosh de cambio de vista (paso 179): no usa playTone() porque necesita un barrido de frecuencia
// (exponentialRampToValueAtTime), no un tono fijo — mismo gate de reduced-motion/soundsOn() que el
// resto, más isDesktopLike(). Volumen a propósito bien por debajo del de playTone (0.035 vs 0.09):
// es un acompañamiento de navegación, no un festejo, tiene que notarse apenas.
function soundWhoosh(){
  if(prefersReducedMotion() || !soundsOn() || !isDesktopLike()) return;
  const ctx=getAudioCtx(); if(!ctx) return;
  if(ctx.state==="suspended") ctx.resume().catch(()=>{});
  const now=ctx.currentTime, dur=0.18;
  const osc=ctx.createOscillator(), gain=ctx.createGain();
  osc.type="sine";
  osc.frequency.setValueAtTime(280, now);
  osc.frequency.exponentialRampToValueAtTime(720, now+dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.035, now+0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now+dur);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now+dur+0.02);
}

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
    new Notification("Entreclases", {
      body: `Tenés ${sum.count} cobro${sum.count===1?"":"s"} atrasado${sum.count===1?"":"s"} por ${fmtMoney(sum.total)}.`,
    });
    localStorage.setItem(LAST_COBROS_NOTIFY_KEY, today());
  }catch(e){ /* silencioso: algún navegador/SO puntual puede bloquear la construcción */ }
}

/* ============ actualización asistida del service worker (paso 99, web/PWA) ============
   El SW (ver sw.js) ya no hace skipWaiting() solo al instalar: una versión nueva se queda
   "esperando" (reg.waiting) hasta que el usuario confirma acá — recién ahí se le manda
   skipWaiting por postMessage, se espera a que tome el control (evento controllerchange)
   y se recarga UNA sola vez (con _swReloading de guarda para no entrar en loop). Así el
   usuario nunca más tiene que "reiniciar el caché" a mano: sólo tocar "Actualizar" cuando
   aparece el aviso, o esperar a que se cierre y reabra la app (ahí sí toma la nueva sola). */
let _swReloading = false;
function promptSwUpdate(reg){
  state.swRegistration = reg;
  if(state.swUpdateReady) return;
  state.swUpdateReady = true;
  render();
}
function applySwUpdate(){
  const reg = state.swRegistration;
  if(!reg || !reg.waiting) return;
  reg.waiting.postMessage({type:"SKIP_WAITING"});
}
function watchSwRegistration(reg){
  state.swRegistration = reg;
  if(reg.waiting) promptSwUpdate(reg);
  reg.addEventListener("updatefound", ()=>{
    const nw = reg.installing; if(!nw) return;
    nw.addEventListener("statechange", ()=>{
      // "installed" + ya hay un controller = hay una versión previa activa y ésta es una
      // actualización (no la primera instalación, que no tiene nada que avisar todavía).
      if(nw.state==="installed" && navigator.serviceWorker.controller) promptSwUpdate(reg);
    });
  });
}
// Botón "Buscar actualización" en Cuenta: fuerza el chequeo y avisa si ya está al día.
function checkSwUpdateNow(){
  if(!("serviceWorker" in navigator) || !state.swRegistration){
    toast("No disponible en este dispositivo"); return;
  }
  state.swCheckStatus="checking"; render();
  state.swRegistration.update().then(()=>{
    state.swCheckStatus="idle";
    if(!state.swUpdateReady) toast("Ya tenés la última versión");
    render();
  }).catch(()=>{
    state.swCheckStatus="idle";
    toast("No se pudo buscar actualizaciones — probá de nuevo","error");
    render();
  });
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
  // Paso 136: si hay cambios sin guardar en la ficha (Resumen/Pagos), cortar cualquier navegación
  // que la abandone de verdad — a otro alumno, a otra vista, cerrar sesión — con una confirmación
  // (mismo `confirm()` nativo que ya usa "Cerrar sesión" un poco más abajo). Cambiar de pestaña
  // dentro de la misma ficha no cuenta como "salir": el borrador sigue vivo hasta guardarlo o
  // descartarlo a mano (ver ficha-draft-save/-discard). Ver también el guard gemelo en el
  // popstate de más abajo, para cuando se sale con el botón "atrás" del navegador.
  if(state.fichaDraft && fichaDraftFieldCount()>0){
    const targetId = (a==="open"||a==="fab-pick-student") ? el.dataset.id : null;
    const leavingFicha = a==="back" || a==="load-sample" || a==="auth-logout" || (a && a.startsWith("nav-"))
      || ((a==="open"||a==="fab-pick-student") && targetId!==state.fichaDraft.id);
    if(leavingFicha){
      if(!confirm("Tenés cambios sin guardar en la ficha. ¿Salir sin guardar?")) return;
      state.fichaDraft=null; state.fichaError="";
    }
  }
  if(a==="nav-tablero"){ state.view="tablero"; state.selId=null; }
  else if(a==="nav-lista"){ state.view="lista"; state.selId=null; }
  else if(a==="nav-cuenta"){
    state.view="cuenta"; state.selId=null; state.confirmRestoreId=null;
    state.backupsLoaded=false; state.backupsError=""; loadBackups();
    state.portalLoaded=false; state.portalError=""; state.portalCopyMsg=""; loadPortal();
    state.portalGrupoEditing=null; state.portalGrupoDraftAlumnos=[]; state.portalGrupoError="";
  }
  else if(a==="nav-catalog"){ state.view="catalog"; state.selId=null; state.editSubjectId=null; state.editPackId=null; state.catConfirmDelId=null; state.editUnitId=null; state.editSubunitId=null; state.editCareerId=null; }
  else if(a==="nav-pagos"){ state.view="pagos"; state.selId=null; if(!state.pagosMonth) state.pagosMonth=currentMonthKey(); }
  else if(a==="nav-agenda"){
    state.view="agenda"; state.selId=null;
    if(el.dataset.offset!==undefined) state.agendaWeekOffset=parseInt(el.dataset.offset,10);
  }
  else if(a==="nav-logout"){
    if(!confirm("¿Cerrar sesión?")) return;
    setSes(null); state.view="tablero"; _navSnapshot=null; render(); return;
  }
  else if(a==="agenda-view-semana"){ state.agendaViewMode="semana"; }
  else if(a==="agenda-view-mes"){ state.agendaViewMode="mes"; state.agendaGridQuick=null; }
  else if(a==="agenda-prev"){ state.agendaWeekOffset=(state.agendaWeekOffset||0)-1; state.agendaGridQuick=null; }
  else if(a==="agenda-next"){ state.agendaWeekOffset=(state.agendaWeekOffset||0)+1; state.agendaGridQuick=null; }
  else if(a==="agenda-today"){ state.agendaWeekOffset=0; state.agendaGridQuick=null; }
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
  else if(a==="agenda-grid-add"){ state.agendaGridQuick={date:el.dataset.date, time:el.dataset.hour}; }
  else if(a==="agenda-grid-quick-cancel"){ state.agendaGridQuick=null; }
  // Popover de "modo lista" de un cluster comprimido de la agenda (paso 169, ver
  // vAgendaCompressedCluster/vAgendaHourListOverlay en views-agenda.js) — data-items trae cada clase
  // codificada como "i|studentId|kind|sourceId|origDate" (individual) o "g|grupoId|kind|origDate"
  // (grupal), separadas por ";", ya que uid() sólo produce alfanumérico y nunca esos separadores.
  else if(a==="agenda-hour-list-open"){
    const items=(el.dataset.items||"").split(";").filter(Boolean).map(tok=>{
      const p=tok.split("|");
      return p[0]==="g" ? {type:"grupal", grupoId:p[1], kind:p[2], origDate:p[3]}
        : {type:"individual", studentId:p[1], kind:p[2], sourceId:p[3], origDate:p[4]};
    });
    state.agendaHourList={date:el.dataset.date, items};
  }
  else if(a==="agenda-hour-list-close"){ state.agendaHourList=null; }
  else if(a==="agenda-hour-list-noop"){ return; }
  else if(a==="agenda-disp-edit-toggle"){ state.agendaDispEdit=!state.agendaDispEdit; state.agendaGridQuick=null; }
  else if(a==="agenda-disp-toggle"){
    toggleDisponibilidadCelda(parseInt(el.dataset.day,10), el.dataset.hour);
    return;
  }
  else if(a==="agenda-semana-toggle"){
    toggleSemanaCompleta(el.dataset.week);
    return;
  }
  else if(a==="agenda-grid-quick-add"){
    const studentEl=document.getElementById("wq-student"); if(!studentEl) return;
    const q=state.agendaGridQuick; if(!q) return;
    const time=document.getElementById("wq-time").value; if(!time) return;
    const duration=parseInt(document.getElementById("wq-duration").value,10)||60;
    state.agendaGridQuick=null;
    const {warning}=addPuntualClase(studentEl.value, q.date, time, duration);
    if(warning) alert(warning);
    else toast("Próxima clase agendada");
    return;
  }
  else if(a==="agenda-log"){
    state.selId=el.dataset.id; state.view="detalle"; state.tab="clases";
    state.sessionPrefillDate=el.dataset.date; state.confirmDel=false; state.fichaError="";
    state.registrarClaseTipo="pasada";
  }
  else if(a==="agenda-event-open"){
    state.agendaEdit={studentId:el.dataset.studentId, kind:el.dataset.kind, sourceId:el.dataset.sourceId, origDate:el.dataset.origDate};
    state.agendaEditPending=null; state.agendaEditCancelConfirm=false; state.agendaEditDeleteConfirm=false;
    state.agendaHourList=null;
  }
  else if(a==="agenda-edit-close"){
    state.agendaEdit=null; state.agendaEditPending=null; state.agendaEditCancelConfirm=false; state.agendaEditDeleteConfirm=false;
  }
  else if(a==="agenda-edit-noop"){ return; }
  else if(a==="agenda-edit-goto-ficha"){
    const id=el.dataset.id;
    state.agendaEdit=null; state.agendaEditPending=null; state.agendaEditCancelConfirm=false; state.agendaEditDeleteConfirm=false;
    state.selId=id; state.view="detalle"; state.tab="resumen";
  }
  else if(a==="agenda-edit-register"){
    const ev=findAgendaEditEvent(state.agendaEdit); if(!ev) return;
    state.agendaEdit=null; state.agendaEditPending=null; state.agendaEditCancelConfirm=false; state.agendaEditDeleteConfirm=false;
    state.selId=ev.studentId; state.view="detalle"; state.tab="clases";
    state.sessionPrefillDate=ev.date; state.confirmDel=false; state.fichaError="";
    state.registrarClaseTipo="pasada";
  }
  else if(a==="agenda-edit-scope-solo"){
    const ev=findAgendaEditEvent(state.agendaEdit); if(!ev || !state.agendaEditPending) return;
    applyHorarioEdit(ev.studentId, ev.sourceId, ev.origDate, state.agendaEditPending, "solo");
    state.agendaEditPending=null;
    toast("Clase movida");
  }
  else if(a==="agenda-edit-scope-todas"){
    const ev=findAgendaEditEvent(state.agendaEdit); if(!ev || !state.agendaEditPending) return;
    applyHorarioEdit(ev.studentId, ev.sourceId, ev.origDate, state.agendaEditPending, "todas");
    state.agendaEditPending=null;
    toast("Horario actualizado");
  }
  else if(a==="agenda-edit-scope-cancel"){ state.agendaEditPending=null; }
  else if(a==="agenda-edit-cancel-ask"){ state.agendaEditCancelConfirm=true; }
  else if(a==="agenda-edit-cancel-cancel"){ state.agendaEditCancelConfirm=false; }
  else if(a==="agenda-edit-cancel-confirm"){
    const ev=findAgendaEditEvent(state.agendaEdit); if(!ev) return;
    if(ev.kind==="puntual") applyCancelacion(ev.studentId, ev.sourceId);
    else cancelHorarioOccurrence(ev.studentId, ev.sourceId, ev.origDate);
    state.agendaEdit=null; state.agendaEditPending=null; state.agendaEditCancelConfirm=false; state.agendaEditDeleteConfirm=false;
    toast("Clase cancelada");
  }
  else if(a==="agenda-edit-delete-ask"){ state.agendaEditDeleteConfirm=true; }
  else if(a==="agenda-edit-delete-cancel"){ state.agendaEditDeleteConfirm=false; }
  else if(a==="agenda-edit-delete-confirm"){
    const ev=findAgendaEditEvent(state.agendaEdit); if(!ev) return;
    const st=state.students.find(x=>x.id===ev.studentId); if(!st) return;
    state.agendaEdit=null; state.agendaEditPending=null; state.agendaEditCancelConfirm=false; state.agendaEditDeleteConfirm=false;
    if(ev.kind==="puntual"){
      const removed=(st.clasesPuntuales||[]).find(x=>x.id===ev.sourceId);
      update(st.id,{clasesPuntuales:(st.clasesPuntuales||[]).filter(x=>x.id!==ev.sourceId)});
      toast("Clase puntual eliminada", "ok", ()=>{
        const st2=state.students.find(x=>x.id===st.id); if(!st2 || !removed) return;
        update(st.id,{clasesPuntuales:[...(st2.clasesPuntuales||[]), removed]});
        toast("Clase puntual restaurada");
      });
    }else{
      const removed=(st.horarios||[]).find(x=>x.id===ev.sourceId);
      update(st.id,{horarios:(st.horarios||[]).filter(x=>x.id!==ev.sourceId)});
      toast("Horario eliminado", "ok", ()=>{
        const st2=state.students.find(x=>x.id===st.id); if(!st2 || !removed) return;
        update(st.id,{horarios:[...(st2.horarios||[]), removed]});
        toast("Horario restaurado");
      });
    }
  }
  // Popover de edición de una clase GRUPAL desde la agenda (paso 157) — mismo patrón que
  // agenda-edit-* de arriba, pero resolviendo/aplicando siempre sobre TODO el grupo (ver
  // findAgendaEditEventGrupal/applyHorarioEditGrupal/cancelHorarioOccurrenceGrupal/
  // applyCancelacionGrupal en helpers.js).
  else if(a==="agenda-event-grupal-open"){
    state.agendaEditGrupal={grupoId:el.dataset.grupoId, kind:el.dataset.kind, origDate:el.dataset.origDate};
    state.agendaEditGrupalPending=null; state.agendaEditGrupalCancelConfirm=false; state.agendaEditGrupalDeleteConfirm=false;
    state.agendaHourList=null;
  }
  else if(a==="agenda-edit-grupal-close"){
    state.agendaEditGrupal=null; state.agendaEditGrupalPending=null; state.agendaEditGrupalCancelConfirm=false; state.agendaEditGrupalDeleteConfirm=false;
  }
  else if(a==="agenda-edit-grupal-noop"){ return; }
  else if(a==="agenda-edit-grupal-register"){
    const ev=findAgendaEditEventGrupal(state.agendaEditGrupal); if(!ev) return;
    state.agendaEditGrupal=null; state.agendaEditGrupalPending=null; state.agendaEditGrupalCancelConfirm=false; state.agendaEditGrupalDeleteConfirm=false;
    state.grupalForm={subjectId:ev.subjectId, studentIds:[...ev.studentIds], pinnedId:null, tipo:"pasada",
      date:ev.date, topic:ev.topic||"", duration:ev.duration, note:"", asistencias:{},
      origin:{grupoId:ev.grupoId, kind:ev.kind}};
  }
  else if(a==="agenda-edit-grupal-scope-solo"){
    const ev=findAgendaEditEventGrupal(state.agendaEditGrupal); if(!ev || !state.agendaEditGrupalPending) return;
    applyHorarioEditGrupal(ev.grupoId, ev.origDate, state.agendaEditGrupalPending, "solo");
    state.agendaEditGrupalPending=null;
    toast("Clase movida");
  }
  else if(a==="agenda-edit-grupal-scope-todas"){
    const ev=findAgendaEditEventGrupal(state.agendaEditGrupal); if(!ev || !state.agendaEditGrupalPending) return;
    applyHorarioEditGrupal(ev.grupoId, ev.origDate, state.agendaEditGrupalPending, "todas");
    state.agendaEditGrupalPending=null;
    toast("Horario actualizado");
  }
  else if(a==="agenda-edit-grupal-scope-cancel"){ state.agendaEditGrupalPending=null; }
  else if(a==="agenda-edit-grupal-cancel-ask"){ state.agendaEditGrupalCancelConfirm=true; }
  else if(a==="agenda-edit-grupal-cancel-cancel"){ state.agendaEditGrupalCancelConfirm=false; }
  else if(a==="agenda-edit-grupal-cancel-confirm"){
    const ev=findAgendaEditEventGrupal(state.agendaEditGrupal); if(!ev) return;
    if(ev.kind==="puntual") applyCancelacionGrupal(ev.grupoId);
    else cancelHorarioOccurrenceGrupal(ev.grupoId, ev.origDate);
    state.agendaEditGrupal=null; state.agendaEditGrupalPending=null; state.agendaEditGrupalCancelConfirm=false; state.agendaEditGrupalDeleteConfirm=false;
    toast("Clase grupal cancelada");
  }
  else if(a==="agenda-edit-grupal-delete-ask"){ state.agendaEditGrupalDeleteConfirm=true; }
  else if(a==="agenda-edit-grupal-delete-cancel"){ state.agendaEditGrupalDeleteConfirm=false; }
  else if(a==="agenda-edit-grupal-delete-confirm"){
    const ev=findAgendaEditEventGrupal(state.agendaEditGrupal); if(!ev) return;
    state.agendaEditGrupal=null; state.agendaEditGrupalPending=null; state.agendaEditGrupalCancelConfirm=false; state.agendaEditGrupalDeleteConfirm=false;
    if(ev.kind==="puntual"){ delPuntualClaseGrupal(ev.grupoId); toast("Clase puntual grupal eliminada"); }
    else{ delHorarioGrupal(ev.grupoId); toast("Horario grupal eliminado"); }
  }
  else if(a==="export-agenda-ics"){
    const {events,label}=agendaIcsRangeForView();
    const blob=new Blob([buildAgendaIcs(events)],{type:"text/calendar;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url; link.download=`agenda-${label}.ics`;
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
  else if(a==="usuario-aprobar"){ setUsuarioEstado(el.dataset.id, "aprobado"); return; }
  else if(a==="usuario-rechazar"){ setUsuarioEstado(el.dataset.id, "rechazado"); return; }
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
  else if(a==="reportes-tipo-filter"){ state.reportTipoFilter=el.dataset.f; }
  else if(a==="toggle-reporte"){
    const r=(state.reportes||[]).find(x=>String(x.id)===el.dataset.id);
    if(r) toggleReporte(r.id, r.estado);
    return;
  }
  else if(a==="cat-add-career"){
    const v=(document.getElementById("new-career").value||"").trim(); if(!v) return;
    if(!state.catalog.careers.some(c=>normName(c.nombre)===normName(v))) state.catalog.careers.push({id:uid(), nombre:v});
    touchCatalog(); return;
  }
  else if(a==="cat-del-career"){
    const id=el.dataset.id;
    state.catalog.careers=state.catalog.careers.filter(c=>c.id!==id);
    state.catalog.subjects.forEach(m=>{ if(m.careerIds) m.careerIds=m.careerIds.filter(x=>x!==id); });
    if(state.editCareerId===id) state.editCareerId=null;
    touchCatalog(); return;
  }
  else if(a==="cat-career-rename-start"){ state.editCareerId=el.dataset.id; }
  else if(a==="cat-career-rename-done"){
    const c=careerById(state.editCareerId); if(!c) return;
    const v=(document.getElementById("career-rename-input").value||"").trim();
    // Paso 167: s.career es texto libre por alumno (no un id), así que renombrar acá sin
    // actualizar a los alumnos que tenían el nombre viejo hacía que normalizeCatalogCareers()
    // (helpers.js) volviera a crear una carrera fantasma con el nombre viejo en el próximo
    // load()/sync — de ahí el bug de "editar carrera crea otra".
    if(v && normName(v)!==normName(c.nombre)){
      const oldNorm=normName(c.nombre);
      state.students=state.students.map(s=>normName(s.career)===oldNorm?{...s,career:v,updatedAt:Date.now()}:s);
    }
    if(v) c.nombre=v;
    state.editCareerId=null;
    touchCatalog(); return;
  }
  else if(a==="cat-career-rename-cancel"){ state.editCareerId=null; }
  else if(a==="cat-toggle-career"){
    const m=subjById(state.editSubjectId); if(!m) return;
    if(!Array.isArray(m.careerIds)) m.careerIds=[];
    const id=el.dataset.id;
    m.careerIds = m.careerIds.includes(id) ? m.careerIds.filter(x=>x!==id) : [...m.careerIds, id];
    touchCatalog(); return;
  }
  else if(a==="cat-materias-groupby"){ state.catMateriasGroupBy=el.dataset.mode; }
  else if(a==="cat-add-subject"){
    const v=(document.getElementById("new-subject").value||"").trim(); if(!v) return;
    const m={id:uid(), name:v, units:[], color:nextSubjectColor(), careerIds:[]};
    state.catalog.subjects.push(m); state.editSubjectId=m.id;
    loadMateriales(m.id);
    touchCatalog(); return;
  }
  else if(a==="cat-add-from-template"){
    const t=SUBJECT_TEMPLATES.find(x=>x.id===el.dataset.id); if(!t) return;
    const m={id:uid(), name:t.name, units:normalizeUnits(t.units), color:nextSubjectColor(), careerIds:[]};
    state.catalog.subjects.push(m); state.editSubjectId=m.id;
    loadMateriales(m.id);
    touchCatalog(); return;
  }
  else if(a==="cat-set-subject-color"){
    const m=subjById(state.editSubjectId); if(!m) return;
    m.color=el.dataset.color; touchCatalog(); return;
  }
  else if(a==="cat-edit-subject"){
    state.editSubjectId=el.dataset.id; state.editPackId=null; state.editUnitId=null; state.editSubunitId=null;
    loadMateriales(el.dataset.id); return;
  }
  else if(a==="cat-duplicate-subject"){ duplicateSubject(el.dataset.id); return; }
  else if(a==="cat-ask-del-subject"){ state.catConfirmDelId={type:"subject", id:el.dataset.id}; }
  else if(a==="cat-cancel-del"){ state.catConfirmDelId=null; }
  else if(a==="cat-confirm-del-subject"){
    state.catConfirmDelId=null;
    deleteSubjectAndMaybeMaterials(el.dataset.id); return;
  }
  else if(a==="cat-close-edit"){ state.editSubjectId=null; state.editUnitId=null; state.editSubunitId=null; }
  else if(a==="cat-add-unit"){
    const input=document.getElementById("new-unit");
    const v=(input.value||"").trim(); if(!v) return;
    const m=subjById(state.editSubjectId); if(!m) return;
    if(m.units.some(u=>u.nombre===v)) return;
    m.units.push(makeUnit(v));
    reindexUnits(m.units);
    touchCatalog(); return;
  }
  else if(a==="cat-unit-up"){ moveUnit(state.editSubjectId, el.dataset.id, -1); return; }
  else if(a==="cat-unit-down"){ moveUnit(state.editSubjectId, el.dataset.id, 1); return; }
  else if(a==="cat-unit-rename-start"){
    state.editSubunitId=null; state.editUnitId=el.dataset.id;
  }
  else if(a==="cat-unit-rename-done"){
    const m=subjById(state.editSubjectId); const u=m&&m.units.find(x=>x.id===state.editUnitId);
    const input=document.getElementById("unit-rename-input");
    const v=(input&&input.value||"").trim();
    state.editUnitId=null;
    if(u && v) u.nombre=v;
    touchCatalog(); return;
  }
  else if(a==="cat-unit-rename-cancel"){ state.editUnitId=null; }
  else if(a==="cat-ask-del-unit"){
    const m=subjById(state.editSubjectId); const u=m&&m.units.find(x=>x.id===el.dataset.id);
    if(!u) return;
    if(unitHasAvance(m.id, u.nombre)){ state.catConfirmDelId={type:"unit", id:u.id}; return; }
    deleteUnitWithUndo(m.id, u.id); return;
  }
  else if(a==="cat-confirm-del-unit"){
    state.catConfirmDelId=null;
    deleteUnitWithUndo(state.editSubjectId, el.dataset.id); return;
  }
  else if(a && a.startsWith("cat-add-subunit:")){
    const unitId=a.slice("cat-add-subunit:".length);
    const m=subjById(state.editSubjectId); const u=m&&m.units.find(x=>x.id===unitId); if(!u) return;
    const input=document.getElementById("new-subunit-"+unitId);
    const v=(input.value||"").trim(); if(!v) return;
    if(!Array.isArray(u.subunidades)) u.subunidades=[];
    if(u.subunidades.some(x=>x.nombre===v)) return;
    u.subunidades.push(makeSubunit(v));
    touchCatalog(); return;
  }
  else if(a==="cat-subunit-up"){ moveSubunit(state.editSubjectId, el.dataset.unitId, el.dataset.id, -1); return; }
  else if(a==="cat-subunit-down"){ moveSubunit(state.editSubjectId, el.dataset.unitId, el.dataset.id, 1); return; }
  else if(a==="cat-subunit-rename-start"){
    state.editUnitId=null; state.editSubunitId={unitId:el.dataset.unitId, subId:el.dataset.id};
  }
  else if(a==="cat-subunit-rename-done"){
    const m=subjById(state.editSubjectId);
    const u=m&&state.editSubunitId&&m.units.find(x=>x.id===state.editSubunitId.unitId);
    const sub=u&&(u.subunidades||[]).find(x=>x.id===state.editSubunitId.subId);
    const input=document.getElementById("subunit-rename-input");
    const v=(input&&input.value||"").trim();
    state.editSubunitId=null;
    if(sub && v) sub.nombre=v;
    touchCatalog(); return;
  }
  else if(a==="cat-subunit-rename-cancel"){ state.editSubunitId=null; }
  else if(a==="cat-del-subunit"){
    const m=subjById(state.editSubjectId); const u=m&&m.units.find(x=>x.id===el.dataset.unitId); if(!u) return;
    const removedIdx=(u.subunidades||[]).findIndex(x=>x.id===el.dataset.id); if(removedIdx<0) return;
    const removed=u.subunidades[removedIdx];
    u.subunidades=u.subunidades.filter(x=>x.id!==el.dataset.id);
    touchCatalog();
    toast("Subunidad eliminada", "ok", ()=>{
      const m2=subjById(state.editSubjectId); const u2=m2&&m2.units.find(x=>x.id===el.dataset.unitId);
      if(!u2) return;
      if(!Array.isArray(u2.subunidades)) u2.subunidades=[];
      u2.subunidades.splice(Math.min(removedIdx,u2.subunidades.length),0,removed);
      touchCatalog();
      toast("Subunidad restaurada");
    }); return;
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
  else if(a==="avatar-upload"){
    const input=document.getElementById(el.dataset.input);
    const file=input && input.files && input.files[0];
    if(!file) return;
    if(!/^image\//.test(file.type)){ state.avatarUploadError="Elegí un archivo de imagen."; render(); return; }
    uploadAvatar(el.dataset.key, file); return;
  }
  else if(a==="avatar-delete-ask"){ state.avatarDeleteConfirmKey=el.dataset.key; }
  else if(a==="avatar-delete-cancel"){ state.avatarDeleteConfirmKey=null; }
  else if(a==="avatar-delete-confirm"){
    const key=el.dataset.key; state.avatarDeleteConfirmKey=null;
    deleteAvatar(key); return;
  }
  else if(a==="cobros-qr-upload"){
    const input=document.getElementById(el.dataset.input);
    const file=input && input.files && input.files[0];
    if(!file) return;
    if(!/^image\//.test(file.type)){ state.cobrosQrError="Elegí un archivo de imagen."; render(); return; }
    uploadCobrosQr(file); return;
  }
  else if(a==="cobros-qr-delete-ask"){ state.cobrosQrDeleteConfirm=true; }
  else if(a==="cobros-qr-delete-cancel"){ state.cobrosQrDeleteConfirm=false; }
  else if(a==="cobros-qr-delete-confirm"){ state.cobrosQrDeleteConfirm=false; deleteCobrosQr(); return; }
  else if(a==="mat-reload"){ loadMateriales(el.dataset.id); return; }
  else if(a==="mat-upload"){
    const input=document.getElementById(el.dataset.input||"mat-file");
    const file=input && input.files && input.files[0];
    if(!file) return;
    uploadMaterial(el.dataset.id, file, el.dataset.unit||""); return;
  }
  else if(a==="mat-mode-general"){ state.materialesMode="general"; }
  else if(a==="mat-mode-unidad"){ state.materialesMode="unidad"; }
  else if(a==="mat-jump-unit"){
    state.materialesMode="unidad";
    state.materialesJumpUnitId=el.dataset.unit;
    state.materialesUnitOpenId=el.dataset.unit;
  }
  else if(a==="mat-unit-toggle"){
    const unitId=el.dataset.unit;
    state.materialesUnitOpenId = state.materialesUnitOpenId===unitId ? null : unitId;
    state.materialesJumpUnitId=null;
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
    doLogin(em,pw).then(()=>loadRole()).then(()=>{ resetLoginAttempts(); flushPendingTermsAccept(em); render(); syncNow(); })
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
    const acceptedTerms=!!document.getElementById("auth-accept-terms").checked;
    state.authEmail=em;
    if(!em){ authMsgShow("Ingresá tu correo."); return; }
    if(pw.length<6){ authMsgShow("La contraseña tiene que tener al menos 6 caracteres."); return; }
    if(!acceptedTerms){ authMsgShow("Tenés que aceptar los términos y la política de privacidad."); return; }
    authMsgShow("Creando cuenta…",true);
    startFeedbackBannerWindow();
    doSignup(em,pw).then(ok=>{
      if(ok){ registrarAceptacionTerminos(); return loadRole().then(()=>{ render(); syncNow(); }); }
      else{
        try{ localStorage.setItem(PENDING_TERMS_KEY, em); }catch(e){}
        state.pendingConfirmEmail=em; state.confirmStatus="idle"; state.confirmError=""; render();
      }
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
  else if(a==="estado-refrescar"){
    state.estadoChecking=true; render();
    loadRole().finally(()=>{ state.estadoChecking=false; render(); });
    return;
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
  else if(a==="reserva-modo-set"){ setReservaModo(el.dataset.f); return; }
  else if(a==="cancelar-clase-toggle"){ toggleCancelarClase(el.dataset.f==="si"); return; }
  else if(a==="solicitud-aceptar"){ aceptarSolicitudClase(el.dataset.id); return; }
  else if(a==="solicitud-rechazar"){ rechazarSolicitudClase(el.dataset.id); return; }
  else if(a==="reserva-directa-ok"){ descartarReservaDirecta(el.dataset.id); return; }
  else if(a==="aviso-add"){
    const texto=(document.getElementById("aviso-texto").value||"").trim(); if(!texto) return;
    const target=parseAvisoTarget(document.getElementById("aviso-target").value);
    const avisos=[{id:uid(), texto, fecha:today(), target}, ...((state.portal.publicado&&state.portal.publicado.avisos)||[])];
    saveAvisos(avisos); return;
  }
  else if(a==="aviso-del"){
    const avisos=((state.portal.publicado&&state.portal.publicado.avisos)||[]).filter(x=>x.id!==el.dataset.id);
    saveAvisos(avisos); return;
  }
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
  else if(a==="portal-hub-alumno-generar"){ generarLlaveAlumno(el.dataset.id); return; }
  else if(a==="portal-hub-alumno-regen"){ regenerarLlaveAlumno(el.dataset.id); return; }
  else if(a==="portal-hub-alumno-revoke"){ revocarLlaveAlumno(el.dataset.id); return; }
  else if(a==="portal-hub-alumno-copy"){
    const token=tokenForStudent(el.dataset.id); if(!token) return;
    copyToClipboard(portalUrl(token))
      .then(()=>toast("Link copiado"))
      .catch(()=>toast("No se pudo copiar — seleccioná el texto manualmente.","error"));
    return;
  }
  else if(a==="portal-preview-load"){ state.portalPreviewOpen=true; }
  else if(a==="toggle-recordatorio-mail" && s){
    update(s.id,{recordatorioMail: !s.recordatorioMail});
    return;
  }
  else if(a==="video-link-discard" && s){
    update(s.id,{videollamadaLink:""});
    toast("Link fijo descartado");
    return;
  }
  else if(a==="portal-alumno-share-toggle" && s){
    const key=el.dataset.key, cur=portalShareFor(s);
    update(s.id,{portalShare:{...cur, [key]: !cur[key]}});
    maybeAutoRepublishAlumno(s.id);
    return;
  }
  else if(a==="portal-grupo-crear-abrir"){
    state.portalGrupoEditing=el.dataset.materia; state.portalGrupoDraftAlumnos=[]; state.portalGrupoError="";
  }
  else if(a==="portal-grupo-editar-abrir"){
    const mid=el.dataset.materia, tok=tokenForGrupo(mid);
    state.portalGrupoEditing=mid;
    state.portalGrupoDraftAlumnos = tok ? [...(state.portal.tokensGrupos[tok].alumnos||[])] : [];
    state.portalGrupoError="";
  }
  else if(a==="portal-grupo-editar-cancelar"){ state.portalGrupoEditing=null; state.portalGrupoDraftAlumnos=[]; }
  else if(a==="portal-grupo-toggle-alumno"){
    const id=el.dataset.id, draft=state.portalGrupoDraftAlumnos||[];
    state.portalGrupoDraftAlumnos = draft.includes(id) ? draft.filter(x=>x!==id) : [...draft, id];
  }
  else if(a==="portal-grupo-crear"){ generarLlaveGrupo(el.dataset.materia, state.portalGrupoDraftAlumnos||[]); return; }
  else if(a==="portal-grupo-guardar"){ actualizarAlumnosGrupo(el.dataset.materia, state.portalGrupoDraftAlumnos||[]); return; }
  else if(a==="portal-grupo-regen"){ regenerarLlaveGrupo(el.dataset.materia); return; }
  else if(a==="portal-grupo-revoke"){ revocarLlaveGrupo(el.dataset.materia); return; }
  else if(a==="portal-grupo-copy"){
    const tok=tokenForGrupo(el.dataset.materia); if(!tok) return;
    copyToClipboard(portalUrl(tok))
      .then(()=>toast("Link copiado"))
      .catch(()=>toast("No se pudo copiar — seleccioná el texto manualmente.","error"));
    return;
  }
  // Cuenta → "Grupos de clase" (paso 157): sólo el roster (quién integra cada clase grupal),
  // nunca compartido con nadie — no confundir con portal-grupo-* de arriba, que es la llave
  // pública por materia.
  else if(a==="grupoclase-editar-abrir"){
    const g=grupoClaseById(el.dataset.id); if(!g) return;
    state.gruposClaseEditing=g.id; state.gruposClaseDraftAlumnos=[...g.studentIds]; state.gruposClaseDelConfirm=null;
  }
  else if(a==="grupoclase-editar-cancelar"){ state.gruposClaseEditing=null; state.gruposClaseDraftAlumnos=[]; }
  else if(a==="grupoclase-toggle-alumno"){
    const id=el.dataset.id, draft=state.gruposClaseDraftAlumnos||[];
    state.gruposClaseDraftAlumnos = draft.includes(id) ? draft.filter(x=>x!==id) : [...draft, id];
  }
  else if(a==="grupoclase-guardar"){
    actualizarMiembrosGrupoClase(el.dataset.id, state.gruposClaseDraftAlumnos||[]);
    state.gruposClaseEditing=null; state.gruposClaseDraftAlumnos=[];
    toast("Grupo actualizado"); return;
  }
  else if(a==="grupoclase-del-ask"){ state.gruposClaseDelConfirm=el.dataset.id; }
  else if(a==="grupoclase-del-cancel"){ state.gruposClaseDelConfirm=null; }
  else if(a==="grupoclase-del-confirm"){
    borrarGrupoClase(el.dataset.id); state.gruposClaseDelConfirm=null;
    toast("Grupo borrado"); return;
  }
  // Llaves a mano (paso 139): mini-modal de "Compartir acceso", disparable desde la ficha, una
  // materia (Materias) o la lista, sin pasar por Cuenta → Portal — ver openShareOverlay (sync.js)
  // y vShareOverlay (views-core.js). Todo lee/escribe contra state.shareOverlay en vez de sel(), a
  // propósito: a diferencia de las acciones "portal-alumno-*"/"portal-grupo-*" de más arriba
  // (pensadas sólo para la ficha/Cuenta), estas tienen que andar igual sin una ficha abierta.
  else if(a==="share-open"){ openShareOverlay(el.dataset.kind, el.dataset.id); return; }
  else if(a==="share-close"){ state.shareOverlay=null; }
  else if(a==="share-modal-noop"){ return; }
  else if(a==="share-copy"){
    const o=state.shareOverlay; if(!o) return;
    const token = o.kind==="alumno" ? tokenForStudent(o.id) : tokenForGrupo(o.id);
    if(!token) return;
    copyToClipboard(portalUrl(token))
      .then(()=>toast("Link copiado"))
      .catch(()=>toast("No se pudo copiar — seleccioná el texto manualmente.","error"));
    return;
  }
  else if(a==="share-regen"){
    const o=state.shareOverlay; if(!o) return;
    if(o.kind==="alumno") regenerarLlaveAlumno(o.id); else regenerarLlaveGrupo(o.id);
    return;
  }
  // Enviar la llave grupal a varios (paso 140): mini-modal aparte de vShareOverlay/vPortalGrupoRow,
  // disparable desde cualquiera de los dos (ver "Enviar a los alumnos" en ambos).
  else if(a==="envio-open"){ state.envioOverlay={materiaId:el.dataset.materia}; }
  else if(a==="envio-close"){ state.envioOverlay=null; }
  else if(a==="envio-modal-noop"){ return; }
  else if(a==="envio-toggle"){ toggleEnvioGrupo(el.dataset.materia, el.dataset.id); return; }
  else if(a==="envio-copy-msg"){
    const o=state.envioOverlay; if(!o) return;
    const m=subjById(o.materiaId); const tok=tokenForGrupo(o.materiaId);
    if(!m || !tok) return;
    copyToClipboard(genericoMsgCompartirLlaveGrupal(m.name, portalUrl(tok)))
      .then(()=>toast("Mensaje copiado"))
      .catch(()=>toast("No se pudo copiar — seleccioná el texto manualmente.","error"));
    return;
  }
  else if(a==="envio-copy-lista"){
    const o=state.envioOverlay; if(!o) return;
    const m=subjById(o.materiaId); const tok=tokenForGrupo(o.materiaId);
    if(!m || !tok || !state.portal) return;
    const entry=state.portal.tokensGrupos[tok]||{alumnos:[]};
    const url=portalUrl(tok);
    const alumnos=(entry.alumnos||[]).map(id=>state.students.find(x=>x.id===id)).filter(Boolean);
    const texto=alumnos.map(x=>`${x.name}:\n${waMsgCompartirLlaveGrupal(x,m.name,url)}`).join("\n\n");
    copyToClipboard(texto)
      .then(()=>toast("Lista copiada"))
      .catch(()=>toast("No se pudo copiar — seleccioná el texto manualmente.","error"));
    return;
  }
  else if(a==="envio-mail-todos"){
    const o=state.envioOverlay; if(!o) return;
    const m=subjById(o.materiaId); const tok=tokenForGrupo(o.materiaId);
    if(!m || !tok || !state.portal) return;
    const entry=state.portal.tokensGrupos[tok]||{alumnos:[]};
    const alumnos=(entry.alumnos||[]).map(id=>state.students.find(x=>x.id===id)).filter(Boolean);
    const conMail=alumnos.filter(x=>x.email);
    const sinMail=alumnos.filter(x=>!x.email);
    if(!conMail.length){ alert("Ninguno de los alumnos incluidos tiene mail cargado en su ficha."); return; }
    const cuerpo=genericoMsgCompartirLlaveGrupal(m.name, portalUrl(tok));
    const mailto=`mailto:?bcc=${encodeURIComponent(conMail.map(x=>x.email).join(","))}&subject=${encodeURIComponent("Acceso a "+m.name)}&body=${encodeURIComponent(cuerpo)}`;
    if(sinMail.length) alert("Quedan afuera (sin mail cargado): "+sinMail.map(x=>x.name).join(", "));
    window.location.href=mailto;
    return;
  }
  // Cuenta ordenada (paso 142): abrir/cerrar un grupo colapsable, o saltar a uno desde el
  // mini-índice (que además lo abre si estaba cerrado, para no llevar a un lugar vacío).
  else if(a==="cuenta-group-toggle"){
    const id=el.dataset.id;
    const closed={...(state.cuentaGroupsClosed||{})};
    closed[id] = !closed[id];
    state.cuentaGroupsClosed=closed;
  }
  else if(a==="cuenta-group-jump"){
    const id=el.dataset.id;
    const closed={...(state.cuentaGroupsClosed||{})};
    delete closed[id];
    state.cuentaGroupsClosed=closed;
    render();
    setTimeout(()=>{
      const t=document.getElementById("cuenta-grp-"+id);
      if(t) t.scrollIntoView({behavior:"smooth", block:"start"});
    },0);
    return;
  }
  else if(a==="toggle-sonidos"){ setSoundsOn(el.dataset.f==="si"); }
  else if(a==="toggle-animaciones"){ setAnimsOn(el.dataset.f==="si"); }
  else if(a==="toggle-fondo"){ setBgOn(el.dataset.f==="si"); }
  else if(a==="toggle-tu-dia"){ state.catalog.mostrarTuDia=el.dataset.f==="si"; touchCatalog(); return; }
  else if(a==="marcar-recordatorio-examen"){
    // Festejo de "Tu día" en cero (paso 179): sólo si ESTA acción deja el checklist de vTuDia()
    // sin pendientes reales — no en cada "Ya avisé" suelto (ver pendingTasksToday() en helpers.js).
    const prevTareas=pendingTasksToday().length;
    marcarExamRecordatorioEnviado(el.dataset.id);
    if(prevTareas>0 && pendingTasksToday().length===0){ fireConfetti({colors:TUDIA_CONFETTI}); soundHito(); }
    return;
  }
  else if(a==="set-theme"){ setTheme(el.dataset.f); }
  else if(a==="set-density"){ setDensity(el.dataset.f); }
  else if(a==="set-accent"){ setAccent(el.dataset.f); }
  else if(a==="sync-now"){ syncNow(true); return; }
  else if(a==="dismiss-update-banner"){ state.updateBannerDismissed=true; }
  else if(a==="sw-update-apply"){ applySwUpdate(); return; }
  else if(a==="sw-check-update"){ checkSwUpdateNow(); return; }
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
  else if(a==="feedback-open"){
    state.feedbackOpen=true; state.feedbackTipo="problema"; state.feedbackMsg=""; state.feedbackStatus="idle"; state.feedbackError="";
  }
  else if(a==="feedback-close"){ state.feedbackOpen=false; }
  else if(a==="feedback-modal-noop"){ return; }
  else if(a==="feedback-tipo"){ state.feedbackTipo=el.dataset.f; }
  else if(a==="feedback-send"){
    const msg=(document.getElementById("feedback-msg").value||"").trim();
    state.feedbackMsg=msg;
    if(!msg){ state.feedbackStatus="error"; state.feedbackError="Escribí algo antes de enviar."; render(); return; }
    if(!navigator.onLine){ state.feedbackStatus="error"; state.feedbackError="Se necesita conexión a internet para enviarlo."; render(); return; }
    state.feedbackStatus="sending"; render();
    sendReport(msg, state.feedbackTipo||"problema", state.view).then(()=>{
      state.feedbackStatus="ok"; render();
    }).catch(()=>{
      state.feedbackStatus="error";
      state.feedbackError = !navigator.onLine ? "Se necesita conexión a internet para enviarlo." : "No se pudo enviar. Probá de nuevo.";
      render();
    });
    return;
  }
  else if(a==="feedback-banner-dismiss"){ dismissFeedbackBanner(); }
  else if(a==="auth-logout"){ setSes(null); state.view="tablero"; _navSnapshot=null; render(); return; }
  else if(a==="open"){
    state.view="detalle"; state.selId=el.dataset.id; state.tab=el.dataset.tab||"resumen"; state.confirmDel=false;
    state.simTimer=null; state.simPrefillNote=""; state.fichaError=""; state.sessionPrefillDate="";
    state.registrarClaseTipo=null;
    // Llave a mano (paso 139): carga el portal en segundo plano al abrir la ficha (si no estaba
    // cargado ya) para que el indicador de llave del header (vLlaveBadge) tenga con qué pintarse
    // sin obligar a pasar por Cuenta primero.
    if(!state.portalLoaded) loadPortal();
  }
  else if(a==="back"){ state.view="lista"; state.selId=null; state.simTimer=null; state.simPrefillNote=""; state.editSessionTopicId=null; }
  else if(a==="ficha-draft-save"){
    if(!state.fichaDraft) return;
    const id=state.fichaDraft.id, patch=state.fichaDraft.patch;
    state.fichaDraft=null;
    update(id, patch);
    toast("Cambios guardados");
    return;
  }
  else if(a==="ficha-draft-discard"){
    state.fichaDraft=null; state.fichaError="";
    toast("Cambios descartados");
    return;
  }
  else if(a==="new"){ state.showNew=true; state.newStudentError=""; state.newStudentAdvancedOpen=false; state.newStudentSeniaActiva=false; state.newStudentTarifaOverride=false; }
  else if(a==="load-sample"){
    const st=sampleStudent();
    state.students.push(st); save();
    state.view="detalle"; state.selId=st.id; state.tab="resumen";
  }
  else if(a==="dismiss-tips"){ dismissTips(); return; }
  else if(a==="reactivate-tips"){ reactivateTips(); return; }
  // FAB de acciones rápidas (paso 77): siempre visible, con las 3 acciones más repetitivas.
  // Precarga lo que puede según el contexto — si ya estás en la ficha de un alumno, "nueva
  // clase"/"registrar pago" van directo a su pestaña; si no, primero piden elegir a quién.
  else if(a==="fab-toggle"){ state.fabOpen=!state.fabOpen; }
  else if(a==="fab-new-student"){ state.fabOpen=false; state.showNew=true; state.newStudentError=""; state.newStudentAdvancedOpen=false; state.newStudentSeniaActiva=false; state.newStudentTarifaOverride=false; }
  else if(a==="fab-new-clase"){
    state.fabOpen=false;
    if(sel()){ state.tab="clases"; state.sessionPrefillDate=today(); state.confirmDel=false; state.fichaError=""; state.registrarClaseTipo="pasada"; }
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
    if(target==="clases"){ state.sessionPrefillDate=today(); state.registrarClaseTipo="pasada"; }
  }
  else if(a==="cancel-new"){ state.showNew=false; state.newStudentError=""; }
  else if(a==="new-advanced-toggle"){
    state.newStudentAdvancedOpen=!state.newStudentAdvancedOpen;
    const div=document.getElementById("n-advanced");
    if(div) div.style.display = state.newStudentAdvancedOpen ? "" : "none";
    el.textContent = (state.newStudentAdvancedOpen?"▾":"▸")+" Opciones avanzadas";
    return;
  }
  else if(a==="new-tarifa-override-toggle"){
    state.newStudentTarifaOverride=true;
    const info=document.getElementById("n-tarifa-info"), row=document.getElementById("n-tarifa-row");
    if(info) info.style.display="none";
    if(row) row.style.display="";
    return;
  }
  else if(a==="new-senia-toggle"){
    state.newStudentSeniaActiva = el.dataset.f==="si";
    const no=document.getElementById("n-senia-no"), si=document.getElementById("n-senia-si");
    if(no) no.classList.toggle("on", !state.newStudentSeniaActiva);
    if(si) si.classList.toggle("on", state.newStudentSeniaActiva);
    const fields=document.getElementById("n-senia-fields");
    if(fields) fields.style.display = state.newStudentSeniaActiva ? "" : "none";
    return;
  }
  else if(a==="create"){
    const name=document.getElementById("n-name").value.trim();
    if(!name){ document.getElementById("n-name").focus(); return; }
    const subjectVal=document.getElementById("n-subject").value;
    const career=document.getElementById("n-career").value;
    const phone=document.getElementById("n-phone").value.trim();
    const tarifa=document.getElementById("n-tarifa").value;
    const modalidad=document.getElementById("n-modalidad").value;
    const email=document.getElementById("n-email").value.trim();
    const chair=document.getElementById("n-chair").value;
    const birthDate=document.getElementById("n-birth").value;
    const examDate=document.getElementById("n-exam").value;
    const notes=document.getElementById("n-notes").value;
    const tagsRaw=document.getElementById("n-tags").value.trim();
    const tagIds = tagsRaw ? tagsRaw.split(",").map(t=>t.trim()).filter(Boolean).map(t=>getOrCreateTag(t).id) : [];
    const seniaActiva=state.newStudentSeniaActiva;
    const seniaTipo=document.getElementById("n-senia-tipo").value;
    const seniaValor=document.getElementById("n-senia-valor").value;
    const makeStudent=(m)=>{
      const st=emptyStudent();
      st.name=name; st.career=career; st.phone=phone;
      st.tarifa=tarifa; st.modalidad=modalidad;
      st.subjectId=m?m.id:""; st.subject=m?m.name:"";
      st.topics=m?Object.fromEntries(m.units.map(u=>[u.nombre,"pendiente"])):{};
      st.email=email; st.chair=chair; st.birthDate=birthDate; st.examDate=examDate;
      st.notes=notes; st.tagIds=tagIds;
      if(seniaActiva){ st.seniaActiva=true; st.seniaTipo=seniaTipo; st.seniaValor=seniaValor; }
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
      state.newStudentError=""; state.showNew=false;
      toast("Estudiante creado", "ok", null, {label:"Completar ficha", run:()=>{ state.view="detalle"; state.selId=st.id; state.tab="resumen"; }});
      return;
    }
  }
  else if(a.startsWith("tab-")){
    state.tab=a.slice(4); state.confirmDel=false; state.fichaError=""; state.sessionPrefillDate=""; state.editSessionTopicId=null;
    state.registrarClaseTipo=null;
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
    if(result==="aprobo"){
      state.examCelebrate={sid:id, grade};
      render();
      fireConfetti(); soundClase();
    }else{
      toast("Resultado guardado");
    }
    return;
  }
  else if(a==="dismiss-exam-celebrate"){ state.examCelebrate=null; }
  else if(a==="del-examresult" && s){
    const removed=(s.examResults||[]).find(x=>x.id===el.dataset.id);
    update(s.id,{examResults:(s.examResults||[]).filter(x=>x.id!==el.dataset.id)});
    toast("Resultado eliminado", "ok", ()=>{
      const st=state.students.find(x=>x.id===s.id); if(!st || !removed) return;
      update(s.id,{examResults:[...(st.examResults||[]), removed]});
    });
    return;
  }
  else if(a==="share-tasa-image"){
    state.tasaImgBusy=true; render();
    buildTasaImageBlob().then(async blob=>{
      const fileName="tasa-aprobacion.png";
      const file=new File([blob], fileName, {type:"image/png"});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        try{ await navigator.share({files:[file], title:"Tasa de aprobación"}); }
        catch(err){ /* cancelado por el usuario o falló el share nativo — no hace falta avisar */ }
      }else{
        const url=URL.createObjectURL(blob);
        const link=document.createElement("a"); link.href=url; link.download=fileName; link.click();
        URL.revokeObjectURL(url);
        toast("Imagen descargada");
      }
      state.tasaImgBusy=false; render();
    }).catch(()=>{
      state.tasaImgBusy=false;
      toast("No se pudo generar la imagen.","error");
    });
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
  else if(a==="informe-share-image" && s){
    state.informeImgBusy=true; render();
    buildInformeImageBlob(s).then(async blob=>{
      const slug=(s.name||"alumno").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
      const fileName=`informe-${slug||"alumno"}.png`;
      const file=new File([blob], fileName, {type:"image/png"});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        try{ await navigator.share({files:[file], title:`Informe de ${s.name}`}); }
        catch(err){ /* cancelado por el usuario o falló el share nativo — no hace falta avisar */ }
      }else{
        const url=URL.createObjectURL(blob);
        const link=document.createElement("a"); link.href=url; link.download=fileName; link.click();
        URL.revokeObjectURL(url);
        toast("Imagen descargada");
      }
      state.informeImgBusy=false; render();
    }).catch(()=>{
      state.informeImgBusy=false;
      toast("No se pudo generar la imagen.","error");
    });
    return;
  }
  else if(a==="open-contrato" && s){ state.view="contrato"; }
  else if(a==="close-contrato"){ state.view="detalle"; state.tab="resumen"; }
  else if(a==="contrato-print"){ window.print(); return; }
  else if(a==="open-recibo" && s){ state.reciboId=el.dataset.id; state.view="recibo"; }
  else if(a==="close-recibo"){ state.view="detalle"; state.tab="pagos"; }
  else if(a==="recibo-print"){ window.print(); return; }
  else if(a==="open-agenda-imprimir"){ state.view="agenda-imprimir"; }
  else if(a==="close-agenda-imprimir"){ state.view="agenda"; }
  else if(a==="agenda-imprimir-print"){ window.print(); return; }
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
    state.listDeuda="todas"; state.listSort="examen"; state.listTag="todas";
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
  else if(a==="pausar-alumno-ask" && s){ state.pausaAskId=s.id; render(); return; }
  else if(a==="pausar-alumno-cancel"){ state.pausaAskId=null; render(); return; }
  else if(a==="pausar-alumno-confirm" && s){
    const hastaEl=document.getElementById("pausa-hasta");
    state.pausaAskId=null;
    update(s.id,{status:"pausado", pausaHasta:(hastaEl&&hastaEl.value)||""});
    toast("Alumno en pausa"); return;
  }
  else if(a==="reanudar-alumno" && s){
    update(s.id,{status:"activo", pausaHasta:""});
    toast("Alumno reanudado"); return;
  }
  else if(a==="estudiantes-tab-alumnos"){ state.estudiantesTab="alumnos"; }
  else if(a==="estudiantes-tab-interesados"){ state.estudiantesTab="interesados"; }
  else if(a==="add-interesado"){
    const nombre=document.getElementById("int-nombre").value.trim(); if(!nombre) return;
    const contacto=document.getElementById("int-contacto").value.trim();
    const materia=document.getElementById("int-materia").value.trim();
    const nota=document.getElementById("int-nota").value.trim();
    state.catalog.interesados=[...interesadosFor(), {id:uid(), nombre, contacto, materia, nota, estado:"consulto", createdAt:Date.now()}];
    touchCatalog(); toast("Interesado agregado"); return;
  }
  else if(a==="cycle-interesado-estado"){
    const id=el.dataset.id;
    state.catalog.interesados=interesadosFor().map(it=>{
      if(it.id!==id) return it;
      const i=INTERESADO_ESTADO_CYCLE.indexOf(it.estado);
      return {...it, estado:INTERESADO_ESTADO_CYCLE[(i+1)%INTERESADO_ESTADO_CYCLE.length]};
    });
    touchCatalog(); return;
  }
  else if(a==="convertir-interesado"){
    const {error, student}=convertirInteresado(el.dataset.id);
    if(error){ toast(error, "error"); return; }
    if(!student) return;
    state.view="detalle"; state.selId=student.id; state.tab="resumen";
    toast("Alumno creado a partir del interesado"); return;
  }
  else if(a==="del-interesado"){
    const id=el.dataset.id;
    const removed=interesadosFor().find(x=>x.id===id);
    state.catalog.interesados=interesadosFor().filter(x=>x.id!==id);
    touchCatalog();
    toast("Interesado eliminado", "ok", ()=>{
      state.catalog.interesados=[...interesadosFor(), removed]; touchCatalog();
    });
    return;
  }
  else if(a==="tag-add" && s){
    const input=document.getElementById("tag-input");
    const v=(input&&input.value||"").trim(); if(!v) return;
    const tag=getOrCreateTag(v);
    const ids=new Set(s.tagIds||[]);
    if(ids.has(tag.id)) return; // ya la tiene — no duplica
    state.justAddedTagId=tag.id; // paso 179: pop-in del chip recién agregado (ver tagChip() en helpers.js)
    update(s.id,{tagIds:[...ids,tag.id]}); return;
  }
  else if(a==="tag-remove"){
    const sid=el.dataset.id, st=state.students.find(x=>x.id===sid); if(!st) return;
    update(sid,{tagIds:(st.tagIds||[]).filter(id=>id!==el.dataset.tag)}); return;
  }
  else if(a==="set-registrar-clase-tipo"){ state.registrarClaseTipo=el.dataset.f; render(); return; }
  else if(a==="registrar-clase-back"){ state.registrarClaseTipo=null; render(); return; }
  // Formulario de clase grupal (paso 157) — un único state.grupalForm reusado desde tres
  // entradas (ficha, Agenda, "Registrar esta clase" sobre una ocurrencia ya agendada), ver el
  // comentario grande de vGrupalForm()/vGrupalFormBody() en views-ficha.js.
  else if(a==="grupal-form-open-ficha"){
    if(!s) return;
    state.grupalForm={subjectId:s.subjectId||null, studentIds:s.subjectId?[s.id]:[], pinnedId:s.id,
      tipo:null, duration:60, asistencias:{}, origin:null};
  }
  else if(a==="grupal-form-open-agenda"){
    state.grupalForm={subjectId:null, studentIds:[], pinnedId:null, tipo:null, duration:60, asistencias:{}, origin:null};
  }
  else if(a==="grupal-form-set-subject"){
    if(!state.grupalForm) return;
    state.grupalForm={...state.grupalForm, subjectId:el.dataset.id, studentIds:[], existingGrupoId:null};
  }
  else if(a==="grupal-form-toggle-alumno"){
    const f=state.grupalForm; if(!f) return;
    if(f.pinnedId===el.dataset.id) return; // el alumno de la ficha no se puede destildar
    const ids=f.studentIds.includes(el.dataset.id) ? f.studentIds.filter(x=>x!==el.dataset.id) : [...f.studentIds, el.dataset.id];
    state.grupalForm={...f, studentIds:ids};
  }
  else if(a==="grupal-form-usar-grupo"){
    const f=state.grupalForm; if(!f) return;
    const g=grupoClaseById(el.dataset.id); if(!g) return;
    const ids=(f.pinnedId && !g.studentIds.includes(f.pinnedId)) ? [...g.studentIds, f.pinnedId] : [...g.studentIds];
    state.grupalForm={...f, studentIds:ids, existingGrupoId:g.id, nombre:g.nombre};
  }
  else if(a==="grupal-form-set-tipo"){ const f=state.grupalForm; if(!f) return; state.grupalForm={...f, tipo:el.dataset.f}; }
  else if(a==="grupal-form-back"){
    const f=state.grupalForm; if(!f) return;
    if(f.tipo){ state.grupalForm={...f, tipo:null}; return; }
    if(f.subjectId && !f.pinnedId){ state.grupalForm={...f, subjectId:null, studentIds:[], existingGrupoId:null}; return; }
    state.grupalForm=null;
  }
  else if(a==="grupal-form-cancel" || a==="grupal-form-noop-close"){ state.grupalForm=null; }
  else if(a==="grupal-form-noop"){ return; }
  else if(a==="grupal-form-save-proxima"){
    const f=state.grupalForm; if(!f || f.studentIds.length<2) return;
    const date=f.date||today(), time=f.time||"18:00", duration=Number(f.duration)||60;
    const topic=f.topic||"", link=(f.link||"").trim(), recurrente=!!f.recurrente;
    const nombre=(f.nombre||"").trim() || `${subjById(f.subjectId)?subjById(f.subjectId).name:"Grupo"} — ${DIAS_SEMANA[weekdayIdx(date)]} ${time}`;
    if(recurrente){
      const grupoId = f.existingGrupoId || crearGrupoClase(nombre, f.subjectId, f.studentIds).id;
      if(f.existingGrupoId) actualizarMiembrosGrupoClase(f.existingGrupoId, f.studentIds);
      addHorarioGrupal(grupoId, f.studentIds, weekdayIdx(date), time, duration, link);
    }else{
      const grupoId = f.existingGrupoId || uid();
      const {warnings} = addPuntualClaseGrupal(grupoId, f.studentIds, date, time, duration, link, topic);
      if(warnings.length) alert(warnings.join("\n"));
    }
    state.grupalForm=null;
    toast(recurrente ? "Horario grupal agendado" : "Próxima clase grupal agendada");
    return;
  }
  else if(a==="grupal-form-save-pasada"){
    const f=state.grupalForm; if(!f || f.studentIds.length<2) return;
    const date=f.date||today(), topic=f.topic||"", duration=Number(f.duration)||60, note=f.note||"";
    const asistencias = f.studentIds.map(id=>{
      const a=(f.asistencias&&f.asistencias[id])||{};
      return {studentId:id, ausente:a.ausente||null, tarea:a.tarea||"sd", monto:a.monto!=null&&a.monto!==""?Number(a.monto):null};
    });
    registrarClaseGrupal({topic, date, duration, note, grupoNombre:f.nombre||"", asistencias});
    state.grupalForm=null;
    toast("Clase grupal registrada");
    fireConfetti(); soundClase();
    return;
  }
  else if(a==="grupal-asistencia-presente"){
    const f=state.grupalForm; if(!f) return;
    const id=el.dataset.id;
    state.grupalForm={...f, asistencias:{...f.asistencias, [id]:{...(f.asistencias[id]||{}), ausente:null}}};
  }
  else if(a==="grupal-asistencia-ausente"){
    const f=state.grupalForm; if(!f) return;
    const id=el.dataset.id, motivo="aviso_tiempo";
    state.grupalForm={...f, asistencias:{...f.asistencias, [id]:{...(f.asistencias[id]||{}), ausente:{motivo, cobra:ausenciaCobraSugerida(motivo)}}}};
  }
  else if(a==="grupal-asistencia-cobra"){
    const f=state.grupalForm; if(!f) return;
    const id=el.dataset.id, prev=(f.asistencias[id]&&f.asistencias[id].ausente)||{motivo:"aviso_tiempo"};
    state.grupalForm={...f, asistencias:{...f.asistencias, [id]:{...(f.asistencias[id]||{}), ausente:{...prev, cobra:el.dataset.f==="si"}}}};
  }
  else if(a==="save-proxima-clase" && s){
    const date=document.getElementById("pc-date").value; if(!date) return;
    const time=document.getElementById("pc-time").value; if(!time) return;
    const duration=parseInt(document.getElementById("pc-duration").value,10)||60;
    const topic=document.getElementById("pc-topic").value;
    const link=document.getElementById("pc-link").value.trim();
    const {warning}=addPuntualClase(s.id, date, time, duration, link, topic);
    state.registrarClaseTipo=null;
    if(warning) alert(warning);
    else toast("Próxima clase agendada");
    return;
  }
  else if(a==="save-session" && s){
    const date=document.getElementById("c-date").value; if(!date) return;
    state.sessionPrefillDate="";
    const note=document.getElementById("c-note").value;
    if((state.sessionEstado||"dada")==="ausente"){
      const motivo=state.sessionAusenteMotivo||"aviso_tiempo";
      const cobra=state.sessionAusenteCobra!=null ? state.sessionAusenteCobra : ausenciaCobraSugerida(motivo);
      update(s.id,{sessions:[...s.sessions,{id:uid(),date,note,ausente:{motivo,cobra}}]});
      state.sessionEstado="dada"; state.sessionAusenteMotivo=null; state.sessionAusenteCobra=null;
      state.registrarClaseTipo=null;
      toast("Ausencia registrada"); return;
    }
    const goal=document.getElementById("c-goal").value.trim();
    const durationRaw=document.getElementById("c-duration").value;
    const duration=durationRaw==="" ? null : (parseInt(durationRaw,10)||60);
    const montoEl=document.getElementById("c-monto");
    const monto=(s.modalidad==="hora" && montoEl && montoEl.value!=="") ? Number(montoEl.value) : null;
    // paso 158: si tiene un pack de clases activo, esta clase lo descuenta en vez de sumar a
    // pendiente/cobrado por clase (ver aplicarDescuentoPack/pagoResumen en helpers.js).
    const {packClaseId, packsClases} = aplicarDescuentoPack(s);
    update(s.id,{sessions:[...s.sessions,{id:uid(),date,
      topic:document.getElementById("c-topic").value,
      tarea:document.getElementById("c-tarea").value,
      note,
      duration,
      monto,
      objetivo:goal, objetivoResult:null,
      cobrada:false, packClaseId}], packsClases});
    state.registrarClaseTipo=null;
    toast("Clase registrada");
    fireConfetti(); soundClase();
    return;
  }
  else if(a==="set-session-estado"){ state.sessionEstado=el.dataset.f; render(); return; }
  else if(a==="set-session-ausente-cobra"){ state.sessionAusenteCobra = el.dataset.f==="si"; render(); return; }
  else if(a==="goal-resultado"){
    const sid=el.dataset.sid, st=state.students.find(x=>x.id===sid); if(!st) return;
    const cid=el.dataset.id, r=el.dataset.r;
    const pct = OBJETIVO_META[r].pctDefault;
    update(sid,{sessions:st.sessions.map(x=>x.id===cid?{...x,objetivoResult:{estado:r,pct}}:x)});
    state.goalCelebrate={sid,estado:r};
    render();
    if(r==="si"){ fireConfetti(); soundObjetivo(); } // paso 143: festejo sólo si se cumplió del todo
    setTimeout(()=>{
      if(state.goalCelebrate && state.goalCelebrate.sid===sid){ state.goalCelebrate=null; render(); }
    }, 1600);
    return;
  }
  else if(a==="goal-resultado-pct"){
    const sid=el.dataset.sid, st=state.students.find(x=>x.id===sid); if(!st) return;
    const cid=el.dataset.id;
    const sliderEl=document.getElementById("goal-pct-"+cid);
    const pct = sliderEl ? parseInt(sliderEl.value,10) : 50;
    const r = estadoFromPct(pct);
    update(sid,{sessions:st.sessions.map(x=>x.id===cid?{...x,objetivoResult:{estado:r,pct}}:x)});
    state.goalCelebrate={sid,estado:r};
    render();
    if(r==="si"){ fireConfetti(); soundObjetivo(); }
    setTimeout(()=>{
      if(state.goalCelebrate && state.goalCelebrate.sid===sid){ state.goalCelebrate=null; render(); }
    }, 1600);
    return;
  }
  else if(a==="session-topic-rename-start"){ state.editSessionTopicId=el.dataset.id; }
  else if(a==="session-topic-rename-cancel"){ state.editSessionTopicId=null; }
  else if(a==="session-topic-rename-done" && s){
    const cid=el.dataset.id;
    const input=document.getElementById("session-topic-input");
    const v=input?input.value:"";
    state.editSessionTopicId=null;
    update(s.id,{sessions:s.sessions.map(x=>x.id===cid?{...x,topic:v}:x)});
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
    const link=document.getElementById("h-link").value.trim();
    update(s.id,{horarios:[...(s.horarios||[]), {id:uid(), day, time, duration, link}]});
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
  else if(a==="toggle-notif-clases"){ setNotifClasesDia(el.dataset.f==="si"); return; }
  else if(a==="restaurar-mensaje"){
    const key=el.dataset.key, def=defaultMensajes()[key]; if(def==null) return;
    state.catalog.mensajes = {...mensajesFor(), [key]:def};
    touchCatalog(); toast("Plantilla restaurada"); return;
  }
  // Mensajes por grupo de contexto (paso 175): cada grupo abre/cierra independiente; adentro,
  // sólo una plantilla puntual (general o propia) queda abierta a la vez, ver vMensajesCard().
  else if(a==="msg-ctx-toggle"){
    const id=el.dataset.id;
    const open={...(state.mensajesCtxOpen||{})};
    open[id] = !open[id];
    state.mensajesCtxOpen=open;
  }
  else if(a==="msg-tpl-toggle"){
    const key=el.dataset.key;
    state.mensajeAbierto = state.mensajeAbierto===key ? null : key;
  }
  else if(a==="propia-nueva"){
    const p={id:uid(), nombre:"Nueva plantilla", texto:""};
    state.catalog.mensajesPropios=[...mensajesPropiasFor(), p];
    state.mensajeAbierto="propia:"+p.id;
    touchCatalog(); return;
  }
  else if(a==="propia-del-ask"){ state.propiaDelConfirmId=el.dataset.id; }
  else if(a==="propia-del-cancel"){ state.propiaDelConfirmId=null; }
  else if(a==="propia-del-confirm"){
    const id=el.dataset.id;
    state.catalog.mensajesPropios=mensajesPropiasFor().filter(p=>p.id!==id);
    state.propiaDelConfirmId=null;
    if(state.mensajeAbierto==="propia:"+id) state.mensajeAbierto=null;
    touchCatalog(); toast("Plantilla borrada"); return;
  }
  // Packs de catálogo (paso 176): mismo patrón CRUD que las plantillas propias de arriba.
  else if(a==="pack-cat-nuevo"){
    const p={id:uid(), nombre:"Nuevo pack", cantidad:8, precio:"", vigenciaTexto:"", mostrarPortal:false};
    state.catalog.packsCatalogo=[...packsCatalogoFor(), p];
    state.mensajeAbierto="pack:"+p.id;
    touchCatalog(); return;
  }
  else if(a==="pack-cat-toggle-portal"){
    const id=el.dataset.id;
    state.catalog.packsCatalogo=packsCatalogoFor().map(p=>p.id===id?{...p,mostrarPortal:!p.mostrarPortal}:p);
    touchCatalog(); return;
  }
  else if(a==="pack-cat-del-ask"){ state.packCatalogoDelConfirmId=el.dataset.id; }
  else if(a==="pack-cat-del-cancel"){ state.packCatalogoDelConfirmId=null; }
  else if(a==="pack-cat-del-confirm"){
    const id=el.dataset.id;
    state.catalog.packsCatalogo=packsCatalogoFor().filter(p=>p.id!==id);
    state.packCatalogoDelConfirmId=null;
    if(state.mensajeAbierto==="pack:"+id) state.mensajeAbierto=null;
    if(state.packClasesCatalogId===id) state.packClasesCatalogId="";
    touchCatalog(); toast("Pack borrado"); return;
  }
  else if(a==="toggle-recordatorios"){
    state.catalog.recordatorios = {...recordatoriosFor(), activo: el.dataset.f==="si"};
    touchCatalog(); return;
  }
  else if(a==="set-escala-objetivo"){ state.catalog.escalaObjetivo=el.dataset.f; touchCatalog(); return; }
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
      const prevPendiente=pendienteTotalFor(s);
      const prevTareas=pendingTasksToday().length; // festejo de "Tu día" (paso 179), ver abajo
      const r = crearRecibo(s,{tipo:"clase", concepto:`Clase del ${fmtDate(sessionEl.date)}`, monto:Number(s.tarifa)||0});
      update(s.id,{sessions, recibos:[...(s.recibos||[]), r]});
      toast("Clase marcada como cobrada", "ok", null, {label:"Ver recibo", run:()=>{ state.reciboId=r.id; state.view="recibo"; }});
      if(typeof animateCounters==="function") animateCounters(); // paso 179: el total "pendiente" del mes cuenta hacia abajo (ver moneySpan en helpers.js)
      // Festejo (paso 143) sólo si esto deja al alumno sin nada pendiente — no en cada clase cobrada.
      const st2=state.students.find(x=>x.id===s.id);
      if(st2 && prevPendiente>0 && pendienteTotalFor(st2)<=0){ fireConfetti(); soundCobro(); }
      // Festejo de "Tu día" en cero (paso 179) — sólo si no festejamos ya arriba por la deuda, para
      // no disparar dos confettis/sonidos de golpe por el mismo click.
      else if(prevTareas>0 && pendingTasksToday().length===0){ fireConfetti({colors:TUDIA_CONFETTI}); soundHito(); }
    }else{
      update(s.id,{sessions});
      toast("Clase marcada como pendiente");
    }
    return;
  }
  else if(a==="save-pago" && s){
    const date=document.getElementById("pago-date").value; if(!date) return;
    const amount=parseFloat(document.getElementById("pago-amount").value); if(!amount) return;
    const prevPendiente=pendienteTotalFor(s);
    const prevTareas=pendingTasksToday().length; // festejo de "Tu día" (paso 179), ver abajo
    const pagos=[...(s.pagos||[]),{id:uid(),date,amount}];
    const mk = monthKeyOf(date);
    const pendiente = pagoResumen({...s,pagos}, mk).pendiente;
    const r = crearRecibo(s,{tipo:"mensual", concepto:`Mensualidad ${monthLabel(mk)}`, monto:amount, date, saldo:pendiente});
    update(s.id,{pagos, recibos:[...(s.recibos||[]), r]});
    toast("Pago registrado", "ok", null, {label:"Ver recibo", run:()=>{ state.reciboId=r.id; state.view="recibo"; }});
    if(typeof animateCounters==="function") animateCounters(); // paso 179: el total "pendiente" del mes cuenta hacia abajo (ver moneySpan en helpers.js)
    // Festejo (paso 143) sólo si esto deja al alumno sin nada pendiente.
    const st2=state.students.find(x=>x.id===s.id);
    if(st2 && prevPendiente>0 && pendienteTotalFor(st2)<=0){ fireConfetti(); soundCobro(); }
    // Festejo de "Tu día" en cero (paso 179) — sólo si no festejamos ya arriba por la deuda.
    else if(prevTareas>0 && pendingTasksToday().length===0){ fireConfetti({colors:TUDIA_CONFETTI}); soundHito(); }
    return;
  }
  else if(a==="del-pago" && s){
    const removed=(s.pagos||[]).find(x=>x.id===el.dataset.id);
    // paso 158: si el pago borrado era la venta de un pack, el pack entero se va con él (no tiene
    // sentido dejar un pack "huérfano" sin el cobro que lo respalda) — se restaura junto al pago si
    // se deshace, con las clases que ya se le hayan descontado tal cual quedaron.
    const removedPack = removed && removed.tipo==="packClase" ? (s.packsClases||[]).find(p=>p.id===removed.packId) : null;
    update(s.id,{
      pagos:(s.pagos||[]).filter(x=>x.id!==el.dataset.id),
      ...(removedPack ? {packsClases:(s.packsClases||[]).filter(p=>p.id!==removedPack.id)} : {}),
    });
    toast("Pago eliminado", "ok", ()=>{
      const st=state.students.find(x=>x.id===s.id); if(!st || !removed) return;
      update(s.id,{
        pagos:[...(st.pagos||[]), removed],
        ...(removedPack ? {packsClases:[...(st.packsClases||[]), removedPack]} : {}),
      });
      toast("Pago restaurado");
    }); return;
  }
  else if(a==="pack-clases-elegir-catalogo"){
    const p=packsCatalogoFor().find(x=>x.id===el.dataset.id); if(!p) return;
    state.packClasesCatalogId=p.id; state.packClasesCant=p.cantidad; render(); return;
  }
  else if(a==="pack-clases-elegir-personalizado"){ state.packClasesCatalogId=""; render(); return; }
  else if(a==="save-pack-clases" && s){
    const catalogPack = packsCatalogoFor().find(p=>p.id===state.packClasesCatalogId);
    const cant = parseInt(document.getElementById("pack-clases-cant")?.value, 10) || Number(state.packClasesCant) || 8;
    const precioEl = document.getElementById("pack-clases-precio");
    const precio = (precioEl && precioEl.value!=="") ? Number(precioEl.value) : (catalogPack ? Number(catalogPack.precio)||0 : packClasesPrecioSugerido(s, cant));
    if(!cant || cant<1 || !precio || precio<=0) return;
    const date = document.getElementById("pack-clases-fecha")?.value || today();
    const packId = uid(), pagoId = uid();
    const pagos = [...(s.pagos||[]), {id:pagoId, date, amount:precio, tipo:"packClase", packId}];
    const packsClases = [...(s.packsClases||[]), {id:packId, fecha:date, total:cant, restantes:cant, precio, pagoId}];
    const r = crearRecibo(s, {tipo:"packClase", concepto:`Pack de ${cant} clases`, monto:precio, date});
    update(s.id,{pagos, packsClases, recibos:[...(s.recibos||[]), r]});
    toast("Pack vendido", "ok", null, {label:"Ver recibo", run:()=>{ state.reciboId=r.id; state.view="recibo"; }});
    fireConfetti({colors:PACK_CONFETTI}); soundPack(); // festejo (paso 179): venta de pack de clases
    return;
  }
  else if(a==="pagos-tab"){ state.pagosTab=el.dataset.t; }
  else if(a==="toggle-tarifa-ajuste-alumno"){
    const cfg=tarifaAjusteState(), id=el.dataset.id;
    cfg.excluidos = cfg.excluidos.includes(id) ? cfg.excluidos.filter(x=>x!==id) : [...cfg.excluidos, id];
    render(); return;
  }
  else if(a==="toggle-tarifa-ajuste-materia"){
    const cfg=tarifaAjusteState(), materia=el.dataset.subject;
    const ids = alive().filter(s=>s.status==="activo" && Number(s.tarifa)>0 && (s.subject||"Sin materia")===materia).map(s=>s.id);
    const todosIncluidos = ids.every(id=>!cfg.excluidos.includes(id));
    cfg.excluidos = todosIncluidos ? [...new Set([...cfg.excluidos, ...ids])] : cfg.excluidos.filter(id=>!ids.includes(id));
    render(); return;
  }
  else if(a==="toggle-tarifa-ajuste-default"){
    tarifaAjusteState().incluirDefault = !tarifaAjusteState().incluirDefault;
    return;
  }
  else if(a==="apply-tarifa-ajuste"){
    const cfg=tarifaAjusteState();
    const step = Number(cfg.redondeo)||0;
    const cambios = alive().filter(s=>s.status==="activo" && Number(s.tarifa)>0 && !cfg.excluidos.includes(s.id))
      .map(s=>({id:s.id, actual:Number(s.tarifa)||0, nueva:tarifaAjusteNueva(Number(s.tarifa)||0, cfg.modo, cfg.valor, step)}));
    if(cambios.length===0 && !cfg.incluirDefault) return;
    if(cambios.length) applyTarifaAjuste(cambios);
    if(cfg.incluirDefault && Number(tarifaDefaultFor().monto)>0){
      const nuevaDef = tarifaAjusteNueva(Number(tarifaDefaultFor().monto)||0, cfg.modo, cfg.valor, step);
      state.catalog.tarifaDefault = {...tarifaDefaultFor(), monto:nuevaDef};
      touchCatalog();
    }
    state.tarifaAjuste = {modo:cfg.modo, valor:"", redondeo:cfg.redondeo, excluidos:[], incluirDefault:false};
    toast(`Tarifa ajustada para ${cambios.length} alumno${cambios.length===1?"":"s"}${cfg.incluirDefault?" y tu tarifa habitual":""}.`, "ok");
    return;
  }
  else if(a==="stats-mode"){ state.statsMode=el.dataset.m; }
  else if(a==="compare-prev-month"){ state.compareA=monthKeyOffset(0); state.compareB=monthKeyOffset(-1); }
  else if(a==="compare-last-year"){ state.compareA=monthKeyOffset(0); state.compareB=monthKeyOffset(-12); }
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
  else if(a==="dismiss-fin-cuatrimestre"){ dismissFinCuatrimestre(); }
  else if(a==="fincuatri-open"){
    state.finCuatrimestreOpen=true; state.finCuatrimestreSkipped=[];
    state.finCuatrimestreDays = state.finCuatrimestreDays || FIN_CUATRIMESTRE_DIAS_SIN_CLASE;
    state.finCuatrimestreActed=false; // paso 179: se prende sólo si el docente pausa/despide a alguien en este paso, ver fincuatri-close
  }
  else if(a==="fincuatri-close"){
    state.finCuatrimestreOpen=false;
    // Festejo de cierre de cuatrimestre (paso 179): sólo si de verdad se resolvió algo en este
    // paso del asistente (pausar/despedir al menos un alumno) — cerrar el overlay sin tocar nada
    // (por ej. clickeando afuera para mirar de nuevo más tarde) no cuenta como "terminaste".
    if(state.finCuatrimestreActed){
      fireConfetti({colors:CUATRI_CONFETTI, duration:1300}); soundCuatrimestre();
      state.finCuatrimestreActed=false;
    }
  }
  else if(a==="fincuatri-modal-noop"){ return; }
  else if(a==="fincuatri-days"){ state.finCuatrimestreDays=parseInt(el.dataset.f,10); }
  else if(a==="fincuatri-skip"){
    state.finCuatrimestreSkipped=[...(state.finCuatrimestreSkipped||[]), el.dataset.id];
  }
  else if(a==="fincuatri-pausar"){
    const id=el.dataset.id, st=state.students.find(x=>x.id===id); if(!st) return;
    update(id,{status:"pausado"});
    state.finCuatrimestreActed=true; // paso 179: festejo al cerrar el asistente, ver fincuatri-close
    toast("Alumno en pausa", "ok", ()=>{
      const st2=state.students.find(x=>x.id===id); if(!st2) return;
      update(id,{status:"activo"});
    });
    return;
  }
  else if(a==="fincuatri-pausar-todos"){
    const days=state.finCuatrimestreDays||FIN_CUATRIMESTRE_DIAS_SIN_CLASE;
    const skipped=state.finCuatrimestreSkipped||[];
    const ids = alumnosSinClasesFinCuatrimestre(days).filter(x=>!skipped.includes(x.id)).map(x=>x.id);
    if(!ids.length) return;
    ids.forEach(id=>update(id,{status:"pausado"}));
    state.finCuatrimestreActed=true; // paso 179
    toast(`${ids.length} alumno${ids.length===1?"":"s"} en pausa`, "ok", ()=>{
      ids.forEach(id=>{ const st2=state.students.find(x=>x.id===id); if(st2) update(id,{status:"activo"}); });
    });
    return;
  }
  else if(a==="fincuatri-despedir"){
    const id=el.dataset.id, st=state.students.find(x=>x.id===id); if(!st) return;
    update(id,{status:"dejo"});
    state.finCuatrimestreActed=true; // paso 179
    if(hasPhone(st)) window.open(waLink(st,waMsgDespedida(st)),"_blank","noopener");
    toast("Alumno marcado como dejó", "ok", ()=>{
      const st2=state.students.find(x=>x.id===id); if(!st2) return;
      update(id,{status:"activo"});
    });
    return;
  }
  else if(a==="share-periodo-image"){
    state.periodoImgBusy=true; render();
    buildResumenPeriodoImageBlob().then(async blob=>{
      const fileName="resumen-periodo.png";
      const file=new File([blob], fileName, {type:"image/png"});
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        try{ await navigator.share({files:[file], title:"Resumen del período"}); }
        catch(err){ /* cancelado por el usuario o falló el share nativo — no hace falta avisar */ }
      }else{
        const url=URL.createObjectURL(blob);
        const link=document.createElement("a"); link.href=url; link.download=fileName; link.click();
        URL.revokeObjectURL(url);
        toast("Imagen descargada");
      }
      state.periodoImgBusy=false; render();
    }).catch(()=>{
      state.periodoImgBusy=false;
      toast("No se pudo generar la imagen.","error");
    });
    return;
  }
  else if(a==="ficha-new-career" && s){
    const v=(prompt("Nombre de la nueva carrera:")||"").trim(); if(!v) return;
    let c=state.catalog.careers.find(x=>normName(x.nombre)===normName(v));
    if(!c){ c={id:uid(), nombre:v}; state.catalog.careers.push(c); state.catalog.updatedAt=Date.now(); }
    update(s.id,{career:c.nombre});
    return;
  }
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
  else if(a==="toggle-alert-msg"){ state.alertMsgFor = state.alertMsgFor===el.dataset.id ? null : el.dataset.id; }
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
    const prevTareas=pendingTasksToday().length; // festejo de "Tu día" (paso 179), ver marcar-recordatorio-examen arriba
    const blob=new Blob([JSON.stringify({students:state.students},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url; link.download=`seguimiento-estudiantes-${today()}.json`;
    link.click(); URL.revokeObjectURL(url);
    markExported();
    if(prevTareas>0 && pendingTasksToday().length===0){ fireConfetti({colors:TUDIA_CONFETTI}); soundHito(); }
    toast("Copia descargada"); return;
  }
  else if(a==="new-career-inline"){
    // Alta de alumno (vModal): crea la carrera sin re-renderizar el modal entero, para no perder
    // lo que ya se tipeó en nombre/materia/notas (esos inputs no están atados a state, ver el
    // comentario de vModal en views-core.js) — se toca el input de carrera directo, igual que
    // n-subject-pick en handleFormChange.
    const v=(prompt("Nombre de la nueva carrera:")||"").trim(); if(!v) return;
    let c=state.catalog.careers.find(x=>normName(x.nombre)===normName(v));
    if(!c){ c={id:uid(), nombre:v}; state.catalog.careers.push(c); state.catalog.updatedAt=Date.now(); save(); }
    const inp=document.getElementById("n-career"); if(inp) inp.value=c.nombre;
    return;
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
  // #new-unit y #new-subunit-* (paso 127) restauran el foco después de agregar — se manejan
  // aparte, más abajo, para no tocar el comportamiento de ningún otro data-enter existente.
  if(el.id==="new-unit" || (el.id||"").startsWith("new-subunit-")) return;
  e.preventDefault();
  const btn=document.querySelector(`[data-a="${el.dataset.enter}"]`);
  if(btn) btn.click();
});

// Enter en "nueva unidad"/"nueva subunidad" (paso 127): agrega, limpia el campo (el input
// recreado por render() ya no tiene el valor viejo) y deja el foco puesto ahí para seguir
// cargando en cadena — mismo truco de "diferir el render y restaurar después" que ya usa el
// listener de "change" para no perder el foco (ver el comentario largo más abajo).
document.addEventListener("keydown",(e)=>{
  if(e.key!=="Enter") return;
  const id=e.target.id||"";
  if(id!=="new-unit" && !id.startsWith("new-subunit-")) return;
  const el=e.target.closest("[data-enter]"); if(!el) return;
  e.preventDefault();
  const btn=document.querySelector(`[data-a="${el.dataset.enter}"]`);
  if(!btn) return;
  const realRender=render;
  let pending=false;
  render=()=>{ pending=true; };
  try{ btn.click(); }
  finally{ render=realRender; }
  if(pending){
    realRender();
    const ne=document.getElementById(id);
    if(ne) ne.focus();
  }
});

// Doble click para renombrar una unidad/subunidad (paso 127) — atajo del mismo destino que el
// lápiz (data-a="cat-unit-rename-start"/"cat-subunit-rename-start"), delegado igual que el click
// normal (ver arriba) en vez de un ondblclick inline, para no salirse del patrón del resto de la
// app. Un doble click también dispara dos "click" normales sobre el mismo elemento, pero el
// label no tiene data-a propio, así que no hacen nada ahí.
document.addEventListener("dblclick",(e)=>{
  const el=e.target.closest("[data-a-dbl]"); if(!el) return;
  const a=el.dataset.aDbl;
  if(a==="cat-unit-rename-start"){ state.editSubunitId=null; state.editUnitId=el.dataset.id; render(); }
  else if(a==="cat-subunit-rename-start"){ state.editUnitId=null; state.editSubunitId={unitId:el.dataset.unitId, subId:el.dataset.id}; render(); }
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
  if(e.key==="Tab" && (state.searchOpen || state.showNew || state.agendaEdit)) trapFocus(e);
});

// Atajos de teclado en escritorio (paso 75): "/" busca, "n" nuevo alumno, "c" nueva clase
// (dentro de la ficha de un alumno, va a la pestaña "Clases"), Esc cierra diálogos/popovers.
// Listados en el centro de ayuda (ver vCentroAyuda en views-cuenta.js). Ninguno dispara si ya se está
// escribiendo en un campo, para no pisar lo que el profesor esté tipeando.
document.addEventListener("keydown",(e)=>{
  const typing = /^(input|textarea|select)$/i.test(e.target.tagName);
  if(!state.searchOpen && e.key==="/" && !typing && getSes() && !state.recovery){
    e.preventDefault(); state.searchOpen=true; state.searchQuery=""; state.searchSel=0; render(); return;
  }
  if(!state.searchOpen && !state.showNew && !typing && getSes() && !state.recovery && !e.ctrlKey && !e.metaKey && !e.altKey){
    if(e.key==="n"){ e.preventDefault(); state.showNew=true; state.newStudentError=""; state.newStudentAdvancedOpen=false; state.newStudentSeniaActiva=false; state.newStudentTarifaOverride=false; render(); return; }
    if(e.key==="c" && state.view==="detalle" && sel()){ e.preventDefault(); state.tab="clases"; render(); return; }
  }
  if(!state.searchOpen){
    if(e.key==="Escape" && state.showNew){ state.showNew=false; state.newStudentError=""; render(); return; }
    if(e.key==="Escape" && state.fabPick){ state.fabPick=null; render(); return; }
    if(e.key==="Escape" && state.fabOpen){ state.fabOpen=false; render(); return; }
    if(e.key==="Escape" && state.helpOpen){ state.helpOpen=null; render(); }
    if(e.key==="Escape" && state.agendaEdit){
      state.agendaEdit=null; state.agendaEditPending=null; state.agendaEditCancelConfirm=false; state.agendaEditDeleteConfirm=false;
      render(); return;
    }
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

// Un "change" dispara al perder el foco (blur) — por ejemplo al tabular hacia el campo
// siguiente. Si el handler reconstruye todo el DOM ahí mismo, de forma sincrónica, el
// navegador todavía no terminó de mover el foco: termina cayendo a <body> y Tab "no avanza"
// al campo de la derecha (confirmado con Playwright en un navegador real — jsdom no simula
// el avance de foco por Tab, así que no lo hubiera detectado). Se difiere cualquier render()
// que dispare este handler un tick, para que el navegador mueva el foco primero con el DOM
// viejo intacto, y recién ahí se reconstruye — restaurando el foco al equivalente del
// elemento que quedó enfocado (ver focusSelectorFor en helpers.js).
// paso 125: cuando el blur no deja un foco puntual (tocar afuera de cualquier campo para
// cerrar el teclado en el celular, el caso más común al terminar de cargar "Cátedra" — el
// próximo campo de esa fila es "Teléfono", pero muchas veces se toca afuera en vez de tabular)
// el foco cae en <body> y focusSelectorFor() devuelve null: no había nada que restaurar el
// foco, pero tampoco se restauraba el SCROLL, así que reconstruir #app entero de cero (sin
// diffing) podía dejar la página arriba de todo. Ahora se guarda scrollX/scrollY antes de
// reconstruir y se reaplican después de intentar restaurar el foco (para que el "scroll into
// view" nativo de un foco recién puesto no gane la última palabra).
document.addEventListener("change",(e)=>{
  const realRender=render;
  let pending=false;
  render=()=>{ pending=true; };
  try{ handleFormChange(e); }
  finally{ render=realRender; }
  if(pending){
    const scrollX=window.scrollX, scrollY=window.scrollY;
    setTimeout(()=>{
      const active=document.activeElement;
      const sel=focusSelectorFor(active);
      const pos=(active && typeof active.selectionStart==="number") ? active.selectionStart : null;
      realRender();
      if(sel){
        const ne=document.querySelector(sel);
        if(ne){
          ne.focus();
          if(pos!=null && typeof ne.setSelectionRange==="function"){ try{ ne.setSelectionRange(pos,pos); }catch(err){} }
        }
      }
      window.scrollTo(scrollX, scrollY);
    },0);
  }
});
function handleFormChange(e){
  // Selector "Enlazar a una unidad" de un material puntual (paso 128, ver vMaterialRow en
  // views-materias.js) — no usa data-cf porque el valor depende del archivo (data-name), no de una clave
  // fija del switch de más abajo.
  const mu=e.target.closest("[data-matunit]");
  if(mu){ setMaterialUnit(mu.dataset.id, mu.dataset.name, mu.value); render(); return; }
  const cf=e.target.closest("[data-cf]");
  if(cf && cf.dataset.cf==="users-plan"){ setUsuarioPlan(cf.dataset.id, cf.value); return; }
  // Popover de edición desde la agenda (paso 135): el alumno dueño de la clase no es
  // necesariamente state.selId (se puede abrir desde cualquier vista de Agenda sin haber entrado
  // a ninguna ficha), así que estos campos resuelven el estudiante desde state.agendaEdit en vez
  // de sel(). Fecha/hora/duración/link de un horario habitual quedan en un "pending" a la espera
  // de elegir alcance (sólo esta clase o todas) — ver agenda-edit-scope-* en el switch de arriba;
  // tema previsto no admite alcance (los horarios no tienen tema propio) así que se aplica directo.
  if(cf && (cf.dataset.cf==="agenda-edit-date" || cf.dataset.cf==="agenda-edit-time" || cf.dataset.cf==="agenda-edit-duration" || cf.dataset.cf==="agenda-edit-link" || cf.dataset.cf==="agenda-edit-topic")){
    const ev=findAgendaEditEvent(state.agendaEdit); if(!ev) return;
    const field=cf.dataset.cf.slice("agenda-edit-".length);
    const value=field==="duration" ? (parseInt(cf.value,10)||60) : cf.value;
    if(ev.kind==="puntual"){ editPuntualClase(ev.studentId, ev.sourceId, {[field]:value}); render(); return; }
    if(field==="topic"){ applyHorarioEdit(ev.studentId, ev.sourceId, ev.origDate, {topic:value}, "solo"); render(); return; }
    state.agendaEditPending={...(state.agendaEditPending||{}), [field]:value};
    render(); return;
  }
  // Mismo criterio que el bloque agenda-edit-* de arriba, pero para una ocurrencia GRUPAL (paso
  // 157): el patch se aplica a la fila mirror de TODOS los integrantes a la vez (ver
  // applyHorarioEditGrupal/editPuntualClaseGrupal en helpers.js) — nunca a uno solo.
  if(cf && (cf.dataset.cf==="agenda-edit-grupal-date" || cf.dataset.cf==="agenda-edit-grupal-time" || cf.dataset.cf==="agenda-edit-grupal-duration" || cf.dataset.cf==="agenda-edit-grupal-link" || cf.dataset.cf==="agenda-edit-grupal-topic")){
    const ev=findAgendaEditEventGrupal(state.agendaEditGrupal); if(!ev) return;
    const field=cf.dataset.cf.slice("agenda-edit-grupal-".length);
    const value=field==="duration" ? (parseInt(cf.value,10)||60) : cf.value;
    if(ev.kind==="puntual"){ editPuntualClaseGrupal(ev.grupoId, {[field]:value}); render(); return; }
    if(field==="topic"){ applyHorarioEditGrupal(ev.grupoId, ev.origDate, {topic:value}, "solo"); render(); return; }
    state.agendaEditGrupalPending={...(state.agendaEditGrupalPending||{}), [field]:value};
    render(); return;
  }
  // Formulario de clase grupal (paso 157, ver vGrupalForm en views-ficha.js) — campos comunes al grupo
  // (state.grupalForm) y asistencia por alumno (state.grupalForm.asistencias[studentId]).
  if(cf && (cf.dataset.cf==="grupal-form-date" || cf.dataset.cf==="grupal-form-time" || cf.dataset.cf==="grupal-form-duration"
      || cf.dataset.cf==="grupal-form-topic" || cf.dataset.cf==="grupal-form-link" || cf.dataset.cf==="grupal-form-note" || cf.dataset.cf==="grupal-form-nombre")){
    const f=state.grupalForm; if(!f) return;
    const field=cf.dataset.cf.slice("grupal-form-".length);
    const value=field==="duration" ? (parseInt(cf.value,10)||60) : cf.value;
    state.grupalForm={...f, [field]:value};
    render(); return;
  }
  if(cf && cf.dataset.cf==="grupal-form-recurrente"){
    const f=state.grupalForm; if(!f) return;
    state.grupalForm={...f, recurrente:cf.checked};
    render(); return;
  }
  if(cf && cf.dataset.cf==="grupal-asistencia-tarea"){
    const f=state.grupalForm; if(!f) return;
    const id=cf.dataset.id;
    state.grupalForm={...f, asistencias:{...f.asistencias, [id]:{...(f.asistencias[id]||{}), tarea:cf.value}}};
    render(); return;
  }
  if(cf && cf.dataset.cf==="grupal-asistencia-monto"){
    const f=state.grupalForm; if(!f) return;
    const id=cf.dataset.id;
    state.grupalForm={...f, asistencias:{...f.asistencias, [id]:{...(f.asistencias[id]||{}), monto:cf.value}}};
    render(); return;
  }
  if(cf && cf.dataset.cf==="grupal-asistencia-motivo"){
    const f=state.grupalForm; if(!f) return;
    const id=cf.dataset.id, prev=(f.asistencias[id]&&f.asistencias[id].ausente)||{};
    state.grupalForm={...f, asistencias:{...f.asistencias, [id]:{...(f.asistencias[id]||{}), ausente:{...prev, motivo:cf.value}}}};
    render(); return;
  }
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
  if(cf && cf.dataset.cf==="recordatorio-horas-antes"){ setRecordatorioClasesHorasAntes(cf.value); return; }
  if(cf && cf.dataset.cf==="docente-nombre"){ state.catalog.docente={...docenteFor(), nombre:cf.value}; touchCatalog(); return; }
  if(cf && cf.dataset.cf==="docente-telefono"){ state.catalog.docente={...docenteFor(), telefono:cf.value}; touchCatalog(); return; }
  if(cf && cf.dataset.cf==="docente-dni"){ state.catalog.docente={...docenteFor(), dni:cf.value}; touchCatalog(); return; }
  // Cobros del docente (paso 141): alias/CVU sin validar (texto libre); los dos links sí, sólo
  // https — se guardan igual si no cumplen (para no perder lo tipeado a medio escribir), pero
  // avisa con un hint bajo el campo (ver vCobrosCard, views-cuenta.js).
  if(cf && cf.dataset.cf==="tarifa-default-modalidad"){ state.catalog.tarifaDefault={...tarifaDefaultFor(), modalidad:cf.value}; touchCatalog(); return; }
  if(cf && cf.dataset.cf==="tarifa-default-monto"){ state.catalog.tarifaDefault={...tarifaDefaultFor(), monto:cf.value}; touchCatalog(); return; }
  if(cf && cf.dataset.cf==="tarifa-default-duracion"){ state.catalog.tarifaDefault={...tarifaDefaultFor(), duracion:parseInt(cf.value,10)||60}; touchCatalog(); return; }
  if(cf && cf.dataset.cf==="cobros-alias"){ state.catalog.cobrosDocente={...cobrosDocenteFor(), alias:cf.value.trim()}; touchCatalog(); return; }
  if(cf && cf.dataset.cf==="cobros-linkmp"){
    const v=cf.value.trim();
    state.cobrosLinkMPError = v && !isHttpsUrl(v) ? "Tiene que ser un link que empiece con https://." : "";
    state.catalog.cobrosDocente={...cobrosDocenteFor(), linkMP:v}; touchCatalog(); return;
  }
  if(cf && cf.dataset.cf==="cobros-linkotro"){
    const v=cf.value.trim();
    state.cobrosLinkOtroError = v && !isHttpsUrl(v) ? "Tiene que ser un link que empiece con https://." : "";
    state.catalog.cobrosDocente={...cobrosDocenteFor(), linkOtro:v}; touchCatalog(); return;
  }
  if(cf && cf.dataset.cf && cf.dataset.cf.startsWith("mensaje-")){
    const key=cf.dataset.cf.slice("mensaje-".length);
    state.catalog.mensajes = {...mensajesFor(), [key]:cf.value};
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf && cf.dataset.cf.startsWith("propia-nombre-")){
    const id=cf.dataset.cf.slice("propia-nombre-".length);
    state.catalog.mensajesPropios=mensajesPropiasFor().map(p=>p.id===id?{...p,nombre:cf.value}:p);
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf && cf.dataset.cf.startsWith("propia-texto-")){
    const id=cf.dataset.cf.slice("propia-texto-".length);
    state.catalog.mensajesPropios=mensajesPropiasFor().map(p=>p.id===id?{...p,texto:cf.value}:p);
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf && cf.dataset.cf.startsWith("pack-cat-nombre-")){
    const id=cf.dataset.cf.slice("pack-cat-nombre-".length);
    state.catalog.packsCatalogo=packsCatalogoFor().map(p=>p.id===id?{...p,nombre:cf.value}:p);
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf && cf.dataset.cf.startsWith("pack-cat-cantidad-")){
    const id=cf.dataset.cf.slice("pack-cat-cantidad-".length);
    state.catalog.packsCatalogo=packsCatalogoFor().map(p=>p.id===id?{...p,cantidad:parseInt(cf.value,10)||1}:p);
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf && cf.dataset.cf.startsWith("pack-cat-precio-")){
    const id=cf.dataset.cf.slice("pack-cat-precio-".length);
    state.catalog.packsCatalogo=packsCatalogoFor().map(p=>p.id===id?{...p,precio:cf.value}:p);
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf && cf.dataset.cf.startsWith("pack-cat-vigencia-")){
    const id=cf.dataset.cf.slice("pack-cat-vigencia-".length);
    state.catalog.packsCatalogo=packsCatalogoFor().map(p=>p.id===id?{...p,vigenciaTexto:cf.value}:p);
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf==="portal-nombre"){ if(state.portal) state.portal.draftNombre=cf.value; return; }
  if(cf && cf.dataset.cf==="portal-preview-sel"){ state.portalPreviewSel=cf.value; state.portalPreviewOpen=false; render(); return; }
  if(cf && cf.dataset.cf==="rec-dias"){
    state.catalog.recordatorios = {...recordatoriosFor(), diasAtraso:Math.max(0, parseInt(cf.value,10)||0)};
    touchCatalog(); return;
  }
  if(cf && cf.dataset.cf==="stats-subject"){ state.statsSubjectId=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="compare-a"){ state.compareA=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="compare-b"){ state.compareB=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="pack-clases-cant"){ state.packClasesCant=parseInt(cf.value,10)||1; render(); return; }
  if(cf && cf.dataset.cf==="pagos-month"){ state.pagosMonth=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="pagos-export-period"){ state.pagosExportPeriod=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="session-ausente-motivo"){ state.sessionAusenteMotivo=cf.value; state.sessionAusenteCobra=null; render(); return; }
  if(cf && cf.dataset.cf==="tarifa-ajuste-modo"){ tarifaAjusteState().modo=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="tarifa-ajuste-valor"){ tarifaAjusteState().valor=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="tarifa-ajuste-redondeo"){ tarifaAjusteState().redondeo=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="renta-month"){ state.rentaMonth=cf.value; render(); return; }
  if(cf && cf.dataset.cf==="informe-period"){ state.informePeriod=cf.value; render(); return; }
  // Sugerencia de carrera al elegir materia en el alta de alumno nuevo (paso 129) — igual que en
  // la ficha, sólo si todavía no escribió una carrera a mano; acá se toca el input directo (sin
  // pasar por state) porque el modal todavía no tiene un alumno al que patchear.
  if(cf && cf.dataset.cf==="n-subject-pick"){
    const careerInput=document.getElementById("n-career");
    if(careerInput && !careerInput.value.trim()){
      const m=subjById(cf.value);
      if(m && m.careerIds && m.careerIds.length){
        const c=careerById(m.careerIds[0]);
        if(c) careerInput.value=c.nombre;
      }
    }
    return;
  }
  const lf=e.target.closest("[data-lf]");
  if(lf){
    if(lf.dataset.lf==="subject") state.listSubject=lf.value;
    else if(lf.dataset.lf==="career") state.listCareer=lf.value;
    else if(lf.dataset.lf==="sem") state.listSem=lf.value;
    else if(lf.dataset.lf==="deuda") state.listDeuda=lf.value;
    else if(lf.dataset.lf==="sort") state.listSort=lf.value;
    else if(lf.dataset.lf==="tag") state.listTag=lf.value;
    render(); return;
  }
  const el=e.target.closest("[data-f]"); if(!el) return;
  const s=sel(); if(!s) return;
  // Campos de "datos" de la ficha (Resumen/Pagos, paso 136): en vez de guardar al toque, quedan
  // en un borrador (state.fichaDraft) hasta confirmarlos con "Guardar cambios" — ver
  // applyFichaDraftField/draftFor en helpers.js y la barra fija en vDetalle (views-ficha.js). El resto
  // de los data-f de la app sigue con el autosave de siempre, más abajo.
  if(FICHA_DRAFT_FIELDS.has(el.dataset.f)){ applyFichaDraftField(s, el.dataset.f, el.value); return; }
  update(s.id,{[el.dataset.f]:el.value});
}

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

/* ============ historial del navegador (paso 124) ============
   Hasta acá la app nunca tocaba la History API (salvo el replaceState puntual de
   parseRecoveryHash más abajo) — "atrás" sacaba de la app derecho a la landing. Cada cambio de
   vista principal (o de overlay a pantalla completa: alta de alumno, buscador, elegir alumno
   del FAB, QR) pasa a sumar una entrada de history con un state chico y serializable
   ({v, id, rid, m, mx}): no hace falta guardar más que eso porque applyNavSnapshot() reconstruye
   el resto llamando a las mismas piezas de state que ya arma cualquier navegación normal.
   syncHistory() se llama desde render() (views-core.js) en vez de desde cada acción: como CUALQUIER
   cambio de vista termina pasando por render(), ese es el único lugar que hace falta tocar para
   cubrir los ~40 sitios que hoy mutan state.view/selId directamente sin pasar por una función
   común de navegación.
   El login y la recuperación de contraseña quedan afuera a propósito (ver los guards de
   state.recovery/getSes() más abajo): antes de haber sesión nunca se pushea nada, así que
   "atrás" ahí se comporta como en cualquier página sin JS de por medio. */
const NAV_VIEWS = ["tablero","lista","detalle","cuenta","panel","catalog","stats","pagos","agenda","informe","contrato","recibo","agenda-imprimir"];

function activeOverlayName(){
  if(state.showNew) return "new";
  if(state.searchOpen) return "search";
  if(state.fabPick) return "fabPick";
  if(state.qrOverlay) return "qr";
  if(state.envioOverlay) return "envio";
  if(state.shareOverlay) return "share";
  if(state.agendaEdit) return "agendaEdit";
  if(state.feedbackOpen) return "feedback";
  return null;
}
function navSnapshot(){
  const m = activeOverlayName();
  let mx = null;
  if(m==="fabPick") mx = {target: state.fabPick.target||"resumen"};
  else if(m==="qr") mx = {url: state.qrOverlay.url, title: state.qrOverlay.title||""};
  else if(m==="share") mx = {kind: state.shareOverlay.kind, id: state.shareOverlay.id};
  else if(m==="envio") mx = {materiaId: state.envioOverlay.materiaId};
  else if(m==="agendaEdit") mx = {...state.agendaEdit};
  return {
    v: state.view,
    id: state.selId || null,
    rid: state.view==="recibo" ? (state.reciboId||null) : null,
    m, mx,
  };
}
function navSnapshotsEqual(a,b){
  if(!a || !b) return a===b;
  return a.v===b.v && a.id===b.id && a.rid===b.rid && a.m===b.m && JSON.stringify(a.mx||null)===JSON.stringify(b.mx||null);
}
function urlForNavSnapshot(snap){
  let hash = "v="+encodeURIComponent(snap.v||"tablero");
  if(snap.id) hash += "&id="+encodeURIComponent(snap.id);
  if(snap.rid) hash += "&rid="+encodeURIComponent(snap.rid);
  return location.pathname+location.search+"#"+hash;
}
// Reconstruye state a partir de una entrada de history (o del hash inicial, ver parseNavHash) —
// usado tanto al restaurar con atrás/adelante como al recargar con F5.
function applyNavSnapshot(snap){
  state.view = NAV_VIEWS.includes(snap.v) ? snap.v : "tablero";
  state.selId = snap.id || null;
  if(state.view==="recibo") state.reciboId = snap.rid || null;
  state.showNew = snap.m==="new";
  state.searchOpen = snap.m==="search";
  state.fabPick = snap.m==="fabPick" ? (snap.mx || {target:"resumen"}) : null;
  state.qrOverlay = snap.m==="qr" ? snap.mx : null;
  state.shareOverlay = snap.m==="share" ? {...snap.mx, busy:false} : null;
  if(state.shareOverlay && !state.portalLoaded) loadPortal();
  state.envioOverlay = snap.m==="envio" ? snap.mx : null;
  if(state.envioOverlay && !state.portalLoaded) loadPortal();
  state.agendaEdit = snap.m==="agendaEdit" ? snap.mx : null;
  state.agendaEditPending=null; state.agendaEditCancelConfirm=false; state.agendaEditDeleteConfirm=false;
  state.feedbackOpen = snap.m==="feedback";
  if((state.view==="detalle"||state.view==="informe"||state.view==="contrato") && !sel()){
    state.view="tablero"; state.selId=null;
  }
  if(state.view==="recibo" && (!sel() || !reciboFor(sel(), state.reciboId))){
    state.view="tablero"; state.selId=null; state.reciboId=null;
  }
}
// #v=<vista>&id=<alumno>&rid=<recibo>, puesto por urlForNavSnapshot — se lee sólo al arrancar,
// para que F5 recargue en la misma vista (ver "arranque" más abajo). Nunca colisiona con el hash
// de recuperación de contraseña (#access_token=...&type=recovery, ver parseRecoveryHash en
// auth.js): éste se revisa primero y, si está presente, gana siempre.
function parseNavHash(){
  if(!location.hash || !location.hash.startsWith("#v=")) return null;
  const p = new URLSearchParams(location.hash.slice(1));
  const v = p.get("v");
  if(!NAV_VIEWS.includes(v)) return null;
  return {v, id:p.get("id")||null, rid:p.get("rid")||null, m:null, mx:null};
}

let _navSnapshot = null; // último snapshot ya reflejado en el history real del navegador
let _restoringNav = false; // true mientras se aplica un snapshot por popstate — evita re-pushearlo

function syncHistory(){
  if(_restoringNav) return;
  if(state.recovery || (!getSes() && !IS_DEMO)) return; // sin sesión no se toca el history
  const snap = navSnapshot();
  if(navSnapshotsEqual(snap, _navSnapshot)) return;
  const url = urlForNavSnapshot(snap);
  // La primera vista tras el login reemplaza la entrada ya existente (para que "atrás" desde
  // ahí salga de la app en vez de volver a un estado intermedio nuestro); cerrar un modal/overlay
  // (m!=null en el snapshot anterior) también reemplaza en vez de apilar, para no dejar una
  // entrada fantasma que reabra ese modal si después se navega para otro lado.
  if(_navSnapshot===null || _navSnapshot.m){
    history.replaceState(snap, "", url);
  } else {
    history.pushState(snap, "", url);
  }
  _navSnapshot = snap;
}

window.addEventListener("popstate", (e)=>{
  if(state.recovery || (!getSes() && !IS_DEMO)) return;
  const snap = (e.state && e.state.v) ? e.state : {v:"tablero", id:null, rid:null, m:null, mx:null};
  // Paso 136: mismo guard que en el click handler, para el botón "atrás" del navegador — el
  // history ya se movió (no se puede "cancelar" un popstate), así que si el profesor no confirma
  // salir se vuelve a apilar el estado actual para neutralizarlo.
  if(state.fichaDraft && fichaDraftFieldCount()>0 && snap.id!==state.fichaDraft.id){
    if(!confirm("Tenés cambios sin guardar en la ficha. ¿Salir sin guardar?")){
      history.pushState(_navSnapshot, "", urlForNavSnapshot(_navSnapshot));
      return;
    }
    state.fichaDraft=null; state.fichaError="";
  }
  _restoringNav = true;
  applyNavSnapshot(snap);
  _navSnapshot = snap;
  render();
  _restoringNav = false;
});

/* ============ errores silenciosos (paso 147) ============
   Enganchados antes que nada del arranque para no perderse errores tempranos. logClientError()
   (sync.js) hace todo el trabajo (rate-limit, sesión, modo demo); acá sólo se extrae mensaje/stack
   de cada tipo de evento, con su propio try/catch por si el navegador manda algo inesperado en
   `e.error`/`e.reason`. */
window.addEventListener("error", function(e){
  try{ logClientError(e.message, e.error && e.error.stack); }catch(err){}
});
window.addEventListener("unhandledrejection", function(e){
  try{
    const r = e.reason;
    logClientError(r && r.message ? r.message : String(r), r && r.stack);
  }catch(err){}
});

/* ============ arranque ============ */
const _recovery = parseRecoveryHash();
if(_recovery){ state.recovery=_recovery; history.replaceState(null,"",location.pathname+location.search); }
load(); // antes de aplicar el hash de vista: applyNavSnapshot() valida con sel() (necesita
         // state.students ya cargado — en modo demo load() además regenera los ids, así que
         // validar contra el estado default de antes de cargar siempre fallaba y mandaba a tablero
if(!_recovery){
  const _navRestore = parseNavHash();
  if(_navRestore) applyNavSnapshot(_navRestore);
}
render();
syncNow();
checkForNewVersion();
checkTauriUpdate();
maybeNotifyCobros();
checkRachaDiaria();

/* PWA: registrar el service worker cuando la app está publicada (no en file://
   ni dentro de un contenedor nativo como Tauri o Capacitor, que ya resuelven
   los archivos locales sin necesidad de cache de service worker) */
if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !IS_NATIVE) {
  if(typeof IS_LOCALHOST!=="undefined" && IS_LOCALHOST){
    // Paso 193: en localhost (desarrollo contra dev) nunca se registra el SW — y si ya había uno
    // de una visita anterior a este mismo puerto, se desregistra — para ver siempre el código
    // fresco sin pelear con la caché agresiva pensada para producción.
    navigator.serviceWorker.getRegistrations().then(regs=>{
      regs.forEach(r=>r.unregister());
    }).catch(()=>{});
  } else {
    navigator.serviceWorker.register("sw.js").then(reg=>{
      watchSwRegistration(reg);
      // Además del chequeo automático del navegador (poco frecuente y no garantizado),
      // se pide explícitamente cada SW_UPDATE_CHECK_INTERVAL_MS y cada vez que se vuelve
      // a la pestaña — para que una versión nueva no tarde en avisar.
      setInterval(()=>reg.update().catch(()=>{}), SW_UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener("visibilitychange", ()=>{
        if(document.visibilityState==="visible") reg.update().catch(()=>{});
      });
    }).catch(()=>{});
    navigator.serviceWorker.addEventListener("controllerchange", ()=>{
      if(_swReloading) return;
      _swReloading = true;
      location.reload();
    });
  }
}
