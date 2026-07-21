"use strict";
/* ============ portal.js — página pública para alumnos invitados ============
   Standalone a propósito: nada de sesión, nada de localStorage, sin compartir estado ni
   scripts con el resto de la app (ver el split en config.js/helpers.js/etc. para la app
   propiamente dicha). Duplica SUPA_URL/SUPA_ANON_KEY porque este archivo no carga config.js
   — son constantes públicas igual, ver CLAUDE.md. Lee ?k=LLAVE y llama a la RPC pública
   portal_publico() (migración 013_portal.sql), que nunca expone el token ni el user_id. */
// Backend por entorno (paso 193) — mismo criterio que config.js: localhost usa el proyecto de
// desarrollo salvo ?backend=prod (con confirmación); cualquier otro host usa producción.
const SUPA_PROD = { url:"https://iwxsntxkqfqucxhwlfdv.supabase.co", anonKey:"sb_publishable_S0zs9qmIRB5RWNZceO5gCg_vI7Hxx1D" };
const SUPA_DEV = { url:"https://anubpgvuptyxnbagnkxa.supabase.co", anonKey:"sb_publishable_RkC2wsv0m5mYBHX2soHDpw_nx-clEvq" };
const IS_LOCALHOST = (location.hostname==="localhost" || location.hostname==="127.0.0.1");
function usaBackendDev(){
  if(!IS_LOCALHOST) return false;
  if(new URLSearchParams(location.search).get("backend")==="prod"){
    return !confirm("¿Usar el backend de PRODUCCIÓN desde localhost? Vas a leer datos reales. Cancelar para seguir en el backend de desarrollo.");
  }
  return true;
}
const IS_BACKEND_DEV = usaBackendDev();
const SUPA_URL = IS_BACKEND_DEV ? SUPA_DEV.url : SUPA_PROD.url;
const SUPA_ANON_KEY = IS_BACKEND_DEV ? SUPA_DEV.anonKey : SUPA_PROD.anonKey;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function showMsg(big, small){
  document.getElementById("app").innerHTML =
    `<div class="msg"><div class="big">${esc(big)}</div>${small?`<div class="small">${esc(small)}</div>`:""}</div>`;
}

