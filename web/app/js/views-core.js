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
// desc (paso 142, opcional): subtítulo de una línea que explica qué se hace en la vista — sólo
// texto plano corto, no HTML (usa esc() como todo lo demás acá).
const pageHead = (eyebrow,title,actionHtml,desc) =>
  `<div class="pagehead"><div><div class="eyebrow">${esc(eyebrow)}</div><h2>${esc(title)}</h2>${
    desc?`<div class="hint" style="margin-top:2px">${esc(desc)}</div>`:""}</div>${
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

// Cumpleaños (paso 115) — vela + torta, mismo criterio de línea que el resto del set.
const ICON_CAKE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3"/><path d="M10.7 1.3c0 .8.6 1 .6 1.7s-.6.9-.6 1.7"/><rect x="4" y="10" width="16" height="9" rx="2"/><path d="M4 14.5c1.3 1 2.3 1 3.6 0 1.3-1 2.3-1 3.6 0 1.3 1 2.3 1 3.6 0 1.3-1 2.3-1 3.6 0"/><path d="M4 19v-3.5M20 19v-3.5"/></svg>`;

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

// Botón discreto y permanente de feedback (paso 147) — mismo lugar que el resto del pie de la
// barra, siempre visible, para que reportar algo nunca dependa de encontrar Cuenta primero.
// Oculto en modo demo: no hay cuenta real detrás para asociar el reporte (mismo criterio que
// sesIsAdmin() con IS_DEMO — la demo no toca el backend de verdad).
function feedbackNavBtn(){
  if(IS_DEMO) return "";
  return `<button class="navitem" data-a="feedback-open" title="¿Sugerencias? Contanos qué te parece">${ICON_CHAT}<span class="navitem-label">Sugerencias</span></button>`;
}

// Foto del docente en la barra lateral (paso 137, sólo escritorio — .appnav-brand/.docente-mini
// están ocultos en mobile, ver styles.css): sólo lectura acá, se edita desde Cuenta. En modo demo
// avatarHtml ya cae solo en iniciales (avatarUrlFor corta con IS_DEMO), nunca inventa una foto.
function docenteMiniHtml(){
  const doc=docenteFor();
  return `<button class="docente-mini" data-a="nav-cuenta" title="Cuenta">
    ${avatarHtml("docente", doc.nombre||"Docente", doc.foto, 28)}
    <span class="navitem-label">${esc(doc.nombre||"Tu cuenta")}</span>
  </button>`;
}

