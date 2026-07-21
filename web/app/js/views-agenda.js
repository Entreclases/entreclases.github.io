"use strict";

/* ============ vista "Agenda": semana o mes, todos los alumnos ============ */
function vAgenda(){
  const mode = state.agendaViewMode||"semana";
  let h = pageHead("Agenda","Calendario de clases",null,
    "Horarios habituales y clases sueltas, por semana o por mes — tocá una clase para editarla.", "agenda");
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
  const cerrada = esSemanaCompleta(weekStart);
  let h = `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button class="chip" data-a="agenda-prev">← Semana anterior</button>
      <b style="font-size:14px">${esc(fmtDate(weekStart))} – ${esc(fmtDate(weekEnd))}</b>
      ${cerrada?`<span class="badge badge-neutral">Semana cerrada</span>`:""}
      <button class="chip" data-a="agenda-next">Semana siguiente →</button>
      ${offset!==0?`<button class="chip" data-a="agenda-today">Esta semana</button>`:""}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="chip ${cerrada?"on":""}" data-a="agenda-semana-toggle" data-week="${weekStart}">${cerrada?"Reabrir semana":"Semana completa"}</button>
      <button class="chip ${state.agendaDispEdit?"on":""}" data-a="agenda-disp-edit-toggle">${state.agendaDispEdit?"Listo, guardar disponibilidad":"Mi disponibilidad"}</button>
      <button class="chip" data-a="grupal-form-open-agenda">+ Clase grupal</button>
      <button class="chip" data-a="open-agenda-imprimir">Imprimir semana</button>
      ${vExportIcsButton()}
    </div>
  </div>`;

  if(cerrada){
    h += `<div class="hint" style="margin-bottom:10px">Esta semana está marcada como completa: el portal no va a ofrecer horarios libres de estos días para pedir clase, aunque tengas disponibilidad declarada. Tocá "Reabrir semana" para volver a ofrecerlos.</div>`;
  }

  if(state.agendaDispEdit){
    h += `<div class="hint" style="margin-bottom:10px">Tocá las celdas de la grilla para marcarlas como disponibles (o volver a tocarlas para sacarlas) — se guarda solo, celda por celda. Esto es sólo tu disponibilidad declarada, no bloquea agendar clases fuera de ella.</div>`;
  }

  if(alive().filter(s=>s.status==="activo").length===0 && !state.agendaDispEdit){
    h += emptyState(ICON_CALENDAR, "Sin alumnos activos",
      "Cargá horarios habituales o agendá una próxima clase desde la ficha de cada alumno (pestaña «Clases»).",
      `<button class="btn btn-primary" data-a="nav-lista">Ir a Estudiantes</button>`, "agenda");
    return h;
  }

  const events = markOverlaps(collapseGrupalEvents(agendaWeekEvents(weekStart).concat(solicitudesPedidoEventsFor(weekStart, weekEnd))));
  if(events.length===0 && !state.agendaDispEdit){
    h += `<div class="hint" style="margin-bottom:10px">Sin clases agendadas esta semana — clickeá un bloque de la grilla para programar una.</div>`;
  }else if(events.length>0){
    h += vExportIcsHint();
  }

  h += vAgendaWeekGrid(weekStart, events);
  if(state.agendaGridQuick) h += vAgendaGridQuickForm();
  return h;
}

