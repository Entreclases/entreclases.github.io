"use strict";
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

// Modo vacaciones (paso 114): "Pausar" pasa s.status a "pausado" (con fecha de vuelta opcional
// en s.pausaHasta) — un alumno pausado ya queda afuera de la agenda, "para cobrar" y "salud del
// negocio" porque esas vistas sólo miran status==="activo" (ver agendaRangeEvents/
// cobrosAtrasadosSummary/vSaludDelMes); acá sólo se agrega la acción guiada y la lista aparte de
// Estudiantes. "Reanudar" lo devuelve intacto: nada de su historial se toca en ningún momento.
function vFichaPausa(s){
  if(s.status==="pausado"){
    return `<div class="hint" style="margin:8px 0;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span>En pausa${s.pausaHasta?` — vuelve el ${fmtDate(s.pausaHasta)}`:""}</span>
      <button class="chip" data-a="reanudar-alumno">Reanudar</button>
    </div>`;
  }
  if(s.status!=="activo") return "";
  if(state.pausaAskId===s.id){
    return `<div style="margin:8px 0;display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
      <div class="field" style="max-width:180px;margin:0"><div class="flabel">Vuelve el (opcional)</div><input type="date" id="pausa-hasta"></div>
      <button class="chip" data-a="pausar-alumno-confirm">Confirmar pausa</button>
      <button class="chip" data-a="pausar-alumno-cancel">Cancelar</button>
    </div>`;
  }
  return `<div style="margin:8px 0"><button class="chip" data-a="pausar-alumno-ask">Pausar</button></div>`;
}

function vDetalle(){
  const s = sel(); if(!s) return "";
  const d = daysTo(s.examDate);
  const alerts = studentAlerts(s);
  let h = `<button class="back" data-a="back">← Volver a la lista</button>
  <div class="dethead">
    ${avatarHtml(s.id, s.name, s.foto, 52, "flex-shrink:0")}
    <div style="flex:1;min-width:220px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h2>${esc(s.name)}</h2>${semDot(s.semaforo,16,true)}${pill(s.status)}${examplePill(s)}</div>
      <div class="semlabel">${esc(SEM_META[s.semaforo||"sd"].label)}${(s.semaforo||"sd")==="sd"?" — tocá el círculo para marcar cómo viene":""}</div>
      <div style="font-size:13px;color:var(--muted)">${esc(s.career)} · ${esc(s.subject||"materia s/d")}${s.chair?" · "+esc(s.chair):""} · desde ${fmtDate(s.startDate)}</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:6px">
        <button class="chip" data-a="share-open" data-kind="alumno" data-id="${esc(s.id)}">Compartir acceso</button>
        ${vLlaveBadge(s)}
      </div>
    </div>
    ${(s.examDate&&d!==null&&d>=0)?`<span class="count big ${d<=7?"urgent":""}">examen: ${d===0?"HOY":d+" día"+(d===1?"":"s")}</span>`:""}
  </div>`;
  h += vFichaPausa(s);
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
  if(state.fichaDraft && state.fichaDraft.id===s.id) h += vFichaDraftBar();
  return h;
}

// Barra fija de "cambios sin guardar" (paso 136): sólo por los campos de datos de Resumen/Pagos
// (ver FICHA_DRAFT_FIELDS en config.js) — las acciones de la ficha (registrar clase, cobrar,
// horarios, materiales...) siguen guardando al instante como siempre, nunca entran acá. Se queda
// visible al cambiar de pestaña dentro de la misma ficha (el borrador sigue siendo del mismo
// alumno) y desaparece al guardar, descartar, o salir de la ficha (ver back/ficha-draft-* y el
// guard de navegación del paso 124 en events.js).
function vFichaDraftBar(){
  const n = fichaDraftFieldCount();
  return `<div class="draftbar no-print">
    <span>Tenés cambios sin guardar — ${n} campo${n===1?"":"s"} tocado${n===1?"":"s"}</span>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="chip" data-a="ficha-draft-discard">Descartar</button>
      <button class="chip on" data-a="ficha-draft-save">Guardar cambios</button>
    </div>
  </div>`;
}


