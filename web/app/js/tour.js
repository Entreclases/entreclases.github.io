"use strict";
/* ============ tour guiado (paso 204) ============
   Recorrido de 9 pasos para una cuenta recién aprobada que entra con el cuaderno vacío —
   "aprender haciendo": los pasos clave (alumno/materia/agenda/clase/cobro/portal) NO tienen
   botón "Siguiente", esperan a que el usuario haga la acción real de verdad (step.wait, se
   revisa en cada render — ver renderTourOverlay más abajo) y sólo ofrecen "Saltar este paso"
   como alternativa; los informativos (bienvenida/estadísticas/ayuda) sólo tienen "Siguiente".
   "Omitir todo" está SIEMPRE visible — nunca hay una salida escondida.

   Progreso: sólo dos campos viven en catalog (sincronizados, mismo criterio que
   onboardingDismissed en helpers.js): catalog.tourStep (null = nunca arrancó; número = paso
   actual) y catalog.tourDismissed (terminó o se omitió del todo). state.tourActive es
   puramente de sesión — arranca en false en cada carga, así que si se cierra la app a mitad
   de camino, al volver se ofrece "retomar" en vez de reabrir solo el overlay (ver
   vTourResumeBanner, tablero).

   Selectores de los pasos "clave": se apunta directo al data-a/data-f real que ya usa la app
   (nada de un data-tour aparte que mantener) — si ese botón no está en pantalla todavía
   (ej.: el paso de agenda antes de elegir un día), el overlay cae solo a una tarjeta centrada
   con el mismo texto en vez de trabarse. */
const TOUR_STEPS = [
  {id:"bienvenida", title:"¡Bienvenido a Entreclases!",
    text:"Te mostramos lo esencial en unos pasos cortos, haciendo cada cosa sobre la marcha. Podés omitir cuando quieras."},
  {id:"alumno", title:"Registrá tu primer estudiante",
    text:"Cargá el nombre y, un poco más abajo, la tarifa y el modo de cobro (por clase/hora/mensual) — la vas a necesitar en el paso de cobro.",
    navView:"tablero", target:"[data-a=\"new\"]",
    wait:()=>alive().some(s=>!s.sample)},
  {id:"materia", title:"Armá tu primera materia",
    text:"Escribí un nombre en el cuadro y tocá «+ Agregar materia» (o Enter) — después sumale un par de unidades.",
    navView:"catalog", target:["#new-subject","[data-a=\"cat-add-subject\"]"],
    wait:()=>state.catalog.subjects.some(m=>m.id!=="materia-ejemplo")},
  {id:"agenda", title:"Agendá una clase",
    text:"Elegí un día en el calendario, tocá «Programar clase acá» y guardá.",
    navView:"agenda", agendaMonth:true, target:"[data-a=\"agenda-quick-open\"], [data-a=\"agenda-quick-add\"]",
    wait:()=>alive().some(s=>!s.sample && (((s.horarios||[]).length)||((s.clasesPuntuales||[]).length)))},
  {id:"clase", title:"Registrá una clase dada",
    text:"Elegí «Clase pasada» y guardá — el cobro pendiente se genera solo, sin cargar nada aparte.",
    navView:"detalle", tab:"clases", selectRealStudent:true, target:"[data-a=\"save-session\"]",
    wait:()=>alive().some(s=>!s.sample && (s.sessions||[]).length>0)},
  {id:"cobro", title:"Marcá un cobro pagado",
    text:"En la pestaña «Pagos» de la ficha, tocá «Pendiente» junto a la clase para marcarla cobrada.",
    navView:"detalle", tab:"pagos", selectRealStudent:true, target:"[data-a=\"toggle-cobrada\"]",
    wait:()=>alive().some(s=>!s.sample && (s.sessions||[]).some(x=>x.cobrada))},
  {id:"portal", title:"Activá tu portal",
    text:"Generá tu llave y compartila — tus alumnos ven su avance sin necesitar usuario ni contraseña.",
    navView:"cuenta", group:"portal", loadPortal:true, target:"[data-a=\"portal-toggle\"][data-f=\"si\"]",
    wait:()=>!!(state.portal && state.portal.habilitado)},
  {id:"stats", title:"Estadísticas: el aula que se llena",
    text:"Acá ves de un vistazo cómo viene todo el grupo — avance, exámenes, asistencia.",
    navView:"stats", target:"[data-a=\"nav-stats\"]"},
  {id:"ayuda", title:"¿Necesitás una mano?",
    text:"En Cuenta → Ayuda tenés preguntas frecuentes, este botón de Sugerencias y podés repetir esta guía cuando quieras.",
    navView:"cuenta", group:"aplicacion", target:"[data-a=\"sugerencias-open\"]", last:true},
];