// grilla horaria semanal (paso 134): 7 columnas (una por día, siempre las 7 visibles — ver
// .week-scroll en styles.css para el scroll horizontal en mobile) × filas de una hora, 08-22
// por defecto y extendida ese día puntual si hay una clase fuera de rango. Las celdas de fondo
// (una por hora×día) son siempre de alto FIJO (AGENDA_ROW_H, config.js) y sólo sirven de click-
// target/fondo — las clases se dibujan en una capa aparte por día (.week-daylayer,
// position:relative) posicionada en absoluto ocupando su bloque proporcional a la duración real
// (paso 169, ver vAgendaDayEvents en este archivo); antes vivían DENTRO de la celda y la hacían
// crecer con el contenido (min-height + flex-wrap), por eso la agenda medía distinto según cuánto
// hubiera cargado esa semana. Las celdas vacías siguen siendo clickeables: abren
// vAgendaGridQuickForm() con día y hora precargados. Paso 159 (disponibilidad): en modo normal,
// una celda vacía Y dentro de la disponibilidad declarada (esCeldaDisponible) se pinta con un
// fondo sutil distinto (.disp-suggest, ver styles.css) para sugerirla como horario libre para
// agendar — sigue siendo el mismo data-a="agenda-grid-add" de siempre, sólo cambia el fondo. En
// modo edición (state.agendaDispEdit, chip "Mi disponibilidad" en vAgendaSemana) toda celda pasa a
// llevar data-a="agenda-disp-toggle" (día+hora en dataset) para pintar/despintar disponibilidad
// con un click, reusando el mismo delegado de click que el resto de la grilla. La capa de eventos
// tiene pointer-events:none salvo en cada tarjeta/chip (pointer-events:auto), así que un click en
// el espacio vacío de un bloque ya ocupado sigue llegando a la celda de fondo de abajo — y uno
// sobre una clase la abre como siempre (vAgendaEvent/vAgendaEventGrupal traen su propio data-a).
function vAgendaWeekGrid(weekStart, events){
  const days = Array.from({length:7},(_,i)=>addDays(weekStart,i));
  const byDay = Array.from({length:7},()=>[]);
  events.forEach(e=>{
    const idx = Math.round((new Date(e.date+"T12:00:00")-new Date(weekStart+"T12:00:00"))/86400000);
    if(idx>=0 && idx<7) byDay[idx].push(e);
  });

  const startHour = events.length ? Math.min(8, ...events.map(e=>Math.floor(e.startMin/60))) : 8;
  const endHour = events.length ? Math.max(22, ...events.map(e=>Math.ceil(e.endMin/60))) : 22;
  const totalHours = endHour-startHour;
  const now = new Date();
  const nowMin = now.getHours()*60+now.getMinutes();
  const editMode = !!state.agendaDispEdit;

  let h = `<div class="week-scroll"><div class="week-grid ${editMode?"disp-edit":""}" style="grid-template-rows:auto repeat(${totalHours},${AGENDA_ROW_H}px)">`;
  h += `<div class="week-corner" style="grid-row:1;grid-column:1"></div>`;
  h += days.map((d,i)=>`<div class="week-head ${d===today()?"today":""}" style="grid-row:1;grid-column:${i+2}">${esc(DIAS_SEMANA[i].slice(0,3))}<span class="week-headdate">${esc(fmtDate(d))}</span></div>`).join("");

  for(let hr=startHour; hr<endHour; hr++){
    const rowIdx = 2+(hr-startHour);
    const label = String(hr).padStart(2,"0")+":00";
    h += `<div class="week-hourlabel" style="grid-row:${rowIdx};grid-column:1">${label}</div>`;
    h += days.map((d,i)=>{
      const isToday = d===today();
      const dayIdx = weekdayIdx(d);
      const disponible = esCeldaDisponible(dayIdx, label);
      if(editMode){
        return `<div class="week-cell empty ${isToday?"today":""} ${disponible?"disp-available":""}" style="grid-row:${rowIdx};grid-column:${i+2}" data-a="agenda-disp-toggle" data-day="${dayIdx}" data-hour="${label}"></div>`;
      }
      return `<div class="week-cell empty ${isToday?"today":""} ${disponible?"disp-suggest":""}" style="grid-row:${rowIdx};grid-column:${i+2}" data-a="agenda-grid-add" data-date="${d}" data-hour="${label}"></div>`;
    }).join("");
  }

  h += days.map((d,i)=>{
    const isToday = d===today();
    const nowLine = isToday && nowMin>=startHour*60 && nowMin<endHour*60
      ? `<div class="week-now" style="top:${(((nowMin-startHour*60)/60)*AGENDA_ROW_H).toFixed(1)}px"></div>` : "";
    return `<div class="week-daylayer" style="grid-row:2 / span ${totalHours};grid-column:${i+2}">${nowLine}${vAgendaDayEvents(byDay[i], d, startHour)}</div>`;
  }).join("");

  h += `</div></div>`;
  return h;
}

// Ubica las clases de una columna de agenda (un día de la semanal, o el único día de la vista día
// — vAgendaDayHours reusa esta misma función) dentro de su capa (paso 169): agrupa por
// superposición real de horario con clusterAgendaOverlaps (helpers.js) y, dentro de cada cluster,
// las pone lado a lado si entran (hasta AGENDA_MAX_COLS) o las comprime en chips mínimos con
// popover si no — mismo criterio para semana y día para que se vean igual.
function vAgendaDayEvents(list, date, startHour){
  if(!list.length) return "";
  return clusterAgendaOverlaps(list).map(cluster=>{
    if(cluster.length>AGENDA_MAX_COLS) return vAgendaCompressedCluster(cluster, date, startHour);
    const colW = 100/cluster.length;
    return cluster.map((e,ci)=>{
      const top = ((e.startMin-startHour*60)/60)*AGENDA_ROW_H;
      const height = Math.max(26, (e.duration/60)*AGENDA_ROW_H - 2);
      const posStyle = `position:absolute;top:${top.toFixed(1)}px;height:${height.toFixed(1)}px;left:${(ci*colW).toFixed(2)}%;width:${colW.toFixed(2)}%`;
      const compact = height<46;
      if(e.kind==="grupal") return vAgendaEventGrupal(e,date,posStyle,compact);
      if(e.kind==="solicitud") return vAgendaSolicitudEvent(e,posStyle,compact);
      return vAgendaEvent(e,date,posStyle,compact);
    }).join("");
  }).join("");
}

// Chips mínimos (color de materia + inicial) para un cluster de más de AGENDA_MAX_COLS clases
// superpuestas (paso 169) — al tocarlo abre vAgendaHourListOverlay() con el detalle completo,
// reusando vAgendaEvent/vAgendaEventGrupal tal cual (mismo popover del paso 135, en modo lista).
function vAgendaCompressedCluster(cluster, date, startHour){
  const top = ((Math.min(...cluster.map(e=>e.startMin))-startHour*60)/60)*AGENDA_ROW_H;
  const bottom = ((Math.max(...cluster.map(e=>e.endMin))-startHour*60)/60)*AGENDA_ROW_H;
  const height = Math.max(26, bottom-top-2);
  const items = cluster.map(e=>e.kind==="grupal"
    ? `g|${e.grupoId}|${e.sourceKind}|${e.origDate||e.date}`
    : `i|${e.studentId}|${e.kind}|${e.sourceId}|${e.origDate||e.date}`).join(";");
  const chips = cluster.slice(0,4).map(e=>{
    const bg = e.subjectId ? `var(--subj-${subjectColorKey(e.subjectId)}-fg)` : "var(--muted)";
    const label = e.kind==="grupal" ? "G" : (e.studentName||"?").slice(0,1).toUpperCase();
    return `<span class="agenda-chip" style="background:${bg}">${esc(label)}</span>`;
  }).join("");
  const more = cluster.length>4 ? `<span class="agenda-chip-more">+${cluster.length-4}</span>` : "";
  return `<div class="agenda-compressed" style="position:absolute;top:${top.toFixed(1)}px;height:${height.toFixed(1)}px;left:0;width:100%"
    data-a="agenda-hour-list-open" data-date="${date}" data-items="${esc(items)}">${chips}${more}</div>`;
}

