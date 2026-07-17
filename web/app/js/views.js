"use strict";
/* ============ piezas de presentación reutilizables ============ */
const semDot = (v,size,btn) => {
  const m=SEM_META[v||"sd"];
  const dot=`<span class="sem" title="${esc(m.label)}" style="width:${size}px;height:${size}px;background:${m.color}"></span>`;
  return btn ? `<button class="sembtn" data-a="cycle-sem" title="${esc(m.label)} — tocá para cambiar" aria-label="Semáforo: ${esc(m.label)}. Tocá para cambiar de estado">${dot}</button>` : dot;
};
const pill = (st) => { const m=STATUS_META[st];
  return `<span class="pill" style="color:${m.fg};background:${m.bg}">${m.label}</span>`; };
const tabbtn = (a,on,label) => `<button class="tabbtn ${on?"on":""}" data-a="${a}">${label}</button>`;
const examplePill = (s) => s.sample ? `<span class="pill" style="color:var(--status-aprobo-fg);background:var(--bluebg)">Ejemplo</span>` : "";

/* ============ título de sección (eyebrow + h2 + acción principal opcional), reusado en cada
   vista de la app para dar jerarquía visual consistente ============ */
const pageHead = (eyebrow,title,actionHtml) =>
  `<div class="pagehead"><div><div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2></div>${
    actionHtml?`<div class="pagehead-action">${actionHtml}</div>`:""}</div>`;

/* ============ navegación persistente (sidebar en escritorio / barra inferior en mobile) ============
   Íconos SVG inline, mismo estilo trazo que la landing (web/index.html). El check del logo
   reusa exactamente el mark de la identidad de marca (ver .logo-mark en styles.css). */
const ICON_CHECK=`<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`;
const ICON_HOME=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`;
const ICON_USERS=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.3c2.6.5 4.5 2.6 4.5 5.7"/></svg>`;
const ICON_CALENDAR=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>`;
const ICON_WALLET=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19"/><circle cx="17" cy="14.5" r="1.3"/></svg>`;
const ICON_BOOK=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4 5 3 7 3h6v16H7c-2 0-3 1-3 2.5z"/><path d="M20 5.5C20 4 19 3 17 3h-4v16h4c2 0 3 1 3 2.5z"/></svg>`;
const ICON_CHART=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M11 20V4M18 20v-7"/></svg>`;
const ICON_ACCOUNT=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c0-4 3.5-7 7.5-7s7.5 3 7.5 7"/></svg>`;
const ICON_SHIELD=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>`;
const ICON_SEARCH=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
const ICON_CHEVRON=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
const ICON_LOGOUT=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`;
/* ============ iconografía unificada (paso 73): mismo set de línea (viewBox 24, stroke-width 2,
   stroke-linecap/linejoin round) para todo lo que antes era un emoji suelto — WhatsApp, objetivo
   de clase, racha, superposición de horario y los tres resultados de objetivo (sí/a medias/no).
   Documentado acá para reusar en vez de tipear un emoji nuevo si hace falta un ícono más. */
