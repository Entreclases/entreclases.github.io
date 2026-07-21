"use strict";

function vPanel(){
  const tab = state.panelTab||"reportes";
  let h = pageHead("Panel","Administración",null,
    "Sólo para administradores: reportes de usuarios, actividad y recursos de todo el sistema.", "admin");
  h += `<div class="tabs" style="margin-bottom:14px">
    ${tabbtn("panel-tab-reportes",tab==="reportes","Reportes")}
    ${tabbtn("panel-tab-usuarios",tab==="usuarios","Usuarios")}
    ${tabbtn("panel-tab-actividad",tab==="actividad","Actividad")}
    ${tabbtn("panel-tab-recursos",tab==="recursos","Recursos")}
    ${tabbtn("panel-tab-inactividad",tab==="inactividad","Inactividad")}
  </div>`;
  h += tab==="usuarios" ? vUsuarios() : tab==="actividad" ? vActividad() : tab==="recursos" ? vRecursos()
    : tab==="inactividad" ? vInactividad() : vReportes();
  return h;
}


// Tipos de reporte (paso 147): feedback del docente (problema/idea/me_gusta, ver FEEDBACK_TIPOS
// en config.js) más "error_js", que sólo escribe logClientError() (sync.js) — nunca a mano.
// "active_tester" (paso 202): pedidos del programa Active Tester (ver solicitar-active-tester en
// events.js) — reusa esta misma tabla en vez de sumar una nueva, así que el cupo de 20 plazas se
// administra a mano acá, marcando cada solicitud (misma acción "Marcar resuelto"/toggle-reporte).
const REPORTE_TIPO_LABELS = {problema:"Problema", idea:"Idea", me_gusta:"Me gusta", error_js:"Error", active_tester:"Active Tester"};

function vReportes(){
  const filter = state.reportFilter||"pendiente";
  const tipoFilter = state.reportTipoFilter||"todos";
  const list = (state.reportes||[])
    .filter(r=>filter==="todos"||r.estado===filter)
    .filter(r=>tipoFilter==="todos"||(r.tipo||"problema")===tipoFilter);
  const testerPendientes = (state.reportes||[]).filter(r=>r.tipo==="active_tester" && r.estado!=="resuelto").length;
  let h = `<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
    ${["pendiente","resuelto","todos"].map(f=>
      `<button class="chip ${filter===f?"on":""}" data-a="reportes-filter" data-f="${f}">${f==="todos"?"Todos":f==="pendiente"?"Pendientes":"Resueltos"}</button>`
    ).join("")}
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
    <button class="chip ${tipoFilter==="todos"?"on":""}" data-a="reportes-tipo-filter" data-f="todos">Todos los tipos</button>
    ${Object.keys(REPORTE_TIPO_LABELS).map(t=>
      `<button class="chip ${tipoFilter===t?"on":""}" data-a="reportes-tipo-filter" data-f="${t}">${REPORTE_TIPO_LABELS[t]}${t==="active_tester"&&testerPendientes?` (${testerPendientes})`:""}</button>`
    ).join("")}
  </div>`;
  if(tipoFilter==="active_tester") h += `<div class="hint" style="margin-bottom:10px">Cupo total: 20 plazas — administralo a mano marcando cada solicitud (${testerPendientes} sin marcar).</div>`;
  if(state.reportesError) h += `<div class="saveerr">${esc(state.reportesError)}</div>`;
  else if(!state.reportesLoaded) h += skeletonRows(4);
  else if(list.length===0) h += `<div class="empty">No hay reportes en esta categoría.</div>`;
  else h += list.map(r=>`<div class="log" style="align-items:flex-start">
      <div class="body">
        <div style="font-weight:600">${esc(r.email||"—")}
          <span class="chip" style="margin-left:6px;pointer-events:none;padding:1px 8px;font-size:11px">${esc(REPORTE_TIPO_LABELS[r.tipo]||"Problema")}</span>
          <span class="hint">· ${esc(r.plataforma||"—")} · v${esc(r.version||"—")}${r.vista?" · "+esc(r.vista):""} · ${fmtDateTime(r.created_at)}</span></div>
        <div class="note">${esc(r.mensaje||"")}</div>
      </div>
      <button class="chip ${r.estado==="resuelto"?"on":""}" data-a="toggle-reporte" data-id="${esc(r.id)}">${r.estado==="resuelto"?(r.tipo==="active_tester"?"Ya avisado ✓":"Resuelto ✓"):(r.tipo==="active_tester"?"Marcar avisado":"Marcar resuelto")}</button>
    </div>`).join("");
  return h;
}


