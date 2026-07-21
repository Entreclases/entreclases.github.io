"use strict";
// Cierre de cuatrimestre (paso 163): sugerida sola en meses de recambio (jul/ago, nov-dic-feb,
// ver shouldSuggestFinCuatrimestre en helpers.js) en Estudiantes, cuando hay algún alumno activo
// sin clases hace rato. "Descartar" la posterga FIN_CUATRIMESTRE_SNOOZE_DAYS, mismo criterio que
// vBackupReminder. El overlay (vFinCuatrimestreOverlay) queda accesible mientras dure la
// temporada, aunque se haya descartado el aviso una vez.
function vFinCuatrimestreBanner(){
  if(!shouldSuggestFinCuatrimestre()) return "";
  const n = alumnosSinClasesFinCuatrimestre(FIN_CUATRIMESTRE_DIAS_SIN_CLASE).length;
  return `<div class="formcard" style="display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap">
    <div style="font-size:13px;color:var(--muted)">Cambio de cuatrimestre — ${n} alumno${n===1?"":"s"} activo${n===1?"":"s"} sin clases hace rato. Buen momento para poner en pausa a quien no siga, o despedirse.</div>
    <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
      <button class="chip" data-a="fincuatri-open">Cierre de cuatrimestre</button>
      <button class="del" style="font-size:20px" data-a="dismiss-fin-cuatrimestre" title="Descartar" aria-label="Descartar">×</button>
    </div>
  </div>`;
}

function vFinCuatrimestreRow(s){
  const ref = lastSessionDate(s) || s.startDate;
  const dias = daysSince(ref);
  return `<div class="log">
    <div class="body"><b>${esc(s.name)}</b>
      <div class="note">${esc(s.subject||"materia s/d")} · ${lastSessionDate(s)?`última clase hace ${dias} días`:`sin clases desde que empezó (hace ${dias} días)`}</div>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="chip" data-a="fincuatri-pausar" data-id="${s.id}">Pausar</button>
      <button class="chip" data-a="fincuatri-despedir" data-id="${s.id}">Despedir</button>
      <button class="chip" data-a="fincuatri-skip" data-id="${s.id}">Dejar como está</button>
    </div>
  </div>`;
}

function vFinCuatrimestreOverlay(){
  if(!state.finCuatrimestreOpen) return "";
  const days = state.finCuatrimestreDays || FIN_CUATRIMESTRE_DIAS_SIN_CLASE;
  const skipped = state.finCuatrimestreSkipped||[];
  const candidatos = alumnosSinClasesFinCuatrimestre(days).filter(s=>!skipped.includes(s.id));

  let h = `<div class="overlay no-print" data-a="fincuatri-close">
    <div class="modal" data-a="fincuatri-modal-noop" style="max-width:520px;max-height:85vh;overflow:auto">
      <div class="ftitle" style="font-size:16px">Cierre de cuatrimestre</div>
      <div class="hint" style="margin-bottom:10px">Alumnos activos sin clases hace un tiempo — pausalos, despedite, o dejalos como están si siguen la próxima cursada.</div>
      <div style="display:flex;gap:6px;margin-bottom:10px">
        <button class="chip ${days===30?"on":""}" data-a="fincuatri-days" data-f="30">30 días</button>
        <button class="chip ${days===60?"on":""}" data-a="fincuatri-days" data-f="60">60 días</button>
      </div>`;

  if(candidatos.length===0){
    h += `<div class="empty">Ningún alumno activo lleva ${days}+ días sin clases.</div>`;
  }else{
    h += `<button class="chip" style="margin-bottom:10px" data-a="fincuatri-pausar-todos">Pausar a los ${candidatos.length}</button>`;
    h += candidatos.map(vFinCuatrimestreRow).join("");
  }

  h += `<div class="stitle" style="margin-top:20px">Resumen del período</div>`;
  h += vResumenPeriodo();

  h += `<div style="margin-top:14px;text-align:right"><button class="chip" data-a="fincuatri-close">Cerrar</button></div>
    </div>
  </div>`;
  return h;
}