// Duplicado de fmtMoney (helpers.js) — portal.js es standalone y no lo carga (ver el comentario
// de SUPA_URL arriba).
function fmtMoneyPortal(n){ return "$" + Math.round(Number(n)||0).toLocaleString("es-AR"); }
function fmtBytes(n){
  n = Number(n) || 0;
  if(n < 1024) return n + " B";
  if(n < 1024*1024) return (n/1024).toFixed(1) + " KB";
  return (n/1024/1024).toFixed(1) + " MB";
}
function fmtDate(ts){
  if(!ts) return "";
  try{ return new Date(ts).toLocaleDateString("es-AR", {day:"numeric", month:"short"}); }
  catch(e){ return ""; }
}
// Fecha guardada como "YYYY-MM-DD" (ver buildAlumnoBlock en sync.js) — mediodía local para no
// pisar el día por husos horarios, mismo criterio que fmtDate()/daysTo() del lado de la app.
function fmtDiaLocal(ds){
  if(!ds) return "";
  try{ return new Date(ds+"T12:00:00").toLocaleDateString("es-AR", {day:"numeric", month:"short"}); }
  catch(e){ return ds; }
}
// Colores/etiquetas de cada estado de unidad, duplicados acá (no cargamos config.js: portal.js
// es standalone) — mismo criterio que SUPA_URL/SUPA_ANON_KEY más arriba.
// Color por materia (ver SUBJECT_COLOR_KEYS/subjectColorKey en config.js/helpers.js) — portal.js
// no carga esos archivos (es standalone), así que sólo necesita el color final (m.color, ya
// resuelto por la app antes de publicar, ver publicarPortal() en sync.js) y los mismos tokens
// --subj-*-fg duplicados en portal.html (mismo criterio que SUPA_URL/SUPA_ANON_KEY más arriba).
const SUBJECT_COLOR_FALLBACK = "slate";
// color: texto sobre el card por defecto — usa los tokens --subj-*-fg (ya pensados para
// leerse bien en ambos temas) en vez de --blue/--amber/--green planos, que sobre --card no
// llegan a 4.5:1 (paso 75).
const TOPIC_BAR_META = {
  pendiente:{pct:6, label:"Pendiente", color:"var(--faint)"},
  visto:{pct:35, label:"Visto", color:"var(--subj-blue-fg)"},
  practica:{pct:65, label:"En práctica", color:"var(--subj-amber-fg)"},
  parcial:{pct:100, label:"Nivel parcial", color:"var(--subj-green-fg)"},
  noentra:{pct:100, label:"No entra", color:"var(--faint)"},
};
// Bloque personal de un alumno con llave individual (ver buildAlumnoBlock en sync.js) — trae los
// campos que el docente tildó explícitamente en la ficha, más "pendiente" (paso 141, siempre
// presente, es sólo la deuda propia de este alumno); nunca notas, señas ni comentarios privados
// (eso ni siquiera sale de la app, ver el comentario en esa función).
// Ícono de saludo, mismo set de línea que la app (ICON_WAVE en views-core.js) — duplicado acá
// porque portal.js es standalone y no carga ese archivo (ver el comentario de SUPA_URL arriba).
const ICON_WAVE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V6a1.8 1.8 0 0 1 3.6 0v5"/><path d="M11.6 11V4.6a1.8 1.8 0 0 1 3.6 0V11"/><path d="M15.2 11V6.4a1.8 1.8 0 0 1 3.6 0V15c0 4-2.5 7-6.8 7-3 0-4.6-1-6-2.7L3 15.4c-.6-.9-.4-2 .5-2.6.8-.5 1.8-.3 2.4.4L8 15.5"/></svg>`;
// "No puedo ir" (paso 172): con llave individual, y sólo si el docente activó "Cancelar desde el
// portal" (encendido por defecto — ver cancelarClaseHabilitado, que sí llega apagado en un
// portal_publico() viejo sin el campo, por eso el default se resuelve acá, no en el backend), cada
// clase de "Próximas clases" es tocable y abre un mini-formulario en el lugar (sin navegar a
// ningún lado) con motivo opcional. Viaja por la RPC pública cancelar_clase_portal() (migración
// 025_cancelacion_portal.sql en cuaderno-supabase, misma tabla solicitudes_clase del paso 160,
// con tipo/kind/source_id nuevos) — mismo criterio de seguridad que el resto del portal (nunca
// expone token/user_id) y con su propio rate limit de 3 avisos por llave por día. La clase NO se
// cancela sola: queda "pedida" hasta que el docente la acepta o rechaza desde el Tablero.
function solicitudCancelFor(solicitudes, c){
  return (solicitudes||[]).find(s=>s.tipo==="cancelacion" && s.kind===c.kind && s.sourceId===c.sourceId && s.fecha===c.origDate) || null;
}
function cancelEstadoHtml(sol){
  if(sol.estado==="confirmada") return `<div class="pmeta" style="color:var(--subj-green-fg);margin-top:4px">Cancelación aceptada por tu profesor.</div>`;
  if(sol.estado==="rechazada") return `<div class="pmeta" style="color:var(--red-fg);margin-top:4px">Rechazada — seguí en contacto con tu docente.</div>`;
  return `<div class="pmeta" style="margin-top:4px">Avisaste que no podés ir — esperando que tu profesor lo confirme.</div>`;
}
function proximasClasesHtml(alumno, cancelarHabilitado, politica){
  const list = alumno.proximasClases||[];
  if(list.length===0){
    return `<div class="prow"><div class="plabel">Próximas clases</div><div class="pempty">Sin clases agendadas por ahora.</div></div>`;
  }
  const filas = list.map((c,i)=>{
    const idx = "pc"+i;
    const sol = solicitudCancelFor(alumno.solicitudes, c);
    let acciones = "";
    if(sol){
      acciones = cancelEstadoHtml(sol);
    }else if(cancelarHabilitado){
      acciones = `<button type="button" class="dl" data-a="clase-cancel-open" data-idx="${idx}" style="margin-left:8px">No puedo ir</button>
        <div class="cancel-panel" id="cancel-panel-${idx}" hidden data-kind="${esc(c.kind)}" data-sourceid="${esc(c.sourceId)}" data-fecha="${esc(c.origDate)}" data-hora="${esc(c.time)}">
          ${politica?`<div class="pmeta" style="margin:6px 0">Ojo: ${esc(politica)}</div>`:""}
          <textarea class="pinput" id="cancel-motivo-${idx}" maxlength="200" placeholder="Motivo (opcional)" rows="2"></textarea>
          <div style="display:flex;gap:8px;margin-top:6px">
            <button type="button" class="dl" data-a="clase-cancel-confirm" data-idx="${idx}">Sí, no puedo ir</button>
            <button type="button" class="dl" data-a="clase-cancel-back" data-idx="${idx}">Volver</button>
          </div>
          <div class="pmeta" id="cancel-msg-${idx}" style="margin-top:4px"></div>
        </div>`;
    }
    return `<div class="pvalue"${i>0?' style="margin-top:10px"':''}>${fmtDiaLocal(c.date)} a las ${esc(c.time)} (${Number(c.duration)||60} min)${acciones}
      ${c.link?`<div style="margin-top:4px"><a class="dl" target="_blank" rel="noopener" href="${esc(c.link)}">Entrar a la clase</a></div>`:""}
    </div>`;
  }).join("");
  return `<div class="prow"><div class="plabel">Próximas clases</div>${filas}</div>`;
}
function cancelClaseErrorMsg(err){
  if(err==="rate_limit") return "Ya avisaste el máximo de cancelaciones por hoy — probá de nuevo mañana.";
  if(err==="disabled") return "Tu profesor desactivó los avisos de cancelación por ahora.";
  if(err==="not_found") return "Esa clase ya no está disponible — refrescá la página.";
  return "No se pudo enviar el aviso — probá de nuevo.";
}
function wireCancelUi(llave){
  document.querySelectorAll('[data-a="clase-cancel-open"]').forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const panel=document.getElementById("cancel-panel-"+btn.dataset.idx);
      if(panel) panel.hidden=false;
      btn.hidden=true;
    });
  });
  document.querySelectorAll('[data-a="clase-cancel-back"]').forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx=btn.dataset.idx;
      const panel=document.getElementById("cancel-panel-"+idx);
      if(panel) panel.hidden=true;
      const openBtn=document.querySelector(`[data-a="clase-cancel-open"][data-idx="${idx}"]`);
      if(openBtn) openBtn.hidden=false;
    });
  });
  document.querySelectorAll('[data-a="clase-cancel-confirm"]').forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const idx=btn.dataset.idx;
      const panel=document.getElementById("cancel-panel-"+idx);
      const motivoEl=document.getElementById("cancel-motivo-"+idx);
      const msg=document.getElementById("cancel-msg-"+idx);
      btn.disabled=true; msg.textContent="Enviando…";
      try{
        const r=await fetch(SUPA_URL+"/rest/v1/rpc/cancelar_clase_portal", {
          method:"POST",
          headers:{apikey:SUPA_ANON_KEY, Authorization:"Bearer "+SUPA_ANON_KEY, "Content-Type":"application/json"},
          body: JSON.stringify({llave, p_kind:panel.dataset.kind, p_source_id:panel.dataset.sourceid,
            p_fecha:panel.dataset.fecha, p_hora:panel.dataset.hora, p_motivo:(motivoEl.value||"").trim()}),
        });
        if(!r.ok) throw new Error("error "+r.status);
        const res=await r.json();
        if(!res || !res.ok){ msg.textContent=cancelClaseErrorMsg(res&&res.error); btn.disabled=false; return; }
        msg.textContent="¡Avisado! Tu profesor lo va a confirmar pronto.";
        setTimeout(()=>init(), 1200); // recarga el portal para mostrar el estado en la clase
      }catch(e){
        msg.textContent="No se pudo enviar el aviso — probá de nuevo.";
        btn.disabled=false;
      }
    });
  });
}
function personalHtml(alumno, cancelarHabilitado, politica){
  let h = `<div class="card personal"><div class="hello">Hola, ${esc(alumno.nombre||"")} <span class="icon-inline">${ICON_WAVE}</span></div>`;
  // proximasClases (paso 172, lista completa) reemplaza a proximaClase (singular) cuando está
  // presente — cae al singular de siempre si el portal públicado todavía no la trae (cache
  // vieja de antes de este paso, ver el comentario de proximasClasesFor en helpers.js).
  if(Array.isArray(alumno.proximasClases)){
    h += proximasClasesHtml(alumno, cancelarHabilitado, politica);
  }else if("proximaClase" in alumno){
    const pc = alumno.proximaClase;
    h += `<div class="prow"><div class="plabel">Próxima clase</div>
      ${pc ? `<div class="pvalue">${fmtDiaLocal(pc.date)} a las ${esc(pc.time)} (${Number(pc.duration)||60} min)
          ${pc.link ? `<div style="margin-top:6px"><a class="dl" target="_blank" rel="noopener" href="${esc(pc.link)}">Entrar a la clase</a></div>` : ""}</div>`
           : `<div class="pempty">Sin clases agendadas por ahora.</div>`}
    </div>`;
  }
  if("tarea" in alumno){
    const t = alumno.tarea;
    h += `<div class="prow"><div class="plabel">Tarea de la última clase</div>
      ${t && t.nota ? `<div class="pvalue">${esc(t.nota)}<div class="pmeta">${fmtDiaLocal(t.date)}</div></div>`
                     : `<div class="pempty">Sin tareas registradas.</div>`}
    </div>`;
  }
  if("avance" in alumno){
    const avance = alumno.avance||[];
    h += `<div class="prow"><div class="plabel">Avance por unidades</div>`;
    h += avance.length===0 ? `<div class="pempty">Todavía no hay unidades cargadas.</div>` : avance.map(it=>{
      const m = TOPIC_BAR_META[it.estado] || TOPIC_BAR_META.pendiente;
      return `<div class="unitrow">
        <div class="unitname">${esc(it.unidad)}</div>
        <div class="unitbarwrap">
          <div class="unitbar" role="progressbar" aria-label="${esc(it.unidad)}" aria-valuenow="${m.pct}" aria-valuemin="0" aria-valuemax="100"><div class="unitfill" style="width:${m.pct}%;background:${m.color}"></div></div>
          <div class="unitstate" style="color:${m.color}">${m.label}</div>
        </div>
      </div>`;
    }).join("");
    h += `</div>`;
  }
  return h + `</div>`;
}
// Desglose de pendienteDesgloseFor() (sync.js) por origen — sólo lista los tipos que tienen algo
// (paso 171), para que el alumno entienda de qué se compone el total sin ver ceros de más.
function pendienteDesgloseHtml(d){
  if(!d) return "";
  const rows=[];
  if(d.clase>0) rows.push(`Clases sin cobrar: ${fmtMoneyPortal(d.clase)}`);
  if(d.mensual>0) rows.push(`Mensualidad: ${fmtMoneyPortal(d.mensual)}`);
  if(d.senia>0) rows.push(`Señas: ${fmtMoneyPortal(d.senia)}`);
  if(rows.length<2) return "";
  return `<div class="pmeta" style="margin-top:2px">${rows.map(esc).join(" · ")}</div>`;
}
// Pie "pagada ✓ / pendiente" de las últimas clases (paso 171, historialClasesPortal() en
// helpers.js): sólo llega con modalidad "clase"/"hora" (mensual no se cobra clase por clase, ver
// esa función) — para que el alumno vea de dónde sale el saldo que muestra arriba.
function historialClasesHtml(list){
  if(!Array.isArray(list) || list.length===0) return "";
  return `<div class="prow"><div class="plabel">Últimas clases</div>` +
    list.map(c=>`<div class="pvalue">${fmtDiaLocal(c.date)} — <span style="color:${c.cobrada?"var(--subj-green-fg)":"var(--red-fg)"}">${c.cobrada?"Pagada ✓":"Pendiente"}</span></div>`).join("") +
    `</div>`;
}
// Deuda ESTIMADA en vivo (paso 196): de las clases ya publicadas en proximasClases/misClases que
// ya terminaron — comparado contra la hora real de quien mira el portal, no la del último publish
// del docente, así que aparece sin esperar a que el docente vuelva a sincronizar. alumno.tarifaClase
// sólo viaja cuando hace falta (ver buildAlumnoBlock en sync.js); sin ella no hay nada que estimar
// (modalidad "mensual" nunca la manda: no genera deuda por clase suelta).
function claseYaTerminoPortal(c){
  const inicio = new Date(c.date+"T"+(c.time||"00:00")+":00");
  const fin = new Date(inicio.getTime() + (Number(c.duration)||60)*60000);
  return fin <= new Date();
}
function montoEstimadoPortal(tarifaClase, duration){
  return tarifaClase.modalidad==="hora" ? Math.round(tarifaClase.tarifa*(Number(duration)||60)/60) : tarifaClase.tarifa;
}
function clasesEstimadasPortal(alumno){
  if(!alumno.tarifaClase) return [];
  const vistos = new Set();
  const out = [];
  [...(alumno.proximasClases||[]), ...(alumno.misClases||[])].forEach(c=>{
    const key = c.date+"|"+c.time;
    if(vistos.has(key) || !claseYaTerminoPortal(c)) return;
    vistos.add(key);
    out.push({date:c.date, monto: montoEstimadoPortal(alumno.tarifaClase, c.duration)});
  });
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}
// Pagos (paso 141): sólo con llave individual — pendiente es SIEMPRE del propio alumno (nunca de
// otro, ver buildAlumnoBlock en sync.js) y "cobros" es el bloque de medios de pago del docente
// (alias/links/QR, ver publicarPortal en sync.js), que el backend (portal_publico()) sólo debe
// entregar cuando res.tipo==="alumno" — con llave grupal o general esto no se muestra nunca.
// Paso 171: cuando hay deuda, esta tarjeta se ubica arriba de todo (ver showPortal) y se destaca
// con ".deuda" — antes el alumno podía no enterarse de que debía nada hasta abrir "Pagos".
function pagosHtml(alumno, cobros, nombreDocente){
  const estimadas = clasesEstimadasPortal(alumno);
  const totalEstimadas = estimadas.reduce((a,c)=>a+c.monto,0);
  if(typeof alumno.pendiente!=="number" && !cobros && !estimadas.length) return "";
  const total = (Number(alumno.pendiente)||0) + totalEstimadas;
  const debe = total>0;
  let h = `<div class="card${debe?" deuda":""}"><div class="ctitle">${debe?"Tenés pagos pendientes":"Pagos"}</div>`;
  h += `<div class="prow"><div class="plabel">${debe?"Total pendiente":"Pendiente"}</div>`;
  h += debe
    ? `<div class="pvalue" style="color:var(--red-fg);font-size:19px;font-weight:700">${fmtMoneyPortal(total)}</div>${pendienteDesgloseHtml(alumno.pendienteDesglose)}`
    : `<div class="pempty">Estás al día ✓</div>`;
  h += `</div>`;
  if(estimadas.length){
    h += `<div class="prow"><div class="plabel">A confirmar</div>` +
      estimadas.map(c=>`<div class="pvalue">Clase del ${esc(DIAS_CORTOS[weekdayIdxLocal(c.date)].toLowerCase())} ${Number(c.date.slice(8,10))} — a confirmar por tu docente <span class="pmeta">${fmtMoneyPortal(c.monto)}</span></div>`).join("") +
    `</div>`;
  }
  if(cobros){
    h += `<div class="prow"><div class="plabel">Formas de pagarle a ${esc(nombreDocente||"tu profesor")}</div>`;
    const btns=[];
    if(cobros.linkMP) btns.push(`<a class="dl" target="_blank" rel="noopener" href="${esc(cobros.linkMP)}">Pagar con Mercado Pago</a>`);
    if(cobros.linkOtro) btns.push(`<a class="dl" target="_blank" rel="noopener" href="${esc(cobros.linkOtro)}">Otro medio de pago</a>`);
    if(btns.length) h += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">${btns.join("")}</div>`;
    if(cobros.alias) h += `<div class="pvalue" style="margin-top:8px">Alias/CVU: <b>${esc(cobros.alias)}</b>
      <button type="button" class="dl" id="copy-alias-btn" data-alias="${esc(cobros.alias)}" style="margin-left:6px">Copiar</button></div>`;
    if(cobros.qr && cobros.qr.url) h += `<div style="margin-top:10px"><img src="${esc(cobros.qr.url)}" alt="Código QR para pagar" style="max-width:200px;border-radius:8px"></div>`;
    h += `</div>`;
  }
  h += historialClasesHtml(alumno.historialClases);
  return h + `</div>`;
}
// Promos (paso 176): packs de catálogo que el docente marcó "Mostrar en el portal" (ver
// publicarPortal() en sync.js, campo publicado.promos) — sólo informa precio/cantidad, no vende
// ni reserva nada; el alumno sigue coordinando la compra con su docente como siempre.
function promosHtml(promos){
  if(!Array.isArray(promos) || promos.length===0) return "";
  return `<div class="card"><div class="ctitle">Promos</div>` +
    promos.map(p=>`<div class="prow"><div class="plabel">${esc(p.nombre||"Pack")}</div>
      <div class="pvalue">${Number(p.cantidad)||0} clases — ${fmtMoneyPortal(p.precio)}</div>
      ${p.vigenciaTexto?`<div class="filemeta">${esc(p.vigenciaTexto)}</div>`:""}
    </div>`).join("") + `</div>`;
}
// Bloque de una llave GRUPAL (ver buildGrupoBlock en sync.js): próximas clases/exámenes del
// grupo, siempre fechas sueltas sin nombre de alumno — jamás notas, pagos ni avance individual.
function grupoHtml(grupo){
  let h = `<div class="card grupo"><div class="ctitle">${esc(grupo.materia||"")}</div>`;
  const clases = grupo.proximasClases||[];
  h += `<div class="prow"><div class="plabel">Próximas clases del grupo</div>`;
  h += clases.length===0 ? `<div class="pempty">Sin clases agendadas por ahora.</div>`
    : clases.map(c=>`<div class="pvalue">${fmtDiaLocal(c.date)} a las ${esc(c.time)} (${Number(c.duration)||60} min)</div>`).join("");
  h += `</div>`;
  const examenes = grupo.proximosExamenes||[];
  h += `<div class="prow"><div class="plabel">Próximos exámenes del grupo</div>`;
  h += examenes.length===0 ? `<div class="pempty">Sin exámenes agendados por ahora.</div>`
    : examenes.map(d=>`<div class="pvalue">${fmtDiaLocal(d)}</div>`).join("");
  return h + `</div></div>`;
}
// Una fila de archivo suelta (paso 128: reusada tanto sin agrupar por unidad como dentro de
// cada sub-grupo de unidad, ver unitGroupsHtml más abajo).
function fileRowHtml(it){
  return `<div class="file">
    <div class="filemain">${esc(it.nombre)}<div class="filemeta">${fmtBytes(it.bytes)}${it.at?" · "+fmtDate(it.at):""}</div></div>
    <a class="dl" href="${esc(it.url)}" target="_blank" rel="noopener">Descargar</a>
  </div>`;
}
// Sub-agrupa los materiales de una materia por unidad (paso 128) — unitNombre/unitOrden vienen
// denormalizados al publicar (ver publicarPortal()/republishGrupoBlock() en sync.js), porque el
// portal es standalone y no tiene acceso a catalog.subjects para resolver un unitId en vivo.
// "General" (materiales sin unidad enlazada) va primero, después cada unidad en el orden del
// catálogo (unitOrden) — mismo orden que ve el docente en Materias.
// Acordeón (paso 174): cada unidad (y "General") arranca cerrada, sólo título + contador, y se
// abre de a una — <details name="unitacc-<materia>"> agrupa por materia así el navegador ya
// fuerza "una por vez" solo (soporte nativo moderno, sin JS extra para eso). openUnitKey guarda
// cuál quedó abierta por materia para que sobreviva a los re-render de bibliotecaHtml() al
// tipear en el buscador (que si no, reconstruye el HTML de cero y las cerraría todas de nuevo);
// se actualiza con el listener "toggle" delegado en init() (evento que no burbujea, por eso va
// con capture:true en el document).
const openUnitKey = {};
function unitGroupsHtml(files, subjectKey){
  const generales = files.filter(it=>!it.unitNombre);
  const porUnidad = new Map();
  files.forEach(it=>{
    if(!it.unitNombre) return;
    if(!porUnidad.has(it.unitNombre)) porUnidad.set(it.unitNombre, {orden: it.unitOrden==null?9999:it.unitOrden, files:[]});
    porUnidad.get(it.unitNombre).files.push(it);
  });
  const grupos=[...porUnidad.entries()].sort((a,b)=>a[1].orden-b[1].orden);
  const openKey = openUnitKey[subjectKey];
  const block=(key,label,items)=>`<details class="unitgroup" name="unitacc-${esc(subjectKey)}" data-key="${esc(key)}" data-subject="${esc(subjectKey)}" ${openKey===key?"open":""}>
    <summary class="unitgroupname">${esc(label)} <span class="unitgroupcount">${items.length} archivo${items.length===1?"":"s"}</span></summary>
    ${items.map(fileRowHtml).join("")}
  </details>`;
  let h="";
  if(generales.length) h += block("__general__","General",generales);
  grupos.forEach(([nombre,g])=>{ h += block(nombre,nombre,g.files); });
  return h;
}
// El evento "toggle" de <details> no burbujea, así que este listener va en el document con
// capture:true (ahí sí lo intercepta camino al target) — se declara una sola vez al cargar el
// script, no adentro de showPortal()/init() (que sí se re-ejecutan), para no duplicarlo.
document.addEventListener("toggle", (e)=>{
  const d=e.target;
  if(!d || !d.classList || !d.classList.contains("unitgroup")) return;
  const subjectKey=d.dataset.subject||"", key=d.dataset.key||"";
  if(d.open) openUnitKey[subjectKey]=key;
  else if(openUnitKey[subjectKey]===key) openUnitKey[subjectKey]=null;
}, true);
// Agrupa por materia y arma la sección de Biblioteca (primera y bien visible: es la sección
// principal del portal). filtro filtra por materia+nombre de archivo, case-insensitive. Dentro
// de cada materia, si hay al menos un archivo con unidad denormalizada se sub-agrupa por unidad
// (unitGroupsHtml); si la materia no tiene unidades cargadas, se muestra la lista plana de
// siempre.
function bibliotecaHtml(items, filtro){
  const f = (filtro||"").trim().toLowerCase();
  const filtered = f ? items.filter(it =>
    (it.materia||"").toLowerCase().includes(f) || (it.nombre||"").toLowerCase().includes(f)) : items;
  if(filtered.length===0){
    return f ? `<div class="empty">Ningún archivo coincide con «${esc(filtro)}».</div>`
             : `<div class="empty">Todavía no hay materiales compartidos.</div>`;
  }
  const bySubject = new Map();
  filtered.forEach(it=>{
    const key = it.materia || "Sin materia";
    if(!bySubject.has(key)) bySubject.set(key, {color:it.color||SUBJECT_COLOR_FALLBACK, files:[]});
    bySubject.get(key).files.push(it);
  });
  return [...bySubject.entries()].map(([materia, group])=>{
    const hasUnits = group.files.some(it=>it.unitNombre);
    const filesHtml = hasUnits ? unitGroupsHtml(group.files, materia) : group.files.map(fileRowHtml).join("");
    return `
    <div class="subject">
      <div class="subjectname"><span class="subj-dot" style="background:var(--subj-${group.color}-fg)"></span>${esc(materia)}</div>
      ${filesHtml}
    </div>`;
  }).join("");
}
// Barras de avance que crecen al entrar en pantalla (paso 100) — mismo criterio que
// observeGrowBars() en la app (events.js), pero standalone: portal.js no la carga.
function observeUnitBars(){
  const bars = document.querySelectorAll(".unitfill:not(.in)");
  if(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    bars.forEach(el=>el.classList.add("in"));
    return;
  }
  if(!window.IntersectionObserver){ bars.forEach(el=>el.classList.add("in")); return; }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, {threshold:.2});
  bars.forEach(el=>io.observe(el));
}
// Avisos (paso 105): mensajes cortos del docente, arriba de todo — el filtrado por destino
// (todos/materia/alumno puntual) ya viene resuelto del backend según la llave usada
// (portal_publico()), portal.js sólo los pinta como vienen, nunca decide a quién le corresponde
// cada uno (esa decisión tiene que ser del servidor, no del cliente, para no poder filtrarla).
function avisosHtml(list){
  if(!Array.isArray(list) || list.length===0) return "";
  return list.map(a=>`<div class="card aviso">
    <div class="avisotxt">${esc(a.texto)}</div>
    <div class="avisofecha">${fmtDiaLocal(a.fecha)}</div>
  </div>`).join("");
}
// "Reservá una clase" (pasos 160/173, unificados en el 199): sólo existe con llave individual y
// sólo si el docente activó "Pueden pedir clases" en Cuenta → Portal — en ese caso res.huecos es
// un array (posiblemente vacío); si lo tiene apagado, portal_publico() ni siquiera manda la clave
// "huecos" (queda undefined/null), así que esta sección no se muestra. Se dibuja como una agenda
// semanal (agrupada por día, mismo criterio que "Tu clase" de siempre): cada hueco libre es un
// botón que, al tocarlo, abre un popup de confirmación en el lugar — CON fecha/hora/duración y la
// política de cancelación si el docente cargó una — y nada se manda hasta tocar "Confirmar". El
// pedido SIEMPRE queda "Pendiente de confirmación" (nunca se agenda solo, ver pedir_clase_portal()
// en 030_pedido_confirmacion.sql) hasta que el docente lo acepta (pasa a "Confirmada ✓") o
// responde sin confirmar (el texto de la respuesta, si el docente escribió uno, se ve acá mismo).
// res.alumno.solicitudes trae los últimos pedidos de ESTE alumno (más recientes primero) para
// mostrar su estado al refrescar la página — no hay actualización en vivo, es la misma limitación
// que ya tiene el resto del portal (sin sesión ni websockets, sólo lo que trajo portal_publico()
// al cargar).
function solicitudesPedidoFor(alumno){
  return ((alumno && alumno.solicitudes) || []).filter(s=>(s.tipo||"pedido")!=="cancelacion");
}
function pedidoEstadoHtml(sol){
  if(sol.estado==="confirmada") return `<span class="rmine" style="color:var(--subj-green-fg)">${esc(sol.hora)} — Confirmada ✓</span>`;
  if(sol.estado==="rechazada") return `<span class="rmine" style="color:var(--red-fg)">${esc(sol.hora)} — ${sol.motivo?esc(sol.motivo):"No disponible"}</span>`;
  return `<span class="rmine">${esc(sol.hora)} — Pendiente de confirmación</span>`;
}
// Día corto para la agenda semanal de reserva (paso 173) — mismo orden 0=Lunes..6=Domingo que
// weekdayIdx() en helpers.js; duplicado acá porque portal.js es standalone y no lo carga (mismo
// criterio que SUPA_URL/SUPA_ANON_KEY más arriba).
const DIAS_CORTOS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
function weekdayIdxLocal(ds){ return (new Date(ds+"T12:00:00").getDay()+6)%7; }
function reservaHtml(alumno, huecos){
  if(!Array.isArray(huecos)) return "";
  const solicitudes = solicitudesPedidoFor(alumno);
  const porDia = new Map();
  const ensure = d => { if(!porDia.has(d)) porDia.set(d, {libres:[], mias:[], pedidas:[]}); return porDia.get(d); };
  huecos.forEach(hu=>ensure(hu.date).libres.push(hu.time));
  (alumno.misClases||[]).forEach(c=>ensure(c.date).mias.push(c.time));
  solicitudes.forEach(sol=>ensure(sol.fecha).pedidas.push(sol));
  const dias = [...porDia.keys()].sort();
  let h = `<div class="card"><div class="ctitle">Reservá una clase</div>
    <div class="pmeta" style="margin-bottom:8px">Tocá un horario libre para pedirlo — queda pendiente hasta que tu profesor lo confirme.</div>`;
  if(dias.length===0){
    return h + `<div class="pempty">No hay horarios libres por ahora — probá más tarde.</div></div>`;
  }
  h += `<div class="rsem">` + dias.map(d=>{
    const info = porDia.get(d);
    const libresHtml = [...info.libres].sort().map(t=>
      `<button type="button" class="dl rslot" data-a="reserva-slot-pick" data-fecha="${esc(d)}" data-hora="${esc(t)}">${esc(t)}</button>`).join("");
    const miasHtml = [...info.mias].sort().map(t=>`<span class="rmine">Tu clase ${esc(t)}</span>`).join("");
    const pedidasHtml = [...info.pedidas].sort((a,b)=>a.hora.localeCompare(b.hora)).map(pedidoEstadoHtml).join("");
    return `<div class="rsemday">
      <div class="rsemdate">${esc(DIAS_CORTOS[weekdayIdxLocal(d)])} ${fmtDiaLocal(d)}</div>
      <div class="rsemslots">${libresHtml}${miasHtml}${pedidasHtml}${(!info.libres.length && !info.mias.length && !info.pedidas.length)?'<span class="pempty">—</span>':""}</div>
    </div>`;
  }).join("") + `</div>
    <div id="reserva-confirm-area"></div>
    <div id="reserva-msg" class="pmeta" style="margin-top:8px"></div>`;
  return h + `</div>`;
}
function reservaErrorMsg(err){
  if(err==="rate_limit") return "Ya pediste el máximo de clases por hoy — probá de nuevo mañana.";
  if(err==="disabled") return "Tu profesor desactivó los pedidos de clase por ahora.";
  if(err==="slot_unavailable") return "Ese horario se acaba de pedir — elegí otro.";
  return "No se pudo enviar el pedido — probá de nuevo.";
}
// Popup de confirmación (paso 199): reveal-in-place bajo la grilla (mismo criterio que el panel de
// "No puedo ir", ver wireCancelUi más abajo) — nada se manda al tocar un hueco, sólo se muestra el
// detalle + la política de cancelación (si hay) con Confirmar/Cancelar. Sólo uno abierto a la vez
// (reemplaza el contenido de #reserva-confirm-area).
function wireReserva(llave, politica){
  const slots = document.querySelectorAll('[data-a="reserva-slot-pick"]');
  if(!slots.length) return;
  const area = document.getElementById("reserva-confirm-area");
  const msg = document.getElementById("reserva-msg");
  slots.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const fecha = btn.dataset.fecha, hora = btn.dataset.hora;
      if(msg) msg.textContent = "";
      area.innerHTML = `<div class="cancel-panel">
        <div class="pvalue">¿Confirmás pedir la clase del ${esc(fmtDiaLocal(fecha))}, ${esc(hora)} (1 hora)?</div>
        ${politica?`<div class="pmeta" style="margin:6px 0">Ojo: ${esc(politica)}</div>`:""}
        <textarea class="pinput" id="reserva-nota" maxlength="300" placeholder="¿Qué querés ver? (opcional)" rows="2" style="margin-top:6px"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button type="button" class="dl" data-a="reserva-confirmar">Confirmar pedido</button>
          <button type="button" class="dl" data-a="reserva-cancelar">Cancelar</button>
        </div>
      </div>`;
      area.querySelector('[data-a="reserva-cancelar"]').addEventListener("click", ()=>{ area.innerHTML=""; });
      area.querySelector('[data-a="reserva-confirmar"]').addEventListener("click", async ()=>{
        const nota = document.getElementById("reserva-nota");
        const confirmarBtn = area.querySelector('[data-a="reserva-confirmar"]');
        const cancelarBtn = area.querySelector('[data-a="reserva-cancelar"]');
        confirmarBtn.disabled = true; cancelarBtn.disabled = true;
        area.querySelector(".pvalue").textContent = "Enviando…";
        try{
          const r = await fetch(SUPA_URL+"/rest/v1/rpc/pedir_clase_portal", {
            method:"POST",
            headers:{apikey:SUPA_ANON_KEY, Authorization:"Bearer "+SUPA_ANON_KEY, "Content-Type":"application/json"},
            body: JSON.stringify({llave, p_fecha:fecha, p_hora:hora, p_nota:(nota.value||"").trim()}),
          });
          if(!r.ok) throw new Error("error "+r.status);
          const res = await r.json();
          if(!res || !res.ok){
            area.innerHTML = "";
            if(msg) msg.textContent = reservaErrorMsg(res&&res.error);
            return;
          }
          area.innerHTML = `<div class="pmeta">¡Pedido enviado! Quedó pendiente de confirmación.</div>`;
          setTimeout(()=>init(), 1200); // recarga el portal para mostrar el pedido como "Pendiente de confirmación"
        }catch(e){
          area.innerHTML = "";
          if(msg) msg.textContent = "No se pudo enviar el pedido — probá de nuevo.";
        }
      });
    });
  });
}
function showPortal(res, llave){
  const nombre = (res.data && res.data.nombre) ? res.data.nombre.trim() : "";
  const esGrupo = res.tipo==="grupo" && res.grupo;
  // Llave grupal: biblioteca acotada a la materia del grupo (res.grupo.biblioteca), nunca la
  // biblioteca completa de todas las materias (esa sólo la ve la llave general/individual).
  const titulo = esGrupo && res.grupo.materia ? `Portal de ${res.grupo.materia}`
    : (nombre ? `Portal de ${nombre}` : "Portal de tu profesor");
  const biblioteca = esGrupo ? (Array.isArray(res.grupo.biblioteca) ? res.grupo.biblioteca : [])
    : ((res.data && Array.isArray(res.data.biblioteca)) ? res.data.biblioteca : []);
  const avisos = esGrupo ? (res.grupo.avisos||[])
    : (res.tipo==="alumno" ? ((res.alumno&&res.alumno.avisos)||[]) : ((res.data&&res.data.avisos)||[]));
  // Foto del docente (paso 137, opcional): ya viene firmada desde publicarPortal() en el JSON
  // "publicado" — el portal público nunca pide nada al bucket privado por su cuenta, sólo muestra
  // la URL que el docente firmó mientras tenía sesión. Sin foto, no se muestra nada (el portal es
  // standalone y no tiene la paleta de colores/iniciales de la app principal para armar un
  // fallback consistente).
  const fotoDocente = res.data && res.data.fotoDocente && res.data.fotoDocente.url;
  let politica = ""; // se completa más abajo si hay llave de alumno — la necesita wireReserva() al final
  let h = `<h1 style="display:flex;align-items:center;gap:10px">${fotoDocente?`<img src="${esc(fotoDocente)}" alt="" class="docente-foto">`:""}<span>${esc(titulo)}</span></h1>`;
  h += avisosHtml(avisos);
  // Llave de alumno: su bloque personal va primero, arriba de lo general (biblioteca/links) —
  // es lo que más le importa a él en particular. Pagos (paso 141) va justo después, salvo que
  // haya deuda: ahí pasa a ir PRIMERO (paso 171, decisión explícita: el alumno no puede no
  // enterarse de que debe). res.cobros sólo debería venir presente cuando res.tipo==="alumno"
  // (portal_publico() del lado del backend es quien lo decide) — acá sólo se pinta si está.
  if(res.tipo==="alumno" && res.alumno){
    const pagos = pagosHtml(res.alumno, res.cobros||null, nombre);
    const debe = Number(res.alumno.pendiente)>0;
    // cancelarClaseHabilitado (paso 172): default true si un portal_publico() viejo ni siquiera
    // manda la clave (cache previa a este paso) — arranca encendido, a diferencia de pedirClaseHabilitado.
    const cancelarHabilitado = res.cancelarClaseHabilitado!==false;
    politica = (res.data && res.data.cancelPolicyTexto) || "";
    const personal = personalHtml(res.alumno, cancelarHabilitado, politica);
    // reservaModo (pasos 160/173/199): "apagado" no muestra nada (huecos llega null); cualquier
    // otro valor (incluido el legado "directa", ya resuelto a "confirmar" del lado del backend)
    // muestra la agenda semanal de reservaHtml() — un portal_publico() viejo en caché que todavía
    // no mande "reservaModo" cae en pedirClaseHabilitado, mismo criterio de siempre.
    const modo = res.reservaModo || (res.pedirClaseHabilitado ? "confirmar" : "apagado");
    h += (debe ? pagos + personal : personal + pagos) +
      (modo!=="apagado" ? reservaHtml(res.alumno, res.huecos) : "");
  }
  // Llave grupal: próximas clases/exámenes del grupo, antes de la biblioteca — mismo criterio
  // que el bloque personal, es lo más "de esta llave puntual" frente a lo genérico de abajo.
  if(esGrupo) h += grupoHtml(res.grupo);
  h += promosHtml(res.data && res.data.promos);
  h += `<div class="card">
    <div class="ctitle">Biblioteca</div>
    ${biblioteca.length>1 ? `<input id="biblio-search" placeholder="Buscar por materia o archivo…" autocomplete="off">` : ""}
    <div id="biblio-list">${bibliotecaHtml(biblioteca, "")}</div>
  </div>`;
  h += `<div class="card"><div class="ctitle">Links útiles</div><div class="empty">Todavía no hay links compartidos.</div></div>`;
  document.getElementById("app").innerHTML = h;
  observeUnitBars();
  const search = document.getElementById("biblio-search");
  if(search){
    search.addEventListener("input", ()=>{
      document.getElementById("biblio-list").innerHTML = bibliotecaHtml(biblioteca, search.value);
    });
  }
  const copyAlias = document.getElementById("copy-alias-btn");
  if(copyAlias){
    copyAlias.addEventListener("click", ()=>{
      if(!navigator.clipboard) return;
      navigator.clipboard.writeText(copyAlias.dataset.alias||"").then(()=>{
        const prev=copyAlias.textContent;
        copyAlias.textContent="¡Copiado!";
        setTimeout(()=>{ copyAlias.textContent=prev; }, 1500);
      }).catch(()=>{});
    });
  }
  wireReserva(llave, politica);
  wireCancelUi(llave);
}