function vUsuarios(){
  const sortDir = state.usersSortDir||"desc";
  let h = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
    <button class="chip" data-a="usuarios-sort-lastseen">Última conexión ${sortDir==="desc"?"↓ más reciente primero":"↑ más antigua primero"}</button>
    <div style="display:flex;gap:8px">
      <button class="chip" data-a="limpiar-huerfanos" ${state.orphanCleanStatus==="cleaning"?"disabled":""}>${state.orphanCleanStatus==="cleaning"?"Limpiando…":"Limpiar archivos huérfanos"}</button>
      <button class="chip" data-a="refresh-usuarios">Actualizar</button>
    </div></div>`;
  if(state.usersDeleteMsg) h += `<div class="hint" style="color:var(--status-${state.usersDeleteWarning?"desaprobo":"activo"}-fg);margin-bottom:8px">${esc(state.usersDeleteMsg)}</div>`;
  if(state.orphanCleanMsg) h += `<div class="hint" style="color:var(--status-activo-fg);margin-bottom:8px">${esc(state.orphanCleanMsg)}</div>`;
  if(state.orphanCleanError) h += `<div class="saveerr" style="margin-bottom:8px">${esc(state.orphanCleanError)}</div>`;
  if(state.usersPlanError) h += `<div class="saveerr" style="margin-bottom:8px">${esc(state.usersPlanError)}</div>`;
  if(state.usersError) return h + `<div class="saveerr">${esc(state.usersError)}</div>`;
  if(state.usersEstadoError) h += `<div class="saveerr" style="margin-bottom:8px">${esc(state.usersEstadoError)}</div>`;
  if(!state.usersLoaded) return h + skeletonRows(5);
  const list = state.users||[];
  const pendientes = list.filter(u=>u.estado==="pendiente");
  if(pendientes.length){
    const estadoSaving = id => (state.usersEstadoStatus||{})[id];
    h += `<div class="formcard" style="margin-bottom:14px;border-color:var(--amber)">
      <div class="ftitle">Pendientes de aprobación <span class="chip" style="pointer-events:none;margin-left:6px">${pendientes.length}</span></div>`;
    h += pendientes.map(u=>{
      const saving = estadoSaving(u.user_id);
      return `<div class="log" style="align-items:flex-start;flex-wrap:wrap">
        <div class="body">
          <div style="font-weight:600">${esc(u.email||"—")}</div>
          <div class="note">Se registró ${fmtDateTime(u.created_at)}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="chip" data-a="usuario-aprobar" data-id="${esc(u.user_id)}" ${saving?"disabled":""}>${saving==="aprobando"?"Aprobando…":"Aprobar"}</button>
          <button class="chip" data-a="usuario-rechazar" data-id="${esc(u.user_id)}" ${saving?"disabled":""}>${saving==="rechazando"?"Rechazando…":"Rechazar"}</button>
        </div>
      </div>`;
    }).join("");
    h += `</div>`;
  }
  const now = Date.now();
  const ONLINE_MS = 10*60*1000, WEEK_MS = 7*86400000, INACTIVE_MS = 30*86400000, FINAL_MS = 5*30*86400000;
  const lastSeenMs = u => u.last_seen_at ? now-new Date(u.last_seen_at).getTime() : null;
  const isOnline = u => { const ms=lastSeenMs(u); return ms!==null && ms<ONLINE_MS; };
  const isActiveWeek = u => { const ms=lastSeenMs(u); return ms!==null && ms<WEEK_MS; };
  // mismos umbrales que revisar_inactivos() (012_inactividad.sql): recordatorio a los 30
  // días, aviso final a los 5 meses — el chip sólo es informativo, el cron es la fuente de verdad.
  const inactiveChip = u => {
    const ms=lastSeenMs(u); if(u.rol==="admin" || ms===null || ms<INACTIVE_MS) return "";
    const color = ms>=FINAL_MS ? "var(--red)" : "var(--amber)";
    return `<span class="chip" style="color:${color};border-color:${color};margin-left:6px">Inactivo ${timeAgo(u.last_seen_at)}</span>`;
  };
  h += `<div class="stats">
    <div class="stat"><b>${list.length}</b><span>cuentas totales</span></div>
    <div class="stat"><b>${list.filter(isOnline).length}</b><span>en línea ahora</span></div>
    <div class="stat"><b>${list.filter(isActiveWeek).length}</b><span>activos últimos 7 días</span></div>
  </div>`;
  if(list.length===0) return h + `<div class="empty">Todavía no hay cuentas.</div>`;
  // más reciente/antigua primero; sin last_seen_at (nunca conectado) siempre al final, sea cual sea el orden
  const sorted = list.slice().sort((a,b)=>{
    const ma=lastSeenMs(a), mb=lastSeenMs(b);
    if(ma===null && mb===null) return 0;
    if(ma===null) return 1;
    if(mb===null) return -1;
    return sortDir==="desc" ? ma-mb : mb-ma;
  });
  h += sorted.map(u=>{
    const seen = isOnline(u)
      ? `<span style="display:inline-flex;align-items:center;gap:5px;color:var(--status-activo-fg);font-weight:600">
          <span class="sem" style="width:8px;height:8px;background:var(--green)"></span>En línea</span>`
      : `<span style="color:var(--faint)">${u.last_seen_at?"visto por última vez "+timeAgo(u.last_seen_at):"nunca conectado"}</span>`;
    const isAdmin = u.rol==="admin";
    const confirming = state.usersConfirmDelId===u.user_id;
    let delUi = "";
    if(!isAdmin){
      if(!confirming){
        delUi = `<button class="del" data-a="users-del-ask" data-id="${esc(u.user_id)}" title="Eliminar cuenta" aria-label="Eliminar cuenta">×</button>`;
      }else{
        const matches = (state.usersConfirmDelInput||"")===u.email;
        delUi = `<div style="flex-basis:100%;margin-top:8px;padding-top:8px;border-top:1px solid var(--soft)">
          <div style="font-size:13px;color:var(--status-desaprobo-fg);margin-bottom:6px">Esto borra la cuenta, sus alumnos, respaldos y materiales — no se puede deshacer. Escribí <b>${esc(u.email)}</b> para confirmar:</div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="text" data-live="users-del-email" value="${esc(state.usersConfirmDelInput||"")}" placeholder="${esc(u.email)}" style="flex:1;min-width:180px">
            <button class="danger" data-a="users-del-confirm" data-id="${esc(u.user_id)}" ${(!matches||state.usersDeleteStatus==="deleting")?"disabled":""}>Sí, eliminar</button>
            <button class="chip" data-a="users-del-cancel">Cancelar</button>
          </div>
          ${state.usersDeleteError?`<div class="saveerr" style="margin-top:6px">${esc(state.usersDeleteError)}</div>`:""}
        </div>`;
      }
    }
    const planSaving = (state.usersPlanStatus||{})[u.user_id]==="saving";
    const planSel = `<select data-cf="users-plan" data-id="${esc(u.user_id)}" ${planSaving?"disabled":""}>
      ${PLANES.map(p=>`<option value="${p}" ${(u.plan||"beta")===p?"selected":""}>${esc(PLAN_META[p].label)}</option>`).join("")}
    </select>`;
    const estadoBadge = u.estado==="pendiente"
      ? `<span class="chip" style="color:var(--amber);border-color:var(--amber);margin-left:6px;pointer-events:none">Pendiente</span>`
      : u.estado==="rechazado"
      ? `<span class="chip" style="color:var(--red);border-color:var(--red);margin-left:6px;pointer-events:none">Rechazada</span>`
      : "";
    return `<div class="log" style="align-items:flex-start;flex-wrap:wrap">
      <div class="body">
        <div style="font-weight:600">${esc(u.email||"—")} <span class="hint">· ${esc(u.rol||"—")}</span>${estadoBadge}${inactiveChip(u)}</div>
        <div class="note">${seen} · ${esc(u.plataforma||"—")} · v${esc(u.version||"—")} · alta ${fmtDateTime(u.created_at)}</div>
        <div class="note" style="margin-top:4px">Plan: ${planSel}</div>
      </div>
      ${delUi}
    </div>`;
  }).join("");
  return h;
}


// Log de 012_inactividad.sql: qué mail mandó (o habría mandado, en simulacro) el cron
// revisar_inactivos() y qué cuentas terminó cerrando.
const TIPO_NOTIF_META = {
  recordatorio:"Recordatorio", aviso_final:"Aviso final",
  simulacro_recordatorio:"Recordatorio (simulacro)", simulacro_aviso_final:"Aviso final (simulacro)",
  simulacro_cierre:"Cierre (simulacro)"
};

function vInactividad(){
  let h = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button class="chip" data-a="refresh-inactividad">Actualizar</button></div>`;
  if(state.inactividadError) return h + `<div class="saveerr">${esc(state.inactividadError)}</div>`;
  if(!state.inactividadLoaded) return h + skeletonRows(3);
  const notifs = state.notificacionesInactividad||[];
  const cerradas = state.cuentasCerradas||[];
  h += `<div class="stitle">Notificaciones (últimas ${notifs.length})</div>`;
  h += notifs.length===0 ? `<div class="empty">Sin notificaciones registradas todavía.</div>` :
    notifs.map(n=>`<div class="log">
      <div class="body">${esc(n.email)} <span class="hint">· ${esc(TIPO_NOTIF_META[n.tipo]||n.tipo)}</span>
        <div class="note">${fmtDateTime(n.enviada_at)}</div></div>
    </div>`).join("");
  h += `<div class="stitle">Cuentas cerradas (últimas ${cerradas.length})</div>`;
  h += cerradas.length===0 ? `<div class="empty">Sin cierres todavía.</div>` :
    cerradas.map(c=>`<div class="log">
      <div class="body">${esc(c.email)} <span class="hint">· ${esc(c.motivo)}</span>
        <div class="note">${fmtDateTime(c.cerrada_at)}</div></div>
    </div>`).join("");
  return h;
}