// Arranca sola una única vez: cuenta recién aprobada (ya pasó el gate de vCuentaEnRevision),
// sin sesión demo y con el cuaderno realmente vacío (ver alive() en helpers.js — sample no
// cuenta). catalog.tourStep!=null cubre tanto "ya la completó" como "la omitió" como "la tiene
// en curso" — en los tres casos no hay que auto-arrancarla de nuevo.
function checkTourAutoStart(){
  if(IS_DEMO || state.tourActive) return;
  if(state.catalog.tourStep!=null || state.catalog.tourDismissed) return;
  if(alive().some(s=>!s.sample)) return;
  state.catalog.tourStep=0; state.catalog.updatedAt=Date.now(); save();
  state.tourActive=true;
}

function enterTourStep(idx){
  const step=TOUR_STEPS[idx];
  if(!step){ tourFinish(); return; }
  state.catalog.tourStep=idx; state.catalog.updatedAt=Date.now(); save();
  if(step.navView) state.view=step.navView;
  if(step.tab) state.tab=step.tab;
  if(step.group) state.cuentaOpenGroupId=step.group;
  if(step.agendaMonth) state.agendaViewMode="mes";
  if(step.selectRealStudent){
    // El más reciente (por updatedAt), no el primero del array (paso 204, fix): si ya había
    // alumnos reales de pruebas anteriores del tour, ".find()" caía siempre en el más viejo —
    // acá importa el que se acaba de crear/tocar AHORA, en esta pasada.
    const reales=alive().filter(s=>!s.sample);
    const st=[...reales].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
    if(st) state.selId=st.id;
  }
  if(step.loadPortal){ state.portalLoaded=false; state.portalError=""; loadPortal(); }
  render();
}

function tourAdvance(){ enterTourStep((state.catalog.tourStep||0)+1); }

function tourFinish(){
  state.catalog.tourDismissed=true; state.catalog.updatedAt=Date.now(); save();
  state.tourActive=false;
  fireConfetti();
  toast("¡Listo! Ya conocés lo esencial de Entreclases.", "ok"); // toast() ya llama a render()
}

function tourSkipAll(){
  state.catalog.tourDismissed=true; state.catalog.updatedAt=Date.now(); save();
  state.tourActive=false;
  render();
}

function tourResume(){ state.tourActive=true; render(); }

function tourDiscardResume(){
  state.catalog.tourDismissed=true; state.catalog.updatedAt=Date.now(); save();
  render();
}

// Relanzable desde Cuenta → Ayuda ("Ver la guía de nuevo", vCentroAyuda en views-cuenta.js).
function tourRestart(){
  state.catalog.tourStep=0; state.catalog.tourDismissed=false; state.catalog.updatedAt=Date.now(); save();
  state.tourActive=true;
  render();
}

// Tarjeta de "quedó a mitad" (tablero): sólo cuando NO está activa ahora pero hay un paso
// guardado sin terminar ni descartar — ver el comentario de arriba sobre por qué no se
// auto-retoma sola.
function vTourResumeBanner(){
  if(IS_DEMO || state.tourActive) return "";
  if(state.catalog.tourStep==null || state.catalog.tourDismissed) return "";
  return `<div class="formcard" style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap">
    <div style="font-size:13px;color:var(--muted)">Habías quedado a mitad de la guía interactiva — ¿la retomamos donde la dejaste?</div>
    <div style="display:flex;gap:8px;flex-shrink:0">
      <button class="chip" data-a="tour-discard-resume">Descartar</button>
      <button class="chip on" data-a="tour-resume">Retomar</button>
    </div>
  </div>`;
}

