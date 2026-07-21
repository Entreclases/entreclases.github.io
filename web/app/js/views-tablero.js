"use strict";

/* ============ vistas ============ */
// Guía de primeros pasos (paso 74, ampliada a 6 hitos en el 204): checklist que se tilda sola
// en base a datos reales (nunca se guarda el progreso aparte, se recalcula en cada render) —
// así no hay nada que migrar ni desincronizar entre dispositivos. Se muestra mientras la cuenta
// esté "vacía" (falta algún paso) y no se haya descartado a mano; se completa sola apenas se
// hacen los 6 (con festejo, paso 179 — ver checkOnboardingComplete en helpers.js), sin
// necesidad de tocar "descartar". Mismos hitos y orden que el tour guiado (tour.js), pero acá
// conviven como checklist persistente en vez de un recorrido paso a paso.
const ONBOARDING_STEPS = [
  {label:"Agregá un alumno", action:"new",
    done:()=>alive().some(s=>!s.sample)},
  {label:"Armá tu primera materia", action:"nav-catalog",
    done:()=>state.catalog.subjects.some(m=>m.id!=="materia-ejemplo")},
  {label:"Agendá una clase", action:"nav-agenda",
    done:()=>alive().some(s=>!s.sample && (((s.horarios||[]).length)||((s.clasesPuntuales||[]).length)))},
  {label:"Registrá una clase", action:"nav-lista",
    done:()=>alive().some(s=>!s.sample && (s.sessions||[]).length>0)},
  {label:"Marcá un cobro pagado", action:"nav-pagos",
    done:()=>alive().some(s=>!s.sample && (s.sessions||[]).some(x=>x.cobrada))},
  {label:"Activá tu portal", action:"nav-cuenta", group:"portal",
    done:()=>!!(state.portal && state.portal.habilitado)},
];