const ICON_CHAT=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.9 8.9 0 0 1-3.1-.5L3 21l1.6-4.2A8.3 8.3 0 0 1 3.5 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/></svg>`;
const ICON_TARGET=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>`;
const ICON_FLAME=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4.5 0 7-2.7 7-6.5C19 11 15.5 9 15 5c-1.8 2-2.5 3.7-2.5 5.5C10 9 9.5 6 10 3c-3 2-5 6-5 9.5C5 17.5 7.5 22 12 22z"/></svg>`;
const ICON_WARNING=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v4"/><path d="M12 17.5v.1"/></svg>`;
const ICON_HALF=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/></svg>`;
const ICON_X=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;
const ICON_WAVE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V6a1.8 1.8 0 0 1 3.6 0v5"/><path d="M11.6 11V4.6a1.8 1.8 0 0 1 3.6 0V11"/><path d="M15.2 11V6.4a1.8 1.8 0 0 1 3.6 0V15c0 4-2.5 7-6.8 7-3 0-4.6-1-6-2.7L3 15.4c-.6-.9-.4-2 .5-2.6.8-.5 1.8-.3 2.4.4L8 15.5"/></svg>`;
const OBJETIVO_ICONS = {si:ICON_CHECK.replace('stroke="white"','stroke="currentColor"'), medias:ICON_HALF, no:ICON_X};
const THEME_NAV_ICONS = {
  system:`<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>`,
  light:`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  dark:`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>`,
};
const THEME_NAV_LABELS = {system:"Automático",light:"Claro",dark:"Oscuro"};
const NAV_ITEMS = [
  {view:"tablero", action:"nav-tablero", label:"Tablero", icon:ICON_HOME},
  {view:"lista", altViews:["detalle"], action:"nav-lista", label:"Estudiantes", icon:ICON_USERS},
  {view:"agenda", action:"nav-agenda", label:"Agenda", icon:ICON_CALENDAR},
  {view:"pagos", action:"nav-pagos", label:"Pagos", icon:ICON_WALLET},
  {view:"catalog", action:"nav-catalog", label:"Materias", icon:ICON_BOOK},
  {view:"stats", action:"nav-stats", label:"Estadísticas", icon:ICON_CHART},
  {view:"cuenta", action:"nav-cuenta", label:"Cuenta", icon:ICON_ACCOUNT},
];
function themeNavBtn(){
  const cur = getTheme();
  const order = ["system","light","dark"];
  const next = order[(order.indexOf(cur)+1)%order.length];
  return `<button class="navitem" data-a="set-theme" data-f="${next}"
    title="Tema: ${THEME_NAV_LABELS[cur]} — tocá para cambiar">${THEME_NAV_ICONS[cur]}<span class="navitem-label">Tema</span></button>`;
}
function logoutNavBtn(){
  return `<button class="navitem" data-a="nav-logout" title="Cerrar sesión">${ICON_LOGOUT}<span class="navitem-label">Salir</span></button>`;
}
function navShell(isAdmin){
  const items = isAdmin ? [...NAV_ITEMS,{view:"panel",action:"nav-panel",label:"Panel",icon:ICON_SHIELD}] : NAV_ITEMS;
  const isOn = (it) => state.view===it.view || (it.altViews||[]).includes(state.view);
  const itemsHtml = items.map(it=>
    `<button class="navitem ${isOn(it)?"on":""}" data-a="${it.action}">${it.icon}<span class="navitem-label">${esc(it.label)}</span></button>`
  ).join("");
  return `<nav class="appnav no-print">
    <button class="appnav-brand" data-a="nav-tablero" aria-label="Ir al tablero"><span class="logo-mark">${ICON_CHECK}</span>Entreclases</button>
    <button class="navitem navitem-search" data-a="open-search" title="Buscar (atajo: /)">${ICON_SEARCH}<span class="navitem-label">Buscar</span></button>
    <div class="appnav-list">${itemsHtml}</div>
    <div class="appnav-foot">${syncChip()}${themeNavBtn()}${logoutNavBtn()}</div>
  </nav>`;
}

/* ============ FAB de acciones rápidas (paso 77): botón flotante siempre visible con lo más
   repetitivo — nuevo alumno, nueva clase, registrar pago — para no tener que navegar hasta la
   ficha primero. Precarga contexto cuando puede (ver fab-new-clase/fab-new-pago en events.js). */
const ICON_PLUS=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`;
const FAB_ACTIONS = [
  {action:"fab-new-pago", label:"Registrar pago", icon:ICON_WALLET},
  {action:"fab-new-clase", label:"Nueva clase", icon:ICON_CALENDAR},
  {action:"fab-new-student", label:"Nuevo alumno", icon:ICON_USERS},
];
function fabHtml(){
  const open = state.fabOpen;
  return `<div class="fab-wrap no-print">
    ${open ? `<div class="fab-menu">${FAB_ACTIONS.map(a=>
      `<button class="fab-menu-item" data-a="${a.action}">${a.icon}${esc(a.label)}</button>`
    ).join("")}</div>` : ""}
    <button class="fab-main ${open?"open":""}" data-a="fab-toggle" aria-label="${open?"Cerrar acciones rápidas":"Acciones rápidas"}" aria-expanded="${open}">${ICON_PLUS}</button>
  </div>`;
}
// Overlay para elegir a qué alumno aplica la acción rápida, cuando no hay uno ya en pantalla
// (ver fab-pick-student en events.js) — lista simple de alumnos activos, sin buscador (para eso
// ya está "/").
function vFabPickOverlay(){
  const list = alive();
  return `<div class="overlay" data-a="fab-pick-close">
    <div class="modal" data-a="search-modal-noop" style="max-width:420px">
      <div class="ftitle" style="font-size:16px">¿Para quién?</div>
      <div class="search-results" style="max-height:52vh">
        ${list.length ? list.map(s=>`<div class="row" style="cursor:pointer" data-a="fab-pick-student" data-id="${s.id}">
          <div class="main"><b>${esc(s.name)}</b><div class="sub">${esc(s.subject||"materia s/d")}</div></div>
        </div>`).join("") : emptyState(ICON_USERS,"Sin alumnos todavía","Creá el primero con «Nuevo alumno».")}
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:10px">
        <button class="chip" data-a="fab-pick-close">Cancelar</button>
      </div>
    </div>
  </div>`;
}

// QR del portal (paso 84): se genera al toque con la librería vendorizada en js/qrcode.js (sin
// CDN en runtime — ver la CSP en index.html), en grande para que lo escaneen en clase. Mismo
// patrón de overlay/modal que vFabPickOverlay — click afuera cierra, click adentro no propaga.
function vQrOverlay(){
  const o = state.qrOverlay; if(!o) return "";
  const qr = qrcode(0,"M");
  qr.addData(o.url);
  qr.make();
  const svg = qr.createSvgTag({cellSize:8, margin:16});
  return `<div class="overlay no-print" data-a="close-qr">
    <div class="modal qr-modal" data-a="qr-modal-noop" style="max-width:340px;text-align:center">
      <div class="ftitle" style="font-size:16px">${esc(o.title||"Código QR del portal")}</div>
      <div style="margin:14px auto;max-width:280px">${svg}</div>
      <div class="hint" style="word-break:break-all;margin-bottom:12px">${esc(o.url)}</div>
      <button class="chip" data-a="close-qr">Cerrar</button>
    </div>
  </div>`;
}

/* ============ chip de estado de datos: guardado/sincronizando/sin conexión/error, siempre
   visible en el nav. El id="syncStatus" en el span interno es a propósito: setStatus() (sync.js)
   ya lo pisa directo con innerHTML en cada tick de sync, sin pasar por un render() completo. */
function syncToneOf(){
  if(!getSes()) return "idle";
  const st=state.syncStatus;
  if(st==="sync") return "sync";
  if(st==="offline") return "offline";
  if(st==="error") return "error";
  if(st==="ok") return "ok";
  return "idle";
}
function syncChip(){
  return `<span class="statuschip statuschip-${syncToneOf()}" title="Estado de los datos">
    <span class="statuschip-dot"></span><span class="statuschip-label" id="syncStatus">${syncStatusText()}</span>
  </span>`;
}

/* ============ estado vacío con acción: ícono + frase + un botón claro para empezar,
   en vez de un espacio en blanco (reusado en las secciones sin datos de cada vista) ============ */
function emptyState(icon,title,text,actionHtml){
  return `<div class="empty-state">
    <div class="empty-state-icon">${icon}</div>
    <div class="empty-state-title">${esc(title)}</div>
    <div class="empty-state-text">${esc(text)}</div>
    ${actionHtml||""}
  </div>`;
}
/* ============ ayuda contextual (paso 74): iconito "?" junto a lo menos obvio (señas, política
   de cancelación, portal, rentabilidad) — un popover corto al tocarlo, se cierra solo con Escape
   o al tocar afuera (ver helpOpen en events.js). id es una key de HELP_TEXTS (config.js). ============ */
function helpTip(id){
  const open = state.helpOpen===id;
  return `<span class="help-tip-wrap">
    <button class="help-tip-btn" data-a="toggle-help" data-id="${id}" aria-label="Ayuda: ${esc(HELP_TEXTS[id]||"")}" aria-expanded="${open}">?</button>
    ${open?`<div class="help-tip-pop" role="tooltip">${esc(HELP_TEXTS[id]||"")}</div>`:""}
  </span>`;
}
const ICON_INBOX=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5.5 5h13l2.5 7v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7z"/></svg>`;
const ICON_LINK=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 15l6-6"/><path d="M11 6l1-1a4 4 0 0 1 6 6l-1 1"/><path d="M13 18l-1 1a4 4 0 0 1-6-6l1-1"/></svg>`;

/* ============ skeletons: placeholders con animación mientras carga/sincroniza una sección
   (reemplaza los "Cargando…" sueltos) ============ */
function skeletonRows(n){
  return Array.from({length:n||3}).map((_,i)=>
    `<div class="skel-card"><div class="skel skel-row ${i%2?"w60":"w80"}"></div><div class="skel skel-row w40" style="margin-bottom:0"></div></div>`
  ).join("");
}

/* ============ toasts: pila de confirmaciones breves, renderizada aparte del contenido
   principal para que sobreviva a cualquier re-render de la vista de abajo ============ */
function toastWrap(){
  if(!state.toasts.length) return "";
  return `<div class="toast-wrap no-print">${state.toasts.map(t=>
    `<div class="toast ${t.tone==="error"?"toast-error":""}"><span class="dot"></span>${esc(t.text)}
    ${t.undo?`<button class="toast-undo" data-a="toast-undo" data-id="${t.id}">Deshacer</button>`:""}
    ${t.action?`<button class="toast-undo" data-a="toast-action" data-id="${t.id}">${esc(t.action.label)}</button>`:""}</div>`
  ).join("")}</div>`;
}

/* ============ vistas ============ */
// Guía de primeros pasos (paso 74): checklist de 4 pasos que se tilda sola en base a datos
// reales (nunca se guarda el progreso aparte, se recalcula en cada render) — así no hay nada
// que migrar ni desincronizar entre dispositivos. Se muestra mientras la cuenta esté "vacía"
// (falta algún paso) y no se haya descartado a mano; se completa sola apenas se hacen los 4,
// sin necesidad de tocar "descartar".
const ONBOARDING_STEPS = [
  {label:"Creá tu primera materia", action:"nav-catalog",
    done:()=>state.catalog.subjects.some(m=>m.id!=="materia-ejemplo")},
  {label:"Agregá un alumno", action:"new",
    done:()=>alive().some(s=>!s.sample)},
  {label:"Registrá una clase", action:"nav-lista",
    done:()=>alive().some(s=>!s.sample && (s.sessions||[]).length>0)},
  {label:"Activá tu portal", action:"nav-cuenta",
    done:()=>!!(state.portal && state.portal.habilitado)},
];
function vTips(){
  if(tipsDismissed()) return "";
  const steps = ONBOARDING_STEPS.map(s=>({...s, ok:s.done()}));
  if(steps.every(s=>s.ok)) return "";
  return `<div class="formcard" style="display:flex;align-items:flex-start;gap:10px;justify-content:space-between">
    <div style="flex:1">
      <div class="ftitle" style="margin-bottom:8px">Primeros pasos</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${steps.map(s=>`<button class="tip-step ${s.ok?"done":""}" data-a="${s.action}">
          <span class="tip-step-check">${s.ok?ICON_CHECK.replace('stroke="white"','stroke="currentColor"'):""}</span>
          <span>${esc(s.label)}</span>
        </button>`).join("")}
      </div>
    </div>
    <button class="del" style="font-size:20px" data-a="dismiss-tips" title="Descartar" aria-label="Descartar">×</button>
  </div>`;
}
function vSimTimer(){
  const t = state.simTimer;
  if(!t){
    return `<div class="formcard">
      <div class="ftitle">Simulacro cronometrado</div>
      <div class="frow" style="align-items:flex-end">
        <div class="field" style="max-width:160px"><div class="flabel">Duración (minutos)</div>
          <input type="number" id="sim-timer-min" min="1" value="${state.simTimerLastMin||90}"></div>
        <button class="primary" style="margin-left:0" data-a="sim-timer-start">Iniciar simulacro cronometrado</button>
      </div>
    </div>`;
  }
  const done = t.remainingSec<=0;
  const mm = String(Math.floor(t.remainingSec/60)).padStart(2,"0");
  const ss = String(t.remainingSec%60).padStart(2,"0");
  return `<div class="formcard" style="text-align:center">
    <div class="ftitle">Simulacro cronometrado</div>
    <div style="font-family:var(--mono);font-size:56px;font-weight:700;margin:10px 0;color:${done?"var(--red)":"var(--ink)"}">${mm}:${ss}</div>
    ${done
      ? `<div style="color:var(--status-desaprobo-fg);font-weight:600;margin-bottom:10px">¡Tiempo cumplido!</div>`
      : `<div class="hint" style="margin-bottom:10px">${t.paused?"En pausa":"Corriendo…"}</div>`}
    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      ${!done?`<button class="chip" data-a="sim-timer-toggle">${t.paused?"Reanudar":"Pausar"}</button>`:""}
      <button class="danger" data-a="sim-timer-finish">Finalizar</button>
    </div>
  </div>`;
}
function vBackupReminder(){
  if(!shouldShowBackupReminder()) return "";
  return `<div class="formcard" style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap">
    <div style="font-size:13px;color:var(--muted)">Hace más de ${BACKUP_REMINDER_DAYS} días que no descargás una copia (.json) del cuaderno — es tu respaldo aparte de la sincronización.</div>
    <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
      <button class="chip" data-a="export">Descargar copia ahora</button>
      <button class="del" style="font-size:20px" data-a="dismiss-backup-reminder" title="Descartar" aria-label="Descartar">×</button>
    </div>
  </div>`;
}
/* ============ panel "Hoy": lo importante del día de un vistazo, arriba del tablero ============
   Tres bloques con la misma tarjeta (.ds-card.hoy-card): "Clases de hoy" (agenda del día,
   con botón registrar/ver), "Para cobrar" (reusa cobrosAtrasadosSummary/vCobrosBanner, el
   mismo recordatorio de cobro que antes vivía como banner suelto) y "Próximo" (exámenes
   cercanos + objetivos de clase sin cerrar + clases de mañana, mezclados por orden de bloque).
   Cada uno muestra su número grande arriba y un acceso directo abajo; sin datos, el estado
   vacío amable de emptyState() en vez de dejar la tarjeta en blanco. */
function hoyCard(title, num, body, action){
  // num puede ser un entero contable (paso 100, cuenta hasta su valor con countSpan()) o ya
  // venir formateado como texto (fecha, "Al día", "63%", "—" — ver vFichaResumenGlance): sólo
  // se envuelve en countSpan() cuando es realmente un número, si no se muestra tal cual.
  const numHtml = (typeof num==="number" && isFinite(num)) ? countSpan(num) : esc(String(num));
  return `<div class="ds-card hoy-card">
    <div class="hoy-card-head"><span class="ds-eyebrow">${esc(title)}</span><span class="hoy-num">${numHtml}</span></div>
    <div class="hoy-card-body">${body}</div>
    ${action?`<button class="btn btn-ghost btn-block hoy-card-action" data-a="${action.a}">${esc(action.label)}</button>`:""}
  </div>`;
}
function vHoyClasesHoy(){
  const events = agendaRangeEvents(today(), today()).sort((a,b)=>a.time.localeCompare(b.time));
  const body = events.length===0
    ? emptyState(ICON_CALENDAR, "Sin clases hoy", "No tenés clases agendadas para hoy.")
    : events.map(e=>{
        const done = studentHasSessionOnDate(e.studentId, today());
        return `<div class="hoy-row">
          <div class="hoy-row-main">
            <span class="hoy-row-time">${esc(e.time)}</span>
            ${e.subjectId?subjectDot(e.subjectId):""}
            <span class="hoy-row-name">${esc(e.studentName)}</span>
            ${e.subject?`<span class="hint">· ${esc(e.subject)}</span>`:""}
          </div>
          ${done ? `<span class="badge badge-green">Registrada</span>`
            : `<button class="chip" data-a="agenda-log" data-id="${e.studentId}" data-date="${today()}">Registrar</button>`}
        </div>`;
      }).join("");
  return hoyCard("Clases de hoy", events.length, body, {a:"nav-agenda", label:"Ver agenda completa"});
}
function vHoyCobrar(){
  const rec = recordatoriosFor();
  const sum = rec.activo ? cobrosAtrasadosSummary(rec.diasAtraso) : {count:0, total:0};
  let body;
  if(!rec.activo){
    body = emptyState(ICON_WALLET, "Recordatorios de cobro desactivados",
      "Activalos desde Materias → Recordatorios para ver acá lo pendiente.",
      `<button class="btn btn-secondary" data-a="nav-catalog">Ir a Materias</button>`);
  }else if(sum.count===0){
    body = emptyState(ICON_WALLET, "Todo cobrado", "No hay clases, mensualidades ni señas pendientes por ahora.");
  }else{
    body = `<div class="hoy-total">${fmtMoney(sum.total)}</div>` + vCobrosBanner();
  }
  return hoyCard("Para cobrar", sum.count, body, {a:"nav-pagos", label:"Ver en Pagos"});
}
function vHoyProximo(){
  const activos = alive().filter(s=>s.status==="activo");
  const exams = activos.filter(s=>s.examDate && daysTo(s.examDate)>=0 && daysTo(s.examDate)<=14)
    .sort((a,b)=>a.examDate.localeCompare(b.examDate)).slice(0,3);
  const goals = activos.map(s=>({s,c:pendingGoalClosure(s)})).filter(x=>x.c).slice(0,3);
  const tomorrow = addDays(today(),1);
  const manana = agendaRangeEvents(tomorrow,tomorrow).sort((a,b)=>a.time.localeCompare(b.time));
  const total = exams.length + goals.length + manana.length;
  let body;
  if(total===0){
    body = emptyState(ICON_CALENDAR, "Nada urgente a la vista",
      "Sin exámenes próximos, objetivos por cerrar ni clases agendadas para mañana.");
  }else{
    body = "";
    if(exams.length){
      body += `<div class="hoy-subhead">Exámenes próximos</div>` + exams.map(s=>{
        const d=daysTo(s.examDate);
        return `<button class="hoy-row hoy-row-click" data-a="open" data-id="${s.id}">
          <span class="hoy-row-name">${esc(s.name)}</span>
          <span class="badge ${d<=7?"badge-red":"badge-neutral"}">${d===0?"Hoy":d+"d"}</span>
        </button>`;
      }).join("");
    }
    if(goals.length){
      body += `<div class="hoy-subhead">Objetivos por cerrar</div>` + goals.map(({s,c})=>
        `<button class="hoy-row hoy-row-click" data-a="open" data-id="${s.id}">
          <span class="hoy-row-name">${esc(s.name)}</span>
          <span class="hint">${esc(c.objetivo)}</span>
        </button>`).join("");
    }
    if(manana.length){
      body += `<div class="hoy-subhead">Mañana</div>` + manana.map(e=>
        `<div class="hoy-row"><span class="hoy-row-time">${esc(e.time)}</span>${e.subjectId?subjectDot(e.subjectId):""}<span class="hoy-row-name">${esc(e.studentName)}</span></div>`
      ).join("");
    }
  }
  return hoyCard("Próximo", total, body, {a:"nav-agenda", label:"Ver agenda"});
}
function vTablero(){
  const activos = alive().filter(s=>s.status==="activo");
  const alerts = activos.flatMap(s=>studentAlerts(s).map(a=>({s,...a})));
  const upcoming = activos.filter(s=>s.examDate && daysTo(s.examDate)>=0)
                          .sort((a,b)=>a.examDate.localeCompare(b.examDate));
  const enRiesgo = new Set(alerts.map(a=>a.s.id)).size;
  let h = pageHead("Tablero","Hoy",`<button class="btn btn-primary" data-a="new">+ Nuevo estudiante</button>`);
  h += vTips();
  h += vBackupReminder();

  h += `<div class="hoy-grid">${vHoyClasesHoy()}${vHoyCobrar()}${vHoyProximo()}</div>`;

  h += `<div class="stats">
    <div class="stat"><b>${countSpan(activos.length)}</b><span>activos</span></div>
    <div class="stat"><b>${countSpan(upcoming.length)}</b><span>con examen a la vista</span></div>
    <div class="stat ${enRiesgo?"warn":""}"><b>${countSpan(enRiesgo)}</b><span>con alertas</span></div>
  </div>`;

  const examPrompts = pendingExamResults();
  if(examPrompts.length){
    h += `<div class="stitle">¿Cómo les fue?</div>`;
    h += examPrompts.map(vExamResultPrompt).join("");
  }

  h += `<div class="stitle">Alertas</div>`;
  h += alerts.length===0
    ? `<div class="empty">Sin alertas. Todo el mundo al día — buen momento para conseguir parciales viejos.</div>`
    : alerts.map(a=>`<div class="alert-row">
        <button class="alert" data-a="open" data-id="${a.s.id}">
          <span class="dot"></span><b>${esc(a.s.name)}</b><span class="t">${esc(a.text)}</span></button>
        ${hasPhone(a.s)?`<a class="wa-quick" title="Enviar WhatsApp" target="_blank" rel="noopener" href="${waLink(a.s,waMsgForAlert(a.s,a.wa))}">${ICON_CHAT}</a>`:""}
      </div>`).join("");

  h += `<div class="stitle">Próximos exámenes</div>`;
  h += upcoming.length===0
    ? `<div class="empty">Ningún activo tiene fecha de examen cargada. Cargarla es el paso uno del plan hacia atrás.</div>`
    : `<div class="examgrid">` + upcoming.map(s=>{
        const d=daysTo(s.examDate);
        const sim = s.simulacros.length ? `Simulacro: ${esc(s.simulacros[s.simulacros.length-1].grade||"hecho")}` : "Sin simulacro";
        return `<button class="examcard" data-a="open" data-id="${s.id}">
          <span class="count ${d<=7?"urgent":""}">${d===0?"HOY":d+" día"+(d===1?"":"s")}</span>
          <div style="font-weight:700;font-size:15px;margin:8px 0 2px;display:flex;align-items:center;gap:7px">${esc(s.name)} ${semDot(s.semaforo,11,false)} ${examplePill(s)}</div>
          <div style="font-size:12.5px;color:var(--muted)">${esc(s.subject||"Materia s/d")} · ${fmtDate(s.examDate)}</div>
          <div style="font-size:11.5px;font-family:var(--mono);margin-top:6px;color:${s.simulacros.length?"var(--green)":"var(--red)"}">${sim}</div>
        </button>`;}).join("") + `</div>`;

  if(alive().length===0)
    h += emptyState(ICON_USERS, "Todavía no cargaste a nadie",
      "Elegí por dónde arrancar: probá la app con un alumno de ejemplo o sumá directamente a los tuyos.",
      `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" data-a="load-sample">Cargar un alumno de ejemplo</button>
        <button class="btn btn-secondary" data-a="new">Empezar con mis alumnos</button>
      </div>`);

  h += `<div class="stitle">Respaldo</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button class="chip" data-a="export">Descargar copia (.json)</button>
      <label class="chip" style="cursor:pointer">Restaurar desde archivo
        <input type="file" id="importFile" accept="application/json" style="display:none"></label>
      <span class="hint">Restaurar reemplaza todos los datos actuales por los del archivo.</span></div>`;
  return h;
}

/* ============ aviso de cobros atrasados: clases sin cobrar + mensualidades vencidas + señas
   pendientes, agrupado por alumno y desplegable (ver cobrosAtrasadosSummary en helpers.js) ============ */
function vCobrosBanner(){
  const rec = recordatoriosFor();
  if(!rec.activo) return "";
  const sum = cobrosAtrasadosSummary(rec.diasAtraso);
  if(sum.count===0) return "";
  const nClase = sum.items.filter(i=>i.kind==="clase").length;
  const nMensual = sum.items.filter(i=>i.kind==="mensual").length;
  const nSenia = sum.items.filter(i=>i.kind==="senia").length;
  const parts = [];
  if(nClase) parts.push(`${nClase} clase${nClase===1?"":"s"} sin cobrar`);
  if(nMensual) parts.push(`${nMensual} mensualidad${nMensual===1?"":"es"} vencida${nMensual===1?"":"s"}`);
  if(nSenia) parts.push(`${nSenia} seña${nSenia===1?"":"s"} pendiente${nSenia===1?"":"s"}`);
  let h = `<button class="alert" data-a="cobros-toggle" style="cursor:pointer">
    <span class="dot"></span><span class="t">Tenés ${parts.join(", ")} — ${fmtMoney(sum.total)}</span></button>`;
  if(state.cobrosBannerOpen){
    h += `<div class="formcard" style="margin-top:-8px">` +
      Object.keys(sum.byStudent).map(sid=>{
        const s = state.students.find(x=>x.id===sid); if(!s) return "";
        const items = sum.byStudent[sid];
        const subtotal = items.reduce((a,i)=>a+i.monto,0);
        return `<div class="log" style="align-items:flex-start;flex-wrap:wrap">
          <div class="body">
            <div style="font-weight:600">${esc(s.name)}${s.subject?` <span class="hint">· ${esc(s.subject)}</span>`:""}</div>
            ${items.map(i=>vCobroItemRow(s,i)).join("")}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-weight:600;font-family:var(--mono)">${fmtMoney(subtotal)}</div>
            ${hasPhone(s)?`<a class="wa-quick" style="margin-top:4px" title="WhatsApp: recordatorio de pago" target="_blank" rel="noopener" href="${waLink(s,waMsgCobro(s))}">${ICON_CHAT}</a>`:""}
          </div>
        </div>`;
      }).join("") + `</div>`;
  }
  return h;
}
function vCobroItemRow(s,i){
  if(i.kind==="clase") return `<div class="note">${esc(fmtDate(i.date))} · ${fmtMoney(i.monto)}
    <button class="chip" style="margin-left:6px" data-a="cobro-marcar-clase" data-sid="${s.id}" data-id="${i.sessionId}">Marcar cobrada</button></div>`;
  if(i.kind==="mensual") return `<div class="note">Mensualidad de ${esc(monthLabel(currentMonthKey()))} · ${fmtMoney(i.monto)} pendiente
    <button class="chip" style="margin-left:6px" data-a="nav-pagos">Ver en Pagos</button></div>`;
  return `<div class="note">Seña de la clase del ${esc(fmtDate(i.date))} · ${fmtMoney(i.monto)}
    <button class="chip" style="margin-left:6px" data-a="toggle-senia-estado" data-sid="${s.id}" data-id="${i.puntualId}">Marcar cobrada</button></div>`;
}

const SEM_SHORT = {sd:"Sin evaluar", verde:"Verde", amarillo:"Amarillo", rojo:"Rojo"};
function listFiltersActive(){
  return !!(state.listSearch || state.listSubject!=="todas" || state.listCareer!=="todas" || state.listSem!=="todos" ||
    state.filter!=="activo" || (state.listDeuda||"todas")!=="todas" || (state.listSort||"examen")!=="examen" ||
    (state.listTag||"todas")!=="todas");
}
// Última clase dictada (para ordenar/mostrar "por actividad") — null si nunca tuvo una.
function lastSessionDate(s){
  return (s.sessions||[]).reduce((max,c)=>(!max||c.date>max)?c.date:max, null);
}
function vLista(){
  const order=["activo","pausado","desaprobo","aprobo","dejo","todos"];
  const q = (state.listSearch||"").trim().toLowerCase();
  const listDeuda = state.listDeuda||"todas", listSort = state.listSort||"examen", listTag = state.listTag||"todas";
  const shown = alive()
    .filter(s=>state.filter==="todos"||s.status===state.filter)
    .filter(s=>!q || s.name.toLowerCase().includes(q))
    .filter(s=>state.listSubject==="todas"||s.subjectId===state.listSubject)
    .filter(s=>state.listCareer==="todas"||s.career===state.listCareer)
    .filter(s=>state.listSem==="todos"||(s.semaforo||"sd")===state.listSem)
    .filter(s=>listDeuda==="todas" || (listDeuda==="debe" ? pendienteTotalFor(s)>0 : pendienteTotalFor(s)<=0))
    .filter(s=>listTag==="todas" || (s.tagIds||[]).includes(listTag))
    .sort((a,b)=>{
      if(listSort==="actividad") return (lastSessionDate(b)||"0000-00-00").localeCompare(lastSessionDate(a)||"0000-00-00") || a.name.localeCompare(b.name);
      if(listSort==="nombre") return a.name.localeCompare(b.name);
      return ((a.examDate||"9999").localeCompare(b.examDate||"9999"))||a.name.localeCompare(b.name);
    });

  let h = pageHead("Estudiantes","Tus alumnos",`<button class="btn btn-primary" data-a="new">+ Nuevo estudiante</button>`);
  h += `<div class="field" style="margin-bottom:10px">
    <input id="lista-search" data-live="lista-search" type="text" placeholder="Buscar por nombre…" value="${esc(state.listSearch||"")}"></div>`;

  h += `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">` +
    order.map(f=>{
      const n = f==="todos" ? "" : ` <span style="opacity:.55">${alive().filter(s=>s.status===f).length}</span>`;
      return `<button class="chip ${state.filter===f?"on":""}" data-a="filter" data-f="${f}">${f==="todos"?"Todos":STATUS_META[f].label}${n}</button>`;
    }).join("") +
    `<select data-lf="subject" style="width:auto">
      <option value="todas" ${state.listSubject==="todas"?"selected":""}>Todas las materias</option>
      ${state.catalog.subjects.map(m=>`<option value="${m.id}" ${m.id===state.listSubject?"selected":""}>${esc(m.name)}</option>`).join("")}
    </select>
    <select data-lf="career" style="width:auto">
      <option value="todas" ${state.listCareer==="todas"?"selected":""}>Todas las carreras</option>
      ${state.catalog.careers.map(c=>`<option value="${esc(c)}" ${c===state.listCareer?"selected":""}>${esc(c)}</option>`).join("")}
    </select>
    <select data-lf="sem" style="width:auto">
      <option value="todos" ${state.listSem==="todos"?"selected":""}>Todo el semáforo</option>
      ${Object.entries(SEM_SHORT).map(([k,l])=>`<option value="${k}" ${k===state.listSem?"selected":""}>${esc(l)}</option>`).join("")}
    </select>
    <select data-lf="deuda" style="width:auto">
      <option value="todas" ${listDeuda==="todas"?"selected":""}>Deuda: todos</option>
      <option value="debe" ${listDeuda==="debe"?"selected":""}>Debe</option>
      <option value="aldia" ${listDeuda==="aldia"?"selected":""}>Al día</option>
    </select>
    <select data-lf="sort" style="width:auto">
      <option value="examen" ${listSort==="examen"?"selected":""}>Ordenar: por examen</option>
      <option value="actividad" ${listSort==="actividad"?"selected":""}>Por última clase</option>
      <option value="nombre" ${listSort==="nombre"?"selected":""}>Por nombre</option>
    </select>
    ${(state.catalog.tags||[]).length ? `<select data-lf="tag" style="width:auto">
      <option value="todas" ${listTag==="todas"?"selected":""}>Todas las etiquetas</option>
      ${state.catalog.tags.map(t=>`<option value="${t.id}" ${t.id===listTag?"selected":""}>${esc(t.label)}</option>`).join("")}
    </select>` : ""}
    ${listFiltersActive()?`<button class="chip" data-a="clear-filters">Limpiar filtros</button>`:""}</div>`;

  h += `<div class="hint" style="margin-bottom:10px">${shown.length} resultado${shown.length===1?"":"s"}</div>`;

  if(shown.length===0) return h + (alive().length===0
    ? emptyState(ICON_USERS, "Todavía no hay alumnos",
        "Agregá tu primer alumno para empezar a llevar el seguimiento.",
        `<button class="btn btn-primary" data-a="new">+ Agregá tu primer alumno</button>`)
    : `<div class="empty">Nadie coincide con estos filtros.</div>`);

  h += shown.map(s=>{
    const d=daysTo(s.examDate);
    const na=studentAlerts(s).length;
    const units=unitsFor(s);
    const seen=units.filter(t=>["visto","practica","parcial"].includes((s.topics||{})[t])).length;
    const rel=units.filter(t=>(s.topics||{})[t]!=="noentra").length||1;
    const deuda=pendienteTotalFor(s);
    const lastAct=lastSessionDate(s);
    const right = (d!==null&&d>=0&&s.status==="activo")
      ? `<span style="color:${d<=7?"var(--red)":"var(--ink)"};font-weight:600">examen en ${d}d</span>`
      : `<span style="color:var(--faint)">${s.examDate?fmtDate(s.examDate):"sin fecha"}</span>`;
    return `<div class="row">
      <button class="row-click" data-a="open" data-id="${s.id}">
        <div class="main"><div class="name">${esc(s.name)} ${semDot(s.semaforo,13,false)} ${pill(s.status)} ${examplePill(s)}
          ${na?`<span class="mini-alert">${na} alerta${na>1?"s":""}</span>`:""}
          ${deuda>0?`<span class="pill" style="color:var(--status-desaprobo-fg);background:var(--redbg)">debe ${fmtMoney(deuda)}</span>`:""}</div>
        <div class="sub">${esc(s.career)} · ${esc(s.subject||"materia s/d")} · temas ${seen}/${rel}${(state.listSort||"examen")==="actividad"?` · última clase ${lastAct?esc(fmtDate(lastAct)):"nunca"}`:""}</div>
        ${studentTags(s).length?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${studentTags(s).map(t=>tagChip(t)).join("")}</div>`:""}</div>
        <div class="right">${right}</div>
      </button>
      ${hasPhone(s)?`<a class="wa-quick" title="Enviar WhatsApp" target="_blank" rel="noopener" href="${waLink(s,waQuickMessage(s))}">${ICON_CHAT}</a>`:""}
    </div>`;
  }).join("");
  return h;
}

// Etiquetas libres (paso 103): chips con quitar + input con autocompletado (datalist) de las
// etiquetas ya existentes en catalog.tags, para no duplicar "Verano" vs "verano" — el matching
// real (case-insensitive) lo hace getOrCreateTag() en helpers.js, el datalist es sólo ayuda
// visual del navegador. data-enter="tag-add" hace que Enter dispare el mismo botón "+".
function vFichaTagsRow(s){
  const tags = studentTags(s);
  const existingLabels = [...new Set((state.catalog.tags||[]).map(t=>t.label))].sort((a,b)=>a.localeCompare(b));
  return `<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px">
    ${tags.map(t=>tagChip(t,s.id)).join("")}
    <input id="tag-input" list="tag-datalist" data-enter="tag-add" placeholder="+ etiqueta (ingreso, online…)"
      style="width:150px;padding:5px 10px;font-size:12.5px;border-radius:99px;border:1px dashed var(--line);background:none;color:var(--ink)">
    <button class="chip" data-a="tag-add" style="padding:5px 12px">Agregar</button>
    <datalist id="tag-datalist">${existingLabels.map(l=>`<option value="${esc(l)}">`).join("")}</datalist>
  </div>`;
}
function vDetalle(){
  const s = sel(); if(!s) return "";
  const d = daysTo(s.examDate);
  const alerts = studentAlerts(s);
  let h = `<button class="back" data-a="back">← Volver a la lista</button>
  <div class="dethead">
    <div style="flex:1;min-width:220px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h2>${esc(s.name)}</h2>${semDot(s.semaforo,16,true)}${pill(s.status)}${examplePill(s)}</div>
      <div class="semlabel">${esc(SEM_META[s.semaforo||"sd"].label)}${(s.semaforo||"sd")==="sd"?" — tocá el círculo para marcar cómo viene":""}</div>
      <div style="font-size:13px;color:var(--muted)">${esc(s.career)} · ${esc(s.subject||"materia s/d")}${s.chair?" · "+esc(s.chair):""} · desde ${fmtDate(s.startDate)}</div>
    </div>
    ${(s.examDate&&d!==null&&d>=0)?`<span class="count big ${d<=7?"urgent":""}">examen: ${d===0?"HOY":d+" día"+(d===1?"":"s")}</span>`:""}
  </div>`;
  h += vFichaTagsRow(s);
  h += alerts.map(a=>`<div class="alert" style="cursor:default"><span class="dot"></span><span class="t">${esc(a.text)}</span></div>`).join("");
  h += vGoalClosure(s);
  // Pestañas (paso 78): Resumen / Clases / Pagos / Objetivos / Materiales / Portal — cada una
  // acotada a lo suyo, en vez de la ficha larga de antes. Resumen es la que abre por defecto y
  // concentra lo que no tiene pestaña propia (unidades, datos de contacto, informe/contrato,
  // borrar) además del vistazo rápido de arriba (ver vFichaResumenGlance).
  h += `<div class="tabs" style="margin:16px 0 14px">` +
    tabbtn("tab-resumen",state.tab==="resumen","Resumen") +
    tabbtn("tab-clases",state.tab==="clases",`Clases (${s.sessions.length})`) +
    tabbtn("tab-pagos",state.tab==="pagos","Pagos") +
    tabbtn("tab-objetivos",state.tab==="objetivos","Objetivos") +
    tabbtn("tab-materiales",state.tab==="materiales","Materiales") +
    tabbtn("tab-portal",state.tab==="portal","Portal") + `</div>`;

  if(state.tab==="resumen") h += vFichaResumen(s);
  if(state.tab==="clases") h += vFichaClases(s);
  if(state.tab==="pagos") h += vFichaPagos(s);
  if(state.tab==="objetivos") h += vFichaObjetivos(s);
  if(state.tab==="materiales") h += vFichaMateriales(s);
  if(state.tab==="portal") h += vPortalAlumnoCard(s);
  return h;
}

// Fila de tarjetas "de un vistazo" arriba de Resumen (reusa hoyCard, la misma tarjeta del panel
// "Hoy" del tablero) — próxima clase, deuda, racha de objetivos y avance de temas, cada una con
// acceso directo a su pestaña.
function vFichaResumenGlance(s){
  const next = nextClaseForStudent(s);
  const deuda = pendienteTotalFor(s);
  const streak = goalStreak(s);
  const units = unitsFor(s);
  const seen = units.filter(t=>["visto","practica","parcial"].includes((s.topics||{})[t])).length;
  const rel = units.filter(t=>(s.topics||{})[t]!=="noentra").length||1;
  const avancePct = units.length ? Math.round(seen/rel*100) : null;
  return `<div class="hoy-grid" style="margin-bottom:16px">
    ${hoyCard("Próxima clase", next?fmtDate(next.date):"—",
      next?`<div class="hint">${esc(DIAS_SEMANA[weekdayIdx(next.date)])} ${esc(next.time)}</div>`:`<div class="hint">Sin clases agendadas</div>`,
      {a:"tab-clases", label:"Ver clases"})}
    ${hoyCard("Deuda", deuda>0?fmtMoney(deuda):"Al día",
      deuda>0?`<div class="hint">pendiente de cobro</div>`:`<div class="hint">nada pendiente</div>`,
      {a:"tab-pagos", label:"Ver pagos"})}
    ${hoyCard("Racha de objetivos", String(streak),
      `<div class="hint">objetivo${streak===1?"":"s"} cumplido${streak===1?"":"s"} seguido${streak===1?"":"s"}</div>`,
      {a:"tab-objetivos", label:"Ver objetivos"})}
    ${hoyCard("Avance", avancePct!==null?avancePct+"%":"—",
      avancePct!==null?`<div class="hint">${seen}/${rel} unidades</div>`:`<div class="hint">sin materia elegida</div>`)}
  </div>`;
}

/* ============ ficha → Resumen: vistazo rápido, avance por unidades, datos de contacto,
   informe/contrato y borrar alumno — todo lo que no tiene pestaña propia ============ */
function vFichaResumen(s){
  const opt=(v,cur,l)=>`<option value="${esc(v)}" ${v===cur?"selected":""}>${esc(l)}</option>`;
  let h = vFichaResumenGlance(s);
  const units=unitsFor(s);
  if(units.length===0){
    h += `<div class="empty">Este alumno no tiene una materia elegida. Elegila más abajo: la grilla de unidades se arma sola. Las materias y sus unidades se administran desde «Materias».</div>`;
  } else {
    h += `<div class="formcard"><div class="ftitle">Avance por unidades</div>
    <div class="hint" style="margin-bottom:10px">Tocá cada unidad para avanzar el estado: Pendiente → Visto → Práctica → Nivel parcial → No entra. «Nivel parcial» significa que resuelve solo ejercicios de nivel examen.</div>
    <div class="topicgrid">` + units.map(t=>{
      const st=(s.topics||{})[t]||"pendiente";
      const m=TOPIC_META[st];
      return `<button class="topic" data-a="cycle-topic" data-t="${esc(t)}"
        style="background:${m.bg};border-color:${m.bd}">
        <b style="color:${st==="noentra"?"var(--gray2)":"var(--ink)"}">${esc(t)}</b>
        <small style="color:${m.fg}">${m.label}</small></button>`;
    }).join("") + `</div></div>`;
  }
  if(hasPhone(s)) h += vWhatsApp(s);
  h += `<div class="formcard" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
    <div><div class="ftitle" style="margin-bottom:2px">Informe de progreso</div>
      <div class="hint">Un resumen prolijo para compartir con el alumno o la familia.</div></div>
    <button class="chip" data-a="open-informe">Generar informe</button></div>`;
  h += `<div class="formcard" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
    <div><div class="ftitle" style="margin-bottom:2px">Contrato de servicio</div>
      <div class="hint">Modelo precargado con los datos de esta ficha, listo para completar y firmar.</div></div>
    <button class="chip" data-a="open-contrato">Generar contrato</button></div>`;
  if(state.fichaError) h += `<div class="saveerr">${esc(state.fichaError)}</div>`;
  h += `<div class="formcard">
    <div class="frow">
      <div class="field"><div class="flabel">Nombre</div><input data-f="name" value="${esc(s.name)}"></div>
      <div class="field"><div class="flabel">Carrera</div><select data-f="career">
        ${careerOptions(s.career).map(c=>opt(c,s.career,c)).join("")}</select></div></div>
    <div class="frow">
      <div class="field"><div class="flabel">Materia</div><select data-f="subjectId">
        <option value="" ${!s.subjectId?"selected":""}>${s.subjectId?"—":esc(s.subject||"—")}</option>
        ${state.catalog.subjects.map(m=>`<option value="${m.id}" ${m.id===s.subjectId?"selected":""}>${esc(m.name)}</option>`).join("")}
      </select></div>
      <div class="field"><div class="flabel">Cátedra / universidad</div><input data-f="chair" value="${esc(s.chair)}"></div>
      <div class="field"><div class="flabel">Teléfono (WhatsApp)</div><input data-f="phone" placeholder="Ej: 11 2345-6789" value="${esc(s.phone||"")}"></div></div>
    <div class="hint" style="margin:-4px 0 8px">Cargalo sin el 0 del área ni el 15 — ej: código de área + número.</div>
    <div class="frow">
      <div class="field"><div class="flabel">Estado</div><select data-f="status">
        ${Object.entries(STATUS_META).map(([k,m])=>opt(k,s.status,m.label)).join("")}</select></div>
      <div class="field"><div class="flabel">Fecha de examen / parcial</div><input type="date" data-f="examDate" value="${esc(s.examDate)}"></div>
      <div class="field"><div class="flabel">Empezó clases</div><input type="date" data-f="startDate" value="${esc(s.startDate)}"></div></div>
    <div class="field"><div class="flabel">Notas del alumno (diagnóstico inicial, agujeros de secundaria, cómo estudia)</div>
      <textarea data-f="notes">${esc(s.notes)}</textarea></div>
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--soft)">
      ${!state.confirmDel
        ? `<button class="danger" data-a="ask-del">${s.sample?"Eliminar ejemplo":"Eliminar estudiante…"}</button>`
        : `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="font-size:13px;color:var(--status-desaprobo-fg)">${s.sample?"Se borra este alumno de ejemplo. ¿Seguro?":"Se borra todo su historial. ¿Seguro?"}</span>
            <button class="danger" data-a="confirm-del">Sí, eliminar</button>
            <button class="chip" data-a="cancel-del">Cancelar</button></div>`}
      ${s.sample?"":`<div class="hint" style="margin-top:8px">Consejo: si dejó o rindió, cambiá el estado en vez de borrarlo — si vuelve (pasa seguido), retomás con todo el historial.</div>`}
    </div></div>`;
  return h;
}

/* ============ ficha → Clases: registrar/revisar clases dictadas, horarios habituales, clases
   puntuales y simulacros — todo lo que es "actividad" con el alumno ============ */
function vFichaClases(s){
  let h = `<div class="formcard"><div class="ftitle">Registrar clase (30 segundos, apenas termina)</div>
    <div class="frow">
      <div class="field"><div class="flabel">Fecha</div><input type="date" id="c-date" value="${esc(state.sessionPrefillDate||today())}" data-enter="save-session"></div>
      <div class="field"><div class="flabel">Tema principal</div><select id="c-topic" data-enter="save-session"><option value="">—</option>
        ${unitsFor(s).map(t=>`<option>${esc(t)}</option>`).join("")}
        <option>Nivelación</option><option>Repaso / parciales viejos</option></select></div>
      <div class="field"><div class="flabel">¿Trajo la tarea?</div><select id="c-tarea" data-enter="save-session">
        <option value="sd">—</option><option value="hecha">Hecha</option>
        <option value="intentada">Intentada</option><option value="no">No hecha</option></select></div>
      <div class="field" style="max-width:130px"><div class="flabel">Duración (min)</div>
        <input type="number" min="1" id="c-duration" value="60" data-enter="save-session"></div>
    </div>
    <div class="field"><div class="flabel">Nota rápida (qué costó, tarea que dejaste)</div>
      <input id="c-note" placeholder="Ej: se traba en cadena+cociente. Tarea: guía 5, ej. 8-12" data-enter="save-session"></div>
    <div class="field"><div class="flabel">Objetivo de hoy (opcional)</div>
      <input id="c-goal" placeholder="Ej: que resuelva sola sistemas 2x2" data-enter="save-session"></div>
    <button class="primary" style="margin-top:10px;margin-left:0" data-a="save-session">Guardar clase</button></div>`;
  const cobraPorClase = hasPagos(s) && s.modalidad==="clase";
  const sorted=[...s.sessions].sort((a,b)=>b.date.localeCompare(a.date));
  h += sorted.length===0 ? `<div class="empty">Todavía no hay clases registradas.</div>`
    : sorted.map(c=>`<div class="log"><div class="d">${fmtDate(c.date)}</div>
      <div class="body"><span style="font-weight:600">${esc(c.topic||"Clase")}</span>
      <span class="tareatag">${c.duration!=null&&c.duration!==""?Math.round(c.duration)+" min":"60 min (asumido)"}</span>
      ${c.tarea&&c.tarea!=="sd"?`<span class="tareatag" style="color:${TAREA_META[c.tarea].fg}">tarea: ${TAREA_META[c.tarea].label}</span>`:""}
      ${c.note?`<div class="note">${esc(c.note)}</div>`:""}
      ${c.objetivo?`<div class="note goaltag"><span class="icon-inline">${ICON_TARGET}</span> ${esc(c.objetivo)}${c.objetivoResult
        ? ` <span style="color:${OBJETIVO_META[c.objetivoResult.estado].fg}">· <span class="icon-inline">${OBJETIVO_ICONS[c.objetivoResult.estado]}</span> ${OBJETIVO_META[c.objetivoResult.estado].label}${c.objetivoResult.pct!=null?` (${c.objetivoResult.pct}%)`:""}</span>`
        : ` <span class="hint">· sin evaluar todavía</span>`}</div>` : ""}</div>
      ${cobraPorClase?`<button class="chip ${c.cobrada?"on":""}" data-a="toggle-cobrada" data-id="${c.id}">${c.cobrada?"Cobrada":"Pendiente"}</button>`:""}
      <button class="del" data-a="del-session" data-id="${c.id}" title="Borrar" aria-label="Borrar">×</button></div>`).join("");
  h += vHorariosCard(s);
  h += vPuntualesCard(s);
  h += vSimTimer();
  h += `<div class="formcard"><div class="ftitle">Registrar simulacro (parcial viejo, cronometrado)</div>
    <div class="frow">
      <div class="field"><div class="flabel">Fecha</div><input type="date" id="s-date" value="${today()}" data-enter="save-sim"></div>
      <div class="field"><div class="flabel">Nota</div><input id="s-grade" placeholder="Ej: 5.5 / 10" data-enter="save-sim"></div>
    </div>
    <div class="field"><div class="flabel">Diagnóstico: errores conceptuales / de cuenta / de tiempo</div>
      <input id="s-note" placeholder="Ej: 2 conceptuales en límites, 1 de cuenta, le faltó tiempo en el último" value="${esc(state.simPrefillNote||"")}" data-enter="save-sim"></div>
    <button class="primary" style="margin-top:10px;margin-left:0" data-a="save-sim">Guardar simulacro</button></div>`;
  const sortedSim=[...s.simulacros].sort((a,b)=>b.date.localeCompare(a.date));
  h += sortedSim.length===0 ? `<div class="empty">Sin simulacros. Idealmente el primero va 10–14 días antes del examen.</div>`
    : sortedSim.map(c=>`<div class="log"><div class="d">${fmtDate(c.date)}</div>
      <div class="body"><span style="font-weight:700;font-family:var(--mono)">${esc(c.grade||"s/nota")}</span>
      ${c.note?`<div class="note">${esc(c.note)}</div>`:""}</div>
      <button class="del" data-a="del-sim" data-id="${c.id}" title="Borrar" aria-label="Borrar">×</button></div>`).join("");
  return h;
}

/* ============ ficha → Pagos: tarifa/modalidad, pagos mensuales y seña ============ */
function vFichaPagos(s){
  let h = `<div class="formcard">
    <div class="frow">
      <div class="field"><div class="flabel">Tarifa (pesos)</div><input type="number" min="0" data-f="tarifa" placeholder="Sin cargar = sin cobro" value="${esc(s.tarifa||"")}"></div>
      <div class="field"><div class="flabel">Modalidad de cobro</div><select data-f="modalidad">
        <option value="" ${!s.modalidad?"selected":""}>—</option>
        <option value="clase" ${s.modalidad==="clase"?"selected":""}>Por clase</option>
        <option value="mensual" ${s.modalidad==="mensual"?"selected":""}>Mensual</option></select></div></div>
    ${hasPagos(s)&&s.modalidad==="clase"?`<div class="hint" style="margin-top:2px">Marcá cada clase como cobrada desde la pestaña «Clases».</div>`:""}
    ${hasPagos(s)&&s.modalidad==="mensual"?vPagosMensuales(s):""}
    ${!hasPagos(s)?`<div class="hint" style="margin-top:8px">Cargá una tarifa y elegí una modalidad para empezar a llevar el cobro de este alumno.</div>`:""}
  </div>`;
  h += vSeniaCard(s);
  h += vRecibosCard(s);
  return h;
}
// Recibos ya emitidos a este alumno (paso 81) — sólo aparece si tiene alguno; "Ver" reabre el
// mismo documento imprimible/copiable que se ofreció al cobrar (ver vRecibo más abajo).
function vRecibosCard(s){
  const recibos = [...(s.recibos||[])].sort((a,b)=>b.date.localeCompare(a.date)||b.numero.localeCompare(a.numero));
  if(recibos.length===0) return "";
  return `<div class="formcard"><div class="ftitle">Recibos emitidos</div>
    ${recibos.map(r=>`<div class="log">
      <div class="d">${fmtDate(r.date)}</div>
      <div class="body">Nº ${esc(r.numero)} · ${esc(reciboTipoLabel(r.tipo))} · ${fmtMoney(r.monto)}</div>
      <button class="chip" data-a="open-recibo" data-id="${r.id}">Ver</button>
    </div>`).join("")}
  </div>`;
}

/* ============ ficha → Objetivos: racha + historial de objetivos de clase con su resultado ============ */
function vFichaObjetivos(s){
  const streak = goalStreak(s);
  let h = "";
  if(streak>0) h += `<div class="formcard" style="padding:10px 16px;display:flex;align-items:center;gap:8px">
    <span class="icon-inline" style="width:20px;height:20px;color:var(--tarea-intentada-fg)">${ICON_FLAME}</span>
    <span style="font-size:13.5px"><b>${streak}</b> objetivo${streak===1?"":"s"} de clase cumplido${streak===1?"":"s"} seguido${streak===1?"":"s"}</span>
  </div>`;
  const withGoal=[...s.sessions].filter(c=>c.objetivo).sort((a,b)=>b.date.localeCompare(a.date));
  h += `<div class="formcard"><div class="ftitle">Objetivos de clase</div>`;
  h += withGoal.length===0
    ? `<div class="empty">Todavía no cargaste ningún objetivo — se agregan al registrar una clase, en la pestaña «Clases».</div>`
    : withGoal.map(c=>`<div class="log"><div class="d">${fmtDate(c.date)}</div>
      <div class="body"><span class="note goaltag" style="margin:0"><span class="icon-inline">${ICON_TARGET}</span> ${esc(c.objetivo)}</span>
      ${c.objetivoResult
        ? `<div class="note" style="color:${OBJETIVO_META[c.objetivoResult.estado].fg}"><span class="icon-inline">${OBJETIVO_ICONS[c.objetivoResult.estado]}</span> ${OBJETIVO_META[c.objetivoResult.estado].label}${c.objetivoResult.pct!=null?` (${c.objetivoResult.pct}%)`:""}</div>`
        : `<div class="hint">Sin evaluar todavía — se pregunta solo al abrir la ficha.</div>`}</div></div>`).join("");
  h += `</div>`;
  return h;
}

/* ============ ficha → Materiales: lo que este alumno ve en su portal (si tiene uno activo),
   solo lectura — para subir/compartir/borrar hay que ir a Materias ============ */
function vFichaMateriales(s){
  if(!s.subjectId) return `<div class="empty">Este alumno no tiene una materia elegida — elegila desde la pestaña «Resumen» para ver acá sus materiales.</div>`;
  const list = materialesIndexFor(s.subjectId).filter(f=>f.compartido);
  let h = `<div class="formcard"><div class="ftitle" style="display:flex;align-items:center;gap:7px">${subjectDot(s.subjectId)}Materiales compartidos de ${esc(s.subject||"la materia")}</div>
    <div class="hint" style="margin-bottom:10px">Lo que este alumno ve en su portal, si tiene uno activo. Para subir, compartir o borrar materiales, andá a Materias.</div>`;
  h += list.length===0
    ? emptyState(ICON_BOOK,"Sin materiales compartidos","Compartí archivos de esta materia desde Materias para que aparezcan acá.",
        `<button class="btn btn-ghost" data-a="goto-subject-materials" data-id="${s.subjectId}">Ir a Materias</button>`)
    : list.map(f=>`<div class="log" style="align-items:center">
        <div class="body">${esc(materialDisplayName(f.name))}<div class="note">${fmtBytes(f.bytes)}</div></div>
      </div>`).join("") + `<button class="chip" style="margin-top:8px" data-a="goto-subject-materials" data-id="${s.subjectId}">Ir a Materias</button>`;
  h += `</div>`;
  return h;
}

/* ============ resultado de examen: se pregunta desde el tablero al llegar la fecha ============ */
function vExamResultPrompt(s){
  return `<div class="examresult">
    <div><b>${esc(s.name)}</b> <span class="hint">· ${esc(s.subject||"materia s/d")} · examen ${esc(fmtDate(s.examDate))}</span></div>
    <div class="hint" style="margin:2px 0 8px">¿Cómo le fue?</div>
    <div class="frow" style="align-items:flex-end;margin-bottom:0">
      <div class="field" style="max-width:140px"><div class="flabel">Nota (opcional)</div>
        <input id="examgrade-${s.id}" placeholder="Ej: 7/10"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:2px">
        <button class="chip" style="background:var(--greenbg);color:var(--status-activo-fg)" data-a="exam-result" data-id="${s.id}" data-r="aprobo">Aprobó</button>
        <button class="chip" style="background:var(--redbg);color:var(--status-desaprobo-fg)" data-a="exam-result" data-id="${s.id}" data-r="desaprobo">No aprobó</button>
        <button class="chip" data-a="exam-result" data-id="${s.id}" data-r="norindio">No rindió</button>
      </div>
    </div>
  </div>`;
}

/* ============ cierre de objetivo de clase: mini-tarjeta al entrar a la ficha o registrar la clase
   siguiente (ver pendingGoalClosure en helpers.js). Tras responder, se muestra una celebración
   breve (state.goalCelebrate, transient) en vez del formulario habitual — la desarma un setTimeout
   en events.js, no queda guardada en el estado persistido. ============ */
function vGoalClosure(s){
  const cel = state.goalCelebrate;
  if(cel && cel.sid===s.id){
    const m = OBJETIVO_META[cel.estado];
    const msg = cel.estado==="si" ? "¡Buenísimo! Así se construye una racha." :
                cel.estado==="medias" ? "Un paso más y lo tiene — anotado." : "A seguir insistiendo con eso.";
    return `<div class="goalcard goalcard-cel" style="border-color:${m.fg};background:${m.bg}">
      <div class="goalcard-emoji" style="color:${m.fg}">${OBJETIVO_ICONS[cel.estado]}</div>
      <div class="goalcard-msg" style="color:${m.fg}">${msg}</div>
    </div>`;
  }
  const c = pendingGoalClosure(s); if(!c) return "";
  const body = escalaObjetivoFor()==="porcentaje" ? `
    <div class="goalcard-slider">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="hint">Arrastrá para elegir el %</span>
        <b id="goal-pct-label-${c.id}" style="font-family:var(--mono)">50%</b>
      </div>
      <input type="range" min="0" max="100" step="5" value="50" id="goal-pct-${c.id}"
        oninput="document.getElementById('goal-pct-label-${c.id}').textContent=this.value+'%'">
    </div>
    <button class="primary" style="margin-top:10px;margin-left:0" data-a="goal-resultado-pct" data-sid="${s.id}" data-id="${c.id}">Guardar</button>` : `
    <div class="goalcard-btns">
      <button class="goalbtn si" data-a="goal-resultado" data-sid="${s.id}" data-id="${c.id}" data-r="si"><span class="goalbtn-icon">${OBJETIVO_ICONS.si}</span> Sí</button>
      <button class="goalbtn medias" data-a="goal-resultado" data-sid="${s.id}" data-id="${c.id}" data-r="medias"><span class="goalbtn-icon">${OBJETIVO_ICONS.medias}</span> A medias</button>
      <button class="goalbtn no" data-a="goal-resultado" data-sid="${s.id}" data-id="${c.id}" data-r="no"><span class="goalbtn-icon">${OBJETIVO_ICONS.no}</span> No</button>
    </div>`;
  return `<div class="goalcard">
    <div class="goalcard-q">¿Se cumplió «${esc(c.objetivo)}»?</div>
    <div class="hint" style="margin-bottom:8px">Clase del ${esc(fmtDate(c.date))}</div>
    ${body}
  </div>`;
}

// Llave individual de portal para este alumno (ficha → Ficha): generar/copiar/regenerar/revocar
// el link, y elegir qué ve — SIEMPRE explícito y acotado a estos tres checkboxes. A propósito no
// hay forma de compartir notas del alumno, pagos, señas ni comentarios privados desde acá: ver
// buildAlumnoBlock() en sync.js, la única función que lee datos de un alumno para el portal.
function vPortalAlumnoCard(s){
  let h = `<div class="formcard"><div class="ftitle">Portal para este alumno</div>`;
  if(!state.portalLoaded){
    h += skeletonRows(2) + `</div>`;
    return h;
  }
  if(state.portalError && !state.portal){
    h += `<div class="saveerr">${esc(state.portalError)}</div>
    <button class="chip" data-a="portal-reload">Reintentar</button></div>`;
    return h;
  }
  const token = tokenForStudent(s.id);
  const busy = state.portalAlumnoBusy===s.id;
  const share = portalShareFor(s);
  h += `<div class="hint" style="margin-bottom:10px">Un link propio para ${esc(s.name)}, sin login — nunca muestra notas, pagos, señas ni comentarios privados, sólo lo que tildes abajo.</div>`;
  if(!token){
    h += `<button class="chip" data-a="portal-alumno-generar" ${busy?"disabled":""}>${busy?"Generando…":"Generar llave de acceso"}</button>`;
  }else{
    h += `<div class="field"><div class="flabel">Link para ${esc(s.name)}</div>
      <input readonly value="${esc(portalUrl(token))}" onclick="this.select()"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <button class="chip" data-a="portal-alumno-copy">Copiar link</button>
      <button class="chip" data-a="qr-open" data-url="${esc(portalUrl(token))}" data-title="Portal de ${esc(s.name)}">Ver QR</button>
      <button class="chip" data-a="portal-alumno-regen" ${busy?"disabled":""}>Regenerar llave</button>
      <button class="danger" data-a="portal-alumno-revoke" ${busy?"disabled":""}>Revocar</button>
    </div>
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--soft)">
      <div class="flabel" style="margin-bottom:6px">Qué ve este alumno en su portal</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="chip ${share.proximaClase?"on":""}" data-a="portal-alumno-share-toggle" data-key="proximaClase">Su próxima clase</button>
        <button class="chip ${share.tareas?"on":""}" data-a="portal-alumno-share-toggle" data-key="tareas">Tarea de la última clase</button>
        <button class="chip ${share.avance?"on":""}" data-a="portal-alumno-share-toggle" data-key="avance">Avance por unidades</button>
      </div>
      <div class="hint" style="margin-top:8px">Esto se actualiza solo al tocar un tilde de arriba y cada vez que tocás «Publicar cambios» en Cuenta — si cambiás una clase, tarea o avance sin tocar nada acá, convendría republicar para que se vea al toque.</div>
      <div class="hint" style="margin-top:6px">Nunca se comparten notas del alumno, pagos, señas ni comentarios privados, tilde o no tilde nada.</div>
    </div>`;
  }
  if(state.portalAlumnoError) h += `<div class="saveerr" style="margin-top:10px">${esc(state.portalAlumnoError)}</div>`;
  return h + `</div>`;
}

/* ============ agenda: horarios habituales + clases puntuales, dentro de la ficha ============ */
function vHorariosCard(s){
  const list=[...(s.horarios||[])].sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time));
  let h = `<div class="formcard"><div class="ftitle">Horarios habituales</div>`;
  h += list.length===0 ? `<div class="empty">Sin horarios cargados.</div>`
    : list.map(hr=>`<div class="log" style="align-items:center">
      <div class="body">${esc(DIAS_SEMANA[hr.day])} ${esc(hr.time)} · ${hr.duration||60} min</div>
      <button class="del" data-a="del-horario" data-id="${hr.id}" title="Borrar" aria-label="Borrar">×</button></div>`).join("");
  h += `<div class="frow" style="margin-top:8px;align-items:flex-end">
    <div class="field"><div class="flabel">Día</div><select id="h-day" data-enter="add-horario">
      ${DIAS_SEMANA.map((d,i)=>`<option value="${i}">${esc(d)}</option>`).join("")}</select></div>
    <div class="field"><div class="flabel">Hora</div><input type="time" id="h-time" value="18:00" data-enter="add-horario"></div>
    <div class="field" style="max-width:120px"><div class="flabel">Duración (min)</div><input type="number" id="h-duration" value="60" min="15" step="15" data-enter="add-horario"></div>
    <button class="chip" data-a="add-horario" style="margin-bottom:2px">+ Agregar horario</button></div>
  </div>`;
  return h;
}
function vPuntualesCard(s){
  const list=[...(s.clasesPuntuales||[])].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  let h = `<div class="formcard"><div class="ftitle">Clases puntuales</div>
    <div class="hint" style="margin-bottom:8px">Clases sueltas que no siguen el horario habitual — una recuperación, una clase extra.</div>`;
  h += list.length===0 ? `<div class="empty">Sin clases puntuales cargadas.</div>`
    : list.map(p=>vPuntualRow(s,p)).join("");
  h += `<div class="frow" style="margin-top:8px;align-items:flex-end">
    <div class="field"><div class="flabel">Fecha</div><input type="date" id="p-date" value="${today()}" data-enter="add-puntual"></div>
    <div class="field"><div class="flabel">Hora</div><input type="time" id="p-time" value="18:00" data-enter="add-puntual"></div>
    <div class="field" style="max-width:120px"><div class="flabel">Duración (min)</div><input type="number" id="p-duration" value="60" min="15" step="15" data-enter="add-puntual"></div>
    <button class="chip" data-a="add-puntual" style="margin-bottom:2px">+ Agregar clase puntual</button></div>
  </div>`;
  return h;
}
// Una fila de "Clases puntuales": fecha/hora + (si el alumno cobra seña) el chip de estado
// pendiente↔cobrada + el flujo de cancelar (confirmación con la consecuencia de la seña según
// la política y la anticipación, ver applyCancelacion en helpers.js).
function vPuntualRow(s,p){
  const senia = hasSenia(s) ? p.seniaEstado : null;
  const canToggle = senia==="pendiente" || senia==="cobrada";
  const confirming = state.puntualCancelAskId===p.id;
  let h = `<div class="log" style="align-items:center;flex-wrap:wrap">
    <div class="body">${esc(DIAS_SEMANA[weekdayIdx(p.date)])} ${esc(fmtDate(p.date))} ${esc(p.time)} · ${p.duration||60} min
      ${p.cancelada?`<div class="note" style="color:var(--status-desaprobo-fg)">Cancelada ${esc(fmtDateTime(p.canceladaAt))}${senia?" · seña "+SENIA_ESTADO_META[senia].label.toLowerCase():""}</div>`:""}
    </div>`;
  if(senia && !p.cancelada){
    h += canToggle
      ? `<button class="chip" style="color:${SENIA_ESTADO_META[senia].fg};border-color:${SENIA_ESTADO_META[senia].fg}" data-a="toggle-senia-estado" data-id="${p.id}">${SENIA_ESTADO_META[senia].label}</button>`
      : `<span class="chip" style="color:${SENIA_ESTADO_META[senia].fg};border-color:${SENIA_ESTADO_META[senia].fg}">${SENIA_ESTADO_META[senia].label}</span>`;
  }
  if(!p.cancelada){
    if(!confirming){
      h += `<button class="chip" data-a="puntual-cancel-ask" data-id="${p.id}">Cancelar</button>`;
    }else{
      const horas = hoursUntilClase(p);
      const pol = cancelPolicyFor();
      const seniaCobrada = hasSenia(s) && p.seniaEstado==="cobrada";
      const consecuencia = !seniaCobrada ? "" :
        (horas<pol.horasMinimas
          ? ` La seña de ${fmtMoney(p.seniaMonto)} queda retenida (menos de ${pol.horasMinimas}hs de aviso).`
          : ` La seña de ${fmtMoney(p.seniaMonto)} se ${pol.siATiempo==="acredita"?"acredita a la próxima clase":"devuelve"} (aviso con ${pol.horasMinimas}hs o más).`);
      h += `<div style="flex-basis:100%;margin-top:8px;padding-top:8px;border-top:1px solid var(--soft)">
        <div style="font-size:13px;color:var(--status-desaprobo-fg);margin-bottom:6px">¿Cancelar esta clase?${consecuencia}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="danger" data-a="puntual-cancel-confirm" data-id="${p.id}">Sí, cancelar</button>
          <button class="chip" data-a="puntual-cancel-cancel">Volver</button>
        </div>
      </div>`;
    }
  }
  h += `<button class="del" data-a="del-puntual" data-id="${p.id}" title="Borrar" aria-label="Borrar">×</button></div>`;
  return h;
}
// "¿Cobrás seña?" — opt-in por alumno; desactivada, no aparece nada de esto en ninguna otra
// parte de la ficha ni en las clases puntuales (ver hasSenia() en helpers.js).
function vSeniaCard(s){
  const activa = hasSenia(s);
  let h = `<div class="formcard"><div class="ftitle" style="display:flex;align-items:center;gap:7px">¿Cobrás seña?${helpTip("senia")}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:${activa?"10px":"0"}">
      <button class="chip ${!activa?"on":""}" data-a="toggle-senia" data-f="no">No</button>
      <button class="chip ${activa?"on":""}" data-a="toggle-senia" data-f="si">Sí</button>
    </div>`;
  if(activa){
    h += `<div class="frow">
      <div class="field"><div class="flabel">Tipo</div><select data-f="seniaTipo">
        <option value="monto" ${s.seniaTipo!=="porcentaje"?"selected":""}>Monto fijo</option>
        <option value="porcentaje" ${s.seniaTipo==="porcentaje"?"selected":""}>% de la tarifa</option>
      </select></div>
      <div class="field"><div class="flabel">${s.seniaTipo==="porcentaje"?"Porcentaje":"Monto (pesos)"}</div>
        <input type="number" min="0" data-f="seniaValor" value="${esc(s.seniaValor||"")}"></div>
    </div>`;
    h += (s.seniaTipo==="porcentaje" && !(Number(s.tarifa)>0))
      ? `<div class="hint">Cargá una tarifa en esta ficha para que el porcentaje tenga sobre qué calcularse.</div>`
      : `<div class="hint">Cada clase puntual que le programes va a pedir ${fmtMoney(seniaMontoFor(s))} de seña.</div>`;
  }
  return h + `</div>`;
}

/* ============ vista "Agenda": semana o mes, todos los alumnos ============ */
function vAgenda(){
  const mode = state.agendaViewMode||"semana";
  let h = pageHead("Agenda","Calendario de clases");
  h += `<div class="tabs" style="margin-bottom:16px">
    ${tabbtn("agenda-view-semana",mode==="semana","Semana")}
    ${tabbtn("agenda-view-mes",mode==="mes","Mes")}
  </div>`;
  h += mode==="mes" ? vAgendaMes() : vAgendaSemana();
  return h;
}
function vAgendaSemana(){
  const offset = state.agendaWeekOffset||0;
  const weekStart = addDays(mondayOfWeek(today()), offset*7);
  const weekEnd = addDays(weekStart,6);
  let h = `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button class="chip" data-a="agenda-prev">← Semana anterior</button>
      <b style="font-size:14px">${esc(fmtDate(weekStart))} – ${esc(fmtDate(weekEnd))}</b>
      <button class="chip" data-a="agenda-next">Semana siguiente →</button>
      ${offset!==0?`<button class="chip" data-a="agenda-today">Esta semana</button>`:""}
    </div>
    <button class="chip" data-a="export-agenda-ics">Exportar agenda (.ics)</button>
  </div>`;

  const events = markOverlaps(agendaWeekEvents(weekStart));
  if(events.length===0){
    h += emptyState(ICON_CALENDAR, "Sin clases agendadas esta semana",
      "Cargá horarios habituales o clases puntuales desde la ficha de cada alumno (pestaña «Clases»).",
      `<button class="btn btn-primary" data-a="nav-lista">Ir a Estudiantes</button>`);
    return h;
  }

  const byDay = Array.from({length:7},()=>[]);
  events.forEach(e=>{
    const idx = Math.round((new Date(e.date+"T12:00:00")-new Date(weekStart+"T12:00:00"))/86400000);
    if(idx>=0 && idx<7) byDay[idx].push(e);
  });
  byDay.forEach(list=>list.sort((a,b)=>a.time.localeCompare(b.time)));

  h += `<div class="agenda-grid">` + DIAS_SEMANA.map((label,i)=>{
    const date = addDays(weekStart,i);
    const list = byDay[i];
    return `<div class="agenda-day ${date===today()?"today":""}">
      <div class="agenda-daylabel">${esc(label)} <span class="hint">${esc(fmtDate(date))}</span></div>
      ${list.length===0 ? `<div class="hint">Sin clases</div>` : list.map(e=>vAgendaEvent(e,date)).join("")}
    </div>`;
  }).join("") + `</div>`;
  return h;
}
/* ============ vista "Agenda" → Mes: grilla del mes con mini-marcas por día ============ */
function vAgendaMes(){
  const mk = monthKeyOffset(state.agendaMonthOffset||0);
  const days = monthGridDays(mk);
  const events = agendaRangeEvents(days[0], days[days.length-1]);
  const byDate = {};
  events.forEach(e=>{ (byDate[e.date]=byDate[e.date]||[]).push(e); });

  let h = `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button class="chip" data-a="agenda-month-prev">← Mes anterior</button>
      <b style="font-size:14px">${esc(monthLabel(mk))}</b>
      <button class="chip" data-a="agenda-month-next">Mes siguiente →</button>
      ${(state.agendaMonthOffset||0)!==0?`<button class="chip" data-a="agenda-month-today">Este mes</button>`:""}
    </div>
  </div>`;

  h += `<div class="cal-weekdays">` + DIAS_SEMANA.map(d=>`<div>${esc(d.slice(0,3))}</div>`).join("") + `</div>`;
  h += `<div class="cal-grid">` + days.map(d=>{
    const inMonth = d.slice(0,7)===mk;
    const n = (byDate[d]||[]).length;
    return `<button class="cal-cell ${inMonth?"":"other"} ${d===today()?"today":""} ${state.agendaSelectedDay===d?"selected":""}"
      data-a="agenda-day-select" data-date="${d}">
      <span class="cal-daynum">${parseInt(d.slice(8,10),10)}</span>
      ${n>0?`<span class="cal-count">${n}</span>`:""}
    </button>`;
  }).join("") + `</div>`;

  if(state.agendaSelectedDay) h += vAgendaDayDetail(state.agendaSelectedDay);
  return h;
}
function vAgendaDayDetail(date){
  const events = markOverlaps(agendaRangeEvents(date,date)).sort((a,b)=>a.time.localeCompare(b.time));
  let h = `<div class="formcard">
    <div class="ftitle">${esc(fmtDate(date))}${date===today()?" · hoy":""}</div>`;
  h += events.length===0 ? `<div class="empty">Sin clases este día.</div>`
    : vAgendaDayHours(events,date);

  if(!state.agendaQuickAddOpen){
    h += `<button class="chip" style="margin-top:10px" data-a="agenda-quick-open">Programar clase acá</button>`;
  }else{
    const activos = alive().filter(s=>s.status==="activo").sort((a,b)=>a.name.localeCompare(b.name));
    h += activos.length===0 ? `<div class="hint" style="margin-top:10px">No hay alumnos activos para programarles una clase.</div>`
      : `<div class="frow" style="margin-top:10px;align-items:flex-end">
        <div class="field"><div class="flabel">Alumno</div><select id="aq-student">
          ${activos.map(s=>`<option value="${s.id}">${esc(s.name)}${s.subject?" · "+esc(s.subject):""}</option>`).join("")}
        </select></div>
        <div class="field"><div class="flabel">Hora</div><input type="time" id="aq-time" value="18:00"></div>
        <div class="field" style="max-width:120px"><div class="flabel">Duración (min)</div><input type="number" id="aq-duration" value="60" min="15" step="15"></div>
        <button class="chip" data-a="agenda-quick-add" style="margin-bottom:2px">+ Programar</button>
      </div>`;
  }
  return h + `</div>`;
}
// Grilla vertical de bloques por hora para la vista de un día (paso 90): desde la primera hora
// con clase (si es más temprano) hasta un rango razonable 8-22 (más tarde, si hace falta),
// con scroll. Cada bloque muestra todas las clases que empiezan en esa hora lado a lado — nunca
// superpuestas ni ocultas — reusando vAgendaEvent() tal cual (mismo click, mismo aviso de
// superposición ya calculado por markOverlaps() antes de llamar acá).
function vAgendaDayHours(events, date){
  const startHour = Math.min(8, ...events.map(e=>Math.floor(e.startMin/60)));
  const endHour = Math.max(22, ...events.map(e=>Math.ceil(e.endMin/60)));
  let h = `<div class="agenda-hours">`;
  for(let hr=startHour; hr<endHour; hr++){
    const label = String(hr).padStart(2,"0")+":00";
    const list = events.filter(e=>Math.floor(e.startMin/60)===hr);
    h += `<div class="agenda-hour-row">
      <div class="agenda-hour-label">${label}</div>
      <div class="agenda-hour-slot">${list.map(e=>vAgendaEvent(e,date)).join("")}</div>
    </div>`;
  }
  return h + `</div>`;
}
function vAgendaEvent(e, date){
  const past = date<today();
  const already = past && studentHasSessionOnDate(e.studentId, e.date);
  const borderColor = e.subjectId ? `var(--subj-${subjectColorKey(e.subjectId)}-fg)` : "transparent";
  return `<div class="agenda-event ${e.overlap?"overlap":""}" style="border-left:3px solid ${borderColor}">
    <div class="agenda-time">${esc(e.time)} <span class="hint">${e.duration}min</span></div>
    <div class="agenda-who">${e.subjectId?subjectDot(e.subjectId):""} <b>${esc(e.studentName)}</b>${e.subject?` <span class="hint">· ${esc(e.subject)}</span>`:""}</div>
    ${e.seniaEstado?`<span class="chip" style="margin-top:4px;color:${SENIA_ESTADO_META[e.seniaEstado].fg};border-color:${SENIA_ESTADO_META[e.seniaEstado].fg}">Seña ${SENIA_ESTADO_META[e.seniaEstado].label.toLowerCase()}</span>`:""}
    ${e.overlap?`<div class="hint" style="color:var(--status-desaprobo-fg);display:flex;align-items:center;gap:4px"><span class="icon-inline" style="width:12px;height:12px">${ICON_WARNING}</span> se superpone con otra clase</div>`:""}
    ${past && already ? `<div class="hint" style="color:var(--status-activo-fg)">Ya registrada</div>` : ""}
    ${past && !already ? `<button class="chip" style="margin-top:6px" data-a="agenda-log" data-id="${e.studentId}" data-date="${e.date}">Registrar esta clase</button>` : ""}
  </div>`;
}

/* ============ exportar agenda (.ics), próximas 4 semanas ============ */
function icsEscape(s){ return String(s??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n"); }
function icsDateTime(date, time){ return date.replace(/-/g,"")+"T"+time.replace(":","")+"00"; }
function buildAgendaIcs(){
  const start = today(), end = addDays(start,27);
  const events = [];
  alive().filter(s=>s.status==="activo").forEach(s=>{
    (s.clasesPuntuales||[]).forEach(p=>{
      if(p.date>=start && p.date<=end) events.push({studentName:s.name, subject:s.subject, date:p.date, time:p.time, duration:Number(p.duration)||60});
    });
    if((s.horarios||[]).length){
      for(let d=start; d<=end; d=addDays(d,1)){
        const dow=weekdayIdx(d);
        (s.horarios||[]).filter(h=>h.day===dow).forEach(h=>{
          events.push({studentName:s.name, subject:s.subject, date:d, time:h.time, duration:Number(h.duration)||60});
        });
      }
    }
  });
  const stamp = start.replace(/-/g,"")+"T000000Z";
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Entreclases//ES","CALSCALE:GREGORIAN"];
  events.forEach((e,i)=>{
    lines.push("BEGIN:VEVENT");
    lines.push("UID:"+stamp+"-"+i+"@entreclases");
    lines.push("DTSTAMP:"+stamp);
    lines.push("DTSTART:"+icsDateTime(e.date,e.time));
    lines.push("DTEND:"+icsDateTime(e.date,addMinutesToTime(e.time,e.duration)));
    lines.push("SUMMARY:"+icsEscape(`Clase con ${e.studentName}${e.subject?" — "+e.subject:""}`));
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/* ============ WhatsApp: mensajes pre-armados, solo links wa.me (sin API) ============ */
function waMsgProximaClase(s){
  return `Hola ${studentFirstName(s)}! Te escribo para coordinar/recordar nuestra próxima clase de ${s.subject||"la materia"}. ¡Cualquier cosa avisame!`;
}
function waMsgTareaHoy(s){
  const last=[...(s.sessions||[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
  if(!last) return `Hola ${studentFirstName(s)}! ¿Cómo veníamos con la tarea?`;
  const tarea = last.note || last.topic || "lo que vimos en la última clase";
  return `Hola ${studentFirstName(s)}! Te recuerdo la tarea de la clase del ${fmtDate(last.date)}: ${tarea}`;
}
function waMsgExamen(s){
  const d=daysTo(s.examDate);
  if(d===null) return `Hola ${studentFirstName(s)}! ¿Cómo venís con el estudio para el examen?`;
  return `Hola ${studentFirstName(s)}! Faltan ${d} día${d===1?"":"s"} para tu examen de ${s.subject||"la materia"}${s.examDate?" ("+fmtDate(s.examDate)+")":""}. ¡Vamos con todo!`;
}
function waQuickMessage(s){
  const d=daysTo(s.examDate);
  return (d!==null && d>=0 && d<=14) ? waMsgExamen(s) : waMsgProximaClase(s);
}
function waMsgForAlert(s, kind){
  if(kind==="examen") return waMsgExamen(s);
  if(kind==="tarea") return waMsgTareaHoy(s);
  return waMsgProximaClase(s);
}
// Recordatorio de pago pendiente (clases sin cobrar + mensualidad del mes + señas pendientes,
// ver pendienteTotalFor en helpers.js) — lo usa tanto el menú de WhatsApp de la ficha como el
// aviso de cobros atrasados del tablero.
function waMsgCobro(s){
  const total = pendienteTotalFor(s);
  if(total<=0) return `Hola ${studentFirstName(s)}! Te escribo para coordinar el pago de las clases.`;
  return `Hola ${studentFirstName(s)}! Te escribo por el pago pendiente de ${fmtMoney(total)}. ¡Avisame cuando lo puedas hacer, gracias!`;
}
function vWhatsApp(s){
  const pendiente = pendienteTotalFor(s);
  return `<div class="formcard"><div class="ftitle">Enviar WhatsApp</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgProximaClase(s))}">Recordatorio de próxima clase</a>
      <a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgTareaHoy(s))}">Tarea de la última clase</a>
      ${s.examDate?`<a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgExamen(s))}">Recordatorio de examen</a>`:""}
      ${pendiente>0?`<a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgCobro(s))}">Recordatorio de pago pendiente</a>`:""}
    </div>
    <div class="field"><div class="flabel">Mensaje libre</div>
      <textarea id="wa-free-text">${esc(waMsgProximaClase(s))}</textarea></div>
    <button class="chip" style="margin-top:8px" data-a="wa-free-send">Abrir en WhatsApp</button>
  </div>`;
}

/* ============ pagos: registro mensual dentro de la ficha (modalidad "mensual") ============ */
function vPagosMensuales(s){
  const sorted=[...(s.pagos||[])].sort((a,b)=>b.date.localeCompare(a.date));
  let h = `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--soft)">
    <div class="flabel" style="margin-bottom:6px">Pagos registrados</div>
    <div class="frow" style="align-items:flex-end">
      <div class="field"><div class="flabel">Fecha</div><input type="date" id="pago-date" value="${today()}" data-enter="save-pago"></div>
      <div class="field"><div class="flabel">Monto</div><input type="number" min="0" id="pago-amount" placeholder="Ej: ${esc(s.tarifa||"")}" data-enter="save-pago"></div>
      <button class="chip" data-a="save-pago" style="margin-bottom:2px">+ Registrar pago</button></div>`;
  h += sorted.length===0 ? `<div class="empty" style="margin-top:8px">Sin pagos registrados todavía este mes ni anteriores.</div>`
    : sorted.map(p=>`<div class="log" style="margin-top:6px"><div class="d">${fmtDate(p.date)}</div>
      <div class="body">${fmtMoney(p.amount)}</div>
      <button class="del" data-a="del-pago" data-id="${p.id}" title="Borrar" aria-label="Borrar">×</button></div>`).join("");
  h += `</div>`;
  return h;
}

/* ============ vista "Pagos": sub-pestañas "Resumen" (mes a mes, quién debe qué) y
   "Rentabilidad" (cuánto se gana de verdad por hora, ver vRentabilidad más abajo) ============ */
function vPagos(){
  const tab = state.pagosTab||"resumen";
  let h = pageHead("Pagos","Cobros y rentabilidad");
  h += `<div class="tabs" style="margin-bottom:14px">
    <button class="tabbtn ${tab==="resumen"?"on":""}" data-a="pagos-tab" data-t="resumen">Resumen</button>
    <button class="tabbtn ${tab==="rentabilidad"?"on":""}" data-a="pagos-tab" data-t="rentabilidad">Rentabilidad</button>
  </div>`;
  return h + (tab==="rentabilidad" ? vRentabilidad() : vPagosResumen());
}
// Opciones de período para el export contable (paso 83) — termina en el mes elegido en el
// selector de arriba, así "exportar" siempre coincide con lo que se está mirando en pantalla.
const PAGOS_EXPORT_PERIODS = {"1":"Este mes","3":"Últimos 3 meses","6":"Últimos 6 meses","12":"Último año"};
function vPagosResumen(){
  const mk = state.pagosMonth || currentMonthKey();
  let h = `<div class="frow" style="margin-bottom:14px;align-items:flex-end">
    <div class="field" style="max-width:280px">
      <div class="flabel">Mes</div>
      <select data-cf="pagos-month">
        ${recentMonthKeys(12).map(k=>`<option value="${k}" ${k===mk?"selected":""}>${esc(monthLabel(k))}</option>`).join("")}
      </select></div>
    <div class="field" style="max-width:220px">
      <div class="flabel">Exportar (termina en el mes de arriba)</div>
      <select data-cf="pagos-export-period">
        ${Object.entries(PAGOS_EXPORT_PERIODS).map(([k,l])=>`<option value="${k}" ${k===(state.pagosExportPeriod||"3")?"selected":""}>${esc(l)}</option>`).join("")}
      </select></div>
    <button class="chip" data-a="export-pagos-csv" style="margin-bottom:2px">Exportar CSV</button>
  </div>`;

  const rows = alive().filter(hasPagos).map(s=>({s, r:pagoResumen(s,mk)}));
  const seniaRes = pagosSeniaResumen(mk);
  if(rows.length===0 && seniaRes.rows.length===0)
    return h + emptyState(ICON_WALLET, "Todavía no hay nada para cobrar acá",
      "Cargá una tarifa o activá la seña desde la pestaña «Pagos» de cada alumno para que aparezcan los cobros de este mes.",
      `<button class="btn btn-primary" data-a="nav-lista">Ir a Estudiantes</button>`);

  if(rows.length){
    const totalCobrado = rows.reduce((a,x)=>a+x.r.cobrado,0);
    const totalPendiente = rows.reduce((a,x)=>a+x.r.pendiente,0);
    const totalClases = rows.reduce((a,x)=>a+x.r.clases,0);
    h += `<div class="stats">
      <div class="stat"><b>${fmtMoney(totalCobrado)}</b><span>cobrado</span></div>
      <div class="stat ${totalPendiente?"warn":""}"><b>${fmtMoney(totalPendiente)}</b><span>pendiente</span></div>
      <div class="stat"><b>${totalClases}</b><span>clases dadas</span></div>
    </div>`;

    const nameCount={};
    rows.forEach(x=>{ const n=normName(x.s.name); nameCount[n]=(nameCount[n]||0)+1; });
    const sorted=[...rows].sort((a,b)=>b.r.pendiente-a.r.pendiente || a.s.name.localeCompare(b.s.name));

    h += `<div class="stitle">Por alumno</div>`;
    h += sorted.map(({s,r})=>{
      const showSubject = nameCount[normName(s.name)]>1;
      return `<button class="row" data-a="open" data-id="${s.id}">
        <div class="main"><div class="name">${esc(s.name)}${showSubject?` <span class="hint">· ${esc(s.subject||"materia s/d")}</span>`:""}</div>
        <div class="sub">${s.modalidad==="clase"?`${r.clases} clase${r.clases===1?"":"s"} dada${r.clases===1?"":"s"}`:"mensual"} · cobrado ${fmtMoney(r.cobrado)}</div></div>
        <div class="right"><span style="color:${r.pendiente?"var(--red)":"var(--green)"};font-weight:600">${r.pendiente?fmtMoney(r.pendiente)+" pendiente":"al día"}</span></div>
      </button>`;
    }).join("");
  }

  if(seniaRes.rows.length){
    h += `<div class="stitle">Señas</div>
    <div class="stats">
      <div class="stat"><b>${fmtMoney(seniaRes.cobrado)}</b><span>cobradas</span></div>
      <div class="stat"><b>${fmtMoney(seniaRes.retenida)}</b><span>retenidas</span></div>
    </div>`;
    h += seniaRes.rows.map(({s,p})=>`<div class="log">
      <div class="d">${fmtDate(p.date)}</div>
      <div class="body">${esc(s.name)}${s.subject?` <span class="hint">· ${esc(s.subject)}</span>`:""}</div>
      <span class="chip" style="color:${SENIA_ESTADO_META[p.seniaEstado].fg};border-color:${SENIA_ESTADO_META[p.seniaEstado].fg};flex-shrink:0">${fmtMoney(p.seniaMonto)} · ${SENIA_ESTADO_META[p.seniaEstado].label}</span>
    </div>`).join("");
  }
  return h;
}

/* ============ rentabilidad real: ingresos cobrados menos costos, por hora dictada ============ */
function vRentabilidad(){
  const mk = state.rentaMonth || currentMonthKey();
  let h = `<div class="field" style="max-width:280px;margin-bottom:14px">
    <div class="flabel">Mes</div>
    <select data-cf="renta-month">
      ${recentMonthKeys(12).map(k=>`<option value="${k}" ${k===mk?"selected":""}>${esc(monthLabel(k))}</option>`).join("")}
    </select></div>`;

  const r = rentabilidadMes(mk);
  h += `<div class="stats" style="margin-bottom:10px">
    <div class="stat"><b style="font-size:34px;color:${r.horas>0?(r.ganancia>=0?"var(--green)":"var(--red)"):"var(--ink)"}">${r.horas>0?fmtMoneySigned(r.netoPorHora):"—"}</b><span>neto por hora real ${helpTip("rentabilidad")}</span></div>
  </div>`;
  h += `<div class="stats" style="margin-bottom:8px">
    <div class="stat"><b>${fmtMoney(r.ingresos)}</b><span>ingresos cobrados</span></div>
    <div class="stat"><b>${fmtMoney(r.costosTotal)}</b><span>costos del mes</span></div>
    <div class="stat ${r.ganancia<0?"warn":""}"><b>${fmtMoneySigned(r.ganancia)}</b><span>ganancia neta</span></div>
    <div class="stat"><b>${r.horas.toFixed(1)}</b><span>horas dictadas</span></div>
  </div>`;
  if(r.sinDuracion>0) h += `<div class="hint" style="margin-bottom:14px">${r.sinDuracion} clase${r.sinDuracion===1?"":"s"} sin duración cargada — se contaron como 1 hora.</div>`;
  if(r.clasesCount===0) h += `<div class="empty" style="margin-bottom:14px">Sin clases registradas este mes todavía.</div>`;

  const proy = rentabilidadProyeccion(mk);
  if(proy) h += `<div class="hint" style="margin-bottom:20px">Proyección del mes al ritmo actual (día ${proy.diasTranscurridos} de ${proy.diasEnMes}): ganancia neta ≈ <b>${fmtMoneySigned(proy.ganancia)}</b>.</div>`;

  h += `<div class="stitle">Por materia</div>`;
  const porMateria = rentabilidadPorMateria(mk);
  h += porMateria.length===0 ? `<div class="empty">Sin datos todavía este mes.</div>` : rentaRows(porMateria);

  h += `<div class="stitle">Por alumno</div>`;
  const porAlumno = rentabilidadPorAlumno(mk);
  h += porAlumno.length===0 ? `<div class="empty">Sin datos todavía este mes.</div>` : rentaRows(porAlumno);

  h += `<div class="stitle" style="margin-top:26px">Histórico (últimos 12 meses)</div>`;
  const hist = rentabilidadHistorico();
  const axisLabels = hist.map(x=>x.label);
  h += `<div class="hint" style="margin-bottom:6px">Ganancia neta por mes — línea punteada: tendencia</div>`;
  h += signedBarChart(hist.map(x=>({label:x.mk,v:x.neto})), axisLabels, fmtMoney);
  h += `<div class="hint" style="margin:18px 0 6px">Neto por hora real por mes — línea punteada: tendencia</div>`;
  h += signedBarChart(hist.map(x=>({label:x.mk,v:x.netoPorHora||0})), axisLabels, v=>v?fmtMoney(v):"—");

  h += vCostosConfig();
  return h;
}
// filas de desglose (por materia o por alumno) — mismo formato de tarjeta en ambos casos.
function rentaRows(groups){
  return groups.map(g=>`<div class="row" style="cursor:default">
    <div class="main"><div class="name">${esc(g.label)}${g.subject?` <span class="hint">· ${esc(g.subject)}</span>`:""}</div>
      <div class="sub">${g.clases} clase${g.clases===1?"":"s"} · ${fmtMoney(g.ingresos)} ingresos${g.costos?` · ${fmtMoney(g.costos)} costos`:""}</div></div>
    <div class="right"><span style="color:${g.neto>=0?"var(--green)":"var(--red)"};font-weight:600">${fmtMoneySigned(g.neto)}</span>
      ${g.horas>0?`<div class="hint">${fmtMoneySigned(g.netoPorHora)}/h</div>`:""}</div>
  </div>`).join("");
}
// <select> de alcance para un costo: general (todo el negocio), una materia puntual o un alumno
// puntual — el valor codifica cuál con el prefijo "m:"/"s:" (ver parseScopeValue en helpers.js).
function scopeOptionsHtml(selected){
  let h = `<option value="" ${!selected?"selected":""}>General (todo el negocio)</option>`;
  if(state.catalog.subjects.length){
    h += `<optgroup label="Por materia">` + state.catalog.subjects.map(m=>
      `<option value="m:${m.id}" ${selected==="m:"+m.id?"selected":""}>${esc(m.name)}</option>`).join("") + `</optgroup>`;
  }
  const studs = alive();
  if(studs.length){
    h += `<optgroup label="Por alumno">` + studs.map(s=>
      `<option value="s:${s.id}" ${selected==="s:"+s.id?"selected":""}>${esc(s.name)}</option>`).join("") + `</optgroup>`;
  }
  return h;
}
function scopeLabelOf(c){
  if(c.subjectId){ const m=subjById(c.subjectId); return m?m.name:"materia eliminada"; }
  if(c.studentId){ const s=state.students.find(x=>x.id===c.studentId); return s?s.name:"alumno eliminado"; }
  return "General";
}
function vCostosConfig(){
  const costos = costosFor();
  let h = `<div class="stitle" style="margin-top:30px">Costos</div>`;
  h += `<div class="formcard">
    <div class="ftitle">Costos fijos mensuales</div>
    <div class="hint" style="margin-bottom:10px">Se descuentan completos cada mes, dicten o no clases ese mes. Asignalos a una materia o alumno si querés que aparezcan en su desglose — sin asignar, quedan como costo general del negocio.</div>
    ${costos.fijos.map(c=>`<div class="log">
      <div class="body">${esc(c.name)} <span class="hint">· ${esc(scopeLabelOf(c))}</span></div>
      <div style="font-family:var(--mono);font-weight:600">${fmtMoney(c.monto)}</div>
      <button class="del" data-a="del-costo-fijo" data-id="${c.id}" title="Borrar" aria-label="Borrar">×</button>
    </div>`).join("")}
    <div class="frow" style="align-items:flex-end;margin-top:8px">
      <div class="field"><div class="flabel">Nombre</div><input id="costo-fijo-name" placeholder="Ej: alquiler de aula" data-enter="add-costo-fijo"></div>
      <div class="field" style="max-width:130px"><div class="flabel">Monto mensual</div><input type="number" min="0" id="costo-fijo-monto" data-enter="add-costo-fijo"></div>
      <div class="field"><div class="flabel">Alcance</div><select id="costo-fijo-scope" data-enter="add-costo-fijo">${scopeOptionsHtml("")}</select></div>
      <button class="chip" data-a="add-costo-fijo" style="margin-bottom:2px">+ Agregar</button>
    </div>
  </div>`;

  h += `<div class="formcard">
    <div class="ftitle">Costos variables por clase</div>
    <div class="hint" style="margin-bottom:10px">Se descuentan por cada clase dictada dentro de su alcance (viáticos, material impreso, etc.).</div>
    ${costos.variables.map(c=>`<div class="log">
      <div class="body">${esc(c.name)} <span class="hint">· ${esc(scopeLabelOf(c))}</span></div>
      <div style="font-family:var(--mono);font-weight:600">${fmtMoney(c.monto)}/clase</div>
      <button class="del" data-a="del-costo-variable" data-id="${c.id}" title="Borrar" aria-label="Borrar">×</button>
    </div>`).join("")}
    <div class="frow" style="align-items:flex-end;margin-top:8px">
      <div class="field"><div class="flabel">Nombre</div><input id="costo-var-name" placeholder="Ej: viáticos" data-enter="add-costo-variable"></div>
      <div class="field" style="max-width:130px"><div class="flabel">Monto por clase</div><input type="number" min="0" id="costo-var-monto" data-enter="add-costo-variable"></div>
      <div class="field"><div class="flabel">Alcance</div><select id="costo-var-scope" data-enter="add-costo-variable">${scopeOptionsHtml("")}</select></div>
      <button class="chip" data-a="add-costo-variable" style="margin-bottom:2px">+ Agregar</button>
    </div>
  </div>`;
  return h;
}

/* ============ informe de progreso: vista limpia, pensada para imprimir/compartir ============ */
function informeFilteredData(s){
  const periodKey = state.informePeriod||"3m";
  const fromDate = informePeriodFrom(periodKey);
  const sessions = [...(s.sessions||[])].filter(c=>!fromDate||c.date>=fromDate).sort((a,b)=>a.date.localeCompare(b.date));
  const simulacros = [...(s.simulacros||[])].filter(c=>!fromDate||c.date>=fromDate).sort((a,b)=>a.date.localeCompare(b.date));
  return { periodKey, fromDate, sessions, simulacros };
}
function vInforme(){
  const s = sel(); if(!s) return "";
  const { periodKey, fromDate, sessions, simulacros } = informeFilteredData(s);
  const units = unitsFor(s), topics = s.topics||{};
  const d = daysTo(s.examDate);

  let h = `<div class="informe-bar no-print">
    <button class="back" style="margin:0" data-a="close-informe">← Volver a la ficha</button>
    <div class="informe-actions">
      <select data-cf="informe-period" style="width:auto">
        ${Object.entries(INFORME_PERIODS).map(([k,p])=>`<option value="${k}" ${k===periodKey?"selected":""}>${esc(p.label)}</option>`).join("")}
      </select>
      <button class="chip" data-a="informe-copy">Copiar resumen para WhatsApp</button>
      <button class="chip" data-a="informe-share-image" ${state.informeImgBusy?"disabled":""}>${state.informeImgBusy?"Generando…":"Compartir como imagen"}</button>
      <button class="primary" style="margin-left:0" data-a="informe-print">Descargar PDF</button>
    </div>
  </div>`;

  h += `<div class="informe-doc">
    <div class="informe-eyebrow">Informe de progreso</div>
    <h1 class="informe-name">${esc(s.name)}</h1>
    <div class="informe-sub">${esc(s.career)} · ${esc(s.subject||"materia s/d")}${s.chair?" · "+esc(s.chair):""}</div>
    <div class="informe-meta">
      <div><span class="informe-metalabel">Período</span>${esc(periodRangeLabel(periodKey,fromDate))}</div>
      <div><span class="informe-metalabel">Examen</span>${s.examDate?esc(fmtDate(s.examDate))+(d!==null&&d>=0?` (en ${d} día${d===1?"":"s"})`:""):"sin fecha cargada"}</div>
      <div><span class="informe-metalabel">Estado</span>${esc(STATUS_META[s.status].label)}</div>
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Progreso por unidad</div>
      ${units.length===0 ? `<div class="informe-empty">Sin materia asignada.</div>` : `<div class="informe-units">` +
        units.map(t=>{ const st=topics[t]||"pendiente", m=TOPIC_META[st];
          return `<div class="informe-unit" style="border-left-color:${m.fg}"><span>${esc(t)}</span><b style="color:${m.fg}">${m.label}</b></div>`;
        }).join("") + `</div>`}
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Clases del período (${sessions.length})</div>
      ${sessions.length===0 ? `<div class="informe-empty">Sin clases registradas en este período.</div>` :
        sessions.map(c=>`<div class="informe-row">
          <div class="informe-date">${esc(fmtDate(c.date))}</div>
          <div class="informe-rowbody"><b>${esc(c.topic||"Clase")}</b>${c.tarea&&c.tarea!=="sd"?` <span style="color:${TAREA_META[c.tarea].fg}">· tarea ${esc(TAREA_META[c.tarea].label)}</span>`:""}
          ${c.note?`<div class="informe-note">${esc(c.note)}</div>`:""}
          ${c.objetivo?`<div class="informe-note">🎯 ${esc(c.objetivo)}${c.objetivoResult?` — ${esc(OBJETIVO_META[c.objetivoResult.estado].label)}`:" — sin evaluar"}</div>`:""}</div></div>`).join("")}
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Objetivos de clase del período</div>
      ${(()=>{ const g=goalCounts([{sessions}]);
        return g.total===0 ? `<div class="informe-empty">Sin objetivos de clase evaluados en este período.</div>`
          : `<div class="informe-empty">${(g.si/g.total*100).toFixed(0)}% cumplidos sobre ${g.total} objetivo${g.total===1?"":"s"} evaluado${g.total===1?"":"s"}.</div>`; })()}
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Simulacros (${simulacros.length})</div>
      ${simulacros.length===0 ? `<div class="informe-empty">Sin simulacros en este período.</div>` :
        simulacros.map(c=>`<div class="informe-row">
          <div class="informe-date">${esc(fmtDate(c.date))}</div>
          <div class="informe-rowbody"><b>${esc(c.grade||"s/nota")}</b>
          ${c.note?`<div class="informe-note">${esc(c.note)}</div>`:""}</div></div>`).join("")}
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Comentario del profesor</div>
      <textarea class="informe-comment" data-f="informeComment" placeholder="Agregá un comentario para este informe…">${esc(s.informeComment||"")}</textarea>
    </div>

    <div class="informe-footer">Generado con Entreclases — ${esc(fmtDate(today()))}</div>
  </div>`;
  return h;
}
function buildInformeText(s){
  const { periodKey, fromDate, sessions, simulacros } = informeFilteredData(s);
  const units = unitsFor(s), topics = s.topics||{};
  const d = daysTo(s.examDate);
  const lines = [];
  lines.push(`*Informe de progreso — ${s.name}*`);
  lines.push(`${s.career} · ${s.subject||"materia s/d"}`);
  lines.push(`Período: ${periodRangeLabel(periodKey,fromDate)}`);
  lines.push(s.examDate ? `Examen: ${fmtDate(s.examDate)}${d!==null&&d>=0?` (en ${d} día${d===1?"":"s"})`:""}` : "Examen: sin fecha cargada");
  lines.push("");
  if(units.length){
    lines.push("*Progreso por unidad:*");
    units.forEach(t=>lines.push(`- ${t}: ${TOPIC_META[topics[t]||"pendiente"].label}`));
    lines.push("");
  }
  lines.push(`*Clases del período (${sessions.length}):*`);
  if(sessions.length===0) lines.push("Sin clases registradas.");
  else sessions.forEach(c=>{
    let l = `- ${fmtDate(c.date)}: ${c.topic||"Clase"}`;
    if(c.tarea && c.tarea!=="sd") l += ` (tarea ${TAREA_META[c.tarea].label})`;
    lines.push(l);
    if(c.note) lines.push(`  ${c.note}`);
    if(c.objetivo) lines.push(`  🎯 ${c.objetivo}${c.objetivoResult?` — ${OBJETIVO_META[c.objetivoResult.estado].label}`:" — sin evaluar"}`);
  });
  lines.push("");
  const goalTotals = goalCounts([{sessions}]);
  if(goalTotals.total>0)
    lines.push(`*Objetivos de clase cumplidos:* ${(goalTotals.si/goalTotals.total*100).toFixed(0)}% (${goalTotals.si}/${goalTotals.total})`);
  lines.push("");
  lines.push(`*Simulacros (${simulacros.length}):*`);
  if(simulacros.length===0) lines.push("Sin simulacros registrados.");
  else simulacros.forEach(c=>{
    lines.push(`- ${fmtDate(c.date)}: ${c.grade||"s/nota"}`);
    if(c.note) lines.push(`  ${c.note}`);
  });
  if(s.informeComment){
    lines.push("");
    lines.push("*Comentario del profesor:*");
    lines.push(s.informeComment);
  }
  lines.push("");
  lines.push("_Generado con Entreclases_");
  return lines.join("\n");
}

/* ============ informe como imagen (paso 107): PNG del resumen, dibujado a mano en un
   <canvas> (Canvas 2D nativo, sin ninguna librería) — pensado para mandar por WhatsApp a los
   padres. Usa siempre los colores de marca fijos (navy/teal), nunca el acento elegible del
   paso 106: es un documento que sale de la app hacia terceros, tiene que verse igual sin
   importar la preferencia personal de quien lo genera (mismo criterio que portal/landing en
   ese paso). Ver buildInformeImageBlob() más abajo y "informe-share-image" en events.js. */
function roundedRectPath(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
// Corta texto en varias líneas por ancho máximo, con un tope de líneas (el resto se recorta con
// "…") — no hace falta medir de antemano: mide letra a letra con measureText mientras dibuja.
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines){
  const words = String(text||"").split(/\s+/).filter(Boolean);
  let line = "", lines = 0, yy = y;
  for(let i=0;i<words.length;i++){
    const test = line ? line+" "+words[i] : words[i];
    if(ctx.measureText(test).width > maxWidth && line){
      lines++;
      if(lines>=maxLines){ ctx.fillText(line.replace(/\s*$/,"")+"…", x, yy); return yy; }
      ctx.fillText(line, x, yy);
      yy += lineHeight;
      line = words[i];
    } else line = test;
  }
  if(line) ctx.fillText(line, x, yy);
  return yy;
}
function statTile(ctx, x, y, w, h, value, label){
  ctx.fillStyle = "#EEF1F9";
  roundedRectPath(ctx, x, y, w, h, 12); ctx.fill();
  ctx.fillStyle = "#12192E";
  ctx.font = "800 34px Poppins, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, x+18, y+48);
  ctx.fillStyle = "#5C6480";
  ctx.font = "600 12.5px Inter, sans-serif";
  wrapCanvasText(ctx, label, x+18, y+72, w-36, 15, 2);
}
function canvasToPngBlob(canvas){
  return new Promise(resolve=>canvas.toBlob(resolve, "image/png"));
}
async function buildInformeImageBlob(s){
  const { periodKey, fromDate, sessions } = informeFilteredData(s);
  const units = unitsFor(s), topics = s.topics||{};
  const rel = units.filter(t=>topics[t]!=="noentra").length || 1;
  const seenCount = units.filter(t=>["visto","practica","parcial"].includes(topics[t])).length;
  const avancePct = units.length ? Math.round(seenCount/rel*100) : null;
  const goalTotals = goalCounts([{sessions}]);
  const objetivosPct = goalTotals.total>0 ? Math.round(goalTotals.si/goalTotals.total*100) : null;
  const comentario = (s.informeComment||"").trim();

  const W=900, H=comentario?1180:1020, SC=2; // se dibuja al doble de resolución, no se ve pixelado al abrirla en el celular
  const canvas=document.createElement("canvas");
  canvas.width=W*SC; canvas.height=H*SC;
  const ctx=canvas.getContext("2d");
  ctx.scale(SC,SC);
  if(document.fonts && document.fonts.ready) await document.fonts.ready; // evita que la tipografía caiga a un fallback genérico

  ctx.fillStyle="#F6F8FC"; ctx.fillRect(0,0,W,H);

  const grad=ctx.createLinearGradient(40,40,88,88);
  grad.addColorStop(0,"#1E2B4D"); grad.addColorStop(1,"#2F4272");
  ctx.fillStyle=grad; roundedRectPath(ctx,40,40,48,48,14); ctx.fill();
  ctx.strokeStyle="#fff"; ctx.lineWidth=3; ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.beginPath(); ctx.moveTo(52,65); ctx.lineTo(61,75); ctx.lineTo(76,55); ctx.stroke();

  ctx.fillStyle="#12192E";
  ctx.font="700 21px Poppins, sans-serif";
  ctx.fillText("Entreclases", 100, 71);

  ctx.fillStyle="#8B90A0";
  ctx.font="700 12.5px ui-monospace, Consolas, monospace";
  ctx.fillText("INFORME DE PROGRESO", 40, 122);

  ctx.fillStyle="#12192E";
  ctx.font="800 40px Poppins, sans-serif";
  let yy = wrapCanvasText(ctx, s.name||"—", 40, 168, W-80, 44, 2);

  ctx.fillStyle="#5C6480";
  ctx.font="600 16px Inter, sans-serif";
  yy += 34;
  ctx.fillText(`${s.career||""} · ${s.subject||"materia s/d"}`, 40, yy);

  ctx.fillStyle="#8B90A0";
  ctx.font="500 13.5px Inter, sans-serif";
  ctx.fillText(`Período: ${periodRangeLabel(periodKey,fromDate)}`, 40, yy+26);

  ctx.strokeStyle="#E4E9F5"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(40,yy+52); ctx.lineTo(W-40,yy+52); ctx.stroke();

  const tilesY = yy+80, tileW=(W-80-2*16)/3, tileH=120;
  statTile(ctx, 40, tilesY, tileW, tileH, avancePct!==null?avancePct+"%":"—", "avance por unidades");
  statTile(ctx, 40+tileW+16, tilesY, tileW, tileH, String(sessions.length), `clase${sessions.length===1?"":"s"} en el período`);
  statTile(ctx, 40+2*(tileW+16), tilesY, tileW, tileH, objetivosPct!==null?objetivosPct+"%":"—", "objetivos cumplidos");

  let cy = tilesY+tileH+40;
  if(comentario){
    ctx.fillStyle="#8B90A0";
    ctx.font="700 11.5px ui-monospace, Consolas, monospace";
    ctx.fillText("COMENTARIO DEL PROFESOR", 40, cy);
    ctx.fillStyle="#12192E";
    ctx.font="500 16px Inter, sans-serif";
    cy = wrapCanvasText(ctx, comentario, 40, cy+30, W-80, 24, 5) + 30;
  }

  ctx.fillStyle="#9AA3BE";
  ctx.font="500 12px ui-monospace, Consolas, monospace";
  ctx.fillText(`Generado con Entreclases — ${fmtDate(today())}`, 40, H-32);

  return canvasToPngBlob(canvas);
}

/* ============ contrato de servicio: modelo precargado con lo que la app ya sabe del alumno,
   mismo patrón visual que el informe de progreso (reutiliza sus clases .informe-*). Los campos
   editables (responsable, DNI, fecha de inicio, cláusulas adicionales) viven directo en el alumno
   (contratoResponsable/contratoDni/contratoFechaInicio/contratoClausulas) y se guardan solos con
   el data-f genérico, igual que informeComment. Los datos del docente se cargan una sola vez en
   Cuenta (ver docenteFor() en helpers.js) y se reutilizan acá. ============ */
function modalidadCobroLabel(modalidad){
  if(modalidad==="clase") return "por clase dictada";
  if(modalidad==="mensual") return "mensual, independiente de la cantidad de clases dictadas ese mes";
  return "a coordinar entre las partes";
}
function vContrato(){
  const s = sel(); if(!s) return "";
  const doc = docenteFor();
  const pol = cancelPolicyFor();
  const seniaActiva = hasSenia(s);
  const horarios = [...(s.horarios||[])].sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time));

  let h = `<div class="informe-bar no-print">
    <button class="back" style="margin:0" data-a="close-contrato">← Volver a la ficha</button>
    <div class="informe-actions">
      <button class="chip" data-a="contrato-copy">Copiar texto</button>
      <button class="primary" style="margin-left:0" data-a="contrato-print">Descargar PDF</button>
    </div>
  </div>`;

  h += `<div class="informe-doc">
    <div class="informe-eyebrow">Contrato de prestación de servicios educativos</div>
    <h1 class="informe-name">Clases particulares de ${esc(s.subject||"materia s/d")}</h1>
    <div class="informe-sub">${esc(s.career)}${s.chair?" · "+esc(s.chair):""}</div>

    <div class="informe-section">
      <div class="informe-stitle">Partes</div>
      <div class="informe-row"><div class="informe-rowbody">
        <b>Docente:</b> ${doc.nombre?esc(doc.nombre):`<span style="color:var(--faint)">completar nombre en «Cuenta»</span>`}${doc.dni?` · DNI/CUIT ${esc(doc.dni)}`:""}${doc.telefono?` · Tel. ${esc(doc.telefono)}`:""}
      </div></div>
      <div class="informe-row"><div class="informe-rowbody"><b>Alumno/a:</b> ${esc(s.name)}</div></div>
      <div class="informe-row"><div class="informe-rowbody">
        <b>Responsable</b> <span class="hint">(padre/madre/tutor, o el propio alumno si es mayor de edad)</span>
        <div class="frow" style="margin-top:6px">
          <div class="field"><input class="contrato-field" data-f="contratoResponsable" placeholder="Nombre y apellido" value="${esc(s.contratoResponsable||"")}"></div>
          <div class="field"><input class="contrato-field" data-f="contratoDni" placeholder="DNI (opcional)" value="${esc(s.contratoDni||"")}"></div>
        </div>
      </div></div>
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Objeto del servicio</div>
      <div class="informe-rowbody">El/la docente se compromete a brindar clases particulares de apoyo escolar/universitario en la materia <b>${esc(s.subject||"a definir")}</b> al alumno/a mencionado/a, con la frecuencia y en los horarios acordados entre las partes.</div>
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Horarios</div>
      ${horarios.length===0 ? `<div class="informe-empty">A coordinar entre las partes.</div>` :
        `<div class="informe-units">` + horarios.map(hr=>
          `<div class="informe-unit"><span>${esc(DIAS_SEMANA[hr.day])}</span><b>${esc(hr.time)} · ${hr.duration||60} min</b></div>`
        ).join("") + `</div>`}
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Tarifa y forma de pago</div>
      <div class="informe-rowbody">
        ${Number(s.tarifa)>0
          ? `El valor del servicio es de <b>${fmtMoney(s.tarifa)}</b>, con modalidad de cobro <b>${modalidadCobroLabel(s.modalidad)}</b>.`
          : `<span style="color:var(--faint)">Cargar la tarifa y la modalidad de cobro en la ficha del alumno para completar este párrafo.</span>`}
        ${seniaActiva ? ` Se reserva cada clase puntual con una seña de ${s.seniaTipo==="porcentaje"?`${esc(s.seniaValor)}% de la tarifa`:fmtMoney(seniaMontoFor(s))}.` : ""}
      </div>
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Cancelaciones y señas</div>
      <div class="informe-rowbody">${pol.texto ? esc(pol.texto) :
        `Las clases se cancelan con al menos ${pol.horasMinimas} hora${pol.horasMinimas===1?"":"s"} de anticipación. Con menos aviso, la seña de la clase ${pol.siATiempo==="acredita"?"no se acredita a la próxima clase":"no se devuelve"}.`}</div>
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Vigencia</div>
      <div class="informe-rowbody">El presente contrato entra en vigencia el <input type="date" class="contrato-field" data-f="contratoFechaInicio" style="display:inline-block;width:auto" value="${esc(s.contratoFechaInicio||s.startDate||today())}"> y se mantiene vigente por tiempo indeterminado, hasta que cualquiera de las partes decida darlo por finalizado, avisando con razonable anticipación.</div>
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Cláusulas adicionales</div>
      <textarea class="informe-comment contrato-field" data-f="contratoClausulas" placeholder="Agregá cláusulas propias si hace falta (opcional)…">${esc(s.contratoClausulas||"")}</textarea>
    </div>

    <div class="informe-section" style="margin-top:30px">
      <div class="contrato-firmas">
        <div class="contrato-firma"><div class="contrato-firmaline"></div><div class="informe-note">Firma docente${doc.nombre?` — Aclaración: ${esc(doc.nombre)}`:""}</div></div>
        <div class="contrato-firma"><div class="contrato-firmaline"></div><div class="informe-note">Firma responsable${s.contratoResponsable?` — Aclaración: ${esc(s.contratoResponsable)}`:""}</div></div>
      </div>
    </div>

    <div class="informe-footer" style="font-style:italic">Modelo orientativo: revisalo y adaptalo a tu caso; no constituye asesoramiento legal.</div>
    <div class="informe-footer">Generado con Entreclases — ${esc(fmtDate(today()))}</div>
  </div>`;
  return h;
}
function buildContratoText(s){
  const doc = docenteFor();
  const pol = cancelPolicyFor();
  const seniaActiva = hasSenia(s);
  const horarios = [...(s.horarios||[])].sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time));
  const lines = [];
  lines.push("CONTRATO DE PRESTACIÓN DE SERVICIOS EDUCATIVOS");
  lines.push(`Clases particulares de ${s.subject||"materia s/d"}${s.career?" — "+s.career:""}`);
  lines.push("");
  lines.push("PARTES");
  lines.push(`Docente: ${doc.nombre||"[completar en Cuenta]"}${doc.dni?` · DNI/CUIT ${doc.dni}`:""}${doc.telefono?` · Tel. ${doc.telefono}`:""}`);
  lines.push(`Alumno/a: ${s.name}`);
  lines.push(`Responsable: ${s.contratoResponsable||"________________________"}${s.contratoDni?` — DNI ${s.contratoDni}`:""}`);
  lines.push("");
  lines.push("OBJETO DEL SERVICIO");
  lines.push(`El/la docente se compromete a brindar clases particulares de apoyo escolar/universitario en la materia ${s.subject||"a definir"} al alumno/a mencionado/a, con la frecuencia y en los horarios acordados entre las partes.`);
  lines.push("");
  lines.push("HORARIOS");
  if(horarios.length===0) lines.push("A coordinar entre las partes.");
  else horarios.forEach(hr=>lines.push(`- ${DIAS_SEMANA[hr.day]} ${hr.time} · ${hr.duration||60} min`));
  lines.push("");
  lines.push("TARIFA Y FORMA DE PAGO");
  if(Number(s.tarifa)>0){
    let l = `El valor del servicio es de ${fmtMoney(s.tarifa)}, con modalidad de cobro ${modalidadCobroLabel(s.modalidad)}.`;
    if(seniaActiva) l += ` Se reserva cada clase puntual con una seña de ${s.seniaTipo==="porcentaje"?`${s.seniaValor}% de la tarifa`:fmtMoney(seniaMontoFor(s))}.`;
    lines.push(l);
  } else lines.push("[Cargar la tarifa y la modalidad de cobro en la ficha del alumno para completar este párrafo]");
  lines.push("");
  lines.push("CANCELACIONES Y SEÑAS");
  lines.push(pol.texto || `Las clases se cancelan con al menos ${pol.horasMinimas} hora${pol.horasMinimas===1?"":"s"} de anticipación. Con menos aviso, la seña de la clase ${pol.siATiempo==="acredita"?"no se acredita a la próxima clase":"no se devuelve"}.`);
  lines.push("");
  lines.push("VIGENCIA");
  lines.push(`El presente contrato entra en vigencia el ${fmtDate(s.contratoFechaInicio||s.startDate||today())} y se mantiene vigente por tiempo indeterminado, hasta que cualquiera de las partes decida darlo por finalizado, avisando con razonable anticipación.`);
  if(s.contratoClausulas){
    lines.push("");
    lines.push("CLÁUSULAS ADICIONALES");
    lines.push(s.contratoClausulas);
  }
  lines.push("");
  lines.push("_______________________________          _______________________________");
  lines.push(`Firma docente                             Firma responsable`);
  lines.push(`Aclaración: ${doc.nombre||"________________"}            Aclaración: ${s.contratoResponsable||"________________"}`);
  lines.push("");
  lines.push("Modelo orientativo: revisalo y adaptalo a tu caso; no constituye asesoramiento legal.");
  lines.push(`Generado con Entreclases — ${fmtDate(today())}`);
  return lines.join("\n");
}

/* ============ recibo de pago: mismo patrón visual que informe/contrato (reusa .informe-*),
   documento chico armado con lo que ya se sabe del cobro que lo generó (ver crearRecibo() en
   helpers.js) — no hay campos editables acá, es un comprobante fijo de lo ya cobrado. ============ */
function vRecibo(){
  const s = sel(); if(!s) return "";
  const r = reciboFor(s, state.reciboId); if(!r) return "";
  const doc = docenteFor();

  let h = `<div class="informe-bar no-print">
    <button class="back" style="margin:0" data-a="close-recibo">← Volver a la ficha</button>
    <div class="informe-actions">
      <button class="chip" data-a="recibo-copy">Copiar texto para WhatsApp</button>
      ${hasPhone(s)?`<a class="chip" target="_blank" rel="noopener" href="${waLink(s,buildReciboText(s,r))}">Enviar por WhatsApp</a>`:""}
      <button class="primary" style="margin-left:0" data-a="recibo-print">Descargar PDF</button>
    </div>
  </div>`;

  h += `<div class="informe-doc">
    <div class="informe-eyebrow">Recibo de pago</div>
    <h1 class="informe-name">Nº ${esc(r.numero)}</h1>
    <div class="informe-sub">${esc(reciboTipoLabel(r.tipo))} · ${esc(fmtDate(r.date))}</div>

    <div class="informe-section">
      <div class="informe-stitle">Partes</div>
      <div class="informe-row"><div class="informe-rowbody"><b>Alumno/a:</b> ${esc(s.name)}</div></div>
      ${doc.nombre?`<div class="informe-row"><div class="informe-rowbody"><b>Docente:</b> ${esc(doc.nombre)}</div></div>`:""}
    </div>

    <div class="informe-section">
      <div class="informe-stitle">Detalle</div>
      <div class="informe-row"><div class="informe-rowbody">${esc(r.concepto)}</div></div>
      <div class="informe-row"><div class="informe-rowbody"><b>Monto:</b> ${fmtMoney(r.monto)}</div></div>
      ${r.saldo>0?`<div class="informe-row"><div class="informe-rowbody"><b>Saldo restante:</b> ${fmtMoney(r.saldo)}</div></div>`:""}
    </div>

    <div class="informe-footer">Generado con Entreclases — ${esc(fmtDate(today()))}</div>
  </div>`;
  return h;
}

function vAuth(){
  const mode = state.authMode||"login", isLogin = mode==="login";
  const remembered = getRememberedEmails();
  const emailVal = state.authEmail || remembered[0] || "";
  const lockMs = isLogin ? loginLockRemainingMs() : 0;
  const locked = lockMs>0;
  const mainAction = isLogin?"auth-login":"auth-signup";
  return `<div style="max-width:360px;margin:64px auto 0">
    <div style="text-align:center;margin-bottom:20px">
      <div class="logo-mark" style="margin:0 auto 12px">${ICON_CHECK}</div>
      <div class="eyebrow">Clases particulares</div>
      <h1 style="font-size:22px">Entreclases</h1>
      <div style="font-size:12.5px;color:var(--muted);margin-top:4px">Vos enseñás, del resto nos ocupamos.</div>
    </div>
    <div class="formcard">
      <div class="tabs" style="margin-bottom:14px">
        ${tabbtn("auth-mode-login",isLogin,"Iniciar sesión")}
        ${tabbtn("auth-mode-signup",!isLogin,"Crear cuenta")}
      </div>
      <div class="field"><div class="flabel">Correo</div>
        <input id="auth-email" type="email" autocomplete="username" list="remembered-emails" value="${esc(emailVal)}" data-enter="${mainAction}" ${locked?"disabled":""}>
        <datalist id="remembered-emails">${remembered.map(e=>`<option value="${esc(e)}">`).join("")}</datalist>
      </div>
      <div class="field" style="margin-top:8px"><div class="flabel">Contraseña${isLogin?"":" (mínimo 6 caracteres)"}</div>
        <input id="auth-pass" type="password" autocomplete="${isLogin?"current-password":"new-password"}" data-enter="${mainAction}" ${locked?"disabled":""}></div>
      <button class="primary" style="margin:14px 0 0;margin-left:0;width:100%" data-a="${mainAction}" ${locked?"disabled":""}>${isLogin?"Iniciar sesión":"Crear cuenta"}</button>
      ${isLogin?`<button class="chip" style="margin-top:10px;border:none;background:none;padding:2px 0;color:var(--muted)" data-a="auth-forgot" ${locked?"disabled":""}>¿Olvidaste tu contraseña?</button>`:""}
      <div class="hint" id="authMsg" style="margin-top:10px;min-height:16px${locked?";color:var(--status-desaprobo-fg)":""}">${locked?esc("Demasiados intentos. Probá de nuevo en "+fmtLockRemaining(lockMs)+"."):""}</div>
    </div>
  </div>`;
}

function vConfirmEmail(){
  return `<div style="max-width:360px;margin:64px auto 0">
    <div style="text-align:center;margin-bottom:20px">
      <div class="logo-mark" style="margin:0 auto 12px">${ICON_CHECK}</div>
      <div class="eyebrow">Clases particulares</div>
      <h1 style="font-size:22px">Revisá tu correo</h1>
    </div>
    <div class="formcard">
      <div style="font-size:13.5px;margin-bottom:10px">Tu cuenta todavía no está confirmada. Te enviamos un correo a
        <b>${esc(state.pendingConfirmEmail||"")}</b> con un link de confirmación — abrilo para activarla.</div>
      <button class="primary" style="width:100%;margin-left:0" data-a="resend-confirm" ${state.confirmStatus==="sending"?"disabled":""}>Reenviar correo</button>
      <button class="chip" style="margin-top:10px;border:none;background:none;padding:2px 0;color:var(--muted)" data-a="back-to-login">← Volver a iniciar sesión</button>
      <div class="hint" id="confirmMsg" style="margin-top:10px;min-height:16px;color:${state.confirmStatus==="error"?"var(--red)":state.confirmStatus==="ok"?"var(--green)":"var(--faint)"}">${esc(confirmStatusText())}</div>
    </div>
  </div>`;
}
function confirmStatusText(){
  if(state.confirmStatus==="sending") return "Enviando…";
  if(state.confirmStatus==="ok") return "Listo, te reenviamos el correo.";
  if(state.confirmStatus==="error") return state.confirmError||"No se pudo reenviar el correo.";
  return "";
}

function vSetPassword(){
  return `<div style="max-width:360px;margin:64px auto 0">
    <div style="text-align:center;margin-bottom:20px">
      <div class="logo-mark" style="margin:0 auto 12px">${ICON_CHECK}</div>
      <div class="eyebrow">Clases particulares</div>
      <h1 style="font-size:22px">Elegí una contraseña nueva</h1>
    </div>
    <div class="formcard">
      <div class="field"><div class="flabel">Contraseña nueva (mínimo 6 caracteres)</div>
        <input id="newpass1" type="password" autocomplete="new-password" data-enter="auth-set-password"></div>
      <div class="field" style="margin-top:8px"><div class="flabel">Repetila</div>
        <input id="newpass2" type="password" autocomplete="new-password" data-enter="auth-set-password"></div>
      <button class="primary" style="margin:14px 0 0;margin-left:0;width:100%" data-a="auth-set-password">Guardar contraseña</button>
      <div class="hint" id="authMsg" style="margin-top:10px;min-height:16px"></div>
    </div>
  </div>`;
}

// Switch de recordatorios de cobro (Cuenta) + notificación del navegador — el permiso de
// Notification API recién se pide al tocar el botón (ver toggle-notif-os en events.js), nunca
// de entrada. "notifSupported" evita referenciar Notification donde no exista (apps nativas).
function vRecordatoriosCard(){
  const rec = recordatoriosFor();
  const notifSupported = typeof Notification!=="undefined";
  const notifDenied = notifSupported && Notification.permission==="denied";
  let h = `<div class="formcard"><div class="ftitle">Recordatorios de cobro</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:${rec.activo?"10px":"0"}">
      <button class="chip ${!rec.activo?"on":""}" data-a="toggle-recordatorios" data-f="no">No</button>
      <button class="chip ${rec.activo?"on":""}" data-a="toggle-recordatorios" data-f="si">Sí</button>
    </div>`;
  if(rec.activo){
    h += `<div class="field" style="max-width:260px"><div class="flabel">Avisar a partir de cuántos días de atraso</div>
      <input type="number" min="0" data-cf="rec-dias" value="${rec.diasAtraso}"></div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--soft)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div><div style="font-weight:600;font-size:13.5px">Notificación del navegador</div>
          <div class="hint" style="margin-top:2px">Los avisos aparecen al abrir la app. Push real con la app cerrada necesita servidor: queda para más adelante.</div></div>
        ${notifSupported
          ? `<button class="chip ${rec.notificacionesOS?"on":""}" data-a="toggle-notif-os">${rec.notificacionesOS?"Activada":"Desactivada"}</button>`
          : `<span class="hint">No disponible en este dispositivo</span>`}
      </div>
      ${notifDenied?`<div class="hint" style="color:var(--status-desaprobo-fg);margin-top:6px">Este navegador tiene los avisos bloqueados para el sitio — activalos desde su configuración y volvé a tocar el botón.</div>`:""}
    </div>`;
  }
  return h + `</div>`;
}
// Escala para el cierre de objetivo de clase (paso 91): Simple (Sí/A medias/No, default) o
// Porcentaje (un solo número 0-100). El resultado siempre se guarda igual (estado+pct, ver
// escalaObjetivoFor en helpers.js), así que cambiar de escala no rompe el historial ni las
// estadísticas — sólo cambia qué formulario se muestra al cerrar la próxima clase.
function vEscalaObjetivoCard(){
  const escala = escalaObjetivoFor();
  return `<div class="formcard"><div class="ftitle">Escala de valoración del objetivo de clase</div>
    <div class="hint" style="margin-bottom:10px">Cómo se responde «¿Se cumplió el objetivo?» al cerrar una clase.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="chip ${escala==="simple"?"on":""}" data-a="set-escala-objetivo" data-f="simple">Simple (Sí / A medias / No)</button>
      <button class="chip ${escala==="porcentaje"?"on":""}" data-a="set-escala-objetivo" data-f="porcentaje">Porcentaje</button>
    </div>
  </div>`;
}
function vCuenta(){
  const ses=getSes();
  const pol=cancelPolicyFor();
  const doc=docenteFor();
  return pageHead("Cuenta","Tu cuenta y preferencias") + `
  <div class="formcard"><div class="ftitle">Datos del docente</div>
    <div class="hint" style="margin-bottom:10px">Se cargan una sola vez acá y se reutilizan donde haga falta (por ahora, el generador de contratos de servicio, en la ficha de cada alumno).</div>
    <div class="frow">
      <div class="field"><div class="flabel">Nombre completo</div><input data-cf="docente-nombre" value="${esc(doc.nombre||"")}"></div>
      <div class="field"><div class="flabel">Teléfono</div><input data-cf="docente-telefono" value="${esc(doc.telefono||"")}"></div>
      <div class="field"><div class="flabel">DNI / CUIT (opcional)</div><input data-cf="docente-dni" value="${esc(doc.dni||"")}"></div>
    </div>
  </div>
  ${vRecordatoriosCard()}
  ${vEscalaObjetivoCard()}
  <div class="formcard"><div class="ftitle" style="display:flex;align-items:center;gap:7px">Política de cancelación${helpTip("cancelPolicy")}</div>
    <div class="hint" style="margin-bottom:10px">Se aplica al cancelar una clase puntual con seña ya cobrada (ver la ficha de cada alumno). El texto queda guardado para reutilizarlo donde haga falta.</div>
    <div class="frow">
      <div class="field" style="max-width:200px"><div class="flabel">Horas mínimas de aviso</div>
        <input type="number" min="0" data-cf="policy-horas" value="${pol.horasMinimas}"></div>
      <div class="field"><div class="flabel">Si cancela a tiempo, la seña…</div>
        <select data-cf="policy-atiempo">
          <option value="devuelve" ${pol.siATiempo!=="acredita"?"selected":""}>Se devuelve</option>
          <option value="acredita" ${pol.siATiempo==="acredita"?"selected":""}>Se acredita a la próxima clase</option>
        </select></div>
    </div>
    <div class="field"><div class="flabel">Texto de la política (opcional, para compartir)</div>
      <textarea data-cf="policy-texto" placeholder="Ej: Las clases se cancelan con 24hs de aviso. Con menos aviso, la seña no se devuelve.">${esc(pol.texto||"")}</textarea></div>
    <div class="hint" style="margin-top:6px">Si la seña de esa clase todavía no se cobró, cancelar no tiene ninguna consecuencia sobre ella.</div>
  </div>
  <div class="formcard"><div class="ftitle">Cuenta</div>
    <div style="font-size:13.5px;margin-bottom:6px">Conectado como <b>${esc(ses?ses.email:"")}</b></div>
    <div class="hint" style="margin-bottom:6px">${sesIsAdmin(ses)?"Cuenta de administrador":"Cuenta de profesor"}</div>
    <div class="hint" style="margin-bottom:14px">${syncStatusText()}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="chip" data-a="sync-now">Sincronizar ahora</button>
      <button class="danger" data-a="auth-logout">Cerrar sesión</button>
    </div>
    ${!IS_NATIVE?`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--soft)">
      <div class="flabel" style="margin-bottom:6px">Versión</div>
      <div class="hint" style="margin-bottom:8px">Estás usando la v${esc(APP_VERSION)}${state.swUpdateReady?" — hay una versión nueva esperando arriba de todo, tocá «Actualizar».":"."}</div>
      <button class="chip" data-a="sw-check-update" ${state.swCheckStatus==="checking"?"disabled":""}>${state.swCheckStatus==="checking"?"Buscando…":"Buscar actualización"}</button>
    </div>`:""}
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--soft)">
      <div class="flabel" style="margin-bottom:6px">Resumen semanal por mail</div>
      <div class="hint" style="margin-bottom:8px">Clases dadas, plata cobrada y pendiente, próximos exámenes/objetivos y alumnos que se están enfriando — todos los domingos a la noche.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip ${!(ses&&ses.resumenSemanal)?"on":""}" data-a="toggle-resumen-semanal" data-f="no">Apagado</button>
        <button class="chip ${(ses&&ses.resumenSemanal)?"on":""}" data-a="toggle-resumen-semanal" data-f="si">Recibir el resumen semanal por mail</button>
      </div>
    </div>
  </div>
  ${vPortalCard()}
  ${vPortalAvisosCard()}
  ${vPortalGruposCard()}
  <div class="formcard"><div class="ftitle">Apariencia</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${themeBtn("system","Según el sistema")}${themeBtn("light","Claro")}${themeBtn("dark","Oscuro")}
    </div>
    <div class="flabel" style="margin:14px 0 6px">Densidad</div>
    <div class="hint" style="margin-bottom:8px">Compacta reduce el alto de filas y tarjetas en las listas largas (estudiantes, clases, pagos, agenda, materiales) para ver más de un vistazo.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${densityBtn("comoda","Cómoda")}${densityBtn("compacta","Compacta")}
    </div>
    <div class="flabel" style="margin:14px 0 6px">Color de la app</div>
    <div class="hint" style="margin-bottom:8px">El acento de botones, pestañas y barras en toda la app — el portal para tus alumnos y la landing siguen con el color de marca.</div>
    <div class="subj-swatches">${Object.keys(ACCENT_PALETTE).map(k=>{
      const sel = getAccent()===k;
      return `<button class="subj-swatch ${sel?"sel":""}" data-a="set-accent" data-f="${k}"
        style="background:${ACCENT_PALETTE[k].light.accent}" title="${esc(ACCENT_PALETTE[k].label)}">${sel?ICON_CHECK:""}</button>`;
    }).join("")}</div>
  </div>
  <div class="formcard"><div class="ftitle">Respaldos automáticos</div>
    <div class="hint" style="margin-bottom:10px">Se guarda una copia completa una vez por día, en la primera sincronización. Se conservan las últimas ${MAX_BACKUPS}. Esto no reemplaza la copia manual (.json) del tablero — conviven.</div>
    ${vBackupsList()}
  </div>
  ${vPapeleraCard()}
  ${vCentroAyuda()}
  <div class="formcard"><div class="ftitle">Reportar un problema</div>
    <div class="field"><textarea id="report-msg" placeholder="Contanos qué pasó — cuanto más detalle, mejor.">${esc(state.reportMsg||"")}</textarea></div>
    <button class="primary" style="margin:10px 0 0;margin-left:0" data-a="send-report" ${state.reportStatus==="sending"?"disabled":""}>Enviar reporte</button>
    <div class="hint" id="reportMsg" style="margin-top:10px;min-height:16px;color:${state.reportStatus==="error"?"var(--red)":state.reportStatus==="ok"?"var(--green)":"var(--faint)"}">${esc(reportStatusText())}</div>
  </div>`;
}
// Mini centro de ayuda (paso 74): acordeón simple sobre FAQ_ITEMS (config.js), un ítem
// abierto por vez (alcanza para preguntas cortas; no hace falta que convivan varias abiertas).
const KEYBOARD_SHORTCUTS = [
  {keys:"/", desc:"Buscar alumnos, materias o materiales"},
  {keys:"N", desc:"Nuevo alumno"},
  {keys:"C", desc:"Nueva clase (con la ficha de un alumno abierta)"},
  {keys:"Esc", desc:"Cerrar el diálogo o popover abierto"},
];
function vCentroAyuda(){
  return `<div class="formcard"><div class="ftitle">Centro de ayuda</div>
    <div class="hint" style="margin-bottom:12px">Preguntas frecuentes sobre la app.</div>
    <div class="flabel" style="margin-bottom:6px">Atajos de teclado (escritorio)</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
      ${KEYBOARD_SHORTCUTS.map(k=>`<div style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--muted)">
        <kbd class="kbd">${esc(k.keys)}</kbd><span>${esc(k.desc)}</span>
      </div>`).join("")}
    </div>
    ${FAQ_ITEMS.map((it,i)=>{
      const open = state.faqOpenIdx===i;
      return `<div class="faq-item">
        <button class="faq-q" data-a="toggle-faq" data-i="${i}" aria-expanded="${open}">
          <span>${esc(it.q)}</span><span class="faq-caret ${open?"open":""}">${ICON_CHEVRON}</span>
        </button>
        ${open?`<div class="faq-a">${esc(it.a)}</div>`:""}
      </div>`;
    }).join("")}
  </div>`;
}
function themeBtn(v,label){
  return `<button class="chip ${getTheme()===v?"on":""}" data-a="set-theme" data-f="${v}">${label}</button>`;
}
function densityBtn(v,label){
  return `<button class="chip ${getDensity()===v?"on":""}" data-a="set-density" data-f="${v}">${label}</button>`;
}
function reportStatusText(){
  if(state.reportStatus==="sending") return "Enviando…";
  if(state.reportStatus==="ok") return "¡Gracias! Recibimos tu reporte.";
  if(state.reportStatus==="error") return state.reportError||"No se pudo enviar el reporte.";
  return "";
}

// Portal para tus alumnos (Cuenta) — activar/desactivar, ver/copiar el link, regenerar la
// llave y publicar el JSON público (ver migración 013_portal.sql y portal.html/js/portal.js).
function vPortalCard(){
  let h = `<div class="formcard"><div class="ftitle" style="display:flex;align-items:center;gap:7px">Portal para tus alumnos${helpTip("portal")}</div>`;
  if(state.portalError && !state.portal){
    h += `<div class="saveerr">${esc(state.portalError)}</div>
    <button class="chip" data-a="portal-reload">Reintentar</button></div>`;
    return h;
  }
  if(!state.portalLoaded || !state.portal){
    h += skeletonRows(2) + `</div>`;
    return h;
  }
  const p=state.portal;
  h += `<div class="hint" style="margin-bottom:10px">Una página pública, sin login, donde tus alumnos ven lo que quieras compartirles.</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
    <button class="chip ${!p.habilitado?"on":""}" data-a="portal-toggle" data-f="no">Desactivado</button>
    <button class="chip ${p.habilitado?"on":""}" data-a="portal-toggle" data-f="si">Activado</button>
  </div>`;
  if(!p.habilitado){
    h += emptyState(ICON_LINK,"El portal está apagado","Activalo para darles a tus alumnos un link propio, sin login, con lo que quieras compartirles.",
      `<button class="btn btn-primary" data-a="portal-toggle" data-f="si">Activar portal</button>`);
  }
  if(p.habilitado){
    h += `<div class="field"><div class="flabel">Link para compartir</div>
      <input readonly value="${esc(portalUrl(p.token))}" onclick="this.select()"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <button class="chip" data-a="portal-copy">Copiar link</button>
      <button class="chip" data-a="qr-open" data-url="${esc(portalUrl(p.token))}" data-title="Portal">Ver QR</button>
      <button class="chip" data-a="portal-regen">Regenerar llave</button>
    </div>
    <div class="hint" style="margin-top:10px">Regenerar la llave hace que el link de arriba deje de funcionar — cualquier alumno que ya lo tenga guardado pierde el acceso.</div>
    <div class="hint" style="margin-top:6px">Los archivos de la Biblioteca usan un link propio (vencimiento a los ${PORTAL_LINK_TTL_DAYS} días, se renueva solo): quien lo tenga puede reenviarlo hasta esa fecha, y regenerar la llave de arriba no lo corta.</div>`;
  }
  h += `<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--soft)">
    <div class="field"><div class="flabel">Nombre a mostrar en el portal</div>
      <input data-cf="portal-nombre" placeholder="Ej: Prof. Juan Pérez" value="${esc(p.draftNombre||"")}"></div>
    <button class="primary" style="margin:10px 0 0;margin-left:0" data-a="portal-publicar" ${state.portalSaving?"disabled":""}>Publicar cambios</button>
    ${state.portalSaveMsg?`<div class="hint" style="margin-top:8px">${esc(state.portalSaveMsg)}</div>`:""}
  </div>`;
  if(state.portalError) h += `<div class="saveerr" style="margin-top:10px">${esc(state.portalError)}</div>`;
  return h + `</div>`;
}

// Avisos del portal (paso 105): mensajes cortos con fecha que el docente publica dirigidos a
// todos los alumnos, a una materia o a un alumno puntual — aparecen como tarjeta destacada
// arriba de todo en el portal del alumno. Se guardan en publicado.avisos (saveAvisos() en
// sync.js); qué aviso ve cada llave lo decide el backend (portal_publico()), nunca el cliente.
function avisoTargetOptionsHtml(){
  let h = `<option value="">Todos los alumnos</option>`;
  if(state.catalog.subjects.length){
    h += `<optgroup label="Por materia">` + state.catalog.subjects.map(m=>
      `<option value="m:${m.id}">${esc(m.name)}</option>`).join("") + `</optgroup>`;
  }
  const studs = alive();
  if(studs.length){
    h += `<optgroup label="Por alumno">` + studs.map(s=>
      `<option value="s:${s.id}">${esc(s.name)}</option>`).join("") + `</optgroup>`;
  }
  return h;
}
function avisoTargetLabel(target){
  if(!target) return "Todos los alumnos";
  if(target.tipo==="materia"){ const m=subjById(target.subjectId); return m?"Materia: "+m.name:"Materia eliminada"; }
  if(target.tipo==="alumno"){ const s=state.students.find(x=>x.id===target.studentId); return s?s.name:"Alumno eliminado"; }
  return "Todos los alumnos";
}
function vPortalAvisosCard(){
  if(!state.portalLoaded || !state.portal) return "";
  const avisos = (state.portal.publicado && state.portal.publicado.avisos) || [];
  let h = `<div class="formcard"><div class="ftitle">Avisos para el portal</div>
    <div class="hint" style="margin-bottom:10px">Un mensaje corto que tus alumnos ven arriba de todo al entrar al portal — ej. «El jueves traé la guía 3» o «Recordá el examen del lunes» — dirigido a todos, a una materia o a un alumno puntual.</div>`;
  h += avisos.length===0 ? `<div class="hint" style="margin-bottom:10px">Todavía no publicaste ningún aviso.</div>`
    : avisos.map(a=>`<div class="log" style="align-items:flex-start">
        <div class="body">${esc(a.texto)}<div class="note">${esc(avisoTargetLabel(a.target))} · ${fmtDate(a.fecha)}</div></div>
        <button class="del" data-a="aviso-del" data-id="${a.id}" title="Borrar aviso" aria-label="Borrar aviso">×</button>
      </div>`).join("");
  h += `<div class="frow" style="margin-top:10px">
    <div class="field"><div class="flabel">Aviso</div>
      <input id="aviso-texto" placeholder="Ej: El jueves traé la guía 3" data-enter="aviso-add"></div>
    <div class="field" style="max-width:220px"><div class="flabel">Para</div>
      <select id="aviso-target">${avisoTargetOptionsHtml()}</select></div>
  </div>
  <button class="chip" data-a="aviso-add" ${state.avisoSaving?"disabled":""}>${state.avisoSaving?"Publicando…":"+ Publicar aviso"}</button>
  ${state.avisoError?`<div class="saveerr" style="margin-top:8px">${esc(state.avisoError)}</div>`:""}
  </div>`;
  return h;
}

// Llaves grupales (Cuenta → Portal, paso 94): una llave por materia, para compartirle a un grupo
// de alumnos elegido a mano la biblioteca de esa materia y las próximas clases/exámenes del
// grupo — nunca datos de un alumno en particular (ver buildGrupoBlock en sync.js). Sólo tiene
// sentido si el portal general ya está cargado (comparte fila/habilitado con la llave general y
// la individual); si no cargó todavía, vPortalCard() ya muestra el estado de carga/error.
function vPortalGruposCard(){
  if(!state.portalLoaded || !state.portal) return "";
  const subjects=state.catalog.subjects.filter(m=>alive().some(x=>x.subjectId===m.id));
  let h = `<div class="formcard"><div class="ftitle" style="display:flex;align-items:center;gap:7px">Llaves grupales${helpTip("portalGrupal")}</div>
  <div class="hint" style="margin-bottom:10px">Una llave por materia: el grupo que elijas ve la biblioteca de esa materia y las próximas clases/exámenes del grupo — nunca notas, pagos ni avance de un alumno en particular.</div>`;
  if(subjects.length===0){
    return h + `<div class="hint">Todavía no tenés materias con alumnos activos.</div></div>`;
  }
  h += subjects.map(vPortalGrupoRow).join("");
  if(state.portalGrupoError) h += `<div class="saveerr" style="margin-top:10px">${esc(state.portalGrupoError)}</div>`;
  return h + `</div>`;
}
function vPortalGrupoRow(m){
  const token=tokenForGrupo(m.id);
  const busy=state.portalGrupoBusy===m.id;
  const editing=state.portalGrupoEditing===m.id;
  const alumnosMateria=alive().filter(x=>x.subjectId===m.id);
  let h = `<div style="padding:10px 0;border-top:1px solid var(--soft)">
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:8px">${subjectDot(m.id)}<b>${esc(m.name)}</b></div>`;
  if(!token && !editing){
    h += `<button class="chip" data-a="portal-grupo-crear-abrir" data-materia="${esc(m.id)}">Generar llave grupal</button>`;
  }
  if(token && !editing){
    const incluidos=((state.portal.tokensGrupos[token]||{}).alumnos||[]).length;
    h += `<div class="field"><input readonly value="${esc(portalUrl(token))}" onclick="this.select()"></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <button class="chip" data-a="portal-grupo-copy" data-materia="${esc(m.id)}">Copiar link</button>
      <button class="chip" data-a="qr-open" data-url="${esc(portalUrl(token))}" data-title="Portal de ${esc(m.name)}">Ver QR</button>
      <button class="chip" data-a="portal-grupo-editar-abrir" data-materia="${esc(m.id)}" ${busy?"disabled":""}>Editar alumnos</button>
      <button class="chip" data-a="portal-grupo-regen" data-materia="${esc(m.id)}" ${busy?"disabled":""}>Regenerar llave</button>
      <button class="danger" data-a="portal-grupo-revoke" data-materia="${esc(m.id)}" ${busy?"disabled":""}>Borrar</button>
    </div>
    <div class="hint" style="margin-top:8px">Incluye a ${incluidos} alumno${incluidos===1?"":"s"} de ${esc(m.name)}.</div>`;
  }
  if(editing){
    const draft=state.portalGrupoDraftAlumnos||[];
    h += `<div class="hint" style="margin-bottom:6px">Marcá a quiénes incluye:</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${alumnosMateria.map(x=>`<button class="chip ${draft.includes(x.id)?"on":""}" data-a="portal-grupo-toggle-alumno" data-id="${esc(x.id)}">${esc(x.name)}</button>`).join("")}
    </div>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <button class="primary" data-a="${token?"portal-grupo-guardar":"portal-grupo-crear"}" data-materia="${esc(m.id)}" ${busy?"disabled":""}>${busy?"Guardando…":(token?"Guardar":"Generar llave")}</button>
      <button class="chip" data-a="portal-grupo-editar-cancelar">Cancelar</button>
    </div>`;
  }
  return h + `</div>`;
}

