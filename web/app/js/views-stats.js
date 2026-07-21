"use strict";

/* ============ vista "Pagos": sub-pestañas "Resumen" (mes a mes, quién debe qué) y
   "Rentabilidad" (cuánto se gana de verdad por hora, ver vRentabilidad más abajo) ============ */
function vPagos(){
  const tab = state.pagosTab||"resumen";
  let h = pageHead("Pagos","Cobros y rentabilidad",null,
    "Qué cobraste, qué falta cobrar y cuánto te queda libre por mes, por materia y por alumno.");
  h += `<div class="tabs" style="margin-bottom:14px">
    <button class="tabbtn ${tab==="resumen"?"on":""}" data-a="pagos-tab" data-t="resumen">Resumen</button>
    <button class="tabbtn ${tab==="rentabilidad"?"on":""}" data-a="pagos-tab" data-t="rentabilidad">Rentabilidad</button>
    <button class="tabbtn ${tab==="ajustar"?"on":""}" data-a="pagos-tab" data-t="ajustar">Ajustar tarifas</button>
  </div>`;
  return h + (tab==="rentabilidad" ? vRentabilidad() : tab==="ajustar" ? vAjustarTarifas() : vPagosResumen());
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
  // "Sin registrar" (paso 196): sólo tiene sentido mirando el mes actual — son clases ya
  // terminadas AHORA, no un corte histórico del mes elegido arriba.
  const sinRegistrar = mk===currentMonthKey()
    ? alive().filter(s=>s.status==="activo").flatMap(s=>clasesEstimadasFor(s).map(c=>({s,c})))
    : [];
  if(rows.length===0 && seniaRes.rows.length===0 && sinRegistrar.length===0)
    return h + emptyState(ICON_WALLET, "Todavía no hay nada para cobrar acá",
      "Cargá una tarifa o activá la seña desde la pestaña «Pagos» de cada alumno para que aparezcan los cobros de este mes.",
      `<button class="btn btn-primary" data-a="nav-lista">Ir a Estudiantes</button>`, "pagos");

  if(rows.length){
    const totalCobrado = rows.reduce((a,x)=>a+x.r.cobrado,0);
    const totalPendiente = rows.reduce((a,x)=>a+x.r.pendiente,0);
    const totalClases = rows.reduce((a,x)=>a+x.r.clases,0);
    h += `<div class="stats">
      <div class="stat"><b>${fmtMoney(totalCobrado)}</b><span>cobrado</span></div>
      <div class="stat ${totalPendiente?"warn":""}"><b>${moneySpan(totalPendiente)}</b><span>pendiente</span></div>
      <div class="stat"><b>${totalClases}</b><span>clases dadas</span></div>
    </div>`;
    if(rows.some(({s})=>(s.packsClases||[]).length>0)) h += `<div class="hint" style="margin-bottom:10px">Un pack de clases prepago cuenta como cobrado el día que se vendió, no clase por clase — algún alumno puede mostrar más "clases dadas" que cobros sueltos por eso.</div>`;

    const nameCount={};
    rows.forEach(x=>{ const n=normName(x.s.name); nameCount[n]=(nameCount[n]||0)+1; });
    const sorted=[...rows].sort((a,b)=>b.r.pendiente-a.r.pendiente || a.s.name.localeCompare(b.s.name));

    h += `<div class="stitle">Por alumno</div>`;
    h += sorted.map(({s,r})=>{
      const showSubject = nameCount[normName(s.name)]>1;
      return `<div class="row">
        <button class="row-click" data-a="open" data-id="${s.id}">
        <div class="main"><div class="name">${esc(s.name)}${showSubject?` <span class="hint">· ${esc(s.subject||"materia s/d")}</span>`:""}</div>
        <div class="sub">${(s.modalidad==="clase"||s.modalidad==="hora")?`${r.clases} clase${r.clases===1?"":"s"} dada${r.clases===1?"":"s"}`:"mensual"} · cobrado ${fmtMoney(r.cobrado)}</div></div>
        <div class="right"><span style="color:${r.pendiente?"var(--red)":"var(--green)"};font-weight:600">${r.pendiente?fmtMoney(r.pendiente)+" pendiente":"al día"}</span></div>
        </button>
        ${r.pendiente>0?`<button class="chip" title="Marcar todo como pagado" aria-label="Marcar todo como pagado" data-a="pagos-check-pendiente" data-id="${s.id}" data-mk="${mk}">✓</button>`:""}
      </div>`;
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

  if(sinRegistrar.length){
    h += `<div class="stitle">Sin registrar</div>
    <div class="hint" style="margin-bottom:8px">Clases ya terminadas que todavía no registraste — estimadas a tarifa vigente, no son deuda firme hasta que las registres.</div>`;
    h += [...sinRegistrar].sort((a,b)=>b.c.date.localeCompare(a.c.date)).map(({s,c})=>`<div class="log">
      <div class="d">${fmtDate(c.date)}</div>
      <div class="body">${esc(s.name)} <span class="hint">· ${fmtMoney(c.monto)} a confirmar</span></div>
      <button class="chip" data-a="agenda-log" data-id="${s.id}" data-date="${c.date}">Registrar</button>
    </div>`).join("");
  }
  return h;
}


/* ============ ajuste de tarifas en lote (paso 112) ============
   Aumento % o monto fijo a la tarifa de varios alumnos de una, con vista previa antes de
   aplicar — cada alumno arranca incluido, se puede destildar uno a la vez o toda una materia
   junto (toggle-tarifa-ajuste-materia). Sólo alumnos activos con tarifa cargada; el cambio real
   lo hace applyTarifaAjuste() (helpers.js), que además deja una línea en s.tarifaHistorial. */
function tarifaAjusteState(){ return state.tarifaAjuste || (state.tarifaAjuste = {modo:"porcentaje", valor:"", redondeo:"", excluidos:[], incluirDefault:false}); }

function vAjustarTarifas(){
  const cfg = tarifaAjusteState();
  const candidatos = alive().filter(s=>s.status==="activo" && Number(s.tarifa)>0)
    .sort((a,b)=>(a.subject||"").localeCompare(b.subject||"") || a.name.localeCompare(b.name));

  let h = `<div class="formcard"><div class="ftitle">Ajustar tarifas</div>
    <div class="hint" style="margin-bottom:10px">Aplicá un aumento a la tarifa de varios alumnos de una — las clases ya registradas y los recibos ya emitidos no cambian de precio.</div>
    <div class="frow">
      <div class="field" style="max-width:180px"><div class="flabel">Tipo de aumento</div>
        <select data-cf="tarifa-ajuste-modo">
          <option value="porcentaje" ${cfg.modo!=="monto"?"selected":""}>Porcentaje</option>
          <option value="monto" ${cfg.modo==="monto"?"selected":""}>Monto fijo</option>
        </select></div>
      <div class="field" style="max-width:160px"><div class="flabel">${cfg.modo==="monto"?"Monto (pesos)":"Porcentaje (%)"}</div>
        <input type="number" data-cf="tarifa-ajuste-valor" value="${esc(cfg.valor)}" placeholder="${cfg.modo==="monto"?"Ej: 5000":"Ej: 15"}"></div>
      <div class="field" style="max-width:180px"><div class="flabel">Redondeo</div>
        <select data-cf="tarifa-ajuste-redondeo">
          <option value="" ${!cfg.redondeo?"selected":""}>Sin redondeo</option>
          <option value="100" ${cfg.redondeo==="100"?"selected":""}>Al $100 más cercano</option>
          <option value="500" ${cfg.redondeo==="500"?"selected":""}>Al $500 más cercano</option>
          <option value="1000" ${cfg.redondeo==="1000"?"selected":""}>Al $1000 más cercano</option>
        </select></div>
    </div>
    ${Number(tarifaDefaultFor().monto)>0?`<div style="margin-top:10px">
      <button class="chip ${cfg.incluirDefault?"on":""}" data-a="toggle-tarifa-ajuste-default">${cfg.incluirDefault?"✓ ":""}Incluir tu tarifa habitual (Cuenta → Cobros)</button>
    </div>`:""}
  </div>`;

  if(candidatos.length===0 && !cfg.incluirDefault){
    return h + emptyState(ICON_WALLET, "No hay tarifas para ajustar",
      "Cargá una tarifa en la ficha de algún alumno activo (pestaña «Pagos») para poder aplicarle un aumento acá.");
  }

  const valorNum = Number(cfg.valor)||0;
  if(valorNum===0){
    return h + `<div class="hint">Ingresá un porcentaje o un monto para ver la vista previa.</div>`;
  }

  const step = Number(cfg.redondeo)||0;
  const cambios = candidatos.map(s=>({
    s, actual:Number(s.tarifa)||0,
    nueva:tarifaAjusteNueva(Number(s.tarifa)||0, cfg.modo, cfg.valor, step),
    incluido: !cfg.excluidos.includes(s.id),
  }));
  const incluidos = cambios.filter(c=>c.incluido);

  const bySubject = {};
  cambios.forEach(c=>{ const k=c.s.subject||"Sin materia"; (bySubject[k]=bySubject[k]||[]).push(c); });

  h += `<div class="formcard"><div class="ftitle">Vista previa</div>`;
  Object.entries(bySubject).forEach(([materia,list])=>{
    const todosIncluidos = list.every(c=>c.incluido);
    h += `<div class="stitle" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <span>${esc(materia)}</span>
      <button class="chip" data-a="toggle-tarifa-ajuste-materia" data-subject="${esc(materia)}">${todosIncluidos?"Destildar todos":"Tildar todos"}</button>
    </div>`;
    h += list.map(c=>`<button class="row" data-a="toggle-tarifa-ajuste-alumno" data-id="${c.s.id}" style="opacity:${c.incluido?1:.5}">
      <div class="main"><span class="badge ${c.incluido?"badge-green":"badge-neutral"}" style="margin-right:6px">${c.incluido?"Incluido":"Excluido"}</span><div class="name" style="display:inline">${esc(c.s.name)}</div></div>
      <div class="right" style="text-align:right">
        <span class="hint">${fmtMoney(c.actual)}</span> → <b style="color:var(--accent-dark)">${fmtMoney(c.nueva)}</b>
      </div>
    </button>`).join("");
  });
  if(cfg.incluirDefault && Number(tarifaDefaultFor().monto)>0){
    const actualDef = Number(tarifaDefaultFor().monto)||0;
    const nuevaDef = tarifaAjusteNueva(actualDef, cfg.modo, cfg.valor, step);
    h += `<div class="stitle">Cuenta</div>
    <div class="row"><div class="main"><div class="name">Tu tarifa habitual</div></div>
      <div class="right" style="text-align:right"><span class="hint">${fmtMoney(actualDef)}</span> → <b style="color:var(--accent-dark)">${fmtMoney(nuevaDef)}</b></div>
    </div>`;
  }
  h += `<button class="primary" style="margin-top:14px;margin-left:0" data-a="apply-tarifa-ajuste" ${(incluidos.length===0 && !cfg.incluirDefault)?"disabled":""}>Aplicar aumento a ${incluidos.length} alumno${incluidos.length===1?"":"s"}${cfg.incluirDefault?" y tu tarifa habitual":""}</button>
  </div>`;
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
  if(alive().some(s=>(s.packsClases||[]).length>0)) h += `<div class="hint" style="margin-bottom:14px">Un pack de clases prepago cuenta como ingreso el día que se vendió, no repartido entre las clases que cubre — por eso "clases dadas" y los ingresos de un mes puntual pueden no coincidir uno a uno.</div>`;

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


/* ============ "Compartir mi tasa" (paso 162): PNG con la tasa de aprobación general, mismo
   patrón de dibujo a mano en <canvas> que buildInformeImageBlob — pensado para que el docente lo
   suba a sus redes/estados como argumento de marketing propio y de la app. Ver "share-tasa-image"
   en events.js. ============ */
async function buildTasaImageBlob(){
  const general = examResultCounts(alive());
  const pct = general.total>0 ? Math.round(general.aprobo/general.total*100) : 0;
  const doc = docenteFor();

  const W=900, H=680, SC=2;
  const canvas=document.createElement("canvas");
  canvas.width=W*SC; canvas.height=H*SC;
  const ctx=canvas.getContext("2d");
  ctx.scale(SC,SC);
  if(document.fonts && document.fonts.ready) await document.fonts.ready;

  const grad=ctx.createLinearGradient(0,0,W,H);
  grad.addColorStop(0,"#1E2B4D"); grad.addColorStop(1,"#2F4272");
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);

  ctx.fillStyle="#fff";
  roundedRectPath(ctx,40,40,48,48,14); ctx.fill();
  ctx.strokeStyle="#1E2B4D"; ctx.lineWidth=3; ctx.lineCap="round"; ctx.lineJoin="round";
  ctx.beginPath(); ctx.moveTo(52,65); ctx.lineTo(61,75); ctx.lineTo(76,55); ctx.stroke();
  ctx.fillStyle="#fff";
  ctx.font="700 21px Poppins, sans-serif";
  ctx.fillText("Entreclases", 100, 71);

  ctx.fillStyle="#B8C2E8";
  ctx.font="700 13px ui-monospace, Consolas, monospace";
  ctx.fillText("TASA DE APROBACIÓN", 40, 150);

  ctx.fillStyle="#fff";
  ctx.font="800 150px Poppins, sans-serif";
  ctx.fillText(pct+"%", 40, 340);

  ctx.fillStyle="#D7DEF7";
  ctx.font="600 22px Inter, sans-serif";
  ctx.fillText(`de ${doc.nombre?doc.nombre+" — ":""}${general.total} examen${general.total===1?"":"es"} rendido${general.total===1?"":"s"}`, 40, 390);

  ctx.strokeStyle="rgba(255,255,255,.25)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(40,430); ctx.lineTo(W-40,430); ctx.stroke();

  ctx.fillStyle="#fff";
  ctx.font="700 26px Poppins, sans-serif";
  wrapCanvasText(ctx, "¡Gracias a todos los que confiaron este cuatrimestre!", 40, 480, W-80, 34, 2);

  ctx.fillStyle="#9AA3BE";
  ctx.font="500 13px ui-monospace, Consolas, monospace";
  ctx.fillText(`Hecho con Entreclases — ${fmtDate(today())}`, 40, H-32);

  return canvasToPngBlob(canvas);
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
  const entran=units.filter(u=>topics[u.nombre]!=="noentra");
  if(entran.length===0) return null;
  const parcial=entran.filter(u=>topics[u.nombre]==="parcial").length;
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

// % de aprobados (paso 162) — mismo criterio de puntos porcentuales que compareObjetivosRow.
function compareExamResultRow(a, b, labelA, labelB){
  let h = `<div class="stitle">% de aprobados</div>`;
  if(a.examResultsTotal===0 && b.examResultsTotal===0)
    return h + `<div class="empty">Sin resultados de examen registrados en ninguno de los dos períodos.</div>`;
  const fmtPct = (v,total) => v===null ? "sin datos" : `${v.toFixed(0)}% (${total})`;
  h += compareBarRow(labelA, a.examResultsPct||0, 100, v=>fmtPct(a.examResultsPct,a.examResultsTotal), "var(--accent)");
  h += compareBarRow(labelB, b.examResultsPct||0, 100, v=>fmtPct(b.examResultsPct,b.examResultsTotal), "var(--gray2)");
  if(a.examResultsPct===null || b.examResultsPct===null){
    h += `<div class="hint" style="margin-bottom:6px">Sin resultados en uno de los dos períodos — no se puede comparar la diferencia.</div>`;
  }else{
    const diff = a.examResultsPct-b.examResultsPct;
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
  h += compareExamResultRow(a, b, labelA, labelB);

  return h;
}

function vEstadisticas(){
  let h = pageHead("Estadísticas","Panorama del grupo",null,
    "Cómo viene el grupo en conjunto: avance por tema, objetivos, exámenes y asistencia, por materia.");
  h += `<div class="tabs" style="margin-bottom:16px">
    <button class="tabbtn ${(state.statsMode||"normal")==="normal"?"on":""}" data-a="stats-mode" data-m="normal">Vista normal</button>
    <button class="tabbtn ${state.statsMode==="comparar"?"on":""}" data-a="stats-mode" data-m="comparar">Comparar períodos</button>
  </div>`;
  if(state.statsMode==="comparar") return h + vEstadisticasComparar();

  const subs = subjectsWithStudents();
  if(subs.length===0) return h + emptyState(ICON_CHART, "Todavía no hay nada para mostrar acá",
    "En cuanto tengas alumnos activos con una materia asignada, acá vas a ver el avance de todo el grupo de un vistazo.",
    `<button class="btn btn-primary" data-a="nav-lista">Ir a Estudiantes</button>`, "stats");

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

  h += `<div class="stitle">Asistencia de esta materia (este mes)</div>`;
  const asistMes = grupo.reduce((acc,s)=>{ const a=asistenciaStats(s, currentMonthKey()+"-01", today()); acc.dadas+=a.dadas; acc.ausencias+=a.ausencias; return acc; }, {dadas:0,ausencias:0});
  const asistTotal = asistMes.dadas+asistMes.ausencias;
  h += asistTotal===0
    ? `<div class="empty">Sin clases registradas este mes en esta materia.</div>`
    : `<div class="stats"><div class="stat"><b>${countSpan(asistMes.dadas/asistTotal*100,{suffix:"%"})}</b><span>asistencia (${asistMes.ausencias} ausencia${asistMes.ausencias===1?"":"s"} sobre ${asistTotal} clase${asistTotal===1?"":"s"})</span></div></div>`;

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
    style="background:var(--soft);border-radius:99px;height:14px;overflow:hidden;max-width:320px;margin-bottom:12px">
    <div class="grow-h" style="height:100%;width:${pct.toFixed(1)}%;background:var(--green);border-radius:99px"></div>
  </div>
  <button class="chip" style="margin-bottom:16px" data-a="share-tasa-image" ${state.tasaImgBusy?"disabled":""}>${state.tasaImgBusy?"Generando…":"Compartir mi tasa"}</button>`;

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

// Bancos ocupados: color de semáforo detrás + foto/iniciales (paso 137) + nombre corto abajo,
// con tooltip completo (avance, examen, si ya rindió). Bancos vacíos: silueta sutil, sin acción.
// idx sólo se usa para el retraso de la animación en cascada (paso 138), ver vAula.
function deskHtml(s, idx){
  const delay = Math.min(idx*24, 480);
  if(!s){
    return `<div class="desk desk-empty" style="animation-delay:${delay}ms" aria-hidden="true">
      <div class="desk-top"></div>
      <div class="desk-body empty"><div class="desk-silhouette"></div></div>
      <div class="desk-name">&nbsp;</div>
    </div>`;
  }
  const sem = s.semaforo||"sd";
  const color = SEM_META[sem].color;
  const pct = topicProgressPct(s);
  const pctVal = pct===null ? 0 : Math.round(pct);
  const d = s.examDate ? daysTo(s.examDate) : null;
  const showBadge = d!==null && d>=0 && d<=14;
  const done = hasCurrentExamResult(s);
  const firstName = (s.name||"").trim().split(/\s+/)[0] || "—";
  const title = `${s.name||"—"} — ${SEM_META[sem].label} — avance: ${pctVal}%${done?" — ya rindió":""}`;
  return `<button class="desk" data-a="open" data-id="${esc(s.id)}" title="${esc(title)}" style="animation-delay:${delay}ms">
    <div class="desk-top"><div class="desk-progress grow-h" style="width:${pctVal}%"></div></div>
    <div class="desk-body" style="background:${color}">
      ${avatarHtml(s.id, s.name, s.foto, 30, "border-radius:50%;border:2px solid var(--card)")}
      ${showBadge?`<span class="desk-badge">${d===0?"hoy":d+"d"}</span>`:""}
      ${done?`<span class="desk-done" title="Ya rindió este examen">✓</span>`:""}
    </div>
    <div class="desk-name">${esc(firstName)}</div>
  </button>`;
}

// Filas de "el aula" (paso 138): siempre 30 bancos como piso — 4 filas completas de 7 (2|3|2, dos
// pasillos) + una quinta fila de un solo grupo de 2. Si hay más de 30 alumnos en la materia, se
// agregan filas completas nuevas (también 2|3|2) de a una, debajo, hasta que entren todos —
// nunca se recorta la lista ni se manda a "ver en la Lista" como antes.
const AULA_BASE_ROWS = [[2,3,2],[2,3,2],[2,3,2],[2,3,2],[2]]; // 28+2 = 30

function aulaRowGroups(studentCount){
  const rows=[...AULA_BASE_ROWS];
  let placed=30;
  while(placed<studentCount){ rows.push([2,3,2]); placed+=7; }
  return rows;
}

function vAula(grupo){
  let h = `<div class="stitle" style="margin-top:26px">El aula</div>`;

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
  const rowGroups = aulaRowGroups(ordered.length);
  let idx=0;
  h += `<div class="aula-wrap"><div class="classroom">` + rowGroups.map(groups=>
    `<div class="aula-row">` + groups.map(count=>{
      let side="";
      for(let i=0;i<count;i++){ side += deskHtml(ordered[idx], idx); idx++; }
      return `<div class="aula-side">${side}</div>`;
    }).join("") + `</div>`
  ).join("") + `</div></div>`;

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