// "Resumen del período" (paso 163): último cuatrimestre (4 meses) vs. el anterior — mismo criterio
// de comparación por puntos porcentuales que "Comparar períodos" (paso 104), pero agregando varios
// meses de una con periodSummaryRange() en vez de mes a mes. Ver buildResumenPeriodoImageBlob más
// abajo para la versión PNG imprimible.
function vResumenPeriodo(){
  const curKeys = recentMonthKeys(4), prevKeys = recentMonthKeys(8).slice(4,8);
  const cur = periodSummaryRange(curKeys), prev = periodSummaryRange(prevKeys);
  const labelA = monthLabel(curKeys[curKeys.length-1])+"–"+monthLabel(curKeys[0]);
  const labelB = monthLabel(prevKeys[prevKeys.length-1])+"–"+monthLabel(prevKeys[0]);

  let h = compareMetricRow("Ingresos cobrados", labelA, labelB, cur.ingresos, prev.ingresos, fmtMoney);
  h += compareMetricRow("Clases dadas", labelA, labelB, cur.clases, prev.clases, v=>String(v));
  h += compareMetricRow("Horas dictadas", labelA, labelB, cur.horas, prev.horas, v=>v.toFixed(1));
  h += compareMetricRow("Alumnos con clase", labelA, labelB, cur.alumnos, prev.alumnos, v=>String(v));

  h += `<div class="stitle">% de aprobados</div>`;
  if(cur.examTotal===0 && prev.examTotal===0){
    h += `<div class="empty">Sin resultados de examen registrados en ninguno de los dos períodos.</div>`;
  }else{
    const fmtPct = (v,total) => v===null ? "sin datos" : `${v.toFixed(0)}% (${total})`;
    h += compareBarRow(labelA, cur.examPct||0, 100, v=>fmtPct(cur.examPct,cur.examTotal), "var(--accent)");
    h += compareBarRow(labelB, prev.examPct||0, 100, v=>fmtPct(prev.examPct,prev.examTotal), "var(--gray2)");
  }
  h += `<button class="chip" style="margin-top:6px" data-a="share-periodo-image" ${state.periodoImgBusy?"disabled":""}>${state.periodoImgBusy?"Generando…":"Descargar/compartir resumen (PNG)"}</button>`;
  return h;
}


const SEM_SHORT = {sd:"Sin evaluar", verde:"Verde", amarillo:"Amarillo", rojo:"Rojo"};

function listFiltersActive(){
  return !!(state.listSearch || state.listSubject!=="todas" || state.listCareer!=="todas" || state.listSem!=="todos" ||
    state.filter!=="activo" || (state.listDeuda||"todas")!=="todas" || (state.listSort||"examen")!=="examen" ||
    (state.listTag||"todas")!=="todas");
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

  let h = pageHead("Estudiantes","Tus alumnos",`<button class="btn btn-primary" data-a="new">+ Nuevo estudiante</button>`,
    "Todos tus alumnos, con filtros y búsqueda — tocá uno para abrir su ficha.", "alumnos");
  const estTab = state.estudiantesTab||"alumnos";
  h += `<div class="tabs" style="margin-bottom:14px">
    ${tabbtn("estudiantes-tab-alumnos",estTab==="alumnos","Alumnos")}
    ${tabbtn("estudiantes-tab-interesados",estTab==="interesados",`Interesados${interesadosFor().length?` (${interesadosFor().length})`:""}`)}
  </div>`;
  if(estTab==="interesados") return h + vInteresados();
  h += vFinCuatrimestreBanner();
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
      ${state.catalog.careers.map(c=>`<option value="${esc(c.nombre)}" ${c.nombre===state.listCareer?"selected":""}>${esc(c.nombre)}</option>`).join("")}
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
        `<button class="btn btn-primary" data-a="new">+ Agregá tu primer alumno</button>`, "lista")
    : `<div class="empty">Nadie coincide con estos filtros.</div>`) + vTrashFootLink();

  // En la vista "Todos" los alumnos en pausa (paso 114) se separan del resto en su propia
  // sección al final — mezclados en la misma lista se perdían entre exámenes/deudas de los
  // activos; en cualquier otro filtro (incluido "Pausado" mismo) se listan tal cual, sin split.
  if(state.filter==="todos"){
    const pausados = shown.filter(s=>s.status==="pausado");
    const resto = shown.filter(s=>s.status!=="pausado");
    h += resto.map(vAlumnoRow).join("");
    if(pausados.length){
      h += `<div class="stitle" style="margin-top:20px">En pausa</div>`;
      h += pausados.map(vAlumnoRow).join("");
    }
    return h + vTrashFootLink();
  }
  h += shown.map(vAlumnoRow).join("");
  return h + vTrashFootLink();
}