// Papelera (paso 76): alumnos y materias borrados en los últimos 7 días, con Restaurar
// completo o Eliminar definitivo. Pasados los 7 días se purgan solos (ver trashDaysLeft() en
// helpers.js) sin necesidad de tocar nada acá. Los materiales de Storage no entran acá: se
// borran aparte y son irreversibles (ver nota en sync.js).
function vTrashRow(kind, id, label, sub, deletedAt){
  const key=`${kind}:${id}`;
  const confirming = state.trashPurgeConfirmKey===key;
  const left = trashDaysLeft(deletedAt);
  if(confirming) return `<div class="log" style="align-items:center;flex-wrap:wrap">
    <div class="body"><b>${esc(label)}</b></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <span style="font-size:12.5px;color:var(--status-desaprobo-fg)">Se borra para siempre, no se puede deshacer. ¿Confirmás?</span>
      <button class="danger" data-a="trash-purge-confirm" data-key="${key}">Sí, borrar</button>
      <button class="chip" data-a="trash-purge-cancel">Cancelar</button>
    </div></div>`;
  return `<div class="log" style="align-items:center;flex-wrap:wrap">
    <div class="body"><b>${esc(label)}</b><div class="note">${esc(sub)} · se purga sola en ${left} día${left===1?"":"s"}</div></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="chip" data-a="trash-restore-${kind}" data-id="${id}">Restaurar</button>
      <button class="chip" data-a="trash-purge-ask" data-key="${key}">Eliminar definitivo</button>
    </div></div>`;
}
function vPapeleraCard(){
  const students=state.students.filter(s=>s.deleted);
  const subjects=(state.catalog.trash||[]).filter(t=>t.type==="subject");
  const total=students.length+subjects.length;
  let h = `<div class="formcard"><div class="ftitle">Papelera</div>
    <div class="hint" style="margin-bottom:10px">Alumnos y materias que borraste quedan acá 7 días por si te arrepentís — después se borran solos. Los materiales de una materia (archivos en Storage) no entran acá.</div>`;
  if(total===0){ h += `<div class="empty">Vacía por ahora.</div></div>`; return h; }
  h += students.map(s=>vTrashRow("student", s.id, s.sample?"Ejemplo eliminado":(s.name||"Sin nombre"), "Alumno", s.deletedAt||s.updatedAt)).join("");
  h += subjects.map(t=>vTrashRow("subject", t.subject.id, t.subject.name, "Materia", t.deletedAt)).join("");
  h += `</div>`;
  return h;
}
function vBackupsList(){
  if(state.backupsError) return `<div class="saveerr">${esc(state.backupsError)}</div>`;
  if(!state.backupsLoaded) return skeletonRows(3);
  const list = state.backups||[];
  if(list.length===0) return `<div class="empty">Todavía no hay respaldos guardados. El primero se crea en la próxima sincronización.</div>`;
  let h = list.map(b=>{
    const n = b.n_alumnos||0;
    const bid = String(b.id);
    const confirming = state.confirmRestoreId===bid;
    return `<div class="log" style="align-items:center;flex-wrap:wrap">
      <div class="body">${fmtDateTime(b.created_at)}<div class="note">${n} estudiante${n===1?"":"s"}</div></div>
      ${!confirming
        ? `<button class="chip" data-a="restore-ask" data-id="${esc(bid)}">Restaurar</button>`
        : `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;max-width:100%">
            <span style="font-size:12.5px;color:var(--status-desaprobo-fg)">Reemplaza tus datos actuales por los de este respaldo (antes se guarda uno extra del estado de ahora). ¿Confirmás?</span>
            <button class="danger" data-a="restore-confirm" data-id="${esc(bid)}" ${state.restoreStatus==="restoring"?"disabled":""}>Sí, restaurar</button>
            <button class="chip" data-a="restore-cancel">Cancelar</button>
          </div>`}
    </div>`;
  }).join("");
  if(state.restoreStatus==="error") h += `<div class="saveerr" style="margin-top:8px">${esc(state.restoreError)}</div>`;
  return h;
}