async function init(){
  const llave = new URLSearchParams(location.search).get("k");
  // 8, no 10: las llaves nuevas salen de 10 caracteres (ver genPortalToken en sync.js) pero las
  // largas ya repartidas antes de este cambio (48) siguen siendo válidas — este mínimo es sólo
  // para descartar links obviamente rotos (ej. el "k" cortado a mitad de copiar), no para exigir
  // un formato exacto.
  if(!llave || llave.length < 8){
    showMsg("Este link no es válido.", "Pedile a tu profesor que te pase el link completo.");
    return;
  }
  if(!navigator.onLine){
    showMsg("Sin conexión.", "Necesitás internet para ver el portal.");
    return;
  }
  try{
    const r = await fetch(SUPA_URL+"/rest/v1/rpc/portal_publico", {
      method:"POST",
      headers:{apikey:SUPA_ANON_KEY, Authorization:"Bearer "+SUPA_ANON_KEY, "Content-Type":"application/json"},
      body: JSON.stringify({llave}),
    });
    if(!r.ok) throw new Error("error "+r.status);
    const res = await r.json();
    if(!res){
      showMsg("Este portal no está disponible.", "El link puede estar desactivado o haber cambiado.");
      return;
    }
    showPortal(res, llave);
  }catch(e){
    showMsg("No se pudo cargar el portal.", "Probá de nuevo en un momento.");
  }
}
init();

