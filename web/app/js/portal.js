"use strict";
/* ============ portal.js — página pública para alumnos invitados ============
   Standalone a propósito: nada de sesión, nada de localStorage, sin compartir estado ni
   scripts con el resto de la app (ver el split en config.js/helpers.js/etc. para la app
   propiamente dicha). Duplica SUPA_URL/SUPA_ANON_KEY porque este archivo no carga config.js
   — son constantes públicas igual, ver CLAUDE.md. Lee ?k=LLAVE y llama a la RPC pública
   portal_publico() (migración 013_portal.sql), que nunca expone el token ni el user_id. */
const SUPA_URL = "https://iwxsntxkqfqucxhwlfdv.supabase.co";
const SUPA_ANON_KEY = "sb_publishable_S0zs9qmIRB5RWNZceO5gCg_vI7Hxx1D";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function showMsg(big, small){
  document.getElementById("app").innerHTML =
    `<div class="msg"><div class="big">${esc(big)}</div>${small?`<div class="small">${esc(small)}</div>`:""}</div>`;
}

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
const TOPIC_BAR_META = {
  pendiente:{pct:6, label:"Pendiente", color:"var(--faint)"},
  visto:{pct:35, label:"Visto", color:"var(--blue)"},
  practica:{pct:65, label:"En práctica", color:"var(--amber)"},
  parcial:{pct:100, label:"Nivel parcial", color:"var(--green)"},
  noentra:{pct:100, label:"No entra", color:"var(--faint)"},
};
// Bloque personal de un alumno con llave individual (ver buildAlumnoBlock en sync.js) — sólo
// trae los campos que el docente tildó explícitamente en la ficha; nunca notas, pagos, señas ni
// comentarios privados (eso ni siquiera sale de la app, ver el comentario en esa función).
// Ícono de saludo, mismo set de línea que la app (ICON_WAVE en views.js) — duplicado acá
// porque portal.js es standalone y no carga ese archivo (ver el comentario de SUPA_URL arriba).
const ICON_WAVE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V6a1.8 1.8 0 0 1 3.6 0v5"/><path d="M11.6 11V4.6a1.8 1.8 0 0 1 3.6 0V11"/><path d="M15.2 11V6.4a1.8 1.8 0 0 1 3.6 0V15c0 4-2.5 7-6.8 7-3 0-4.6-1-6-2.7L3 15.4c-.6-.9-.4-2 .5-2.6.8-.5 1.8-.3 2.4.4L8 15.5"/></svg>`;
function personalHtml(alumno){
  let h = `<div class="card personal"><div class="hello">Hola, ${esc(alumno.nombre||"")} <span class="icon-inline">${ICON_WAVE}</span></div>`;
  if("proximaClase" in alumno){
    const pc = alumno.proximaClase;
    h += `<div class="prow"><div class="plabel">Próxima clase</div>
      ${pc ? `<div class="pvalue">${fmtDiaLocal(pc.date)} a las ${esc(pc.time)} (${Number(pc.duration)||60} min)</div>`
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
          <div class="unitbar"><div class="unitfill" style="width:${m.pct}%;background:${m.color}"></div></div>
          <div class="unitstate" style="color:${m.color}">${m.label}</div>
        </div>
      </div>`;
    }).join("");
    h += `</div>`;
  }
  return h + `</div>`;
}
// Agrupa por materia y arma la sección de Biblioteca (primera y bien visible: es la sección
// principal del portal). filtro filtra por materia+nombre de archivo, case-insensitive.
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
  return [...bySubject.entries()].map(([materia, group])=>`
    <div class="subject">
      <div class="subjectname"><span class="subj-dot" style="background:var(--subj-${group.color}-fg)"></span>${esc(materia)}</div>
      ${group.files.map(it=>`<div class="file">
        <div class="filemain">${esc(it.nombre)}<div class="filemeta">${fmtBytes(it.bytes)}${it.at?" · "+fmtDate(it.at):""}</div></div>
        <a class="dl" href="${esc(it.url)}" target="_blank" rel="noopener">Descargar</a>
      </div>`).join("")}
    </div>`).join("");
}
function showPortal(res){
  const nombre = (res.data && res.data.nombre) ? res.data.nombre.trim() : "";
  const titulo = nombre ? `Portal de ${nombre}` : "Portal de tu profesor";
  const biblioteca = (res.data && Array.isArray(res.data.biblioteca)) ? res.data.biblioteca : [];
  let h = `<h1>${esc(titulo)}</h1>`;
  // Llave de alumno: su bloque personal va primero, arriba de lo general (biblioteca/links) —
  // es lo que más le importa a él en particular.
  if(res.tipo==="alumno" && res.alumno) h += personalHtml(res.alumno);
  h += `<div class="card">
    <div class="ctitle">Biblioteca</div>
    ${biblioteca.length>1 ? `<input id="biblio-search" placeholder="Buscar por materia o archivo…" autocomplete="off">` : ""}
    <div id="biblio-list">${bibliotecaHtml(biblioteca, "")}</div>
  </div>`;
  h += `<div class="card"><div class="ctitle">Links útiles</div><div class="empty">Todavía no hay links compartidos.</div></div>`;
  document.getElementById("app").innerHTML = h;
  const search = document.getElementById("biblio-search");
  if(search){
    search.addEventListener("input", ()=>{
      document.getElementById("biblio-list").innerHTML = bibliotecaHtml(biblioteca, search.value);
    });
  }
}

async function init(){
  const llave = new URLSearchParams(location.search).get("k");
  if(!llave || llave.length < 20){
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
    showPortal(res);
  }catch(e){
    showMsg("No se pudo cargar el portal.", "Probá de nuevo en un momento.");
  }
}
init();