// Fila de tarjetas "de un vistazo" arriba de Resumen (reusa hoyCard, la misma tarjeta del panel
// "Hoy" del tablero) — próxima clase, deuda, racha de objetivos y avance de temas, cada una con
// acceso directo a su pestaña.
function vFichaResumenGlance(s){
  const next = nextClaseForStudent(s);
  const deuda = pendienteTotalFor(s);
  const streak = goalStreak(s);
  const units = unitsFor(s);
  const seen = units.filter(u=>["visto","practica","parcial"].includes((s.topics||{})[u.nombre])).length;
  const rel = units.filter(u=>(s.topics||{})[u.nombre]!=="noentra").length||1;
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
    ${(()=>{ const a=asistenciaStats(s, currentMonthKey()+"-01", today());
      return hoyCard("Asistencia (mes)", a.pct!==null?a.pct+"%":"—",
        a.total===0?`<div class="hint">sin clases este mes</div>`:`<div class="hint">${a.ausencias} ausencia${a.ausencias===1?"":"s"} de ${a.total}</div>`,
        {a:"tab-clases", label:"Ver clases"}); })()}
  </div>`;
}


// Adulto responsable (paso 234): opcional y colapsado por defecto (secundario/ingreso, donde paga
// la madre/padre y no el alumno) — abierto solo si ya hay algo cargado. El tilde
// "avisosPlataAdulto" redirige las plantillas de WhatsApp de cobro (ver pagoContactFor/waLinkCobro
// en helpers.js); el resto de los mensajes sigue yendo siempre al alumno. Nunca se expone en el
// portal (buildAlumnoBlock en sync.js no lee estos campos).
function vAdultoResponsableCard(s){
  const abierto = !!(s.adultoNombre||s.adultoTelefono||s.adultoEmail||s.adultoVinculo);
  return `<details class="formcard" ${abierto?"open":""} style="padding:0">
    <summary style="cursor:pointer;padding:14px 16px;font-weight:600">Adulto responsable (opcional)</summary>
    <div style="padding:0 16px 16px">
      <div class="hint" style="margin-bottom:10px">Para secundario o ingreso, cuando quien paga es la madre/padre y no el propio alumno.</div>
      ${s.contratoResponsable && !s.adultoNombre ? `<button class="chip" data-a="adulto-usar-contrato" style="margin-bottom:10px">Usar «${esc(s.contratoResponsable)}» del contrato</button>` : ""}
      <div class="frow">
        <div class="field"><div class="flabel">Nombre y apellido</div><input data-f="adultoNombre" placeholder="Ej: Marisa Fernández" value="${esc(s.adultoNombre||"")}"></div>
        <div class="field"><div class="flabel">Vínculo</div><input data-f="adultoVinculo" placeholder="Ej: madre, padre, tutor" value="${esc(s.adultoVinculo||"")}"></div>
      </div>
      <div class="frow">
        <div class="field"><div class="flabel">Teléfono (WhatsApp)</div><input data-f="adultoTelefono" placeholder="Ej: 11 2345-6789" value="${esc(s.adultoTelefono||"")}"></div>
        <div class="field"><div class="flabel">Mail (opcional)</div><input type="email" autocomplete="off" data-f="adultoEmail" placeholder="mail@ejemplo.com" value="${esc(s.adultoEmail||"")}"></div>
      </div>
      <button class="chip ${s.avisosPlataAdulto?"on":""}" data-a="toggle-avisos-plata-adulto">${s.avisosPlataAdulto?"✓ Los avisos de plata van al adulto responsable":"Los avisos de plata van al adulto responsable"}</button>
      ${s.avisosPlataAdulto && !hasAdultoPhone(s) ? `<div class="hint" style="margin-top:6px">Sin teléfono del adulto cargado todavía — los avisos de cobro le siguen llegando al alumno mientras tanto.</div>` : ""}
    </div>
  </details>`;
}

/* ============ ficha → Resumen: vistazo rápido, avance por unidades, datos de contacto,
   informe/contrato y borrar alumno — todo lo que no tiene pestaña propia ============ */
function vFichaResumen(s){
  s = draftFor(s); // paso 136: los campos de este tab reflejan el borrador sin guardar, si hay uno
  const opt=(v,cur,l)=>`<option value="${esc(v)}" ${v===cur?"selected":""}>${esc(l)}</option>`;
  let h = vFichaResumenGlance(s);
  const units=unitsFor(s);
  if(units.length===0){
    h += `<div class="empty">Este alumno no tiene una materia elegida. Elegila más abajo: la grilla de unidades se arma sola. Las materias y sus unidades se administran desde «Materias».</div>`;
  } else {
    h += `<div class="formcard"><div class="ftitle">Avance por unidades</div>
    <div class="hint" style="margin-bottom:10px">Tocá cada unidad para avanzar el estado: Pendiente → Visto → Práctica → Nivel parcial → No entra. «Nivel parcial» significa que resuelve solo ejercicios de nivel examen.</div>
    <div class="topicgrid">` + units.map(u=>{
      const st=(s.topics||{})[u.nombre]||"pendiente";
      const m=TOPIC_META[st];
      return `<button class="topic" data-a="cycle-topic" data-t="${esc(u.nombre)}"
        style="background:${m.bg};border-color:${m.bd}">
        <b style="color:${st==="noentra"?"var(--gray2)":"var(--ink)"}">${esc(u.nombre)}</b>
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
  h += `<div class="formcard"><div class="ftitle">Foto de perfil</div>${vAvatarEditor(avatarKeyForStudent(s.id), s.name, s.foto, 64)}</div>`;
  h += vVideollamadaMigracionCard(s);
  if(state.fichaError) h += `<div class="saveerr">${esc(state.fichaError)}</div>`;
  h += `<div class="formcard">
    <div class="frow">
      <div class="field"><div class="flabel">Nombre</div><input data-f="name" value="${esc(s.name)}"></div>
      <div class="field"><div class="flabel">Carrera</div>
        <div style="display:flex;gap:6px;align-items:center">
          <input data-f="career" list="careers-datalist" style="flex:1" placeholder="Elegí o escribí una carrera" value="${esc(s.career||"")}">
          <button class="chip" data-a="ficha-new-career" style="padding:6px 10px;font-size:12px" title="Crear una carrera nueva">+ nueva</button>
        </div>
        <datalist id="careers-datalist">${(state.catalog.careers||[]).map(c=>`<option value="${esc(c.nombre)}">`).join("")}</datalist>
      </div></div>
    <div class="frow">
      <div class="field"><div class="flabel">Materia</div><select data-f="subjectId">
        <option value="" ${!s.subjectId?"selected":""}>${s.subjectId?"—":esc(s.subject||"—")}</option>
        ${state.catalog.subjects.map(m=>`<option value="${m.id}" ${m.id===s.subjectId?"selected":""}>${esc(m.name)}</option>`).join("")}
      </select></div>
      <div class="field"><div class="flabel">Cátedra / universidad</div><input data-f="chair" value="${esc(s.chair)}"></div>
      <div class="field"><div class="flabel">Teléfono (WhatsApp)</div><input data-f="phone" placeholder="Ej: 11 2345-6789" value="${esc(s.phone||"")}"></div></div>
    <div class="hint" style="margin:-4px 0 8px">Cargalo sin el 0 del área ni el 15 — ej: código de área + número.</div>
    <div class="frow">
      <div class="field"><div class="flabel">Mail de contacto (opcional)</div><input type="email" autocomplete="off" data-f="email" placeholder="alumno@mail.com" value="${esc(s.email||"")}"></div>
      ${s.email?`<div class="field" style="max-width:180px;justify-content:flex-end;display:flex"><a class="chip" href="mailto:${esc(s.email)}" style="margin-bottom:2px">Escribir por mail</a></div>`:""}
    </div>
    ${s.email?`<div class="frow" style="margin:-4px 0 8px;align-items:center">
      <button class="chip ${s.recordatorioMail?"on":""}" data-a="toggle-recordatorio-mail">${s.recordatorioMail?"✓ Recordatorio por mail activo":"Recordarle las clases por mail"}</button>
      <span class="hint">Le llega un mail ${(getSes()&&getSes().recordatorioClasesHorasAntes)||14}hs antes de cada clase, con fecha, hora, materia y el link si hay.</span>
    </div>`:""}
    ${vAdultoResponsableCard(s)}
    <div class="frow">
      <div class="field"><div class="flabel">Estado</div><select data-f="status">
        ${Object.entries(STATUS_META).map(([k,m])=>opt(k,s.status,m.label)).join("")}</select></div>
      <div class="field"><div class="flabel">Fecha de examen / parcial</div><input type="date" data-f="examDate" value="${esc(s.examDate)}"></div>
      <div class="field"><div class="flabel">Empezó clases</div><input type="date" data-f="startDate" value="${esc(s.startDate)}"></div>
      <div class="field"><div class="flabel">Cumpleaños (opcional)</div><input type="date" data-f="birthDate" value="${esc(s.birthDate||"")}"></div></div>
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


/* ============ "Registrar clase" (paso 132): desplegable inicial con dos caminos — "Clase
   pasada" (registro completo, lo de siempre) o "Próxima clase" (sólo agendar: crea una entrada
   en s.clasesPuntuales, igual que antes hacía "Clases puntuales"/"Programar clase acá" en la
   agenda). state.registrarClaseTipo (null|"pasada"|"proxima") gobierna qué se muestra. ============ */
function vRegistrarClaseCard(s){
  const tipo = state.registrarClaseTipo;
  if(!tipo){
    return `<div class="formcard"><div class="ftitle">Registrar clase</div>
      <div class="hint" style="margin-bottom:10px">¿Ya la diste, o la estás agendando para más adelante?</div>
      <button class="next-class-cta" data-a="set-registrar-clase-tipo" data-f="proxima">
        <span class="next-class-cta-icon">${ICON_CALENDAR}</span>
        <span class="next-class-cta-text"><b>Próxima clase</b><span class="hint">Agendala y queda lista en la agenda</span></span>
      </button>
      <div style="margin-top:8px">
        <button class="btn btn-ghost" data-a="set-registrar-clase-tipo" data-f="pasada">Clase pasada</button>
      </div>
      <div style="margin-top:8px">
        ${alive().some(x=>x.status==="activo" && x.id!==s.id && s.subjectId && x.subjectId===s.subjectId)
          ? `<button class="chip" data-a="grupal-form-open-ficha">+ Es una clase grupal</button>`
          : `<span class="hint">Para una clase grupal hace falta otro alumno activo en la misma materia.</span>`}
      </div></div>`;
  }
  if(tipo==="proxima") return vProximaClaseForm(s);
  return vClasePasadaForm(s);
}

// Ocurrencias agendadas ya terminadas y sin registrar para precargar el form (paso 196) — vacío
// si el docente eligió "registrar otra clase" (state.sessionManualEntry, flujo manual de siempre).
// La seleccionada es la de state.sessionPrefillOcurrenciaDate si matchea alguna, si no la más
// reciente (última del array, que viene ordenado ascendente) — así entrar por agenda-log/"Registrar"
// (que ya vienen con una fecha puntual) cae directo en esa, y entrar genérico (FAB, pestaña Clases)
// cae en la más reciente sin tener que elegir.
function ocurrenciasPendientesForm(s){
  if(state.sessionManualEntry) return {list:[], sel:null};
  const list = clasesSinRegistrarFor(s);
  if(!list.length) return {list, sel:null};
  const sel = list.find(c=>c.date===state.sessionPrefillOcurrenciaDate) || list[list.length-1];
  return {list, sel};
}
function vClasePasadaForm(s){
  const estado = state.sessionEstado||"dada";
  const motivo = state.sessionAusenteMotivo||"aviso_tiempo";
  const cobraSugerida = state.sessionAusenteCobra!=null ? state.sessionAusenteCobra : ausenciaCobraSugerida(motivo);
  const packActivo = estado==="dada" ? packClasesActivo(s) : null;
  const {list:pendientes, sel:ocurrencia} = ocurrenciasPendientesForm(s);
  const fechaDefault = (ocurrencia&&ocurrencia.date) || state.sessionPrefillDate || today();
  const topicDefault = (ocurrencia&&ocurrencia.topic) || "";
  const duracionDefault = (ocurrencia&&ocurrencia.duration) || 60;
  return `<div class="formcard"><div class="ftitle">Clase pasada (30 segundos, apenas termina)</div>
    ${pendientes.length>1 ? `<div class="field" style="margin-bottom:8px"><div class="flabel">¿Cuál clase?</div>
      <select data-cf="select-clase-pendiente">
        ${pendientes.map(c=>`<option value="${esc(c.date)}" ${c.date===ocurrencia.date?"selected":""}>${fmtDate(c.date)} ${esc(c.time)} (${c.duration} min)</option>`).join("")}
      </select></div>` : ""}
    ${pendientes.length ? `<div class="hint" style="margin-bottom:8px">Precargada de tu agenda — ${pendientes.length>1?"elegí otra arriba o ":""}<b style="cursor:pointer;text-decoration:underline" data-a="registrar-clase-manual">registrá otra clase</b> en su lugar.</div>`
      : (state.sessionManualEntry && clasesSinRegistrarFor(s).length ? `<div class="hint" style="margin-bottom:8px"><b style="cursor:pointer;text-decoration:underline" data-a="registrar-clase-agendada">Volver a la clase agendada</b></div>` : "")}
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="chip ${estado==="dada"?"on":""}" data-a="set-session-estado" data-f="dada">Dada</button>
      <button class="chip ${estado==="ausente"?"on":""}" data-a="set-session-estado" data-f="ausente">Ausente</button>
    </div>
    ${packActivo?`<div class="hint" style="margin-bottom:8px">Pack activo: quedan <b>${packActivo.restantes} de ${packActivo.total}</b> clases — al guardar se descuenta una sola, no hace falta cobrar esta clase aparte.</div>`:""}
    <div class="frow">
      <div class="field"><div class="flabel">Fecha</div><input type="date" id="c-date" max="${today()}" value="${esc(fechaDefault)}" data-enter="save-session"></div>
      ${estado==="dada" ? `
      <div class="field"><div class="flabel">Tema principal</div><select id="c-topic" data-enter="save-session">${topicOptionsHtml(s,topicDefault)}</select></div>
      <div class="field"><div class="flabel">¿Trajo la tarea?</div><select id="c-tarea" data-enter="save-session">
        <option value="sd">—</option><option value="hecha">Hecha</option>
        <option value="intentada">Intentada</option><option value="no">No hecha</option></select></div>
      <div class="field" style="max-width:150px"><div class="flabel">Duración</div>
        ${durationFieldHtml(duracionDefault, {id:"c-duration", dataEnter:"save-session"})}</div>
      ${s.modalidad==="hora" ? `<div class="field" style="max-width:150px"><div class="flabel">Monto (opcional)</div>
        <input type="number" min="0" id="c-monto" placeholder="Auto: tarifa × horas" data-enter="save-session"></div>` : ""}` : `
      <div class="field"><div class="flabel">Motivo</div><select data-cf="session-ausente-motivo">
        ${Object.entries(AUSENCIA_MOTIVO_META).map(([k,m])=>`<option value="${k}" ${motivo===k?"selected":""}>${esc(m.label)}</option>`).join("")}
      </select></div>
      <div class="field"><div class="flabel">¿Se cobra?</div>
        <div style="display:flex;gap:8px">
          <button class="chip ${!cobraSugerida?"on":""}" data-a="set-session-ausente-cobra" data-f="no">No</button>
          <button class="chip ${cobraSugerida?"on":""}" data-a="set-session-ausente-cobra" data-f="si">Sí</button>
        </div>
      </div>`}
    </div>
    <div class="field"><div class="flabel">${estado==="dada"?"Nota rápida (qué costó, tarea que dejaste)":"Nota (opcional)"}</div>
      <input id="c-note" placeholder="${estado==="dada"?"Ej: se traba en cadena+cociente. Tarea: guía 5, ej. 8-12":"Ej: avisó por WhatsApp a la mañana"}" data-enter="save-session"></div>
    ${estado==="dada" ? `<div class="field"><div class="flabel">Objetivo de hoy (opcional)</div>
      <input id="c-goal" placeholder="Ej: que resuelva sola sistemas 2x2" data-enter="save-session"></div>` : ""}
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="primary" style="margin-left:0" data-a="save-session">Guardar</button>
      <button class="chip" data-a="registrar-clase-back">‹ Volver</button>
    </div></div>`;
}

function vProximaClaseForm(s){
  return `<div class="formcard"><div class="ftitle">Próxima clase</div>
    <div class="hint" style="margin-bottom:8px">Sólo la agendás — queda en la agenda y, cuando pase la fecha, aparece para registrarla como clase dada.</div>
    <div class="frow">
      <div class="field"><div class="flabel">Fecha</div><input type="date" id="pc-date" min="${today()}" value="${today()}" data-enter="save-proxima-clase"></div>
      <div class="field"><div class="flabel">Hora</div><input type="time" id="pc-time" value="18:00" data-enter="save-proxima-clase"></div>
      <div class="field" style="max-width:150px"><div class="flabel">Duración</div>${durationFieldHtml(60, {id:"pc-duration", dataEnter:"save-proxima-clase"})}</div>
    </div>
    <div class="frow">
      <div class="field"><div class="flabel">Tema previsto (opcional)</div><select id="pc-topic" data-enter="save-proxima-clase">${topicOptionsHtml(s,"")}</select></div>
      <div class="field"><div class="flabel">Link de videollamada (opcional, si es distinto del de arriba)</div><input id="pc-link" placeholder="https://…" data-enter="save-proxima-clase"></div>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="primary" style="margin-left:0" data-a="save-proxima-clase">Agendar</button>
      <button class="chip" data-a="registrar-clase-back">‹ Volver</button>
    </div></div>`;
}


/* ============ formulario de clase grupal (paso 157) ============
   Un único formulario, gobernado por state.grupalForm, reusado desde tres entradas: "+ Es una
   clase grupal" en la ficha (arranca con ese alumno ya puesto, f.pinnedId), "+ Clase grupal" en
   Agenda (arranca vacío, primero pide materia) y "Registrar esta clase" sobre una ocurrencia
   grupal ya agendada (f.origin, salta directo a la asistencia). Shape de state.grupalForm:
   {subjectId, studentIds, pinnedId, tipo:"pasada"|"proxima"|null, date, time, duration, topic,
   link, note, recurrente, nombre, asistencias:{studentId:{ausente,tarea,monto}}, origin:null|
   {grupoId,kind,date,time,duration,topic,link}}. */
function vGrupalForm(){
  const f = state.grupalForm; if(!f) return "";
  return `<div class="overlay" data-a="grupal-form-noop-close">
    <div class="modal" data-a="grupal-form-noop" style="max-width:460px">${vGrupalFormBody(f)}</div>
  </div>`;
}

function vGrupalFormBody(f){
  let h = `<div class="ftitle" style="font-size:16px">Clase grupal</div>`;
  if(!f.subjectId){
    const subjects = state.catalog.subjects.filter(m=>alive().filter(x=>x.status==="activo").some(x=>x.subjectId===m.id));
    h += `<div class="hint" style="margin-bottom:8px">Elegí la materia — se listan sus alumnos activos para armar el grupo.</div>`;
    h += subjects.length===0 ? `<div class="hint">No hay materias con alumnos activos.</div>`
      : `<div style="display:flex;gap:6px;flex-wrap:wrap">${subjects.map(m=>`<button class="chip" data-a="grupal-form-set-subject" data-id="${m.id}">${esc(m.name)}</button>`).join("")}</div>`;
    return h + `<div style="margin-top:10px"><button class="chip" data-a="grupal-form-cancel">Cancelar</button></div>`;
  }
  const materia = subjById(f.subjectId);
  if(!f.origin){
    const candidatos = alive().filter(x=>x.status==="activo" && x.subjectId===f.subjectId);
    h += `<div class="hint" style="margin-bottom:6px">Alumnos de ${esc(materia?materia.name:"")} — tildá quiénes van:</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      ${candidatos.map(x=>`<button class="chip ${f.studentIds.includes(x.id)?"on":""}" ${f.pinnedId===x.id?"disabled":""} data-a="grupal-form-toggle-alumno" data-id="${x.id}">${esc(x.name)}</button>`).join("")}
    </div>`;
    if(candidatos.length<2) h += `<div class="hint" style="margin-bottom:8px">Hace falta al menos otro alumno activo en esta materia.</div>`;
    if(gruposClaseFor(f.subjectId).length>0){
      h += `<div class="hint" style="margin-bottom:6px">O elegí un grupo ya armado:</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        ${gruposClaseFor(f.subjectId).map(g=>`<button class="chip" data-a="grupal-form-usar-grupo" data-id="${g.id}">${esc(g.nombre)} (${g.studentIds.length})</button>`).join("")}
      </div>`;
    }
  } else {
    h += `<div class="hint" style="margin-bottom:6px">${esc(materia?materia.name:"")} · ${f.studentIds.map(id=>(state.students.find(x=>x.id===id)||{}).name).join(", ")}</div>`;
  }
  if(f.studentIds.length<2){
    return h + `<div style="margin-top:6px"><button class="chip" data-a="grupal-form-cancel">Cancelar</button></div>`;
  }
  if(!f.origin && !f.tipo){
    h += `<div class="hint" style="margin:6px 0 8px">¿Ya la dieron, o la están agendando para más adelante?</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-primary" data-a="grupal-form-set-tipo" data-f="pasada">Clase pasada</button>
      <button class="btn btn-ghost" data-a="grupal-form-set-tipo" data-f="proxima">Próxima clase</button>
    </div>
    <div style="margin-top:8px"><button class="chip" data-a="grupal-form-back">‹ Volver</button></div>`;
    return h;
  }
  const tipo = f.origin ? "pasada" : f.tipo;
  if(tipo==="proxima"){
    h += `<div class="frow" style="margin-top:8px">
      <div class="field"><div class="flabel">Fecha</div><input type="date" min="${today()}" value="${esc(f.date||today())}" data-cf="grupal-form-date"></div>
      <div class="field"><div class="flabel">Hora</div><input type="time" value="${esc(f.time||"18:00")}" data-cf="grupal-form-time"></div>
      <div class="field" style="max-width:150px"><div class="flabel">Duración</div>${durationFieldHtml(f.duration||60, {dataCf:"grupal-form-duration"})}</div>
    </div>
    <div class="frow">
      <div class="field"><div class="flabel">Tema previsto (opcional)</div><input value="${esc(f.topic||"")}" data-cf="grupal-form-topic"></div>
      <div class="field"><div class="flabel">Link de videollamada (opcional)</div><input value="${esc(f.link||"")}" data-cf="grupal-form-link"></div>
    </div>
    <label style="display:flex;gap:8px;align-items:center;margin-top:8px;font-size:13.5px">
      <input type="checkbox" ${f.recurrente?"checked":""} data-cf="grupal-form-recurrente"> Repetir cada semana (crea un grupo permanente, gestionable desde Cuenta → Grupos de clase)
    </label>
    ${f.recurrente?`<div class="field" style="margin-top:6px"><div class="flabel">Nombre del grupo</div><input placeholder="Ej: Álgebra — Lunes 18hs" value="${esc(f.nombre||"")}" data-cf="grupal-form-nombre"></div>`:""}
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="primary" style="margin-left:0" data-a="grupal-form-save-proxima">Agendar</button>
      <button class="chip" data-a="grupal-form-back">‹ Volver</button>
    </div>`;
  }else{
    h += `<div class="frow" style="margin-top:8px">
      <div class="field"><div class="flabel">Fecha</div><input type="date" max="${today()}" value="${esc(f.date||today())}" data-cf="grupal-form-date"></div>
      <div class="field"><div class="flabel">Tema principal</div><input value="${esc(f.topic||"")}" placeholder="Común a todo el grupo" data-cf="grupal-form-topic"></div>
      <div class="field" style="max-width:150px"><div class="flabel">Duración</div>${durationFieldHtml(f.duration||60, {dataCf:"grupal-form-duration"})}</div>
    </div>
    <div class="field"><div class="flabel">Nota rápida (opcional, común al grupo)</div><input value="${esc(f.note||"")}" data-cf="grupal-form-note"></div>
    <div style="margin-top:10px">${f.studentIds.map(id=>vGrupalAsistenciaRow(id,f)).join("")}</div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="primary" style="margin-left:0" data-a="grupal-form-save-pasada">Guardar</button>
      ${!f.origin?`<button class="chip" data-a="grupal-form-back">‹ Volver</button>`:`<button class="chip" data-a="grupal-form-cancel">Cancelar</button>`}
    </div>`;
  }
  return h;
}

function vGrupalAsistenciaRow(studentId, f){
  const s = state.students.find(x=>x.id===studentId); if(!s) return "";
  const a = (f.asistencias&&f.asistencias[studentId]) || {};
  const ausente = !!a.ausente;
  return `<div class="log" style="align-items:center;flex-wrap:wrap">
    <div class="body"><b>${esc(s.name)}</b></div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <button class="chip ${!ausente?"on":""}" data-a="grupal-asistencia-presente" data-id="${studentId}">Vino</button>
      <button class="chip ${ausente?"on":""}" data-a="grupal-asistencia-ausente" data-id="${studentId}">Ausente</button>
      ${!ausente ? `<select data-cf="grupal-asistencia-tarea" data-id="${studentId}">
          <option value="sd" ${(!a.tarea||a.tarea==="sd")?"selected":""}>Tarea: —</option>
          <option value="hecha" ${a.tarea==="hecha"?"selected":""}>Tarea: hecha</option>
          <option value="intentada" ${a.tarea==="intentada"?"selected":""}>Tarea: intentada</option>
          <option value="no" ${a.tarea==="no"?"selected":""}>Tarea: no hecha</option>
        </select>` : ""}
      ${!ausente && s.modalidad==="hora" ? `<input type="number" min="0" style="max-width:110px" data-cf="grupal-asistencia-monto" data-id="${studentId}" placeholder="Monto (auto)" value="${a.monto!=null?a.monto:""}">` : ""}
    </div>
    ${ausente ? `<div class="frow" style="margin-top:6px;flex-basis:100%">
        <div class="field"><div class="flabel">Motivo</div><select data-cf="grupal-asistencia-motivo" data-id="${studentId}">
          ${Object.entries(AUSENCIA_MOTIVO_META).map(([k,m])=>`<option value="${k}" ${(a.ausente&&a.ausente.motivo)===k?"selected":""}>${esc(m.label)}</option>`).join("")}
        </select></div>
        <div class="field"><div class="flabel">¿Se cobra?</div><div style="display:flex;gap:8px">
          <button class="chip ${!(a.ausente&&a.ausente.cobra)?"on":""}" data-a="grupal-asistencia-cobra" data-id="${studentId}" data-f="no">No</button>
          <button class="chip ${(a.ausente&&a.ausente.cobra)?"on":""}" data-a="grupal-asistencia-cobra" data-id="${studentId}" data-f="si">Sí</button>
        </div></div>
      </div>` : ""}
  </div>`;
}


/* ============ ficha → Clases: registrar/revisar clases dictadas, horarios habituales, clases
   puntuales y simulacros — todo lo que es "actividad" con el alumno ============ */
function vFichaClases(s){
  let h = vRegistrarClaseCard(s);
  const cobraPorClase = hasPagos(s) && (s.modalidad==="clase"||s.modalidad==="hora");
  const sorted=[...s.sessions].sort((a,b)=>b.date.localeCompare(a.date));
  h += sorted.length===0 ? `<div class="empty">Todavía no hay clases registradas.</div>`
    : sorted.map(c=>{
        if(isAusente(c)){
          const m = AUSENCIA_MOTIVO_META[c.ausente.motivo] || AUSENCIA_MOTIVO_META.aviso_tiempo;
          return `<div class="log"><div class="d">${fmtDate(c.date)}</div>
            <div class="body"><span class="badge badge-red">Ausente</span>
            <span class="tareatag">${esc(m.label)}</span>
            <span class="tareatag">${c.ausente.cobra?"se cobra":"no se cobra"}</span>
            ${c.grupoClaseId?`<span class="tareatag" title="${esc((c.grupoClaseMiembros||[]).map(x=>x.name).join(", "))}">Clase grupal (${(c.grupoClaseMiembros||[]).length})</span>`:""}
            ${c.note?`<div class="note">${esc(c.note)}</div>`:""}</div>
            <button class="del" data-a="del-session" data-id="${c.id}" title="Borrar" aria-label="Borrar">×</button></div>`;
        }
        const editandoTema = state.editSessionTopicId===c.id;
        return `<div class="log"><div class="d">${fmtDate(c.date)}</div>
      <div class="body">${editandoTema
        ? `<span style="display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap">
             <select id="session-topic-input" data-enter="session-topic-rename-done">${topicOptionsHtml(s,c.topic)}</select>
             <button class="chip" data-a="session-topic-rename-done" data-id="${c.id}">Guardar</button>
             <button class="chip" data-a="session-topic-rename-cancel">Cancelar</button>
           </span>`
        : `<span style="font-weight:600">${esc(c.topic||"Clase")}</span>
           <button class="iconbtn" data-a="session-topic-rename-start" data-id="${c.id}" title="Editar tema" aria-label="Editar tema">${ICON_EDIT}</button>`}
      <span class="tareatag">${c.duration!=null&&c.duration!==""?Math.round(c.duration)+" min":"60 min (asumido)"}</span>
      ${c.tarea&&c.tarea!=="sd"?`<span class="tareatag" style="color:${TAREA_META[c.tarea].fg}">tarea: ${TAREA_META[c.tarea].label}</span>`:""}
      ${c.grupoClaseId?`<span class="tareatag" title="${esc((c.grupoClaseMiembros||[]).map(x=>x.name).join(", "))}">Clase grupal (${(c.grupoClaseMiembros||[]).length})</span>`:""}
      ${c.note?`<div class="note">${esc(c.note)}</div>`:""}
      ${c.objetivo?`<div class="note goaltag"><span class="icon-inline">${ICON_TARGET}</span> ${esc(c.objetivo)}${c.objetivoResult
        ? ` <span style="color:${OBJETIVO_META[c.objetivoResult.estado].fg}">· <span class="icon-inline">${OBJETIVO_ICONS[c.objetivoResult.estado]}</span> ${OBJETIVO_META[c.objetivoResult.estado].label}${c.objetivoResult.pct!=null?` (${c.objetivoResult.pct}%)`:""}</span>`
        : ` <span class="hint">· sin evaluar todavía</span>`}</div>` : ""}</div>
      ${cobraPorClase?`<button class="chip" data-a="tab-pagos" title="Ver el cobro en Pagos"
          style="${c.packClaseId?"":c.cobrada?"color:var(--status-activo-fg);border-color:var(--status-activo-fg)":"color:var(--status-desaprobo-fg);border-color:var(--status-desaprobo-fg)"}">${c.packClaseId?"Pack":c.cobrada?"Cobrada":"Pendiente"}</button>`:""}
      <button class="del" data-a="del-session" data-id="${c.id}" title="Borrar" aria-label="Borrar">×</button></div>`;
      }).join("");
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

  h += `<div class="stitle" style="margin-top:20px">Historial de exámenes</div>`;
  const sortedExams=[...(s.examResults||[])].sort((a,b)=>b.date.localeCompare(a.date));
  h += sortedExams.length===0 ? `<div class="empty">Sin resultados de examen cargados todavía.</div>`
    : sortedExams.map(r=>{
        const m = EXAM_RESULT_META[r.result] || EXAM_RESULT_META.norindio;
        return `<div class="log"><div class="d">${fmtDate(r.date)}</div>
      <div class="body"><span style="font-weight:700;color:${m.fg}">${esc(m.label)}</span>
      ${r.grade?` <span style="font-family:var(--mono)">· ${esc(r.grade)}</span>`:""}</div>
      <button class="del" data-a="del-examresult" data-id="${r.id}" title="Borrar" aria-label="Borrar">×</button></div>`;
      }).join("");
  return h;
}


/* ============ ficha → Pagos: tarifa/modalidad, pagos mensuales y seña ============ */
function vFichaPagos(s){
  s = draftFor(s); // paso 136: tarifa/modalidad (y seniaTipo/Valor vía vSeniaCard) reflejan el borrador
  let h = `<div class="formcard">
    <div class="frow">
      <div class="field"><div class="flabel">Tarifa (pesos)${s.modalidad==="hora"?" por hora":""}</div><input type="number" min="0" data-f="tarifa" placeholder="Sin cargar = sin cobro" value="${esc(s.tarifa||"")}"></div>
      <div class="field"><div class="flabel">Modalidad de cobro</div><select data-f="modalidad">
        <option value="" ${!s.modalidad?"selected":""}>—</option>
        <option value="clase" ${s.modalidad==="clase"?"selected":""}>Por clase</option>
        <option value="hora" ${s.modalidad==="hora"?"selected":""}>Por hora</option>
        <option value="mensual" ${s.modalidad==="mensual"?"selected":""}>Mensual</option></select></div></div>
    ${hasPagos(s)&&s.modalidad==="clase"?`<div class="hint" style="margin-top:2px">Marcá cada clase como cobrada desde la pestaña «Clases».</div>`:""}
    ${hasPagos(s)&&s.modalidad==="hora"?`<div class="hint" style="margin-top:2px">Cada clase se cobra tarifa × horas dictadas (redondeado) y se marca como cobrada desde la pestaña «Clases» — si alguna clase vale distinto, cargale un monto manual ahí mismo al registrarla.</div>`:""}
    ${hasPagos(s)&&(s.modalidad==="clase"||s.modalidad==="hora")?vPackClasesCard(s):""}
    ${hasPagos(s)&&s.modalidad==="mensual"?vPagosMensuales(s):""}
    ${!hasPagos(s)?`<div class="hint" style="margin-top:8px">Cargá una tarifa y elegí una modalidad para empezar a llevar el cobro de este alumno.</div>`:""}
  </div>`;
  h += vClasesPagosCard(s);
  h += vClasesSinRegistrarCard(s);
  h += vSeniaCard(s);
  h += vRecibosCard(s);
  h += vTarifaHistorialCard(s);
  return h;
}

// Cobro por clase (paso 197): antes vivía en la pestaña «Clases», duplicado a medias con acá —
// ahora el monto y el toggle cobrada/pendiente viven sólo acá; «Clases» deja sólo un indicador
// chico que linkea a esta pestaña (ver vFichaClases).
function vClasesPagosCard(s){
  if(!hasPagos(s) || (s.modalidad!=="clase" && s.modalidad!=="hora")) return "";
  const sorted=[...s.sessions].filter(c=>!isAusente(c)).sort((a,b)=>b.date.localeCompare(a.date));
  if(!sorted.length) return "";
  return `<div class="formcard"><div class="ftitle">Cobro por clase</div>
    ${sorted.map(c=>`<div class="log">
      <div class="d">${fmtDate(c.date)}</div>
      <div class="body">${esc(c.topic||"Clase")} · ${c.packClaseId ? `<span class="tareatag">Pack de clases</span>` : fmtMoney(montoSesion(s,c))+(c.monto!=null&&c.monto!==""?" (manual)":"")}</div>
      ${c.packClaseId ? "" : `<button class="chip ${c.cobrada?"on":""}" data-a="toggle-cobrada" data-id="${c.id}">${c.cobrada?"Cobrada":"Pendiente"}</button>`}
    </div>`).join("")}
  </div>`;
}

// "Sin registrar" (paso 196): clases agendadas ya terminadas todavía sin registrar — deuda
// ESTIMADA a la tarifa vigente (clasesEstimadasFor en helpers.js), claramente separada de la deuda
// firme de arriba (clases ya registradas sin cobrar). Desaparece sola al registrar la clase.
function vClasesSinRegistrarCard(s){
  const list = clasesEstimadasFor(s);
  if(!list.length) return "";
  return `<div class="formcard"><div class="ftitle">Sin registrar</div>
    <div class="hint" style="margin-bottom:8px">Ya terminaron pero todavía no las registraste — estimadas a tu tarifa vigente, no son deuda firme hasta que las registres.</div>
    ${list.map(c=>`<div class="log">
      <div class="d">${fmtDate(c.date)} ${esc(c.time)}</div>
      <div class="body">${fmtMoney(c.monto)} <span class="hint">a confirmar</span></div>
      <button class="chip" data-a="agenda-log" data-id="${s.id}" data-date="${c.date}">Registrar</button>
    </div>`).join("")}
  </div>`;
}

// Pack de clases prepago (paso 158) — sólo para modalidad "clase"/"hora" (nunca "mensual", ver el
// gate en vFichaPagos). Vender uno registra un pago normal (mismo recibo/WhatsApp de siempre, ver
// save-pack-clases en events.js) y cada clase que se registre después con este pack activo le
// descuenta una sola (aplicarDescuentoPack en helpers.js) — el contador de acá y el de "Registrar
// clase" (vClasePasadaForm) leen el mismo packClasesActivo().
function vPackClasesCard(s){
  const activo = packClasesActivo(s);
  const hist = [...(s.packsClases||[])].sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const catalogo = packsCatalogoFor();
  const catalogId = state.packClasesCatalogId||"";
  const catalogPack = catalogo.find(p=>p.id===catalogId);
  const cant = catalogPack ? catalogPack.cantidad : (state.packClasesCant || 8);
  let h = `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--soft)">
    <div class="flabel" style="margin-bottom:6px">Pack de clases prepago</div>`;
  if(activo){
    const agotandose = activo.restantes<=2;
    h += `<div class="chip" style="margin-bottom:10px;${agotandose?"color:var(--status-desaprobo-fg);border-color:var(--status-desaprobo-fg)":"color:var(--status-activo-fg);border-color:var(--status-activo-fg)"}">Quedan ${activo.restantes} de ${activo.total} clases</div>`;
  }
  h += `<div class="hint" style="margin-bottom:8px">${activo?"¿Le vendés otro para cuando termine éste?":"Vendé un pack de varias clases prepago — cada clase que registres después se lo va descontando sola, sin marcarla cobrada aparte."}</div>`;
  if(catalogo.length){
    h += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
      <button class="chip ${!catalogId?"on":""}" data-a="pack-clases-elegir-personalizado">Personalizado</button>
      ${catalogo.map(p=>`<button class="chip ${catalogId===p.id?"on":""}" data-a="pack-clases-elegir-catalogo" data-id="${p.id}">${esc(p.nombre)}</button>`).join("")}
    </div>`;
  }
  h += `<div class="frow" style="align-items:flex-end">
      <div class="field" style="max-width:110px"><div class="flabel">Cantidad</div><input type="number" min="1" data-cf="pack-clases-cant" value="${cant}" ${catalogPack?"disabled":""}></div>
      <div class="field"><div class="flabel">Precio total</div><input type="number" min="0" id="pack-clases-precio" placeholder="Sugerido: ${fmtMoney(packClasesPrecioSugerido(s,cant))}" value="${catalogPack?esc(catalogPack.precio):""}" data-enter="save-pack-clases"></div>
      <div class="field" style="max-width:160px"><div class="flabel">Fecha</div><input type="date" id="pack-clases-fecha" value="${today()}" data-enter="save-pack-clases"></div>
      <button class="chip" data-a="save-pack-clases" style="margin-bottom:2px">Vender pack</button></div>`;
  if(hist.length){
    h += `<div style="margin-top:8px">` + hist.map(p=>`<div class="log" style="margin-top:6px"><div class="d">${fmtDate(p.fecha)}</div>
      <div class="body">${p.total} clases · ${fmtMoney(p.precio)}${p.restantes>0?` · quedan ${p.restantes}`:" · usado por completo"}</div></div>`).join("") + `</div>`;
  }
  h += `</div>`;
  return h;
}