function vCatalog(){
  const c=state.catalog;
  let h = pageHead("Materias","Materias, carreras y materiales");
  const em = state.editSubjectId ? subjById(state.editSubjectId) : null;
  if(em){
    h += `<div class="formcard"><div class="ftitle" style="display:flex;align-items:center;gap:8px">${subjectDot(em)}Editar materia</div>
    ${em.id==="materia-ejemplo"?`<div class="hint" style="margin-bottom:12px">Esta materia viene de ejemplo para mostrar el formato de unidades — renombrala o borrala cuando quieras.</div>`:""}
    <div class="field"><div class="flabel">Nombre de la materia</div>
      <input data-cf="subj-name" value="${esc(em.name)}"></div>
    <div class="flabel" style="margin-top:12px">Color (para identificarla en toda la app)</div>
    <div class="subj-swatches">${SUBJECT_COLOR_KEYS.map(k=>{
      const sel = subjectColorKey(em)===k;
      return `<button class="subj-swatch ${sel?"sel":""}" data-a="cat-set-subject-color" data-color="${k}"
        style="background:var(--subj-${k}-fg)" title="${esc(SUBJECT_COLOR_LABELS[k])}">${sel?ICON_CHECK:""}</button>`;
    }).join("")}</div>
    <div class="flabel" style="margin-top:12px">Unidades / temas (se muestran en este orden)</div>
    ${em.units.map((u,i)=>`<div class="log" style="padding:7px 12px"><div class="body">${esc(u)}</div>
      <button class="del" data-a="cat-del-unit" data-i="${i}" title="Quitar unidad" aria-label="Quitar unidad">×</button></div>`).join("") || `<div class="empty">Sin unidades todavía. Agregá la primera acá abajo.</div>`}
    <div class="frow" style="margin-top:8px;align-items:flex-end">
      <div class="field"><input id="new-unit" placeholder="Ej: Límites y continuidad" data-enter="cat-add-unit"></div>
      <button class="chip" data-a="cat-add-unit" style="margin-bottom:2px">+ Agregar unidad</button></div>
    <button class="primary" style="margin:12px 0 0;margin-left:0" data-a="cat-close-edit">Listo</button>
    <div class="hint" style="margin-top:8px">Los cambios se guardan solos. Si quitás una unidad, los alumnos que ya la tenían registrada no pierden nada; las unidades nuevas les aparecen como «Pendiente».</div>
    </div>`;
    h += vMateriales(em.id);
    return h;
  }
  const ep = state.editPackId ? (c.packs||[]).find(p=>p.id===state.editPackId) : null;
  if(ep){
    h += `<div class="formcard"><div class="ftitle">Editar pack</div>
    <div class="field"><div class="flabel">Nombre del pack</div>
      <input data-cf="pack-name" value="${esc(ep.name)}"></div>
    <div class="flabel" style="margin-top:12px">Materias incluidas (elegí 2 o más)</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">
      ${c.subjects.map(m=>`<button class="chip ${ep.subjectIds.includes(m.id)?"on":""}" data-a="pack-toggle-subject" data-id="${m.id}">${esc(m.name)}</button>`).join("") || `<div class="empty">Todavía no hay materias creadas.</div>`}
    </div>
    ${ep.subjectIds.length<2?`<div class="hint" style="color:var(--status-desaprobo-fg)">Este pack necesita al menos 2 materias para poder usarse al dar de alta un alumno.</div>`:""}
    <button class="primary" style="margin:12px 0 0;margin-left:0" data-a="cat-close-pack-edit">Listo</button>
    <div class="hint" style="margin-top:8px">Los cambios se guardan solos. Eliminar el pack no borra las materias que agrupa.</div>
    </div>`;
    return h;
  }
  h += `<div class="formcard"><div class="ftitle">Carreras</div>
  ${c.careers.map((x,i)=>`<div class="log" style="padding:7px 12px"><div class="body">${esc(x)}</div>
    <button class="del" data-a="cat-del-career" data-i="${i}" title="Quitar" aria-label="Quitar">×</button></div>`).join("") || `<div class="empty">Sin carreras cargadas.</div>`}
  <div class="frow" style="margin-top:8px;align-items:flex-end">
    <div class="field"><input id="new-career" placeholder="Ej: Contador Público" data-enter="cat-add-career"></div>
    <button class="chip" data-a="cat-add-career" style="margin-bottom:2px">+ Agregar carrera</button></div>
  <div class="hint" style="margin-top:6px">Quitar una carrera no afecta a los alumnos que ya la tienen: la conservan en su ficha.</div></div>`;
  h += `<div class="formcard"><div class="ftitle">Materias y sus unidades</div>
  ${c.subjects.map(m=>{
    const packNames=packsContaining(m.id).map(p=>p.name);
    const confirming = state.catConfirmDelId && state.catConfirmDelId.type==="subject" && state.catConfirmDelId.id===m.id;
    if(confirming) return `<div class="row"><div class="main" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--status-desaprobo-fg)">¿Eliminar «${esc(m.name)}»? Va a la papelera por 7 días.</span>
      <button class="danger" data-a="cat-confirm-del-subject" data-id="${m.id}">Sí, eliminar</button>
      <button class="chip" data-a="cat-cancel-del">Cancelar</button></div></div>`;
    return `<div class="row" style="cursor:pointer" data-a="cat-edit-subject" data-id="${m.id}">
    <div class="main"><b style="display:inline-flex;align-items:center;gap:7px">${subjectDot(m)}${esc(m.name)}</b> ${packNames.map(n=>`<span class="pill" style="color:var(--status-aprobo-fg);background:var(--bluebg)">${esc(n)}</span>`).join(" ")}
      <div class="sub">${m.units.length} unidad${m.units.length===1?"":"es"}</div></div>
    <div style="display:flex;align-items:center;gap:4px">
      <button class="chip" data-a="cat-duplicate-subject" data-id="${m.id}" title="Duplicar materia" aria-label="Duplicar materia" style="padding:6px 10px;font-size:12px">Duplicar</button>
      <button class="del" data-a="cat-ask-del-subject" data-id="${m.id}" title="Eliminar materia" aria-label="Eliminar materia">×</button>
    </div></div>`;
  }).join("") || `<div class="empty">Sin materias cargadas.</div>`}
  <div class="flabel" style="margin-top:12px">Empezar desde una plantilla</div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">
    ${SUBJECT_TEMPLATES.map(t=>`<button class="chip" data-a="cat-add-from-template" data-id="${t.id}">${esc(t.name)}</button>`).join("")}
  </div>
  <div class="hint" style="margin-bottom:8px">Crea la materia con las unidades típicas ya cargadas — se editan como cualquier otra.</div>
  <div class="frow" style="margin-top:8px;align-items:flex-end">
    <div class="field"><input id="new-subject" placeholder="O escribí un nombre nuevo" data-enter="cat-add-subject"></div>
    <button class="chip" data-a="cat-add-subject" style="margin-bottom:2px">+ Agregar materia</button></div>
  <div class="hint" style="margin-top:6px">Al crear una materia se abre su editor para cargarle las unidades. Después, al dar de alta un alumno, la elegís de la lista y su grilla de temas se arma sola. Eliminar una materia no borra el avance de los alumnos que la usaban.</div></div>`;
  h += `<div class="formcard"><div class="ftitle">Packs</div>
  <div class="hint" style="margin-bottom:10px">Un pack agrupa varias materias para dar de alta al alumno en todas de una — ej. «Ingreso a Medicina».</div>
  ${(c.packs||[]).map(p=>{
    const names=p.subjectIds.map(id=>{const m=subjById(id); return m?m.name:null;}).filter(Boolean);
    const confirming = state.catConfirmDelId && state.catConfirmDelId.type==="pack" && state.catConfirmDelId.id===p.id;
    if(confirming) return `<div class="row"><div class="main" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--status-desaprobo-fg)">¿Eliminar el pack «${esc(p.name)}»?</span>
      <button class="danger" data-a="cat-confirm-del-pack" data-id="${p.id}">Sí, eliminar</button>
      <button class="chip" data-a="cat-cancel-del">Cancelar</button></div></div>`;
    return `<div class="row" style="cursor:pointer" data-a="cat-edit-pack" data-id="${p.id}">
    <div class="main"><b>${esc(p.name)}</b><div class="sub">${names.length} materia${names.length===1?"":"s"}${names.length?": "+esc(names.join(", ")):""}</div></div>
    <button class="del" data-a="cat-ask-del-pack" data-id="${p.id}" title="Eliminar pack" aria-label="Eliminar pack">×</button></div>`;
  }).join("") || `<div class="empty">Sin packs todavía.</div>`}
  <div class="field" style="margin-top:10px"><div class="flabel">Nombre del pack nuevo</div>
    <input id="new-pack-name" data-cf="new-pack-name" placeholder="Ej: Ingreso a Medicina" value="${esc(state.newPackName||"")}" data-enter="cat-add-pack"></div>
  <div class="flabel" style="margin-top:10px">Materias del pack (elegí 2 o más)</div>
  <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px">
    ${c.subjects.length ? c.subjects.map(m=>`<button class="chip ${(state.newPackSubjects||[]).includes(m.id)?"on":""}" data-a="toggle-newpack-subject" data-id="${m.id}">${esc(m.name)}</button>`).join("") : `<div class="empty">Primero creá alguna materia.</div>`}
  </div>
  ${state.newPackError?`<div class="saveerr">${esc(state.newPackError)}</div>`:""}
  <button class="chip" data-a="cat-add-pack">+ Crear pack</button>
  <div class="hint" style="margin-top:6px">Eliminar un pack no borra las materias que agrupa.</div></div>`;
  return h;
}

