"use strict";

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
  if(steps.every(s=>s.ok)) return ""; // normalmente ya la descartó checkOnboardingComplete() antes; fallback defensivo
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

/* ============ solicitudes de clase pedidas o canceladas desde el portal (pasos 160 y 172) ============
   state.solicitudesClase se refresca en cada heartbeat (~5min con la pestaña visible, ver
   refreshSolicitudesClase() en sync.js) y al resolver una a mano — siempre las "pedida" nada
   más (ya resueltas no vuelven a aparecer acá). Dos tipos mezclados en la misma lista, distinguidos
   por sol.tipo: "pedido" (aceptar agenda una clasePuntual de 60 min, editable después en la
   ficha) o "cancelacion" (aceptar cancela esa ocurrencia puntual/recurrente de siempre, ver
   aceptarSolicitudClase en sync.js); rechazar pide un motivo opcional con prompt() nativo, mismo
   criterio ya usado en la app para textos cortos puntuales (ver "+ nueva carrera"). */
function vSolicitudesClaseCard(){
  const list = state.solicitudesClase||[];
  if(list.length===0) return "";
  return `<div class="formcard">
    <div class="ftitle">Solicitudes de clase (portal)</div>
    <div class="hint" style="margin-bottom:10px">Pedidos y avisos de cancelación mandados por alumnos desde su portal — aceptá o rechazá con un motivo opcional.</div>
    ${list.map(vSolicitudClaseRow).join("")}
  </div>`;
}

function vSolicitudClaseRow(sol){
  const s = state.students.find(x=>x.id===sol.studentId);
  const esCancel = sol.tipo==="cancelacion";
  return `<div class="log" style="align-items:flex-start">
    <div class="body"><b>${esc(s?s.name:"Alumno eliminado")}</b> ${esCancel?"avisó que no puede ir a la clase del":"pidió"} ${fmtDate(sol.fecha)}${esCancel?"":" a las "+esc(sol.hora)}
      ${esCancel?` <span class="pill" style="color:var(--status-desaprobo-fg);background:var(--redbg)">Cancelación</span>`:""}
      ${sol.nota?`<div class="note">«${esc(sol.nota)}»</div>`:""}
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      ${s?`<button class="chip" data-a="solicitud-aceptar" data-id="${sol.id}">${esCancel?"Aceptar (cancelar clase)":"Aceptar"}</button>`:""}
      <button class="chip" data-a="solicitud-rechazar" data-id="${sol.id}">Rechazar</button>
    </div>
  </div>`;
}

/* ============ avisos de "Reserva directa" (paso 173) ============
   A diferencia de vSolicitudesClaseCard de arriba, estas ya están aplicadas (la clase quedó
   agendada sola, ver reservar_clase_portal() en cuaderno-supabase) — no hay nada que
   aceptar/rechazar, sólo un aviso descartable ("Ok, listo") para que el docente se entere.
   state.reservasDirectas se refresca junto a state.solicitudesClase (mismo heartbeat, ver
   refreshSolicitudesClase en sync.js). */
function vReservasDirectasCard(){
  const list = state.reservasDirectas||[];
  if(list.length===0) return "";
  return `<div class="formcard">
    <div class="ftitle">Reservas nuevas (portal)</div>
    ${list.map(r=>{
      const s = state.students.find(x=>x.id===r.studentId);
      return `<div class="log" style="align-items:flex-start">
        <div class="body"><b>${esc(s?s.name:"Alumno eliminado")}</b> reservó ${fmtDate(r.fecha)} a las ${esc(r.hora)}
          <span class="pill" style="color:var(--status-activo-fg);background:var(--greenbg)">Agendada</span>
        </div>
        <button class="chip" data-a="reserva-directa-ok" data-id="${r.id}">Ok, listo</button>
      </div>`;
    }).join("")}
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
    "Lo que tenés que mirar hoy: clases del día, alertas y exámenes próximos.");
  h += vTips();
  h += vFeedbackBanner();
  h += vBackupReminder();
  h += vCumpleanosBanner();
  h += vTuDia();
  h += vReservasDirectasCard();
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
  return `<div class="hoy-cobros-scroll">${ordenados.map(vCobroPendienteRow).join("")}</div>`;
}

function vCobroItemRow(s,i){
  if(i.kind==="clase") return `<div class="note">${esc(fmtDate(i.date))} · ${fmtMoney(i.monto)}
    <button class="chip" style="margin-left:6px" data-a="cobro-marcar-clase" data-sid="${s.id}" data-id="${i.sessionId}">✓ Marcar cobrada</button></div>`;
  // paso 197: mismo check rápido que Pagos → Resumen (pagos-check-pendiente) en vez de mandar a
  // "Ver en Pagos" a registrar el pago a mano.
  if(i.kind==="mensual") return `<div class="note">Mensualidad de ${esc(monthLabel(currentMonthKey()))} · ${fmtMoney(i.monto)} pendiente
    <button class="chip" style="margin-left:6px" data-a="pagos-check-pendiente" data-id="${s.id}" data-mk="${currentMonthKey()}">✓ Marcar pagada</button></div>`;
  return `<div class="note">Seña de la clase del ${esc(fmtDate(i.date))} · ${fmtMoney(i.monto)}
    <button class="chip" style="margin-left:6px" data-a="toggle-senia-estado" data-sid="${s.id}" data-id="${i.puntualId}">✓ Marcar cobrada</button></div>`;
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
