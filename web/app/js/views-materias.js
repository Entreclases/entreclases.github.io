"use strict";

/* ============ unidades 2.0 (paso 127): editor de unidades/subunidades de una materia — cada
   unidad se renombra (lápiz o doble click), se borra (con confirmación sólo si algún alumno ya
   tiene avance registrado ahí, ver unitHasAvance() en helpers.js), se reordena con flechas
   siempre visibles (obligatorias: en mobile el drag es un infierno) y puede tener subunidades
   (un nivel, mismo patrón de editar/borrar/reordenar). Enter en "nueva unidad"/"nueva subunidad"
   agrega y deja el foco listo para seguir cargando en cadena (ver el listener de keydown en
   events.js). ============ */
function vSubunitList(u){
  const subs = u.subunidades||[];
  let h = subs.length ? `<div class="subunit-list">` + subs.map((sub,i)=>{
    const renaming = state.editSubunitId && state.editSubunitId.unitId===u.id && state.editSubunitId.subId===sub.id;
    if(renaming){
      return `<div class="subunit-row">
        <input id="subunit-rename-input" value="${esc(sub.nombre)}" data-enter="cat-subunit-rename-done" autofocus>
        <button class="chip" data-a="cat-subunit-rename-done">Guardar</button>
        <button class="chip" data-a="cat-subunit-rename-cancel">Cancelar</button>
      </div>`;
    }
    return `<div class="subunit-row">
      <div class="unit-arrows">
        <button class="iconbtn" data-a="cat-subunit-up" data-unit-id="${u.id}" data-id="${sub.id}" ${i===0?"disabled":""} title="Subir subunidad" aria-label="Subir subunidad">${ICON_CHEVRON_UP}</button>
        <button class="iconbtn" data-a="cat-subunit-down" data-unit-id="${u.id}" data-id="${sub.id}" ${i===subs.length-1?"disabled":""} title="Bajar subunidad" aria-label="Bajar subunidad">${ICON_CHEVRON}</button>
      </div>
      <span class="subunit-label" data-a-dbl="cat-subunit-rename-start" data-unit-id="${u.id}" data-id="${sub.id}">${esc(sub.nombre)}</span>
      <button class="iconbtn" data-a="cat-subunit-rename-start" data-unit-id="${u.id}" data-id="${sub.id}" title="Renombrar subunidad" aria-label="Renombrar subunidad">${ICON_EDIT}</button>
      <button class="del" data-a="cat-del-subunit" data-unit-id="${u.id}" data-id="${sub.id}" title="Quitar subunidad" aria-label="Quitar subunidad">×</button>
    </div>`;
  }).join("") + `</div>` : "";
  h += `<div class="subunit-row subunit-add">
    <input id="new-subunit-${u.id}" placeholder="Agregar subunidad" data-enter="cat-add-subunit:${u.id}">
    <button class="primary" data-a="cat-add-subunit:${u.id}">+ Subunidad</button>
  </div>`;
  return h;
}