/* ============ materiales de una materia (dentro de su editor) ============ */
function vMateriales(subjectId){
  let h = `<div class="formcard"><div class="ftitle" style="display:flex;align-items:center;gap:8px">${subjectDot(subjectId)}Materiales</div>`;
  if(!navigator.onLine || state.materialesError==="offline"){
    h += `<div class="hint">Necesitás conexión a internet para ver y subir materiales.</div></div>`;
    return h;
  }
  if(state.materialesSubjectId!==subjectId || !state.materialesLoaded){
    h += skeletonRows(2) + `</div>`;
    return h;
  }
  if(state.materialesError){
    h += `<div class="saveerr">${esc(state.materialesError)}</div>
    <button class="chip" data-a="mat-reload" data-id="${subjectId}">Reintentar</button></div>`;
    return h;
  }
  const list = state.materialesList||[];
  const totalBytes = materialesTotalBytes();
  const totalPct = Math.min(100, totalBytes/MATERIAL_MAX_TOTAL_BYTES*100);
  const totalBarColor = totalPct>=90 ? "var(--red)" : totalPct>=70 ? "var(--amber)" : "var(--green)";
  h += `<div role="progressbar" aria-label="Espacio usado en materiales" aria-valuenow="${totalPct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"
    style="background:var(--soft);border-radius:99px;height:10px;overflow:hidden;margin-bottom:6px">
    <div style="height:100%;width:${totalPct.toFixed(1)}%;background:${totalBarColor};border-radius:99px"></div>
  </div>
  <div class="hint" style="margin-bottom:10px">${fmtBytes(totalBytes)} de ${fmtBytes(MATERIAL_MAX_TOTAL_BYTES)} usados (entre todas tus materias)</div>
  <div class="hint" style="margin-bottom:10px">${list.length}/${MATERIAL_MAX_COUNT} archivos · máx. ${fmtBytes(MATERIAL_MAX_BYTES)} cada uno</div>`;
  h += `<div class="hint" style="margin-bottom:8px">Tocá «Compartir» para incluir un archivo en la Biblioteca del portal para alumnos — después hace falta tocar «Publicar cambios» en Cuenta para que se vea (dejar de compartir o borrar el archivo lo saca del portal al toque).</div>`;
  h += list.length===0 ? emptyState(ICON_BOOK,"Sin materiales todavía","Subí guías, resúmenes o ejercicios con el botón de abajo — quedan disponibles en cualquier dispositivo.") : list.map(f=>{
    const dn=materialDisplayName(f.name);
    const size=(f.metadata&&f.metadata.size)||0;
    const confirming = state.materialesConfirmDelName===f.name;
    const idxEntry=materialIndexEntry(subjectId, f.name);
    const compartido=!!(idxEntry && idxEntry.compartido);
    return `<div class="log" style="align-items:center;flex-wrap:wrap">
      <div class="body">${esc(dn)}<div class="note">${fmtBytes(size)} · ${fmtDateTime(f.updated_at||f.created_at)}</div></div>
      ${!confirming ? `<button class="chip ${compartido?"on":""}" data-a="mat-toggle-share" data-id="${subjectId}" data-name="${esc(f.name)}" title="Compartir en el portal de alumnos">${compartido?"Compartido":"Compartir"}</button>
        <button class="chip" data-a="mat-download" data-id="${subjectId}" data-name="${esc(f.name)}">Descargar</button>
        <button class="del" data-a="mat-del-ask" data-name="${esc(f.name)}" title="Borrar" aria-label="Borrar">×</button>`
      : `<span style="font-size:12px;color:var(--status-desaprobo-fg)">¿Borrar «${esc(dn)}»?</span>
        <button class="danger" data-a="mat-del-confirm" data-id="${subjectId}" data-name="${esc(f.name)}" ${state.materialesDeleteStatus==="deleting"?"disabled":""}>Sí, borrar</button>
        <button class="chip" data-a="mat-del-cancel">Cancelar</button>`}
    </div>`;
  }).join("");
  if(state.materialesUploadError) h += `<div class="saveerr" style="margin-top:8px">${esc(state.materialesUploadError)}</div>`;
  const full = list.length>=MATERIAL_MAX_COUNT;
  const totalFull = totalBytes>=MATERIAL_MAX_TOTAL_BYTES;
  const blocked = full||totalFull;
  h += `<div class="frow" style="margin-top:10px;align-items:flex-end">
    <div class="field"><div class="flabel">Subir archivo (máx. ${fmtBytes(MATERIAL_MAX_BYTES)})</div>
      <input type="file" id="mat-file" ${blocked||state.materialesUploading?"disabled":""}></div>
    <button class="chip" data-a="mat-upload" data-id="${subjectId}" style="margin-bottom:2px" ${blocked||state.materialesUploading?"disabled":""}>${state.materialesUploading?"Subiendo…":"+ Subir"}</button>
  </div>
  ${full?`<div class="hint" style="margin-top:6px">Llegaste al máximo de ${MATERIAL_MAX_COUNT} archivos para esta materia.</div>`:""}
  ${!full&&totalFull?`<div class="hint" style="margin-top:6px">Llegaste al máximo de ${fmtBytes(MATERIAL_MAX_TOTAL_BYTES)} entre todas tus materias.</div>`:""}
  </div>`;
  return h;
}