// Historial de cambios de tarifa (paso 112) — sólo lo llena el ajuste en lote de Pagos →
// "Ajustar tarifas" (ver applyTarifaAjuste en helpers.js); un cambio manual del campo Tarifa de
// arriba no queda registrado acá, a propósito (evita ruido por correcciones sueltas).
function vTarifaHistorialCard(s){
  const hist = [...(s.tarifaHistorial||[])].sort((a,b)=>b.fecha.localeCompare(a.fecha));
  if(hist.length===0) return "";
  return `<div class="formcard"><div class="ftitle">Historial de tarifas</div>
    ${hist.map(h=>`<div class="log">
      <div class="d">${fmtDate(h.fecha)}</div>
      <div class="body">${fmtMoney(h.de)} → ${fmtMoney(h.a)}</div>
    </div>`).join("")}
  </div>`;
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


// Indicador chico de llave de portal (paso 139, dethead de la ficha) — si el alumno tiene llave
// activa y cuándo vence (vencimiento sólo informativo, ver llaveAlumnoVenceDias en helpers.js),
// con "Renovar" (=regenerar) en un click. Sin llave generada, no muestra nada — para eso está el
// botón "Compartir acceso" al lado, que la genera.
function vLlaveBadge(s){
  if(!state.portalLoaded || !tokenForStudent(s.id)) return "";
  const dias = llaveAlumnoVenceDias(s.id);
  const vencida = dias!==null && dias<=0;
  const label = dias===null ? "Llave activa" : vencida ? "Llave vencida" : `Llave activa · vence en ${dias} día${dias===1?"":"s"}`;
  const busy = state.portalAlumnoBusy===s.id;
  return `<span class="pill" style="${vencida?"color:var(--status-desaprobo-fg);background:var(--redbg)":"background:var(--soft)"}">${esc(label)}</span>
    <button class="chip" data-a="portal-alumno-regen" style="padding:4px 8px;font-size:11px" ${busy?"disabled":""}>Renovar</button>`;
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
  h += `<div class="hint" style="margin-bottom:10px">Un link propio para ${esc(s.name)}, sin login — siempre muestra su propio saldo pendiente y cómo pagarte (paso 141), más lo que tildes abajo; nunca notas, señas ni comentarios privados.</div>`;
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
    ${(()=>{ const dias=llaveAlumnoVenceDias(s.id); if(dias===null) return ""; const vencida=dias<=0;
      return `<div class="hint" style="margin-top:8px">${vencida?"Esta llave ya venció — «Regenerar llave» arriba la renueva.":`Vence en ${dias} día${dias===1?"":"s"}.`}</div>`; })()}
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--soft)">
      <div class="flabel" style="margin-bottom:6px">Qué ve este alumno en su portal</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="chip ${share.proximaClase?"on":""}" data-a="portal-alumno-share-toggle" data-key="proximaClase">Su próxima clase</button>
        <button class="chip ${share.tareas?"on":""}" data-a="portal-alumno-share-toggle" data-key="tareas">Tarea de la última clase</button>
        <button class="chip ${share.avance?"on":""}" data-a="portal-alumno-share-toggle" data-key="avance">Avance por unidades</button>
      </div>
      <div class="hint" style="margin-top:8px">Esto se actualiza solo al tocar un tilde de arriba y cada vez que tocás «Publicar cambios» en Cuenta — si cambiás una clase, tarea o avance sin tocar nada acá, convendría republicar para que se vea al toque.</div>
      <div class="hint" style="margin-top:6px">Nunca se comparten notas, señas ni comentarios privados, tilde o no tilde nada — su saldo pendiente sí se muestra siempre (ver arriba).</div>
    </div>`;
  }
  if(state.portalAlumnoError) h += `<div class="saveerr" style="margin-top:10px">${esc(state.portalAlumnoError)}</div>`;
  return h + `</div>`;
}


/* ============ agenda: horarios habituales + clases puntuales, dentro de la ficha ============ */
// Migración suave del link de videollamada fijo por alumno (paso 168: se sacó — cambia clase a
// clase, no tenía sentido guardarlo una sola vez; linkVideollamadaFor() en helpers.js ya no lo usa).
// A los alumnos que ya tenían uno cargado se les muestra una última vez acá (Datos) con la
// posibilidad de descartarlo a mano (video-link-discard en events.js) — nunca se borra solo.
function vVideollamadaMigracionCard(s){
  if(!s.videollamadaLink) return "";
  return `<div class="formcard"><div class="ftitle">Link de videollamada fijo (antes)</div>
    <div class="hint" style="margin-bottom:8px">Esto se movió a cada clase: ahora el link se carga por horario o clase puntual, no una sola vez por alumno. El que tenías cargado era: <b>${esc(s.videollamadaLink)}</b></div>
    <button class="chip" data-a="video-link-discard">Descartar</button></div>`;
}

function vHorariosCard(s){
  const list=[...(s.horarios||[])].sort((a,b)=>a.day-b.day||a.time.localeCompare(b.time));
  let h = `<div class="formcard"><div class="ftitle">Horarios habituales</div>`;
  h += list.length===0 ? `<div class="empty">Sin horarios cargados.</div>`
    : list.map(hr=>`<div class="log" style="align-items:center">
      <div class="body">${esc(DIAS_SEMANA[hr.day])} ${esc(hr.time)} · ${hr.duration||60} min</div>
      ${hr.link?`<a class="chip" target="_blank" rel="noopener" href="${esc(hr.link)}">Link propio</a>`:""}
      <button class="del" data-a="del-horario" data-id="${hr.id}" title="Borrar" aria-label="Borrar">×</button></div>`).join("");
  h += `<div class="frow" style="margin-top:8px;align-items:flex-end">
    <div class="field"><div class="flabel">Día</div><select id="h-day" data-enter="add-horario">
      ${DIAS_SEMANA.map((d,i)=>`<option value="${i}">${esc(d)}</option>`).join("")}</select></div>
    <div class="field"><div class="flabel">Hora</div><input type="time" id="h-time" value="18:00" data-enter="add-horario"></div>
    <div class="field" style="max-width:150px"><div class="flabel">Duración</div>${durationFieldHtml(60, {id:"h-duration", dataEnter:"add-horario"})}</div>
    <div class="field"><div class="flabel">Link (opcional, si es distinto del de arriba)</div><input id="h-link" placeholder="https://…" data-enter="add-horario"></div>
    <button class="chip" data-a="add-horario" style="margin-bottom:2px">+ Agregar horario</button></div>
  </div>`;
  return h;
}

function vPuntualesCard(s){
  const list=[...(s.clasesPuntuales||[])].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
  let h = `<div class="formcard"><div class="ftitle">Próximas clases</div>
    <div class="hint" style="margin-bottom:8px">Clases agendadas sueltas — una recuperación, una clase extra. Se agregan desde "Registrar clase" → "Próxima clase", arriba.</div>`;
  h += list.length===0 ? `<div class="empty">Sin próximas clases agendadas.</div>`
    : list.map(p=>vPuntualRow(s,p)).join("");
  return h + `</div>`;
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
      ${p.topic?` · <span class="tareatag">${esc(p.topic)}</span>`:""}
      ${p.cancelada?`<div class="note" style="color:var(--status-desaprobo-fg)">Cancelada ${esc(fmtDateTime(p.canceladaAt))}${senia?" · seña "+SENIA_ESTADO_META[senia].label.toLowerCase():""}</div>`:""}
    </div>`;
  if(p.link) h += `<a class="chip" target="_blank" rel="noopener" href="${esc(p.link)}">Link propio</a>`;
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
      : `<div class="hint">Cada próxima clase que le agendes va a pedir ${fmtMoney(seniaMontoFor(s))} de seña.</div>`;
  }
  return h + `</div>`;
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