/* ============ overlay: spotlight + tarjeta ============
   Se reconstruye entero en cada render() (llamado al final, ver views-core.js) — barato,
   nada que diffear. Cuatro franjas oscuras alrededor del hueco (nunca lo tapan, así el
   elemento señalado sigue siendo clickeable de verdad) + un anillo de foco visual + la
   tarjeta con el texto. Si el target todavía no existe en el DOM (paso de agenda antes de
   elegir un día), cae a una franja única de pantalla completa con la tarjeta centrada. */
function removeTourOverlay(){
  const el=document.getElementById("tour-overlay");
  if(el) el.remove();
}

// Cualquier modal/overlay propio de la app (paso 132/77/141/147/…) se pinta con z-index 50
// (ver .overlay en styles.css), bien por debajo del tour (9990) — sin este chequeo, el mask
// del tour quedaba ENCIMA del modal de "Nuevo estudiante" y lo volvía inusable (sólo
// "Saltar"/"Omitir" respondían, ni un campo del formulario). Mientras alguno de éstos esté
// abierto, el tour se hace a un lado del todo (ni mask ni tarjeta) y vuelve a aparecer solo
// en el próximo render una vez que el usuario lo cierra (completando la acción o cancelando).
function tourBlockingOverlayOpen(){
  return !!(state.showNew || state.searchOpen || state.fabPick || state.qrOverlay ||
    state.shareOverlay || state.envioOverlay || state.feedbackOpen || state.agendaEdit ||
    state.agendaEditGrupal || state.agendaHourList || state.agendaSolicitudOpen ||
    state.grupalForm || state.finCuatrimestreOpen);
}

function renderTourOverlay(){
  removeTourOverlay();
  if(!state.tourActive) return;
  if(tourBlockingOverlayOpen()) return;
  const idx=state.catalog.tourStep||0;
  const step=TOUR_STEPS[idx];
  if(!step){ tourFinish(); return; }
  if(step.wait && step.wait()){ tourAdvance(); return; }

  // step.target puede ser un selector (un solo elemento) o un array de selectores — en ese
  // caso el hueco es la UNIÓN de todos los que existan ahora (paso 204, fix): el paso
  // "materia" necesita el input Y el botón resaltados juntos, si no el input queda tapado
  // por el mask y no se puede escribir nada ahí (el bug reportado).
  const targetSelectors = Array.isArray(step.target) ? step.target : (step.target ? [step.target] : []);
  const rects = targetSelectors.map(sel=>{
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect() : null;
  }).filter(r=>r && r.width>0 && r.height>0);
  const rect = rects.length ? rects.reduce((u,r)=>({
    left:Math.min(u.left,r.left), top:Math.min(u.top,r.top),
    right:Math.max(u.right,r.right), bottom:Math.max(u.bottom,r.bottom),
  }), {left:rects[0].left, top:rects[0].top, right:rects[0].right, bottom:rects[0].bottom}) : null;
  if(rect){ rect.width=rect.right-rect.left; rect.height=rect.bottom-rect.top; }
  const vw=window.innerWidth, vh=window.innerHeight;
  const reduced = (typeof prefersReducedMotion==="function") && prefersReducedMotion();

  // Sin target definido (sólo el paso de bienvenida) → tarjeta centrada con mask completo,
  // es un modal de verdad, no hay nada de la app detrás para tapar. Con target definido pero
  // que TODAVÍA no está en el DOM (agenda antes de elegir un día, clase antes de "Clase
  // pasada"…) → NADA de mask: el paso está esperando que el usuario llegue ahí interactuando
  // con la página real, así que taparla entera sería el mismo bug que el de los modales
  // (ver tourBlockingOverlayOpen) — sólo la tarjeta, sin bloquear un solo píxel de atrás.
  const noTargetDefined = !step.target;
  let masksHtml, blocking;
  if(rect && rect.width>0 && rect.height>0){
    blocking=true;
    const pad=6;
    const x1=Math.max(0,rect.left-pad), y1=Math.max(0,rect.top-pad);
    const x2=Math.min(vw,rect.right+pad), y2=Math.min(vh,rect.bottom+pad);
    masksHtml = `<div class="tour-mask" style="top:0;left:0;width:100%;height:${y1}px"></div>
      <div class="tour-mask" style="top:${y2}px;left:0;width:100%;height:${Math.max(0,vh-y2)}px"></div>
      <div class="tour-mask" style="top:${y1}px;left:0;width:${x1}px;height:${Math.max(0,y2-y1)}px"></div>
      <div class="tour-mask" style="top:${y1}px;left:${x2}px;width:${Math.max(0,vw-x2)}px;height:${Math.max(0,y2-y1)}px"></div>
      <div class="tour-ring${reduced?"":" tour-ring-pulse"}" style="top:${y1}px;left:${x1}px;width:${x2-x1}px;height:${y2-y1}px"></div>`;
  } else if(noTargetDefined){
    blocking=true;
    masksHtml = `<div class="tour-mask" style="top:0;left:0;width:100%;height:100%"></div>`;
  } else {
    blocking=false;
    masksHtml = "";
  }

  const total=TOUR_STEPS.length, isLast = idx===total-1;
  const canSkipStep = !!step.wait;
  const el=document.createElement("div");
  el.id="tour-overlay"; el.className="tour-overlay no-print";
  el.setAttribute("role","dialog"); el.setAttribute("aria-modal", blocking?"true":"false");
  el.innerHTML = `${masksHtml}
    <div class="tour-card" id="tour-card">
      <div class="tour-progress">Paso ${idx+1} de ${total}</div>
      <div class="tour-title">${esc(step.title)}</div>
      <div class="tour-text">${esc(step.text)}</div>
      <div class="tour-actions">
        <button class="chip" data-a="tour-skip-all">Omitir todo</button>
        ${canSkipStep
          ? `<button class="chip" data-a="tour-skip-step">Saltar este paso</button>`
          : `<button class="btn btn-primary" data-a="tour-next">${isLast?"Terminar":"Siguiente"}</button>`}
      </div>
    </div>`;
  document.body.appendChild(el);
  positionTourCard(rect && rect.width>0 && rect.height>0 ? rect : null, noTargetDefined);
}