/* ============ estadísticas por materia (todos los usuarios) ============ */
function subjectsWithStudents(){
  return state.catalog.subjects.filter(m => alive().some(s=>s.subjectId===m.id));
}
function defaultStatsSubjectId(){
  const subs = subjectsWithStudents();
  if(subs.length===0) return null;
  let best=subs[0], bestCount=-1;
  subs.forEach(m=>{
    const c = alive().filter(s=>s.subjectId===m.id && s.status==="activo").length;
    if(c>bestCount){ bestCount=c; best=m; }
  });
  return best.id;
}
function topicProgressPct(s){
  const units=unitsFor(s); if(units.length===0) return null;
  const topics=s.topics||{};
  const entran=units.filter(t=>topics[t]!=="noentra");
  if(entran.length===0) return null;
  const parcial=entran.filter(t=>topics[t]==="parcial").length;
  return parcial/entran.length*100;
}
// Una columna por categoría: barra (alto proporcional al total del grupo), número y label.
function semaforoBars(counts){
  const total=Object.values(counts).reduce((a,b)=>a+b,0)||1;
  const order=[["verde","Encaminado"],["amarillo","En riesgo"],["rojo","Complicado"],["sd","Sin evaluar"]];
  return `<div style="display:flex;gap:16px;margin-bottom:20px">` +
    order.map(([k,lbl])=>{
      const v=counts[k]||0, hgt=Math.max(2,Math.round(v/total*70));
      return `<div style="flex:1;max-width:80px;display:flex;flex-direction:column;align-items:center">
        <div style="height:70px;width:100%;display:flex;align-items:flex-end;justify-content:center">
          <div class="grow-v" title="${esc(lbl)}: ${v}" style="width:28px;background:${SEM_META[k].color};border-radius:4px 4px 0 0;height:${hgt}px"></div>
        </div>
        <b style="font-family:var(--mono);font-size:13px;margin-top:4px">${v}</b>
        <div class="hint" style="text-align:center">${esc(lbl)}</div>
      </div>`;
    }).join("") + `</div>`;
}
// Comparar períodos (paso 104): dos meses elegidos lado a lado — ingresos, clases dadas, horas,
// alumnos con clase y % de objetivos cumplidos — todo calculado del historial local
// (statsPeriodSummary() en helpers.js), sin ningún dato nuevo guardado. Mismo lenguaje visual que
// el resto de Estadísticas: fila de progreso con el valor siempre visible al lado (nunca sólo la
// barra) y trendBadge() para la diferencia con flecha (paso 79, ya usado en Retención).
function compareBarRow(label, val, max, fmt, color){
  const pct = max>0 ? Math.min(100, Math.round(val/max*100)) : 0;
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">
    <div style="width:120px;flex-shrink:0;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</div>
    <div role="progressbar" aria-label="${esc(label)}" aria-valuenow="${val}" aria-valuemin="0"
      style="flex:1;background:var(--soft);border-radius:4px;overflow:hidden;height:14px">
      <div class="grow-h" style="width:${pct}%;background:${color}"></div>
    </div>
    <div style="width:90px;text-align:right;font-family:var(--mono);font-size:12px;color:var(--muted)">${fmt(val)}</div>
  </div>`;
}
function compareMetricRow(title, labelA, labelB, valA, valB, fmt){
  const max = Math.max(1, valA, valB);
  return `<div class="stitle">${esc(title)}</div>`
    + compareBarRow(labelA, valA, max, fmt, "var(--accent)")
    + compareBarRow(labelB, valB, max, fmt, "var(--gray2)")
    + trendBadge(valA, valB, labelB);
}
// % de objetivos cumplidos: la diferencia se muestra en puntos porcentuales (no % relativo como
// trendBadge, que confundiría "% de cambio de un %") — mismo criterio de color/flecha.
function compareObjetivosRow(a, b, labelA, labelB){
  let h = `<div class="stitle">% de objetivos cumplidos</div>`;
  if(a.objetivosTotal===0 && b.objetivosTotal===0)
    return h + `<div class="empty">Sin objetivos de clase evaluados en ninguno de los dos períodos.</div>`;
  const fmtPct = (v,total) => v===null ? "sin datos" : `${v.toFixed(0)}% (${total})`;
  h += compareBarRow(labelA, a.objetivosPct||0, 100, v=>fmtPct(a.objetivosPct,a.objetivosTotal), "var(--accent)");
  h += compareBarRow(labelB, b.objetivosPct||0, 100, v=>fmtPct(b.objetivosPct,b.objetivosTotal), "var(--gray2)");
  if(a.objetivosPct===null || b.objetivosPct===null){
    h += `<div class="hint" style="margin-bottom:6px">Sin objetivos evaluados en uno de los dos períodos — no se puede comparar la diferencia.</div>`;
  }else{
    const diff = a.objetivosPct-b.objetivosPct;
    const flat = Math.round(diff)===0;
    const color = flat?"var(--muted)":(diff>0?"var(--green)":"var(--red)");
    const arrow = flat?"→":(diff>0?"↑":"↓");
    h += `<div class="hint" style="margin-bottom:6px"><span style="color:${color};font-weight:700;font-family:var(--mono)">${arrow} ${Math.abs(diff).toFixed(0)} pto${Math.abs(diff)>=2?"s":""}</span> vs. ${esc(labelB)}</div>`;
  }
  return h;
}
function vEstadisticasComparar(){
  const keys = recentMonthKeys(24);
  const mkA = keys.includes(state.compareA) ? state.compareA : monthKeyOffset(0);
  const mkB = keys.includes(state.compareB) ? state.compareB : monthKeyOffset(-1);
  state.compareA = mkA; state.compareB = mkB;

  let h = `<div class="frow" style="align-items:flex-end;margin-bottom:14px">
    <div class="field" style="max-width:220px">
      <div class="flabel">Período A</div>
      <select data-cf="compare-a">${keys.map(k=>`<option value="${k}" ${k===mkA?"selected":""}>${esc(monthLabel(k))}</option>`).join("")}</select>
    </div>
    <div class="field" style="max-width:220px">
      <div class="flabel">Período B</div>
      <select data-cf="compare-b">${keys.map(k=>`<option value="${k}" ${k===mkB?"selected":""}>${esc(monthLabel(k))}</option>`).join("")}</select>
    </div>
    <button class="chip" data-a="compare-prev-month" style="margin-bottom:2px">Este mes vs. anterior</button>
    <button class="chip" data-a="compare-last-year" style="margin-bottom:2px">Mismo mes, año pasado</button>
  </div>`;

  if(mkA===mkB) h += `<div class="hint" style="margin-bottom:14px">Elegiste el mismo período dos veces — cambiá uno para ver una diferencia real.</div>`;

  const a = statsPeriodSummary(mkA), b = statsPeriodSummary(mkB);
  const labelA = monthLabel(mkA), labelB = monthLabel(mkB);

  h += compareMetricRow("Ingresos cobrados", labelA, labelB, a.ingresos, b.ingresos, fmtMoney);
  h += compareMetricRow("Clases dadas", labelA, labelB, a.clases, b.clases, v=>String(v));
  h += compareMetricRow("Horas dictadas", labelA, labelB, a.horas, b.horas, v=>v.toFixed(1));
  h += compareMetricRow("Alumnos con clase", labelA, labelB, a.alumnosConClase, b.alumnosConClase, v=>String(v));
  h += compareObjetivosRow(a, b, labelA, labelB);

  return h;
}
function vEstadisticas(){
  let h = pageHead("Estadísticas","Panorama del grupo");
  h += `<div class="tabs" style="margin-bottom:16px">
    <button class="tabbtn ${(state.statsMode||"normal")==="normal"?"on":""}" data-a="stats-mode" data-m="normal">Vista normal</button>
    <button class="tabbtn ${state.statsMode==="comparar"?"on":""}" data-a="stats-mode" data-m="comparar">Comparar períodos</button>
  </div>`;
  if(state.statsMode==="comparar") return h + vEstadisticasComparar();

  const subs = subjectsWithStudents();
  if(subs.length===0) return h + `<div class="empty">Todavía no hay alumnos con una materia asignada.</div>`;

  const curId = subs.some(m=>m.id===state.statsSubjectId) ? state.statsSubjectId : subs[0].id;
  h += `<div class="field" style="max-width:320px;margin-bottom:18px">
    <div class="flabel">Materia</div>
    <select data-cf="stats-subject">
      ${subs.map(m=>`<option value="${m.id}" ${m.id===curId?"selected":""}>${esc(m.name)}</option>`).join("")}
    </select></div>`;

  const grupo = alive().filter(s=>s.subjectId===curId && s.status==="activo");
  const conExamen = grupo.filter(s=>s.examDate && daysTo(s.examDate)!==null && daysTo(s.examDate)>=0);
  const proximo = conExamen.length ? [...conExamen].sort((a,b)=>daysTo(a.examDate)-daysTo(b.examDate))[0] : null;

  h += `<div class="stats" style="margin-bottom:6px">
    <div class="stat"><b>${countSpan(grupo.length)}</b><span>alumnos activos</span></div>
    <div class="stat"><b>${countSpan(conExamen.length)}</b><span>con examen a la vista</span></div>
  </div>`;
  h += proximo
    ? `<div class="hint" style="margin-bottom:20px">Más próximo: <b>${esc(proximo.name)}</b> — ${daysTo(proximo.examDate)===0?"hoy":"en "+daysTo(proximo.examDate)+" día"+(daysTo(proximo.examDate)===1?"":"s")} (${fmtDate(proximo.examDate)})</div>`
    : `<div style="margin-bottom:20px"></div>`;

  h += `<div class="stitle">Semáforo del grupo</div>`;
  const semCounts={verde:0,amarillo:0,rojo:0,sd:0};
  grupo.forEach(s=>{ const v=s.semaforo||"sd"; semCounts[v]=(semCounts[v]||0)+1; });
  h += semaforoBars(semCounts);

  h += `<div class="stitle">Avance promedio de temas</div>`;
  const progresos = grupo.map(topicProgressPct).filter(p=>p!==null);
  if(progresos.length===0){
    h += `<div class="empty">Sin datos de temas todavía.</div>`;
  }else{
    const avg = progresos.reduce((a,b)=>a+b,0)/progresos.length;
    h += `<div class="stats" style="margin-bottom:8px"><div class="stat"><b>${countSpan(avg,{decimals:0,suffix:"%"})}</b><span>en nivel parcial, promedio del grupo</span></div></div>
    <div role="progressbar" aria-label="Avance promedio de temas" aria-valuenow="${avg.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"
      style="background:var(--soft);border-radius:99px;height:14px;overflow:hidden;max-width:320px;margin-bottom:20px">
      <div class="grow-h" style="height:100%;width:${avg.toFixed(1)}%;background:var(--green);border-radius:99px"></div>
    </div>`;
  }

  h += `<div class="stitle">Simulacros (últimos 30 días)</div>`;
  const notas=[];
  grupo.forEach(s=>(s.simulacros||[]).forEach(sim=>{
    if(!sim.date) return;
    const diasTranscurridos=-daysTo(sim.date);
    if(diasTranscurridos<0 || diasTranscurridos>30) return;
    const n=parseFloat(String(sim.grade||"").replace(",","."));
    if(!isNaN(n)) notas.push(n);
  }));
  h += notas.length
    ? `<div class="stats"><div class="stat"><b>${countSpan(notas.reduce((a,b)=>a+b,0)/notas.length,{decimals:1})}</b><span>promedio (${notas.length} simulacro${notas.length===1?"":"s"})</span></div></div>`
    : `<div class="empty">Sin simulacros recientes.</div>`;

  h += `<div class="stitle">Tasa de aprobación de esta materia</div>`;
  const materiaResult = examResultCounts(alive().filter(s=>s.subjectId===curId));
  h += materiaResult.total===0
    ? `<div class="empty">Sin resultados de examen registrados en esta materia todavía.</div>`
    : `<div class="stats"><div class="stat"><b>${countSpan(materiaResult.aprobo/materiaResult.total*100,{suffix:"%"})}</b><span>aprobados sobre ${materiaResult.total} examen${materiaResult.total===1?"":"es"} rendido${materiaResult.total===1?"":"s"}</span></div></div>`;

  h += `<div class="stitle">Objetivos de clase cumplidos en esta materia</div>`;
  const materiaGoals = goalCounts(alive().filter(s=>s.subjectId===curId));
  h += materiaGoals.total===0
    ? `<div class="empty">Sin objetivos de clase evaluados todavía en esta materia.</div>`
    : `<div class="stats"><div class="stat"><b>${countSpan(materiaGoals.si/materiaGoals.total*100,{suffix:"%"})}</b><span>cumplidos sobre ${materiaGoals.total} objetivo${materiaGoals.total===1?"":"s"} evaluado${materiaGoals.total===1?"":"s"}</span></div></div>`;

  h += vAula(grupo);
  h += vTuActividad();
  h += vTasaAprobacionGeneral();
  h += vObjetivosGeneral();
  h += vRetencion();
  h += vSaludDelMes();
  return h;
}

// Retención (paso 79): duración promedio de un alumno (de su primera a su última clase
// registrada) y altas/bajas por mes — mismo estilo de gráfico que el resto (barRow/signedBarChart,
// paso 57: CSS/SVG puro, valor siempre visible). "Alta" = por s.startDate; "baja" = alumnos en
// estado "dejo", aproximando la fecha de baja con updatedAt (no hay un campo de fecha de baja
// dedicado) — la más cercana disponible sin agregar un campo nuevo al modelo.
function vRetencion(){
  let h = `<div class="stitle" style="margin-top:30px">Retención</div>`;
  const students = alive();

  const durations = students.map(s=>{
    const dates=(s.sessions||[]).map(c=>c.date).filter(Boolean).sort();
    if(dates.length<2) return null;
    return (new Date(dates[dates.length-1]+"T12:00:00")-new Date(dates[0]+"T12:00:00"))/86400000/30.44;
  }).filter(v=>v!==null);
  h += `<div class="stitle">Duración promedio de un alumno</div>`;
  h += durations.length===0
    ? `<div class="empty">Hace falta más de una clase registrada por alumno para calcular esto.</div>`
    : `<div class="stats" style="margin-bottom:16px"><div class="stat"><b>${countSpan(durations.reduce((a,b)=>a+b,0)/durations.length,{decimals:1})}</b><span>meses en promedio, de la 1ª a la última clase (${durations.length} alumno${durations.length===1?"":"s"} con 2+ clases)</span></div></div>`;

  h += `<div class="stitle">Altas y bajas por mes (últimos 6)</div>`;
  const keys = recentMonthKeys(6).reverse();
  const mkOfTs = ts => ts ? new Date(ts).toISOString().slice(0,7) : "";
  const altas = keys.map(mk=>students.filter(s=>monthKeyOf(s.startDate)===mk).length);
  const bajas = keys.map(mk=>students.filter(s=>s.status==="dejo" && mkOfTs(s.updatedAt)===mk).length);
  const totalAltas = altas.reduce((a,b)=>a+b,0), totalBajas = bajas.reduce((a,b)=>a+b,0);
  if(totalAltas===0 && totalBajas===0){
    h += `<div class="empty">Sin altas ni bajas en los últimos 6 meses.</div>`;
  }else{
    h += `<div class="stats" style="margin-bottom:8px">
      <div class="stat"><b>${countSpan(totalAltas)}</b><span>altas</span></div>
      <div class="stat"><b>${countSpan(totalBajas)}</b><span>bajas</span></div>
    </div>`;
    h += `<div class="hint" style="margin-bottom:6px">Neto por mes (altas − bajas) — verde: crece, rojo: baja</div>`;
    const axisLabels = keys.map(monthLabelShort);
    const dataset = keys.map((mk,i)=>({label:monthLabel(mk), v:altas[i]-bajas[i]}));
    h += signedBarChart(dataset, axisLabels, v=>(v>0?"+":"")+v);
  }
  return h;
}

// Salud del mes (paso 79): activos vs. "enfriándose" vs. inactivos, según hace cuánto no tienen
// una clase registrada — con un chip de alerta por cada alumno que se está enfriando o inactivo,
// para poder escribirle directo desde acá (data-a="open" abre su ficha).
const SALUD_ENFRIANDO_SEMANAS = 3, SALUD_INACTIVO_SEMANAS = 6;
function vSaludDelMes(){
  let h = `<div class="stitle" style="margin-top:30px">Salud del mes</div>`;
  const activos = alive().filter(s=>s.status==="activo");
  if(activos.length===0) return h + `<div class="empty">Sin alumnos activos todavía.</div>`;
  const semanasSin = s=>{ const last=lastSessionDate(s); return last===null ? Infinity : daysSince(last)/7; };
  const recientes = activos.filter(s=>semanasSin(s)<=SALUD_ENFRIANDO_SEMANAS);
  const enfriando = activos.filter(s=>{ const w=semanasSin(s); return w>SALUD_ENFRIANDO_SEMANAS && w<=SALUD_INACTIVO_SEMANAS; });
  const inactivos = activos.filter(s=>semanasSin(s)>SALUD_INACTIVO_SEMANAS);
  h += `<div class="stats" style="margin-bottom:12px">
    <div class="stat"><b>${countSpan(recientes.length)}</b><span>con clase en las últimas ${SALUD_ENFRIANDO_SEMANAS} semanas</span></div>
    <div class="stat"><b>${countSpan(enfriando.length)}</b><span>enfriándose (${SALUD_ENFRIANDO_SEMANAS}–${SALUD_INACTIVO_SEMANAS} semanas)</span></div>
    <div class="stat"><b>${countSpan(inactivos.length)}</b><span>inactivos (${SALUD_INACTIVO_SEMANAS}+ semanas o nunca)</span></div>
  </div>`;
  const alertList=[...enfriando, ...inactivos];
  h += alertList.length===0 ? `<div class="hint">Ningún alumno activo se está enfriando — todos con clase reciente.</div>`
    : `<div style="display:flex;flex-wrap:wrap;gap:6px">` + alertList.map(s=>{
        const w=semanasSin(s);
        const label = w===Infinity ? "nunca tuvo clase" : `hace ${Math.floor(w)} semana${Math.floor(w)===1?"":"s"}`;
        return `<button class="chip" style="color:var(--status-desaprobo-fg);border-color:var(--status-desaprobo-fg)" data-a="open" data-id="${s.id}">${esc(s.name)} · ${label}</button>`;
      }).join("") + `</div>`;
  return h;
}

// Tasa de objetivos de clase cumplidos (todas las materias) + desglose por materia — mismo
// patrón que vTasaAprobacionGeneral, independiente de la materia seleccionada arriba.
function vObjetivosGeneral(){
  let h = `<div class="stitle" style="margin-top:30px">Objetivos de clase cumplidos (todas las materias)</div>`;
  const students = alive();
  const general = goalCounts(students);
  if(general.total===0) return h + `<div class="empty">Todavía no hay objetivos de clase evaluados.</div>`;
  const pct = general.si/general.total*100;
  h += `<div class="stats" style="margin-bottom:8px"><div class="stat"><b>${countSpan(pct,{suffix:"%"})}</b><span>cumplidos sobre ${general.total} objetivo${general.total===1?"":"s"} evaluado${general.total===1?"":"s"}</span></div></div>
  <div role="progressbar" aria-label="Objetivos de clase cumplidos" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"
    style="background:var(--soft);border-radius:99px;height:14px;overflow:hidden;max-width:320px;margin-bottom:16px">
    <div class="grow-h" style="height:100%;width:${pct.toFixed(1)}%;background:var(--green);border-radius:99px"></div>
  </div>`;

  const bySubject = state.catalog.subjects
    .map(m=>({label:m.name, subjectId:m.id, c:goalCounts(students.filter(s=>s.subjectId===m.id))}))
    .filter(x=>x.c.total>0)
    .map(x=>({label:x.label, subjectId:x.subjectId, c:{aprobo:x.c.si, total:x.c.total}}));
  const sinMateria = goalCounts(students.filter(s=>!s.subjectId));
  if(sinMateria.total>0) bySubject.push({label:"Materia s/d", c:{aprobo:sinMateria.si, total:sinMateria.total}});
  if(bySubject.length>1) h += tasaAprobacionBars(bySubject);
  return h;
}

// Tasa de aprobación general (todas las materias) + desglose por materia — independiente
// de la materia seleccionada arriba, como "Tu actividad".
function vTasaAprobacionGeneral(){
  let h = `<div class="stitle" style="margin-top:30px">Tasa de aprobación (todas las materias)</div>`;
  const students = alive();
  const general = examResultCounts(students);
  if(general.total===0) return h + `<div class="empty">Todavía no hay resultados de examen registrados.</div>`;
  const pct = general.aprobo/general.total*100;
  h += `<div class="stats" style="margin-bottom:8px"><div class="stat"><b>${countSpan(pct,{suffix:"%"})}</b><span>aprobados sobre ${general.total} examen${general.total===1?"":"es"} rendido${general.total===1?"":"s"}</span></div></div>
  <div role="progressbar" aria-label="Tasa de aprobación general" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"
    style="background:var(--soft);border-radius:99px;height:14px;overflow:hidden;max-width:320px;margin-bottom:16px">
    <div class="grow-h" style="height:100%;width:${pct.toFixed(1)}%;background:var(--green);border-radius:99px"></div>
  </div>`;

  const bySubject = state.catalog.subjects
    .map(m=>({label:m.name, subjectId:m.id, c:examResultCounts(students.filter(s=>s.subjectId===m.id))}))
    .filter(x=>x.c.total>0);
  const sinMateria = examResultCounts(students.filter(s=>!s.subjectId));
  if(sinMateria.total>0) bySubject.push({label:"Materia s/d", c:sinMateria});
  if(bySubject.length>1) h += tasaAprobacionBars(bySubject);
  return h;
}
function tasaAprobacionBars(entries){
  return entries.map(({label,subjectId,c})=>{
    const pct=Math.round(c.aprobo/c.total*100);
    const color = subjectId ? `var(--subj-${subjectColorKey(subjectId)}-fg)` : "var(--gray2)";
    return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div style="width:130px;flex-shrink:0;font-size:12.5px;color:var(--muted);white-space:nowrap;
        overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:6px" title="${esc(label)}">
        ${subjectId?subjectDot(subjectId):""}${esc(label)}</div>
      <div role="progressbar" aria-label="${esc(label)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
        style="flex:1;background:var(--soft);border-radius:4px;overflow:hidden;height:14px">
        <div class="subj-bar grow-h" style="width:${pct}%;background:${color}"></div>
      </div>
      <div style="width:70px;text-align:right;font-family:var(--mono);font-size:12px;color:var(--muted)">${pct}% (${c.total})</div>
    </div>`;
  }).join("");
}