function vAlumnoRow(s){
  const d=daysTo(s.examDate);
  const na=studentAlerts(s).length;
  const units=unitsFor(s);
  const seen=units.filter(u=>["visto","practica","parcial"].includes((s.topics||{})[u.nombre])).length;
  const rel=units.filter(u=>(s.topics||{})[u.nombre]!=="noentra").length||1;
  const deuda=pendienteTotalFor(s);
  const lastAct=lastSessionDate(s);
  const right = (d!==null&&d>=0&&s.status==="activo")
    ? `<span style="color:${d<=7?"var(--red)":"var(--ink)"};font-weight:600">examen en ${d}d</span>`
    : s.status==="pausado" && s.pausaHasta
      ? `<span style="color:var(--faint)">vuelve el ${fmtDate(s.pausaHasta)}</span>`
      : `<span style="color:var(--faint)">${s.examDate?fmtDate(s.examDate):"sin fecha"}</span>`;
  return `<div class="row">
    <button class="row-click" data-a="open" data-id="${s.id}">
      ${avatarHtml(s.id, s.name, s.foto, 36, "flex-shrink:0")}
      <div class="main"><div class="name">${esc(s.name)} ${semDot(s.semaforo,13,false)} ${pill(s.status)} ${examplePill(s)}
        ${na?`<span class="mini-alert">${na} alerta${na>1?"s":""}</span>`:""}
        ${deuda>0?`<span class="pill" style="color:var(--status-desaprobo-fg);background:var(--redbg)">debe ${fmtMoney(deuda)}</span>`:""}</div>
      <div class="sub">${esc(s.career)} · ${esc(s.subject||"materia s/d")} · temas ${seen}/${rel}${(state.listSort||"examen")==="actividad"?` · última clase ${lastAct?esc(fmtDate(lastAct)):"nunca"}`:""}</div>
      ${studentTags(s).length?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${studentTags(s).map(t=>tagChip(t)).join("")}</div>`:""}</div>
      <div class="right">${right}</div>
    </button>
    ${hasPhone(s)?`<a class="wa-quick" title="Enviar WhatsApp" target="_blank" rel="noopener" href="${waLink(s,waQuickMessage(s))}">${ICON_CHAT}</a>`:""}
    <button class="share-quick" data-a="share-open" data-kind="alumno" data-id="${esc(s.id)}" title="Compartir acceso al portal" aria-label="Compartir acceso al portal">${ICON_LINK}</button>
  </div>`;
}


/* ============ Interesados: mini lista de espera (paso 119) ============
   Aparte de state.students a propósito — alguien que sólo preguntó todavía no es un alumno
   (sin ficha, sin historial, sin sincronizar con el portal). "Convertir en alumno" (ver
   convertirInteresado en helpers.js) crea la ficha de verdad y lo saca de esta lista. */
function vInteresados(){
  const list = [...interesadosFor()].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  let h = `<div class="formcard"><div class="ftitle">Nuevo interesado</div>
    <div class="hint" style="margin-bottom:8px">Para no perder una consulta que llega por WhatsApp — anotalo acá y convertilo en alumno con un click cuando arranca.</div>
    <div class="frow">
      <div class="field"><div class="flabel">Nombre</div><input id="int-nombre" data-enter="add-interesado"></div>
      <div class="field"><div class="flabel">Contacto (WhatsApp)</div><input id="int-contacto" placeholder="Ej: 11 2345-6789" data-enter="add-interesado"></div>
      <div class="field"><div class="flabel">Materia de interés</div><input id="int-materia" data-enter="add-interesado"></div>
    </div>
    <div class="field"><div class="flabel">Nota (opcional)</div><input id="int-nota" placeholder="Ej: vio el anuncio en Instagram, quiere empezar en marzo" data-enter="add-interesado"></div>
    <button class="chip" style="margin-top:8px" data-a="add-interesado">+ Agregar interesado</button>
  </div>`;

  if(list.length===0){
    return h + emptyState(ICON_USERS, "Sin interesados por ahora", "Cuando alguien pregunte por WhatsApp o en persona, anotalo acá arriba para no perderlo.");
  }

  h += list.map(it=>{
    const em = INTERESADO_ESTADO_META[it.estado]||INTERESADO_ESTADO_META.consulto;
    const waHref = it.contacto ? `https://wa.me/${normalizeArPhone(it.contacto)}` : "";
    return `<div class="row" style="flex-wrap:wrap">
      <div class="main">
        <div class="name">${esc(it.nombre)} <button class="chip" style="color:${em.fg};border-color:${em.fg}" data-a="cycle-interesado-estado" data-id="${it.id}">${esc(em.label)}</button></div>
        <div class="sub">${it.materia?esc(it.materia):"materia s/d"}${it.contacto?` · ${esc(it.contacto)}`:""}</div>
        ${it.nota?`<div class="hint" style="margin-top:2px">${esc(it.nota)}</div>`:""}
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${waHref?`<a class="wa-quick" title="Enviar WhatsApp" target="_blank" rel="noopener" href="${waHref}">${ICON_CHAT}</a>`:""}
        <button class="chip" data-a="convertir-interesado" data-id="${it.id}">Convertir en alumno</button>
        <button class="del" data-a="del-interesado" data-id="${it.id}" title="Borrar" aria-label="Borrar">×</button>
      </div>
    </div>`;
  }).join("");
  return h;
}