// mini-formulario "Programar clase acá" (paso 132), disparado al clickear un hueco de la
// grilla semanal — mismos tres campos y misma addPuntualClase() que "Programar clase acá" en
// la agenda mensual, sólo que acá la fecha y la hora ya vienen precargadas del bloque clickeado.
function vAgendaGridQuickForm(){
  const q = state.agendaGridQuick;
  const activos = alive().filter(s=>s.status==="activo").sort((a,b)=>a.name.localeCompare(b.name));
  let h = `<div class="formcard" style="margin-top:12px">
    <div class="ftitle">Programar clase — ${esc(fmtDate(q.date))} ${esc(q.time)}</div>`;
  // Paso 159: aviso no bloqueante si el bloque clickeado cae fuera de la disponibilidad declarada
  // (nunca se muestra si el docente no cargó ninguna, ver estaDentroDisponibilidad()) — sólo
  // informativo, "+ Programar" de acá abajo sigue guardando igual.
  if(!estaDentroDisponibilidad(q.date, q.time)){
    h += `<div class="hint" style="margin-bottom:8px">Ojo: este horario cae fuera de tu disponibilidad declarada.</div>`;
  }
  h += activos.length===0
    ? `<div class="hint">No hay alumnos activos para programarles una clase.</div>`
    : `<div class="frow" style="align-items:flex-end">
        <div class="field"><div class="flabel">Alumno</div><select id="wq-student">
          ${activos.map(s=>`<option value="${s.id}">${esc(s.name)}${s.subject?" · "+esc(s.subject):""}</option>`).join("")}
        </select></div>
        <div class="field"><div class="flabel">Hora</div><input type="time" id="wq-time" value="${esc(q.time)}"></div>
        <div class="field" style="max-width:150px"><div class="flabel">Duración</div>${durationFieldHtml(60, {id:"wq-duration"})}</div>
        <button class="chip" data-a="agenda-grid-quick-add" style="margin-bottom:2px">+ Programar</button>
        <button class="chip" data-a="agenda-grid-quick-cancel" style="margin-bottom:2px">Cancelar</button>
      </div>`;
  return h + `</div>`;
}