// Orden de "el aula": examen más próximo primero; sin fecha, al final.
function aulaOrder(list){
  return [...list].sort((a,b)=>{
    const da = a.examDate ? daysTo(a.examDate) : Infinity;
    const db = b.examDate ? daysTo(b.examDate) : Infinity;
    return da-db;
  });
}
function deskHtml(s){
  const sem = s.semaforo||"sd";
  const color = SEM_META[sem].color;
  const pct = topicProgressPct(s);
  const pctVal = pct===null ? 0 : Math.round(pct);
  const d = s.examDate ? daysTo(s.examDate) : null;
  const showBadge = d!==null && d>=0 && d<=14;
  const done = hasCurrentExamResult(s);
  const firstName = (s.name||"").trim().split(/\s+/)[0] || "—";
  const title = `${s.name||"—"} — ${SEM_META[sem].label} — avance: ${pctVal}%${done?" — ya rindió":""}`;
  return `<button class="desk" data-a="open" data-id="${esc(s.id)}" title="${esc(title)}">
    <div class="desk-top"><div class="desk-progress grow-h" style="width:${pctVal}%"></div></div>
    <div class="desk-body" style="background:${color}">
      ${showBadge?`<span class="desk-badge">${d===0?"hoy":d+"d"}</span>`:""}
      ${done?`<span class="desk-done" title="Ya rindió este examen">✓</span>`:""}
    </div>
    <div class="desk-name">${esc(firstName)}</div>
  </button>`;
}
function vAula(grupo){
  let h = `<div class="stitle" style="margin-top:26px">El aula</div>`;
  if(grupo.length===0) return h + `<div class="empty">Sin alumnos activos para mostrar acá.</div>`;

  h += `<div class="aula-legend">
    <span><span class="sw" style="background:${SEM_META.verde.color}"></span>${SEM_META.verde.label}</span>
    <span><span class="sw" style="background:${SEM_META.amarillo.color}"></span>${SEM_META.amarillo.label}</span>
    <span><span class="sw" style="background:${SEM_META.rojo.color}"></span>${SEM_META.rojo.label}</span>
    <span><span class="sw" style="background:${SEM_META.sd.color}"></span>${SEM_META.sd.label}</span>
    <span>Barra arriba del banco: % de temas en nivel parcial</span>
    <span>Puntito: días para el examen (14 o menos)</span>
    <span><span class="desk-done-legend">✓</span> ya rindió el examen cargado</span>
  </div>`;

  const ordered = aulaOrder(grupo);
  const shown = ordered.slice(0,30);
  const resto = ordered.length - shown.length;

  const rows=[]; for(let i=0;i<shown.length;i+=6) rows.push(shown.slice(i,i+6));
  h += `<div class="aula-wrap"><div class="classroom">` + rows.map(row=>{
    const left=row.slice(0,3), right=row.slice(3,6);
    return `<div class="aula-row">
      <div class="aula-side">${left.map(deskHtml).join("")}</div>
      ${right.length?`<div class="aula-side">${right.map(deskHtml).join("")}</div>`:""}
    </div>`;
  }).join("") + `</div></div>`;

  if(resto>0) h += `<button class="chip" data-a="nav-lista" style="margin-top:12px">y ${resto} más — ver en la Lista</button>`;

  return h;
}

