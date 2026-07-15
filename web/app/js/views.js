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

/* ============ vistas ============ */
function vTablero(){
  const activos = alive().filter(s=>s.status==="activo");
  const alerts = activos.flatMap(s=>studentAlerts(s).map(t=>({s,t})));
  const upcoming = activos.filter(s=>s.examDate && daysTo(s.examDate)>=0)
                          .sort((a,b)=>a.examDate.localeCompare(b.examDate));
  const enRiesgo = new Set(alerts.map(a=>a.s.id)).size;
  let h = `<div class="stats">
    <div class="stat"><b>${activos.length}</b><span>activos</span></div>
    <div class="stat"><b>${upcoming.length}</b><span>con examen a la vista</span></div>
    <div class="stat ${enRiesgo?"warn":""}"><b>${enRiesgo}</b><span>con alertas</span></div>
    <button class="primary" data-a="new">+ Nuevo estudiante</button></div>`;

  h += `<div class="stitle">Alertas</div>`;
  h += alerts.length===0
    ? `<div class="empty">Sin alertas. Todo el mundo al día — buen momento para conseguir parciales viejos.</div>`
    : alerts.map(a=>`<button class="alert" data-a="open" data-id="${a.s.id}">
        <span class="dot"></span><b>${esc(a.s.name)}</b><span class="t">${esc(a.t)}</span></button>`).join("");

  h += `<div class="stitle">Próximos exámenes</div>`;
  h += upcoming.length===0
    ? `<div class="empty">Ningún activo tiene fecha de examen cargada. Cargarla es el paso uno del plan hacia atrás.</div>`
    : `<div class="examgrid">` + upcoming.map(s=>{
        const d=daysTo(s.examDate);
        const sim = s.simulacros.length ? `Simulacro: ${esc(s.simulacros[s.simulacros.length-1].grade||"hecho")}` : "Sin simulacro";
        return `<button class="examcard" data-a="open" data-id="${s.id}">
          <span class="count ${d<=7?"urgent":""}">${d===0?"HOY":d+" día"+(d===1?"":"s")}</span>
          <div style="font-weight:700;font-size:15px;margin:8px 0 2px;display:flex;align-items:center;gap:7px">${esc(s.name)} ${semDot(s.semaforo,11,false)}</div>
          <div style="font-size:12.5px;color:var(--muted)">${esc(s.subject||"Materia s/d")} · ${fmtDate(s.examDate)}</div>
          <div style="font-size:11.5px;font-family:var(--mono);margin-top:6px;color:${s.simulacros.length?"#1F6B44":"#A23A2A"}">${sim}</div>
        </button>`;}).join("") + `</div>`;

  if(alive().length===0)
    h += `<div class="empty" style="margin-top:24px;text-align:center;padding:32px">
      El cuaderno está vacío. Cargá tu primer estudiante con el botón de arriba: nombre, materia y fecha de examen alcanzan para arrancar.</div>`;

  h += `<div class="stitle">Respaldo</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <button class="chip" data-a="export">Descargar copia (.json)</button>
      <label class="chip" style="cursor:pointer">Restaurar desde archivo
        <input type="file" id="importFile" accept="application/json" style="display:none"></label>
      <span class="hint">Restaurar reemplaza todos los datos actuales por los del archivo.</span></div>`;
  return h;
}