/* ============ "Resumen del período" (paso 163): PNG imprimible del cierre de cuatrimestre —
   mismo estilo de documento claro que buildInformeImageBlob (a diferencia del PNG de "Compartir
   mi tasa", pensado para redes con fondo oscuro). Ver "share-periodo-image" en events.js. ============ */
async function buildResumenPeriodoImageBlob(){
  const curKeys = recentMonthKeys(4), prevKeys = recentMonthKeys(8).slice(4,8);
  const cur = periodSummaryRange(curKeys), prev = periodSummaryRange(prevKeys);
  const doc = docenteFor();
  const rangeLabel = monthLabel(curKeys[curKeys.length-1])+" – "+monthLabel(curKeys[0]);

  const W=900, H=680, SC=2;
  const canvas=document.createElement("canvas");
  canvas.width=W*SC; canvas.height=H*SC;
  const ctx=canvas.getContext("2d");
  ctx.scale(SC,SC);
  if(document.fonts && document.fonts.ready) await document.fonts.ready;

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
  ctx.fillText("RESUMEN DEL PERÍODO", 40, 122);

  ctx.fillStyle="#12192E";
  ctx.font="800 32px Poppins, sans-serif";
  ctx.fillText(rangeLabel, 40, 166);

  ctx.fillStyle="#5C6480";
  ctx.font="600 15px Inter, sans-serif";
  if(doc.nombre) ctx.fillText(doc.nombre, 40, 192);

  ctx.strokeStyle="#E4E9F5"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(40,216); ctx.lineTo(W-40,216); ctx.stroke();

  const tilesY=246, tileW=(W-80-16)/2, tileH=110;
  statTile(ctx, 40, tilesY, tileW, tileH, String(cur.clases), "clases dadas");
  statTile(ctx, 40+tileW+16, tilesY, tileW, tileH, cur.horas.toFixed(1), "horas dictadas");
  statTile(ctx, 40, tilesY+tileH+16, tileW, tileH, fmtMoney(cur.ingresos), "ingresos cobrados");
  statTile(ctx, 40+tileW+16, tilesY+tileH+16, tileW, tileH, String(cur.alumnos), `alumno${cur.alumnos===1?"":"s"} con clase`);

  const yy = tilesY+2*(tileH+16)+30;
  ctx.fillStyle="#8B90A0";
  ctx.font="700 11.5px ui-monospace, Consolas, monospace";
  ctx.fillText("% DE APROBADOS", 40, yy);
  ctx.fillStyle="#12192E";
  ctx.font="800 30px Poppins, sans-serif";
  ctx.fillText(cur.examPct!==null ? Math.round(cur.examPct)+"%" : "sin datos", 40, yy+40);
  if(cur.examPct!==null && prev.examPct!==null){
    const diff = Math.round(cur.examPct-prev.examPct);
    ctx.fillStyle = diff>=0 ? "#1F9D55" : "#D64545";
    ctx.font="600 15px Inter, sans-serif";
    ctx.fillText(`${diff>=0?"+":""}${diff} pto${Math.abs(diff)===1?"":"s"} vs. el período anterior`, 40, yy+66);
  }

  ctx.fillStyle="#9AA3BE";
  ctx.font="500 12px ui-monospace, Consolas, monospace";
  ctx.fillText(`Generado con Entreclases — ${fmtDate(today())}`, 40, H-32);

  return canvasToPngBlob(canvas);
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

// Acceso discreto a la Papelera al pie de Estudiantes (paso 126) — el acceso "de verdad" sigue
// siendo la sección de Papelera en Cuenta (vPapeleraCard, más abajo); esto es sólo un atajo para
// no tener que acordarse de que vive ahí, chico a propósito y sólo si hay algo para restaurar.
function vTrashFootLink(){
  const total = state.students.filter(s=>s.deleted).length + (state.catalog.trash||[]).filter(t=>t.type==="subject").length;
  if(!total) return "";
  return `<div style="margin-top:16px;text-align:right">
    <button data-a="nav-cuenta" data-group="datos" style="background:none;border:none;cursor:pointer;display:inline-flex;align-items:center;gap:5px;
      font-size:12px;color:var(--faint);padding:4px 2px">
      ${ICON_TRASH.replace('stroke-width="2"','stroke-width="1.8" width="13" height="13"')} Papelera (${total})
    </button>
  </div>`;
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
