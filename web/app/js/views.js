"use strict";
/* ============ piezas de presentación reutilizables ============ */
const semDot = (v,size,btn) => {
  const m=SEM_META[v||"sd"];
  const dot=`<span class="sem" title="${esc(m.label)}" style="width:${size}px;height:${size}px;background:${m.color}"></span>`;
  return btn ? `<button class="sembtn" data-a="cycle-sem" title="${esc(m.label)} — tocá para cambiar">${dot}</button>` : dot;
};
const pill = (st) => { const m=STATUS_META[st];
  return `<span class="pill" style="color:${m.fg};background:${m.bg}">${m.label}</span>`; };
const tabbtn = (a,on,label) => `<button class="tabbtn ${on?"on":""}" data-a="${a}">${label}</button>`;
const examplePill = (s) => s.sample ? `<span class="pill" style="color:var(--blue);background:var(--bluebg)">Ejemplo</span>` : "";

/* ============ vistas ============ */
function vTips(){
  if(tipsDismissed()) return "";
  return `<div class="formcard" style="display:flex;align-items:flex-start;gap:10px;justify-content:space-between">
    <div>
      <div class="ftitle" style="margin-bottom:8px">Primeros pasos</div>
      <div style="font-size:13px;color:var(--muted);display:flex;flex-direction:column;gap:4px">
        <span><b style="color:var(--ink)">1.</b> Cargá tu primer alumno</span>
        <span><b style="color:var(--ink)">2.</b> Marcá los temas que ya vieron</span>
        <span><b style="color:var(--ink)">3.</b> Registrá cada clase al terminarla</span>
      </div>
    </div>
    <button class="del" style="font-size:20px" data-a="dismiss-tips" title="Descartar">×</button>
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
      ? `<div style="color:var(--red);font-weight:600;margin-bottom:10px">¡Tiempo cumplido!</div>`
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
      <button class="del" style="font-size:20px" data-a="dismiss-backup-reminder" title="Descartar">×</button>
    </div>
  </div>`;
}
function vTablero(){
  const activos = alive().filter(s=>s.status==="activo");
  const alerts = activos.flatMap(s=>studentAlerts(s).map(a=>({s,...a})));
  const upcoming = activos.filter(s=>s.examDate && daysTo(s.examDate)>=0)
                          .sort((a,b)=>a.examDate.localeCompare(b.examDate));
  const enRiesgo = new Set(alerts.map(a=>a.s.id)).size;
  let h = vTips();
  h += vBackupReminder();
  h += `<div class="stats">
    <div class="stat"><b>${activos.length}</b><span>activos</span></div>
    <div class="stat"><b>${upcoming.length}</b><span>con examen a la vista</span></div>
    <div class="stat ${enRiesgo?"warn":""}"><b>${enRiesgo}</b><span>con alertas</span></div>
    <button class="primary" data-a="new">+ Nuevo estudiante</button></div>`;

  const pendientesMes = activos.filter(hasPagos).map(s=>pagoResumen(s,currentMonthKey())).filter(r=>r&&r.pendiente>0);
  if(pendientesMes.length){
    const totalPend = pendientesMes.reduce((a,r)=>a+r.pendiente,0);
    h += `<button class="alert" data-a="nav-pagos" style="cursor:pointer">
      <span class="dot"></span><span class="t">Tenés ${fmtMoney(totalPend)} pendientes de cobro de ${pendientesMes.length} alumno${pendientesMes.length===1?"":"s"} este mes</span></button>`;
  }

  h += `<div class="stitle">Alertas</div>`;
  h += alerts.length===0
    ? `<div class="empty">Sin alertas. Todo el mundo al día — buen momento para conseguir parciales viejos.</div>`
    : alerts.map(a=>`<div class="alert-row">
        <button class="alert" data-a="open" data-id="${a.s.id}">
          <span class="dot"></span><b>${esc(a.s.name)}</b><span class="t">${esc(a.text)}</span></button>
        ${hasPhone(a.s)?`<a class="wa-quick" title="Enviar WhatsApp" target="_blank" rel="noopener" href="${waLink(a.s,waMsgForAlert(a.s,a.wa))}">💬</a>`:""}
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
    h += `<div class="empty" style="margin-top:24px;text-align:center;padding:32px">
      El cuaderno está vacío. Elegí por dónde arrancar:
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px">
        <button class="primary" style="margin-left:0" data-a="load-sample">Cargar un alumno de ejemplo</button>
        <button class="chip" data-a="new">Empezar con mis alumnos</button>
      </div></div>`;

  h += `<div class="stitle">Respaldo</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button class="chip" data-a="export">Descargar copia (.json)</button>
      <label class="chip" style="cursor:pointer">Restaurar desde archivo
        <input type="file" id="importFile" accept="application/json" style="display:none"></label>
      <span class="hint">Restaurar reemplaza todos los datos actuales por los del archivo.</span></div>`;
  return h;
}

const SEM_SHORT = {sd:"Sin evaluar", verde:"Verde", amarillo:"Amarillo", rojo:"Rojo"};
function listFiltersActive(){
  return !!(state.listSearch || state.listSubject!=="todas" || state.listCareer!=="todas" || state.listSem!=="todos" || state.filter!=="activo");
}
function vLista(){
  const order=["activo","pausado","desaprobo","aprobo","dejo","todos"];
  const q = (state.listSearch||"").trim().toLowerCase();
  const shown = alive()
    .filter(s=>state.filter==="todos"||s.status===state.filter)
    .filter(s=>!q || s.name.toLowerCase().includes(q))
    .filter(s=>state.listSubject==="todas"||s.subjectId===state.listSubject)
    .filter(s=>state.listCareer==="todas"||s.career===state.listCareer)
    .filter(s=>state.listSem==="todos"||(s.semaforo||"sd")===state.listSem)
    .sort((a,b)=>((a.examDate||"9999").localeCompare(b.examDate||"9999"))||a.name.localeCompare(b.name));

  let h = `<div class="field" style="margin-bottom:10px">
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
    ${listFiltersActive()?`<button class="chip" data-a="clear-filters">Limpiar filtros</button>`:""}
    <span style="flex:1"></span><button class="primary" data-a="new">+ Nuevo</button></div>`;

  h += `<div class="hint" style="margin-bottom:10px">${shown.length} resultado${shown.length===1?"":"s"}</div>`;

  if(shown.length===0) return h + `<div class="empty">Nadie en esta categoría por ahora.</div>`;

  h += shown.map(s=>{
    const d=daysTo(s.examDate);
    const na=studentAlerts(s).length;
    const units=unitsFor(s);
    const seen=units.filter(t=>["visto","practica","parcial"].includes((s.topics||{})[t])).length;
    const rel=units.filter(t=>(s.topics||{})[t]!=="noentra").length||1;
    const right = (d!==null&&d>=0&&s.status==="activo")
      ? `<span style="color:${d<=7?"var(--red)":"var(--ink)"};font-weight:600">examen en ${d}d</span>`
      : `<span style="color:var(--faint)">${s.examDate?fmtDate(s.examDate):"sin fecha"}</span>`;
    return `<div class="row">
      <button class="row-click" data-a="open" data-id="${s.id}">
        <div class="main"><div class="name">${esc(s.name)} ${semDot(s.semaforo,13,false)} ${pill(s.status)} ${examplePill(s)}
          ${na?`<span class="mini-alert">${na} alerta${na>1?"s":""}</span>`:""}</div>
        <div class="sub">${esc(s.career)} · ${esc(s.subject||"materia s/d")} · temas ${seen}/${rel}</div></div>
        <div class="right">${right}</div>
      </button>
      ${hasPhone(s)?`<a class="wa-quick" title="Enviar WhatsApp" target="_blank" rel="noopener" href="${waLink(s,waQuickMessage(s))}">💬</a>`:""}
    </div>`;
  }).join("");
  return h;
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
  h += alerts.map(a=>`<div class="alert" style="cursor:default"><span class="dot"></span><span class="t">${esc(a.text)}</span></div>`).join("");
  h += `<div class="tabs" style="margin:16px 0 14px">` +
    tabbtn("tab-temas",state.tab==="temas","Temas") +
    tabbtn("tab-clases",state.tab==="clases",`Clases (${s.sessions.length})`) +
    tabbtn("tab-simulacros",state.tab==="simulacros",`Simulacros (${s.simulacros.length})`) +
    tabbtn("tab-ficha",state.tab==="ficha","Ficha") + `</div>`;

  if(state.tab==="temas"){
    const units=unitsFor(s);
    if(units.length===0){
      h += `<div class="empty">Este alumno no tiene una materia elegida. Entrá a la pestaña «Ficha» y elegí su materia: la grilla de unidades se arma sola. Las materias y sus unidades se administran desde «Materias y carreras».</div>`;
    } else {
      h += `<div class="hint" style="margin-bottom:10px">Tocá cada unidad para avanzar el estado: Pendiente → Visto → Práctica → Nivel parcial → No entra. «Nivel parcial» significa que resuelve solo ejercicios de nivel examen.</div>
      <div class="topicgrid">` + units.map(t=>{
        const st=(s.topics||{})[t]||"pendiente";
        const m=TOPIC_META[st];
        return `<button class="topic" data-a="cycle-topic" data-t="${esc(t)}"
          style="background:${m.bg};border-color:${m.bd}">
          <b style="color:${st==="noentra"?"var(--gray2)":"var(--ink)"}">${esc(t)}</b>
          <small style="color:${m.fg}">${m.label}</small></button>`;
      }).join("") + `</div>`;
    }
  }

  if(state.tab==="clases"){
    h += `<div class="formcard"><div class="ftitle">Registrar clase (30 segundos, apenas termina)</div>
      <div class="frow">
        <div class="field"><div class="flabel">Fecha</div><input type="date" id="c-date" value="${today()}"></div>
        <div class="field"><div class="flabel">Tema principal</div><select id="c-topic"><option value="">—</option>
          ${unitsFor(s).map(t=>`<option>${esc(t)}</option>`).join("")}
          <option>Nivelación</option><option>Repaso / parciales viejos</option></select></div>
        <div class="field"><div class="flabel">¿Trajo la tarea?</div><select id="c-tarea">
          <option value="sd">—</option><option value="hecha">Hecha</option>
          <option value="intentada">Intentada</option><option value="no">No hecha</option></select></div>
      </div>
      <div class="field"><div class="flabel">Nota rápida (qué costó, tarea que dejaste)</div>
        <input id="c-note" placeholder="Ej: se traba en cadena+cociente. Tarea: guía 5, ej. 8-12"></div>
      <button class="primary" style="margin-top:10px;margin-left:0" data-a="save-session">Guardar clase</button></div>`;
    const cobraPorClase = hasPagos(s) && s.modalidad==="clase";
    const sorted=[...s.sessions].sort((a,b)=>b.date.localeCompare(a.date));
    h += sorted.length===0 ? `<div class="empty">Todavía no hay clases registradas.</div>`
      : sorted.map(c=>`<div class="log"><div class="d">${fmtDate(c.date)}</div>
        <div class="body"><span style="font-weight:600">${esc(c.topic||"Clase")}</span>
        ${c.tarea&&c.tarea!=="sd"?`<span class="tareatag" style="color:${TAREA_META[c.tarea].fg}">tarea: ${TAREA_META[c.tarea].label}</span>`:""}
        ${c.note?`<div class="note">${esc(c.note)}</div>`:""}</div>
        ${cobraPorClase?`<button class="chip ${c.cobrada?"on":""}" data-a="toggle-cobrada" data-id="${c.id}">${c.cobrada?"Cobrada":"Pendiente"}</button>`:""}
        <button class="del" data-a="del-session" data-id="${c.id}" title="Borrar">×</button></div>`).join("");
  }

  if(state.tab==="simulacros"){
    h += vSimTimer();
    h += `<div class="formcard"><div class="ftitle">Registrar simulacro (parcial viejo, cronometrado)</div>
      <div class="frow">
        <div class="field"><div class="flabel">Fecha</div><input type="date" id="s-date" value="${today()}"></div>
        <div class="field"><div class="flabel">Nota</div><input id="s-grade" placeholder="Ej: 5.5 / 10"></div>
      </div>
      <div class="field"><div class="flabel">Diagnóstico: errores conceptuales / de cuenta / de tiempo</div>
        <input id="s-note" placeholder="Ej: 2 conceptuales en límites, 1 de cuenta, le faltó tiempo en el último" value="${esc(state.simPrefillNote||"")}"></div>
      <button class="primary" style="margin-top:10px;margin-left:0" data-a="save-sim">Guardar simulacro</button></div>`;
    const sorted=[...s.simulacros].sort((a,b)=>b.date.localeCompare(a.date));
    h += sorted.length===0 ? `<div class="empty">Sin simulacros. Idealmente el primero va 10–14 días antes del examen.</div>`
      : sorted.map(c=>`<div class="log"><div class="d">${fmtDate(c.date)}</div>
        <div class="body"><span style="font-weight:700;font-family:var(--mono)">${esc(c.grade||"s/nota")}</span>
        ${c.note?`<div class="note">${esc(c.note)}</div>`:""}</div>
        <button class="del" data-a="del-sim" data-id="${c.id}" title="Borrar">×</button></div>`).join("");
  }

  if(state.tab==="ficha"){
    const opt=(v,cur,l)=>`<option value="${esc(v)}" ${v===cur?"selected":""}>${esc(l)}</option>`;
    h += `<div class="formcard" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div><div class="ftitle" style="margin-bottom:2px">Informe de progreso</div>
        <div class="hint">Un resumen prolijo para compartir con el alumno o la familia.</div></div>
      <button class="chip" data-a="open-informe">Generar informe</button></div>`;
    if(hasPhone(s)) h += vWhatsApp(s);
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
      <div class="frow" style="margin-top:4px">
        <div class="field"><div class="flabel">Tarifa (pesos)</div><input type="number" min="0" data-f="tarifa" placeholder="Sin cargar = sin cobro" value="${esc(s.tarifa||"")}"></div>
        <div class="field"><div class="flabel">Modalidad de cobro</div><select data-f="modalidad">
          <option value="" ${!s.modalidad?"selected":""}>—</option>
          <option value="clase" ${s.modalidad==="clase"?"selected":""}>Por clase</option>
          <option value="mensual" ${s.modalidad==="mensual"?"selected":""}>Mensual</option></select></div></div>
      ${hasPagos(s)&&s.modalidad==="clase"?`<div class="hint" style="margin-top:2px">Marcá cada clase como cobrada desde la pestaña «Clases».</div>`:""}
      ${hasPagos(s)&&s.modalidad==="mensual"?vPagosMensuales(s):""}
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--soft)">
        ${!state.confirmDel
          ? `<button class="danger" data-a="ask-del">${s.sample?"Eliminar ejemplo":"Eliminar estudiante…"}</button>`
          : `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span style="font-size:13px;color:var(--red)">${s.sample?"Se borra este alumno de ejemplo. ¿Seguro?":"Se borra todo su historial. ¿Seguro?"}</span>
              <button class="danger" data-a="confirm-del">Sí, eliminar</button>
              <button class="chip" data-a="cancel-del">Cancelar</button></div>`}
        ${s.sample?"":`<div class="hint" style="margin-top:8px">Consejo: si dejó o rindió, cambiá el estado en vez de borrarlo — si vuelve (pasa seguido), retomás con todo el historial.</div>`}
      </div></div>`;
  }
  return h;
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
function vWhatsApp(s){
  return `<div class="formcard"><div class="ftitle">Enviar WhatsApp</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgProximaClase(s))}">Recordatorio de próxima clase</a>
      <a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgTareaHoy(s))}">Tarea de la última clase</a>
      ${s.examDate?`<a class="chip" target="_blank" rel="noopener" href="${waLink(s,waMsgExamen(s))}">Recordatorio de examen</a>`:""}
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
      <div class="field"><div class="flabel">Fecha</div><input type="date" id="pago-date" value="${today()}"></div>
      <div class="field"><div class="flabel">Monto</div><input type="number" min="0" id="pago-amount" placeholder="Ej: ${esc(s.tarifa||"")}"></div>
      <button class="chip" data-a="save-pago" style="margin-bottom:2px">+ Registrar pago</button></div>`;
  h += sorted.length===0 ? `<div class="empty" style="margin-top:8px">Sin pagos registrados todavía este mes ni anteriores.</div>`
    : sorted.map(p=>`<div class="log" style="margin-top:6px"><div class="d">${fmtDate(p.date)}</div>
      <div class="body">${fmtMoney(p.amount)}</div>
      <button class="del" data-a="del-pago" data-id="${p.id}" title="Borrar">×</button></div>`).join("");
  h += `</div>`;
  return h;
}

/* ============ vista "Pagos": resumen del mes, todos los alumnos con tarifa cargada ============ */
function vPagos(){
  const mk = state.pagosMonth || currentMonthKey();
  let h = `<div class="field" style="max-width:280px;margin-bottom:14px">
    <div class="flabel">Mes</div>
    <select data-cf="pagos-month">
      ${recentMonthKeys(12).map(k=>`<option value="${k}" ${k===mk?"selected":""}>${esc(monthLabel(k))}</option>`).join("")}
    </select></div>`;

  const rows = alive().filter(hasPagos).map(s=>({s, r:pagoResumen(s,mk)}));
  if(rows.length===0)
    return h + `<div class="empty">Todavía no hay alumnos con tarifa cargada. Se configura desde la pestaña «Ficha» de cada alumno.</div>`;

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
      <button class="primary" style="margin-left:0" data-a="informe-print">Descargar PDF</button>
    </div>
  </div>`;
  if(state.informeCopyMsg) h += `<div class="hint no-print" style="margin:-10px 0 14px">${esc(state.informeCopyMsg)}</div>`;

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
          ${c.note?`<div class="informe-note">${esc(c.note)}</div>`:""}</div></div>`).join("")}
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

    <div class="informe-footer">Generado con Cuaderno de seguimiento — ${esc(fmtDate(today()))}</div>
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
  });
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
  lines.push("_Generado con Cuaderno de seguimiento_");
  return lines.join("\n");
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
      <div class="eyebrow">Clases particulares</div>
      <h1 style="font-size:22px">Cuaderno de seguimiento</h1>
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
      <div class="hint" id="authMsg" style="margin-top:10px;min-height:16px${locked?";color:var(--red)":""}">${locked?esc("Demasiados intentos. Probá de nuevo en "+fmtLockRemaining(lockMs)+"."):""}</div>
    </div>
  </div>`;
}

function vConfirmEmail(){
  return `<div style="max-width:360px;margin:64px auto 0">
    <div style="text-align:center;margin-bottom:20px">
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