// Elige hasta maxTicks índices repartidos parejo (siempre incluye el primero y el
// último) para no pisar etiquetas de eje cuando el dataset tiene muchos puntos.
function pickAxisIndices(n, maxTicks){
  const step=Math.max(1, Math.ceil(n/maxTicks));
  const idx=new Set();
  for(let i=0;i<n;i+=step) idx.add(i);
  idx.add(n-1);
  return idx;
}

// Suma total de un dataset de barRow — se muestra junto al título del gráfico.
function barTotal(dataset){ return dataset.reduce((s,d)=>s+d.v,0); }

// Título de sub-gráfico + total del período, en la misma línea (formato de .stitle).
function chartTitle(text, dataset){
  return `<div class="stitle" style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
    <span>${esc(text)}</span><span>Total: ${barTotal(dataset)}</span></div>`;
}

function sumRange(dataset, from, toExclusive){
  let s=0; for(let i=from;i<toExclusive;i++) s+=dataset[i].v; return s;
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
  const axisIdx = pickAxisIndices(days.length, 8);
  const axisLabels = days.map((d,i)=>axisIdx.has(i)?fmtDate(d):"");

  let h = chartTitle("Usuarios activos por día (últimos 30 días)", activeSet);
  h += trendBadge(sumRange(activeSet,23,30), sumRange(activeSet,16,23), "7 días anteriores");
  h += barRow(activeSet, axisLabels);
  h += chartTitle("Aperturas por día", aperturasSet);
  h += trendBadge(sumRange(aperturasSet,23,30), sumRange(aperturasSet,16,23), "7 días anteriores");
  h += barRow(aperturasSet, axisLabels);
  h += chartTitle("Syncs por día", syncsSet);
  h += trendBadge(sumRange(syncsSet,23,30), sumRange(syncsSet,16,23), "7 días anteriores");
  h += barRow(syncsSet, axisLabels);
  return h;
}