/* ============ vista "Agenda" → Mes: grilla del mes con mini-marcas por día ============ */
function vAgendaMes(){
  const mk = monthKeyOffset(state.agendaMonthOffset||0);
  const days = monthGridDays(mk);
  const events = collapseGrupalEvents(agendaRangeEvents(days[0], days[days.length-1]));
  const byDate = {};
  events.forEach(e=>{ (byDate[e.date]=byDate[e.date]||[]).push(e); });

  let h = `<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button class="chip" data-a="agenda-month-prev">← Mes anterior</button>
      <b style="font-size:14px">${esc(monthLabel(mk))}</b>
      <button class="chip" data-a="agenda-month-next">Mes siguiente →</button>
      ${(state.agendaMonthOffset||0)!==0?`<button class="chip" data-a="agenda-month-today">Este mes</button>`:""}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="chip" data-a="grupal-form-open-agenda">+ Clase grupal</button>
      ${vExportIcsButton()}
    </div>
  </div>`;
  h += vExportIcsHint();

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
  const events = markOverlaps(collapseGrupalEvents(agendaRangeEvents(date,date).concat(solicitudesPedidoEventsFor(date,date)))).sort((a,b)=>a.time.localeCompare(b.time));
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
        <div class="field" style="max-width:150px"><div class="flabel">Duración</div>${durationFieldHtml(60, {id:"aq-duration"})}</div>
        <button class="chip" data-a="agenda-quick-add" style="margin-bottom:2px">+ Programar</button>
      </div>`;
  }
  return h + `</div>`;
}

// Grilla vertical de bloques por hora para la vista de un día (paso 90): desde la primera hora
// con clase (si es más temprano) hasta un rango razonable 8-22 (más tarde, si hace falta), con
// scroll. Mismo criterio de alto fijo + span proporcional + compresión que la grilla semanal
// (paso 169, ver vAgendaDayEvents más arriba) — una única columna en vez de siete.
function vAgendaDayHours(events, date){
  const startHour = Math.min(8, ...events.map(e=>Math.floor(e.startMin/60)));
  const endHour = Math.max(22, ...events.map(e=>Math.ceil(e.endMin/60)));
  const totalHours = endHour-startHour;
  let h = `<div class="agenda-hours" style="grid-template-rows:repeat(${totalHours},${AGENDA_ROW_H}px)">`;
  for(let hr=startHour; hr<endHour; hr++){
    h += `<div class="agenda-hour-label" style="grid-row:${1+(hr-startHour)}">${String(hr).padStart(2,"0")}:00</div>`;
  }
  h += `<div class="agenda-hour-bg" style="grid-row:1 / span ${totalHours}"></div>`;
  h += `<div class="agenda-hour-layer" style="grid-row:1 / span ${totalHours}">${vAgendaDayEvents(events, date, startHour)}</div>`;
  return h + `</div>`;
}

// posStyle/compact (paso 169): cuando se dibuja dentro de una capa de agenda (semana o vista día),
// vAgendaDayEvents pasa el position:absolute (top/height/left/width, proporcional a la duración
// real) y, si el bloque queda muy bajo para el contenido completo, compact=true (una sola línea
// hora+nombre). Sin esos dos argumentos (p.ej. dentro de vAgendaHourListOverlay, el popover de
// "modo lista" de un cluster comprimido) se dibuja como tarjeta suelta de siempre.
function vAgendaEvent(e, date, posStyle, compact){
  const past = date<today();
  const already = past && studentHasSessionOnDate(e.studentId, e.date);
  const borderColor = e.subjectId ? `var(--subj-${subjectColorKey(e.subjectId)}-fg)` : "transparent";
  const style = `${posStyle||""};border-left:3px solid ${borderColor}`;
  if(compact){
    return `<div class="agenda-event compact ${e.overlap?"overlap":""}" style="${style}"
      data-a="agenda-event-open" data-student-id="${e.studentId}" data-kind="${e.kind}" data-source-id="${e.sourceId}" data-orig-date="${e.origDate||e.date}">
      <span class="agenda-time">${esc(e.time)}</span><span class="agenda-who-compact">${esc(e.studentName)}</span>
    </div>`;
  }
  const waBtn = date===today() ? vWaRecordarClaseBtn(e,"hoy") : date===addDays(today(),1) ? vWaRecordarClaseBtn(e,"mañana") : "";
  return `<div class="agenda-event ${e.overlap?"overlap":""}" style="${style}"
    data-a="agenda-event-open" data-student-id="${e.studentId}" data-kind="${e.kind}" data-source-id="${e.sourceId}" data-orig-date="${e.origDate||e.date}">
    <div class="agenda-time">${esc(e.time)} <span class="hint">${e.duration}min</span></div>
    <div class="agenda-who" style="display:flex;align-items:center;gap:5px">${avatarHtml(e.studentId, e.studentName, studentFotoFor(e.studentId), 18)}${e.subjectId?subjectDot(e.subjectId):""} <b>${esc(e.studentName)}</b>${e.subject?` <span class="hint">· ${esc(e.subject)}</span>`:""}</div>
    ${e.seniaEstado?`<span class="chip" style="margin-top:4px;color:${SENIA_ESTADO_META[e.seniaEstado].fg};border-color:${SENIA_ESTADO_META[e.seniaEstado].fg}">Seña ${SENIA_ESTADO_META[e.seniaEstado].label.toLowerCase()}</span>`:""}
    ${e.overlap?`<div class="hint" style="color:var(--status-desaprobo-fg);display:flex;align-items:center;gap:4px"><span class="icon-inline" style="width:12px;height:12px">${ICON_WARNING}</span> se superpone con otra clase</div>`:""}
    ${past && already ? `<div class="hint" style="color:var(--status-activo-fg)">Ya registrada</div>` : ""}
    ${past && !already ? `<button class="chip" style="margin-top:6px" data-a="agenda-log" data-id="${e.studentId}" data-date="${e.date}">Registrar esta clase</button>` : ""}
    ${!past && e.link ? `<a class="chip" style="margin-top:6px" target="_blank" rel="noopener" href="${esc(e.link)}">Entrar a la clase</a>` : ""}
    ${waBtn ? `<div style="margin-top:6px">${waBtn}</div>` : ""}
  </div>`;
}

// Tarjeta de una clase grupal ya colapsada (paso 157, ver collapseGrupalEvents en helpers.js) —
// mismo look que vAgendaEvent pero con los N integrantes en vez de un solo alumno, y sin botón de
// WhatsApp (no hay un único destinatario). Abre el popover grupal (agenda-event-grupal-open).
// Mismos posStyle/compact que vAgendaEvent (paso 169).
function vAgendaEventGrupal(e, date, posStyle, compact){
  const past = date<today();
  const already = past && grupalOccurrenceRegistered(e);
  const borderColor = e.subjectId ? `var(--subj-${subjectColorKey(e.subjectId)}-fg)` : "transparent";
  const style = `${posStyle||""};border-left:3px solid ${borderColor}`;
  if(compact){
    return `<div class="agenda-event compact ${e.overlap?"overlap":""}" style="${style}"
      data-a="agenda-event-grupal-open" data-grupo-id="${e.grupoId}" data-kind="${e.sourceKind}" data-orig-date="${e.origDate||e.date}">
      <span class="agenda-time">${esc(e.time)}</span><span class="agenda-who-compact">${e.studentIds.length} alumnos</span>
    </div>`;
  }
  return `<div class="agenda-event ${e.overlap?"overlap":""}" style="${style}"
    data-a="agenda-event-grupal-open" data-grupo-id="${e.grupoId}" data-kind="${e.sourceKind}" data-orig-date="${e.origDate||e.date}">
    <div class="agenda-time">${esc(e.time)} <span class="hint">${e.duration}min</span></div>
    <div class="agenda-who" style="display:flex;align-items:center;gap:5px">${e.subjectId?subjectDot(e.subjectId):""} <b>${e.studentIds.length} alumnos</b>${e.subject?` <span class="hint">· ${esc(e.subject)}</span>`:""}</div>
    <div class="hint">${esc(e.studentNames.join(", "))}</div>
    ${e.overlap?`<div class="hint" style="color:var(--status-desaprobo-fg);display:flex;align-items:center;gap:4px"><span class="icon-inline" style="width:12px;height:12px">${ICON_WARNING}</span> se superpone con otra clase</div>`:""}
    ${past && already ? `<div class="hint" style="color:var(--status-activo-fg)">Ya registrada</div>` : ""}
    ${past && !already ? `<button class="chip" style="margin-top:6px" data-a="agenda-event-grupal-open" data-grupo-id="${e.grupoId}" data-kind="${e.sourceKind}" data-orig-date="${e.origDate||e.date}">Registrar esta clase</button>` : ""}
    ${!past && e.link ? `<a class="chip" style="margin-top:6px" target="_blank" rel="noopener" href="${esc(e.link)}">Entrar a la clase</a>` : ""}
  </div>`;
}

// Bloque de un pedido de clase pendiente (paso 199) en la grilla — mismo lugar que una clase real,
// pero con estilo propio (fondo punteado, sin color de materia) para que se note a simple vista
// que todavía no está agendado. Tocarlo abre vAgendaSolicitudOverlay() para resolverlo ahí mismo
// (Aceptar/Responder), sin tener que ir hasta el Tablero.
function vAgendaSolicitudEvent(e, posStyle, compact){
  const style = `${posStyle||""};border-left:3px dashed var(--muted);background:var(--soft)`;
  if(compact){
    return `<div class="agenda-event compact" style="${style}" data-a="agenda-solicitud-open" data-id="${e.solicitudId}">
      <span class="agenda-time">${esc(e.time)}</span><span class="agenda-who-compact">Pedido: ${esc(e.studentName)}</span>
    </div>`;
  }
  return `<div class="agenda-event" style="${style}" data-a="agenda-solicitud-open" data-id="${e.solicitudId}">
    <div class="agenda-time">${esc(e.time)} <span class="hint">pedido de clase</span></div>
    <div class="agenda-who" style="display:flex;align-items:center;gap:5px">${e.subjectId?subjectDot(e.subjectId):""} <b>${esc(e.studentName)}</b>${e.subject?` <span class="hint">· ${esc(e.subject)}</span>`:""}</div>
    <div class="hint">Pendiente de confirmación — tocá para resolver</div>
  </div>`;
}

// Popover para resolver un pedido de clase desde la Agenda (paso 199) — mismas acciones que la
// fila del Tablero (vSolicitudPedidoAccionesHtml en views-tablero.js), sin duplicar esa lógica.
// Sigue mostrando el panel de "Responder" o el resultado con WhatsApp (state.solicitudResuelta) si
// corresponde, hasta que el docente lo cierra o lo descarta.
function vAgendaSolicitudOverlay(){
  const id = state.agendaSolicitudOpen; if(!id) return "";
  const sol = (state.solicitudesClase||[]).find(x=>String(x.id)===String(id));
  const resuelta = state.solicitudResuelta && String(state.solicitudResuelta.id)===String(id) ? state.solicitudResuelta : null;
  if(!sol && !resuelta){ state.agendaSolicitudOpen=null; return ""; }
  const studentId = sol ? sol.studentId : resuelta.studentId;
  const s = state.students.find(x=>x.id===studentId);
  return `<div class="overlay" data-a="agenda-solicitud-close">
    <div class="modal" data-a="agenda-solicitud-noop" style="max-width:400px">
      <div class="ftitle" style="font-size:16px">Pedido de clase</div>
      <div class="hint" style="margin-bottom:10px">
        <b>${esc(s?s.name:"Alumno eliminado")}</b>${sol?` — ${esc(fmtDate(sol.fecha))} a las ${esc(sol.hora)}`:""}
        ${sol && sol.nota?`<div class="note">«${esc(sol.nota)}»</div>`:""}
      </div>
      ${sol ? vSolicitudPedidoAccionesHtml(sol, s) : vSolicitudResueltaHtml(resuelta, s)}
      <div style="display:flex;justify-content:flex-end;margin-top:14px">
        <button class="chip" data-a="agenda-solicitud-close">Cerrar</button>
      </div>
    </div>
  </div>`;
}


// Popover de "modo lista" para un cluster comprimido de la agenda (paso 169, ver
// vAgendaCompressedCluster más arriba) — reusa vAgendaEvent/vAgendaEventGrupal SIN posStyle/
// compact (tarjetas completas apiladas, no posicionadas) para mostrar el detalle completo de esas
// clases superpuestas; tocar una de ellas abre su popover normal de edición (paso 135) y cierra
// éste (ver agenda-event-open/agenda-event-grupal-open en events.js).
function vAgendaHourListOverlay(){
  const hl = state.agendaHourList; if(!hl) return "";
  const cards = hl.items.map(it=>{
    if(it.type==="grupal"){
      const ge = findAgendaEditEventGrupal({grupoId:it.grupoId, kind:it.kind, origDate:it.origDate});
      return ge ? vAgendaEventGrupal({...ge, sourceKind:ge.kind}, ge.date) : "";
    }
    const ie = findAgendaEditEvent({studentId:it.studentId, kind:it.kind, sourceId:it.sourceId, origDate:it.origDate});
    return ie ? vAgendaEvent(ie, ie.date) : "";
  }).filter(Boolean);
  if(!cards.length){ state.agendaHourList=null; return ""; }
  return `<div class="overlay" data-a="agenda-hour-list-close">
    <div class="modal" data-a="agenda-hour-list-noop" style="max-width:400px">
      <div class="ftitle" style="font-size:16px">${esc(fmtDate(hl.date))}</div>
      <div class="hint" style="margin-bottom:10px">Se superponen en el mismo horario — tocá una clase para ver el detalle completo.</div>
      ${cards.join("")}
      <div style="display:flex;justify-content:flex-end;margin-top:10px">
        <button class="chip" data-a="agenda-hour-list-close">Cerrar</button>
      </div>
    </div>
  </div>`;
}


/* ============ popover de edición de una clase desde la agenda (paso 135) ============
   Se abre al clickear cualquier tarjeta de vAgendaEvent (los botones internos siguen ganando la
   acción por closest("[data-a]")). Cambiar fecha/hora/duración/link de una clase puntual (kind
   "puntual") se aplica directo, porque es una única ocurrencia. Si viene de un horario habitual
   (kind "horario"), esos mismos campos quedan en agendaEditPending hasta elegir alcance ("sólo
   esta clase" genera una excepción puntual sobre esa fecha; "todas" cambia el horario recurrente
   entero) — ver applyHorarioEdit en helpers.js. El tema previsto no tiene alcance porque un
   horario habitual no tiene tema propio: siempre se guarda como excepción de esa ocurrencia. */
function vAgendaEditOverlay(){
  const edit = state.agendaEdit; if(!edit) return "";
  const ev = findAgendaEditEvent(edit);
  if(!ev){ state.agendaEdit=null; state.agendaEditPending=null; return ""; }
  const past = ev.date<today();
  const already = past && studentHasSessionOnDate(ev.studentId, ev.date);
  const overlap = agendaEditOverlap(ev);
  const pending = ev.kind==="horario" ? state.agendaEditPending : null;
  const dateVal = pending && pending.date!=null ? pending.date : ev.date;
  const timeVal = pending && pending.time!=null ? pending.time : ev.time;
  const durVal = pending && pending.duration!=null ? pending.duration : ev.duration;
  const linkVal = pending && pending.link!=null ? pending.link : (ev.link||"");

  let h = `<div class="overlay" data-a="agenda-edit-close">
    <div class="modal" data-a="agenda-edit-noop" style="max-width:400px">
      <div class="ftitle" style="font-size:16px">Editar clase</div>
      <div class="hint" style="margin-bottom:10px">
        <b style="cursor:pointer;text-decoration:underline" data-a="agenda-edit-goto-ficha" data-id="${ev.studentId}">${esc(ev.studentName)}</b>
        ${ev.subject?` · ${esc(ev.subject)}`:""}${ev.kind==="horario"?` · clase recurrente los ${esc(DIAS_SEMANA[ev.horario.day])}`:""}
      </div>
      <div class="frow">
        <div class="field"><div class="flabel">Fecha</div><input type="date" data-cf="agenda-edit-date" value="${esc(dateVal)}"></div>
        <div class="field"><div class="flabel">Hora</div><input type="time" data-cf="agenda-edit-time" value="${esc(timeVal)}"></div>
        <div class="field" style="max-width:150px"><div class="flabel">Duración</div>${durationFieldHtml(durVal, {dataCf:"agenda-edit-duration"})}</div>
      </div>
      <div class="field" style="margin-top:8px"><div class="flabel">Tema previsto</div><input type="text" data-cf="agenda-edit-topic" value="${esc(ev.topic||"")}" placeholder="Opcional"></div>
      <div class="field" style="margin-top:8px"><div class="flabel">Link de videollamada</div><input type="text" data-cf="agenda-edit-link" value="${esc(linkVal)}" placeholder="Opcional"></div>
      ${overlap?`<div class="hint" style="color:var(--status-desaprobo-fg);margin-top:8px;display:flex;align-items:center;gap:4px"><span class="icon-inline" style="width:12px;height:12px">${ICON_WARNING}</span> se superpone con otra clase</div>`:""}`;

  if(pending){
    h += `<div class="formcard" style="margin-top:10px">
      <div class="hint" style="margin-bottom:8px">Esta clase es parte de un horario recurrente. ¿El cambio aplica a...?</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip" data-a="agenda-edit-scope-solo">Sólo a esta clase</button>
        <button class="chip" data-a="agenda-edit-scope-todas">Todas las de este horario</button>
        <button class="chip" data-a="agenda-edit-scope-cancel">Deshacer cambio</button>
      </div>
    </div>`;
  }

  h += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
    ${past && !already ? `<button class="chip" data-a="agenda-edit-register">Registrar esta clase</button>` : ""}
    ${!past && ev.link ? `<a class="chip" target="_blank" rel="noopener" href="${esc(ev.link)}">Entrar a la clase</a>` : ""}
    ${!state.agendaEditCancelConfirm ? `<button class="chip" data-a="agenda-edit-cancel-ask">Cancelar / ausencia</button>` : ""}
    ${!state.agendaEditDeleteConfirm ? `<button class="chip" data-a="agenda-edit-delete-ask">${ev.kind==="puntual"?"Borrar esta clase":"Eliminar este horario"}</button>` : ""}
  </div>`;

  if(state.agendaEditCancelConfirm){
    h += `<div class="hint" style="margin-top:8px">¿Seguro? Se marca como cancelada/ausente.
      <button class="chip" data-a="agenda-edit-cancel-confirm">Sí, cancelar</button>
      <button class="chip" data-a="agenda-edit-cancel-cancel">No</button></div>`;
  }
  if(state.agendaEditDeleteConfirm){
    h += `<div class="hint" style="margin-top:8px">¿Seguro? ${ev.kind==="puntual"?"Se borra esta clase puntual.":"Se elimina TODO el horario recurrente, no sólo esta clase."}
      <button class="chip" data-a="agenda-edit-delete-confirm">Sí, eliminar</button>
      <button class="chip" data-a="agenda-edit-delete-cancel">No</button></div>`;
  }

  h += `<div style="display:flex;justify-content:flex-end;margin-top:14px">
    <button class="chip" data-a="agenda-edit-close">Cerrar</button>
  </div>
    </div>
  </div>`;
  return h;
}