// Barras horizontales con label visible (a diferencia de barRow, pensada para series
// cronológicas): útil para categorías con nombre propio, como materias.
function hbarList(dataset){
  const max=Math.max(1, ...dataset.map(d=>d.v));
  return dataset.map(d=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
    <div style="width:130px;flex-shrink:0;font-size:12.5px;color:var(--muted);white-space:nowrap;
      overflow:hidden;text-overflow:ellipsis" title="${esc(d.label)}">${esc(d.label)}</div>
    <div role="progressbar" aria-label="${esc(d.label)}" aria-valuenow="${d.v}" aria-valuemin="0" aria-valuemax="${max}"
      style="flex:1;background:var(--soft);border-radius:4px;overflow:hidden;height:14px">
      <div style="height:100%;width:${Math.max(2,Math.round(d.v/max*100))}%;background:var(--accent);border-radius:4px"></div>
    </div>
    <div style="width:22px;text-align:right;font-family:var(--mono);font-size:12px;color:var(--muted)">${d.v}</div>
  </div>`).join("");
}

// "Tu actividad": independiente de la materia elegida arriba — mira todo state.students.
function vTuActividad(){
  const students = alive();
  const sessions = students.flatMap(s=>(s.sessions||[]).map(c=>({...c, studentId:s.id})));

  const weekBuckets=Array.from({length:8},()=>0);
  const monthBuckets=Array.from({length:6},()=>0);
  const monthStudentSets=Array.from({length:6},()=>new Set());
  let hechas=0, intentadas=0, no=0;

  sessions.forEach(c=>{
    if(!c.date) return;
    const da=-daysTo(c.date); if(da<0) return; // clases con fecha futura (no debería pasar): se ignoran
    const wi=Math.floor(da/7); if(wi>=0 && wi<8) weekBuckets[wi]++;
    const mi=Math.floor(da/30);
    if(mi>=0 && mi<6){ monthBuckets[mi]++; monthStudentSets[mi].add(c.studentId); }
    if(da<=30){
      if(c.tarea==="hecha") hechas++;
      else if(c.tarea==="intentada") intentadas++;
      else if(c.tarea==="no") no++;
    }
  });

  const weekLabels=Array.from({length:8},(_,i)=>i===0?"Esta semana":`Hace ${i} semana${i===1?"":"s"}`);
  const monthLabels=Array.from({length:6},(_,i)=>i===0?"Este mes":`Hace ${i} mes${i===1?"":"es"}`);
  const semanaSet=weekBuckets.map((v,i)=>({label:weekLabels[i], v})).reverse();
  const mesSet=monthBuckets.map((v,i)=>({label:monthLabels[i], v})).reverse();
  const alumnosMesSet=monthStudentSets.map((set,i)=>({label:monthLabels[i], v:set.size})).reverse();

  const activos = students.filter(s=>s.status==="activo");
  const porMateria={};
  activos.forEach(s=>{
    const m = s.subjectId ? subjById(s.subjectId) : null;
    const nombre = m ? m.name : (s.subject||"Materia s/d");
    porMateria[nombre]=(porMateria[nombre]||0)+1;
  });
  const materiasSet = Object.entries(porMateria).map(([label,v])=>({label,v})).sort((a,b)=>b.v-a.v);

  const totalTarea = hechas+intentadas+no;
  const tasaTarea = totalTarea ? hechas/totalTarea*100 : null;

  let h = `<div class="stitle" style="margin-top:30px">Tu actividad</div>`;
  h += `<div class="stitle">Clases dadas por semana (últimas 8)</div>` + barRow(semanaSet);
  h += `<div class="stitle">Clases dadas por mes (últimos 6)</div>` + barRow(mesSet);
  h += `<div class="stitle">Alumnos activos por mes</div>` + barRow(alumnosMesSet);
  h += `<div class="stitle">Materias más demandadas (alumnos activos)</div>`;
  h += materiasSet.length ? hbarList(materiasSet) : `<div class="empty">Sin materias asignadas todavía.</div>`;
  h += `<div class="stitle">Tareas hechas (últimos 30 días)</div>`;
  h += tasaTarea===null
    ? `<div class="empty">Sin clases con tarea registrada en los últimos 30 días.</div>`
    : `<div class="stats"><div class="stat"><b>${tasaTarea.toFixed(0)}%</b><span>hechas sobre ${totalTarea} clase${totalTarea===1?"":"s"} con tarea registrada</span></div></div>`;
  return h;
}

function vPanel(){
  const tab = state.panelTab||"reportes";
  let h = pageHead("Panel","Administración");
  h += `<div class="tabs" style="margin-bottom:14px">
    ${tabbtn("panel-tab-reportes",tab==="reportes","Reportes")}
    ${tabbtn("panel-tab-usuarios",tab==="usuarios","Usuarios")}
    ${tabbtn("panel-tab-actividad",tab==="actividad","Actividad")}
    ${tabbtn("panel-tab-recursos",tab==="recursos","Recursos")}
    ${tabbtn("panel-tab-inactividad",tab==="inactividad","Inactividad")}
  </div>`;
  h += tab==="usuarios" ? vUsuarios() : tab==="actividad" ? vActividad() : tab==="recursos" ? vRecursos()
    : tab==="inactividad" ? vInactividad() : vReportes();
  return h;
}

function vReportes(){
  const filter = state.reportFilter||"pendiente";
  const list = (state.reportes||[]).filter(r=>filter==="todos"||r.estado===filter);
  let h = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
    ${["pendiente","resuelto","todos"].map(f=>
      `<button class="chip ${filter===f?"on":""}" data-a="reportes-filter" data-f="${f}">${f==="todos"?"Todos":f==="pendiente"?"Pendientes":"Resueltos"}</button>`
    ).join("")}
  </div>`;
  if(state.reportesError) h += `<div class="saveerr">${esc(state.reportesError)}</div>`;
  else if(!state.reportesLoaded) h += skeletonRows(4);
  else if(list.length===0) h += `<div class="empty">No hay reportes en esta categoría.</div>`;
  else h += list.map(r=>`<div class="log" style="align-items:flex-start">
      <div class="body">
        <div style="font-weight:600">${esc(r.email||"—")}
          <span class="hint">· ${esc(r.plataforma||"—")} · v${esc(r.version||"—")} · ${fmtDateTime(r.created_at)}</span></div>
        <div class="note">${esc(r.mensaje||"")}</div>
      </div>
      <button class="chip ${r.estado==="resuelto"?"on":""}" data-a="toggle-reporte" data-id="${esc(r.id)}">${r.estado==="resuelto"?"Resuelto ✓":"Marcar resuelto"}</button>
    </div>`).join("");
  return h;
}

function vUsuarios(){
  const sortDir = state.usersSortDir||"desc";
  let h = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
    <button class="chip" data-a="usuarios-sort-lastseen">Última conexión ${sortDir==="desc"?"↓ más reciente primero":"↑ más antigua primero"}</button>
    <div style="display:flex;gap:8px">
      <button class="chip" data-a="limpiar-huerfanos" ${state.orphanCleanStatus==="cleaning"?"disabled":""}>${state.orphanCleanStatus==="cleaning"?"Limpiando…":"Limpiar archivos huérfanos"}</button>
      <button class="chip" data-a="refresh-usuarios">Actualizar</button>
    </div></div>`;
  if(state.usersDeleteMsg) h += `<div class="hint" style="color:var(--status-activo-fg);margin-bottom:8px">${esc(state.usersDeleteMsg)}</div>`;
  if(state.orphanCleanMsg) h += `<div class="hint" style="color:var(--status-activo-fg);margin-bottom:8px">${esc(state.orphanCleanMsg)}</div>`;
  if(state.orphanCleanError) h += `<div class="saveerr" style="margin-bottom:8px">${esc(state.orphanCleanError)}</div>`;
  if(state.usersError) return h + `<div class="saveerr">${esc(state.usersError)}</div>`;
  if(!state.usersLoaded) return h + skeletonRows(5);
  const list = state.users||[];
  const now = Date.now();
  const ONLINE_MS = 10*60*1000, WEEK_MS = 7*86400000, INACTIVE_MS = 30*86400000, FINAL_MS = 5*30*86400000;
  const lastSeenMs = u => u.last_seen_at ? now-new Date(u.last_seen_at).getTime() : null;
  const isOnline = u => { const ms=lastSeenMs(u); return ms!==null && ms<ONLINE_MS; };
  const isActiveWeek = u => { const ms=lastSeenMs(u); return ms!==null && ms<WEEK_MS; };
  // mismos umbrales que revisar_inactivos() (012_inactividad.sql): recordatorio a los 30
  // días, aviso final a los 5 meses — el chip sólo es informativo, el cron es la fuente de verdad.
  const inactiveChip = u => {
    const ms=lastSeenMs(u); if(u.rol==="admin" || ms===null || ms<INACTIVE_MS) return "";
    const color = ms>=FINAL_MS ? "var(--red)" : "var(--amber)";
    return `<span class="chip" style="color:${color};border-color:${color};margin-left:6px">Inactivo ${timeAgo(u.last_seen_at)}</span>`;
  };
  h += `<div class="stats">
    <div class="stat"><b>${list.length}</b><span>cuentas totales</span></div>
    <div class="stat"><b>${list.filter(isOnline).length}</b><span>en línea ahora</span></div>
    <div class="stat"><b>${list.filter(isActiveWeek).length}</b><span>activos últimos 7 días</span></div>
  </div>`;
  if(list.length===0) return h + `<div class="empty">Todavía no hay cuentas.</div>`;
  // más reciente/antigua primero; sin last_seen_at (nunca conectado) siempre al final, sea cual sea el orden
  const sorted = list.slice().sort((a,b)=>{
    const ma=lastSeenMs(a), mb=lastSeenMs(b);
    if(ma===null && mb===null) return 0;
    if(ma===null) return 1;
    if(mb===null) return -1;
    return sortDir==="desc" ? ma-mb : mb-ma;
  });
  h += sorted.map(u=>{
    const seen = isOnline(u)
      ? `<span style="display:inline-flex;align-items:center;gap:5px;color:var(--status-activo-fg);font-weight:600">
          <span class="sem" style="width:8px;height:8px;background:var(--green)"></span>En línea</span>`
      : `<span style="color:var(--faint)">${u.last_seen_at?"visto por última vez "+timeAgo(u.last_seen_at):"nunca conectado"}</span>`;
    const isAdmin = u.rol==="admin";
    const confirming = state.usersConfirmDelId===u.user_id;
    let delUi = "";
    if(!isAdmin){
      if(!confirming){
        delUi = `<button class="del" data-a="users-del-ask" data-id="${esc(u.user_id)}" title="Eliminar cuenta" aria-label="Eliminar cuenta">×</button>`;
      }else{
        const matches = (state.usersConfirmDelInput||"")===u.email;
        delUi = `<div style="flex-basis:100%;margin-top:8px;padding-top:8px;border-top:1px solid var(--soft)">
          <div style="font-size:13px;color:var(--status-desaprobo-fg);margin-bottom:6px">Esto borra la cuenta, sus alumnos, respaldos y materiales — no se puede deshacer. Escribí <b>${esc(u.email)}</b> para confirmar:</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="text" data-live="users-del-email" value="${esc(state.usersConfirmDelInput||"")}" placeholder="${esc(u.email)}" style="flex:1;min-width:180px">
            <button class="danger" data-a="users-del-confirm" data-id="${esc(u.user_id)}" ${(!matches||state.usersDeleteStatus==="deleting")?"disabled":""}>Sí, eliminar</button>
            <button class="chip" data-a="users-del-cancel">Cancelar</button>
          </div>
          ${state.usersDeleteError?`<div class="saveerr" style="margin-top:6px">${esc(state.usersDeleteError)}</div>`:""}
        </div>`;
      }
    }
    return `<div class="log" style="align-items:flex-start;flex-wrap:wrap">
      <div class="body">
        <div style="font-weight:600">${esc(u.email||"—")} <span class="hint">· ${esc(u.rol||"—")}</span>${inactiveChip(u)}</div>
        <div class="note">${seen} · ${esc(u.plataforma||"—")} · v${esc(u.version||"—")} · alta ${fmtDateTime(u.created_at)}</div>
      </div>
      ${delUi}
    </div>`;
  }).join("");
  return h;
}

// Log de 012_inactividad.sql: qué mail mandó (o habría mandado, en simulacro) el cron
// revisar_inactivos() y qué cuentas terminó cerrando.
const TIPO_NOTIF_META = {
  recordatorio:"Recordatorio", aviso_final:"Aviso final",
  simulacro_recordatorio:"Recordatorio (simulacro)", simulacro_aviso_final:"Aviso final (simulacro)",
  simulacro_cierre:"Cierre (simulacro)"
};
function vInactividad(){
  let h = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button class="chip" data-a="refresh-inactividad">Actualizar</button></div>`;
  if(state.inactividadError) return h + `<div class="saveerr">${esc(state.inactividadError)}</div>`;
  if(!state.inactividadLoaded) return h + skeletonRows(3);
  const notifs = state.notificacionesInactividad||[];
  const cerradas = state.cuentasCerradas||[];
  h += `<div class="stitle">Notificaciones (últimas ${notifs.length})</div>`;
  h += notifs.length===0 ? `<div class="empty">Sin notificaciones registradas todavía.</div>` :
    notifs.map(n=>`<div class="log">
      <div class="body">${esc(n.email)} <span class="hint">· ${esc(TIPO_NOTIF_META[n.tipo]||n.tipo)}</span>
        <div class="note">${fmtDateTime(n.enviada_at)}</div></div>
    </div>`).join("");
  h += `<div class="stitle">Cuentas cerradas (últimas ${cerradas.length})</div>`;
  h += cerradas.length===0 ? `<div class="empty">Sin cierres todavía.</div>` :
    cerradas.map(c=>`<div class="log">
      <div class="body">${esc(c.email)} <span class="hint">· ${esc(c.motivo)}</span>
        <div class="note">${fmtDateTime(c.cerrada_at)}</div></div>
    </div>`).join("");
  return h;
}

// Elige hasta maxTicks índices repartidos parejo (siempre incluye el primero y el
// último) para no pisar etiquetas de eje cuando el dataset tiene muchos puntos.
function pickAxisIndices(n, maxTicks){
  const step=Math.max(1, Math.ceil(n/maxTicks));
  const idx=new Set();
  for(let i=0;i<n;i+=step) idx.add(i);
  idx.add(n-1);
  return idx;
}
// Suma total de un dataset de barRow — se muestra junto al título del gráfico.
function barTotal(dataset){ return dataset.reduce((s,d)=>s+d.v,0); }

// Barras simples en CSS (sin librerías): una <div> por dato, alto proporcional al máximo
// del propio conjunto. El valor de cada barra siempre está visible (no depende de hover):
// horizontal arriba de la barra con pocos puntos, rotado en vertical cuando hay muchos
// (30/48, como en Actividad) para que entre sin superponerse aunque la barra quede finita.
// axisLabels (opcional, mismo largo que dataset, con "" en los índices que no se muestran)
// agrega etiquetas de eje abreviadas debajo de las barras en vez del hint "primero → último".
function barRow(dataset, axisLabels){
  const max=Math.max(1, ...dataset.map(d=>d.v));
  const dense = dataset.length>14;
  const gap = dense?"2px":"3px";
  const barMaxPx = dense?40:58;
  const bars = dataset.map(d=>{
    const hgt=Math.max(2,Math.round(d.v/max*barMaxPx));
    const val = dense
      ? `<span style="writing-mode:vertical-rl;transform:rotate(180deg);font-family:var(--mono);font-size:9px;color:var(--muted);line-height:1;white-space:nowrap;margin-bottom:2px">${d.v}</span>`
      : `<span style="font-size:9.5px;font-family:var(--mono);color:var(--muted);margin-bottom:2px">${d.v}</span>`;
    return `<div title="${esc(d.label)}: ${d.v}" style="flex:${dense?"0 0 14px":"1"};min-width:${dense?"14px":"2px"};display:flex;flex-direction:column;
      align-items:center;justify-content:flex-end;height:100%">
      ${val}
      <div class="grow-v" style="width:100%;background:var(--accent);border-radius:2px 2px 0 0;height:${hgt}px"></div>
    </div>`;
  }).join("");
  const chart = `<div style="display:flex;align-items:flex-end;gap:${gap};height:74px;margin-bottom:4px">${bars}</div>`;
  let axisRow="", rangeHint="";
  if(axisLabels){
    axisRow = `<div style="display:flex;gap:${gap};margin-bottom:10px">` +
      dataset.map((d,i)=>`<div style="flex:${dense?"0 0 14px":"1"};min-width:${dense?"14px":"2px"};text-align:center">
        ${axisLabels[i]?`<span style="display:inline-block;font-size:8.5px;font-family:var(--mono);color:var(--faint);white-space:nowrap;transform:rotate(-40deg);transform-origin:top center">${esc(axisLabels[i])}</span>`:""}
      </div>`).join("") +
    `</div>`;
  }else{
    rangeHint = `<div class="hint" style="margin-bottom:16px">${esc(dataset[0].label)} → ${esc(dataset[dataset.length-1].label)}</div>`;
  }
  // dense (30/48 puntos): las barras quedan a ancho fijo y el bloque scrollea horizontal
  // en pantallas angostas en vez de aplastarse hasta hacer ilegibles número y etiqueta.
  return (dense?`<div style="overflow-x:auto;padding-bottom:2px">${chart}${axisRow}</div>`:chart+axisRow) + rangeHint;
}
// Regresión lineal simple (mínimos cuadrados) sobre una serie — devuelve una función que da el
// valor predicho en el índice x. La usa signedBarChart para la línea de tendencia del histórico.
function linearTrend(values){
  const n=values.length, meanX=(n-1)/2, meanY=values.reduce((a,b)=>a+b,0)/n;
  let num=0, den=0;
  values.forEach((y,x)=>{ num+=(x-meanX)*(y-meanY); den+=(x-meanX)*(x-meanX); });
  const slope = den===0?0:num/den, intercept = meanY-slope*meanX;
  return x=>slope*x+intercept;
}
// Barras que pueden dar negativas (rentabilidad: un mes puede cerrar en pérdida), creciendo desde
// una línea de cero al medio en vez de desde abajo como barRow — verde hacia arriba, rojo hacia
// abajo, valor siempre visible en la punta de la barra. Incluye una línea de tendencia (regresión
// lineal simple) superpuesta en SVG puro, sin librerías. fmt formatea cada valor para el label.
function signedBarChart(dataset, axisLabels, fmt){
  const H=120, half=48, n=dataset.length;
  const max = Math.max(1, ...dataset.map(d=>Math.abs(d.v)));
  const trendFn = linearTrend(dataset.map(d=>d.v));
  const cols = dataset.map(d=>{
    const hgt = d.v===0 ? 0 : Math.max(2, Math.round(Math.abs(d.v)/max*half));
    const label = `<span style="font-size:9px;font-family:var(--mono);color:var(--muted);white-space:nowrap">${esc(fmt(d.v))}</span>`;
    const posBar = d.v>0
      ? `${label}<div class="grow-v" style="width:70%;max-width:16px;background:var(--green);border-radius:2px 2px 0 0;height:${hgt}px;margin-top:2px"></div>`
      : (d.v===0 ? `<span style="font-size:9px;font-family:var(--mono);color:var(--faint)">–</span>` : "");
    const negBar = d.v<0
      ? `<div class="grow-v-down" style="width:70%;max-width:16px;background:var(--red);border-radius:0 0 2px 2px;height:${hgt}px;margin-bottom:2px"></div>${label}`
      : "";
    return `<div title="${esc(d.label)}: ${esc(fmt(d.v))}" style="flex:1;min-width:2px;display:flex;flex-direction:column;height:100%">
      <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center">${posBar}</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;align-items:center">${negBar}</div>
    </div>`;
  }).join("");
  const baseline = H/2;
  const trendPoints = dataset.map((d,i)=>{
    const y = Math.max(4, Math.min(H-4, baseline-(trendFn(i)/max*half)));
    const x = ((i+0.5)/n*100).toFixed(2);
    return `${x},${y.toFixed(1)}`;
  }).join(" ");
  const chart = `<div style="position:relative;height:${H}px;margin-bottom:4px">
    <div style="position:absolute;left:0;right:0;top:50%;border-top:1px solid var(--line)"></div>
    <svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">
      <polyline points="${trendPoints}" fill="none" stroke="var(--blue)" stroke-width="1.5" stroke-dasharray="4 3"/>
    </svg>
    <div style="display:flex;gap:3px;height:100%;position:relative">${cols}</div>
  </div>`;
  const axisRow = axisLabels ? `<div style="display:flex;gap:3px;margin-bottom:14px">` +
    dataset.map((d,i)=>`<div style="flex:1;min-width:2px;text-align:center">
      ${axisLabels[i]?`<span style="display:inline-block;font-size:8.5px;font-family:var(--mono);color:var(--faint);white-space:nowrap">${esc(axisLabels[i])}</span>`:""}
    </div>`).join("") + `</div>` : "";
  return chart+axisRow;
}
// Título de sub-gráfico + total del período, en la misma línea (formato de .stitle).
function chartTitle(text, dataset){
  return `<div class="stitle" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
    <span>${esc(text)}</span><span>Total: ${barTotal(dataset)}</span></div>`;
}
function sumRange(dataset, from, toExclusive){
  let s=0; for(let i=from;i<toExclusive;i++) s+=dataset[i].v; return s;
}
// Variación del período actual contra el anterior, con flecha y color — arriba de cada gráfico.
function trendBadge(curr, prev, periodLabel){
  if(prev===0 && curr===0) return `<div class="hint" style="margin-bottom:6px">Sin actividad en ninguno de los dos períodos.</div>`;
  if(prev===0) return `<div class="hint" style="margin-bottom:6px"><span style="color:var(--status-activo-fg);font-weight:700">↑ nuevo</span> — sin datos del ${esc(periodLabel)} para comparar.</div>`;
  const pct=((curr-prev)/prev)*100;
  const flat = Math.round(pct)===0;
  const up = pct>0;
  const arrow = flat?"→":(up?"↑":"↓");
  const color = flat?"var(--muted)":(up?"var(--green)":"var(--red)");
  return `<div class="hint" style="margin-bottom:6px"><span style="color:${color};font-weight:700;font-family:var(--mono)">${arrow} ${Math.abs(pct).toFixed(0)}%</span> vs. ${esc(periodLabel)}</div>`;
}

function vActividadDia(){
  const days=[]; for(let i=29;i>=0;i--) days.push(new Date(Date.now()-i*86400000).toISOString().slice(0,10));
  const byDay={}; days.forEach(d=>byDay[d]={users:new Set(),aperturas:0,syncs:0});
  (state.metricas||[]).forEach(m=>{
    const d=byDay[m.dia]; if(!d) return;
    d.users.add(m.user_id); d.aperturas+=(m.aperturas||0); d.syncs+=(m.syncs||0);
  });
  const activeSet = days.map(d=>({label:fmtDate(d), v:byDay[d].users.size}));
  const aperturasSet = days.map(d=>({label:fmtDate(d), v:byDay[d].aperturas}));
  const syncsSet = days.map(d=>({label:fmtDate(d), v:byDay[d].syncs}));
  const axisIdx = pickAxisIndices(days.length, 8);
  const axisLabels = days.map((d,i)=>axisIdx.has(i)?fmtDate(d):"");

  let h = chartTitle("Usuarios activos por día (últimos 30 días)", activeSet);
  h += trendBadge(sumRange(activeSet,23,30), sumRange(activeSet,16,23), "7 días anteriores");
  h += barRow(activeSet, axisLabels);
  h += chartTitle("Aperturas por día", aperturasSet);
  h += trendBadge(sumRange(aperturasSet,23,30), sumRange(aperturasSet,16,23), "7 días anteriores");
  h += barRow(aperturasSet, axisLabels);
  h += chartTitle("Syncs por día", syncsSet);
  h += trendBadge(sumRange(syncsSet,23,30), sumRange(syncsSet,16,23), "7 días anteriores");
  h += barRow(syncsSet, axisLabels);
  return h;
}

// Trunca a la hora en UTC — coincide con date_trunc('hour', now()) del lado del servidor
// (Supabase usa UTC), sin depender del huso horario del navegador.
function hourKey(d){ const h=new Date(d); h.setUTCMinutes(0,0,0); return h.toISOString(); }
function vActividadHora(){
  if(state.metricasHorariasError) return `<div class="saveerr">${esc(state.metricasHorariasError)}</div>`;
  if(!state.metricasHorariasLoaded) return skeletonRows(3);

  const hourKeys=[]; for(let i=47;i>=0;i--) hourKeys.push(hourKey(new Date(Date.now()-i*3600000)));
  const byHour={}; hourKeys.forEach(k=>byHour[k]={users:new Set(),aperturas:0,syncs:0});
  (state.metricasHorarias||[]).forEach(m=>{
    const b=byHour[hourKey(m.hora)]; if(!b) return;
    b.users.add(m.user_id); b.aperturas+=(m.aperturas||0); b.syncs+=(m.syncs||0);
  });
  const activeSet = hourKeys.map(k=>({label:fmtDateTime(k), v:byHour[k].users.size}));
  const aperturasSet = hourKeys.map(k=>({label:fmtDateTime(k), v:byHour[k].aperturas}));
  const syncsSet = hourKeys.map(k=>({label:fmtDateTime(k), v:byHour[k].syncs}));
  const axisIdx = pickAxisIndices(hourKeys.length, 8);
  const shortHour = k=>{ try{ return new Date(k).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}); }catch(e){ return "—"; } };
  const axisLabels = hourKeys.map((k,i)=>axisIdx.has(i)?shortHour(k):"");

  let h = chartTitle("Usuarios activos por hora (últimas 48 hs)", activeSet);
  h += trendBadge(sumRange(activeSet,24,48), sumRange(activeSet,0,24), "24 hs anteriores");
  h += barRow(activeSet, axisLabels);
  h += chartTitle("Aperturas por hora", aperturasSet);
  h += trendBadge(sumRange(aperturasSet,24,48), sumRange(aperturasSet,0,24), "24 hs anteriores");
  h += barRow(aperturasSet, axisLabels);
  h += chartTitle("Syncs por hora", syncsSet);
  h += trendBadge(sumRange(syncsSet,24,48), sumRange(syncsSet,0,24), "24 hs anteriores");
  h += barRow(syncsSet, axisLabels);
  return h;
}

function vActividad(){
  const mode = state.actividadMode||"dia";
  let h = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    <div class="tabs">
      ${tabbtn("actividad-mode-dia",mode==="dia","Por día")}
      ${tabbtn("actividad-mode-hora",mode==="hora","Por hora")}
    </div>
    <button class="chip" data-a="refresh-actividad">Actualizar</button>
  </div>`;

  if(mode==="dia"){
    if(state.actividadError) h += `<div class="saveerr">${esc(state.actividadError)}</div>`;
    else if(!state.actividadLoaded) h += skeletonRows(3);
    else h += vActividadDia();
  }else{
    h += vActividadHora();
  }

  // Altas nuevas por semana: no participa del selector día/hora (no tiene equivalente horario).
  if(state.actividadLoaded && !state.actividadError){
    const buckets=[0,0,0,0,0];
    (state.altas||[]).forEach(ts=>{
      if(!ts) return;
      const daysAgo=Math.floor((Date.now()-new Date(ts).getTime())/86400000);
      const idx=Math.floor(daysAgo/7);
      if(idx>=0 && idx<5) buckets[idx]++;
    });
    const labels=["Últimos 7 días","8–14 días","15–21 días","22–28 días","29–35 días"];
    const altasSet = buckets.map((v,i)=>({label:labels[i], v})).reverse();
    h += `<div class="stitle">Altas nuevas por semana</div>`;
    h += trendBadge(altasSet[4].v, altasSet[3].v, "semana anterior");
    h += barRow(altasSet);
  }

  return h;
}

const SUPABASE_FREE_LIMIT_BYTES = 500*1024*1024;
function vRecursos(){
  let h = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button class="chip" data-a="refresh-recursos">Actualizar</button></div>`;
  if(state.recursosError) return h + `<div class="saveerr">${esc(state.recursosError)}</div>`;
  if(!state.recursosLoaded) return h + skeletonRows(4);
  const data = state.recursos;
  if(!data) return h + `<div class="empty">No se pudieron cargar los recursos.</div>`;

  const dbBytes = data.db_bytes||0;
  const pct = Math.min(100, dbBytes/SUPABASE_FREE_LIMIT_BYTES*100);
  const barColor = pct>=90 ? "var(--red)" : pct>=70 ? "var(--amber)" : "var(--green)";
  h += `<div class="stitle">Uso de base de datos</div>
  <div role="progressbar" aria-label="Uso de base de datos" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"
    style="background:var(--soft);border-radius:99px;height:14px;overflow:hidden;margin-bottom:6px">
    <div style="height:100%;width:${pct.toFixed(1)}%;background:${barColor};border-radius:99px"></div>
  </div>
  <div class="hint" style="margin-bottom:20px">${fmtBytes(dbBytes)} de ${fmtBytes(SUPABASE_FREE_LIMIT_BYTES)} (${pct.toFixed(1)}%) — plan gratuito de Supabase</div>`;

  const usuarios = [...(data.usuarios||[])].sort((a,b)=>
    ((b.cuaderno_bytes||0)+(b.respaldos_bytes||0)) - ((a.cuaderno_bytes||0)+(a.respaldos_bytes||0)));

  h += usuarios.length===0 ? `<div class="empty">Sin datos de usuarios.</div>`
    : usuarios.map(u=>`<div class="log" style="align-items:flex-start">
      <div class="body">
        <div style="font-weight:600">${esc(u.email||"—")} <span class="hint">· ${esc(u.rol||"—")}</span></div>
        <div class="note">${u.alumnos||0} alumno${u.alumnos===1?"":"s"} · cuaderno ${fmtBytes(u.cuaderno_bytes)}
          · ${u.respaldos||0} respaldo${u.respaldos===1?"":"s"} (${fmtBytes(u.respaldos_bytes)})</div>
      </div>
    </div>`).join("");

  h += `<div class="hint" style="margin-top:18px">El uso de memoria/CPU del servidor se ve solo en el dashboard de Supabase; acá se mide lo que ocupan los datos.</div>`;
  return h;
}

/* ============ búsqueda global (paso 72): overlay siempre accesible (ícono lupa en el nav +
   atajo "/") que busca en un solo lugar alumnos, materias y materiales por nombre (ver
   globalSearchResults en helpers.js). Resultados agrupados por tipo, en una única lista plana
   para la navegación por teclado (flechas + Enter, ver keydown en events.js) y por click. */
function searchRow(item, idx, sel){
  const icon = item.type==="student" ? ICON_USERS : item.type==="subject" ? ICON_BOOK : ICON_LINK;
  return `<button class="search-row ${idx===sel?"sel":""}" data-a="search-select" data-idx="${idx}"
      data-type="${item.type}" data-id="${esc(item.id)}" ${item.type==="material"?`data-name="${esc(item.name)}"`:""}>
    <span class="search-row-icon">${icon}</span>
    <span class="search-row-text"><span class="search-row-label">${esc(item.label)}</span>
      <span class="search-row-sub">${esc(item.sub)}</span></span>
  </button>`;
}
function vSearchOverlay(){
  const q = state.searchQuery||"";
  const res = globalSearchResults(q);
  const flat = globalSearchFlat(q);
  const sel = Math.min(state.searchSel||0, Math.max(flat.length-1,0));
  let body;
  if(!q.trim()){
    body = `<div class="hint" style="padding:16px 2px">Escribí para buscar alumnos, materias o materiales por nombre.</div>`;
  }else if(flat.length===0){
    body = emptyState(ICON_SEARCH, "Sin resultados", `No encontramos nada para "${q}".`);
  }else{
    let i=0;
    body = "";
    if(res.students.length) body += `<div class="search-group-title">Alumnos</div>` +
      res.students.map(r=>searchRow({...r,type:"student"}, i++, sel)).join("");
    if(res.subjects.length) body += `<div class="search-group-title">Materias</div>` +
      res.subjects.map(r=>searchRow({...r,type:"subject"}, i++, sel)).join("");
    if(res.materiales.length) body += `<div class="search-group-title">Materiales</div>` +
      res.materiales.map(r=>searchRow({...r,type:"material"}, i++, sel)).join("");
  }
  return `<div class="overlay search-overlay" data-a="close-search-bg">
    <div class="search-modal" data-a="search-modal-noop">
      <div class="search-input-row">
        <span class="search-row-icon">${ICON_SEARCH}</span>
        <input id="global-search-input" data-live="global-search" type="text" autofocus
          placeholder="Buscar alumnos, materias, materiales…" value="${esc(q)}">
        <button class="chip" data-a="close-search" title="Cerrar (Esc)">Esc</button>
      </div>
      <div class="search-results">${body}</div>
    </div>
  </div>`;
}

function vModal(){
  return `<div class="overlay"><div class="modal">
    <div class="ftitle" style="font-size:16px">Nuevo estudiante</div>
    ${state.newStudentError?`<div class="saveerr">${esc(state.newStudentError)}</div>`:""}
    <div class="frow">
      <div class="field"><div class="flabel">Nombre *</div><input id="n-name" autofocus data-enter="create"></div>
      <div class="field"><div class="flabel">Carrera</div><select id="n-career" data-enter="create">
        ${state.catalog.careers.map(c=>`<option>${esc(c)}</option>`).join("")}</select></div></div>
    <div class="frow">
      <div class="field"><div class="flabel">Materia</div><select id="n-subject" data-enter="create">
        <optgroup label="Materias">
          ${state.catalog.subjects.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("")}
        </optgroup>
        ${(state.catalog.packs||[]).filter(p=>p.subjectIds.length>=2).length ? `<optgroup label="Packs">
          ${state.catalog.packs.filter(p=>p.subjectIds.length>=2).map(p=>`<option value="pack:${p.id}">${esc(p.name)}</option>`).join("")}
        </optgroup>` : ""}
        <option value="">Otra / sin materia por ahora</option></select></div>
      <div class="field"><div class="flabel">Fecha de examen (si ya la sabe)</div><input type="date" id="n-exam" data-enter="create"></div></div>
    <div class="field"><div class="flabel">Notas iniciales (de dónde arranca, qué le cuesta)</div><textarea id="n-notes"></textarea></div>
    <div class="hint" style="margin-top:8px">¿Cursa más de una materia? Cargalo una vez por cada materia — o elegí un pack para crear todas sus fichas de una.</div>
    <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
      <button class="chip" data-a="cancel-new">Cancelar</button>
      <button class="primary" style="margin-left:0" data-a="create">Crear</button></div>
  </div></div>`;
}

/* ============ estado de sincronización (texto) ============ */
function syncStatusText(){
  if(!getSes()) return "Sin sesión";
  const st=state.syncStatus;
  if(st==="sync") return "Sincronizando…";
  if(st==="offline") return "Sin conexión — trabajando offline; se sincroniza al volver internet";
  // esc() acá porque syncStatusText() se inyecta con innerHTML/interpolación cruda en
  // varios lugares (setStatus, el header) — mejor que el punto único de esta función
  // quede seguro por sí mismo en vez de depender de que cada call site se acuerde de escapar.
  if(st==="error") return esc(state.syncMsg||"No se pudo sincronizar")+" — se reintenta solo";
  if(st==="ok" && state.lastSync)
    return "Sincronizado ✓ "+new Date(state.lastSync).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
  return "Sincronización lista";
}

/* ============ render ============ */
// Recuerda la última vista realmente pintada (paso 100) para que la transición de entrada
// (fade/stagger) sólo se dispare al navegar de verdad, no en cada re-render disparado por
// datos que cambian estando en la misma vista (buscador en vivo, cronómetro, sync…) — si
// eso animara también, la app se sentiría con parpadeo constante en vez de fluida.
let _prevViewKey = null;
function render(){
  // el shell de navegación (sidebar/barra inferior) sólo existe con sesión activa, fuera de
  // recovery e informe/contrato (documentos pensados para imprimir/compartir, sin nav) — la
  // clase "has-nav" en <body> reserva ese espacio fijo sólo cuando el nav realmente se pinta.
  if(state.recovery){
    document.body.classList.remove("has-nav"); _prevViewKey=null;
    document.getElementById("app").innerHTML = `<div class="view-fade">${vSetPassword()}</div>`;
    const p=document.getElementById("newpass1"); if(p) p.focus();
    return;
  }
  if(!getSes() && !IS_DEMO){
    document.body.classList.remove("has-nav"); _prevViewKey=null;
    if(state.pendingConfirmEmail){
      document.getElementById("app").innerHTML = `<div class="view-fade">${vConfirmEmail()}</div>`;
      return;
    }
    document.getElementById("app").innerHTML = `<div class="view-fade">${vAuth()}</div>`;
    const em=document.getElementById("auth-email"); if(em) em.focus();
    return;
  }
  if(state.view==="informe"){
    if(!sel()){ state.view="tablero"; }
    else{ document.body.classList.remove("has-nav"); _prevViewKey=null; document.getElementById("app").innerHTML = `<div class="view-fade">${vInforme()}</div>`+toastWrap(); return; }
  }
  if(state.view==="contrato"){
    if(!sel()){ state.view="tablero"; }
    else{ document.body.classList.remove("has-nav"); _prevViewKey=null; document.getElementById("app").innerHTML = `<div class="view-fade">${vContrato()}</div>`+toastWrap(); return; }
  }
  if(state.view==="recibo"){
    if(!sel() || !reciboFor(sel(), state.reciboId)){ state.view="tablero"; }
    else{ document.body.classList.remove("has-nav"); _prevViewKey=null; document.getElementById("app").innerHTML = `<div class="view-fade">${vRecibo()}</div>`+toastWrap(); return; }
  }
  document.body.classList.add("has-nav");
  const ses = getSes();
  const isAdmin = sesIsAdmin(ses);
  let m = "";
  if(IS_DEMO){
    m += `<div class="no-print" style="position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;
      background:var(--bluebg);border:1px solid var(--blueline);border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:13px;color:var(--status-aprobo-fg)">
      <span><b>Modo demostración</b> — los cambios no se guardan</span>
      <a class="chip" href="${esc(location.pathname)}" style="margin:0">Crear mi cuenta</a>
    </div>`;
  }
  if(IS_NATIVE && state.newVersionTag && !state.updateBannerDismissed){
    m += `<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;
      background:var(--bluebg);border:1px solid var(--blueline);border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:13px;color:var(--status-aprobo-fg)">
      <span>Hay una versión nueva disponible (${esc(state.newVersionTag)}). <a href="${DOWNLOADS_URL}" target="_blank" rel="noopener" style="color:var(--status-aprobo-fg);font-weight:600">Ir a descargas</a></span>
      <button data-a="dismiss-update-banner" title="Cerrar aviso" aria-label="Cerrar aviso" style="background:none;border:none;color:var(--status-aprobo-fg);font-size:16px;line-height:1;padding:0 4px">×</button>
    </div>`;
  }
  if(state.swUpdateReady){
    m += `<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;
      background:var(--bluebg);border:1px solid var(--blueline);border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:14px;color:var(--status-aprobo-fg)">
      <span>Hay una versión nueva de Entreclases</span>
      <button class="chip on" data-a="sw-update-apply" style="margin:0">Actualizar</button>
    </div>`;
  }
  if(state.saveErr) m += `<div class="saveerr">No se pudo guardar el último cambio. Descargá una copia de respaldo por las dudas.</div>`;
  if(state.view==="tablero") m += vTablero();
  if(state.view==="lista") m += vLista();
  if(state.view==="detalle") m += vDetalle();
  if(state.view==="cuenta") m += vCuenta();
  if(state.view==="panel") m += isAdmin ? vPanel() : vTablero();
  if(state.view==="catalog") m += vCatalog();
  if(state.view==="stats") m += vEstadisticas();
  if(state.view==="pagos") m += vPagos();
  if(state.view==="agenda") m += vAgenda();
  if(state.showNew) m += vModal();
  if(state.searchOpen) m += vSearchOverlay();
  if(state.fabPick) m += vFabPickOverlay();
  if(state.qrOverlay) m += vQrOverlay();
  m += `<div class="footer">La app funciona siempre, con o sin internet. Con sincronización activa, los cambios se combinan solos entre tus dispositivos.</div>`;
  const viewKey = state.view;
  const viewChanged = viewKey!==_prevViewKey;
  _prevViewKey = viewKey;
  document.getElementById("app").innerHTML = navShell(isAdmin) + fabHtml() + `<main class="appmain${viewChanged?" view-enter":""}">${m}</main>` + toastWrap();
  if(typeof observeGrowBars==="function") observeGrowBars();
  if(viewChanged && typeof animateCounters==="function") animateCounters();
  const fi = document.getElementById("importFile");
  if(fi) fi.addEventListener("change", e=>{
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{ try{
        const p = JSON.parse(r.result);
        if(Array.isArray(p.students)){
          const now=Date.now();
          state.students = p.students.map(x=>({...x, updatedAt:x.updatedAt||now}));
          save(); render();
        }
      }catch(err){ alert("El archivo no tiene un formato válido."); } };
    r.readAsText(f);
  });
  const nn = document.getElementById("n-name"); if(nn) nn.focus();
  const gs = document.getElementById("global-search-input");
  if(gs && document.activeElement!==gs) gs.focus();
}