function vLista(){
  const order=["activo","pausado","desaprobo","aprobo","dejo","todos"];
  const shown = alive()
    .filter(s=>state.filter==="todos"||s.status===state.filter)
    .sort((a,b)=>((a.examDate||"9999").localeCompare(b.examDate||"9999"))||a.name.localeCompare(b.name));
  let h = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px">` +
    order.map(f=>{
      const n = f==="todos" ? "" : ` <span style="opacity:.55">${alive().filter(s=>s.status===f).length}</span>`;
      return `<button class="chip ${state.filter===f?"on":""}" data-a="filter" data-f="${f}">${f==="todos"?"Todos":STATUS_META[f].label}${n}</button>`;
    }).join("") +
    `<span style="flex:1"></span><button class="primary" data-a="new">+ Nuevo</button></div>`;

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
    return `<button class="row" data-a="open" data-id="${s.id}">
      <div class="main"><div class="name">${esc(s.name)} ${semDot(s.semaforo,13,false)} ${pill(s.status)}
        ${na?`<span class="mini-alert">${na} alerta${na>1?"s":""}</span>`:""}</div>
      <div class="sub">${esc(s.career)} · ${esc(s.subject||"materia s/d")} · temas ${seen}/${rel}</div></div>
      <div class="right">${right}</div></button>`;
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
        <h2>${esc(s.name)}</h2>${semDot(s.semaforo,16,true)}${pill(s.status)}</div>
      <div class="semlabel">${esc(SEM_META[s.semaforo||"sd"].label)}${(s.semaforo||"sd")==="sd"?" — tocá el círculo para marcar cómo viene":""}</div>
      <div style="font-size:13px;color:var(--muted)">${esc(s.career)} · ${esc(s.subject||"materia s/d")}${s.chair?" · "+esc(s.chair):""} · desde ${fmtDate(s.startDate)}</div>
    </div>
    ${(s.examDate&&d!==null&&d>=0)?`<span class="count big ${d<=7?"urgent":""}">examen: ${d===0?"HOY":d+" día"+(d===1?"":"s")}</span>`:""}
  </div>`;
  h += alerts.map(t=>`<div class="alert" style="cursor:default"><span class="dot"></span><span class="t">${esc(t)}</span></div>`).join("");
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
          <b style="color:${st==="noentra"?"#B4B6BE":"var(--ink)"}">${esc(t)}</b>
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
    const sorted=[...s.sessions].sort((a,b)=>b.date.localeCompare(a.date));
    h += sorted.length===0 ? `<div class="empty">Todavía no hay clases registradas.</div>`
      : sorted.map(c=>`<div class="log"><div class="d">${fmtDate(c.date)}</div>
        <div class="body"><span style="font-weight:600">${esc(c.topic||"Clase")}</span>
        ${c.tarea&&c.tarea!=="sd"?`<span class="tareatag" style="color:${TAREA_META[c.tarea].fg}">tarea: ${TAREA_META[c.tarea].label}</span>`:""}
        ${c.note?`<div class="note">${esc(c.note)}</div>`:""}</div>
        <button class="del" data-a="del-session" data-id="${c.id}" title="Borrar">×</button></div>`).join("");
  }

  if(state.tab==="simulacros"){
    h += `<div class="formcard"><div class="ftitle">Registrar simulacro (parcial viejo, cronometrado)</div>
      <div class="frow">
        <div class="field"><div class="flabel">Fecha</div><input type="date" id="s-date" value="${today()}"></div>
        <div class="field"><div class="flabel">Nota</div><input id="s-grade" placeholder="Ej: 5.5 / 10"></div>
      </div>
      <div class="field"><div class="flabel">Diagnóstico: errores conceptuales / de cuenta / de tiempo</div>
        <input id="s-note" placeholder="Ej: 2 conceptuales en límites, 1 de cuenta, le faltó tiempo en el último"></div>
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
        <div class="field"><div class="flabel">Cátedra / universidad</div><input data-f="chair" value="${esc(s.chair)}"></div></div>
      <div class="frow">
        <div class="field"><div class="flabel">Estado</div><select data-f="status">
          ${Object.entries(STATUS_META).map(([k,m])=>opt(k,s.status,m.label)).join("")}</select></div>
        <div class="field"><div class="flabel">Fecha de examen / parcial</div><input type="date" data-f="examDate" value="${esc(s.examDate)}"></div>
        <div class="field"><div class="flabel">Empezó clases</div><input type="date" data-f="startDate" value="${esc(s.startDate)}"></div></div>
      <div class="field"><div class="flabel">Notas del alumno (diagnóstico inicial, agujeros de secundaria, cómo estudia)</div>
        <textarea data-f="notes">${esc(s.notes)}</textarea></div>
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--soft)">
        ${!state.confirmDel
          ? `<button class="danger" data-a="ask-del">Eliminar estudiante…</button>`
          : `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <span style="font-size:13px;color:var(--red)">Se borra todo su historial. ¿Seguro?</span>
              <button class="danger" data-a="confirm-del">Sí, eliminar</button>
              <button class="chip" data-a="cancel-del">Cancelar</button></div>`}
        <div class="hint" style="margin-top:8px">Consejo: si dejó o rindió, cambiá el estado en vez de borrarlo — si vuelve (pasa seguido), retomás con todo el historial.</div>
      </div></div>`;
  }
  return h;
}

function vAuth(){
  const mode = state.authMode||"login", isLogin = mode==="login";
  const remembered = getRememberedEmails();
  const emailVal = state.authEmail || remembered[0] || "";
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
        <input id="auth-email" type="email" autocomplete="username" list="remembered-emails" value="${esc(emailVal)}">
        <datalist id="remembered-emails">${remembered.map(e=>`<option value="${esc(e)}">`).join("")}</datalist>
      </div>
      <div class="field" style="margin-top:8px"><div class="flabel">Contraseña${isLogin?"":" (mínimo 6 caracteres)"}</div>
        <input id="auth-pass" type="password" autocomplete="${isLogin?"current-password":"new-password"}"></div>
      <button class="primary" style="margin:14px 0 0;margin-left:0;width:100%" data-a="${isLogin?"auth-login":"auth-signup"}">${isLogin?"Iniciar sesión":"Crear cuenta"}</button>
      ${isLogin?`<button class="chip" style="margin-top:10px;border:none;background:none;padding:2px 0;color:var(--muted)" data-a="auth-forgot">¿Olvidaste tu contraseña?</button>`:""}
      <div class="hint" id="authMsg" style="margin-top:10px;min-height:16px"></div>
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
        <input id="newpass1" type="password" autocomplete="new-password"></div>
      <div class="field" style="margin-top:8px"><div class="flabel">Repetila</div>
        <input id="newpass2" type="password" autocomplete="new-password"></div>
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
    const n = (b.data && Array.isArray(b.data.students)) ? b.data.students.filter(x=>!x.deleted).length : 0;
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
  ${c.subjects.map(m=>`<div class="log" style="padding:7px 12px;align-items:center">
    <div class="body"><b>${esc(m.name)}</b><div class="note">${m.units.length} unidad${m.units.length===1?"":"es"}</div></div>
    <button class="chip" data-a="cat-edit-subject" data-id="${m.id}">Editar</button>
    <button class="del" data-a="cat-del-subject" data-id="${m.id}" title="Eliminar materia">×</button></div>`).join("") || `<div class="empty">Sin materias cargadas.</div>`}
  <div class="frow" style="margin-top:8px;align-items:flex-end">
    <div class="field"><input id="new-subject" placeholder="Ej: Álgebra y Geometría Analítica"></div>
    <button class="chip" data-a="cat-add-subject" style="margin-bottom:2px">+ Agregar materia</button></div>
  <div class="hint" style="margin-top:6px">Al crear una materia se abre su editor para cargarle las unidades. Después, al dar de alta un alumno, la elegís de la lista y su grilla de temas se arma sola. Eliminar una materia no borra el avance de los alumnos que la usaban.</div></div>`;
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
// del propio conjunto. El título (tooltip) lleva la etiqueta y el valor exacto.
function barRow(dataset){
  const max=Math.max(1, ...dataset.map(d=>d.v));
  return `<div style="display:flex;align-items:flex-end;gap:3px;height:60px;margin-bottom:4px">` +
    dataset.map(d=>`<div title="${esc(d.label)}: ${d.v}" style="flex:1;min-width:2px;background:var(--ink);
      border-radius:2px 2px 0 0;height:${Math.max(2,Math.round(d.v/max*60))}px"></div>`).join("") +
    `</div><div class="hint" style="margin-bottom:16px">${esc(dataset[0].label)} → ${esc(dataset[dataset.length-1].label)}</div>`;
}