function navShell(isAdmin){
  const items = isAdmin ? [...NAV_ITEMS,{view:"panel",action:"nav-panel",label:"Panel",icon:ICON_SHIELD}] : NAV_ITEMS;
  const isOn = (it) => state.view===it.view || (it.altViews||[]).includes(state.view);
  const badgeFor = (it) => it.view==="panel" && state.reportesPendingCount
    ? `<span class="navbadge">${state.reportesPendingCount>99?"99+":state.reportesPendingCount}</span>` : "";
  const itemsHtml = items.map(it=>
    `<button class="navitem ${isOn(it)?"on":""}" data-a="${it.action}">${it.icon}<span class="navitem-label">${esc(it.label)}</span>${badgeFor(it)}</button>`
  ).join("");
  return `<nav class="appnav no-print">
    <button class="appnav-brand" data-a="nav-tablero" aria-label="Ir al tablero"><span class="logo-mark">${ICON_CHECK}</span>Entreclases</button>
    <button class="navitem navitem-search" data-a="open-search" title="Buscar (atajo: /)">${ICON_SEARCH}<span class="navitem-label">Buscar</span></button>
    <div class="appnav-list">${itemsHtml}</div>
    <div class="appnav-foot">${docenteMiniHtml()}${syncChip()}${feedbackNavBtn()}${themeNavBtn()}${logoutNavBtn()}</div>
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


// Llaves a mano (paso 139): mini-modal de "Compartir acceso" — llave individual (ficha, lista) o
// grupal (materia) sin pasar por Cuenta → Portal. openShareOverlay() (sync.js) ya se ocupó de
// activar el portal general y generar la llave si hacía falta antes de que esto se pinte; acá
// sólo se muestra el resultado (o el estado de carga/error mientras tanto). Mismo patrón de
// overlay/modal que vQrOverlay — click afuera cierra, click adentro no propaga.
function vShareOverlay(){
  const o = state.shareOverlay; if(!o) return "";
  let title="", body="";
  if(o.kind==="alumno"){
    const st = state.students.find(x=>x.id===o.id);
    if(!st) return "";
    title = "Compartir acceso — "+esc(st.name);
    body = vShareOverlayAlumno(st, o);
  }else{
    const m = subjById(o.id);
    if(!m) return "";
    title = "Llave grupal — "+esc(m.name);
    body = vShareOverlayGrupo(m, o);
  }
  return `<div class="overlay no-print" data-a="share-close">
    <div class="modal" data-a="share-modal-noop" style="max-width:400px">
      <div class="ftitle" style="font-size:16px">${title}</div>
      ${body}
      <div style="margin-top:14px;text-align:right"><button class="chip" data-a="share-close">Cerrar</button></div>
    </div>
  </div>`;
}

function vShareOverlayAlumno(s, o){
  if(o.busy || !state.portalLoaded) return skeletonRows(2);
  if(state.portalError && !state.portal){
    return `<div class="saveerr">${esc(state.portalError)}</div>
    <button class="chip" data-a="share-open" data-kind="alumno" data-id="${esc(s.id)}">Reintentar</button>`;
  }
  const token = tokenForStudent(s.id);
  if(!token){
    const err = state.portalAlumnoError || state.portalError;
    return (err?`<div class="saveerr">${esc(err)}</div>`:"") +
      `<button class="chip" data-a="share-open" data-kind="alumno" data-id="${esc(s.id)}">Reintentar</button>`;
  }
  const url = portalUrl(token);
  const dias = llaveAlumnoVenceDias(s.id);
  const vencida = dias!==null && dias<=0;
  const busy = state.portalAlumnoBusy===s.id;
  return `<div class="hint" style="margin-bottom:10px">Un link propio para ${esc(s.name)}, sin login — muestra su propio saldo pendiente y cómo pagarte, nunca notas, señas ni comentarios privados.</div>
  <div class="field"><input readonly value="${esc(url)}" onclick="this.select()"></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
    <button class="chip" data-a="share-copy">Copiar link</button>
    ${hasPhone(s)?`<a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgCompartirLlave(s,url))}">WhatsApp</a>`:""}
    <button class="chip" data-a="qr-open" data-url="${esc(url)}" data-title="Portal de ${esc(s.name)}">Ver QR</button>
    <button class="chip" data-a="share-regen" ${busy?"disabled":""}>Regenerar</button>
  </div>
  <div class="hint" style="margin-top:10px">${dias===null ? "Llave activa." : vencida ? "Esta llave ya venció — regenerala para renovarla." : `Vence en ${dias} día${dias===1?"":"s"}.`}</div>
  ${state.portalAlumnoError?`<div class="saveerr" style="margin-top:8px">${esc(state.portalAlumnoError)}</div>`:""}`;
}

function vShareOverlayGrupo(m, o){
  if(o.busy || !state.portalLoaded) return skeletonRows(2);
  if(state.portalError && !state.portal){
    return `<div class="saveerr">${esc(state.portalError)}</div>
    <button class="chip" data-a="share-open" data-kind="materia" data-id="${esc(m.id)}">Reintentar</button>`;
  }
  const token = tokenForGrupo(m.id);
  if(!token){
    const err = state.portalGrupoError || state.portalError;
    return (err?`<div class="saveerr">${esc(err)}</div>`:"") +
      `<button class="chip" data-a="share-open" data-kind="materia" data-id="${esc(m.id)}">Reintentar</button>`;
  }
  const url = portalUrl(token);
  const incluidos = ((state.portal.tokensGrupos[token]||{}).alumnos||[]).length;
  const busy = state.portalGrupoBusy===m.id;
  return `<div class="hint" style="margin-bottom:10px">Incluye a ${incluidos} alumno${incluidos===1?"":"s"} de ${esc(m.name)} — ven la biblioteca de la materia y las próximas clases/exámenes del grupo, nunca notas ni pagos.</div>
  <div class="field"><input readonly value="${esc(url)}" onclick="this.select()"></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
    <button class="chip" data-a="share-copy">Copiar link</button>
    <button class="chip" data-a="qr-open" data-url="${esc(url)}" data-title="Portal de ${esc(m.name)}">Ver QR</button>
    <button class="chip" data-a="share-regen" ${busy?"disabled":""}>Regenerar</button>
    <button class="chip" data-a="envio-open" data-materia="${esc(m.id)}">Enviar a los alumnos</button>
  </div>
  <div class="hint" style="margin-top:10px">Para sumar o sacar alumnos del grupo, andá a Cuenta → Portal → Llaves grupales → «Editar alumnos».</div>
  ${state.portalGrupoError?`<div class="saveerr" style="margin-top:8px">${esc(state.portalGrupoError)}</div>`:""}`;
}

// Enviar la llave grupal a varios a la vez (paso 140): WhatsApp no deja mandar a varios de una
// desde la web, así que esto es el máximo asistido posible — un botón de WhatsApp por alumno con
// mensaje pre-armado (editable acá mismo, misma plantilla que Cuenta → Mensajes) y un "enviado"
// que se marca al click y persiste (tokens_grupos[tok].enviados, ver toggleEnvioGrupo en sync.js)
// para retomar donde quedaste. "Mandar por mail a todos" va todo en CCO (nunca en Para, para no
// exponer mails de unos alumnos a otros) — ver envio-mail-todos en events.js.
function vEnvioOverlay(){
  const o = state.envioOverlay; if(!o) return "";
  const m = subjById(o.materiaId); if(!m) return "";
  const tok = tokenForGrupo(o.materiaId); if(!tok) return "";
  const entry = (state.portal && state.portal.tokensGrupos[tok]) || {alumnos:[], enviados:{}};
  const enviados = entry.enviados || {};
  const url = portalUrl(tok);
  const alumnos = (entry.alumnos||[]).map(id=>state.students.find(x=>x.id===id)).filter(Boolean)
    .sort((a,b)=>a.name.localeCompare(b.name));
  return `<div class="overlay no-print" data-a="envio-close">
    <div class="modal" data-a="envio-modal-noop" style="max-width:460px">
      <div class="ftitle" style="font-size:16px">Enviar llave grupal — ${esc(m.name)}</div>
      <div class="hint" style="margin-bottom:10px">WhatsApp no permite mandar a varios de una desde la web — este es el máximo posible: uno por uno, asistido, marcando a quién ya le mandaste para retomar donde quedaste.</div>
      <div class="field"><div class="flabel">Mensaje (variables: {alumno}, {materia}, {link}, {mail})</div>
        <textarea data-cf="mensaje-compartirLlaveGrupal" rows="3">${esc(mensajesFor().compartirLlaveGrupal||"")}</textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
        <button class="chip" data-a="envio-copy-msg">Copiar mensaje</button>
        <button class="chip" data-a="envio-copy-lista">Copiar lista</button>
        <button class="chip" data-a="envio-mail-todos">Mandar por mail a todos</button>
      </div>
      <div style="max-height:280px;overflow-y:auto;border-top:1px solid var(--soft);padding-top:6px">
      ${alumnos.length===0 ? `<div class="empty">Esta llave todavía no incluye alumnos.</div>` : alumnos.map(s=>{
        const sent = !!enviados[s.id];
        return `<div class="log" style="align-items:center;flex-wrap:wrap">
          <div class="body">${esc(s.name)}${sent?`<div class="note">Enviado ${esc(fmtDateTime(enviados[s.id]))}</div>`:""}</div>
          ${hasPhone(s)?`<a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgCompartirLlaveGrupal(s,m.name,url))}">WhatsApp</a>`:`<span class="hint">Sin WhatsApp cargado</span>`}
          <button class="chip ${sent?"on":""}" data-a="envio-toggle" data-materia="${esc(o.materiaId)}" data-id="${esc(s.id)}">${sent?"Enviado ✓":"Marcar enviado"}</button>
        </div>`;
      }).join("")}
      </div>
      ${state.portalGrupoError?`<div class="saveerr" style="margin-top:8px">${esc(state.portalGrupoError)}</div>`:""}
      <div style="margin-top:14px;text-align:right"><button class="chip" data-a="envio-close">Cerrar</button></div>
    </div>
  </div>`;
}


// Feedback (paso 147): "¿Sugerencias?" en el pie de la barra — sin fricción, dos clicks (abrir +
// enviar) y gracias. La pantalla actual (state.view) se adjunta sola al mandar (ver feedback-send
// en events.js), nunca se le pide al docente que la tipee. Mismo patrón de overlay/modal que
// vShareOverlay/vEnvioOverlay.
function vFeedbackOverlay(){
  if(!state.feedbackOpen) return "";
  const status = state.feedbackStatus||"idle";
  if(status==="ok"){
    return `<div class="overlay no-print" data-a="feedback-close">
      <div class="modal" data-a="feedback-modal-noop" style="max-width:360px;text-align:center">
        <div class="ftitle" style="font-size:16px">¡Gracias!</div>
        <div class="hint" style="margin:10px 0 14px">Ya nos llegó tu mensaje.</div>
        <button class="chip" data-a="feedback-close">Cerrar</button>
      </div>
    </div>`;
  }
  const tipo = state.feedbackTipo||"problema";
  return `<div class="overlay no-print" data-a="feedback-close">
    <div class="modal" data-a="feedback-modal-noop" style="max-width:400px">
      <div class="ftitle" style="font-size:16px">¿Sugerencias?</div>
      <div class="hint" style="margin-bottom:10px">Un problema, una idea o algo que te gustó — nos sirve todo.</div>
      <div class="tabs" style="margin-bottom:10px">
        ${FEEDBACK_TIPOS.map(t=>`<button class="tabbtn ${tipo===t.id?"on":""}" data-a="feedback-tipo" data-f="${t.id}">${esc(t.label)}</button>`).join("")}
      </div>
      <div class="field"><textarea id="feedback-msg" placeholder="Contanos...">${esc(state.feedbackMsg||"")}</textarea></div>
      <div class="hint" style="margin:6px 0 10px">Se adjunta sola la pantalla en la que estás — nunca datos de tus alumnos.</div>
      ${status==="error"?`<div class="saveerr" style="margin-bottom:8px">${esc(state.feedbackError||"No se pudo enviar.")}</div>`:""}
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="chip" data-a="feedback-close">Cancelar</button>
        <button class="primary" style="margin-left:0" data-a="feedback-send" ${status==="sending"?"disabled":""}>${status==="sending"?"Enviando…":"Enviar"}</button>
      </div>
    </div>
  </div>`;
}

// Banner descartable de bienvenida post-registro (paso 147) — arranca en el tablero al crear la
// cuenta y dura FEEDBACK_BANNER_DAYS; mismo patrón dismissible que vBackupReminder.
function vFeedbackBanner(){
  if(!feedbackBannerActive()) return "";
  return `<div class="formcard" style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap">
    <div style="font-size:13px;color:var(--muted)">¿Qué te está pareciendo Entreclases? Contanos — nos sirve tanto un problema como una idea o un simple "me gusta".</div>
    <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
      <button class="chip" data-a="feedback-open">Contar algo</button>
      <button class="del" style="font-size:20px" data-a="feedback-banner-dismiss" title="Descartar" aria-label="Descartar">×</button>
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

const ICON_TRASH=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>`;

// Lápiz (paso 127, renombrar unidad/subunidad) — mismo set de línea (stroke=currentColor,
// stroke-width 2) que el resto de ICON_*.
const ICON_EDIT=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;

// "Arriba" para reordenar (paso 127): el mismo ICON_CHEVRON (ya usado en desplegables) rotado
// 180° en vez de dibujar un ícono nuevo — "abajo" usa ICON_CHEVRON tal cual.
const ICON_CHEVRON_UP=`<span style="display:inline-flex;transform:rotate(180deg)">${ICON_CHEVRON}</span>`;


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

// Última clase dictada (para ordenar/mostrar "por actividad") — null si nunca tuvo una.
function lastSessionDate(s){
  return (s.sessions||[]).reduce((max,c)=>(!isAusente(c) && (!max||c.date>max))?c.date:max, null);
}


// Editor de foto de perfil (paso 137), reusado para el docente (Cuenta) y cada alumno (ficha) —
// mismo patrón de subida que "+ Subir" de Materiales (vMaterialUploadRow), sólo que acá no hay
// selector de materia/unidad: sólo el archivo y la key ("docente" o "alumno-{id}", ver
// avatarKeyForStudent/AVATAR_KEY_DOCENTE en sync.js). El resize a cuadrado/256px/WebP pasa en el
// navegador (resizeImageToAvatar, helpers.js) recién al tocar "Subir", nunca antes.
function vAvatarEditor(key, name, foto, sizePx){
  if(IS_DEMO) return `<div style="display:flex;align-items:center;gap:12px">${avatarHtml(key, name, foto, sizePx||64)}<span class="hint">En modo demostración no se pueden subir fotos.</span></div>`;
  const inputId = "avatar-file-"+key.replace(/[^a-zA-Z0-9_-]/g,"");
  const uploading = state.avatarUploading;
  const confirming = state.avatarDeleteConfirmKey===key;
  const offline = !navigator.onLine;
  return `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    ${avatarHtml(key, name, foto, sizePx||64)}
    <div style="display:flex;flex-direction:column;gap:6px;flex:1;min-width:220px">
      ${offline ? `<div class="hint">Necesitás conexión a internet para subir o cambiar la foto.</div>` : `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="file" accept="image/*" id="${inputId}" style="max-width:220px" ${uploading?"disabled":""}>
        <button class="chip" data-a="avatar-upload" data-key="${key}" data-input="${inputId}" ${uploading?"disabled":""}>${uploading?"Subiendo…":(foto?"Cambiar foto":"+ Subir foto")}</button>
        ${foto && !confirming ? `<button class="chip" data-a="avatar-delete-ask" data-key="${key}">Borrar foto</button>` : ""}
        ${confirming ? `<span style="font-size:12px;color:var(--status-desaprobo-fg)">¿Borrar la foto?</span>
          <button class="danger" data-a="avatar-delete-confirm" data-key="${key}">Sí, borrar</button>
          <button class="chip" data-a="avatar-delete-cancel">Cancelar</button>` : ""}
      </div>`}
      ${state.avatarUploadError ? `<div class="hint" style="color:var(--status-desaprobo-fg)">${esc(state.avatarUploadError==="offline"?"Necesitás conexión a internet para subir la foto.":state.avatarUploadError)}</div>` : ""}
      <div class="hint">Opcional — se recorta cuadrada y se achica automáticamente antes de subir.</div>
    </div>
  </div>`;
}


/* ============ WhatsApp: mensajes pre-armados, solo links wa.me (sin API) ============
   Todos los textos salen de plantillas editables en Cuenta → "Mensajes" (paso 117, ver
   MENSAJES_META en config.js, mensajeTexto()/mensajesFor() en helpers.js) — estas funciones sólo
   resuelven QUÉ variables corresponden en cada caso y, cuando el dato de fondo no alcanza para
   completar la plantilla (sin historial de clases, sin fecha de examen), devuelven una pregunta
   genérica fija en vez de mandar una plantilla a medio completar. */
function waMsgCumple(s){
  return mensajeTexto("cumpleanos", {alumno:studentFirstName(s), mail:s.email||""});
}

function waMsgProximaClase(s){
  return mensajeTexto("proximaClase", {alumno:studentFirstName(s), materia:s.subject||"la materia", mail:s.email||""});
}

function waMsgTareaHoy(s){
  const last=[...(s.sessions||[])].filter(c=>!isAusente(c)).sort((a,b)=>b.date.localeCompare(a.date))[0];
  if(!last) return `Hola ${studentFirstName(s)}! ¿Cómo veníamos con la tarea?`;
  const tarea = last.note || last.topic || "lo que vimos en la última clase";
  return mensajeTexto("tarea", {alumno:studentFirstName(s), fecha:fmtDate(last.date), tarea, mail:s.email||""});
}

function waMsgExamen(s){
  const d=daysTo(s.examDate);
  if(d===null) return `Hola ${studentFirstName(s)}! ¿Cómo venís con el estudio para el examen?`;
  return mensajeTexto("examen", {alumno:studentFirstName(s), materia:s.subject||"la materia",
    dias:`${d} día${d===1?"":"s"}`, fecha:s.examDate?` (${fmtDate(s.examDate)})`:"", mail:s.email||""});
}

// Compartir la llave de portal por WhatsApp (paso 139) — la única plantilla que arma su propia
// variable de fondo (link) en vez de leerla del alumno, ver vShareOverlay().
function waMsgCompartirLlave(s, link){
  return mensajeTexto("compartirLlave", {alumno:studentFirstName(s), link, mail:s.email||""});
}

// Compartir la llave GRUPAL de una materia por WhatsApp (paso 140) — mismo criterio que
// waMsgCompartirLlave, con la materia como variable extra. genericoMsgCompartirLlaveGrupal()
// arma la versión sin nombre (para "Copiar mensaje", pensado para pegar donde sea) limpiando el
// espacio doble que deja {alumno} vacío.
function waMsgCompartirLlaveGrupal(s, materiaName, link){
  return mensajeTexto("compartirLlaveGrupal", {alumno:studentFirstName(s), materia:materiaName, link, mail:s.email||""});
}

function genericoMsgCompartirLlaveGrupal(materiaName, link){
  return mensajeTexto("compartirLlaveGrupal", {alumno:"", materia:materiaName, link, mail:""}).replace(/\s{2,}/g," ").trim();
}

function waQuickMessage(s){
  const d=daysTo(s.examDate);
  return (d!==null && d>=0 && d<=14) ? waMsgExamen(s) : waMsgProximaClase(s);
}

// Felicitación por aprobar (paso 162) — se ofrece apenas se marca "Aprobó" un resultado de
// examen (ver state.examCelebrate en events.js/vExamCelebrate acá abajo).
function waMsgFelicitar(s, grade){
  return mensajeTexto("felicitarAprobo", {alumno:studentFirstName(s),
    materia:s.subject?` ${s.subject}`:"", nota:grade?` (nota: ${grade})`:"", mail:s.email||""});
}

// Despedida de fin de cuatrimestre (paso 163) — ver "fincuatri-despedir" en events.js.
function waMsgDespedida(s){
  return mensajeTexto("despedida", {alumno:studentFirstName(s), mail:s.email||""});
}

// Aviso de pack de clases agotado (paso 158, alerta "pack" de studentAlerts en helpers.js) — usa
// el último pack vendido (ya en 0) para completar {clases} con la cantidad que tenía, aunque para
// entonces ya no cuente como "activo".
function waMsgPackAgotado(s){
  const u = ultimoPackClases(s);
  return mensajeTexto("packAgotado", {alumno:studentFirstName(s), clases:u?u.total:"", mail:s.email||""});
}

function waMsgForAlert(s, kind){
  if(kind==="examen") return waMsgExamen(s);
  if(kind==="tarea") return waMsgTareaHoy(s);
  if(kind==="pack") return waMsgPackAgotado(s);
  return waMsgProximaClase(s);
}

// Recordatorio de pago pendiente (clases sin cobrar + mensualidad del mes + señas pendientes,
// ver pendienteTotalFor en helpers.js) — lo usa tanto el menú de WhatsApp de la ficha como el
// aviso de cobros atrasados del tablero. Sin deuda usa la plantilla "cobro" (coordinar nomás);
// con deuda, "avisoDeuda".
function waMsgCobro(s){
  const total = pendienteTotalFor(s);
  const alumno = studentFirstName(s);
  const mail = s.email||"";
  // {link_pago}/{alias} (paso 141): datos de Cuenta → Cobros, disponibles para armar el mensaje a
  // mano; {link_pago_linea} es la versión ya compuesta ("Podés pagar acá: …") que usa el default
  // de "avisoDeuda" — se cae sola (fillTemplateLines) si el docente no cargó ningún link.
  const cobros = cobrosDocenteFor();
  const link_pago = cobros.linkMP || cobros.linkOtro || "";
  const alias = cobros.alias || "";
  const link_pago_linea = link_pago ? `Podés pagar acá: ${link_pago}` : "";
  return total<=0 ? mensajeTexto("cobro", {alumno, mail, link_pago, alias, link_pago_linea})
    : mensajeTexto("avisoDeuda", {alumno, monto:fmtMoney(total), mail, link_pago, alias, link_pago_linea});
}

// Recordatorio de una clase de hoy/mañana (paso 111, plantilla "recordatorioClase") — la firma
// con el nombre del docente se agrega aparte, sólo si está cargado (no es una variable de la
// plantilla a propósito, para no duplicar ese dato en dos lugares editables).
function waMsgRecordatorioClase(s, dia, hora){
  const doc = docenteFor();
  const texto = mensajeTexto("recordatorioClase", {alumno:studentFirstName(s), materia:s.subject||"la materia", dia, hora, mail:s.email||""});
  return doc.nombre ? `${texto} Nos vemos — ${doc.nombre}` : texto;
}

// Botón "Recordar por WhatsApp" para una clase puntual de hoy/mañana (tablero Hoy y Agenda) —
// e trae studentId/time (agendaRangeEvents en helpers.js); nada si el alumno no tiene teléfono
// cargado (mismo criterio que el resto de los botones de WhatsApp, ver hasPhone en helpers.js).
function vWaRecordarClaseBtn(e, dia){
  const s = state.students.find(x=>x.id===e.studentId);
  if(!s || !hasPhone(s)) return "";
  return `<a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgRecordatorioClase(s,dia,e.time))}">Recordar por WhatsApp</a>`;
}

// Botón general "Mandar mensaje" de las alertas (paso 126): a diferencia del ícono rápido de al
// lado (atado al motivo puntual de esa alerta, ver waMsgForAlert), este siempre deja elegir entre
// un recordatorio (próxima clase o, si el examen está cerca, el de examen — mismo criterio que
// waQuickMessage), un aviso de pago (con o sin deuda, ver waMsgCobro) o el mensaje libre de la
// ficha, sin importar si esta alerta en particular vino de un examen, una tarea o una ausencia.
// Plantillas propias (paso 175): variables genéricas resueltas contra un alumno puntual, para
// completar las mismas {alumno}/{materia}/{monto}/{link_pago}/{alias}/{mail} que ya usan las
// plantillas generales de cobros/llaves — ver PLANTILLA_PROPIA_VARS en config.js.
function waMsgPropia(s, p){
  const cobros = cobrosDocenteFor();
  const total = pendienteTotalFor(s);
  return fillTemplateLines(p.texto, {
    alumno:studentFirstName(s), materia:s.subject||"", monto:total>0?fmtMoney(total):"",
    link_pago:cobros.linkMP||cobros.linkOtro||"", alias:cobros.alias||"", mail:s.email||"",
  });
}

// Chips de plantillas propias para sumar a cualquier selector de "mandar mensaje" (ficha, alertas,
// aviso de cobros) — nada si el docente no cargó ninguna.
function vPlantillasPropiasChips(s){
  const propias = mensajesPropiasFor();
  if(!propias.length) return "";
  return propias.map(p=>`<a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgPropia(s,p))}">${esc(p.nombre||"(sin nombre)")}</a>`).join("");
}

function vAlertMsgPicker(s){
  if(!hasPhone(s)) return `<div class="hint" style="margin:2px 0 8px 4px">Cargá el teléfono en la ficha para mandar WhatsApp.</div>`;
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 8px 4px">
    <a class="chip" target="_blank" rel="noopener" href="${waLink(s,waQuickMessage(s))}">Recordatorio</a>
    <a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgCobro(s))}">Aviso de pago</a>
    <button class="chip" data-a="open" data-id="${s.id}">Mensaje libre (en la ficha)</button>
    ${vPlantillasPropiasChips(s)}
  </div>`;
}

function vWhatsApp(s){
  const pendiente = pendienteTotalFor(s);
  return `<div class="formcard"><div class="ftitle">Enviar WhatsApp</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgProximaClase(s))}">Recordatorio de próxima clase</a>
      <a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgTareaHoy(s))}">Tarea de la última clase</a>
      ${s.examDate?`<a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgExamen(s))}">Recordatorio de examen</a>`:""}
      ${pendiente>0?`<a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgCobro(s))}">Recordatorio de pago pendiente</a>`:""}
      ${vPlantillasPropiasChips(s)}
    </div>
    <div class="field"><div class="flabel">Mensaje libre</div>
      <textarea id="wa-free-text">${esc(waMsgProximaClase(s))}</textarea></div>
    <button class="chip" style="margin-top:8px" data-a="wa-free-send">Abrir en WhatsApp</button>
  </div>`;
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


// Nota: los campos de este modal no están atados a `state` (a propósito, ver el comentario
// de "new-career-inline" en events.js) — mostrar/ocultar "Opciones avanzadas" y "¿Cobrás seña?"
// (paso 133) toca el DOM directo en vez de pasar por render(), para no perder lo ya tipeado en
// otros campos. Los campos avanzados quedan siempre en el DOM (ocultos con display:none cuando
// la sección está cerrada) — así lo que se cargó ahí no se pierde si se colapsa antes de crear.
function vModal(){
  const advOpen = state.newStudentAdvancedOpen;
  const seniaActiva = state.newStudentSeniaActiva;
  const tarifaDef = tarifaDefaultFor();
  const hasTarifaDefault = Number(tarifaDef.monto)>0 && tarifaDef.modalidad;
  const tarifaOverride = state.newStudentTarifaOverride || !hasTarifaDefault;
  return `<div class="overlay"><div class="modal">
    <div class="ftitle" style="font-size:16px">Nuevo estudiante</div>
    ${state.newStudentError?`<div class="saveerr">${esc(state.newStudentError)}</div>`:""}
    <div class="frow">
      <div class="field"><div class="flabel">Nombre *</div><input id="n-name" autofocus data-enter="create"></div>
      <div class="field"><div class="flabel">Carrera</div>
        <div style="display:flex;gap:6px;align-items:center">
          <input id="n-career" list="n-careers-datalist" style="flex:1" placeholder="Elegí o escribí una carrera" data-enter="create">
          <button class="chip" data-a="new-career-inline" style="padding:6px 10px;font-size:12px" title="Crear una carrera nueva">+ nueva</button>
        </div>
        <datalist id="n-careers-datalist">${(state.catalog.careers||[]).map(c=>`<option value="${esc(c.nombre)}">`).join("")}</datalist>
      </div></div>
    <div class="frow">
      <div class="field"><div class="flabel">Materia</div><select id="n-subject" data-cf="n-subject-pick" data-enter="create">
        <optgroup label="Materias">
          ${state.catalog.subjects.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("")}
        </optgroup>
        ${(state.catalog.packs||[]).filter(p=>p.subjectIds.length>=2).length ? `<optgroup label="Packs">
          ${state.catalog.packs.filter(p=>p.subjectIds.length>=2).map(p=>`<option value="pack:${p.id}">${esc(p.name)}</option>`).join("")}
        </optgroup>` : ""}
        <option value="">Otra / sin materia por ahora</option></select></div>
      <div class="field"><div class="flabel">Teléfono (WhatsApp)</div><input id="n-phone" placeholder="Ej: 11 2345-6789" data-enter="create"></div></div>
    ${hasTarifaDefault?`<div class="hint" id="n-tarifa-info" style="margin-top:2px${tarifaOverride?";display:none":""}">Tarifa: ${fmtMoney(tarifaDef.monto)} ${tarifaDef.modalidad==="hora"?"por hora":"por clase"} (tu habitual) — <button class="chip" style="padding:1px 8px;font-size:11px" data-a="new-tarifa-override-toggle">cambiar</button></div>`:""}
    <div class="frow" id="n-tarifa-row" style="${hasTarifaDefault&&!tarifaOverride?"display:none":""}">
      <div class="field"><div class="flabel">Tarifa (pesos)</div><input type="number" min="0" id="n-tarifa" placeholder="Sin cargar = sin cobro" value="${hasTarifaDefault?esc(tarifaDef.monto):""}" data-enter="create"></div>
      <div class="field"><div class="flabel">Modalidad de cobro</div><select id="n-modalidad" data-enter="create">
        <option value="">—</option>
        <option value="clase" ${hasTarifaDefault&&tarifaDef.modalidad==="clase"?"selected":""}>Por clase</option>
        <option value="hora" ${hasTarifaDefault&&tarifaDef.modalidad==="hora"?"selected":""}>Por hora</option>
        <option value="mensual">Mensual</option></select></div></div>
    <div class="hint" style="margin-top:2px">¿Cursa más de una materia? Cargalo una vez por cada materia — o elegí un pack para crear todas sus fichas de una.</div>
    <div style="margin-top:10px">
      <button class="chip" id="n-adv-toggle" data-a="new-advanced-toggle">${advOpen?"▾":"▸"} Opciones avanzadas</button>
    </div>
    <div id="n-advanced" style="margin-top:10px;${advOpen?"":"display:none"}">
      <div class="frow">
        <div class="field"><div class="flabel">Mail de contacto (opcional)</div><input type="email" id="n-email" placeholder="alumno@mail.com" data-enter="create"></div>
        <div class="field"><div class="flabel">Cátedra / universidad</div><input id="n-chair" data-enter="create"></div></div>
      <div class="frow">
        <div class="field"><div class="flabel">Cumpleaños (opcional)</div><input type="date" id="n-birth" data-enter="create"></div>
        <div class="field"><div class="flabel">Fecha de examen (si ya la sabe)</div><input type="date" id="n-exam" data-enter="create"></div></div>
      <div class="field"><div class="flabel">Tags (separados por coma, opcional)</div><input id="n-tags" placeholder="Ej: ingreso, online" data-enter="create"></div>
      <div class="field"><div class="flabel">Notas iniciales (de dónde arranca, qué le cuesta)</div><textarea id="n-notes"></textarea></div>
      <div class="field"><div class="flabel">¿Cobrás seña?</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="chip ${!seniaActiva?"on":""}" id="n-senia-no" data-a="new-senia-toggle" data-f="no">No</button>
          <button class="chip ${seniaActiva?"on":""}" id="n-senia-si" data-a="new-senia-toggle" data-f="si">Sí</button>
        </div></div>
      <div id="n-senia-fields" class="frow" style="${seniaActiva?"":"display:none"}">
        <div class="field"><div class="flabel">Tipo</div><select id="n-senia-tipo">
          <option value="monto">Monto fijo</option>
          <option value="porcentaje">% de la tarifa</option></select></div>
        <div class="field"><div class="flabel">Monto / porcentaje</div><input type="number" min="0" id="n-senia-valor" data-enter="create"></div></div>
    </div>
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