function vCuenta(){
  const ses=getSes();
  return `<button class="back" data-a="nav-tablero">← Volver al tablero</button>
  <div class="formcard"><div class="ftitle">Cuenta</div>
    <div style="font-size:13.5px;margin-bottom:6px">Conectado como <b>${esc(ses?ses.email:"")}</b></div>
    <div class="hint" style="margin-bottom:6px">${sesIsAdmin(ses)?"Cuenta de administrador":"Cuenta de profesor"}</div>
    <div class="hint" style="margin-bottom:14px">${syncStatusText()}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="chip" data-a="sync-now">Sincronizar ahora</button>
      <button class="danger" data-a="auth-logout">Cerrar sesión</button>
    </div>
  </div>
  <div class="formcard"><div class="ftitle">Apariencia</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${themeBtn("system","Según el sistema")}${themeBtn("light","Claro")}${themeBtn("dark","Oscuro")}
    </div>
  </div>
  <div class="formcard"><div class="ftitle">Respaldos automáticos</div>
    <div class="hint" style="margin-bottom:10px">Se guarda una copia completa una vez por día, en la primera sincronización. Se conservan las últimas ${MAX_BACKUPS}. Esto no reemplaza la copia manual (.json) del tablero — conviven.</div>
    ${vBackupsList()}
  </div>
  <div class="formcard"><div class="ftitle">Reportar un problema</div>
    <div class="field"><textarea id="report-msg" placeholder="Contanos qué pasó — cuanto más detalle, mejor.">${esc(state.reportMsg||"")}</textarea></div>
    <button class="primary" style="margin:10px 0 0;margin-left:0" data-a="send-report" ${state.reportStatus==="sending"?"disabled":""}>Enviar reporte</button>
    <div class="hint" id="reportMsg" style="margin-top:10px;min-height:16px;color:${state.reportStatus==="error"?"var(--red)":state.reportStatus==="ok"?"var(--green)":"var(--faint)"}">${esc(reportStatusText())}</div>
  </div>`;
}
function themeBtn(v,label){
  return `<button class="chip ${getTheme()===v?"on":""}" data-a="set-theme" data-f="${v}">${label}</button>`;
}
function reportStatusText(){
  if(state.reportStatus==="sending") return "Enviando…";
  if(state.reportStatus==="ok") return "¡Gracias! Recibimos tu reporte.";
  if(state.reportStatus==="error") return state.reportError||"No se pudo enviar el reporte.";
  return "";
}