// Trunca a la hora en UTC — coincide con date_trunc('hour', now()) del lado del servidor
// (Supabase usa UTC), sin depender del huso horario del navegador.
function hourKey(d){ const h=new Date(d); h.setUTCMinutes(0,0,0); return h.toISOString(); }

function vActividadHora(){
  if(state.metricasHorariasError) return `<div class="saveerr">${esc(state.metricasHorariasError)}</div>`;
  if(!state.metricasHorariasLoaded) return skeletonRows(3);

  const hourKeys=[]; for(let i=47;i>=0;i--) hourKeys.push(hourKey(new Date(Date.now()-i*3600000)));
  const byHour={}; hourKeys.forEach(k=>byHour[k]={users:new Set(),aperturas:0,syncs:0});
  (state.metricasHorarias||[]).forEach(m=>{
    const b=byHour[hourKey(m.hora)]; if(!b) return;
    b.users.add(m.user_id); b.aperturas+=(m.aperturas||0); b.syncs+=(m.syncs||0);
  });
  const activeSet = hourKeys.map(k=>({label:fmtDateTime(k), v:byHour[k].users.size}));
  const aperturasSet = hourKeys.map(k=>({label:fmtDateTime(k), v:byHour[k].aperturas}));
  const syncsSet = hourKeys.map(k=>({label:fmtDateTime(k), v:byHour[k].syncs}));
  const axisIdx = pickAxisIndices(hourKeys.length, 8);
  const shortHour = k=>{ try{ return new Date(k).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"}); }catch(e){ return "—"; } };
  const axisLabels = hourKeys.map((k,i)=>axisIdx.has(i)?shortHour(k):"");

  let h = chartTitle("Usuarios activos por hora (últimas 48 hs)", activeSet);
  h += trendBadge(sumRange(activeSet,24,48), sumRange(activeSet,0,24), "24 hs anteriores");
  h += barRow(activeSet, axisLabels);
  h += chartTitle("Aperturas por hora", aperturasSet);
  h += trendBadge(sumRange(aperturasSet,24,48), sumRange(aperturasSet,0,24), "24 hs anteriores");
  h += barRow(aperturasSet, axisLabels);
  h += chartTitle("Syncs por hora", syncsSet);
  h += trendBadge(sumRange(syncsSet,24,48), sumRange(syncsSet,0,24), "24 hs anteriores");
  h += barRow(syncsSet, axisLabels);
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
    else if(!state.actividadLoaded) h += skeletonRows(3);
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

const SUPABASE_STORAGE_FREE_LIMIT_BYTES = 1024*1024*1024;

function usageBar(label, bytes, limitBytes){
  const pct = Math.min(100, bytes/limitBytes*100);
  const barColor = pct>=90 ? "var(--red)" : pct>=70 ? "var(--amber)" : "var(--green)";
  return `<div class="stitle">${esc(label)}</div>
  <div role="progressbar" aria-label="${esc(label)}" aria-valuenow="${pct.toFixed(0)}" aria-valuemin="0" aria-valuemax="100"
    style="background:var(--soft);border-radius:99px;height:14px;overflow:hidden;margin-bottom:6px">
    <div style="height:100%;width:${pct.toFixed(1)}%;background:${barColor};border-radius:99px"></div>
  </div>
  <div class="hint" style="margin-bottom:20px">${fmtBytes(bytes)} de ${fmtBytes(limitBytes)} (${pct.toFixed(1)}%) — plan gratuito de Supabase</div>`;
}

function vRecursos(){
  let h = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button class="chip" data-a="refresh-recursos">Actualizar</button></div>`;
  if(state.recursosError) return h + `<div class="saveerr">${esc(state.recursosError)}</div>`;
  if(!state.recursosLoaded) return h + skeletonRows(4);
  const data = state.recursos;
  if(!data) return h + `<div class="empty">No se pudieron cargar los recursos.</div>`;

  h += usageBar("Uso de base de datos", data.db_bytes||0, SUPABASE_FREE_LIMIT_BYTES);
  h += usageBar("Uso de storage (materiales)", data.storage_bytes||0, SUPABASE_STORAGE_FREE_LIMIT_BYTES);
  h += `<div class="hint" style="margin:-6px 0 14px">Son dos recursos separados del plan gratis de Supabase (500 MB de base de datos, 1 GB de storage) — se llenan de forma independiente, así que uno puede estar al tope sin afectar al otro.</div>`;

  const usuarios = [...(data.usuarios||[])].sort((a,b)=>
    ((b.cuaderno_bytes||0)+(b.respaldos_bytes||0)) - ((a.cuaderno_bytes||0)+(a.respaldos_bytes||0)));

  h += usuarios.length===0 ? `<div class="empty">Sin datos de usuarios.</div>`
    : usuarios.map(u=>`<div class="log" style="align-items:flex-start">
      <div class="body">
        <div style="font-weight:600">${esc(u.email||"—")} <span class="hint">· ${esc(u.rol||"—")}</span></div>
        <div class="note">${u.alumnos||0} alumno${u.alumnos===1?"":"s"} · cuaderno ${fmtBytes(u.cuaderno_bytes)}
          · ${u.respaldos||0} respaldo${u.respaldos===1?"":"s"} (${fmtBytes(u.respaldos_bytes)})
          · materiales ${fmtBytes(u.storage_bytes)}</div>
      </div>
    </div>`).join("");

  const topStorage = [...(data.usuarios||[])].filter(u=>(u.storage_bytes||0)>0)
    .sort((a,b)=>(b.storage_bytes||0)-(a.storage_bytes||0)).slice(0,5);
  if(topStorage.length){
    h += `<div class="stitle" style="margin-top:20px">Top 5 por uso de storage</div>`;
    h += topStorage.map((u,i)=>`<div class="log">
      <div class="body">
        <div style="font-weight:600">${i+1}. ${esc(u.email||"—")}</div>
        <div class="note">${fmtBytes(u.storage_bytes)}</div>
      </div>
    </div>`).join("");
  }

  h += `<div class="hint" style="margin-top:18px">El uso de memoria/CPU del servidor se ve solo en el dashboard de Supabase; acá se mide lo que ocupan los datos.</div>`;
  return h;
}