// Aparte de _prevViewKey (que arranca en null y por eso da "cambió" también en el primerísimo
// render): este flag evita el whoosh (paso 179) en la carga inicial de la página — sólo debe sonar
// en una navegación real, nunca al abrir la app.
let _hasRenderedOnce = false;

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
  {
    // Paso 177: gate de cuentas por aprobar/rechazadas — "estado" viaja cacheado en la sesión
    // (loadRole(), auth.js). Ausente = sesión vieja de antes de este paso, se trata como
    // aprobada (todas las cuentas existentes se backfillearon a 'aprobado' en la migración).
    const _ses=getSes();
    if(_ses && (_ses.estado==="pendiente"||_ses.estado==="rechazado")){
      document.body.classList.remove("has-nav"); _prevViewKey=null;
      document.getElementById("app").innerHTML = `<div class="view-fade">${vCuentaEnRevision(_ses.estado)}</div>`;
      return;
    }
  }
  if(state.view==="informe"){
    if(!sel()){ state.view="tablero"; }
    else{ document.body.classList.remove("has-nav"); _prevViewKey=null; document.getElementById("app").innerHTML = `<div class="view-fade">${vInforme()}</div>`+toastWrap(); if(typeof syncHistory==="function") syncHistory(); return; }
  }
  if(state.view==="contrato"){
    if(!sel()){ state.view="tablero"; }
    else{ document.body.classList.remove("has-nav"); _prevViewKey=null; document.getElementById("app").innerHTML = `<div class="view-fade">${vContrato()}</div>`+toastWrap(); if(typeof syncHistory==="function") syncHistory(); return; }
  }
  if(state.view==="recibo"){
    if(!sel() || !reciboFor(sel(), state.reciboId)){ state.view="tablero"; }
    else{ document.body.classList.remove("has-nav"); _prevViewKey=null; document.getElementById("app").innerHTML = `<div class="view-fade">${vRecibo()}</div>`+toastWrap(); if(typeof syncHistory==="function") syncHistory(); return; }
  }
  if(state.view==="agenda-imprimir"){
    document.body.classList.remove("has-nav"); _prevViewKey=null;
    document.getElementById("app").innerHTML = `<div class="view-fade">${vAgendaImprimir()}</div>`+toastWrap();
    if(typeof syncHistory==="function") syncHistory();
    return;
  }
  document.body.classList.add("has-nav");
  if(typeof checkOnboardingComplete==="function") checkOnboardingComplete();
  const ses = getSes();
  const isAdmin = sesIsAdmin(ses);
  let m = "";
  if(typeof IS_BACKEND_DEV!=="undefined" && IS_BACKEND_DEV){
    m += `<div class="no-print" style="position:fixed;bottom:10px;right:10px;z-index:60;
      background:var(--amberbg);border:1px solid var(--amberline,var(--blueline));border-radius:8px;
      padding:4px 8px;font-size:11px;color:var(--status-pausado-fg);pointer-events:none">⚙ backend de desarrollo</div>`;
  }
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
  if(state.shareOverlay) m += vShareOverlay();
  if(state.envioOverlay) m += vEnvioOverlay();
  if(state.feedbackOpen) m += vFeedbackOverlay();
  if(state.agendaEdit) m += vAgendaEditOverlay();
  if(state.agendaEditGrupal) m += vAgendaEditOverlayGrupal();
  if(state.agendaHourList) m += vAgendaHourListOverlay();
  if(state.grupalForm) m += vGrupalForm();
  if(state.finCuatrimestreOpen) m += vFinCuatrimestreOverlay();
  m += `<div class="footer">La app funciona siempre, con o sin internet. Con sincronización activa, los cambios se combinan solos entre tus dispositivos.</div>`;
  const viewKey = state.view;
  const viewChanged = viewKey!==_prevViewKey;
  _prevViewKey = viewKey;
  document.getElementById("app").innerHTML = navShell(isAdmin) + fabHtml() + `<main class="appmain${viewChanged?" view-enter":""}">${m}</main>` + toastWrap();
  if(typeof observeGrowBars==="function") observeGrowBars();
  if(viewChanged && typeof animateCounters==="function") animateCounters();
  // Whoosh muy sutil de cambio de vista (paso 179) — sólo en una navegación real (viewChanged) y
  // nunca en el primerísimo render (_hasRenderedOnce), ver soundWhoosh()/isDesktopLike() en events.js.
  if(viewChanged && _hasRenderedOnce && typeof soundWhoosh==="function") soundWhoosh();
  _hasRenderedOnce = true;
  // grilla semanal (paso 134): al recién entrar a la vista, centra el scroll horizontal en la
  // columna de hoy (mobile no entra en 360px con los 7 días, ver .week-scroll en styles.css) —
  // sólo al abrir la vista, para no pelearle el scroll al usuario en cada re-render.
  if(viewChanged && state.view==="agenda" && (state.agendaViewMode||"semana")==="semana"){
    const wrap = document.querySelector(".week-scroll");
    const todayCol = wrap && wrap.querySelector(".week-head.today");
    if(wrap && todayCol) wrap.scrollLeft = todayCol.offsetLeft - (wrap.clientWidth/2) + (todayCol.clientWidth/2);
  }
  if(typeof syncHistory==="function") syncHistory();
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
  // Salto a un bloque de materiales por unidad (paso 128, ver mat-jump-unit en events.js) — un
  // solo salto por click: se limpia acá después de usarlo, ya con el html de arriba pintado
  // (así el borde resaltado de vMateriales alcanza a mostrarse durante este mismo render).
  if(state.materialesJumpUnitId){
    const targetId=state.materialesJumpUnitId;
    state.materialesJumpUnitId=null;
    const target=document.getElementById("mat-unit-"+targetId);
    if(target) target.scrollIntoView({behavior:"smooth", block:"start"});
  }
}