function vBackupsList(){
  if(state.backupsError) return `<div class="saveerr">${esc(state.backupsError)}</div>`;
  if(!state.backupsLoaded) return `<div class="empty">Cargando respaldos…</div>`;
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
            <span style="font-size:12.5px;color:var(--red)">Reemplaza tus datos actuales por los de este respaldo (antes se guarda uno extra del estado de ahora). ¿Confirmás?</span>
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
  let h = `<button class="back" data-a="nav-tablero">← Volver al tablero</button>`;
  const em = state.editSubjectId ? subjById(state.editSubjectId) : null;
  if(em){
    h += `<div class="formcard"><div class="ftitle">Editar materia</div>
    ${em.id==="materia-ejemplo"?`<div class="hint" style="margin-bottom:12px">Esta materia viene de ejemplo para mostrar el formato de unidades — renombrala o borrala cuando quieras.</div>`:""}
    <div class="field"><div class="flabel">Nombre de la materia</div>
      <input data-cf="subj-name" value="${esc(em.name)}"></div>
    <div class="flabel" style="margin-top:12px">Unidades / temas (se muestran en este orden)</div>
    ${em.units.map((u,i)=>`<div class="log" style="padding:7px 12px"><div class="body">${esc(u)}</div>
      <button class="del" data-a="cat-del-unit" data-i="${i}" title="Quitar unidad">×</button></div>`).join("") || `<div class="empty">Sin unidades todavía. Agregá la primera acá abajo.</div>`}
    <div class="frow" style="margin-top:8px;align-items:flex-end">
      <div class="field"><input id="new-unit" placeholder="Ej: Límites y continuidad"></div>
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
    ${ep.subjectIds.length<2?`<div class="hint" style="color:var(--red)">Este pack necesita al menos 2 materias para poder usarse al dar de alta un alumno.</div>`:""}
    <button class="primary" style="margin:12px 0 0;margin-left:0" data-a="cat-close-pack-edit">Listo</button>
    <div class="hint" style="margin-top:8px">Los cambios se guardan solos. Eliminar el pack no borra las materias que agrupa.</div>
    </div>`;
    return h;
  }
  h += `<div class="formcard"><div class="ftitle">Carreras</div>
  ${c.careers.map((x,i)=>`<div class="log" style="padding:7px 12px"><div class="body">${esc(x)}</div>
    <button class="del" data-a="cat-del-career" data-i="${i}" title="Quitar">×</button></div>`).join("") || `<div class="empty">Sin carreras cargadas.</div>`}
  <div class="frow" style="margin-top:8px;align-items:flex-end">
    <div class="field"><input id="new-career" placeholder="Ej: Contador Público"></div>
    <button class="chip" data-a="cat-add-career" style="margin-bottom:2px">+ Agregar carrera</button></div>
  <div class="hint" style="margin-top:6px">Quitar una carrera no afecta a los alumnos que ya la tienen: la conservan en su ficha.</div></div>`;
  h += `<div class="formcard"><div class="ftitle">Materias y sus unidades</div>
  ${c.subjects.map(m=>{
    const packNames=packsContaining(m.id).map(p=>p.name);
    return `<div class="row" style="cursor:pointer" data-a="cat-edit-subject" data-id="${m.id}">
    <div class="main"><b>${esc(m.name)}</b> ${packNames.map(n=>`<span class="pill" style="color:var(--blue);background:var(--bluebg)">${esc(n)}</span>`).join(" ")}
      <div class="sub">${m.units.length} unidad${m.units.length===1?"":"es"}</div></div>
    <button class="del" data-a="cat-del-subject" data-id="${m.id}" title="Eliminar materia">×</button></div>`;
  }).join("") || `<div class="empty">Sin materias cargadas.</div>`}
  <div class="frow" style="margin-top:8px;align-items:flex-end">
    <div class="field"><input id="new-subject" placeholder="Ej: Álgebra y Geometría Analítica"></div>
    <button class="chip" data-a="cat-add-subject" style="margin-bottom:2px">+ Agregar materia</button></div>
  <div class="hint" style="margin-top:6px">Al crear una materia se abre su editor para cargarle las unidades. Después, al dar de alta un alumno, la elegís de la lista y su grilla de temas se arma sola. Eliminar una materia no borra el avance de los alumnos que la usaban.</div></div>`;
  h += `<div class="formcard"><div class="ftitle">Packs</div>
  <div class="hint" style="margin-bottom:10px">Un pack agrupa varias materias para dar de alta al alumno en todas de una — ej. «Ingreso a Medicina».</div>
  ${(c.packs||[]).map(p=>{
    const names=p.subjectIds.map(id=>{const m=subjById(id); return m?m.name:null;}).filter(Boolean);
    return `<div class="row" style="cursor:pointer" data-a="cat-edit-pack" data-id="${p.id}">
    <div class="main"><b>${esc(p.name)}</b><div class="sub">${names.length} materia${names.length===1?"":"s"}${names.length?": "+esc(names.join(", ")):""}</div></div>
    <button class="del" data-a="cat-del-pack" data-id="${p.id}" title="Eliminar pack">×</button></div>`;
  }).join("") || `<div class="empty">Sin packs todavía.</div>`}
  <div class="field" style="margin-top:10px"><div class="flabel">Nombre del pack nuevo</div>
    <input id="new-pack-name" data-cf="new-pack-name" placeholder="Ej: Ingreso a Medicina" value="${esc(state.newPackName||"")}"></div>
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
  let h = `<div class="formcard"><div class="ftitle">Materiales</div>`;
  if(!navigator.onLine || state.materialesError==="offline"){
    h += `<div class="hint">Necesitás conexión a internet para ver y subir materiales.</div></div>`;
    return h;
  }
  if(state.materialesSubjectId!==subjectId || !state.materialesLoaded){
    h += `<div class="empty">Cargando materiales…</div></div>`;
    return h;
  }
  if(state.materialesError){
    h += `<div class="saveerr">${esc(state.materialesError)}</div>
    <button class="chip" data-a="mat-reload" data-id="${subjectId}">Reintentar</button></div>`;
    return h;
  }
  const list = state.materialesList||[];
  h += `<div class="hint" style="margin-bottom:10px">${list.length}/${MATERIAL_MAX_COUNT} archivos · máx. ${fmtBytes(MATERIAL_MAX_BYTES)} cada uno</div>`;
  h += list.length===0 ? `<div class="empty">Sin materiales todavía.</div>` : list.map(f=>{
    const dn=materialDisplayName(f.name);
    const size=(f.metadata&&f.metadata.size)||0;
    const confirming = state.materialesConfirmDelName===f.name;
    return `<div class="log" style="align-items:center;flex-wrap:wrap">
      <div class="body">${esc(dn)}<div class="note">${fmtBytes(size)} · ${fmtDateTime(f.updated_at||f.created_at)}</div></div>
      ${!confirming ? `<button class="chip" data-a="mat-download" data-id="${subjectId}" data-name="${esc(f.name)}">Descargar</button>
        <button class="del" data-a="mat-del-ask" data-name="${esc(f.name)}" title="Borrar">×</button>`
      : `<span style="font-size:12px;color:var(--red)">¿Borrar «${esc(dn)}»?</span>
        <button class="danger" data-a="mat-del-confirm" data-id="${subjectId}" data-name="${esc(f.name)}" ${state.materialesDeleteStatus==="deleting"?"disabled":""}>Sí, borrar</button>
        <button class="chip" data-a="mat-del-cancel">Cancelar</button>`}
    </div>`;
  }).join("");
  if(state.materialesUploadError) h += `<div class="saveerr" style="margin-top:8px">${esc(state.materialesUploadError)}</div>`;
  const full = list.length>=MATERIAL_MAX_COUNT;
  h += `<div class="frow" style="margin-top:10px;align-items:flex-end">
    <div class="field"><div class="flabel">Subir archivo (máx. ${fmtBytes(MATERIAL_MAX_BYTES)})</div>
      <input type="file" id="mat-file" ${full||state.materialesUploading?"disabled":""}></div>
    <button class="chip" data-a="mat-upload" data-id="${subjectId}" style="margin-bottom:2px" ${full||state.materialesUploading?"disabled":""}>${state.materialesUploading?"Subiendo…":"+ Subir"}</button>
  </div>
  ${full?`<div class="hint" style="margin-top:6px">Llegaste al máximo de ${MATERIAL_MAX_COUNT} archivos para esta materia.</div>`:""}
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
          <div title="${esc(lbl)}: ${v}" style="width:28px;background:${SEM_META[k].color};border-radius:4px 4px 0 0;height:${hgt}px"></div>
        </div>
        <b style="font-family:var(--mono);font-size:13px;margin-top:4px">${v}</b>
        <div class="hint" style="text-align:center">${esc(lbl)}</div>
      </div>`;
    }).join("") + `</div>`;
}
function vEstadisticas(){
  let h = `<button class="back" data-a="nav-tablero">← Volver al tablero</button>`;
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
    <div class="stat"><b>${grupo.length}</b><span>alumnos activos</span></div>
    <div class="stat"><b>${conExamen.length}</b><span>con examen a la vista</span></div>
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
    h += `<div class="stats" style="margin-bottom:8px"><div class="stat"><b>${avg.toFixed(0)}%</b><span>en nivel parcial, promedio del grupo</span></div></div>
    <div style="background:var(--soft);border-radius:99px;height:14px;overflow:hidden;max-width:320px;margin-bottom:20px">
      <div style="height:100%;width:${avg.toFixed(1)}%;background:var(--green);border-radius:99px"></div>
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
    ? `<div class="stats"><div class="stat"><b>${(notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(1)}</b><span>promedio (${notas.length} simulacro${notas.length===1?"":"s"})</span></div></div>`
    : `<div class="empty">Sin simulacros recientes.</div>`;

  h += vAula(grupo);
  h += vTuActividad();
  return h;
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
  const firstName = (s.name||"").trim().split(/\s+/)[0] || "—";
  const title = `${s.name||"—"} — ${SEM_META[sem].label} — avance: ${pctVal}%`;
  return `<button class="desk" data-a="open" data-id="${esc(s.id)}" title="${esc(title)}">
    <div class="desk-top"><div class="desk-progress" style="width:${pctVal}%"></div></div>
    <div class="desk-body" style="background:${color}">
      ${showBadge?`<span class="desk-badge">${d===0?"hoy":d+"d"}</span>`:""}
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
    <div style="flex:1;background:var(--soft);border-radius:4px;overflow:hidden;height:14px">
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
  let h = `<button class="back" data-a="nav-tablero">← Volver al tablero</button>
  <div class="tabs" style="margin-bottom:14px">
    ${tabbtn("panel-tab-reportes",tab==="reportes","Reportes")}
    ${tabbtn("panel-tab-usuarios",tab==="usuarios","Usuarios")}
    ${tabbtn("panel-tab-actividad",tab==="actividad","Actividad")}
    ${tabbtn("panel-tab-recursos",tab==="recursos","Recursos")}
  </div>`;
  h += tab==="usuarios" ? vUsuarios() : tab==="actividad" ? vActividad() : tab==="recursos" ? vRecursos() : vReportes();
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
  else if(!state.reportesLoaded) h += `<div class="empty">Cargando reportes…</div>`;
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
  let h = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button class="chip" data-a="refresh-usuarios">Actualizar</button></div>`;
  if(state.usersError) return h + `<div class="saveerr">${esc(state.usersError)}</div>`;
  if(!state.usersLoaded) return h + `<div class="empty">Cargando usuarios…</div>`;
  const list = state.users||[];
  const now = Date.now();
  const ONLINE_MS = 10*60*1000, WEEK_MS = 7*86400000;
  const lastSeenMs = u => u.last_seen_at ? now-new Date(u.last_seen_at).getTime() : null;
  const isOnline = u => { const ms=lastSeenMs(u); return ms!==null && ms<ONLINE_MS; };
  const isActiveWeek = u => { const ms=lastSeenMs(u); return ms!==null && ms<WEEK_MS; };
  h += `<div class="stats">
    <div class="stat"><b>${list.length}</b><span>cuentas totales</span></div>
    <div class="stat"><b>${list.filter(isOnline).length}</b><span>en línea ahora</span></div>
    <div class="stat"><b>${list.filter(isActiveWeek).length}</b><span>activos últimos 7 días</span></div>
  </div>`;
  if(list.length===0) return h + `<div class="empty">Todavía no hay cuentas.</div>`;
  h += list.map(u=>{
    const seen = isOnline(u)
      ? `<span style="display:inline-flex;align-items:center;gap:5px;color:var(--green);font-weight:600">
          <span class="sem" style="width:8px;height:8px;background:var(--green)"></span>En línea</span>`
      : `<span style="color:var(--faint)">${u.last_seen_at?"visto por última vez "+timeAgo(u.last_seen_at):"nunca conectado"}</span>`;
    return `<div class="log" style="align-items:flex-start">
      <div class="body">
        <div style="font-weight:600">${esc(u.email||"—")} <span class="hint">· ${esc(u.rol||"—")}</span></div>
        <div class="note">${seen} · ${esc(u.plataforma||"—")} · v${esc(u.version||"—")} · alta ${fmtDateTime(u.created_at)}</div>
      </div>
    </div>`;
  }).join("");
  return h;
}