/* ============ informe de progreso: vista limpia, pensada para imprimir/compartir ============ */
function informeFilteredData(s){
  const periodKey = state.informePeriod||"3m";
  const fromDate = informePeriodFrom(periodKey);
  const sessions = [...(s.sessions||[])].filter(c=>!isAusente(c) && (!fromDate||c.date>=fromDate)).sort((a,b)=>a.date.localeCompare(b.date));
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
        units.map(u=>{ const st=topics[u.nombre]||"pendiente", m=TOPIC_META[st];
          return `<div class="informe-unit" style="border-left-color:${m.fg}"><span>${esc(u.nombre)}</span><b style="color:${m.fg}">${m.label}</b></div>`;
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
    units.forEach(u=>lines.push(`- ${u.nombre}: ${TOPIC_META[topics[u.nombre]||"pendiente"].label}`));
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

async function buildInformeImageBlob(s){
  const { periodKey, fromDate, sessions } = informeFilteredData(s);
  const units = unitsFor(s), topics = s.topics||{};
  const rel = units.filter(u=>topics[u.nombre]!=="noentra").length || 1;
  const seenCount = units.filter(u=>["visto","practica","parcial"].includes(topics[u.nombre])).length;
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
  if(modalidad==="hora") return "por hora de clase dictada";
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
    ${(()=>{ const c=cobrosDocenteFor(); if(!c.alias && !c.linkMP && !c.linkOtro) return "";
      return `<div class="informe-section">
        <div class="informe-stitle">Formas de pago</div>
        ${c.alias?`<div class="informe-row"><div class="informe-rowbody"><b>Alias/CVU:</b> ${esc(c.alias)}</div></div>`:""}
        ${c.linkMP?`<div class="informe-row"><div class="informe-rowbody"><b>Mercado Pago:</b> ${esc(c.linkMP)}</div></div>`:""}
        ${c.linkOtro?`<div class="informe-row"><div class="informe-rowbody"><b>Otro medio:</b> ${esc(c.linkOtro)}</div></div>`:""}
      </div>`; })()}

    <div class="informe-footer">Generado con Entreclases — ${esc(fmtDate(today()))}</div>
  </div>`;
  return h;
}