function vActividad(){
  let h = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button class="chip" data-a="refresh-actividad">Actualizar</button></div>`;
  if(state.actividadError) return h + `<div class="saveerr">${esc(state.actividadError)}</div>`;
  if(!state.actividadLoaded) return h + `<div class="empty">Cargando métricas…</div>`;

  const days=[]; for(let i=29;i>=0;i--) days.push(new Date(Date.now()-i*86400000).toISOString().slice(0,10));
  const byDay={}; days.forEach(d=>byDay[d]={users:new Set(),aperturas:0,syncs:0});
  (state.metricas||[]).forEach(m=>{
    const d=byDay[m.dia]; if(!d) return;
    d.users.add(m.user_id); d.aperturas+=(m.aperturas||0); d.syncs+=(m.syncs||0);
  });
  const activeSet = days.map(d=>({label:fmtDate(d), v:byDay[d].users.size}));
  const aperturasSet = days.map(d=>({label:fmtDate(d), v:byDay[d].aperturas}));
  const syncsSet = days.map(d=>({label:fmtDate(d), v:byDay[d].syncs}));

  h += `<div class="stitle">Usuarios activos por día (últimos 30 días)</div>` + barRow(activeSet);
  h += `<div class="stitle">Aperturas por día</div>` + barRow(aperturasSet);
  h += `<div class="stitle">Syncs por día</div>` + barRow(syncsSet);

  // Altas nuevas por semana: buckets de 7 días sobre perfiles.created_at (~35 días de ventana).
  const buckets=[0,0,0,0,0];
  (state.altas||[]).forEach(ts=>{
    if(!ts) return;
    const daysAgo=Math.floor((Date.now()-new Date(ts).getTime())/86400000);
    const idx=Math.floor(daysAgo/7);
    if(idx>=0 && idx<5) buckets[idx]++;
  });
  const labels=["Últimos 7 días","8–14 días","15–21 días","22–28 días","29–35 días"];
  const altasSet = buckets.map((v,i)=>({label:labels[i], v})).reverse();
  h += `<div class="stitle">Altas nuevas por semana</div>` + barRow(altasSet);

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
    <div class="frow">
      <div class="field"><div class="flabel">Nombre *</div><input id="n-name" autofocus></div>
      <div class="field"><div class="flabel">Carrera</div><select id="n-career">
        ${state.catalog.careers.map(c=>`<option>${esc(c)}</option>`).join("")}</select></div></div>
    <div class="frow">
      <div class="field"><div class="flabel">Materia</div><select id="n-subject">
        ${state.catalog.subjects.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join("")}
        <option value="">Otra / sin materia por ahora</option></select></div>
      <div class="field"><div class="flabel">Fecha de examen (si ya la sabe)</div><input type="date" id="n-exam"></div></div>
    <div class="field"><div class="flabel">Notas iniciales (de dónde arranca, qué le cuesta)</div><textarea id="n-notes"></textarea></div>
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
  const activos = alive().filter(s=>s.status==="activo").length;
  const ses = getSes();
  const isAdmin = sesIsAdmin(ses);
  let h = "";
  if(IS_NATIVE && state.newVersionTag && !state.updateBannerDismissed){
    h += `<div style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;
      background:var(--bluebg);border:1px solid #B9C6E8;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:13px;color:var(--blue)">
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