function vUnitRow(u, i, total, subjectId){
  if(state.catConfirmDelId && state.catConfirmDelId.type==="unit" && state.catConfirmDelId.id===u.id){
    return `<div class="log unit-row"><div class="body">
      <span style="font-size:13px;color:var(--status-desaprobo-fg)">¿Eliminar «${esc(u.nombre)}»? Hay alumnos con avance registrado ahí — no se borra su historial, sólo deja de verse en la grilla.</span>
      <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
        <button class="danger" data-a="cat-confirm-del-unit" data-id="${u.id}">Sí, eliminar</button>
        <button class="chip" data-a="cat-cancel-del">Cancelar</button>
      </div></div></div>`;
  }
  const renaming = state.editUnitId===u.id;
  // Chip de conteo de materiales (paso 128) — tocarlo lleva directo al bloque de esta unidad en
  // la sección Materiales de abajo, cambiando a modo "Por unidad" si hacía falta (ver
  // mat-jump-unit en events.js y el scroll al final de render() en este mismo archivo).
  const matCount = materialesCountFor(subjectId, u.id);
  return `<div class="log unit-row">
    <div class="unit-arrows">
      <button class="iconbtn" data-a="cat-unit-up" data-id="${u.id}" ${i===0?"disabled":""} title="Subir unidad" aria-label="Subir unidad">${ICON_CHEVRON_UP}</button>
      <button class="iconbtn" data-a="cat-unit-down" data-id="${u.id}" ${i===total-1?"disabled":""} title="Bajar unidad" aria-label="Bajar unidad">${ICON_CHEVRON}</button>
    </div>
    <div class="body">
      ${renaming
        ? `<div style="display:flex;gap:6px;flex-wrap:wrap"><input id="unit-rename-input" value="${esc(u.nombre)}" data-enter="cat-unit-rename-done" autofocus>
           <button class="chip" data-a="cat-unit-rename-done">Guardar</button>
           <button class="chip" data-a="cat-unit-rename-cancel">Cancelar</button></div>`
        : `<b class="unit-label" data-a-dbl="cat-unit-rename-start" data-id="${u.id}">${esc(u.nombre)}</b>
           <button class="chip" data-a="mat-jump-unit" data-unit="${u.id}" style="margin-left:6px;padding:2px 8px;font-size:11px" title="Ver materiales de esta unidad">${matCount} material${matCount===1?"":"es"}</button>`}
      ${vSubunitList(u)}
    </div>
    ${!renaming ? `<div style="display:flex;gap:2px;align-items:flex-start">
      <button class="iconbtn" data-a="cat-unit-rename-start" data-id="${u.id}" title="Renombrar unidad" aria-label="Renombrar unidad">${ICON_EDIT}</button>
      <button class="del" data-a="cat-ask-del-unit" data-id="${u.id}" title="Quitar unidad" aria-label="Quitar unidad">×</button>
    </div>` : ""}
  </div>`;
}