// Popover de edición de una clase GRUPAL desde la agenda (paso 157) — mismos campos que
// vAgendaEditOverlay, pero el cambio siempre aplica a TODO el grupo (no hay alcance por
// integrante: un alumno faltando un día puntual es asistencia al registrar, no una excepción de
// horario, ver el comentario grande de "clases grupales" en helpers.js). "Registrar esta clase"
// no navega a ninguna ficha — abre el formulario grupal de asistencia (state.grupalForm).
function vAgendaEditOverlayGrupal(){
  const edit = state.agendaEditGrupal; if(!edit) return "";
  const ev = findAgendaEditEventGrupal(edit);
  if(!ev){ state.agendaEditGrupal=null; state.agendaEditGrupalPending=null; return ""; }
  const past = ev.date<today();
  const already = past && grupalOccurrenceRegistered({members: membersOfGrupoId(ev.grupoId, ev.kind).map(m=>({studentId:m.studentId})), date:ev.date});
  const pending = ev.kind==="horario" ? state.agendaEditGrupalPending : null;
  const dateVal = pending && pending.date!=null ? pending.date : ev.date;
  const timeVal = pending && pending.time!=null ? pending.time : ev.time;
  const durVal = pending && pending.duration!=null ? pending.duration : ev.duration;
  const linkVal = pending && pending.link!=null ? pending.link : (ev.link||"");

  let h = `<div class="overlay" data-a="agenda-edit-grupal-close">
    <div class="modal" data-a="agenda-edit-grupal-noop" style="max-width:400px">
      <div class="ftitle" style="font-size:16px">Editar clase grupal</div>
      <div class="hint" style="margin-bottom:10px">
        <b>${ev.studentNames.length} alumnos</b>: ${esc(ev.studentNames.join(", "))}
        ${ev.subject?` · ${esc(ev.subject)}`:""}${ev.kind==="horario"?` · clase recurrente los ${esc(DIAS_SEMANA[ev.day])}`:""}
      </div>
      <div class="frow">
        <div class="field"><div class="flabel">Fecha</div><input type="date" data-cf="agenda-edit-grupal-date" value="${esc(dateVal)}"></div>
        <div class="field"><div class="flabel">Hora</div><input type="time" data-cf="agenda-edit-grupal-time" value="${esc(timeVal)}"></div>
        <div class="field" style="max-width:150px"><div class="flabel">Duración</div>${durationFieldHtml(durVal, {dataCf:"agenda-edit-grupal-duration"})}</div>
      </div>
      <div class="field" style="margin-top:8px"><div class="flabel">Tema previsto</div><input type="text" data-cf="agenda-edit-grupal-topic" value="${esc(ev.topic||"")}" placeholder="Opcional"></div>
      <div class="field" style="margin-top:8px"><div class="flabel">Link de videollamada</div><input type="text" data-cf="agenda-edit-grupal-link" value="${esc(linkVal)}" placeholder="Opcional"></div>`;

  if(pending){
    h += `<div class="formcard" style="margin-top:10px">
      <div class="hint" style="margin-bottom:8px">Esta clase es parte de un horario recurrente grupal. ¿El cambio aplica a...?</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip" data-a="agenda-edit-grupal-scope-solo">Sólo a esta clase</button>
        <button class="chip" data-a="agenda-edit-grupal-scope-todas">Todas las de este horario</button>
        <button class="chip" data-a="agenda-edit-grupal-scope-cancel">Deshacer cambio</button>
      </div>
    </div>`;
  }

  h += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
    ${past && !already ? `<button class="chip" data-a="agenda-edit-grupal-register">Registrar esta clase</button>` : ""}
    ${!past && ev.link ? `<a class="chip" target="_blank" rel="noopener" href="${esc(ev.link)}">Entrar a la clase</a>` : ""}
    ${!state.agendaEditGrupalCancelConfirm ? `<button class="chip" data-a="agenda-edit-grupal-cancel-ask">Cancelar / ausencia (todo el grupo)</button>` : ""}
    ${!state.agendaEditGrupalDeleteConfirm ? `<button class="chip" data-a="agenda-edit-grupal-delete-ask">${ev.kind==="puntual"?"Borrar esta clase":"Eliminar este horario"}</button>` : ""}
  </div>`;

  if(state.agendaEditGrupalCancelConfirm){
    h += `<div class="hint" style="margin-top:8px">¿Seguro? Se marca cancelada/ausente para los ${ev.studentNames.length} alumnos del grupo — si sólo uno faltó, mejor registrá la clase y marcalo ausente a él solo.
      <button class="chip" data-a="agenda-edit-grupal-cancel-confirm">Sí, cancelar</button>
      <button class="chip" data-a="agenda-edit-grupal-cancel-cancel">No</button></div>`;
  }
  if(state.agendaEditGrupalDeleteConfirm){
    h += `<div class="hint" style="margin-top:8px">¿Seguro? ${ev.kind==="puntual"?"Se borra esta clase puntual para los "+ev.studentNames.length+" alumnos.":"Se elimina TODO el horario recurrente grupal, no sólo esta clase."}
      <button class="chip" data-a="agenda-edit-grupal-delete-confirm">Sí, eliminar</button>
      <button class="chip" data-a="agenda-edit-grupal-delete-cancel">No</button></div>`;
  }

  h += `<div style="display:flex;justify-content:flex-end;margin-top:14px">
    <button class="chip" data-a="agenda-edit-grupal-close">Cerrar</button>
  </div>
    </div>
  </div>`;
  return h;
}


/* ============ agenda semanal imprimible (paso 118) ============
   Mismo patrón de "documento" que informe/contrato/recibo (.informe-bar sin imprimir + .informe-doc
   con la identidad de Entreclases, ver vRecibo() más arriba) — la semana que ya se esté viendo en
   Agenda (state.agendaWeekOffset), agrupada por día, pensada para pegar en la heladera o el aula. */
function vAgendaImprimir(){
  const offset = state.agendaWeekOffset||0;
  const weekStart = addDays(mondayOfWeek(today()), offset*7);
  const weekEnd = addDays(weekStart,6);
  const events = agendaWeekEvents(weekStart);
  const byDay = Array.from({length:7},()=>[]);
  events.forEach(e=>{
    const idx = Math.round((new Date(e.date+"T12:00:00")-new Date(weekStart+"T12:00:00"))/86400000);
    if(idx>=0 && idx<7) byDay[idx].push(e);
  });
  byDay.forEach(list=>list.sort((a,b)=>a.time.localeCompare(b.time)));

  let h = `<div class="informe-bar no-print">
    <button class="back" style="margin:0" data-a="close-agenda-imprimir">← Volver a la agenda</button>
    <div class="informe-actions">
      <button class="primary" style="margin-left:0" data-a="agenda-imprimir-print">Imprimir</button>
    </div>
  </div>`;

  h += `<div class="informe-doc">
    <div class="informe-eyebrow">Agenda semanal</div>
    <h1 class="informe-name">${esc(fmtDate(weekStart))} – ${esc(fmtDate(weekEnd))}</h1>
    <div class="informe-sub">Entreclases</div>`;

  h += DIAS_SEMANA.map((label,i)=>{
    const date = addDays(weekStart,i);
    const list = byDay[i];
    return `<div class="informe-section">
      <div class="informe-stitle">${esc(label)} · ${esc(fmtDate(date))}</div>
      ${list.length===0
        ? `<div class="informe-row"><div class="informe-rowbody" style="color:var(--faint)">Sin clases</div></div>`
        : list.map(e=>`<div class="informe-row"><div class="informe-rowbody"><b>${esc(e.time)}</b> — ${esc(e.studentName)}${e.subject?` (${esc(e.subject)})`:""}</div></div>`).join("")}
    </div>`;
  }).join("");

  h += `<div class="informe-footer">Generado con Entreclases — ${esc(fmtDate(today()))}</div>
  </div>`;
  return h;
}


/* ============ exportar agenda (.ics), el período que se esté viendo (paso 110) ============
   Semana → esa semana; Mes → esa grilla mensual (mismo rango que ya se dibuja en pantalla,
   agendaIcsRangeForView() en helpers.js). Formato iCalendar estándar, sin nada propietario —
   Google Calendar, Outlook y el calendario del teléfono lo importan sin drama. */
function icsEscape(s){ return String(s??"").replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\n/g,"\\n"); }

function icsDateTime(date, time){ return date.replace(/-/g,"")+"T"+time.replace(":","")+"00"; }

function buildAgendaIcs(events){
  const stamp = today().replace(/-/g,"")+"T000000Z";
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Entreclases//ES","CALSCALE:GREGORIAN"];
  events.forEach((e,i)=>{
    lines.push("BEGIN:VEVENT");
    lines.push("UID:"+stamp+"-"+i+"@entreclases");
    lines.push("DTSTAMP:"+stamp);
    lines.push("DTSTART:"+icsDateTime(e.date,e.time));
    lines.push("DTEND:"+icsDateTime(e.date,addMinutesToTime(e.time,e.duration)));
    const quien = e.kind==="grupal" ? `Clase grupal (${e.studentNames.join(", ")})` : `Clase: ${e.studentName}`;
    lines.push("SUMMARY:"+icsEscape(`${quien}${e.subject?" — "+e.subject:""}`));
    lines.push("END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

// Botón + hint reutilizado por semana y mes — mismo texto en las dos vistas.
function vExportIcsButton(){
  return `<button class="chip" data-a="export-agenda-ics">Exportar a mi calendario</button>`;
}

function vExportIcsHint(){
  return `<div class="hint" style="margin-top:8px">Descarga un archivo .ics — abrilo con Google Calendar, Outlook o el calendario del teléfono para importar estas clases (en Google Calendar: engranaje → Configuración → Importar y exportar → Importar).</div>`;
}