function vTips(){
  if(tipsDismissed()) return "";
  const steps = ONBOARDING_STEPS.map(s=>({...s, ok:s.done()}));
  if(steps.every(s=>s.ok)) return ""; // normalmente ya la descartó checkOnboardingComplete() antes; fallback defensivo
  const doneCount = steps.filter(s=>s.ok).length;
  return `<div class="formcard" style="display:flex;align-items:flex-start;gap:10px;justify-content:space-between">
    <div style="flex:1">
      <div class="ftitle" style="margin-bottom:8px">Primeros pasos <span style="font-weight:400;color:var(--muted)">(${doneCount}/${steps.length})</span></div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${steps.map(s=>`<button class="tip-step ${s.ok?"done":""}" data-a="${s.action}" ${s.group?`data-group="${s.group}"`:""}>
          <span class="tip-step-check">${s.ok?ICON_CHECK.replace('stroke="white"','stroke="currentColor"'):""}</span>
          <span>${esc(s.label)}</span>
        </button>`).join("")}
      </div>
    </div>
    <button class="del" style="font-size:20px" data-a="dismiss-tips" title="Descartar" aria-label="Descartar">×</button>
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

// Cumpleaños de hoy/mañana (paso 115) — fecha de nacimiento opcional (s.birthDate, ficha →
// Resumen); sólo compara mes-día (isBirthday en helpers.js), el año no importa. Arriba del todo
// del tablero, con saludo pre-armado por WhatsApp si tiene teléfono cargado.
function vCumpleanosBanner(){
  const hoy = cumpleaneros(today());
  const manana = cumpleaneros(addDays(today(),1));
  if(hoy.length===0 && manana.length===0) return "";
  // Mismo mecanismo "Mandar mensaje" que la lista de Alertas (state.alertMsgFor + vAlertMsgPicker,
  // paso 178) — se distingue con el prefijo "cumple-" para no chocar con el id llano que usan las
  // alertas del mismo alumno si aparece en las dos listas a la vez.
  const fila = (s,cuando)=>{
    const key = "cumple-"+s.id;
    return `<div style="margin-bottom:6px">
      <div class="alert-row" style="margin-bottom:0">
        <div class="alert" style="cursor:default"><span class="dot"></span><span class="t">${cuando==="hoy"?"Hoy":"Mañana"} cumple <b>${esc(s.name)}</b></span></div>
        ${hasPhone(s)?`<a class="wa-quick" title="Enviar saludo por WhatsApp" target="_blank" rel="noopener" href="${waLink(s,waMsgCumple(s))}">${ICON_CHAT}</a>`:""}
        <button class="chip" style="margin:0" data-a="toggle-alert-msg" data-id="${key}">Mandar mensaje</button>
      </div>
      ${state.alertMsgFor===key?vAlertMsgPicker(s):""}
    </div>`;
  };
  return `<div class="formcard">
    <div class="ftitle" style="display:flex;align-items:center;gap:7px"><span class="icon-inline">${ICON_CAKE}</span> Cumpleaños</div>
    ${hoy.map(s=>fila(s,"hoy")).join("")}${manana.map(s=>fila(s,"manana")).join("")}
  </div>`;
}

/* ============ "Tu día": checklist de pendientes reales + racha "días al día" (paso 155) ============
   Apagable desde Cuenta → Preferencias (mostrarTuDia() en helpers.js). Cada fila de
   pendingTasksToday() ya trae su acción; los exámenes son el único caso especial porque además
   del botón de WhatsApp necesitan marcarse como "ya avisé" para no seguir apareciendo. */
function vTuDiaRow(tarea){
  if(tarea.kind==="examen"){
    const s = state.students.find(x=>x.id===tarea.studentId);
    return `<div class="hoy-row">
      <span class="hoy-row-name">${esc(tarea.text)}</span>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        ${s&&hasPhone(s)?`<a class="wa-quick" title="Enviar WhatsApp" target="_blank" rel="noopener" href="${waLink(s,waMsgForAlert(s,"examen"))}">${ICON_CHAT}</a>`:""}
        <button class="chip" data-a="marcar-recordatorio-examen" data-id="${esc(tarea.studentId)}">Ya avisé</button>
      </div>
    </div>`;
  }
  const attrs = Object.entries(tarea.data||{}).map(([k,v])=>`data-${esc(k)}="${esc(String(v))}"`).join(" ");
  return `<div class="hoy-row">
    <span class="hoy-row-name">${esc(tarea.text)}</span>
    <button class="chip" data-a="${esc(tarea.a)}" ${attrs}>Resolver</button>
  </div>`;
}

function vTuDia(){
  if(!mostrarTuDia()) return "";
  const racha = rachaFor();
  const tareas = pendingTasksToday();
  return `<div class="formcard">
    <div class="ftitle" style="display:flex;align-items:center;justify-content:space-between">
      <span>Tu día</span>${racha.actual>0?`<span style="font-size:14px;font-weight:700">🔥 ${racha.actual}</span>`:""}
    </div>
    ${tareas.length===0
      ? emptyState(ICON_CHECK.replace('stroke="white"','stroke="currentColor"'), "Estás al día ✨", "No tenés pendientes reales para hoy.")
      : `<div style="display:flex;flex-direction:column;gap:6px">${tareas.map(vTuDiaRow).join("")}</div>`}
  </div>`;
}

/* ============ solicitudes de clase pedidas o canceladas desde el portal (pasos 160/172, con
   confirmación siempre obligatoria desde el 199) ============
   state.solicitudesClase se refresca en cada heartbeat (~5min con la pestaña visible, ver
   refreshSolicitudesClase() en sync.js) y al resolver una a mano — siempre las "pedida" nada
   más (ya resueltas no vuelven a aparecer acá). Dos tipos mezclados en la misma lista, distinguidos
   por sol.tipo: "pedido" (Aceptar agenda una clasePuntual de 60 min, editable después en la ficha,
   o Responder deja el pedido rechazado con un mensaje opcional para el alumno — ver
   vSolicitudPedidoAccionesHtml más abajo) o "cancelacion" (Aceptar cancela esa ocurrencia
   puntual/recurrente de siempre, Rechazar pide un motivo opcional con prompt() nativo — sin
   cambios sobre el paso 172). El mismo bloque de acciones se reusa desde la Agenda (ver
   vAgendaSolicitudOverlay en views-agenda.js) para resolver un pedido tocándolo ahí directo. */
function vSolicitudesClaseCard(){
  const list = state.solicitudesClase||[];
  if(list.length===0) return "";
  return `<div class="formcard">
    <div class="ftitle">Solicitudes de clase (portal)</div>
    <div class="hint" style="margin-bottom:10px">Pedidos y avisos de cancelación mandados por alumnos desde su portal — un pedido queda pendiente hasta que lo aceptás o le respondés; una cancelación, hasta que la aceptás o rechazás.</div>
    ${list.map(sol=>vSolicitudClaseRow(sol)).join("")}
  </div>`;
}

function vSolicitudClaseRow(sol){
  const s = state.students.find(x=>x.id===sol.studentId);
  const esCancel = sol.tipo==="cancelacion";
  const acciones = esCancel
    ? `<div style="display:flex;gap:6px;flex-wrap:wrap">
        ${s?`<button class="chip" data-a="solicitud-aceptar" data-id="${sol.id}">Aceptar (cancelar clase)</button>`:""}
        <button class="chip" data-a="solicitud-rechazar" data-id="${sol.id}">Rechazar</button>
      </div>`
    : vSolicitudPedidoAccionesHtml(sol, s);
  return `<div class="log" style="align-items:flex-start;flex-wrap:wrap">
    <div class="body"><b>${esc(s?s.name:"Alumno eliminado")}</b> ${esCancel?"avisó que no puede ir a la clase del":"pidió"} ${fmtDate(sol.fecha)}${esCancel?"":" a las "+esc(sol.hora)}
      ${esCancel?` <span class="pill" style="color:var(--status-desaprobo-fg);background:var(--redbg)">Cancelación</span>`:""}
      ${sol.nota?`<div class="note">«${esc(sol.nota)}»</div>`:""}
    </div>
    ${acciones}
  </div>`;
}

// Acciones de un pedido de clase ("pedido"/legado "directa" sin resolver, paso 199): "Aceptar"
// agenda la clase de siempre; "Responder" abre un mini-panel con las tres salidas rápidas — mismo
// patrón de reveal-in-place que el "No puedo ir" del portal (ver wireCancelUi en portal.js), sin
// overlay ni navegar a ningún lado. Si el alumno ya no existe, no hay a quién responderle ni
// agendarle nada — sólo se puede descartar. Reusado también desde el popover de Agenda
// (vAgendaSolicitudOverlay), por eso no asume que está dentro de la tarjeta del Tablero.
function vSolicitudPedidoAccionesHtml(sol, s){
  if(!s) return `<button class="chip" data-a="solicitud-responder-rechazar" data-id="${sol.id}">Descartar</button>`;
  const resuelta = state.solicitudResuelta && String(state.solicitudResuelta.id)===String(sol.id) ? state.solicitudResuelta : null;
  if(resuelta) return vSolicitudResueltaHtml(resuelta, s);
  const abierto = state.solicitudResponder && String(state.solicitudResponder.id)===String(sol.id);
  let h = `<div style="display:flex;gap:6px;flex-wrap:wrap">
    <button class="chip" data-a="solicitud-aceptar" data-id="${sol.id}">Aceptar</button>
    <button class="chip ${abierto?"on":""}" data-a="solicitud-responder-toggle" data-id="${sol.id}">Responder</button>
  </div>`;
  if(abierto){
    h += `<div style="width:100%;margin-top:8px;padding:10px;background:var(--soft);border-radius:9px">
      <button class="chip" data-a="solicitud-responder-plantilla" data-id="${sol.id}">Ese horario está ocupado</button>
      <div class="frow" style="margin-top:8px;align-items:flex-end">
        <div class="field" style="flex:1;min-width:180px"><div class="flabel">Mensaje corto (opcional)</div>
          <input type="text" id="solicitud-responder-texto-${sol.id}" maxlength="200" placeholder="Ej: ¿Puede ser a las 16?"></div>
        <button class="chip" data-a="solicitud-responder-enviar" data-id="${sol.id}" style="margin-bottom:2px">Enviar</button>
      </div>
      <button class="chip" data-a="solicitud-responder-rechazar" data-id="${sol.id}" style="margin-top:8px">Rechazar sin mensaje</button>
    </div>`;
  }
  return h;
}

// Después de "Responder" con plantilla/mensaje propio (nunca sin mensaje: ahí no hay nada que
// mostrarle al alumno ni mandar por WhatsApp, se descarta directo — ver responderSolicitudClase en
// sync.js): deja el texto a la vista con el botón de WhatsApp a mano (mismo texto, por si el
// docente quiere mandárselo directo además de que ya le quedó visible en su portal) hasta tocar
// "Listo".
function vSolicitudResueltaHtml(resuelta, s){
  const wa = (s && hasPhone(s)) ? `<a class="chip" target="_blank" rel="noopener" href="${waLink(s, resuelta.texto)}">Mandar por WhatsApp</a>` : "";
  return `<div style="width:100%">
    <div class="note">Le respondiste: «${esc(resuelta.texto)}»</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
      ${wa}
      <button class="chip" data-a="solicitud-resuelta-listo">Listo</button>
    </div>
  </div>`;
}

// Fila de "Clases de hoy"/"Mañana" en el tablero — común a un evento individual o ya colapsado en
// grupal (ver collapseGrupalEvents en helpers.js); un evento grupal no tiene un único alumno al
// que registrarle/recordarle por WhatsApp, así que ese click abre el mismo popover que la agenda
// (ver agenda-event-grupal-open en events.js) en vez del atajo directo de registrar.
function vHoyRow(e, dia){
  const quien = e.kind==="grupal"
    ? `<span class="hoy-row-name">${e.studentIds.length} alumnos</span> <span class="hint">${esc(e.studentNames.join(", "))}</span>`
    : `<span class="hoy-row-name">${esc(e.studentName)}</span>${e.subject?` <span class="hint">· ${esc(e.subject)}</span>`:""}`;
  let acciones;
  if(e.kind==="grupal"){
    const done = grupalOccurrenceRegistered(e);
    acciones = `${done ? `<span class="badge badge-green">Registrada</span>`
        : `<button class="chip" data-a="agenda-event-grupal-open" data-grupo-id="${e.grupoId}" data-kind="${e.sourceKind}" data-orig-date="${e.origDate||e.date}">Registrar</button>`}
      ${e.link?`<a class="chip" target="_blank" rel="noopener" href="${esc(e.link)}">Entrar a la clase</a>`:""}`;
  }else{
    const done = studentHasSessionOnDate(e.studentId, e.date);
    acciones = `${done ? `<span class="badge badge-green">Registrada</span>`
        : `<button class="chip" data-a="agenda-log" data-id="${e.studentId}" data-date="${e.date}">Registrar</button>`}
      ${e.link?`<a class="chip" target="_blank" rel="noopener" href="${esc(e.link)}">Entrar a la clase</a>`:""}
      ${vWaRecordarClaseBtn(e,dia)}`;
  }
  return `<div class="hoy-row">
    <div class="hoy-row-main"><span class="hoy-row-time">${esc(e.time)}</span>${e.subjectId?subjectDot(e.subjectId):""}${quien}</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${acciones}</div>
  </div>`;
}

function vHoyClasesHoy(){
  const events = collapseGrupalEvents(agendaRangeEvents(today(), today())).sort((a,b)=>a.time.localeCompare(b.time));
  const body = events.length===0
    ? emptyState(ICON_CALENDAR, "Hoy no tenés clases 🎉", "Para lo que viene después, andá a la agenda.")
    : events.map(e=>vHoyRow(e,"hoy")).join("");
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
  const manana = collapseGrupalEvents(agendaRangeEvents(tomorrow,tomorrow)).sort((a,b)=>a.time.localeCompare(b.time));
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
      body += `<div class="hoy-subhead">Mañana</div>` + manana.map(e=>vHoyRow(e,"mañana")).join("");
    }
    // paso 199: mismo límite de alto con scroll que "Para cobrar" — "Mañana" no tiene tope propio
    // (puede ser un día con muchas clases) y sin esto estiraba TODA la fila del grid (ver comentario
    // de .hoy-scroll en styles.css).
    body = `<div class="hoy-scroll">${body}</div>`;
  }
  return hoyCard("Próximo", total, body, {a:"nav-agenda", label:"Ver agenda"});
}

function vTablero(){
  const activos = alive().filter(s=>s.status==="activo");
  const alerts = activos.flatMap(s=>studentAlerts(s).map(a=>({s,...a})));
  const upcoming = activos.filter(s=>s.examDate && daysTo(s.examDate)>=0)
                          .sort((a,b)=>a.examDate.localeCompare(b.examDate));
  const enRiesgo = new Set(alerts.map(a=>a.s.id)).size;
  let h = pageHead("Tablero","Hoy",`<button class="btn btn-primary" data-a="new">+ Nuevo estudiante</button>`,
    "Lo que tenés que mirar hoy: clases del día, alertas y exámenes próximos.", "tablero");
  h += vTips();
  h += vTourResumeBanner();
  h += vFeedbackBanner();
  h += vBackupReminder();
  h += vCumpleanosBanner();
  h += vTuDia();
  h += vSolicitudesClaseCard();

  h += `<div class="hoy-grid">${vHoyClasesHoy()}${vHoyCobrar()}${vHoyProximo()}</div>`;

  h += `<div class="stats">
    <div class="stat"><b>${countSpan(activos.length)}</b><span>activos</span></div>
    <div class="stat"><b>${countSpan(upcoming.length)}</b><span>con examen a la vista</span></div>
    <div class="stat ${enRiesgo?"warn":""}"><b>${countSpan(enRiesgo)}</b><span>con alertas</span></div>
  </div>`;

  const examPrompts = pendingExamResults();
  const examCel = state.examCelebrate;
  if(examPrompts.length || examCel){
    h += `<div class="stitle">¿Cómo les fue?</div>`;
    if(examCel) h += vExamCelebrate(examCel);
    h += examPrompts.filter(s=>!examCel||s.id!==examCel.sid).map(vExamResultPrompt).join("");
  }

  h += `<div class="stitle">Alertas</div>`;
  h += alerts.length===0
    ? `<div class="empty">Sin alertas. Todo el mundo al día — buen momento para conseguir parciales viejos.</div>`
    : alerts.map(a=>`<div style="margin-bottom:6px">
      <div class="alert-row" style="margin-bottom:0">
        <button class="alert" data-a="open" data-id="${a.s.id}">
          <span class="dot"></span><b>${esc(a.s.name)}</b><span class="t">${esc(a.text)}</span></button>
        ${hasPhone(a.s)?`<a class="wa-quick" title="Enviar WhatsApp" target="_blank" rel="noopener" href="${waLink(a.s,waMsgForAlert(a.s,a.wa))}">${ICON_CHAT}</a>`:""}
        <button class="chip" style="margin:0" data-a="toggle-alert-msg" data-id="${a.s.id}">Mandar mensaje</button>
      </div>
      ${state.alertMsgFor===a.s.id?vAlertMsgPicker(a.s):""}
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


// Una fila de pago pendiente en el tablero (paso 198): "etiqueta" individual, todas con la misma
// forma (.hoy-row, igual criterio visual que "Clases de hoy") en vez de agrupadas por alumno —
// una por clase/mensualidad/seña, más vieja arriba. El check de al lado reusa la misma acción que
// Pagos → Resumen/ficha según el tipo (cobro-marcar-clase/pagos-check-pendiente/toggle-senia-estado,
// ver events.js), con el mismo undo donde ya lo tienen.
function vCobroPendienteRow(i){
  const s = state.students.find(x=>x.id===i.studentId); if(!s) return "";
  const kindLabel = i.kind==="clase" ? "Clase" : i.kind==="mensual" ? "Mensualidad" : "Seña";
  const checkAttrs = i.kind==="clase" ? `data-a="cobro-marcar-clase" data-sid="${s.id}" data-id="${i.sessionId}"`
    : i.kind==="mensual" ? `data-a="pagos-check-pendiente" data-id="${s.id}" data-mk="${currentMonthKey()}"`
    : `data-a="toggle-senia-estado" data-sid="${s.id}" data-id="${i.puntualId}"`;
  return `<div class="hoy-row">
    <div class="hoy-row-main">
      <span class="hoy-row-time">${esc(fmtDate(i.date))}</span>
      <span class="hoy-row-name">${esc(s.name)}</span>
      <span class="pill" style="color:var(--status-desaprobo-fg);background:var(--redbg)">${kindLabel} · ${fmtMoney(i.monto)}</span>
    </div>
    <button class="chip" title="Marcar pagado" aria-label="Marcar pagado" ${checkAttrs}>✓</button>
  </div>`;
}

/* ============ aviso de cobros atrasados: clases sin cobrar + mensualidades vencidas + señas
   pendientes, TODAS como filas sueltas ordenadas por fecha (paso 198, ver cobrosAtrasadosSummary
   en helpers.js) — con scroll propio y un límite de alto para no empujar el resto del tablero
   cuando hay muchas. ============ */
function vCobrosBanner(){
  const rec = recordatoriosFor();
  if(!rec.activo) return "";
  const sum = cobrosAtrasadosSummary(rec.diasAtraso);
  if(sum.count===0) return "";
  const ordenados = [...sum.items].sort((a,b)=>a.date.localeCompare(b.date));
  return `<div class="hoy-scroll">${ordenados.map(vCobroPendienteRow).join("")}</div>`;
}

// Festejo transitorio al marcar "Aprobó" (paso 162) — mismo patrón que vGoalClosure/goalCelebrate,
// pero sin auto-cierre por timeout: se queda hasta que el profesor toca "Listo", para dar tiempo a
// usar "Felicitar por WhatsApp" sin apuro. Ver state.examCelebrate en events.js.
function vExamCelebrate(cel){
  const st = state.students.find(x=>x.id===cel.sid); if(!st) return "";
  const msg = waMsgFelicitar(st, cel.grade);
  return `<div class="examresult" style="background:var(--greenbg);border-color:var(--status-activo-fg)">
    <div><b>${esc(st.name)}</b> <span class="hint">· ¡aprobó! 🎉</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center">
      ${hasPhone(st)
        ? `<a class="chip" style="background:var(--status-activo-bg);color:var(--status-activo-fg)" target="_blank" rel="noopener" href="${waLink(st,msg)}">${ICON_CHAT} Felicitar por WhatsApp</a>`
        : `<span class="hint">Cargá el teléfono en la ficha para felicitar por WhatsApp</span>`}
      <button class="chip" data-a="dismiss-exam-celebrate">Listo</button>
    </div>
  </div>`;
}