// centered=true sólo para el paso de bienvenida (sin target, tarjeta de modal centrada). Sin
// target encontrado pero CON target definido (esperando a que el usuario llegue ahí) va a una
// esquina en vez del centro — no hay mask acá (ver renderTourOverlay), así que el centro de la
// pantalla suele ser justo lo que el usuario necesita tocar (ej.: el calendario de la agenda).
function positionTourCard(rect, centered){
  const card=document.getElementById("tour-card"); if(!card) return;
  const vw=window.innerWidth, vh=window.innerHeight;
  if(!rect && centered){
    card.style.top="50%"; card.style.left="50%"; card.style.transform="translate(-50%,-50%)";
    card.style.width=Math.min(360,vw-24)+"px";
    return;
  }
  if(!rect){
    card.style.width=Math.min(320,vw-24)+"px";
    card.style.right="12px"; card.style.bottom="calc(12px + env(safe-area-inset-bottom))";
    return;
  }
  const cw=Math.min(320,vw-24);
  card.style.width=cw+"px";
  card.style.left=Math.min(Math.max(rect.left,12),vw-cw-12)+"px";
  const spaceBelow=vh-rect.bottom, spaceAbove=rect.top;
  if(spaceBelow>=140 || spaceBelow>=spaceAbove) card.style.top=Math.min(rect.bottom+14,vh-40)+"px";
  else card.style.bottom=Math.max(vh-rect.top+14,12)+"px";
  requestAnimationFrame(()=>{
    const cr=card.getBoundingClientRect();
    if(cr.bottom>vh-8){ card.style.top=""; card.style.bottom="8px"; }
    if(cr.top<8){ card.style.bottom=""; card.style.top="8px"; }
  });
}

// Reposiciona sin reconstruir todo el estado del paso (resize/scroll) — mismo costo que un
// render del overlay, no vale la pena optimizar más para un elemento tan chico.
let _tourRepoQueued=false;
function scheduleTourReposition(){
  if(!state.tourActive || _tourRepoQueued) return;
  _tourRepoQueued=true;
  requestAnimationFrame(()=>{ _tourRepoQueued=false; renderTourOverlay(); });
}
window.addEventListener("resize", scheduleTourReposition);
window.addEventListener("scroll", scheduleTourReposition, true);