// Aviso de cookies (paso 203): única excepción a "nada de localStorage" de este archivo — sólo
// guarda que el aviso ya se cerró en este dispositivo, nunca datos del alumno. No aparece cuando
// el portal se abre dentro de un iframe (la vista previa desde Cuenta en la app, ver
// views-cuenta.js) — ahí el aviso ya se muestra en la app "de afuera".
function initCookieBar(){
  const COOKIES_OK_KEY = "tutoria-cookies-ok";
  if(window.self!==window.top) return;
  if(localStorage.getItem(COOKIES_OK_KEY)==="1") return;
  const bar = document.createElement("div");
  bar.className = "cookiebar";
  bar.innerHTML = `<div class="cookiebar-inner">
    <div class="cookiebar-text">Usamos cookies propias y almacenamiento local solo para que Entreclases funcione (tu sesión y tus datos). Sin publicidad ni rastreo de terceros. <a href="../terminos.html#cookies" target="_blank" rel="noopener">Más info</a></div>
    <button type="button" class="cookiebar-ok">Entendido</button>
  </div>`;
  bar.querySelector(".cookiebar-ok").addEventListener("click", ()=>{
    localStorage.setItem(COOKIES_OK_KEY, "1");
    bar.remove();
  });
  document.body.appendChild(bar);
}
initCookieBar();