// Barras simples en CSS (sin librerías): una <div> por dato, alto proporcional al máximo
// del propio conjunto. Con pocas barras el valor va arriba de cada una (entra sin pisarse);
// con muchas (30/48 puntos) no entra un número por barra, así que solo queda en el título
// (tooltip) — se ve al tocar/pasar el mouse, igual que antes.
function barRow(dataset){
  const max=Math.max(1, ...dataset.map(d=>d.v));
  const showLabels = dataset.length<=20;
  return `<div style="display:flex;align-items:flex-end;gap:3px;height:74px;margin-bottom:4px">` +
    dataset.map(d=>{
      const hgt=Math.max(2,Math.round(d.v/max*58));
      return `<div title="${esc(d.label)}: ${d.v}" style="flex:1;min-width:2px;display:flex;flex-direction:column;
        align-items:center;justify-content:flex-end;height:100%">
        ${showLabels?`<span style="font-size:9.5px;font-family:var(--mono);color:var(--muted);margin-bottom:2px">${d.v}</span>`:""}
        <div style="width:100%;background:var(--accent);border-radius:2px 2px 0 0;height:${hgt}px"></div>
      </div>`;
    }).join("") +
    `</div><div class="hint" style="margin-bottom:16px">${esc(dataset[0].label)} → ${esc(dataset[dataset.length-1].label)}</div>`;
}
function sumRange(dataset, from, toExclusive){
  let s=0; for(let i=from;i<toExclusive;i++) s+=dataset[i].v; return s;
}
// Variación del período actual contra el anterior, con flecha y color — arriba de cada gráfico.
function trendBadge(curr, prev, periodLabel){
  if(prev===0 && curr===0) return `<div class="hint" style="margin-bottom:6px">Sin actividad en ninguno de los dos períodos.</div>`;
  if(prev===0) return `<div class="hint" style="margin-bottom:6px"><span style="color:var(--green);font-weight:700">↑ nuevo</span> — sin datos del ${esc(periodLabel)} para comparar.</div>`;
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

  let h = `<div class="stitle">Usuarios activos por día (últimos 30 días)</div>`;
  h += trendBadge(sumRange(activeSet,23,30), sumRange(activeSet,16,23), "7 días anteriores");
  h += barRow(activeSet);
  h += `<div class="stitle">Aperturas por día</div>`;
  h += trendBadge(sumRange(aperturasSet,23,30), sumRange(aperturasSet,16,23), "7 días anteriores");
  h += barRow(aperturasSet);
  h += `<div class="stitle">Syncs por día</div>`;
  h += trendBadge(sumRange(syncsSet,23,30), sumRange(syncsSet,16,23), "7 días anteriores");
  h += barRow(syncsSet);
  return h;
}