function vCatalog(){
  const c=state.catalog;
  let h = pageHead("Materias","Materias, carreras y materiales",null,
    "El catálogo compartido: unidades por materia, carreras, packs y archivos — editar acá no toca el avance ya cargado de ningún alumno.");
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
    <div class="flabel" style="margin-top:12px">Carreras vinculadas (para agruparla al verla «Por carrera»)</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">
      ${c.careers.length ? c.careers.map(cr=>careerChip(cr,(em.careerIds||[]).includes(cr.id))).join("") : `<div class="empty">Todavía no cargaste ninguna carrera (sección «Carreras», más abajo).</div>`}
    </div>
    <div class="flabel" style="margin-top:12px">Unidades y subunidades (se muestran en este orden)</div>
    ${em.units.map((u,i)=>vUnitRow(u,i,em.units.length,em.id)).join("") || `<div class="empty">Sin unidades todavía. Agregá la primera acá abajo.</div>`}
    <div class="frow" style="margin-top:8px;align-items:flex-end">
      <div class="field"><input id="new-unit" placeholder="Ej: Límites y continuidad" data-enter="cat-add-unit"></div>
      <button class="primary" style="margin-bottom:2px" data-a="cat-add-unit">+ Agregar unidad</button></div>
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
  ${(c.careers||[]).map(x=>{
    const renaming = state.editCareerId===x.id;
    if(renaming) return `<div class="log" style="padding:7px 12px">
      <input id="career-rename-input" value="${esc(x.nombre)}" data-enter="cat-career-rename-done" autofocus>
      <button class="chip" data-a="cat-career-rename-done">Guardar</button>
      <button class="chip" data-a="cat-career-rename-cancel">Cancelar</button></div>`;
    return `<div class="log" style="padding:7px 12px"><div class="body">${esc(x.nombre)}</div>
    <button class="iconbtn" data-a="cat-career-rename-start" data-id="${x.id}" title="Renombrar" aria-label="Renombrar">${ICON_EDIT}</button>
    <button class="del" data-a="cat-del-career" data-id="${x.id}" title="Quitar" aria-label="Quitar">×</button></div>`;
  }).join("") || `<div class="empty">Sin carreras cargadas.</div>`}
  <div class="frow" style="margin-top:8px;align-items:flex-end">
    <div class="field"><input id="new-career" placeholder="Ej: Contador Público" data-enter="cat-add-career"></div>
    <button class="chip" data-a="cat-add-career" style="margin-bottom:2px">+ Agregar carrera</button></div>
  <div class="hint" style="margin-top:6px">Quitar una carrera no afecta a los alumnos que ya la tienen (conservan el texto en su ficha) ni desvincula del todo lo demás — sólo sale de las materias que la tenían enlazada. Vinculá materias con carreras desde el editor de cada materia, más abajo.</div></div>`;
  if(c.subjects.filter(m=>m.id!=="materia-ejemplo").length===0){
    h += emptyState(ICON_BOOK, "Armá tu primera materia",
      "Una materia con sus unidades es lo que arma solo la grilla de temas de cada alumno que la curse.",
      `<button class="btn btn-primary" onclick="document.getElementById('new-subject').focus()">+ Agregar materia</button>`, "catalog");
  }
  h += `<div class="formcard"><div class="ftitle">Materias y sus unidades</div>`;
  const groupBy = state.catMateriasGroupBy||"todas";
  if((c.careers||[]).length){
    h += `<div style="display:flex;gap:6px;margin-bottom:10px">
      <button class="chip ${groupBy==="todas"?"on":""}" data-a="cat-materias-groupby" data-mode="todas">Todas</button>
      <button class="chip ${groupBy==="carrera"?"on":""}" data-a="cat-materias-groupby" data-mode="carrera">Por carrera</button>
    </div>`;
  }
  const subjectRow = (m)=>{
    const packNames=packsContaining(m.id).map(p=>p.name);
    const linked=(m.careerIds||[]).map(careerById).filter(Boolean);
    const confirming = state.catConfirmDelId && state.catConfirmDelId.type==="subject" && state.catConfirmDelId.id===m.id;
    if(confirming) return `<div class="row"><div class="main" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--status-desaprobo-fg)">¿Eliminar «${esc(m.name)}»? Va a la papelera por 7 días.</span>
      <button class="danger" data-a="cat-confirm-del-subject" data-id="${m.id}">Sí, eliminar</button>
      <button class="chip" data-a="cat-cancel-del">Cancelar</button></div></div>`;
    return `<div class="row" style="cursor:pointer" data-a="cat-edit-subject" data-id="${m.id}">
    <div class="main"><b style="display:inline-flex;align-items:center;gap:7px">${subjectDot(m)}${esc(m.name)}</b> ${packNames.map(n=>`<span class="pill" style="color:var(--status-aprobo-fg);background:var(--bluebg)">${esc(n)}</span>`).join(" ")}
      <div class="sub">${m.units.length} unidad${m.units.length===1?"":"es"}</div>
      ${linked.length?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${linked.map(cr=>`<span class="pill" style="background:var(--soft)">${esc(cr.nombre)}</span>`).join("")}</div>`:""}</div>
    <div style="display:flex;align-items:center;gap:4px">
      <button class="chip" data-a="share-open" data-kind="materia" data-id="${m.id}" title="Llave grupal para esta materia" aria-label="Llave grupal para esta materia" style="padding:6px 10px;font-size:12px">Llave grupal</button>
      <button class="chip" data-a="cat-duplicate-subject" data-id="${m.id}" title="Duplicar materia" aria-label="Duplicar materia" style="padding:6px 10px;font-size:12px">Duplicar</button>
      <button class="del" data-a="cat-ask-del-subject" data-id="${m.id}" title="Eliminar materia" aria-label="Eliminar materia">×</button>
    </div></div>`;
  };
  if(groupBy==="carrera" && (c.careers||[]).length){
    (c.careers||[]).forEach(cr=>{
      const subs=c.subjects.filter(m=>(m.careerIds||[]).includes(cr.id));
      if(!subs.length) return;
      h += `<div class="flabel" style="margin-top:10px">${esc(cr.nombre)}</div>` + subs.map(subjectRow).join("");
    });
    const sinAsignar=c.subjects.filter(m=>!(m.careerIds||[]).length);
    h += `<div class="flabel" style="margin-top:10px">Sin carrera asignada</div>`
      + (sinAsignar.map(subjectRow).join("") || `<div class="empty">Ninguna.</div>`);
  }else{
    h += c.subjects.map(subjectRow).join("") || `<div class="empty">Sin materias cargadas.</div>`;
  }
  h += `<div class="flabel" style="margin-top:12px">Empezar desde una plantilla</div>
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


/* ============ materiales de una materia (dentro de su editor) ============
   Paso 128: cada material puede enlazarse opcionalmente a una unidad de la materia (unitId en
   s.materiales[], "" o ausente = "General", ver setMaterialUnit/reconcileMaterialesIndex en
   sync.js). Con al menos una unidad cargada aparece un selector "General"/"Por unidad"
   (state.materialesMode): "General" es la lista de siempre sin agrupar; "Por unidad" arma un
   bloque por cada unidad (en su orden) más un bloque "General" para lo no enlazado, cada uno
   con su propio input+botón de subir. El chip de conteo en vUnitRow (arriba) y el botón "Ver
   materiales de esta unidad" disparan mat-jump-unit (events.js), que fuerza el modo "Por unidad"
   y deja state.materialesJumpUnitId para que render() (al final de este archivo) haga scroll al
   bloque una sola vez. */
function vMaterialRow(subjectId, f, unitOptions){
  const dn=materialDisplayName(f.name);
  const size=(f.metadata&&f.metadata.size)||0;
  const confirming = state.materialesConfirmDelName===f.name;
  const idxEntry=materialIndexEntry(subjectId, f.name);
  const compartido=!!(idxEntry && idxEntry.compartido);
  const curUnitId=(idxEntry&&idxEntry.unitId)||"";
  const unitSelect = unitOptions.length ? `<select data-matunit data-id="${subjectId}" data-name="${esc(f.name)}" title="Enlazar a una unidad" style="max-width:170px">
      <option value="">General (sin unidad)</option>
      ${unitOptions.map(o=>`<option value="${esc(o.id)}" ${o.id===curUnitId?"selected":""}>${esc(o.label)}</option>`).join("")}
    </select>` : "";
  return `<div class="log" style="align-items:center;flex-wrap:wrap">
    <div class="body">${esc(dn)}<div class="note">${fmtBytes(size)} · ${fmtDateTime(f.updated_at||f.created_at)}</div></div>
    ${!confirming ? `${unitSelect}
      <button class="chip ${compartido?"on":""}" data-a="mat-toggle-share" data-id="${subjectId}" data-name="${esc(f.name)}" title="Compartir en el portal de alumnos">${compartido?"Compartido":"Compartir"}</button>
      <button class="chip" data-a="mat-download" data-id="${subjectId}" data-name="${esc(f.name)}">Descargar</button>
      <button class="del" data-a="mat-del-ask" data-name="${esc(f.name)}" title="Borrar" aria-label="Borrar">×</button>`
    : `<span style="font-size:12px;color:var(--status-desaprobo-fg)">¿Borrar «${esc(dn)}»?</span>
      <button class="danger" data-a="mat-del-confirm" data-id="${subjectId}" data-name="${esc(f.name)}" ${state.materialesDeleteStatus==="deleting"?"disabled":""}>Sí, borrar</button>
      <button class="chip" data-a="mat-del-cancel">Cancelar</button>`}
  </div>`;
}

function vMaterialUploadRow(subjectId, unitId, inputId, blocked, uploading){
  return `<div class="frow" style="margin-top:8px;align-items:flex-end">
    <div class="field"><div class="flabel">Subir archivo (máx. ${fmtBytes(MATERIAL_MAX_BYTES)})</div>
      <input type="file" id="${inputId}" ${blocked||uploading?"disabled":""}></div>
    <button class="chip" data-a="mat-upload" data-id="${subjectId}" data-unit="${unitId||""}" data-input="${inputId}" style="margin-bottom:2px" ${blocked||uploading?"disabled":""}>${uploading?"Subiendo…":"+ Subir"}</button>
  </div>`;
}

// Biblioteca desplegable (paso 174): "General" y cada unidad arrancan cerradas (sólo título +
// contador) y se abre de a una — mismo patrón visual que vCuentaGroup(), pero con su propio
// estado (materialesUnitOpenId) porque acá sólo tiene sentido una abierta por vez, no varias
// independientes. "Ver materiales de esta unidad" (mat-jump-unit, arriba en vUnitRow) sigue
// forzando la apertura de su unidad como antes, ahora también contra este estado.
function vMatUnitBlock(subjectId, unitId, label, items, bodyHtml, uploadHtml){
  const jumping = state.materialesJumpUnitId===unitId;
  const open = jumping || state.materialesUnitOpenId===unitId;
  return `<div class="cuenta-group" style="margin:10px 0${jumping?";border-color:var(--accent);border-width:2px":""}" id="mat-unit-${unitId||"general"}">
    <button class="cuenta-group-head" data-a="mat-unit-toggle" data-unit="${unitId}" aria-expanded="${open}">
      <div><div class="ftitle" style="margin-bottom:2px">${esc(label)}</div>
        <div class="hint">${items.length} archivo${items.length===1?"":"s"}</div></div>
      <span class="faq-caret ${open?"open":""}">${ICON_CHEVRON}</span>
    </button>
    ${open?`<div class="cuenta-group-body">${bodyHtml}${uploadHtml}</div>`:""}
  </div>`;
}

function vMateriales(subjectId){
  let h = `<div class="formcard" id="materiales-block"><div class="ftitle" style="display:flex;align-items:center;gap:8px">${subjectDot(subjectId)}Materiales</div>`;
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

  const m=subjById(subjectId);
  const units=(m&&m.units)||[];
  const unitOptions=flattenUnitOptions(units);
  const mode = units.length ? (state.materialesMode||"general") : "general";
  if(units.length){
    h += `<div style="display:flex;gap:6px;margin-bottom:10px">
      <button class="chip ${mode==="general"?"on":""}" data-a="mat-mode-general">General</button>
      <button class="chip ${mode==="unidad"?"on":""}" data-a="mat-mode-unidad">Por unidad</button>
    </div>`;
  }
  if(state.materialesUploadError) h += `<div class="saveerr" style="margin-bottom:8px">${esc(state.materialesUploadError)}</div>`;
  const full = list.length>=MATERIAL_MAX_COUNT;
  const totalFull = totalBytes>=MATERIAL_MAX_TOTAL_BYTES;
  const blocked = full||totalFull;

  if(list.length===0){
    h += emptyState(ICON_BOOK,"Sin materiales todavía","Subí guías, resúmenes o ejercicios con el botón de abajo — quedan disponibles en cualquier dispositivo.");
    h += vMaterialUploadRow(subjectId, "", "mat-file-general", blocked, state.materialesUploading);
  } else if(mode==="general"){
    h += list.map(f=>vMaterialRow(subjectId, f, unitOptions)).join("");
    h += vMaterialUploadRow(subjectId, "", "mat-file-general", blocked, state.materialesUploading);
  } else {
    const enUnidad=(f)=>{ const e=materialIndexEntry(subjectId,f.name); return (e&&e.unitId)||""; };
    const generales = list.filter(f=>!enUnidad(f));
    h += vMatUnitBlock(subjectId, "", "General", generales,
      generales.length ? generales.map(f=>vMaterialRow(subjectId, f, unitOptions)).join("") : `<div class="empty" style="font-size:13px">Sin materiales generales.</div>`,
      vMaterialUploadRow(subjectId, "", "mat-file-general", blocked, state.materialesUploading));
    units.forEach(u=>{
      const items=list.filter(f=>enUnidad(f)===u.id);
      h += vMatUnitBlock(subjectId, u.id, u.nombre, items,
        items.length ? items.map(f=>vMaterialRow(subjectId, f, unitOptions)).join("") : `<div class="empty" style="font-size:13px">Sin materiales en esta unidad.</div>`,
        vMaterialUploadRow(subjectId, u.id, "mat-file-"+u.id, blocked, state.materialesUploading));
    });
  }
  h += `${full?`<div class="hint" style="margin-top:6px">Llegaste al máximo de ${MATERIAL_MAX_COUNT} archivos para esta materia.</div>`:""}
  ${!full&&totalFull?`<div class="hint" style="margin-top:6px">Llegaste al máximo de ${fmtBytes(MATERIAL_MAX_TOTAL_BYTES)} entre todas tus materias.</div>`:""}
  </div>`;
  return h;
}