// Trunca a la hora en UTC — coincide con date_trunc('hour', now()) del lado del servidor
// (Supabase usa UTC), sin depender del huso horario del navegador.
function hourKey(d){ const h=new Date(d); h.setUTCMinutes(0,0,0); return h.toISOString(); }
function vActividadHora(){
  if(state.metricasHorariasError) return `<div class="saveerr">${esc(state.metricasHorariasError)}</div>`;
  if(!state.metricasHorariasLoaded) return `<div class="empty">Cargando métricas por hora…</div>`;

  const hourKeys=[]; for(let i=47;i>=0;i--) hourKeys.push(hourKey(new Date(Date.now()-i*3600000)));
  const byHour={}; hourKeys.forEach(k=>byHour[k]={users:new Set(),aperturas:0,syncs:0});
  (state.metricasHorarias||[]).forEach(m=>{
    const b=byHour[hourKey(m.hora)]; if(!b) return;
    b.users.add(m.user_id); b.aperturas+=(m.aperturas||0); b.syncs+=(m.syncs||0);
  });
  const activeSet = hourKeys.map(k=>({label:fmtDateTime(k), v:byHour[k].users.size}));
  const aperturasSet = hourKeys.map(k=>({label:fmtDateTime(k), v:byHour[k].aperturas}));
  const syncsSet = hourKeys.map(k=>({label:fmtDateTime(k), v:byHour[k].syncs}));

  let h = `<div class="stitle">Usuarios activos por hora (últimas 48 hs)</div>`;
  h += trendBadge(sumRange(activeSet,24,48), sumRange(activeSet,0,24), "24 hs anteriores");
  h += barRow(activeSet);
  h += `<div class="stitle">Aperturas por hora</div>`;
  h += trendBadge(sumRange(aperturasSet,24,48), sumRange(aperturasSet,0,24), "24 hs anteriores");
  h += barRow(aperturasSet);
  h += `<div class="stitle">Syncs por hora</div>`;
  h += trendBadge(sumRange(syncsSet,24,48), sumRange(syncsSet,0,24), "24 hs anteriores");
  h += barRow(syncsSet);
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
    else if(!state.actividadLoaded) h += `<div class="empty">Cargando métricas…</div>`;
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
  if(!state.recursosLoaded) return h + `<div class="empty">Cargando recursos…</div>`;
  const data = state.recursos;
  if(!data) return h + `<div class="empty">No se pudieron cargar los recursos.</div>`;

  const dbBytes = data.db_bytes||0;
  const pct = Math.min(100, dbBytes/SUPABASE_FREE_LIMIT_BYTES*100);
  const barColor = pct>=90 ? "var(--red)" : pct>=70 ? "var(--amber)" : "var(--green)";
  h += `<div class="stitle">Uso de base de datos</div>
  <div style="background:var(--soft);border-radius:99px;height:14px;overflow:hidden;margin-bottom:6px">
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

function vModal(){
  return `<div class="overlay"><div class="modal">
    <div class="ftitle" style="font-size:16px">Nuevo estudiante</div>
    ${state.newStudentError?`<div class="saveerr">${esc(state.newStudentError)}</div>`:""}
    <div class="frow">
      <div class="field"><div class="flabel">Nombre *</div><input id="n-name" autofocus></div>
      <div class="field"><div class="flabel">Carrera</div><select id="n-career">
        ${state.catalog.careers.map(c=>`<option>${esc(c)}</option>`).join("")}</select></div></div>
    <div class="frow">
      <div class="field"><div class="flabel">Materia</div><select id="n-subject">
        <optgroup label="Materias">
          ${state.catalog.subjects.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("")}
        </optgroup>
        ${(state.catalog.packs||[]).filter(p=>p.subjectIds.length>=2).length ? `<optgroup label="Packs">
          ${state.catalog.packs.filter(p=>p.subjectIds.length>=2).map(p=>`<option value="pack:${p.id}">${esc(p.name)}</option>`).join("")}
        </optgroup>` : ""}
        <option value="">Otra / sin materia por ahora</option></select></div>
      <div class="field"><div class="flabel">Fecha de examen (si ya la sabe)</div><input type="date" id="n-exam"></div></div>
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
function render(){
  if(state.recovery){
    document.getElementById("app").innerHTML = vSetPassword();
    const p=document.getElementById("newpass1"); if(p) p.focus();
    return;
  }
  if(!getSes()){
    if(state.pendingConfirmEmail){
      document.getElementById("app").innerHTML = vConfirmEmail();
      return;
    }
    document.getElementById("app").innerHTML = vAuth();
    const em=document.getElementById("auth-email"); if(em) em.focus();
    return;
  }
  if(state.view==="informe"){
    if(!sel()){ state.view="tablero"; }
    else{ document.getElementById("app").innerHTML = vInforme(); return; }
  }
  const activos = alive().filter(s=>s.status==="activo").length;
  const ses = getSes();
  const isAdmin = sesIsAdmin(ses);
  let h = "";
  if(IS_NATIVE && state.newVersionTag && !state.updateBannerDismissed){
    h += `<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;
      background:var(--bluebg);border:1px solid var(--blueline);border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:13px;color:var(--blue)">
      <span>Hay una versión nueva disponible (${esc(state.newVersionTag)}). <a href="${DOWNLOADS_URL}" target="_blank" rel="noopener" style="color:var(--blue);font-weight:600">Ir a descargas</a></span>
      <button data-a="dismiss-update-banner" title="Cerrar aviso" style="background:none;border:none;color:var(--blue);font-size:16px;line-height:1;padding:0 4px">×</button>
    </div>`;
  }
  h += `<div class="header"><div>
      <div class="eyebrow">Clases particulares</div>
      <h1>Cuaderno de seguimiento</h1></div>
    <div class="tabs">
      ${tabbtn("nav-tablero",state.view==="tablero","Tablero")}
      ${tabbtn("nav-lista",state.view==="lista"||state.view==="detalle",`Estudiantes <span class="n">${activos}</span>`)}
    </div></div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:-6px 0 14px">
    <span class="hint" id="syncStatus">${syncStatusText()}</span>
    <span style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="chip ${state.view==="catalog"?"on":""}" data-a="nav-catalog">Materias y carreras</button>
      <button class="chip ${state.view==="stats"?"on":""}" data-a="nav-stats">Estadísticas</button>
      <button class="chip ${state.view==="pagos"?"on":""}" data-a="nav-pagos">Pagos</button>
      <button class="chip ${state.view==="cuenta"?"on":""}" data-a="nav-cuenta">Cuenta</button>
      ${isAdmin?`<button class="chip ${state.view==="panel"?"on":""}" data-a="nav-panel">Panel</button>`:""}
    </span>
  </div>`;
  if(state.saveErr) h += `<div class="saveerr">No se pudo guardar el último cambio. Descargá una copia de respaldo por las dudas.</div>`;
  if(state.view==="tablero") h += vTablero();
  if(state.view==="lista") h += vLista();
  if(state.view==="detalle") h += vDetalle();
  if(state.view==="cuenta") h += vCuenta();
  if(state.view==="panel") h += isAdmin ? vPanel() : vTablero();
  if(state.view==="catalog") h += vCatalog();
  if(state.view==="stats") h += vEstadisticas();
  if(state.view==="pagos") h += vPagos();
  if(state.showNew) h += vModal();
  h += `<div class="footer">La app funciona siempre, con o sin internet. Con sincronización activa, los cambios se combinan solos entre tus dispositivos.</div>`;
  document.getElementById("app").innerHTML = h;
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
}
